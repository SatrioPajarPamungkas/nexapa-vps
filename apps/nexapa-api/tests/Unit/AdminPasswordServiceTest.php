<?php

namespace Tests\Unit;

use App\Models\AdminUserCredential;
use App\Models\User;
use App\Services\AdminCredentialVaultService;
use App\Services\AdminPasswordService;
use App\Services\Crm\CrmUserDirectoryService;
use App\Services\Provisioning\CrmProvisioningService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminPasswordServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.crm_supabase.url', 'https://crm-test.supabase.co');
        config()->set('services.crm_supabase.service_role_key', 'test-service-role-key');
    }

    public function test_resets_publisher_and_stores_visible_password(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin);
        $user = User::factory()->create(['password' => Hash::make('old-password')]);

        $this->service()->reset($user->email, $user, null, 'new-visible-password', null);

        $this->assertTrue(Hash::check('new-visible-password', $user->refresh()->password));
        $this->assertSame(
            'new-visible-password',
            AdminUserCredential::where('normalized_email', strtolower($user->email))->firstOrFail()->password,
        );
    }

    public function test_resets_crm_and_publisher_with_same_password(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin);
        Http::fake(['*' => Http::response(['id' => 'crm-user-id'], 200)]);
        $user = User::factory()->create();

        $this->service()->reset($user->email, $user, 'crm-user-id', 'shared-password-123', null);

        $this->assertTrue(Hash::check('shared-password-123', $user->refresh()->password));
        Http::assertSent(fn (Request $request): bool => $request->method() === 'PUT'
            && str_contains($request->url(), '/auth/v1/admin/users/crm-user-id')
            && ($request->data()['password'] ?? null) === 'shared-password-123');
    }

    public function test_non_admin_cannot_reset_password(): void
    {
        $user = User::factory()->create();
        $this->actingAs(User::factory()->create(['is_admin' => false]));

        $this->expectException(AuthorizationException::class);
        $this->service()->reset($user->email, $user, null, 'blocked-password', auth()->id());
    }

    private function service(): AdminPasswordService
    {
        return new AdminPasswordService(
            new AdminCredentialVaultService,
            new CrmProvisioningService(new CrmUserDirectoryService),
        );
    }
}
