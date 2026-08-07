<?php

namespace Tests\Feature;

use App\Enums\MediaAssetStatus;
use App\Jobs\PublishPost;
use App\Models\ConnectedAccount;
use App\Models\MediaAsset;
use App\Models\PublisherPost;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PublisherPostTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Setting::create(['key' => 'tiktok_content_posting_mode', 'value' => 'upload_as_draft']);
    }

    public function test_valid_owned_account_and_ready_media_create_queued_post_and_dispatch_after_commit(): void
    {
        Bus::fake();
        [$user, $account, $media] = $this->publisherState(['user.info.basic', 'video.upload']);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/publisher/posts', $this->payload($account, $media));

        $response
            ->assertAccepted()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Post queued for publishing.')
            ->assertJsonPath('data.status', 'queued')
            ->assertJsonPath('data.action', 'publish_now')
            ->assertJsonMissingPath('data.connected_account')
            ->assertJsonMissingPath('data.media_asset');

        $post = PublisherPost::findOrFail($response->json('data.id'));
        $this->assertSame('upload_as_draft', $post->provider_mode);
        $this->assertSame('queued', $post->status);
        Bus::assertDispatched(PublishPost::class, fn (PublishPost $job) => $job->post->is($post));
    }

    public function test_another_users_account_is_not_disclosed(): void
    {
        Bus::fake();
        [$owner, $account, $media] = $this->publisherState(['video.upload']);
        $other = User::factory()->create();
        $media->update(['user_id' => $other->id]);
        Sanctum::actingAs($other);

        $this->postJson('/api/v1/publisher/posts', $this->payload($account, $media))
            ->assertNotFound()
            ->assertJsonPath('code', 'connected_account_not_found');

        Bus::assertNothingDispatched();
    }

    public function test_another_users_media_is_not_disclosed(): void
    {
        Bus::fake();
        [$owner, $account, $media] = $this->publisherState(['video.upload']);
        $otherMedia = $this->media(User::factory()->create());
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/publisher/posts', $this->payload($account, $otherMedia))
            ->assertNotFound()
            ->assertJsonPath('code', 'media_asset_not_found');

        Bus::assertNothingDispatched();
    }

    public function test_non_ready_media_returns_precise_conflict(): void
    {
        Bus::fake();
        [$user, $account, $media] = $this->publisherState(['video.upload']);
        $media->update(['status' => MediaAssetStatus::Pending]);
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/publisher/posts', $this->payload($account, $media))
            ->assertConflict()
            ->assertJsonPath('code', 'media_not_ready');

        Bus::assertNothingDispatched();
    }

    public function test_missing_video_upload_scope_requires_reconnect_and_agrees_with_readiness(): void
    {
        Bus::fake();
        [$user, $account, $media] = $this->publisherState(['user.info.basic']);
        Sanctum::actingAs($user);

        $this->getJson("/api/v1/publisher/accounts/{$account->id}/readiness")
            ->assertOk()
            ->assertJsonPath('status', 'action_required')
            ->assertJsonPath('reason_code', 'tiktok_reconnect_required');

        $this->postJson('/api/v1/publisher/posts', $this->payload($account, $media))
            ->assertConflict()
            ->assertJsonPath('code', 'tiktok_reconnect_required')
            ->assertJsonPath('message', 'Reconnect TikTok to grant video upload permission.');

        Bus::assertNothingDispatched();
    }

    public function test_comma_and_space_separated_scope_storage_is_normalized(): void
    {
        foreach (['user.info.basic,video.upload', 'user.info.basic video.upload'] as $storedScopes) {
            Bus::fake();
            [$user, $account, $media] = $this->publisherState(['placeholder']);
            $account->setRawAttributes(array_merge($account->getAttributes(), ['scopes' => $storedScopes]));
            $account->save();
            Sanctum::actingAs($user);

            $this->getJson("/api/v1/publisher/accounts/{$account->id}/readiness")
                ->assertOk()
                ->assertJsonPath('status', 'ready');

            $this->postJson('/api/v1/publisher/posts', $this->payload($account, $media))->assertAccepted();
        }
    }

    private function publisherState(array $scopes): array
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok account',
            'status' => 'connected',
            'is_default' => true,
            'scopes' => $scopes,
        ]);

        return [$user, $account, $this->media($user)];
    }

    private function media(User $user): MediaAsset
    {
        $path = "publisher-media/{$user->id}/".fake()->uuid().'.mp4';
        Storage::disk('local')->put($path, 'video');

        return MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'video',
            'original_name' => 'video.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 5,
            'status' => MediaAssetStatus::Available,
        ]);
    }

    private function payload(ConnectedAccount $account, MediaAsset $media): array
    {
        return [
            'connected_account_id' => $account->id,
            'media_asset_id' => $media->id,
            'caption' => 'Test caption',
            'action' => 'publish_now',
            'scheduled_at' => null,
        ];
    }
}
