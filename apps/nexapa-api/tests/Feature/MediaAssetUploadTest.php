<?php

namespace Tests\Feature;

use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class MediaAssetUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        config([
            'filesystems.default' => 'local',
            'nexapa.publisher_max_upload_mb' => 10,
            'nexapa.allowed_storage_path_prefixes' => ['media', 'thumbnails', 'downloads', 'publisher-media'],
        ]);
    }

    public function test_authenticated_user_can_upload_valid_mp4_to_private_storage(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/media-assets/upload', [
            'file' => UploadedFile::fake()->create('campaign #1 [final].mp4', 1400, 'video/mp4'),
            'expected_media_kind' => 'video',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('mime_type', 'video/mp4')
            ->assertJsonPath('media_type', 'video')
            ->assertJsonPath('status', 'available')
            ->assertJsonMissingPath('storage_path')
            ->assertJsonMissingPath('storage_disk')
            ->assertJsonMissingPath('user_id');

        $id = $response->json('id');
        $this->assertIsString($id);

        $asset = MediaAsset::findOrFail($id);
        $this->assertSame($user->id, $asset->user_id);
        $this->assertMatchesRegularExpression(
            '#^publisher-media/'.preg_quote((string) $user->id, '#').'/[0-9a-f-]{36}\.mp4$#',
            $asset->storage_path,
        );
        Storage::disk('local')->assertExists($asset->storage_path);
    }

    public function test_authenticated_user_can_upload_valid_jpeg_as_image_media(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/media-assets/upload', [
            'file' => UploadedFile::fake()->image('campaign-photo.jpeg'),
            'expected_media_kind' => 'image',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('mime_type', 'image/jpeg')
            ->assertJsonPath('media_type', 'image')
            ->assertJsonPath('original_filename', 'campaign-photo.jpg')
            ->assertJsonPath('status', 'available');

        $asset = MediaAsset::findOrFail($response->json('id'));
        $this->assertSame('image', $asset->media_type);
        $this->assertMatchesRegularExpression(
            '#^publisher-media/'.preg_quote((string) $user->id, '#').'/[0-9a-f-]{36}\.jpg$#',
            $asset->storage_path,
        );
        Storage::disk('local')->assertExists($asset->storage_path);
    }

    public function test_image_is_rejected_when_video_kind_is_expected(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/media-assets/upload', [
            'file' => UploadedFile::fake()->image('photo.jpg'),
            'expected_media_kind' => 'video',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file')
            ->assertJsonPath('errors.file.0', 'The selected file must be an MP4, MOV, or WebM video.');
    }

    public function test_video_is_rejected_when_image_kind_is_expected(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/media-assets/upload', [
            'file' => UploadedFile::fake()->create('video.mp4', 100, 'video/mp4'),
            'expected_media_kind' => 'image',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file')
            ->assertJsonPath('errors.file.0', 'The selected file must be a JPG, JPEG, PNG, or WebP image.');
    }

    public function test_unauthenticated_upload_is_rejected(): void
    {
        $this->postJson('/api/v1/media-assets/upload', [
            'file' => UploadedFile::fake()->create('video.mp4', 100, 'video/mp4'),
            'expected_media_kind' => 'video',
        ])->assertUnauthorized();
    }

    public function test_unsupported_file_type_is_rejected_with_field_error(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/media-assets/upload', [
            'file' => UploadedFile::fake()->create('payload.php', 10, 'application/x-php'),
            'expected_media_kind' => 'video',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file')
            ->assertJsonPath('errors.file.0', 'The selected file must be an MP4, MOV, or WebM video.');
    }

    public function test_oversized_video_is_rejected(): void
    {
        config(['nexapa.publisher_max_upload_mb' => 1]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/media-assets/upload', [
            'file' => UploadedFile::fake()->create('video.mp4', 1025, 'video/mp4'),
            'expected_media_kind' => 'video',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file')
            ->assertJsonPath('errors.file.0', 'The selected file exceeds the maximum upload size of 1 MB.');
    }

    public function test_user_cannot_read_another_users_private_asset(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $asset = MediaAsset::create([
            'user_id' => $owner->id,
            'display_name' => 'private-video',
            'original_name' => 'private-video.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => "publisher-media/{$owner->id}/private-video.mp4",
            'file_size' => 100,
            'status' => 'available',
        ]);
        Storage::disk('local')->put($asset->storage_path, 'private media');
        Sanctum::actingAs($otherUser);

        $this->getJson("/api/v1/media-assets/{$asset->id}")->assertNotFound();
        $this->get("/api/v1/media-assets/{$asset->id}/content")->assertNotFound();
    }

    public function test_database_failure_deletes_the_stored_file(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        MediaAsset::creating(function (): void {
            throw new RuntimeException('Simulated database failure');
        });

        $this->postJson('/api/v1/media-assets/upload', [
            'file' => UploadedFile::fake()->create('video.mp4', 100, 'video/mp4'),
            'expected_media_kind' => 'video',
        ])
            ->assertInternalServerError()
            ->assertJsonPath('error', 'media_upload_failed');

        $this->assertSame([], Storage::disk('local')->allFiles('publisher-media'));
        $this->assertDatabaseCount('media_assets', 0);
    }
}
