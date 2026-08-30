<?php

namespace App\Services;

use App\Models\UnifiedUserRecord;
use App\Models\User;
use App\Models\Subscription;
use App\Services\Provisioning\CrmProvisioningService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

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

        // CRM di-ban dan diarsipkan, bukan dihapus permanen,
        // agar workspace, kontak, chat, dan histori tetap aman.
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
            $publisher->delete();
        }

        $this->saveState($record, 'deleted');
        $this->syncSubscription($record, 'cancelled');
        $this->log('user.archived', $record);
        $this->crmDirectory->flushCache();
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
                    $action === 'user.archived'
                        ? 'Akun pengguna diarsipkan.'
                        : 'Akun pengguna disuspend.'
                ),
            [
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
