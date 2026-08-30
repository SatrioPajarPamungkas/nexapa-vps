<?php

namespace Tests\Unit;

use App\Exceptions\UserProvisioningException;
use App\Services\Crm\CrmUserDirectoryService;
use App\Services\Provisioning\CrmProvisioningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CrmProvisioningServiceTest extends TestCase
{
    use RefreshDatabase;

    private const USER_ID = '550e8400-e29b-41d4-a716-446655440001';

    private const ACCOUNT_ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c1';

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.crm_supabase.url', 'https://crm-test.supabase.co');
        config()->set('services.crm_supabase.service_role_key', 'test-service-role-key');
        config()->set('services.crm_supabase.timeout', 10);
    }

    public function test_is_configured_returns_true_when_credentials_exist(): void
    {
        $service = $this->createService();

        $this->assertTrue($service->isConfigured());
    }

    public function test_is_configured_returns_false_when_url_missing(): void
    {
        config()->set('services.crm_supabase.url', null);
        $service = $this->createService();

        $this->assertFalse($service->isConfigured());
    }

    public function test_is_configured_returns_false_when_key_missing(): void
    {
        config()->set('services.crm_supabase.service_role_key', null);
        $service = $this->createService();

        $this->assertFalse($service->isConfigured());
    }

    public function test_create_auth_user_with_password_sends_plaintext(): void
    {
        Http::fake([
            '/auth/v1/admin/users' => Http::response([
                'id' => self::USER_ID,
                'email' => 'user@example.com',
            ], 201),
        ]);

        $service = $this->createService();
        $plaintextPassword = 'myplaintext123';
        $result = $service->createAuthUserWithPassword(
            email: 'user@example.com',
            fullName: 'Test User',
            emailVerified: false,
            temporaryPassword: $plaintextPassword
        );

        $this->assertEquals(self::USER_ID, $result['user_id']);

        Http::assertSent(function (Request $request) use ($plaintextPassword) {
            $body = $request->data() ?? [];

            return str_contains($request->url(), '/auth/v1/admin/users')
                && ($body['password'] ?? '') === $plaintextPassword
                && ! str_starts_with($body['password'] ?? '', '$2');
        });
    }

    public function test_update_auth_user_password_sends_plaintext(): void
    {
        Http::fake(['*' => Http::response(['id' => self::USER_ID], 200)]);

        $service = $this->createService();
        $service->updateAuthUserPassword(self::USER_ID, 'new-password-123');

        Http::assertSent(function (Request $request) {
            $body = $request->data() ?? [];

            return $request->method() === 'PUT'
                && str_contains($request->url(), '/auth/v1/admin/users/'.self::USER_ID)
                && ($body['password'] ?? null) === 'new-password-123';
        });
    }

    public function test_create_account_with_prefer_header(): void
    {
        Http::fake([
            '/rest/v1/accounts' => Http::response([[
                    'id' => self::ACCOUNT_ID,
                    'name' => 'Test Workspace',
                ]], 201),
        ]);

        $service = $this->createService();
        $result = $service->createAccount(
            ownerUserId: self::USER_ID,
            workspaceName: 'Test Workspace'
        );

        $this->assertEquals(self::ACCOUNT_ID, $result['account_id']);

        Http::assertSent(fn (Request $request): bool => str_contains($request->url(), '/rest/v1/accounts')
            && str_contains(strtolower(implode(',', $request->header('Prefer'))), 'return=representation'));
    }

    public function test_create_profile_parses_array_response(): void
    {
        Http::fake([
            '/rest/v1/profiles' => Http::response([[
                'id' => 'profile-id',
                'user_id' => self::USER_ID,
                'account_id' => self::ACCOUNT_ID,
            ]], 201),
        ]);

        $service = $this->createService();
        $result = $service->createProfile(
            userId: self::USER_ID,
            accountId: self::ACCOUNT_ID,
            fullName: 'Test User',
            email: 'test@example.com'
        );

        $this->assertEquals('owner', $result['account_role']);
    }

    public function test_create_profile_requires_real_profile_id(): void
    {
        Http::fake(['*' => Http::response([['user_id' => self::USER_ID]], 201)]);

        $this->expectException(UserProvisioningException::class);

        $this->createService()->createProfile(
            self::USER_ID,
            self::ACCOUNT_ID,
            'Test User',
            'test@example.com',
        );
    }

    public function test_delete_auth_user_throws_on_500(): void
    {
        Http::fake(['*' => Http::response([], 500)]);

        $service = $this->createService();

        $this->expectException(UserProvisioningException::class);

        $service->deleteAuthUser(self::USER_ID);
    }

    public function test_delete_auth_user_throws_on_401(): void
    {
        Http::fake(['*' => Http::response([], 401)]);

        $service = $this->createService();

        $this->expectException(UserProvisioningException::class);

        $service->deleteAuthUser(self::USER_ID);
    }

    public function test_delete_auth_user_throws_on_403(): void
    {
        Http::fake(['*' => Http::response([], 403)]);

        $service = $this->createService();

        $this->expectException(UserProvisioningException::class);

        $service->deleteAuthUser(self::USER_ID);
    }

    public function test_delete_auth_user_throws_on_409(): void
    {
        Http::fake(['*' => Http::response([], 409)]);

        $service = $this->createService();

        $this->expectException(UserProvisioningException::class);

        $service->deleteAuthUser(self::USER_ID);
    }

    public function test_delete_auth_user_succeeds_on_404(): void
    {
        Http::fake(['*' => Http::response([], 404)]);

        $service = $this->createService();
        $service->deleteAuthUser(self::USER_ID);

        $this->assertTrue(true);
    }

    public function test_delete_account_throws_on_500(): void
    {
        Http::fake(['*' => Http::response([], 500)]);

        $service = $this->createService();

        $this->expectException(UserProvisioningException::class);

        $service->deleteAccount(self::ACCOUNT_ID);
    }

    public function test_delete_profile_throws_on_500(): void
    {
        Http::fake(['*' => Http::response([], 500)]);

        $service = $this->createService();

        $this->expectException(UserProvisioningException::class);

        $service->deleteProfile('profile-id');
    }

    public function test_duplicate_lookup_throws_on_connection_failure(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Connection timeout');
        });

        $service = $this->createService();

        $this->expectException(UserProvisioningException::class);
        $this->expectExceptionMessage('Direktori CRM tidak tersedia');

        $service->userExistsByEmail('test@example.com');
    }

    public function test_flushes_cache(): void
    {
        Http::fake(['*' => Http::response(['users' => []], 200)]);

        $directoryService = $this->createMock(CrmUserDirectoryService::class);
        $directoryService->expects($this->once())->method('flushCache');

        $service = new CrmProvisioningService($directoryService);
        $service->flushCache();
    }

    private function createService(): CrmProvisioningService
    {
        $directoryService = new CrmUserDirectoryService;

        return new CrmProvisioningService($directoryService);
    }
}
