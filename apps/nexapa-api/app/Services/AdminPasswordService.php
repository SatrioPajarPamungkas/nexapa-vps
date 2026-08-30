<?php

namespace App\Services;

use App\Exceptions\UserProvisioningException;
use App\Models\User;
use App\Services\Provisioning\CrmProvisioningService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Throwable;

class AdminPasswordService
{
    public function __construct(
        private readonly AdminCredentialVaultService $credentialVault,
        private readonly CrmProvisioningService $crmService,
    ) {}

    public function reset(
        string $email,
        ?User $publisher,
        ?string $crmUserId,
        string $newPassword,
        ?int $actorId,
    ): void {
        if (! auth()->user()?->isAdmin()) {
            throw new AuthorizationException('Hanya Super Admin yang dapat mengubah password akun.');
        }

        $existingCredential = $this->credentialVault->find($email);
        $oldPassword = $existingCredential?->password;
        $crmUpdated = false;
        $publisherUpdated = false;

        try {
            if ($crmUserId !== null) {
                $this->crmService->updateAuthUserPassword($crmUserId, $newPassword);
                $crmUpdated = true;
            }

            if ($publisher !== null) {
                $publisher->forceFill(['password' => Hash::make($newPassword)])->save();
                $publisherUpdated = true;
            }

            $products = array_values(array_filter([
                $publisher !== null ? 'Publisher' : null,
                $crmUserId !== null ? 'CRM' : null,
            ]));
            $this->credentialVault->store($email, $products, $newPassword, $actorId);

            app(AdminActivityLogger::class)->success(
                'user.password_changed',
                description: 'Password akun diubah oleh admin.',
                metadata: [
                    'email_hash' => hash('sha256', strtolower(trim($email))),
                    'products' => $products,
                    'actor_id' => $actorId,
                ],
            );
        } catch (Throwable $e) {
            if ($oldPassword !== null) {
                $this->rollback($publisher, $crmUserId, $oldPassword, $publisherUpdated, $crmUpdated);
                $this->credentialVault->store(
                    $email,
                    $existingCredential?->products ?? [],
                    $oldPassword,
                    $existingCredential?->created_by,
                );
            }

            Log::error('Admin password reset failed.', [
                'exception' => $e::class,
                'rollback_available' => $oldPassword !== null,
            ]);

            throw UserProvisioningException::publisherCreationFailed('Gagal memperbarui password akun.');
        }
    }

    private function rollback(
        ?User $publisher,
        ?string $crmUserId,
        string $oldPassword,
        bool $publisherUpdated,
        bool $crmUpdated,
    ): void {
        try {
            if ($publisherUpdated && $publisher !== null) {
                $publisher->forceFill(['password' => Hash::make($oldPassword)])->save();
            }
        } catch (Throwable $e) {
            Log::critical('Publisher password rollback failed.', ['exception' => $e::class]);
        }

        try {
            if ($crmUpdated && $crmUserId !== null) {
                $this->crmService->updateAuthUserPassword($crmUserId, $oldPassword);
            }
        } catch (Throwable $e) {
            Log::critical('CRM password rollback failed.', ['exception' => $e::class]);
        }
    }
}
