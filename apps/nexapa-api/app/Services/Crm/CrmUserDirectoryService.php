<?php

namespace App\Services\Crm;

use App\Data\Crm\CrmUserData;
use App\Exceptions\CrmIntegrationException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class CrmUserDirectoryService
{
    private const CACHE_VERSION_KEY = 'crm_user_directory:version';

    private const CACHE_SCHEMA_VERSION = 2;

    public function isConfigured(): bool
    {
        return filled($this->url()) && filled($this->serviceRoleKey());
    }

    /**
     * @return array{users: list<CrmUserData>, total: int, page: int, per_page: int}
     */
    public function listUsers(int $page = 1, int $perPage = 25, array $filters = [], ?string $sortColumn = null, string $sortDirection = 'desc'): array
    {
        $this->ensureConfigured();

        $page = max(1, $page);
        $perPage = min(max(10, $perPage), 100);
        $cacheKey = $this->cacheKey('list', [$page, $perPage, $filters, $sortColumn, $sortDirection]);

        $result = $this->remember($cacheKey, function () use ($page, $perPage, $filters, $sortColumn, $sortDirection): array {
            $response = $this->get('/auth/v1/admin/users', [
                'page' => $page,
                'per_page' => $perPage,
            ]);
            $payload = $this->jsonObject($response);
            $authUsers = $payload['users'] ?? null;

            if (! is_array($authUsers)) {
                throw CrmIntegrationException::invalidResponse();
            }

            $enrichment = $this->enrichmentForUserIds(array_values(array_filter(array_column($authUsers, 'id'), 'is_string')));
            $users = array_map(
                fn (array $authUser): CrmUserData => $this->mapUser($authUser, $enrichment),
                array_values(array_filter($authUsers, 'is_array')),
            );
            $users = $this->applyFilters($users, $filters);
            $users = $this->sortUsers($users, $sortColumn, $sortDirection);

            $total = (int) ($payload['total'] ?? $response->header('X-Total-Count') ?? count($users));

            return [
                'users' => array_map(
                    fn (CrmUserData $user): array => $user->toArray(),
                    array_values($users),
                ),
                'total' => $this->hasActiveFilters($filters) ? count($users) : max($total, count($users)),
                'page' => $page,
                'per_page' => $perPage,
            ];
        });

        if (! is_array($result) || ! is_array($result['users'] ?? null)) {
            throw CrmIntegrationException::invalidResponse();
        }

        $result['users'] = array_map(
            fn (array $user): CrmUserData => CrmUserData::fromArray($user),
            array_values(array_filter($result['users'], 'is_array')),
        );

        return $result;
    }

    public function findUser(string $userId): CrmUserData
    {
        $this->ensureConfigured();

        if (! Str::isUuid($userId)) {
            throw CrmIntegrationException::invalidResponse();
        }

        $user = $this->remember($this->cacheKey('detail', [$userId]), function () use ($userId): array {
            $authUser = $this->jsonObject($this->get('/auth/v1/admin/users/'.$userId));

            if (($authUser['id'] ?? null) !== $userId) {
                throw CrmIntegrationException::invalidResponse();
            }

            $enrichment = $this->enrichmentForUserIds([$userId], includeCounts: true);

            return $this->mapUser($authUser, $enrichment)->toArray();
        });

        if (! is_array($user)) {
            throw CrmIntegrationException::invalidResponse();
        }

        return CrmUserData::fromArray($user);
    }

    /** @return array<string, string> */
    public function workspaceOptions(): array
    {
        if (! $this->isConfigured()) {
            return [];
        }

        try {
            return $this->remember($this->cacheKey('workspaces'), function (): array {
                $rows = $this->restRows('accounts', [
                    'select' => 'id,name',
                    'order' => 'name.asc',
                    'limit' => 500,
                ]);

                $options = [];
                foreach ($rows as $row) {
                    if (is_string($row['id'] ?? null) && is_string($row['name'] ?? null)) {
                        $options[$row['id']] = $row['name'];
                    }
                }

                return $options;
            });
        } catch (Throwable) {
            return [];
        }
    }

    public function flushCache(): void
    {
        try {
            Cache::forever(self::CACHE_VERSION_KEY, $this->cacheVersion() + 1);
        } catch (Throwable $exception) {
            Log::warning('CRM directory cache could not be refreshed.', [
                'exception' => $exception::class,
            ]);
        }
    }

    /**
     * @param list<string> $userIds
     * @return array{profiles: array<string, array>, accounts: array<string, array>, whatsapp: array<string, array>, presence: array<string, array>, member_counts: array<string, int>, summaries: array<string, array>}
     */
    private function enrichmentForUserIds(array $userIds, bool $includeCounts = false): array
    {
        $empty = ['profiles' => [], 'accounts' => [], 'whatsapp' => [], 'presence' => [], 'member_counts' => [], 'summaries' => []];

        if ($userIds === []) {
            return $empty;
        }

        $profiles = $this->restRows('profiles', [
            'select' => 'user_id,full_name,email,avatar_url,role,account_id,account_role,created_at,updated_at',
            'user_id' => 'in.('.implode(',', $userIds).')',
        ]);
        $profilesByUser = $this->keyBy($profiles, 'user_id');
        $accountIds = array_values(array_unique(array_filter(array_column($profiles, 'account_id'), 'is_string')));

        if ($accountIds === []) {
            return [...$empty, 'profiles' => $profilesByUser];
        }

        $accountFilter = 'in.('.implode(',', $accountIds).')';
        $accounts = $this->restRows('accounts', [
            'select' => 'id,name,owner_user_id,created_at,updated_at',
            'id' => $accountFilter,
        ]);
        $whatsapp = $this->restRows('whatsapp_config', [
            'select' => 'account_id,phone_number_id,waba_id,status,connected_at,registered_at,subscribed_apps_at,created_at,updated_at',
            'account_id' => $accountFilter,
        ]);
        $presence = $this->restRows('member_presence', [
            'select' => 'user_id,status,last_seen_at',
            'user_id' => 'in.('.implode(',', $userIds).')',
        ]);
        $memberProfiles = $this->restRows('profiles', [
            'select' => 'account_id,user_id',
            'account_id' => $accountFilter,
        ]);

        $memberCounts = [];
        foreach ($memberProfiles as $profile) {
            if (is_string($profile['account_id'] ?? null)) {
                $memberCounts[$profile['account_id']] = ($memberCounts[$profile['account_id']] ?? 0) + 1;
            }
        }

        $summaries = [];
        if ($includeCounts) {
            foreach ($accountIds as $accountId) {
                $summaries[$accountId] = $this->accountSummary($accountId);
            }
        }

        return [
            'profiles' => $profilesByUser,
            'accounts' => $this->keyBy($accounts, 'id'),
            'whatsapp' => $this->keyBy($whatsapp, 'account_id'),
            'presence' => $this->keyBy($presence, 'user_id'),
            'member_counts' => $memberCounts,
            'summaries' => $summaries,
        ];
    }

    private function mapUser(array $authUser, array $enrichment): CrmUserData
    {
        $id = (string) ($authUser['id'] ?? '');
        $profile = $enrichment['profiles'][$id] ?? [];
        $accountId = is_string($profile['account_id'] ?? null) ? $profile['account_id'] : null;
        $account = $accountId ? ($enrichment['accounts'][$accountId] ?? []) : [];
        $whatsapp = $accountId ? ($enrichment['whatsapp'][$accountId] ?? []) : [];
        $presence = $enrichment['presence'][$id] ?? [];
        $email = (string) ($authUser['email'] ?? $profile['email'] ?? '');
        $userMetadata = is_array($authUser['user_metadata'] ?? null) ? $authUser['user_metadata'] : [];
        $appMetadata = is_array($authUser['app_metadata'] ?? null) ? $authUser['app_metadata'] : [];
        $name = trim((string) ($profile['full_name'] ?? $userMetadata['full_name'] ?? $userMetadata['name'] ?? ''));

        return new CrmUserData(
            id: $id,
            name: $name !== '' ? $name : ($email !== '' ? $email : 'User CRM'),
            email: $email,
            avatarUrl: $this->nullableString($profile['avatar_url'] ?? $userMetadata['avatar_url'] ?? $userMetadata['picture'] ?? null),
            provider: $this->providerLabel($authUser, $appMetadata),
            emailConfirmedAt: $this->nullableString($authUser['email_confirmed_at'] ?? $authUser['confirmed_at'] ?? null),
            lastSignInAt: $this->nullableString($authUser['last_sign_in_at'] ?? null),
            createdAt: $this->nullableString($authUser['created_at'] ?? $profile['created_at'] ?? null),
            updatedAt: $this->nullableString($authUser['updated_at'] ?? $profile['updated_at'] ?? null),
            accountId: $accountId,
            accountName: $this->nullableString($account['name'] ?? null),
            accountRole: $this->nullableString($profile['account_role'] ?? $profile['role'] ?? null),
            accountOwnerUserId: $this->nullableString($account['owner_user_id'] ?? null),
            memberCount: $accountId ? ($enrichment['member_counts'][$accountId] ?? null) : null,
            presenceLastSeenAt: $this->nullableString($presence['last_seen_at'] ?? null),
            whatsappPhoneNumberId: $this->nullableString($whatsapp['phone_number_id'] ?? null),
            whatsappWabaId: $this->nullableString($whatsapp['waba_id'] ?? null),
            whatsappStatus: $this->nullableString($whatsapp['status'] ?? null),
            whatsappConnectedAt: $this->nullableString($whatsapp['connected_at'] ?? null),
            whatsappRegisteredAt: $this->nullableString($whatsapp['registered_at'] ?? null),
            summary: $accountId ? ($enrichment['summaries'][$accountId] ?? []) : [],
        );
    }

    private function providerLabel(array $authUser, array $appMetadata): ?string
    {
        $provider = $appMetadata['provider'] ?? null;

        if (! is_string($provider) && is_array($authUser['identities'] ?? null)) {
            $provider = $authUser['identities'][0]['provider'] ?? null;
        }

        return is_string($provider) && $provider !== '' ? Str::of($provider)->replace('_', ' ')->title()->toString() : null;
    }

    /** @param list<CrmUserData> $users @return list<CrmUserData> */
    private function applyFilters(array $users, array $filters): array
    {
        $search = Str::lower(trim((string) ($filters['search'] ?? '')));
        $role = $filters['role'] ?? null;
        $workspace = $filters['workspace'] ?? null;
        $emailVerified = $filters['email_verified'] ?? null;
        $whatsappConfigured = $filters['whatsapp_configured'] ?? null;

        return array_values(array_filter($users, function (CrmUserData $user) use ($search, $role, $workspace, $emailVerified, $whatsappConfigured): bool {
            if ($search !== '' && ! str_contains(Str::lower($user->name.' '.$user->email.' '.($user->accountName ?? '')), $search)) {
                return false;
            }
            if (filled($role) && $user->accountRole !== $role) {
                return false;
            }
            if (filled($workspace) && $user->accountId !== $workspace) {
                return false;
            }
            if ($emailVerified !== null && ($user->emailConfirmedAt !== null) !== (bool) $emailVerified) {
                return false;
            }
            if ($whatsappConfigured !== null && ($user->whatsappPhoneNumberId !== null) !== (bool) $whatsappConfigured) {
                return false;
            }

            return true;
        }));
    }

    /** @param list<CrmUserData> $users @return list<CrmUserData> */
    private function sortUsers(array $users, ?string $column, string $direction): array
    {
        $property = match ($column) {
            'name' => 'name',
            'email' => 'email',
            'account_name' => 'accountName',
            'account_role' => 'accountRole',
            'last_sign_in_at' => 'lastSignInAt',
            default => 'createdAt',
        };

        usort($users, fn (CrmUserData $a, CrmUserData $b): int => ($direction === 'asc' ? 1 : -1) * (($a->{$property} ?? '') <=> ($b->{$property} ?? '')));

        return $users;
    }

    private function hasActiveFilters(array $filters): bool
    {
        foreach ($filters as $value) {
            if ($value !== null && $value !== '') {
                return true;
            }
        }

        return false;
    }

    /** @return array<string, int> */
    private function accountSummary(string $accountId): array
    {
        return [
            'contacts' => $this->countRows('contacts', ['account_id' => 'eq.'.$accountId]),
            'conversations' => $this->countRows('conversations', ['account_id' => 'eq.'.$accountId]),
            'messages' => $this->countRows('messages', [
                'select' => 'id,conversations!inner(account_id)',
                'conversations.account_id' => 'eq.'.$accountId,
            ]),
            'broadcasts' => $this->countRows('broadcasts', ['account_id' => 'eq.'.$accountId]),
            'templates' => $this->countRows('message_templates', ['account_id' => 'eq.'.$accountId]),
            'automations' => $this->countRows('automations', ['account_id' => 'eq.'.$accountId]),
            'api_keys' => $this->countRows('api_keys', ['account_id' => 'eq.'.$accountId]),
            'webhook_endpoints' => $this->countRows('webhook_endpoints', ['account_id' => 'eq.'.$accountId]),
        ];
    }

    private function countRows(string $table, array $query): int
    {
        $query['select'] ??= 'id';
        $response = $this->get('/rest/v1/'.$table, $query, [
            'Prefer' => 'count=exact',
            'Range' => '0-0',
        ]);
        $contentRange = (string) $response->header('Content-Range');

        return preg_match('/\/(\d+|\*)$/', $contentRange, $matches) && $matches[1] !== '*' ? (int) $matches[1] : count($this->jsonList($response));
    }

    /** @return list<array<string, mixed>> */
    private function restRows(string $table, array $query): array
    {
        return $this->jsonList($this->get('/rest/v1/'.$table, $query));
    }

    private function get(string $path, array $query = [], array $headers = []): Response
    {
        try {
            $response = $this->request()->withHeaders($headers)->get($path, $query);
        } catch (ConnectionException $exception) {
            Log::warning('CRM Supabase request timed out.', [
                'endpoint' => $this->safeEndpoint($path),
                'exception' => $exception::class,
            ]);

            throw CrmIntegrationException::unavailable();
        } catch (Throwable $exception) {
            Log::warning('CRM Supabase request failed.', [
                'endpoint' => $this->safeEndpoint($path),
                'exception' => $exception::class,
            ]);

            throw CrmIntegrationException::unavailable();
        }

        return $this->ensureSuccessful($response, $path);
    }

    private function request(): PendingRequest
    {
        return Http::baseUrl(rtrim($this->url(), '/'))
            ->withHeaders(['apikey' => $this->serviceRoleKey()])
            ->withToken($this->serviceRoleKey())
            ->acceptJson()
            ->timeout(max(1, (int) config('services.crm_supabase.timeout', 10)))
            ->retry(2, 250, throw: false);
    }

    private function ensureSuccessful(Response $response, string $endpoint): Response
    {
        if ($response->successful()) {
            return $response;
        }

        Log::warning('CRM Supabase returned an unsuccessful response.', [
            'endpoint' => $this->safeEndpoint($endpoint),
            'status' => $response->status(),
        ]);

        throw CrmIntegrationException::unavailable();
    }

    /** @return array<string, mixed> */
    private function jsonObject(Response $response): array
    {
        $data = $response->json();

        if (! is_array($data) || array_is_list($data)) {
            throw CrmIntegrationException::invalidResponse();
        }

        return $data;
    }

    /** @return list<array<string, mixed>> */
    private function jsonList(Response $response): array
    {
        $data = $response->json();

        if (! is_array($data) || ! array_is_list($data)) {
            throw CrmIntegrationException::invalidResponse();
        }

        return array_values(array_filter($data, 'is_array'));
    }

    private function ensureConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw CrmIntegrationException::missingConfiguration();
        }
    }

    private function url(): string
    {
        return trim((string) config('services.crm_supabase.url'));
    }

    private function serviceRoleKey(): string
    {
        return trim((string) config('services.crm_supabase.service_role_key'));
    }

    private function safeEndpoint(string $path): string
    {
        return parse_url($this->url(), PHP_URL_HOST).'/'.ltrim(Str::before($path, '?'), '/');
    }

    private function cacheVersion(): int
    {
        try {
            return (int) Cache::get(self::CACHE_VERSION_KEY, 1);
        } catch (Throwable) {
            return 1;
        }
    }

    private function cacheKey(string $type, array $context = []): string
    {
        return 'crm_user_directory:s'.self::CACHE_SCHEMA_VERSION.':v'.$this->cacheVersion().':'.$type.':'.hash('sha256', serialize($context));
    }

    private function remember(string $key, callable $callback): mixed
    {
        try {
            return Cache::remember($key, now()->addSeconds(max(30, min(60, (int) config('services.crm_supabase.cache_ttl', 45)))), $callback);
        } catch (CrmIntegrationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            Log::warning('CRM directory cache unavailable; using direct request.', ['exception' => $exception::class]);

            return $callback();
        }
    }

    /** @return array<string, array<string, mixed>> */
    private function keyBy(array $rows, string $key): array
    {
        $indexed = [];
        foreach ($rows as $row) {
            if (is_string($row[$key] ?? null)) {
                $indexed[$row[$key]] = $row;
            }
        }

        return $indexed;
    }

    private function nullableString(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
