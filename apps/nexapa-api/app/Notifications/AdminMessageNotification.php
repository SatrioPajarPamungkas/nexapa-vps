<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class AdminMessageNotification extends Notification
{
    use Queueable;

    public function __construct(
        public int $senderId,
        public string $senderName,
        public string $subject,
        public string $message,
        public ?string $actionUrl = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'sender_id' => $this->senderId,
            'sender_name' => $this->senderName,
            'subject' => $this->subject,
            'message' => $this->message,
            'action_url' => $this->actionUrl,
        ];
    }
}
