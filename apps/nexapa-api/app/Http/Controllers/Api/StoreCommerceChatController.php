<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\SerializesCommerceChat;
use App\Http\Controllers\Controller;
use App\Models\CommerceChatAttachment;
use App\Models\CommerceChatConversation;
use App\Models\CommerceChatMessage;
use App\Models\CommerceOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StoreCommerceChatController extends Controller
{
    use SerializesCommerceChat;

    public function index(Request $request): JsonResponse
    {
        $conversations = CommerceChatConversation::query()
            ->with(['order', 'customer', 'latestMessage'])
            ->where('commerce_customer_id', $request->user()->id)
            ->orderByDesc('last_message_at')->get();

        return response()->json(['data' => $conversations->map(function ($conversation): array {
            $unread = $conversation->messages()
                ->where('sender_type', 'admin')
                ->when($conversation->customer_last_read_at,
                    fn ($query, $at) => $query->where('created_at', '>', $at))
                ->when(!$conversation->customer_last_read_at,
                    fn ($query) => $query->whereNotNull('created_at'))
                ->count();
            return $this->conversationData($conversation, $unread);
        })->values()]);
    }

    public function show(Request $request, CommerceOrder $commerceOrder): JsonResponse
    {
        $this->ownOrder($request, $commerceOrder);
        $conversation = $this->conversation($commerceOrder);
        $conversation->forceFill(['customer_last_read_at' => now()])->save();
        $messages = $conversation->messages()->with('attachments')
            ->oldest('created_at')->limit(300)->get();

        return response()->json(['data' => [
            'conversation' => $this->conversationData($conversation->fresh(), 0),
            'messages' => $messages->map(fn ($message) => $this->messageData(
                $message, '/api/v1/store/chat/attachments'
            ))->values(),
        ]]);
    }

    public function store(Request $request, CommerceOrder $commerceOrder): JsonResponse
    {
        $this->ownOrder($request, $commerceOrder);
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'max:10240', 'mimes:jpg,jpeg,png,webp,pdf,txt,csv,zip,rar,doc,docx,xls,xlsx'],
        ]);
        abort_if(blank($data['body'] ?? null) && !$request->hasFile('attachments'), 422,
            'Tulis pesan atau pilih file.');

        $conversation = $this->conversation($commerceOrder);
        $stored = [];
        try {
            $message = DB::transaction(function () use ($request, $data, $conversation, &$stored) {
                $message = $conversation->messages()->create([
                    'sender_type' => 'customer',
                    'sender_id' => $request->user()->id,
                    'sender_name' => $request->user()->name,
                    'body' => filled($data['body'] ?? null) ? trim($data['body']) : null,
                ]);
                foreach ($request->file('attachments', []) as $file) {
                    $name = Str::uuid().($file->guessExtension() ? '.'.$file->guessExtension() : '');
                    $path = $file->storeAs('commerce-chat/'.$conversation->id, $name, 'local');
                    $stored[] = $path;
                    $message->attachments()->create([
                        'disk' => 'local', 'path' => $path,
                        'original_name' => $file->getClientOriginalName(),
                        'mime_type' => $file->getMimeType(), 'size_bytes' => $file->getSize(),
                    ]);
                }
                $conversation->update(['last_message_at' => now(), 'customer_last_read_at' => now()]);
                return $message;
            });
        } catch (\Throwable $error) {
            foreach ($stored as $path) Storage::disk('local')->delete($path);
            throw $error;
        }

        return response()->json(['data' => $this->messageData(
            $message->load('attachments'), '/api/v1/store/chat/attachments'
        )], 201);
    }

    public function download(Request $request, CommerceChatAttachment $attachment): StreamedResponse
    {
        $attachment->load('message.conversation');
        abort_unless((int) $attachment->message->conversation->commerce_customer_id
            === (int) $request->user()->id, 404);
        abort_unless(Storage::disk($attachment->disk)->exists($attachment->path), 404,
            'File chat tidak ditemukan.');
        return Storage::disk($attachment->disk)->download(
            $attachment->path, $attachment->original_name,
            ['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']
        );
    }

    private function ownOrder(Request $request, CommerceOrder $order): void
    {
        abort_unless((int) $order->user_id === (int) $request->user()->id, 404);
    }

    private function conversation(CommerceOrder $order): CommerceChatConversation
    {
        return CommerceChatConversation::firstOrCreate(
            ['commerce_order_id' => $order->id],
            ['commerce_customer_id' => $order->user_id, 'status' => 'open']
        );
    }
}
