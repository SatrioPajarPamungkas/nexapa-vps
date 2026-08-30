<?php

namespace App\Data\Provisioning;

final readonly class UserProvisioningResult
{
    public function __construct(
        public bool $publisherCreated = false,
        public ?int $publisherUserId = null,
        public bool $crmCreated = false,
        public ?string $crmUserId = null,
        public ?string $crmAccountId = null,
        public ?string $crmProfileId = null,
        public ?string $temporaryPassword = null,
        public bool $invitationSent = false,
        public bool $fullSuccess = false,
        public array $errors = [],
    ) {}

    public function hasErrors(): bool
    {
        return $this->errors !== [];
    }

    public function partialSuccess(): bool
    {
        return ($this->publisherCreated || $this->crmCreated) && $this->hasErrors();
    }

    public function createdPublisher(): bool
    {
        return $this->publisherCreated;
    }

    public function createdCrm(): bool
    {
        return $this->crmCreated;
    }

    public function getCreatedProducts(): array
    {
        $products = [];
        if ($this->publisherCreated) {
            $products[] = 'Publisher';
        }
        if ($this->crmCreated) {
            $products[] = 'CRM';
        }

        return $products;
    }

    public function hasTemporaryPassword(): bool
    {
        return $this->temporaryPassword !== null;
    }

    public function getSafeMetadata(): array
    {
        return [
            'products' => $this->getCreatedProducts(),
            'publisher_user_id' => $this->publisherUserId,
            'crm_user_id' => $this->crmUserId ? '***' : null,
            'crm_account_id' => $this->crmAccountId ? '***' : null,
            'crm_profile_id' => $this->crmProfileId ? '***' : null,
            'invitation_sent' => $this->invitationSent,
            'temporary_password_displayed' => $this->hasTemporaryPassword(),
            'result' => $this->fullSuccess ? 'success' : ($this->partialSuccess() ? 'partial' : 'failed'),
        ];
    }
}
