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
}
