<?php

namespace App\Data\Provisioning;

final readonly class ProvisioningInput
{
    public function __construct(
        public string $fullName,
        public string $email,
        public string $product, // 'publisher' or 'crm'
        public string $deliveryMethod, // 'invitation', 'temporary_password'
        public ?string $temporaryPassword = null,
        public bool $emailVerified = false,
        public ?string $crmWorkspaceName = null,
        public string $publisherRole = 'user',
        public ?string $adminActorId = null,
    ) {}

    public function wantsPublisher(): bool
    {
        return $this->product === 'publisher';
    }

    public function wantsCrm(): bool
    {
        return $this->product === 'crm';
    }

    public function wantsBoth(): bool
    {
        return false;
    }

    public function useInvitation(): bool
    {
        return $this->deliveryMethod === 'invitation';
    }

    public function useTemporaryPassword(): bool
    {
        return $this->deliveryMethod === 'temporary_password';
    }

    public function normalizedEmail(): string
    {
        return strtolower(trim($this->email));
    }
}
