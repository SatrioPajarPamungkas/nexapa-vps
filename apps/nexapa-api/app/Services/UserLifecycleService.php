<?php

namespace App\Services;

use App\Models\UnifiedUserRecord;
use App\Models\User;
use App\Models\Subscription;
use App\Services\Provisioning\CrmProvisioningService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Throwable;

class UserLifecycleService
{
    private const OWNER_EMAIL = 'lubelicorporation@gmail.com';

    public function __construct(
        private readonly CrmProvisioningService $crm,
        private readonly Crm\CrmUserDirectoryService $crmDirectory,
    ) {}

    public function suspend(UnifiedUserRecord $record): void
    {
        $this->ensureAllowed($record);

        if (filled($record->crm_user_id)) {
            $this->crm->suspendAuthUser(
                (string) $record->crm_user_id
            );
        }

        $publisher = $this->publisher($record);

        if ($publisher !== null) {
            $publisher->forceFill([
                'is_suspended' => true,
                'suspended_at' => now(),
                'remember_token' => null,
            ])->save();

            $publisher->tokens()->delete();
            $this->deleteSessions($publisher);
        }

        $this->saveState($record, 'suspended');
        $this->syncSubscription($record, 'suspended');
        $this->log('user.suspended', $record);
        $this->crmDirectory->flushCache();
    }

    public function activate(UnifiedUserRecord $record): void
    {
        $this->ensureAllowed($record);

        if (filled($record->crm_user_id)) {
            $this->crm->activateAuthUser(
                (string) $record->crm_user_id
            );
        }

        $publisher = $this->publisher($record, true);

        if ($publisher !== null) {
            $publisher->restore();
            $publisher->forceFill([
                'is_suspended' => false,
                'suspended_at' => null,
                'remember_token' => null,
            ])->save();
        }

        $this->saveState($record, 'active');
        $this->syncSubscription($record, 'active');
        $this->log('user.activated', $record);
        $this->crmDirectory->flushCache();
    }

    public function archive(UnifiedUserRecord $record): void
    {
        $this->ensureAllowed($record);

        // Permanent deletion is deliberately remote-first. If Supabase
        // cannot be purged we leave the local account intact, so an admin
        // can safely retry instead of ending up with an orphaned CRM user.
        $this->purgeCrm($record);

        $publisher = $this->publisher($record, true);
        $email = strtolower(trim((string) $record->email));

        DB::transaction(function () use ($record, $publisher, $email): void {
            if ($publisher !== null) {
                if (Schema::hasTable('activity_logs')) {
                    DB::table('activity_logs')
                        ->where('user_id', $publisher->getKey())
                        ->update([
                            'actor_name' => $publisher->name,
                            'actor_email' => $publisher->email,
                        ]);
                }

                $publisher->tokens()->delete();
                $this->deleteSessions($publisher);
                $this->purgePublisherData((int) $publisher->getKey());
            }

            if (Schema::hasTable('admin_user_credentials')) {
                DB::table('admin_user_credentials')
                    ->where('normalized_email', $email)
                    ->delete();
            }

            if (
                Schema::hasTable('crm_user_mappings')
                && ($publisher !== null || filled($record->crm_user_id))
            ) {
                DB::table('crm_user_mappings')
                    ->where(function ($query) use ($record, $publisher): void {
                        if ($publisher !== null) {
                            $query->where('publisher_user_id', $publisher->getKey());
                        }

                        if (filled($record->crm_user_id)) {
                            $publisher === null
                                ? $query->where('crm_user_id', $record->crm_user_id)
                                : $query->orWhere('crm_user_id', $record->crm_user_id);
                        }
                    })
                    ->delete();
            }

            if (Schema::hasTable('subscriptions')) {
                $subscriptionIds = DB::table('subscriptions')
                    ->where(function ($query) use ($record, $publisher, $email): void {
                        if ($publisher !== null) {
                            $query->where('publisher_user_id', $publisher->getKey());
                        } else {
                            $query->whereRaw('LOWER(email) = ?', [$email]);
                        }

                        if (filled($record->crm_user_id)) {
                            $query->orWhere('crm_user_id', $record->crm_user_id);
                        }
                    })
                    ->pluck('id');

                if (Schema::hasTable('subscription_usages') && $subscriptionIds->isNotEmpty()) {
                    DB::table('subscription_usages')
                        ->whereIn('subscription_id', $subscriptionIds)
                        ->delete();
                }

                DB::table('subscriptions')->whereIn('id', $subscriptionIds)->delete();
            }

            if (Schema::hasTable('admin_user_lifecycle_states')) {
                DB::table('admin_user_lifecycle_states')
                    ->where('email', $email)
                    ->when(
                        filled($record->crm_user_id),
                        fn ($query) => $query->orWhere('crm_user_id', $record->crm_user_id)
                    )
                    ->delete();
            }

            $publisher?->forceDelete();
        });

        $this->log('user.purged', $record);
        $this->crmDirectory->flushCache();
    }

    private function purgeCrm(UnifiedUserRecord $record): void
    {
        if (! $this->crm->isConfigured() || blank($record->crm_user_id)) {
            return;
        }

        try {
            if (filled($record->crm_profile_id)) {
                $this->crm->deleteProfile((string) $record->crm_profile_id);
            }

            if (filled($record->crm_account_id)) {
                $this->crm->deleteAccount((string) $record->crm_account_id);
            }

            $this->crm->deleteAuthUser((string) $record->crm_user_id);
        } catch (Throwable $exception) {
            $this->crmDirectory->flushCache();

            throw new RuntimeException(
                'Penghapusan permanen CRM gagal. Tidak ada data lokal yang dihapus; silakan coba lagi.',
                previous: $exception,
            );
        }
    }

    /** Remove rows whose FKs historically used nullOnDelete(). */
    private function purgePublisherData(int $userId): void
    {
        foreach ([
            'publisher_posts',
            'download_results',
            'media_assets',
            'download_jobs',
            'connected_accounts',
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

        // These tables cascade their pivots/children, but explicitly
        // deleting them documents and enforces the no-residue contract.
        foreach (['collections', 'appearance_themes'] as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->where('user_id', $userId)->delete();
            }
        }
    }

    private function publisher(
        UnifiedUserRecord $record,
        bool $withTrashed = false
    ): ?User {
        if (blank($record->publisher_user_id)) {
            return null;
        }

        $query = $withTrashed
            ? User::withTrashed()
            : User::query();

        return $query->find((int) $record->publisher_user_id);
    }

    private function ensureAllowed(UnifiedUserRecord $record): void
    {
        $email = strtolower(trim((string) $record->email));

        if ($email === self::OWNER_EMAIL) {
            throw new RuntimeException(
                'Akun Owner Nexapa dilindungi.'
            );
        }

        $publisher = $this->publisher($record, true);

        if ($publisher?->is_admin === true) {
            throw new RuntimeException(
                'Akun admin tidak boleh diubah dari menu ini.'
            );
        }

        if (
            $publisher !== null
            && (int) $publisher->getKey() === (int) auth()->id()
        ) {
            throw new RuntimeException(
                'Anda tidak dapat mengubah akun sendiri.'
            );
        }
    }

    private function saveState(
        UnifiedUserRecord $record,
        string $status
    ): void {
        DB::table('admin_user_lifecycle_states')->updateOrInsert(
            ['email' => strtolower(trim((string) $record->email))],
            [
                'publisher_user_id' => $record->publisher_user_id,
                'crm_user_id' => $record->crm_user_id,
                'status' => $status,
                'acted_by' => auth()->id(),
                'acted_at' => now(),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }

    private function syncSubscription(
        UnifiedUserRecord $record,
        string $status
    ): void {
        $subscription = Subscription::query()
            ->where(function ($query) use ($record): void {
                if (filled($record->publisher_user_id)) {
                    $query->where(
                        'publisher_user_id',
                        $record->publisher_user_id
                    );
                } else {
                    $query->whereRaw(
                        'LOWER(email) = LOWER(?)',
                        [$record->email]
                    );
                }
            })
            ->latest('id')
            ->first();

        if ($subscription === null) {
            return;
        }

        if (
            $status === 'active'
            && $subscription->expires_at->isPast()
        ) {
            $status = 'expired';
        }

        $subscription->forceFill([
            'status' => $status,
            'cancelled_at' =>
                $status === 'cancelled' ? now() : null,
        ])->save();
    }

    private function deleteSessions(User $user): void
    {
        if (Schema::hasTable('sessions')) {
            DB::table('sessions')
                ->where('user_id', $user->getKey())
                ->delete();
        }
    }

    private function log(
        string $action,
        UnifiedUserRecord $record
    ): void {
        (new AdminActivityLogger)->success(
            $action,
            null,
            $action === 'user.activated'
                ? 'Akun pengguna diaktifkan kembali.'
                : (
                    $action === 'user.purged'
                        ? 'Akun pengguna dihapus permanen.'
                        : 'Akun pengguna disuspend.'
                ),
            [
                'target_name' => $record->name,
                'target_email' => strtolower(trim((string) $record->email)),
                'email_hash' => hash(
                    'sha256',
                    strtolower(trim((string) $record->email))
                ),
                'publisher_user_id' => $record->publisher_user_id,
                'crm_user_id' => $record->crm_user_id,
            ]
        );
    }
}
