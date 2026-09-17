<?php

namespace Tests\Feature;

use App\Models\CommerceCustomer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PlatformAccountSeparationTest extends TestCase
{
    use RefreshDatabase;

    public function test_same_email_can_register_separate_commerce_and_publisher_accounts(): void
    {
        Notification::fake();
        $email = 'same@example.com';

        $this->postJson('/api/v1/store/auth/register', [
            'name' => 'Commerce Name',
            'email' => $email,
            'password' => 'commerce-secret',
            'password_confirmation' => 'commerce-secret',
            'terms_accepted' => true,
        ])->assertCreated();

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Publisher Name',
            'email' => $email,
            'password' => 'publisher-secret',
            'password_confirmation' => 'publisher-secret',
            'terms_accepted' => true,
        ])->assertCreated();

        $this->assertDatabaseHas('commerce_customers', [
            'email' => $email,
            'name' => 'Commerce Name',
        ]);
        $this->assertDatabaseHas('users', [
            'email' => $email,
            'name' => 'Publisher Name',
            'publisher_access_status' => 'active',
        ]);
    }

    public function test_deleting_commerce_account_does_not_delete_same_email_publisher(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $publisher = User::factory()->create([
            'email' => 'separate@example.com',
            'publisher_access_status' => 'active',
        ]);
        $commerce = CommerceCustomer::query()->create([
            'name' => 'Commerce Account',
            'email' => $publisher->email,
            'password' => 'commerce-secret',
            'email_verified_at' => now(),
            'access_status' => 'active',
            'registered_at' => now(),
        ]);

        $this->actingAs($admin)
            ->deleteJson(
                "/api/v1/commerce/accounts/commerce/{$commerce->id}/permanent",
                ['email_confirmation' => $commerce->email],
            )
            ->assertOk();

        $this->assertDatabaseMissing('commerce_customers', [
            'id' => $commerce->id,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $publisher->id,
            'email' => $publisher->email,
        ]);
    }
}
