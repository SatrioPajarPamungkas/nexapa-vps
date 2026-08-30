<?php

namespace Tests\Unit;

use App\Data\Provisioning\ProvisioningInput;
use App\Exceptions\UserProvisioningException;
use App\Models\ActivityLog;
use App\Models\AdminUserCredential;
use App\Models\User;
use App\Services\Crm\CrmUserDirectoryService;
use App\Services\Provisioning\CrmProvisioningService;
use App\Services\Provisioning\PublisherProvisioningService;
use App\Services\Provisioning\UnifiedUserProvisioningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class UnifiedUserProvisioningServiceTest extends TestCase
{
    use RefreshDatabase;

    private const USER_ID = '550e8400-e29b-41d4-a716-446655440001';

    private const ACCOUNT_ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c1';

    private UnifiedUserProvisioningService $service;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.crm_supabase.url', 'https://crm-test.supabase.co');
        config()->set('services.crm_supabase.service_role_key', 'test-service-role-key');
        config()->set('services.crm_supabase.timeout', 10);
        config()->set('services.crm_supabase.cache_ttl', 30);

        $this->service = new UnifiedUserProvisioningService(
            new PublisherProvisioningService,
            new CrmProvisioningService(new CrmUserDirectoryService),
            new CrmUserDirectoryService
        );
    }

    private function fakeCrmHttp(): void
    {
        Http::fake(function (Request $request) {
            $url = $request->url();
            $method = $request->method();

            if (str_contains($url, '/auth/v1/admin/users')) {
                if ($method === 'GET') {
                    return Http::response(['users' => [], 'total' => 0], 200);
                }
                if (str_contains($url, '/send_confirmation')) {
                    return Http::response([], 200);
                }

                return Http::response(['id' => self::USER_ID, 'email' => $request->data()['email'] ?? 'user@example.com'], 201);
            }

            if (str_contains($url, '/rest/v1/accounts')) {
                return Http::response([['id' => self::ACCOUNT_ID, 'name' => 'Workspace']], 201);
            }

            if (str_contains($url, '/rest/v1/profiles')) {
                return Http::response([['id' => 'profile-id', 'user_id' => self::USER_ID, 'account_id' => self::ACCOUNT_ID]], 201);
            }

            return Http::response([], 200);
        });
    }

    private function fakeCrmHttpAccountFailure(): void
    {
        Http::fake(function (Request $request) {
            $url = $request->url();
            $method = $request->method();

            if (str_contains($url, '/auth/v1/admin/users')) {
                if ($method === 'GET') {
                    return Http::response(['users' => [], 'total' => 0], 200);
                }

                return Http::response(['id' => self::USER_ID, 'email' => 'fail@example.com'], 201);
            }

            if (str_contains($url, '/rest/v1/accounts')) {
                return Http::response([], 500);
            }

            if (str_contains($url, '/rest/v1/profiles')) {
                return Http::response([], 500);
            }

            return Http::response([], 200);
        });
    }

    public function test_publisher_only_with_temporary_password(): void
    {
        $input = new ProvisioningInput(
            fullName: 'Publisher User',
            email: 'publisher@example.com',
            product: 'publisher',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'testpassword123',
            emailVerified: false,
            publisherRole: 'user',
            adminActorId: '1',
        );

        $result = $this->service->provision($input);

        $this->assertTrue($result->publisherCreated);
        $this->assertFalse($result->crmCreated);
        $this->assertTrue($result->hasTemporaryPassword());
        $this->assertEquals('testpassword123', $result->temporaryPassword);
        $this->assertTrue($result->fullSuccess);

        $user = User::find($result->publisherUserId);
        $this->assertNotNull($user);
        $this->assertTrue(password_verify('testpassword123', $user->password));

        $credential = AdminUserCredential::where('normalized_email', 'publisher@example.com')->firstOrFail();
        $this->assertSame('testpassword123', $credential->password);
        $this->assertSame(['Publisher'], $credential->products);
    }

    public function test_crm_temporary_password_sends_plaintext_to_supabase(): void
    {
        $this->fakeCrmHttp();

        $plaintextPassword = 'secretplaintext123';

        $input = new ProvisioningInput(
            fullName: 'CRM User',
            email: 'crm@example.com',
            product: 'crm',
            deliveryMethod: 'temporary_password',
            temporaryPassword: $plaintextPassword,
            emailVerified: false,
            crmWorkspaceName: 'Test Workspace',
            adminActorId: '1',
        );

        $this->service->provision($input);

        Http::assertSent(function (Request $request) use ($plaintextPassword) {
            $body = $request->data() ?? [];

            return str_contains($request->url(), '/auth/v1/admin/users')
                && isset($body['password'])
                && $body['password'] === $plaintextPassword
                && ! str_starts_with($body['password'], '$2');
        });
    }

    public function test_invitation_mode_is_rejected(): void
    {
        $this->fakeCrmHttp();

        $input = new ProvisioningInput(
            fullName: 'Invite User',
            email: 'invite@example.com',
            product: 'crm',
            deliveryMethod: 'invitation',
            emailVerified: false,
            crmWorkspaceName: 'Test Workspace',
            adminActorId: '1',
        );

        $this->expectException(UserProvisioningException::class);
        $this->service->provision($input);
    }

    public function test_temporary_password_mode_no_invitation_sent(): void
    {
        $this->fakeCrmHttp();

        $input = new ProvisioningInput(
            fullName: 'Temp User',
            email: 'temp@example.com',
            product: 'crm',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'temppass123',
            emailVerified: false,
            crmWorkspaceName: 'Test Workspace',
            adminActorId: '1',
        );

        $result = $this->service->provision($input);

        $this->assertTrue($result->crmCreated);
        $this->assertTrue($result->hasTemporaryPassword());
        $this->assertFalse($result->invitationSent);
    }

    public function test_crm_cleanup_on_account_failure(): void
    {
        $this->fakeCrmHttpAccountFailure();

        $input = new ProvisioningInput(
            fullName: 'Cleanup User',
            email: 'cleanup@example.com',
            product: 'crm',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'temppass123',
            emailVerified: false,
            crmWorkspaceName: 'Test Workspace',
            adminActorId: '1',
        );

        $this->expectException(UserProvisioningException::class);

        $this->service->provision($input);
    }

    public function test_crm_cleanup_on_profile_failure(): void
    {
        Http::fake(function (Request $request) {
            $url = $request->url();
            $method = $request->method();

            if (str_contains($url, '/auth/v1/admin/users')) {
                if ($method === 'GET') {
                    return Http::response(['users' => [], 'total' => 0], 200);
                }

                return Http::response(['id' => self::USER_ID, 'email' => 'profilefail@example.com'], 201);
            }

            if (str_contains($url, '/rest/v1/accounts')) {
                return Http::response([['id' => self::ACCOUNT_ID, 'name' => 'Workspace']], 201);
            }

            if (str_contains($url, '/rest/v1/profiles')) {
                return Http::response([], 500);
            }

            return Http::response([], 200);
        });

        $input = new ProvisioningInput(
            fullName: 'Profile Fail',
            email: 'profilefail@example.com',
            product: 'crm',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'temppass123',
            emailVerified: false,
            crmWorkspaceName: 'Test Workspace',
            adminActorId: '1',
        );

        $this->expectException(UserProvisioningException::class);

        $this->service->provision($input);
    }

    public function test_both_products_cleanup_on_crm_failure(): void
    {
        $this->fakeCrmHttpAccountFailure();

        $input = new ProvisioningInput(
            fullName: 'Both User',
            email: 'both@example.com',
            product: 'both',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'temppass123',
            emailVerified: false,
            crmWorkspaceName: 'Test Workspace',
            publisherRole: 'user',
            adminActorId: '1',
        );

        $this->expectException(UserProvisioningException::class);

        try {
            $this->service->provision($input);
        } finally {
            $user = User::where('email', 'both@example.com')->first();
            $this->assertNull($user, 'Publisher user should be rolled back');
        }
    }

    public function test_delete_failure_preserves_original_exception(): void
    {
        Http::fake(function (Request $request) {
            $url = $request->url();
            $method = $request->method();

            if (str_contains($url, '/auth/v1/admin/users')) {
                if ($method === 'GET') {
                    return Http::response(['users' => [], 'total' => 0], 200);
                }
                if ($method === 'DELETE') {
                    return Http::response([], 500);
                }

                return Http::response(['id' => self::USER_ID, 'email' => 'preserve@example.com'], 201);
            }

            if (str_contains($url, '/rest/v1/accounts')) {
                return Http::response($method === 'DELETE' ? [] : [['id' => self::ACCOUNT_ID]], $method === 'DELETE' ? 500 : 201);
            }

            if (str_contains($url, '/rest/v1/profiles')) {
                return Http::response([], 500);
            }

            return Http::response([], 200);
        });

        $input = new ProvisioningInput(
            fullName: 'Delete Fail',
            email: 'preserve@example.com',
            product: 'crm',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'temppass123',
            emailVerified: false,
            crmWorkspaceName: 'Test Workspace',
            adminActorId: '1',
        );

        try {
            $this->service->provision($input);
            $this->fail('Expected exception');
        } catch (UserProvisioningException $e) {
            $this->assertStringContainsString('Gagal', $e->getMessage());
        }
    }

    public function test_duplicate_email_publisher_throws(): void
    {
        User::factory()->create(['email' => 'duplicate@example.com']);

        $input = new ProvisioningInput(
            fullName: 'Duplicate User',
            email: 'duplicate@example.com',
            product: 'publisher',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'pass123',
            publisherRole: 'user',
            adminActorId: '1',
        );

        $this->expectException(UserProvisioningException::class);
        $this->expectExceptionMessage('Email sudah terdaftar di Publisher');

        $this->service->provision($input);
    }

    public function test_duplicate_email_crm_throws(): void
    {
        Http::fake(function (Request $request) {
            if ($request->method() === 'GET' && str_contains($request->url(), '/auth/v1/admin/users')) {
                return Http::response(
                    ['users' => [['id' => self::USER_ID, 'email' => 'crm-dup@example.com']], 'total' => 1],
                    200
                );
            }

            return Http::response([], 200);
        });

        $input = new ProvisioningInput(
            fullName: 'CRM Duplicate',
            email: 'crm-dup@example.com',
            product: 'crm',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'pass123',
            crmWorkspaceName: 'Test Workspace',
            adminActorId: '1',
        );

        $this->expectException(UserProvisioningException::class);
        $this->expectExceptionMessage('Email sudah terdaftar di CRM');

        $this->service->provision($input);
    }

    public function test_crm_lookup_failure_prevents_creation(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Connection timeout');
        });

        $input = new ProvisioningInput(
            fullName: 'Fail User',
            email: 'fail@example.com',
            product: 'crm',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'pass123',
            crmWorkspaceName: 'Test Workspace',
            adminActorId: '1',
        );

        $this->expectException(UserProvisioningException::class);
        $this->expectExceptionMessage('Direktori CRM tidak tersedia');

        $this->service->provision($input);
    }

    public function test_audit_log_no_secrets_in_metadata(): void
    {
        $input = new ProvisioningInput(
            fullName: 'Audit User',
            email: 'audit@example.com',
            product: 'publisher',
            deliveryMethod: 'temporary_password',
            temporaryPassword: 'secret123',
            publisherRole: 'user',
            adminActorId: '1',
        );

        $this->service->provision($input);

        $log = ActivityLog::where('action', 'user.publisher_created')->first();
        $this->assertNotNull($log);

        $metadata = is_string($log->metadata) ? json_decode($log->metadata, true) : $log->metadata;
        $jsonMetadata = json_encode($metadata);

        $this->assertStringNotContainsString('secret123', $jsonMetadata);
        $this->assertStringNotContainsString('test-service-role-key', $jsonMetadata);
    }

    public function test_both_products_share_same_temporary_password(): void
    {
        $this->fakeCrmHttp();

        $sharedPassword = 'sharedpassword123';

        $input = new ProvisioningInput(
            fullName: 'Both User',
            email: 'both@example.com',
            product: 'both',
            deliveryMethod: 'temporary_password',
            temporaryPassword: $sharedPassword,
            emailVerified: false,
            crmWorkspaceName: 'Both Workspace',
            publisherRole: 'user',
            adminActorId: '1',
        );

        $result = $this->service->provision($input);

        $this->assertTrue($result->publisherCreated);
        $this->assertTrue($result->crmCreated);
        $this->assertEquals($sharedPassword, $result->temporaryPassword);

        $user = User::find($result->publisherUserId);
        $this->assertTrue(password_verify($sharedPassword, $user->password));

        $credential = AdminUserCredential::where('normalized_email', 'both@example.com')->firstOrFail();
        $this->assertSame($sharedPassword, $credential->password);
        $this->assertSame(['Publisher', 'CRM'], $credential->products);
    }
}
