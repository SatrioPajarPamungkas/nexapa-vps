<?php

namespace App\Services;

use App\Data\Crm\CrmUserData;
use App\Exceptions\CrmIntegrationException;
use App\Filament\Resources\UserResource;
use App\Models\User;
use App\Services\Crm\CrmUserDirectoryService;
use Illuminate\Support\Str;

class UnifiedUserDirectoryService
{
    public function __construct(private readonly CrmUserDirectoryService $crm) {}

    /**
     * @return array{records: list<array<string, mixed>>, total: int, crm_error: ?string}
     */
    public function list(int $page = 1, int $perPage = 20, array $filters = []): array
    {
        $page = max(1, $page);
        $perSource = max(5, (int) ceil($perPage / 2));
        $search = trim((string) ($filters['search'] ?? ''));

        $publisherQuery = UserResource::getEloquentQuery()
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")));
        $publisherTotal = (clone $publisherQuery)->count();
        $publisherUsers = $publisherQuery
            ->latest('created_at')
            ->forPage($page, $perSource)
            ->limit($perSource)
            ->get();

        $crmUsers = [];
        $crmTotal = 0;
        $crmError = null;

        try {
            $crmResult = $this->crm->listUsers(
                page: $page,
                perPage: $perSource,
                filters: ['search' => $search],
            );
            $crmUsers = $crmResult['users'];
            $crmTotal = $crmResult['total'];
        } catch (CrmIntegrationException $exception) {
            $crmError = $exception->getMessage();
        }

        $records = $this->merge($publisherUsers->all(), $crmUsers);
        $source = $filters['source'] ?? null;
        if (filled($source)) {
            $records = array_values(array_filter($records, fn (array $record): bool => match ($source) {
                'publisher' => $record['publisher_user_id'] !== null,
                'crm' => $record['crm_user_id'] !== null,
                'both' => $record['publisher_user_id'] !== null && $record['crm_user_id'] !== null,
                default => true,
            }));
        }

        usort($records, fn (array $a, array $b): int => strcmp((string) ($b['registered_at'] ?? ''), (string) ($a['registered_at'] ?? '')));

        return [
            'records' => array_slice($records, 0, $perPage),
            'total' => max(count($records), $publisherTotal + $crmTotal),
            'crm_error' => $crmError,
        ];
    }

    /**
     * Matching is deliberately email-only. Names are never used as identity keys.
     *
     * @param list<User> $publisherUsers
     * @param list<CrmUserData> $crmUsers
     * @return list<array<string, mixed>>
     */
    public function merge(array $publisherUsers, array $crmUsers): array
    {
        $records = [];
        $emailIndex = [];

        foreach ($publisherUsers as $user) {
            $emailKey = self::normalizeEmail($user->email);
            $index = count($records);
            $records[] = [
                'id' => '',
                'source' => 'publisher',
                'source_user_id' => (string) $user->getKey(),
                'publisher_user_id' => (string) $user->getKey(),
                'crm_user_id' => null,
                'name' => $user->name,
                'email' => $user->email,
                'product' => 'Publisher',
                'registered_at' => $user->created_at?->toIso8601String(),
                'publisher_registered_at' => $user->created_at?->toIso8601String(),
                'crm_registered_at' => null,
                'email_verified' => $user->email_verified_at !== null,
                'publisher_email_verified' => $user->email_verified_at !== null,
                'crm_email_verified' => false,
                'link_status' => null,
            ];

            if ($emailKey !== '') {
                $emailIndex[$emailKey] = $index;
            }
        }

        foreach ($crmUsers as $crmUser) {
            $emailKey = self::normalizeEmail($crmUser->email);
            if ($emailKey !== '' && array_key_exists($emailKey, $emailIndex)) {
                $index = $emailIndex[$emailKey];
                $publisherVerified = (bool) $records[$index]['publisher_email_verified'];
                $crmVerified = $crmUser->emailConfirmedAt !== null;
                $records[$index] = [
                    ...$records[$index],
                    'id' => self::encodeKey($records[$index]['publisher_user_id'], $crmUser->id),
                    'source' => 'publisher_crm',
                    'source_user_id' => $records[$index]['publisher_user_id'].' / '.$crmUser->id,
                    'crm_user_id' => $crmUser->id,
                    'product' => 'Publisher + CRM',
                    'registered_at' => max((string) $records[$index]['registered_at'], (string) $crmUser->createdAt),
                    'crm_registered_at' => $crmUser->createdAt,
                    'email_verified' => $publisherVerified && $crmVerified,
                    'crm_email_verified' => $crmVerified,
                    'link_status' => $publisherVerified && $crmVerified ? 'Terkait melalui email' : 'Kemungkinan akun terkait',
                ];

                continue;
            }

            $records[] = [
                'id' => self::encodeKey(null, $crmUser->id),
                'source' => 'crm',
                'source_user_id' => $crmUser->id,
                'publisher_user_id' => null,
                'crm_user_id' => $crmUser->id,
                'name' => $crmUser->name,
                'email' => $crmUser->email,
                'product' => 'CRM',
                'registered_at' => $crmUser->createdAt,
                'publisher_registered_at' => null,
                'crm_registered_at' => $crmUser->createdAt,
                'email_verified' => $crmUser->emailConfirmedAt !== null,
                'publisher_email_verified' => false,
                'crm_email_verified' => $crmUser->emailConfirmedAt !== null,
                'link_status' => null,
            ];
        }

        foreach ($records as &$record) {
            $record['id'] = $record['id'] ?: self::encodeKey($record['publisher_user_id'], $record['crm_user_id']);
        }

        return $records;
    }

    public function detailFromKey(string $key): array
    {
        [$publisherId, $crmId] = self::decodeKey($key);
        $publisher = null;
        $crm = null;
        $crmError = null;

        if ($publisherId !== null) {
            $publisher = UserResource::getEloquentQuery()->find($publisherId);
        }

        if ($crmId !== null) {
            try {
                $crm = $this->crm->findUser($crmId);
            } catch (CrmIntegrationException $exception) {
                $crmError = $exception->getMessage();
            }
        }

        return compact('publisher', 'crm', 'crmError');
    }

    public static function normalizeEmail(?string $email): string
    {
        return Str::lower(trim((string) $email));
    }

    public static function encodeKey(?string $publisherId, ?string $crmId): string
    {
        return rtrim(strtr(base64_encode(json_encode(['p' => $publisherId, 'c' => $crmId], JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    }

    /** @return array{0: ?string, 1: ?string} */
    public static function decodeKey(string $key): array
    {
        $decoded = base64_decode(strtr($key, '-_', '+/'), true);
        $data = $decoded === false ? null : json_decode($decoded, true);

        if (! is_array($data)) {
            return [null, null];
        }

        return [is_scalar($data['p'] ?? null) ? (string) $data['p'] : null, is_string($data['c'] ?? null) ? $data['c'] : null];
    }
}
