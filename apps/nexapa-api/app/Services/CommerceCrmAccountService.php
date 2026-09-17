<?php

namespace App\Services;

use App\Models\CrmAccount;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Provisioning\CrmProvisioningService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Throwable;

class CommerceCrmAccountService
{
    public function __construct(
        private readonly CrmProvisioningService $crm,
        private readonly PlatformSubscriptionService $subscriptions,
    ) {}

    public function create(array $data, User $actor): CrmAccount
    {
        $email = strtolower(trim($data['email']));
        $auth = $this->crm->createAuthUserWithPassword(
            $email,
            trim($data['name']),
            (bool) ($data['email_verified'] ?? true),
            $data['password'],
        );
        $remoteAccount = null;
        $profile = null;

        try {
            $remoteAccount = $this->crm->findAccountByOwnerUserId(
                $auth['user_id'],
            ) ?? $this->crm->createAccount(
                $auth['user_id'],
                trim($data['workspace_name']),
            );
            $profile = $this->crm->findProfileByUserId(
                $auth['user_id'],
            ) ?? $this->crm->createProfile(
                $auth['user_id'],
                $remoteAccount['account_id'],
                trim($data['name']),
                $email,
            );

            $account = CrmAccount::query()->create([
                'crm_user_id' => $auth['user_id'],
                'crm_account_id' => $remoteAccount['account_id'],
                'crm_profile_id' => $profile['profile_id'],
                'name' => trim($data['name']),
                'email' => $email,
                'access_status' => 'active',
                'registered_at' => now(),
            ]);

            $this->subscriptions->activateCrm(
                $account,
                $data['plan_code'],
                $data['billing_cycle'],
                $actor,
            );
            $this->crm->flushCache();

            return $account->fresh();
        } catch (Throwable $exception) {
            if ($profile !== null) {
                rescue(fn () => $this->crm->deleteProfile($profile['profile_id']));
            }
            if ($remoteAccount !== null) {
                rescue(fn () => $this->crm->deleteAccount($remoteAccount['account_id']));
            }
            rescue(fn () => $this->crm->deleteAuthUser($auth['user_id']));
            CrmAccount::query()->where('crm_user_id', $auth['user_id'])->delete();

            throw $exception;
        }
    }

    public function suspend(string $crmUserId, ?string $reason, User $actor): CrmAccount
    {
        $target = $this->resolveTarget($crmUserId);
        $this->ensureAllowed($target, $actor);
        $this->crm->suspendAuthUser($crmUserId);
        $target->update([
            'access_status' => 'suspended',
            'suspended_at' => now(),
            'suspension_reason' => filled($reason) ? trim($reason) : null,
        ]);
        $this->crm->flushCache();

        return $target->fresh();
    }

    public function activate(string $crmUserId, User $actor): CrmAccount
    {
        $target = $this->resolveTarget($crmUserId);
        $this->ensureAllowed($target, $actor);
        $this->crm->activateAuthUser($crmUserId);
        $target->update([
            'access_status' => 'active',
            'suspended_at' => null,
            'suspension_reason' => null,
        ]);
        $this->crm->flushCache();

        return $target->fresh();
    }

    public function archive(string $crmUserId, ?string $reason, User $actor): CrmAccount
    {
        $target = $this->resolveTarget($crmUserId);
        $this->ensureAllowed($target, $actor);
        $this->crm->suspendAuthUser($crmUserId);
        $target->update([
            'access_status' => 'archived',
            'suspended_at' => now(),
            'suspension_reason' => filled($reason)
                ? trim($reason)
                : 'Diarsipkan oleh administrator.',
        ]);
        $this->crm->flushCache();

        return $target->fresh();
    }

    public function forceDelete(string $crmUserId, User $actor): void
    {
        $target = $this->resolveTarget($crmUserId);
        $this->ensureAllowed($target, $actor);

        if ($target->crm_profile_id) {
            $this->crm->deleteProfile($target->crm_profile_id);
        }
        if ($target->crm_account_id) {
            $this->crm->deleteAccount($target->crm_account_id);
        }
        $this->crm->deleteAuthUser($target->crm_user_id);

        DB::transaction(function () use ($target): void {
            Subscription::query()
                ->where('product', 'crm')
                ->where('crm_user_id', $target->crm_user_id)
                ->each(fn (Subscription $subscription) => $subscription->delete());
            $target->delete();
        });
        $this->crm->flushCache();
    }

    private function resolveTarget(string $crmUserId): CrmAccount
    {
        return CrmAccount::query()
            ->where('crm_user_id', $crmUserId)
            ->firstOrFail();
    }

    private function ensureAllowed(CrmAccount $target, User $actor): void
    {
        $ownerId = trim((string) config(
            'services.nexapa_internal.owner_crm_user_id',
        ));

        if ($ownerId !== '' && hash_equals($ownerId, $target->crm_user_id)) {
            throw new AuthorizationException('Akun administrator utama dilindungi.');
        }
    }
}
