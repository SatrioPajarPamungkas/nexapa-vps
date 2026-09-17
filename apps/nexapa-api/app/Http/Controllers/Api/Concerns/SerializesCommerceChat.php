<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\CommerceChatAttachment;
use App\Models\CommerceChatConversation;
use App\Models\CommerceChatMessage;

trait SerializesCommerceChat
{
    private function conversationData(CommerceChatConversation $conversation, int $unread = 0): array
    {
        $conversation->loadMissing(['order', 'customer', 'latestMessage']);
        $latest = $conversation->latestMessage;

        return [
            'id' => $conversation->id,
            'status' => $conversation->status,
            'last_message_at' => optional($conversation->last_message_at)->toISOString(),
            'unread_count' => $unread,
            'order' => [
                'id' => $conversation->order->id,
                'order_number' => $conversation->order->order_number,
                'status' => $conversation->order->status,
                'payment_status' => $conversation->order->payment_status,
                'total_amount' => (int) $conversation->order->total_amount,
                'currency' => $conversation->order->currency,
            ],
            'customer' => [
                'id' => $conversation->customer->id,
                'name' => $conversation->customer->name,
                'email' => $conversation->customer->email,
            ],
            'last_message' => $latest ? [
                'body' => $latest->body,
                'sender_type' => $latest->sender_type,
                'created_at' => optional($latest->created_at)->toISOString(),
            ] : null,
        ];
    }

    private function messageData(CommerceChatMessage $message, string $downloadPrefix): array
    {
        $message->loadMissing('attachments');

        return [
            'id' => $message->id,
            'sender_type' => $message->sender_type,
            'sender_name' => $message->sender_name,
            'body' => $message->body,
            'created_at' => optional($message->created_at)->toISOString(),
            'attachments' => $message->attachments->map(
                fn (CommerceChatAttachment $attachment): array => [
                    'id' => $attachment->id,
                    'original_name' => $attachment->original_name,
                    'mime_type' => $attachment->mime_type,
                    'size_bytes' => (int) $attachment->size_bytes,
                    'download_url' => url($downloadPrefix.'/'.$attachment->id),
                ]
            )->values()->all(),
        ];
    }
}
