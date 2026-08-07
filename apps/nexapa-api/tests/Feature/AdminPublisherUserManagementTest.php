<?php

namespace Tests\Feature;

use App\Filament\Resources\UserResource;
use App\Filament\Pages\AllUsers;
use App\Filament\Pages\CrmUsers;
use App\Models\ActivityLog;
use App\Models\Collection;
use App\Models\ConnectedAccount;
use App\Models\MediaAsset;
use App\Models\PublisherPost;
use App\Models\User;
use App\Services\UnifiedUserDirectoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminPublisherUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_user_list_and_non_admin_cannot_access_panel(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create(['is_admin' => false]);

        $this->actingAs($admin)
            ->get(UserResource::getUrl('index'))
            ->assertOk()
            ->assertSee($user->name);

        $this->actingAs($user)
            ->get(UserResource::getUrl('index'))
            ->assertForbidden();
    }

    public function test_user_detail_loads_relationships_without_exposing_credentials(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create([
            'name' => 'User Tanpa Secret',
            'password' => 'password-marker-must-never-appear',
        ]);
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => 'safe-external-id',
            'display_name' => 'Akun Sosial',
            'status' => 'connected',
            'access_token_encrypted' => 'access-token-marker-must-never-appear',
            'refresh_token_encrypted' => 'refresh-token-marker-must-never-appear',
        ]);
        $media = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'Video Test',
            'original_name' => 'video.mp4',
            'media_type' => 'video',
            'storage_disk' => 'local',
            'storage_path' => 'media/video.mp4',
            'status' => 'available',
        ]);
        PublisherPost::create([
            'user_id' => $user->id,
            'connected_account_id' => $account->id,
            'media_asset_id' => $media->id,
            'platform' => 'tiktok',
            'status' => 'scheduled',
        ]);
        Collection::create(['user_id' => $user->id, 'name' => 'Favorit', 'media_count' => 1]);
        ActivityLog::create([
            'user_id' => $user->id,
            'category' => 'publisher',
            'action' => 'created',
            'title' => 'Dibuat',
            'status' => 'success',
            'metadata' => ['nested' => ['access_token' => 'hidden-token-marker']],
        ]);

        $response = $this->actingAs($admin)->get(UserResource::getUrl('view', ['record' => $user]));

        $response->assertOk()
            ->assertSee('User Tanpa Secret')
            ->assertSee('Ringkasan Penggunaan')
            ->assertDontSee('password-marker-must-never-appear')
            ->assertDontSee('access-token-marker-must-never-appear')
            ->assertDontSee('refresh-token-marker-must-never-appear')
            ->assertDontSee('hidden-token-marker');
    }

    public function test_user_without_relationships_can_be_viewed(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create();

        $this->actingAs($admin)
            ->get(UserResource::getUrl('view', ['record' => $user]))
            ->assertOk()
            ->assertSee((string) $user->id);
    }

    public function test_unified_directory_keeps_publisher_available_when_crm_is_unconfigured(): void
    {
        config()->set('services.crm_supabase.url', null);
        config()->set('services.crm_supabase.service_role_key', null);
        $admin = User::factory()->create(['is_admin' => true]);
        $user = User::factory()->create(['name' => 'Publisher Tetap Tampil']);

        $this->actingAs($admin)
            ->get(AllUsers::getUrl())
            ->assertOk()
            ->assertSee('Publisher Tetap Tampil')
            ->assertSee('Data Publisher tetap ditampilkan');

        $key = UnifiedUserDirectoryService::encodeKey((string) $user->id, null);
        $this->get(\App\Filament\Pages\UnifiedUserDetails::getUrl(['record' => $key]))
            ->assertOk()
            ->assertSee((string) $user->id);
    }

    public function test_non_admin_cannot_access_crm_or_unified_directories(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        $this->actingAs($user)->get(CrmUsers::getUrl())->assertForbidden();
        $this->get(AllUsers::getUrl())->assertForbidden();
    }
}
