<?php

namespace Tests\Feature;

use App\Models\ConnectedAccount;
use App\Models\MediaAsset;
use App\Models\PublisherPost;
use App\Models\User;
use App\Services\OAuth\TikTokOAuthService;
use App\Services\Publisher\TikTokPublisherService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CheckTikTokPublishStatusTest extends TestCase
{
    use RefreshDatabase;

    protected TikTokPublisherService $publisherService;
    protected TikTokOAuthService $oauthService;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Queue::fake();
        
        $this->oauthService = $this->createMock(TikTokOAuthService::class);
        $settingsService = new \App\Services\SettingsService();
        $readinessService = new \App\Services\Publisher\PublisherReadinessService($settingsService);
        
        $this->publisherService = new TikTokPublisherService(
            $this->oauthService,
            $settingsService,
            $readinessService
        );
    }

    public function test_send_to_user_inbox_marks_upload_as_draft_completed(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
            'access_token_encrypted' => 'test-access-token',
            'refresh_token_encrypted' => 'test-refresh-token',
            'token_expires_at' => now()->addHour(),
        ]);

        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, 'test video');

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test video',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 10,
            'status' => 'available',
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'platform' => 'tiktok',
            'status' => 'processing',
            'provider_status' => 'PROCESSING_UPLOAD',
            'provider_publish_id' => 'test-publish-id-456',
            'provider_mode' => 'upload_as_draft',
        ]);

        Http::fake([
            'open.tiktokapis.com/v2/post/publish/status/fetch/' => Http::response([
                'data' => [
                    'status' => 'SEND_TO_USER_INBOX',
                    'uploaded_bytes' => 2048,
                ],
                'error' => [
                    'code' => 'ok',
                    'message' => '',
                    'log_id' => 'test-log-id-456',
                ],
            ], 200),
        ]);

        $job = new \App\Jobs\CheckTikTokPublishStatus($post, 1);
        $job->handle($this->publisherService, $this->oauthService);

        $post->refresh();
        $this->assertSame('completed', $post->status);
        $this->assertSame('SEND_TO_USER_INBOX', $post->provider_status);
        $this->assertNotNull($post->published_at);
    }

    public function test_publish_complete_marks_completed(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
            'access_token_encrypted' => 'test-access-token',
            'refresh_token_encrypted' => 'test-refresh-token',
            'token_expires_at' => now()->addHour(),
        ]);

        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, 'test video');

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test video',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 10,
            'status' => 'available',
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'platform' => 'tiktok',
            'status' => 'processing',
            'provider_status' => 'PROCESSING_UPLOAD',
            'provider_publish_id' => 'test-publish-id-789',
            'provider_mode' => 'upload_as_draft',
        ]);

        Http::fake([
            'open.tiktokapis.com/v2/post/publish/status/fetch/' => Http::response([
                'data' => [
                    'status' => 'PUBLISH_COMPLETE',
                ],
                'error' => [
                    'code' => 'ok',
                    'message' => '',
                    'log_id' => 'test-log-id-789',
                ],
            ], 200),
        ]);

        $job = new \App\Jobs\CheckTikTokPublishStatus($post, 1);
        $job->handle($this->publisherService, $this->oauthService);

        $post->refresh();
        $this->assertSame('completed', $post->status);
        $this->assertSame('PUBLISH_COMPLETE', $post->provider_status);
        $this->assertNotNull($post->published_at);
    }

    public function test_failed_stores_fail_reason(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
            'access_token_encrypted' => 'test-access-token',
            'refresh_token_encrypted' => 'test-refresh-token',
            'token_expires_at' => now()->addHour(),
        ]);

        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, 'test video');

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test video',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 10,
            'status' => 'available',
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'platform' => 'tiktok',
            'status' => 'processing',
            'provider_status' => 'PROCESSING_UPLOAD',
            'provider_publish_id' => 'test-publish-id-fail',
            'provider_mode' => 'upload_as_draft',
        ]);

        Http::fake([
            'open.tiktokapis.com/v2/post/publish/status/fetch/' => Http::response([
                'data' => [
                    'status' => 'FAILED',
                    'fail_reason' => 'Video processing failed: corrupted file',
                ],
                'error' => [
                    'code' => 'ok',
                    'message' => '',
                    'log_id' => 'test-log-id-fail',
                ],
            ], 200),
        ]);

        $job = new \App\Jobs\CheckTikTokPublishStatus($post, 1);
        $job->handle($this->publisherService, $this->oauthService);

        $post->refresh();
        $this->assertSame('failed', $post->status);
        $this->assertSame('provider_failed', $post->failure_code);
        $this->assertStringContainsString('Video processing failed', $post->failure_message);
        $this->assertNull($post->published_at);
    }

    public function test_missing_publish_id_fails_safely(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
            'access_token_encrypted' => 'test-access-token',
            'refresh_token_encrypted' => 'test-refresh-token',
            'token_expires_at' => now()->addHour(),
        ]);

        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, 'test video');

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test video',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 10,
            'status' => 'available',
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'platform' => 'tiktok',
            'status' => 'processing',
            'provider_status' => 'PROCESSING_UPLOAD',
            'provider_publish_id' => null,
            'provider_mode' => 'upload_as_draft',
        ]);

        $job = new \App\Jobs\CheckTikTokPublishStatus($post, 1);
        $job->handle($this->publisherService, $this->oauthService);

        $post->refresh();
        $this->assertSame('failed', $post->status);
        $this->assertSame('missing_publish_id', $post->failure_code);
    }

    public function test_polling_stops_after_maximum_attempts(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
            'access_token_encrypted' => 'test-access-token',
            'refresh_token_encrypted' => 'test-refresh-token',
            'token_expires_at' => now()->addHour(),
        ]);

        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, 'test video');

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test video',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 10,
            'status' => 'available',
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'platform' => 'tiktok',
            'status' => 'processing',
            'provider_status' => 'PROCESSING_UPLOAD',
            'provider_publish_id' => 'test-publish-id-max',
            'provider_mode' => 'upload_as_draft',
        ]);

        $job = new \App\Jobs\CheckTikTokPublishStatus($post, 31);
        $job->handle($this->publisherService, $this->oauthService);

        $post->refresh();
        $this->assertSame('failed', $post->status);
        $this->assertSame('polling_timeout', $post->failure_code);
        $this->assertStringContainsString('exceeded maximum attempts', $post->failure_message);
    }

    public function test_provider_error_preserves_safe_diagnostics(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
            'access_token_encrypted' => 'test-access-token',
            'refresh_token_encrypted' => 'test-refresh-token',
            'token_expires_at' => now()->addHour(),
        ]);

        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, 'test video');

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test video',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 10,
            'status' => 'available',
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'platform' => 'tiktok',
            'status' => 'processing',
            'provider_status' => 'PROCESSING_UPLOAD',
            'provider_publish_id' => 'test-publish-id-error',
            'provider_mode' => 'upload_as_draft',
        ]);

        Http::fake([
            'open.tiktokapis.com/v2/post/publish/status/fetch/' => Http::response([
                'error' => [
                    'code' => 'invalid_publish_id',
                    'message' => 'The publish ID is invalid or expired',
                    'log_id' => 'test-log-id-error-123',
                ],
            ], 400),
        ]);

        $job = new \App\Jobs\CheckTikTokPublishStatus($post, 1);
        $job->handle($this->publisherService, $this->oauthService);

        $post->refresh();
        $this->assertSame('failed', $post->status);
        $this->assertSame('invalid_publish_id', $post->failure_code);
        $this->assertStringContainsString('invalid or expired', $post->failure_message);

        $metadata = $post->metadata;
        $this->assertArrayHasKey('error_log_id', $metadata);
        $this->assertSame('test-log-id-error-123', $metadata['error_log_id']);
    }

    public function test_provider_error_code_not_ok_treated_as_error(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
            'access_token_encrypted' => 'test-access-token',
            'refresh_token_encrypted' => 'test-refresh-token',
            'token_expires_at' => now()->addHour(),
        ]);

        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, 'test video');

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test video',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 10,
            'status' => 'available',
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'platform' => 'tiktok',
            'status' => 'processing',
            'provider_status' => 'PROCESSING_UPLOAD',
            'provider_publish_id' => 'test-publish-id-bad-error',
            'provider_mode' => 'upload_as_draft',
        ]);

        Http::fake([
            'open.tiktokapis.com/v2/post/publish/status/fetch/' => Http::response([
                'data' => [
                    'status' => 'UNKNOWN',
                ],
                'error' => [
                    'code' => 'internal_error',
                    'message' => 'Internal server error',
                    'log_id' => 'test-log-internal',
                ],
            ], 200),
        ]);

        $job = new \App\Jobs\CheckTikTokPublishStatus($post, 1);
        $job->handle($this->publisherService, $this->oauthService);

        $post->refresh();
        $this->assertSame('failed', $post->status);
        $this->assertSame('internal_error', $post->failure_code);
    }

    public function test_post_not_found_returns_early(): void
    {
        $nonExistentPost = PublisherPost::make(['id' => 'non-existent-id']);

        $job = new \App\Jobs\CheckTikTokPublishStatus($nonExistentPost, 1);
        $job->handle($this->publisherService, $this->oauthService);

        $this->assertTrue(true);
    }
}