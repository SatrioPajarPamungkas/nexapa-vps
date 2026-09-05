<?php

namespace Tests\Feature;

use App\Models\ConnectedAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConnectedAccountRemovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_removal_permanently_deletes_parent_and_child_accounts_without_cache(): void
    {
        Http::fake();

        $user = User::factory()->create(['is_admin' => true]);

        $parent = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'facebook',
            'account_type' => 'facebook_admin',
            'external_account_id' => 'facebook-admin-1',
            'display_name' => 'Facebook Admin',
            'status' => 'connected',
            'connection_method' => 'oauth',
            'is_default' => true,
            'is_publishable' => false,
            'metadata' => ['cached_profile' => true],
            'scopes' => ['pages_show_list'],
            'access_token_encrypted' => 'parent-secret-token',
            'refresh_token_encrypted' => 'parent-refresh-token',
        ]);

        $child = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'facebook',
            'account_type' => 'facebook_page',
            'parent_connected_account_id' => $parent->id,
            'external_account_id' => 'facebook-page-1',
            'display_name' => 'Facebook Page',
            'status' => 'connected',
            'connection_method' => 'oauth',
            'is_default' => false,
            'is_publishable' => true,
            'metadata' => ['cached_page' => true],
            'scopes' => ['pages_manage_posts'],
            'access_token_encrypted' => 'child-secret-token',
        ]);

        Sanctum::actingAs($user);

        $response = $this->deleteJson("/api/v1/connected-accounts/{$parent->id}");

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Account permanently removed.')
            ->assertHeaderContains('Cache-Control', 'no-store');

        $this->assertDatabaseMissing('connected_accounts', ['id' => $parent->id]);
        $this->assertDatabaseMissing('connected_accounts', ['id' => $child->id]);
        $this->assertNull(ConnectedAccount::withTrashed()->find($parent->id));
        $this->assertNull(ConnectedAccount::withTrashed()->find($child->id));
    }

    public function test_account_list_response_is_not_cacheable(): void
    {
        $user = User::factory()->create(['is_admin' => true]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/connected-accounts')
            ->assertOk()
            ->assertHeaderContains('Cache-Control', 'no-store');
    }

    public function test_user_cannot_remove_another_users_account(): void
    {
        $owner = User::factory()->create(['is_admin' => true]);
        $otherUser = User::factory()->create(['is_admin' => true]);

        $account = ConnectedAccount::create([
            'user_id' => $owner->id,
            'platform' => 'tiktok',
            'external_account_id' => 'tiktok-owner-1',
            'display_name' => 'Owner TikTok',
            'status' => 'connected',
            'connection_method' => 'oauth',
            'access_token_encrypted' => 'owner-secret-token',
        ]);

        Sanctum::actingAs($otherUser);

        $this->deleteJson("/api/v1/connected-accounts/{$account->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('connected_accounts', [
            'id' => $account->id,
            'deleted_at' => null,
        ]);
    }
}
