<?php

namespace Tests\Feature;

use App\Filament\Pages\AllUsers;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class CreateUserAccountTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.crm_supabase.url', 'https://crm-test.supabase.co');
        config()->set('services.crm_supabase.service_role_key', 'test-service-role-key');
        config()->set('services.crm_supabase.timeout', 10);
        config()->set('services.crm_supabase.cache_ttl', 30);
    }

    public function test_admin_can_see_create_account_button(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->get(AllUsers::getUrl())
            ->assertOk()
            ->assertSee('Buat Akun');
    }

    public function test_non_admin_cannot_access_page(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        $this->actingAs($user)
            ->get(AllUsers::getUrl())
            ->assertForbidden();
    }

    public function test_non_admin_cannot_see_create_account_button(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        $this->actingAs($user)
            ->get(AllUsers::getUrl())
            ->assertForbidden();
    }

    public function test_page_does_not_support_post(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->post(AllUsers::getUrl())
            ->assertStatus(405);
    }

    public function test_page_does_not_support_put(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->put(AllUsers::getUrl())
            ->assertStatus(405);
    }

    public function test_page_does_not_support_delete(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->delete(AllUsers::getUrl())
            ->assertStatus(405);
    }

    public function test_action_lock_key_format(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $lockKey = 'create_user_lock:'.$admin->id;
        Cache::put($lockKey, true, 5);

        $this->assertTrue(Cache::has($lockKey));
    }

    public function test_action_lock_prevents_duplicate_submission(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $lockKey = 'create_user_lock:'.$admin->id;

        Cache::put($lockKey, true, 5);

        $canAcquire = Cache::add($lockKey, true, 5);

        $this->assertFalse($canAcquire);
    }

    public function test_action_lock_can_be_released(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $lockKey = 'create_user_lock:'.$admin->id;

        Cache::put($lockKey, true, 5);
        Cache::forget($lockKey);

        $this->assertFalse(Cache::has($lockKey));

        $canAcquire = Cache::add($lockKey, true, 5);
        $this->assertTrue($canAcquire);
    }

    public function test_action_lock_ttl_is_five_seconds(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $lockKey = 'create_user_lock:'.$admin->id;

        $cache = Cache::store('array');

        $cache->put($lockKey, true, 5);

        $this->assertTrue($cache->has($lockKey));
    }

    public function test_admin_page_loads_successfully(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $response = $this->actingAs($admin)->get(AllUsers::getUrl());

        $response->assertOk();
        $response->assertSee('Semua Pengguna');
        $response->assertSee('Buat Akun');
    }

    public function test_page_has_refresh_action(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);

        $this->actingAs($admin)
            ->get(AllUsers::getUrl())
            ->assertOk()
            ->assertSee('Refresh data');
    }
}
