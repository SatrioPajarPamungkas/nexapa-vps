<?php

namespace Tests\Feature;

use App\Exceptions\CrmIntegrationException;
use App\Filament\Pages\CrmUsers;
use App\Models\User;
use App\Services\Crm\CrmUserDirectoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class CrmUserDirectoryTest extends TestCase
{
    use RefreshDatabase;

    private const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
    private const ACCOUNT_ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.crm_supabase.url', 'https://crm-test.supabase.co');
        config()->set('services.crm_supabase.service_role_key', 'service-role-secret-marker');
        config()->set('services.crm_supabase.cache_ttl', 30);
    }

    public function test_crm_user_list_is_mapped_from_whitelisted_fields(): void
    {
        $this->fakeSupabase();

        $result = app(CrmUserDirectoryService::class)->listUsers();
        $user = $result['users'][0]->toArray();

        $this->assertSame('Aji CRM', $user['name']);
        $this->assertSame('aji@example.com', $user['email']);
        $this->assertSame('Acme CRM', $user['account_name']);
        $this->assertSame('owner', $user['account_role']);
        $this->assertTrue($user['whatsapp_configured']);
        $this->assertStringNotContainsString('service-role-secret-marker', json_encode($user));
        $this->assertArrayNotHasKey('user_metadata', $user);
        $this->assertArrayNotHasKey('app_metadata', $user);
    }

    public function test_missing_credentials_are_handled_without_panel_error(): void
    {
        config()->set('services.crm_supabase.url', null);
        config()->set('services.crm_supabase.service_role_key', null);
        $admin = User::factory()->create(['is_admin' => true]);

        $this->expectException(CrmIntegrationException::class);
        app(CrmUserDirectoryService::class)->listUsers();

        // The page-level safe fallback is verified separately after exception behavior.
        $this->actingAs($admin);
    }

    public function test_missing_credentials_render_a_safe_empty_state(): void
    {
        config()->set('services.crm_supabase.url', null);
        config()->set('services.crm_supabase.service_role_key', null);
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->get(CrmUsers::getUrl())
            ->assertOk()
            ->assertSee('Data CRM sedang tidak tersedia');
    }

    public function test_timeout_is_handled_without_error_500_or_secret_disclosure(): void
    {
        Http::fake(['*' => Http::failedConnection('simulated timeout')]);
        Log::spy();
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->get(CrmUsers::getUrl())
            ->assertOk()
            ->assertSee('Data CRM sedang tidak tersedia')
            ->assertDontSee('service-role-secret-marker');

        Log::shouldHaveReceived('warning')
            ->withArgs(fn (string $message, array $context): bool => ! str_contains(json_encode([$message, $context]), 'service-role-secret-marker'))
            ->atLeast()
            ->once();
    }

    public function test_crm_user_detail_is_mapped_with_safe_summary_counts(): void
    {
        $this->fakeSupabase();

        $user = app(CrmUserDirectoryService::class)->findUser(self::USER_ID)->toArray();

        $this->assertSame(self::USER_ID, $user['id']);
        $this->assertSame('wa-phone-id', $user['whatsapp_phone_number_id']);
        $this->assertSame(3, $user['summary']['contacts']);
        $this->assertArrayNotHasKey('access_token', $user);
    }

    public function test_invalid_supabase_response_is_handled_safely(): void
    {
        Http::fake(['*' => Http::response(['unexpected', 'list'])]);

        $this->expectException(CrmIntegrationException::class);
        $this->expectExceptionMessage('respons yang tidak valid');

        app(CrmUserDirectoryService::class)->listUsers();
    }

    private function fakeSupabase(): void
    {
        Http::fake(function (Request $request) {
            $url = $request->url();
            parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

            if (str_contains($url, '/auth/v1/admin/users/'.self::USER_ID)) {
                return Http::response($this->authUser());
            }

            if (str_contains($url, '/auth/v1/admin/users')) {
                return Http::response(['users' => [$this->authUser()], 'total' => 1]);
            }

            if (str_contains($url, '/rest/v1/profiles')) {
                if (($query['select'] ?? '') === 'account_id,user_id') {
                    return Http::response([['account_id' => self::ACCOUNT_ID, 'user_id' => self::USER_ID]]);
                }

                return Http::response([[
                    'user_id' => self::USER_ID,
                    'full_name' => 'Aji CRM',
                    'email' => 'aji@example.com',
                    'avatar_url' => 'https://cdn.example.test/avatar.png',
                    'role' => 'user',
                    'account_id' => self::ACCOUNT_ID,
                    'account_role' => 'owner',
                    'created_at' => '2026-08-01T00:00:00Z',
                    'updated_at' => '2026-08-05T00:00:00Z',
                ]]);
            }

            if (str_contains($url, '/rest/v1/accounts')) {
                return Http::response([[
                    'id' => self::ACCOUNT_ID,
                    'name' => 'Acme CRM',
                    'owner_user_id' => self::USER_ID,
                    'created_at' => '2026-08-01T00:00:00Z',
                    'updated_at' => '2026-08-05T00:00:00Z',
                ]]);
            }

            if (str_contains($url, '/rest/v1/whatsapp_config')) {
                return Http::response([[
                    'account_id' => self::ACCOUNT_ID,
                    'phone_number_id' => 'wa-phone-id',
                    'waba_id' => 'waba-id',
                    'status' => 'connected',
                    'connected_at' => '2026-08-02T00:00:00Z',
                    'registered_at' => '2026-08-02T01:00:00Z',
                ]]);
            }

            if (str_contains($url, '/rest/v1/member_presence')) {
                return Http::response([['user_id' => self::USER_ID, 'status' => 'online', 'last_seen_at' => '2026-08-06T00:00:00Z']]);
            }

            return Http::response([], 200, ['Content-Range' => '0-0/3']);
        });
    }

    private function authUser(): array
    {
        return [
            'id' => self::USER_ID,
            'email' => 'aji@example.com',
            'email_confirmed_at' => '2026-08-01T00:01:00Z',
            'last_sign_in_at' => '2026-08-06T00:00:00Z',
            'created_at' => '2026-08-01T00:00:00Z',
            'updated_at' => '2026-08-05T00:00:00Z',
            'user_metadata' => [
                'full_name' => 'Raw Name Should Lose To Profile',
                'access_token' => 'must-never-leak',
            ],
            'app_metadata' => ['provider' => 'google', 'service_secret' => 'must-never-leak'],
            'identities' => [['provider' => 'google', 'identity_data' => ['token' => 'must-never-leak']]],
        ];
    }
}
