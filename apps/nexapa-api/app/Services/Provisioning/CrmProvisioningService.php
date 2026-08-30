<?php

namespace App\Services\Provisioning;

use App\Exceptions\CrmIntegrationException;
use App\Exceptions\UserProvisioningException;
use App\Services\Crm\CrmUserDirectoryService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class CrmProvisioningService
{
    private const ACCOUNT_ROLE_OWNER = 'owner';

    public function __construct(
        private readonly CrmUserDirectoryService $directoryService
    ) {}

    public function isConfigured(): bool
    {
        return $this->directoryService->isConfigured();
    }

    public function createAuthUserWithPassword(
        string $email,
        string $fullName,
        bool $emailVerified,
        string $temporaryPassword
    ): array {
        $this->ensureConfigured();

        $payload = [
            'email' => $email,
            'password' => $temporaryPassword,
            'email_confirm' => $emailVerified,
            'user_metadata' => [
                'full_name' => $fullName,
            ],
            'app_metadata' => [
                'role' => self::ACCOUNT_ROLE_OWNER,
            ],
        ];

        try {
            $response = $this->post('/auth/v1/admin/users', $payload);
            $user = $this->parseUserResponse($response);

            return [
                'user_id' => (string) $user['id'],
                'email' => (string) ($user['email'] ?? $email),
            ];
        } catch (CrmIntegrationException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::warning('CRM auth user creation failed.', [
                'exception' => $e::class,
            ]);
            throw UserProvisioningException::crmCreationFailed('Gagal membuat user');
        }
    }

    public function createAccount(string $ownerUserId, string $workspaceName): array
    {
        $this->ensureConfigured();

        $payload = [
            'name' => $workspaceName,
            'owner_user_id' => $ownerUserId,
        ];

        try {
            $response = $this->postWithReturn('/rest/v1/accounts', $payload);
            $account = $this->parsePostgrestResponse($response);

            if (empty($account['id'])) {
                throw UserProvisioningException::crmCreationFailed('Account creation failed');
            }

            return [
                'account_id' => (string) $account['id'],
                'name' => (string) ($account['name'] ?? $workspaceName),
            ];
        } catch (CrmIntegrationException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::warning('CRM account creation failed.', [
                'exception' => $e::class,
            ]);
            throw UserProvisioningException::crmCreationFailed('Gagal membuat workspace');
        }
    }

    public function createProfile(string $userId, string $accountId, string $fullName, string $email): array
    {
        $this->ensureConfigured();

        $payload = [
            'user_id' => $userId,
            'account_id' => $accountId,
            'full_name' => $fullName,
            'email' => $email,
            'role' => self::ACCOUNT_ROLE_OWNER,
            'account_role' => self::ACCOUNT_ROLE_OWNER,
        ];

        try {
            $response = $this->postWithReturn('/rest/v1/profiles', $payload);
            $profile = $this->parsePostgrestResponse($response);

            if (empty($profile['id'])) {
                throw UserProvisioningException::crmCreationFailed('Profile response missing ID');
            }

            return [
                'profile_id' => (string) $profile['id'],
                'account_role' => self::ACCOUNT_ROLE_OWNER,
            ];
        } catch (CrmIntegrationException $e) {
            throw $e;
        } catch (Throwable $e) {
            Log::warning('CRM profile creation failed.', [
                'exception' => $e::class,
            ]);
            throw UserProvisioningException::crmCreationFailed('Gagal membuat profil');
        }
    }

    public function deleteAuthUser(string $userId): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        try {
            $this->deleteWithCheck('/auth/v1/admin/users/'.$userId);
        } catch (Throwable $e) {
            Log::warning('CRM auth user deletion failed during rollback.', [
                'exception' => $e::class,
            ]);
            throw UserProvisioningException::rollbackFailed();
        }
    }

    public function suspendAuthUser(string $userId): void
    {
        $this->ensureConfigured();

        try {
            $this->put(
                '/auth/v1/admin/users/'.$userId,
                ['ban_duration' => '876000h']
            );
        } catch (Throwable $e) {
            Log::warning('CRM auth user suspension failed.', [
                'exception' => $e::class,
            ]);

            throw UserProvisioningException::crmCreationFailed(
                'Gagal suspend akun CRM'
            );
        }
    }

    public function activateAuthUser(string $userId): void
    {
        $this->ensureConfigured();

        try {
            $this->put(
                '/auth/v1/admin/users/'.$userId,
                ['ban_duration' => 'none']
            );
        } catch (Throwable $e) {
            Log::warning('CRM auth user activation failed.', [
                'exception' => $e::class,
            ]);

            throw UserProvisioningException::crmCreationFailed(
                'Gagal mengaktifkan akun CRM'
            );
        }
    }

    public function updateAuthUserPassword(string $userId, string $password): void
    {
        $this->ensureConfigured();

        try {
            $this->put('/auth/v1/admin/users/'.$userId, ['password' => $password]);
        } catch (Throwable $e) {
            Log::warning('CRM auth user password update failed.', [
                'exception' => $e::class,
            ]);

            throw UserProvisioningException::crmCreationFailed('Gagal memperbarui password CRM');
        }
    }

    public function deleteAccount(string $accountId): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        try {
            $this->deleteWithCheck('/rest/v1/accounts?id=eq.'.$accountId);
        } catch (Throwable $e) {
            Log::warning('CRM account deletion failed during rollback.', [
                'exception' => $e::class,
            ]);
            throw UserProvisioningException::rollbackFailed();
        }
    }

    public function deleteProfile(string $profileId): void
    {
        if (! $this->isConfigured()) {
            return;
        }

        try {
            $this->deleteWithCheck('/rest/v1/profiles?id=eq.'.$profileId);
        } catch (Throwable $e) {
            Log::warning('CRM profile deletion failed during rollback.', [
                'exception' => $e::class,
            ]);
            throw UserProvisioningException::rollbackFailed();
        }
    }

    public function findAccountByOwnerUserId(
        string $ownerUserId
    ): ?array {
        $this->ensureConfigured();

        $path = '/rest/v1/accounts';

        $response = $this->request()->get($path, [
            'select' => 'id,name,owner_user_id',
            'owner_user_id' => 'eq.'.$ownerUserId,
            'limit' => 1,
        ]);

        $this->ensureSuccessful($response, $path);

        $rows = $response->json();

        if (! is_array($rows)) {
            throw CrmIntegrationException::invalidResponse();
        }

        $account = $rows[0] ?? null;

        if (! is_array($account) || empty($account['id'])) {
            return null;
        }

        return [
            'account_id' => (string) $account['id'],
            'name' => (string) (
                $account['name'] ?? 'Workspace'
            ),
        ];
    }

    public function findProfileByUserId(string $userId): ?array
    {
        $this->ensureConfigured();

        $path = '/rest/v1/profiles';

        $response = $this->request()->get($path, [
            'select' => 'id,user_id,account_id,account_role',
            'user_id' => 'eq.'.$userId,
            'limit' => 1,
        ]);

        $this->ensureSuccessful($response, $path);

        $rows = $response->json();

        if (! is_array($rows)) {
            throw CrmIntegrationException::invalidResponse();
        }

        $profile = $rows[0] ?? null;

        if (! is_array($profile) || empty($profile['id'])) {
            return null;
        }

        return [
            'profile_id' => (string) $profile['id'],
            'account_id' => isset($profile['account_id'])
                ? (string) $profile['account_id']
                : null,
            'account_role' => (string) (
                $profile['account_role']
                ?? self::ACCOUNT_ROLE_OWNER
            ),
        ];
    }


public function findProfileByEmail(
    string $email
): ?array {
    $this->ensureConfigured();

    $normalizedEmail = Str::lower(
        Str::trim($email)
    );

    $path = '/rest/v1/profiles';

    $response = $this->request()->get($path, [
        'select' =>
            'id,user_id,account_id,account_role,email',
        'email' => 'ilike.'.$normalizedEmail,
        'limit' => 1,
    ]);

    $this->ensureSuccessful($response, $path);

    $rows = $response->json();

    if (! is_array($rows)) {
        throw CrmIntegrationException::invalidResponse();
    }

    $profile = $rows[0] ?? null;

    if (
        ! is_array($profile) ||
        empty($profile['id']) ||
        empty($profile['user_id'])
    ) {
        return null;
    }

    return [
        'profile_id' => (string) $profile['id'],
        'user_id' => (string) $profile['user_id'],
        'account_id' => isset($profile['account_id'])
            ? (string) $profile['account_id']
            : null,
        'account_role' => (string) (
            $profile['account_role']
            ?? self::ACCOUNT_ROLE_OWNER
        ),
    ];
}

    public function userExistsByEmail(string $normalizedEmail): bool
    {
        if (! $this->isConfigured()) {
            throw UserProvisioningException::crmNotConfigured();
        }

        try {
            $result = $this->directoryService->listUsers(
                perPage: 1,
                filters: ['search' => $normalizedEmail]
            );

            foreach ($result['users'] as $user) {
                if (strtolower(trim($user->email)) === $normalizedEmail) {
                    return true;
                }
            }

            return false;
        } catch (Throwable $e) {
            Log::warning('CRM user lookup failed.', [
                'exception' => $e::class,
            ]);
            throw UserProvisioningException::crmCreationFailed('Direktori CRM tidak tersedia');
        }
    }

    public function flushCache(): void
    {
        $this->directoryService->flushCache();
    }

    private function ensureConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw UserProvisioningException::crmNotConfigured();
        }
    }

    private function post(string $path, array $data): Response
    {
        try {
            $response = $this->request()->post($path, $data);
        } catch (ConnectionException $exception) {
            Log::warning('CRM Supabase request timed out.', [
                'endpoint' => $this->safeEndpoint($path),
            ]);
            throw UserProvisioningException::crmCreationFailed('Koneksi timeout');
        } catch (Throwable $exception) {
            Log::warning('CRM Supabase request failed.', [
                'endpoint' => $this->safeEndpoint($path),
                'exception' => $exception::class,
            ]);
            throw UserProvisioningException::crmCreationFailed('Koneksi gagal');
        }

        return $this->ensureSuccessful($response, $path);
    }

    private function postWithReturn(string $path, array $data): Response
    {
        try {
            $response = $this->request()
                ->withHeaders(['Prefer' => 'return=representation'])
                ->post($path, $data);
        } catch (ConnectionException $exception) {
            Log::warning('CRM Supabase request timed out.', [
                'endpoint' => $this->safeEndpoint($path),
            ]);
            throw UserProvisioningException::crmCreationFailed('Koneksi timeout');
        } catch (Throwable $exception) {
            Log::warning('CRM Supabase request failed.', [
                'endpoint' => $this->safeEndpoint($path),
                'exception' => $exception::class,
            ]);
            throw UserProvisioningException::crmCreationFailed('Koneksi gagal');
        }

        return $this->ensureSuccessful($response, $path);
    }

    private function put(string $path, array $data): Response
    {
        try {
            $response = $this->request()->put($path, $data);
        } catch (ConnectionException $exception) {
            Log::warning('CRM Supabase request timed out.', [
                'endpoint' => $this->safeEndpoint($path),
            ]);
            throw UserProvisioningException::crmCreationFailed('Koneksi timeout');
        } catch (Throwable $exception) {
            Log::warning('CRM Supabase request failed.', [
                'endpoint' => $this->safeEndpoint($path),
                'exception' => $exception::class,
            ]);
            throw UserProvisioningException::crmCreationFailed('Koneksi gagal');
        }

        return $this->ensureSuccessful($response, $path);
    }

    private function deleteWithCheck(string $path): Response
    {
        try {
            $response = $this->request()->delete($path);
        } catch (Throwable $e) {
            throw UserProvisioningException::rollbackFailed();
        }

        $status = $response->status();
        if ($status === 404) {
            return $response;
        }

        if (! $response->successful()) {
            Log::warning('CRM DELETE request failed.', [
                'endpoint' => $this->safeEndpoint($path),
                'status' => $status,
            ]);
            throw UserProvisioningException::rollbackFailed();
        }

        return $response;
    }

    private function ensureSuccessful(Response $response, string $endpoint): Response
    {
        if ($response->successful() || $response->status() === 201) {
            return $response;
        }

        $responseError = $response->json();

        Log::warning('CRM Supabase returned an unsuccessful response.', [
            'endpoint' => $this->safeEndpoint($endpoint),
            'status' => $response->status(),
            'code' => is_array($responseError)
                ? ($responseError['code'] ?? null)
                : null,
            'message' => is_array($responseError)
                ? ($responseError['message'] ?? null)
                : null,
            'details' => is_array($responseError)
                ? ($responseError['details'] ?? null)
                : null,
            'hint' => is_array($responseError)
                ? ($responseError['hint'] ?? null)
                : null,
        ]);

        throw UserProvisioningException::crmCreationFailed(
            is_array($responseError)
                ? ($responseError['message'] ?? 'Supabase error')
                : 'Supabase error'
        );
    }

    private function request(): PendingRequest
    {
        $url = trim((string) config('services.crm_supabase.url'));

        return Http::baseUrl(rtrim($url, '/'))
            ->withHeaders(['apikey' => $this->serviceRoleKey()])
            ->withToken($this->serviceRoleKey())
            ->acceptJson()
            ->timeout(max(1, (int) config('services.crm_supabase.timeout', 10)))
            ->retry(2, 250, throw: false);
    }

    private function serviceRoleKey(): string
    {
        return trim((string) config('services.crm_supabase.service_role_key'));
    }

    private function parseUserResponse(Response $response): array
    {
        $data = $response->json();

        if (! is_array($data)) {
            throw CrmIntegrationException::invalidResponse();
        }

        if (array_is_list($data)) {
            if (empty($data)) {
                throw CrmIntegrationException::invalidResponse();
            }
            $data = $data[0];
        }

        if (empty($data['id'])) {
            throw UserProvisioningException::crmCreationFailed('Response missing user ID');
        }

        return $data;
    }

    private function parsePostgrestResponse(Response $response): array
    {
        $data = $response->json();

        if (! is_array($data)) {
            throw CrmIntegrationException::invalidResponse();
        }

        if (array_is_list($data)) {
            if (empty($data)) {
                return [];
            }

            return $data[0];
        }

        return $data;
    }

    private function safeEndpoint(string $path): string
    {
        $url = trim((string) config('services.crm_supabase.url'));
        $host = parse_url($url, PHP_URL_HOST) ?? 'unknown';

        return $host.'/'.ltrim(Str::before($path, '?'), '/');
    }
}
