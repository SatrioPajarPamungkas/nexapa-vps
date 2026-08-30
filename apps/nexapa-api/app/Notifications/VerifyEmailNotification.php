<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail as BaseVerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends BaseVerifyEmail
{
    public function __construct(
        private readonly string $destination = 'app'
    ) {
    }

    protected function verificationUrl($notifiable)
    {
        $frontendUrl = match ($this->destination) {
            'crm' => config(
                'app.crm_frontend_url',
                'https://crm.nexapa.app'
            ),
            default => config(
                'app.frontend_url',
                'https://app.nexapa.app'
            ),
        };

        $frontendUrl = rtrim(
            (string) $frontendUrl,
            '/'
        );

        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(
                (int) config(
                    'auth.verification.expire',
                    60
                )
            ),
            [
                'id' => $notifiable->getKey(),
                'hash' => sha1(
                    $notifiable
                        ->getEmailForVerification()
                ),
            ]
        );

        return $frontendUrl
            .'/verify-email?verify_url='
            .urlencode($verifyUrl);
    }

    protected function buildMailMessage($url)
    {
        return (new MailMessage)
            ->subject('Verify Your Email Address')
            ->greeting('Hello,')
            ->line(
                'Click the button below to verify your email address.'
            )
            ->action('Verify Email', $url)
            ->line(
                'If you did not create an account, no further action is required.'
            )
            ->line(
                'This verification link will expire in 60 minutes.'
            );
    }
}
