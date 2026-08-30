<?php

namespace App\Services\Provisioning;

use App\Data\Provisioning\ProvisioningInput;
use App\Data\Provisioning\UserProvisioningResult;
use App\Exceptions\UserProvisioningException;
use App\Services\AdminActivityLogger;
use App\Services\AdminCredentialVaultService;
use App\Services\Crm\CrmUserDirectoryService;
use Illuminate\Support\Facades\Log;
use Throwable;

class UnifiedUserProvisioningService
{
    private ?AdminActivityLogger $logger = null;

    private readonly AdminCredentialVaultService $credentialVault;

    public function __construct(
        private readonly PublisherProvisioningService $publisherService,
        private readonly CrmProvisioningService $crmService,
        private readonly CrmUserDirectoryService $crmDirectoryService,
        ?AdminCredentialVaultService $credentialVault = null,
    ) {
        $this->credentialVault = $credentialVault ?? app(AdminCredentialVaultService::class);
    }

    public function provision(ProvisioningInput $input): UserProvisioningResult
    {
        $normalizedEmail = $input->normalizedEmail();
        $this->logger = new AdminActivityLogger;

        try {
            return $this->executeProvisioning($input, $normalizedEmail);
        } catch (UserProvisioningException $e) {
            $this->logFailure('user.provision', $normalizedEmail, $input);

            throw $e;
        } catch (Throwable $e) {
            $this->logFailure('user.provision', $normalizedEmail, $input);

            throw UserProvisioningException::crmCreationFailed('Terjadi kesalahan');
        }
    }

    private function executeProvisioning(ProvisioningInput $input, string $normalizedEmail): UserProvisioningResult
    {
        if (! $input->useTemporaryPassword() || $input->temporaryPassword === null) {
            throw UserProvisioningException::publisherCreationFailed('Password wajib ditentukan oleh admin.');
        }

        $this->validateNoDuplicateEmail($input, $normalizedEmail);

        $result = new UserProvisioningResult;

        if ($input->wantsPublisher()) {
            $result = $this->provisionPublisher($input);
        }

        if ($input->wantsCrm()) {
            $crmResult = $this->provisionCrm($input, $result);
            $result = $this->mergeResults($result, $crmResult);
        }

        try {
            $this->credentialVault->store(
                $normalizedEmail,
                $result->getCreatedProducts(),
                $input->temporaryPassword,
                $input->adminActorId !== null ? (int) $input->adminActorId : null,
            );
        } catch (Throwable $e) {
            if ($result->crmCreated) {
                $this->compensateCrmResources($result->crmProfileId, $result->crmAccountId, $result->crmUserId);
            }
            if ($result->publisherCreated) {
                $this->compensatePublisher($result->publisherUserId);
            }

            throw UserProvisioningException::publisherCreationFailed('Credential vault gagal menyimpan password.');
        }

        return $result;
    }

    private function validateNoDuplicateEmail(ProvisioningInput $input, string $normalizedEmail): void
    {
        if ($input->wantsPublisher() && $this->publisherService->emailExists($normalizedEmail)) {
            throw UserProvisioningException::duplicateEmail('Publisher');
        }

        if ($input->wantsCrm()) {
            if ($this->crmService->userExistsByEmail($normalizedEmail)) {
                throw UserProvisioningException::duplicateEmail('CRM');
            }
        }
    }

    private function provisionPublisher(ProvisioningInput $input): UserProvisioningResult
    {
        $result = $this->publisherService->create($input);

        $this->logSuccess('user.publisher_created', $input, $result);

        return new UserProvisioningResult(
            publisherCreated: $result->publisherCreated,
            publisherUserId: $result->publisherUserId,
            crmCreated: false,
            crmUserId: null,
            crmAccountId: null,
            crmProfileId: null,
            temporaryPassword: $result->temporaryPassword,
            invitationSent: false,
            fullSuccess: true,
        );
    }

    private function provisionCrm(ProvisioningInput $input, UserProvisioningResult $existingResult): UserProvisioningResult
    {
        $authUserId = null;
        $accountId = null;
        $profileId = null;
        try {
            $password = $this->getTemporaryPassword($input);
            $authUser = $this->crmService->createAuthUserWithPassword(
                $input->normalizedEmail(),
                $input->fullName,
                $input->emailVerified,
                $password
            );
            $authUserId = $authUser['user_id'];

            $workspaceName = $input->crmWorkspaceName
                ?? $this->generateWorkspaceName($input->fullName);

            // Trigger Supabase dapat otomatis membuat account
            // dan profile ketika auth user dibuat.
            $account = $this->crmService
                ->findAccountByOwnerUserId($authUserId);

            if ($account === null) {
                $account = $this->crmService->createAccount(
                    $authUserId,
                    $workspaceName
                );
            }

            $accountId = $account['account_id'];

            $profile = $this->crmService
                ->findProfileByUserId($authUserId);

            if ($profile === null) {
                $profile = $this->crmService->createProfile(
                    $authUserId,
                    $accountId,
                    $input->fullName,
                    $input->email
                );
            }

            $profileId = $profile['profile_id'] ?? null;

            $this->crmService->flushCache();

            $result = new UserProvisioningResult(
                publisherCreated: $existingResult->publisherCreated,
                publisherUserId: $existingResult->publisherUserId,
                crmCreated: true,
                crmUserId: $authUserId,
                crmAccountId: $accountId,
                crmProfileId: $profileId,
                temporaryPassword: $input->useTemporaryPassword() ? $this->getTemporaryPassword($input) : null,
                invitationSent: false,
                fullSuccess: true,
            );

            $this->logSuccess('user.crm_created', $input, $result);

            return $result;
        } catch (Throwable $e) {
            $this->compensateCrmResources($profileId, $accountId, $authUserId);

            if ($input->wantsBoth() && $existingResult->publisherCreated) {
                $this->compensatePublisher($existingResult->publisherUserId);
            }

            if ($e instanceof UserProvisioningException) {
                throw $e;
            }

            throw UserProvisioningException::crmCreationFailed('Gagal membuat akun CRM');
        }
    }

    private function compensateCrmResources(?string $profileId, ?string $accountId, ?string $authUserId): void
    {
        if ($profileId !== null) {
            try {
                $this->crmService->deleteProfile($profileId);
            } catch (Throwable $e) {
                Log::error('CRM profile cleanup failed.', ['exception' => $e::class]);
            }
        }

        if ($accountId !== null) {
            try {
                $this->crmService->deleteAccount($accountId);
            } catch (Throwable $e) {
                Log::error('CRM account cleanup failed.', ['exception' => $e::class]);
            }
        }

        if ($authUserId !== null) {
            try {
                $this->crmService->deleteAuthUser($authUserId);
            } catch (Throwable $e) {
                Log::error('CRM auth cleanup failed.', ['exception' => $e::class]);
            }
        }
    }

    private function compensatePublisher(?int $userId): void
    {
        if ($userId === null) {
            return;
        }

        try {
            $this->publisherService->delete($userId);
        } catch (Throwable $e) {
            Log::error('Publisher rollback failed.', ['exception' => $e::class]);
        }
    }

    private function mergeResults(UserProvisioningResult $existing, UserProvisioningResult $crm): UserProvisioningResult
    {
        if ($crm->fullSuccess) {
            return $crm;
        }

        if ($existing->publisherCreated && ! $crm->crmCreated) {
            return $existing;
        }

        return new UserProvisioningResult(
            publisherCreated: $existing->publisherCreated,
            publisherUserId: $existing->publisherUserId,
            crmCreated: false,
            crmUserId: null,
            crmAccountId: null,
            crmProfileId: null,
            temporaryPassword: $existing->temporaryPassword,
            invitationSent: false,
            fullSuccess: $existing->fullSuccess,
        );
    }

    private function getTemporaryPassword(ProvisioningInput $input): string
    {
        if ($input->useTemporaryPassword() && $input->temporaryPassword !== null) {
            return $input->temporaryPassword;
        }

        return bin2hex(random_bytes(20));
    }

    private function generateWorkspaceName(string $fullName): string
    {
        return $fullName."'s Workspace";
    }

    private function logSuccess(string $action, ProvisioningInput $input, UserProvisioningResult $result): void
    {
        if ($this->logger === null) {
            return;
        }

        $this->logger->success($action, null, $this->getDescription($result), $this->sanitizeMetadata($result->getSafeMetadata()));
    }

    private function logFailure(string $action, string $email, ProvisioningInput $input): void
    {
        if ($this->logger === null) {
            return;
        }

        $this->logger->failed($action, null, 'Gagal membuat akun', [
            'email_hash' => hash('sha256', $email),
            'email_domain' => $this->extractDomain($email),
            'products' => [$input->product],
            'actor_id' => $input->adminActorId,
            'result' => 'failed',
        ]);
    }

    private function sanitizeMetadata(array $metadata): array
    {
        $secretKeys = [
            'password', 'temporary_password', 'access_token', 'authorization',
            'service_role_key', 'invitation_link', 'secret', 'token', 'key',
        ];

        $sanitized = [];
        foreach ($metadata as $key => $value) {
            $lowerKey = strtolower($key);
            foreach ($secretKeys as $secret) {
                if (str_contains($lowerKey, $secret)) {
                    $sanitized[$key] = '[REDACTED]';

                    continue 2;
                }
            }
            if (is_array($value)) {
                $sanitized[$key] = $this->sanitizeMetadata($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }

    private function getDescription(UserProvisioningResult $result): string
    {
        $products = $result->getCreatedProducts();

        return 'Akun '.implode(' + ', $products).' berhasil dibuat.';
    }

    private function extractDomain(string $email): ?string
    {
        $parts = explode('@', $email);

        return count($parts) === 2 ? $parts[1] : null;
    }
}
