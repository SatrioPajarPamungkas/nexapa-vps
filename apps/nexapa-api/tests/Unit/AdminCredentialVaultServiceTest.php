<?php

namespace Tests\Unit;

use App\Models\AdminUserCredential;
use App\Models\User;
use App\Services\AdminCredentialVaultService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminCredentialVaultServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_is_encrypted_at_rest_and_can_be_revealed(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin);
        $service = new AdminCredentialVaultService;

        $service->store(' User@Example.com ', ['Publisher', 'CRM'], 'visible-password-123', $admin->id);

        $raw = DB::table('admin_user_credentials')->where('normalized_email', 'user@example.com')->value('password');
        $this->assertIsString($raw);
        $this->assertNotSame('visible-password-123', $raw);

        $credential = AdminUserCredential::where('normalized_email', 'user@example.com')->firstOrFail();
        $this->assertSame('visible-password-123', $credential->password);
        $this->assertSame(['Publisher', 'CRM'], $credential->products);
        $this->assertSame('visible-password-123', $service->reveal('USER@example.com', $admin->id));
    }

    public function test_store_updates_existing_credential_without_duplicate_rows(): void
    {
        $service = new AdminCredentialVaultService;
        $service->store('user@example.com', ['Publisher'], 'old-password', null);
        $service->store('USER@example.com', ['Publisher'], 'new-password', null);

        $this->assertSame(1, AdminUserCredential::count());
        $this->assertSame('new-password', $service->find('user@example.com')?->password);
    }

    public function test_non_admin_cannot_reveal_password(): void
    {
        $service = new AdminCredentialVaultService;
        $service->store('user@example.com', ['Publisher'], 'hidden-password', null);
        $this->actingAs(User::factory()->create(['is_admin' => false]));

        $this->expectException(AuthorizationException::class);
        $service->reveal('user@example.com', auth()->id());
    }

    public function test_unknown_actor_id_does_not_break_system_provisioning(): void
    {
        $credential = (new AdminCredentialVaultService)->store(
            'system@example.com',
            ['CRM'],
            'system-password',
            999999,
        );

        $this->assertNull($credential->created_by);
        $this->assertSame('system-password', $credential->password);
    }
}
