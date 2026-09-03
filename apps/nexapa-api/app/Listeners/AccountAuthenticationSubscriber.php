<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

class AccountAuthenticationSubscriber
{
    public function __construct(
        private readonly ActivityLogService $activityLog
    ) {}

    public function handleLogin(Login $event): void
    {
        if ($event->user instanceof User) {
            $this->log($event->user, 'auth.login_succeeded', 'Login berhasil.');
        }
    }

    public function handleFailed(Failed $event): void
    {
        $user = $event->user instanceof User ? $event->user : null;
        $email = strtolower(trim((string) ($event->credentials['email'] ?? '')));

        $this->activityLog->log([
            'user' => $user,
            'category' => 'authentication',
            'action' => 'auth.login_failed',
            'title' => 'Percobaan login gagal.',
            'status' => 'failed',
            'product' => $this->product(),
            'metadata' => $email === ''
                ? []
                : ['email_hash' => hash('sha256', $email)],
        ]);
    }

    public function handleLogout(Logout $event): void
    {
        if ($event->user instanceof User) {
            $this->log($event->user, 'auth.logout', 'Logout berhasil.');
        }
    }

    public function subscribe($events): array
    {
        return [
            Login::class => 'handleLogin',
            Failed::class => 'handleFailed',
            Logout::class => 'handleLogout',
        ];
    }

    private function log(User $user, string $action, string $title): void
    {
        $this->activityLog->log([
            'user' => $user,
            'category' => 'authentication',
            'action' => $action,
            'title' => $title,
            'status' => 'success',
            'product' => $this->product(),
        ]);
    }

    private function product(): string
    {
        return request()->is('admin', 'admin/*') ? 'admin' : 'publisher';
    }
}
