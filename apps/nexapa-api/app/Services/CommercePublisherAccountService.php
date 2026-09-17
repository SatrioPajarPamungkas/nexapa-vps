<?php

namespace App\Services;

use App\Models\User;
use App\Models\Subscription;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class CommercePublisherAccountService
{
    private const OWNER_EMAIL =
        'lubelicorporation@gmail.com';

    public function __construct(
        private readonly PlatformSubscriptionService $subscriptions,
    ) {}

    public function create(array $data, User $actor): User
    {
        $email = strtolower(trim($data['email']));
        $user = User::withTrashed()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if ($user !== null && $user->publisher_access_status !== 'not_provisioned') {
            abort(422, 'Email sudah terdaftar di Publisher.');
        }

        if ($user === null) {
            $user = new User();
            $user->email = $email;
        } elseif ($user->trashed()) {
            $user->restore();
        }

        $user->forceFill([
            'name' => trim($data['name']),
            'password' => Hash::make($data['password']),
            'email_verified_at' => ($data['email_verified'] ?? true) ? now() : null,
            'role' => 'user',
            'is_admin' => false,
            'is_suspended' => false,
            'publisher_access_status' => 'active',
            'publisher_suspended_at' => null,
            'publisher_suspension_reason' => null,
        ])->save();

        $this->subscriptions->activatePublisher(
            $user,
            $data['plan_code'],
            $data['billing_cycle'],
            $actor,
        );

        return $user->fresh();
    }

    public function suspend(
        User $target,
        ?string $reason,
        User $actor,
    ): User {
        $this->ensureAllowed($target, $actor);

        $target->forceFill([
            'publisher_access_status' => 'suspended',
            'publisher_suspended_at' => now(),
            'publisher_suspension_reason' =>
                filled($reason) ? trim($reason) : null,
        ])->save();

        $this->log(
            'publisher.access_suspended',
            $target,
            $actor,
            $reason,
        );

        return $target->fresh();
    }

    public function activate(
        User $target,
        User $actor,
    ): User {
        $this->ensureAllowed($target, $actor);

        $target->forceFill([
            'publisher_access_status' => 'active',
            'publisher_suspended_at' => null,
            'publisher_suspension_reason' => null,
        ])->save();

        $this->log(
            'publisher.access_activated',
            $target,
            $actor,
        );

        return $target->fresh();
    }

    public function archive(
        User $target,
        ?string $reason,
        User $actor,
    ): User {
        $this->ensureAllowed($target, $actor);

        $target->forceFill([
            'publisher_access_status' => 'archived',
            'publisher_suspended_at' => now(),
            'publisher_suspension_reason' =>
                filled($reason)
                    ? trim($reason)
                    : 'Diarsipkan oleh administrator.',
        ])->save();

        $this->log(
            'publisher.account_archived',
            $target,
            $actor,
            $reason,
        );

        return $target->fresh();
    }

    public function forceDelete(User $target, User $actor): void
    {
        $this->ensureAllowed($target, $actor);

        DB::transaction(function () use ($target): void {
            $userId = (int) $target->getKey();

            foreach ([
                'publisher_posts',
                'download_results',
                'media_assets',
                'download_jobs',
                'connected_accounts',
                'collections',
                'appearance_themes',
            ] as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->where('user_id', $userId)->delete();
                }
            }

            if (Schema::hasTable('notifications')) {
                DB::table('notifications')
                    ->where('notifiable_type', User::class)
                    ->where('notifiable_id', $userId)
                    ->delete();
            }
            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->where('user_id', $userId)->delete();
            }

            Subscription::query()
                ->where('product', 'publisher')
                ->where('publisher_user_id', $userId)
                ->each(fn (Subscription $subscription) => $subscription->delete());
            $target->tokens()->delete();
            $target->forceDelete();
        });
    }

    private function ensureAllowed(
        User $target,
        User $actor,
    ): void {
        if (
            strtolower(trim($target->email))
                === self::OWNER_EMAIL
        ) {
            throw new AuthorizationException(
                'Akun Owner Nexapa dilindungi.',
            );
        }

        if ($target->is_admin === true) {
            throw new AuthorizationException(
                'Akun administrator tidak dapat diubah.',
            );
        }

        if (
            (int) $target->getKey()
                === (int) $actor->getKey()
        ) {
            throw new AuthorizationException(
                'Anda tidak dapat mengubah akun sendiri.',
            );
        }
    }

    private function log(
        string $action,
        User $target,
        User $actor,
        ?string $reason = null,
    ): void {
        app(AdminActivityLogger::class)->success(
            $action,
            $target,
            match ($action) {
                'publisher.access_activated' =>
                    'Akses Publisher diaktifkan.',
                'publisher.account_archived' =>
                    'Akun Publisher diarsipkan.',
                default =>
                    'Akses Publisher disuspend.',
            },
            [
                'target_user_id' => $target->getKey(),
                'email_hash' => hash(
                    'sha256',
                    strtolower(trim($target->email)),
                ),
                'actor_id' => $actor->getKey(),
                'reason' =>
                    filled($reason) ? trim($reason) : null,
            ],
        );
    }
}
