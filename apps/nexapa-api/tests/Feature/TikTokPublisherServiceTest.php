<?php

namespace Tests\Feature;

use App\Enums\MediaAssetStatus;
use App\Models\ConnectedAccount;
use App\Models\MediaAsset;
use App\Models\PublisherPost;
use App\Models\User;
use App\Services\OAuth\TikTokOAuthService;
use App\Services\Publisher\TikTokPublisherException;
use App\Services\Publisher\TikTokPublisherService;
use App\Services\Publisher\PublisherReadinessService;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TikTokPublisherServiceTest extends TestCase
{
    use RefreshDatabase;

    protected TikTokPublisherService $service;
    protected SettingsService $settingsService;
    protected PublisherReadinessService $readinessService;
    protected TikTokOAuthService $oauthService;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Log::fake();

        $this->settingsService = new SettingsService();
        $this->readinessService = new PublisherReadinessService();
        $this->oauthService = $this->createMock(TikTokOAuthService::class);

        $this->service = new TikTokPublisherService(
            $this->oauthService,
            $this->settingsService,
            $this->readinessService
        );
    }

    public function test_initialize_upload_payload_structure_for_small_file(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
        ]);

        $videoContent = str_repeat('x', 1468006);
        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, $videoContent);

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test video',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 1468006,
            'status' => MediaAssetStatus::Available,
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'status' => 'queued',
            'provider_mode' => 'upload_as_draft',
        ]);

        $actualFileSize = strlen($videoContent);

        Http::fake([
            'open.tiktokapis.com/*' => Http::response([
                'data' => [
                    'publish_id' => 'test-publish-id-12345',
                    'upload_url' => 'https://upload.tiktokapis.com/v2/post/publish/inbox/video/upload/?upload_id=test123',
                    'error_code' => 'ok',
                ],
            ], 200),
        ]);

        $this->oauthService->method('refreshAccessToken')->never();

        $this->service->uploadAsDraft($post);

        Http::assertSent(function ($request) use ($actualFileSize) {
            if ($request->url() === 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/') {
                $body = $request->data();

                $this->assertArrayHasKey('source_info', $body, 'Payload must contain source_info key');
                $this->assertIsArray($body['source_info'], 'source_info must be an array/object');

                $sourceInfo = $body['source_info'];

                $this->assertSame('FILE_UPLOAD', $sourceInfo['source']);
                $this->assertIsInt($sourceInfo['video_size'], 'video_size must be integer');
                $this->assertSame($actualFileSize, $sourceInfo['video_size']);

                $this->assertIsInt($sourceInfo['chunk_size'], 'chunk_size must be integer');
                $this->assertSame($actualFileSize, $sourceInfo['chunk_size']);

                $this->assertIsInt($sourceInfo['total_chunk_count'], 'total_chunk_count must be integer');
                $this->assertSame(1, $sourceInfo['total_chunk_count']);

                $this->assertArrayNotHasKey('json', $request->data(), 'Payload must not be wrapped in json key');

                return true;
            }
            return false;
        });
    }

    public function test_initialization_uses_actual_file_size_from_disk(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
        ]);

        $videoContent = str_repeat('x', 2500000);
        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, $videoContent);

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test video',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 1000000,
            'status' => MediaAssetStatus::Available,
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'status' => 'queued',
            'provider_mode' => 'upload_as_draft',
        ]);

        Http::fake([
            'open.tiktokapis.com/*' => Http::response([
                'data' => [
                    'publish_id' => 'test-publish-id',
                    'upload_url' => 'https://upload.tiktokapis.com/upload',
                    'error_code' => 'ok',
                ],
            ], 200),
        ]);

        $this->service->uploadAsDraft($post);

        Http::assertSent(function ($request) {
            if ($request->url() === 'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/') {
                $body = $request->data();
                $sourceInfo = $body['source_info'];

                $this->assertSame(2500000, $sourceInfo['video_size'], 'Must use actual disk file size');
                $this->assertSame(2500000, $sourceInfo['chunk_size']);
                $this->assertSame(1, $sourceInfo['total_chunk_count']);

                return true;
            }
            return false;
        });
    }

    public function test_tiktok_error_parsing_invalid_params(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
        ]);

        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, 'test video content');

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test video',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 18,
            'status' => MediaAssetStatus::Available,
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'status' => 'queued',
            'provider_mode' => 'upload_as_draft',
        ]);

        Http::fake([
            'open.tiktokapis.com/*' => Http::response([
                'error' => [
                    'code' => 'invalid_params',
                    'message' => 'The request source info is empty or incorrect',
                    'log_id' => '20260722120000ABCDEF1234567890',
                ],
            ], 400),
        ]);

        try {
            $this->service->uploadAsDraft($post);
            $this->fail('Expected TikTokPublisherException was not thrown');
        } catch (TikTokPublisherException $e) {
            $this->assertSame('invalid_params', $e->getErrorCode());
            $this->assertSame('The request source info is empty or incorrect', $e->getErrorMessage());
            $this->assertSame('20260722120000ABCDEF1234567890', $e->getLogId());
            $this->assertSame(400, $e->getCode());
        }

        $post->refresh();
        $this->assertSame('failed', $post->status);
        $this->assertSame('invalid_params', $post->failure_code);
        $this->assertSame('The request source info is empty or incorrect', $post->failure_message);
    }

    public function test_tiktok_error_parsing_preserves_error_object_structure(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
        ]);

        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, 'test');

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 4,
            'status' => MediaAssetStatus::Available,
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'status' => 'queued',
            'provider_mode' => 'upload_as_draft',
        ]);

        Http::fake([
            'open.tiktokapis.com/*' => Http::response([
                'error' => [
                    'code' => 'permission_denied',
                    'message' => 'User does not have video.upload scope',
                    'log_id' => 'log123456',
                ],
            ], 403),
        ]);

        try {
            $this->service->uploadAsDraft($post);
            $this->fail('Expected TikTokPublisherException was not thrown');
        } catch (TikTokPublisherException $e) {
            $this->assertSame('permission_denied', $e->getErrorCode());
            $this->assertSame('User does not have video.upload scope', $e->getErrorMessage());
            $this->assertSame('log123456', $e->getLogId());
        }
    }

    public function test_successful_initialization_extracts_publish_id_and_upload_url(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
        ]);

        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, 'test video');

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 10,
            'status' => MediaAssetStatus::Available,
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'status' => 'queued',
            'provider_mode' => 'upload_as_draft',
        ]);

        Http::fake([
            'open.tiktokapis.com/*' => Http::response([
                'data' => [
                    'publish_id' => 'publish-abc-123',
                    'upload_url' => 'https://upload.tiktokapis.com/v2/upload?token=xyz',
                    'error_code' => 'ok',
                ],
            ], 200),
        ]);

        $this->service->uploadAsDraft($post);

        $post->refresh();
        $this->assertSame('publish-abc-123', $post->provider_publish_id);
        $this->assertSame('processing', $post->status);
    }

    public function test_single_chunk_put_uses_correct_content_length_and_range(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
        ]);

        $videoContent = str_repeat('x', 1468006);
        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, $videoContent);

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test video',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 1468006,
            'status' => MediaAssetStatus::Available,
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'status' => 'queued',
            'provider_mode' => 'upload_as_draft',
        ]);

        Http::fake([
            'open.tiktokapis.com/v2/post/publish/inbox/video/init/' => Http::response([
                'data' => [
                    'publish_id' => 'test-publish-id',
                    'upload_url' => 'https://upload.tiktokapis.com/v2/post/publish/inbox/video/upload/?upload_id=test123',
                    'error_code' => 'ok',
                ],
            ], 200),
            'upload.tiktokapis.com/*' => Http::response([], 201),
        ]);

        $this->service->uploadAsDraft($post);

        Http::assertSent(function ($request) {
            if (str_contains($request->url(), 'upload')) {
                $headers = $request->headers();

                $this->assertSame('video/mp4', $headers['Content-Type'][0]);
                $this->assertSame('1468006', $headers['Content-Length'][0]);
                $this->assertSame('bytes 0-1468005/1468006', $headers['Content-Range'][0]);

                return true;
            }
            return false;
        });
    }

    public function test_no_token_or_upload_url_in_logs(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
        ]);

        $path = "publisher-media/{$user->id}/" . fake()->uuid() . '.mp4';
        Storage::disk('local')->put($path, 'test');

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 4,
            'status' => MediaAssetStatus::Available,
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'status' => 'queued',
            'provider_mode' => 'upload_as_draft',
        ]);

        Http::fake([
            'open.tiktokapis.com/*' => Http::response([
                'error' => [
                    'code' => 'invalid_params',
                    'message' => 'Source info empty',
                    'log_id' => 'log123',
                ],
            ], 400),
        ]);

        try {
            $this->service->uploadAsDraft($post);
        } catch (TikTokPublisherException $e) {
        }

        Log::assertNotLogged('Bearer eyJ');
        Log::assertNotLogged('upload.tiktokapis.com');
    }

    public function test_file_not_found_throws_exception(): void
    {
        $user = User::factory()->create();
        $account = ConnectedAccount::create([
            'user_id' => $user->id,
            'platform' => 'tiktok',
            'external_account_id' => fake()->uuid(),
            'display_name' => 'TikTok Test',
            'status' => 'connected',
            'scopes' => ['user.info.basic', 'video.upload'],
        ]);

        $mediaAsset = MediaAsset::create([
            'user_id' => $user->id,
            'display_name' => 'test',
            'original_name' => 'test.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => 'nonexistent/file.mp4',
            'file_size' => 100,
            'status' => MediaAssetStatus::Available,
        ]);

        $post = PublisherPost::create([
            'connected_account_id' => $account->id,
            'media_asset_id' => $mediaAsset->id,
            'status' => 'queued',
            'provider_mode' => 'upload_as_draft',
        ]);

        $this->expectException(TikTokPublisherException::class);
        $this->expectExceptionCode(400);

        $this->service->uploadAsDraft($post);
    }

    public function test_chunk_calculation_for_various_sizes(): void
    {
        $reflection = new \ReflectionClass(TikTokPublisherService::class);
        $method = $reflection->getMethod('calculateChunkSize');
        $method->setAccessible(true);

        $service = new TikTokPublisherService(
            $this->oauthService,
            $this->settingsService,
            $this->readinessService
        );

        $smallFile = 1024 * 1024;
        $result = $method->invoke($service, $smallFile);
        $this->assertSame($smallFile, $result, '1MB file uses file size as chunk');

        $mediumFile = 10 * 1024 * 1024;
        $result = $method->invoke($service, $mediumFile);
        $this->assertSame($mediumFile, $result, '10MB file uses 10MB chunk');

        $largeFile = 100 * 1024 * 1024;
        $result = $method->invoke($service, $largeFile);
        $this->assertSame(10 * 1024 * 1024, $result, '100MB file uses 10MB chunks');
    }
}
