<?php

namespace App\Data\Crm;

final readonly class CrmUserData
{
    public function __construct(
        public string $id,
        public string $name,
        public string $email,
        public ?string $avatarUrl,
        public ?string $provider,
        public ?string $emailConfirmedAt,
        public ?string $lastSignInAt,
        public ?string $createdAt,
        public ?string $updatedAt,
        public ?string $accountId,
        public ?string $accountName,
        public ?string $accountRole,
        public ?string $accountOwnerUserId,
        public ?int $memberCount,
        public ?string $presenceLastSeenAt,
        public ?string $whatsappPhoneNumberId,
        public ?string $whatsappWabaId,
        public ?string $whatsappStatus,
        public ?string $whatsappConnectedAt,
        public ?string $whatsappRegisteredAt,
        public array $summary = [],
    ) {}

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            id: (string) ($data['id'] ?? ''),
            name: (string) ($data['name'] ?? 'User CRM'),
            email: (string) ($data['email'] ?? ''),
            avatarUrl: self::nullableString($data['avatar_url'] ?? null),
            provider: self::nullableString($data['provider'] ?? null),
            emailConfirmedAt: self::nullableString($data['email_confirmed_at'] ?? null),
            lastSignInAt: self::nullableString($data['last_sign_in_at'] ?? null),
            createdAt: self::nullableString($data['created_at'] ?? null),
            updatedAt: self::nullableString($data['updated_at'] ?? null),
            accountId: self::nullableString($data['account_id'] ?? null),
            accountName: self::nullableString($data['account_name'] ?? null),
            accountRole: self::nullableString($data['account_role'] ?? null),
            accountOwnerUserId: self::nullableString($data['account_owner_user_id'] ?? null),
            memberCount: is_numeric($data['member_count'] ?? null) ? (int) $data['member_count'] : null,
            presenceLastSeenAt: self::nullableString($data['presence_last_seen_at'] ?? null),
            whatsappPhoneNumberId: self::nullableString($data['whatsapp_phone_number_id'] ?? null),
            whatsappWabaId: self::nullableString($data['whatsapp_waba_id'] ?? null),
            whatsappStatus: self::nullableString($data['whatsapp_status'] ?? null),
            whatsappConnectedAt: self::nullableString($data['whatsapp_connected_at'] ?? null),
            whatsappRegisteredAt: self::nullableString($data['whatsapp_registered_at'] ?? null),
            summary: is_array($data['summary'] ?? null) ? $data['summary'] : [],
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar_url' => $this->avatarUrl,
            'provider' => $this->provider,
            'email_confirmed_at' => $this->emailConfirmedAt,
            'email_verified' => $this->emailConfirmedAt !== null,
            'last_sign_in_at' => $this->lastSignInAt,
            'created_at' => $this->createdAt,
            'updated_at' => $this->updatedAt,
            'account_id' => $this->accountId,
            'account_name' => $this->accountName,
            'account_role' => $this->accountRole,
            'account_owner_user_id' => $this->accountOwnerUserId,
            'is_account_owner' => $this->accountOwnerUserId === $this->id,
            'member_count' => $this->memberCount,
            'presence_last_seen_at' => $this->presenceLastSeenAt,
            'whatsapp_phone_number_id' => $this->whatsappPhoneNumberId,
            'whatsapp_waba_id' => $this->whatsappWabaId,
            'whatsapp_status' => $this->whatsappStatus,
            'whatsapp_connected_at' => $this->whatsappConnectedAt,
            'whatsapp_registered_at' => $this->whatsappRegisteredAt,
            'whatsapp_configured' => $this->whatsappPhoneNumberId !== null,
            'summary' => $this->summary,
            'product' => 'CRM',
        ];
    }

    private static function nullableString(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
