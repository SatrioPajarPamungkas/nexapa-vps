<?php

namespace Tests\Unit;

use App\Data\Crm\CrmUserData;
use App\Models\User;
use App\Services\UnifiedUserDirectoryService;
use Tests\TestCase;

class UnifiedUserDirectoryServiceTest extends TestCase
{
    public function test_publisher_only_and_crm_only_users_keep_their_sources(): void
    {
        $publisher = $this->publisher('1', 'Publisher User', 'publisher@example.com', true);
        $crm = $this->crm('550e8400-e29b-41d4-a716-446655440000', 'CRM User', 'crm@example.com', true);

        $records = app(UnifiedUserDirectoryService::class)->merge([$publisher], [$crm]);

        $this->assertCount(2, $records);
        $this->assertSame('Publisher', $records[0]['product']);
        $this->assertSame('CRM', $records[1]['product']);
    }

    public function test_normalized_verified_email_is_marked_as_related(): void
    {
        $publisher = $this->publisher('1', 'Aji Publisher', '  AJI@Example.com ', true);
        $crm = $this->crm('550e8400-e29b-41d4-a716-446655440000', 'Aji CRM', 'aji@example.com', true);

        $records = app(UnifiedUserDirectoryService::class)->merge([$publisher], [$crm]);

        $this->assertCount(1, $records);
        $this->assertSame('Publisher + CRM', $records[0]['product']);
        $this->assertSame('Terkait melalui email', $records[0]['link_status']);
        $this->assertSame('aji@example.com', UnifiedUserDirectoryService::normalizeEmail('  AJI@Example.com '));
    }

    public function test_same_name_with_different_email_is_never_combined(): void
    {
        $publisher = $this->publisher('1', 'Nama Sama', 'one@example.com', true);
        $crm = $this->crm('550e8400-e29b-41d4-a716-446655440000', 'Nama Sama', 'two@example.com', true);

        $records = app(UnifiedUserDirectoryService::class)->merge([$publisher], [$crm]);

        $this->assertCount(2, $records);
    }

    private function publisher(string $id, string $name, string $email, bool $verified): User
    {
        $user = new User([
            'name' => $name,
            'email' => $email,
            'password' => 'not-used',
        ]);
        $user->setAttribute('id', $id);
        $user->setAttribute('email_verified_at', $verified ? now() : null);
        $user->setAttribute('created_at', now());
        $user->exists = true;

        return $user;
    }

    private function crm(string $id, string $name, string $email, bool $verified): CrmUserData
    {
        return new CrmUserData(
            id: $id,
            name: $name,
            email: $email,
            avatarUrl: null,
            provider: 'Email',
            emailConfirmedAt: $verified ? now()->toIso8601String() : null,
            lastSignInAt: null,
            createdAt: now()->toIso8601String(),
            updatedAt: null,
            accountId: null,
            accountName: null,
            accountRole: null,
            accountOwnerUserId: null,
            memberCount: null,
            presenceLastSeenAt: null,
            whatsappPhoneNumberId: null,
            whatsappWabaId: null,
            whatsappStatus: null,
            whatsappConnectedAt: null,
            whatsappRegisteredAt: null,
        );
    }
}
