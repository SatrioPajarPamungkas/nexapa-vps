<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\AdminMessageNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(1, min(100, $perPage));

        $query = $request->user()
            ->notifications()
            ->latest();

        if ($request->boolean('unread')) {
            $query->whereNull('read_at');
        }

        $notifications = $query->paginate($perPage);

        $data = collect($notifications->items())
            ->map(function ($notification) {
                $payload = is_array($notification->data)
                    ? $notification->data
                    : [];

                return [
                    'id' => (string) $notification->id,
                    'subject' => (string) ($payload['subject'] ?? ''),
                    'message' => (string) ($payload['message'] ?? ''),
                    'action_url' => isset($payload['action_url'])
                        ? (string) $payload['action_url']
                        : null,
                    'sender' => [
                        'id' => isset($payload['sender_id'])
                            ? (int) $payload['sender_id']
                            : null,
                        'name' => (string) ($payload['sender_name'] ?? 'Administrator'),
                    ],
                    'read_at' => $notification->read_at?->toISOString(),
                    'created_at' => $notification->created_at?->toISOString(),
                ];
            })
            ->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'unread_count' => $request->user()
                    ->unreadNotifications()
                    ->count(),
            ],
        ]);
    }

    public function markRead(
        Request $request,
        string $notification
    ): JsonResponse {
        $item = $request->user()
            ->notifications()
            ->whereKey($notification)
            ->firstOrFail();

        if ($item->read_at === null) {
            $item->markAsRead();
            $item->refresh();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $item->id,
                'read_at' => $item->read_at?->toISOString(),
            ],
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $query = $request->user()->unreadNotifications();
        $count = $query->count();

        if ($count > 0) {
            $query->update([
                'read_at' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'marked_read' => $count,
            ],
        ]);
    }

    public function storeAdmin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recipient_type' => [
                'required',
                'string',
                'in:user,all',
            ],
            'user_id' => [
                'nullable',
                'required_if:recipient_type,user',
                'integer',
                'exists:users,id',
            ],
            'subject' => [
                'required',
                'string',
                'max:160',
            ],
            'message' => [
                'required',
                'string',
                'max:5000',
            ],
            'action_url' => [
                'nullable',
                'string',
                'max:2048',
            ],
        ]);

        $admin = $request->user();
        $recipientsCount = 0;

        if ($validated['recipient_type'] === 'user') {
            $recipient = User::query()->findOrFail($validated['user_id']);

            if ($recipient->isAdmin()) {
                throw ValidationException::withMessages([
                    'user_id' => [
                        'The selected recipient must be a regular user.',
                    ],
                ]);
            }

            $recipient->notify(
                new AdminMessageNotification(
                    senderId: (int) $admin->id,
                    senderName: (string) $admin->name,
                    subject: $validated['subject'],
                    message: $validated['message'],
                    actionUrl: $validated['action_url'] ?? null,
                )
            );

            $recipientsCount = 1;
        } else {
            User::query()
                ->where('is_admin', false)
                ->select([
                    'id',
                    'name',
                    'email',
                    'is_admin',
                ])
                ->chunkById(
                    200,
                    function ($users) use (
                        &$recipientsCount,
                        $admin,
                        $validated
                    ) {
                        foreach ($users as $recipient) {
                            $recipient->notify(
                                new AdminMessageNotification(
                                    senderId: (int) $admin->id,
                                    senderName: (string) $admin->name,
                                    subject: $validated['subject'],
                                    message: $validated['message'],
                                    actionUrl: $validated['action_url'] ?? null,
                                )
                            );

                            $recipientsCount++;
                        }
                    }
                );
        }

        return response()->json([
            'success' => true,
            'data' => [
                'recipient_type' => $validated['recipient_type'],
                'recipients_count' => $recipientsCount,
            ],
        ], 201);
    }
}
