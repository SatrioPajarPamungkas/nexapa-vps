<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail as BaseVerifyEmail;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends BaseVerifyEmail
{
    protected function verificationUrl($notifiable)
    {
        $frontendUrl = config('app.frontend_url', 'https://app.nexapa.me');
        $apiUrl = config('app.url', 'https://api.nexapa.me');
        
        $id = $notifiable->getKey();
        $hash = sha1($notifiable->getEmailForVerification());
        
        // Generate signature manually
        $signature = hash_hmac('sha256', "{$id}|{$hash}", config('app.key'));
        
        $route = "/api/v1/auth/email/verify/{$id}/{$hash}";
        $verifyUrl = $apiUrl . $route . '?signature=' . urlencode($signature);
        
        return $frontendUrl . '/verify-email?verify_url=' . urlencode($verifyUrl);
    }

    protected function buildMailMessage($url)
    {
        return (new \Illuminate\Notifications\Messages\MailMessage)
            ->subject('Verify Your Email Address')
            ->greeting('Hello,')
            ->line('Click the button below to verify your email address.')
            ->action('Verify Email', $url)
            ->line('If you did not create an account, no further action is required.')
            ->line('This verification link will expire in 60 minutes.');
    }
}
