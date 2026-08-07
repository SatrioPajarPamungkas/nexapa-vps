<?php

namespace Tests\Feature;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadMode;
use App\Enums\DownloadPlatform;
use App\Enums\MediaAssetStatus;
use App\Enums\SourceType;
use App\Models\DownloadJob;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DownloadArchiveTest extends TestCase
{
    use RefreshDatabase;

    public function test_download_archive_for_valid_completed_job_with_temporary_outputs(): void
    {
        $user = User::factory()->create();
        
        // Create a disk root directory for testing
        $diskRoot = sys_get_temp_dir().'/nexapa-archive-test-'.uniqid();
        mkdir($diskRoot.'/downloads', 0777, true);
        config(['filesystems.disks.local.root' => $diskRoot]);
        
        // Create a completed job with temporary outputs
        $job = DownloadJob::factory()->completed()->create([
            'user_id' => $user->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'metadata' => [
                'temporary_outputs' => [
                    [
                        'storage_disk' => 'local',
                        'storage_path' => 'downloads/video1.mp4',
                        'original_name' => 'video1.mp4',
                        'display_name' => 'Video 1',
                        'mime_type' => 'video/mp4',
                        'size_bytes' => 1024,
                    ]
                ]
            ],
        ]);
        
        // Create physical files for temporary outputs
        file_put_contents($diskRoot.'/downloads/video1.mp4', 'video-content-1');

        // Test archive download
        $response = $this->actingAs($user)
            ->get("/api/v1/download-jobs/{$job->id}/archive");

        $response->assertSuccessful();
        $response->assertHeader('Content-Type', 'application/zip');
        $response->assertHeader('Content-Disposition', 'attachment; filename=nexapa-download-'.$job->id.'.zip');
        
        // Cleanup
        unlink($diskRoot.'/downloads/video1.mp4');
        rmdir($diskRoot.'/downloads');
        rmdir($diskRoot);
    }

    public function test_download_archive_for_completed_job_without_media_assets_returns_error(): void
    {
        $user = User::factory()->create();
        
        // Create a completed job with no media assets
        $job = DownloadJob::factory()->completed()->create([
            'user_id' => $user->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
        ]);
        
        // Ensure no media assets exist
        $this->assertSame(0, MediaAsset::where('download_job_id', $job->id)->count());

        // Test archive download
        $response = $this->actingAs($user)
            ->get("/api/v1/download-jobs/{$job->id}/archive");

        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'No downloadable media assets available.',
        ]);
    }

    public function test_download_archive_with_zero_byte_files_returns_error(): void
    {
        $user = User::factory()->create();
        
        // Create a completed job with zero-byte media asset
        $job = DownloadJob::factory()->completed()->create([
            'user_id' => $user->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
        ]);
        
        // Create physical zero-byte file for media asset
        Storage::fake('local');
        Storage::disk('local')->put('media/zero.mp4', '');
        
        // Create media asset with zero bytes
        $asset = MediaAsset::create([
            'user_id' => $user->id,
            'download_job_id' => $job->id,
            'display_name' => 'Zero byte file',
            'original_name' => 'zero.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => 'media/zero.mp4',
            'source_platform' => 'tiktok',
            'source_url' => 'https://tiktok.com/zerobyte',
            'status' => MediaAssetStatus::Available,
            'file_size' => 0,
        ]);

        // Test archive download
        $response = $this->actingAs($user)
            ->get("/api/v1/download-jobs/{$job->id}/archive");

        // Zero-byte files should be excluded, resulting in no downloadable files
        $response->assertStatus(404);
        $response->assertJson([
            'success' => false,
            'message' => 'No downloadable files available.',
        ]);
    }

    public function test_download_archive_for_non_owned_job_returns_not_found(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        
        // Create a completed job owned by another user
        $job = DownloadJob::factory()->completed()->create([
            'user_id' => $owner->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
        ]);
        
        // Create media assets for the owner's job
        Storage::fake('local');
        Storage::disk('local')->put('media/video.mp4', 'video-content');
        
        $asset = MediaAsset::create([
            'user_id' => $owner->id,
            'download_job_id' => $job->id,
            'display_name' => 'Video',
            'original_name' => 'video.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => 'media/video.mp4',
            'source_platform' => 'tiktok',
            'source_url' => 'https://tiktok.com/video',
            'status' => MediaAssetStatus::Available,
            'file_size' => 1024,
        ]);

        // Try to download as other user
        $response = $this->actingAs($otherUser)
            ->get("/api/v1/download-jobs/{$job->id}/archive");

        $response->assertNotFound();
    }

    public function test_download_archive_for_non_completed_job_returns_conflict(): void
    {
        $user = User::factory()->create();
        
        // Create a processing job
        $job = DownloadJob::factory()->create([
            'user_id' => $user->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Processing,
        ]);
        
        // Try to download archive
        $response = $this->actingAs($user)
            ->get("/api/v1/download-jobs/{$job->id}/archive");

        $response->assertStatus(409);
        $response->assertJson([
            'success' => false,
            'message' => 'Job is not yet completed. Cannot create archive.',
        ]);
    }

    public function test_has_downloadable_file_false_for_completed_invalid_job(): void
    {
        $user = User::factory()->create();
        
        // Create a completed job with no media assets
        $job = DownloadJob::factory()->completed()->create([
            'user_id' => $user->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
        ]);
        
        // Ensure no media assets exist
        $this->assertSame(0, MediaAsset::where('download_job_id', $job->id)->count());

        // Fetch job details
        $response = $this->actingAs($user)
            ->getJson("/api/v1/download-jobs/{$job->id}");

        $response->assertSuccessful();
        $responseData = $response->json();
        
        // Check that has_downloadable_file is false
        $this->assertFalse($responseData['data']['has_downloadable_file']);
    }

    public function test_has_downloadable_file_true_for_completed_valid_job(): void
    {
        $user = User::factory()->create();
        
        // Create a completed job with media assets
        $job = DownloadJob::factory()->completed()->create([
            'user_id' => $user->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
        ]);
        
        // Create physical files for media assets
        Storage::fake('local');
        Storage::disk('local')->put('media/video.mp4', 'video-content');
        
        // Create media assets
        $asset = MediaAsset::create([
            'user_id' => $user->id,
            'download_job_id' => $job->id,
            'display_name' => 'Valid Video',
            'original_name' => 'video.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => 'media/video.mp4',
            'source_platform' => 'tiktok',
            'source_url' => 'https://tiktok.com/video',
            'status' => MediaAssetStatus::Available,
            'file_size' => 1024,
        ]);

        // Fetch job details
        $response = $this->actingAs($user)
            ->getJson("/api/v1/download-jobs/{$job->id}");

        $response->assertSuccessful();
        $responseData = $response->json();
        
        // Check that has_downloadable_file is true
        $this->assertTrue($responseData['data']['has_downloadable_file']);
    }

    public function test_private_app_relative_asset_path_is_not_prefixed_twice(): void
    {
        $user = User::factory()->create();
        $job = DownloadJob::factory()->completed()->create([
            'user_id' => $user->id,
        ]);
        $temporaryRoot = sys_get_temp_dir().'/nexapa-download-path-'.uniqid();
        $localDiskRoot = $temporaryRoot.'/private';
        $relativeDiskPath = "downloads/{$user->id}/{$job->id}/media.mp3";
        $storedAssetPath = 'private/'.$relativeDiskPath;

        File::ensureDirectoryExists(dirname($localDiskRoot.'/'.$relativeDiskPath));
        File::put($localDiskRoot.'/'.$relativeDiskPath, 'audio-content');
        config(['filesystems.disks.local.root' => $localDiskRoot]);
        Storage::forgetDisk('local');

        try {
            MediaAsset::create([
                'user_id' => $user->id,
                'download_job_id' => $job->id,
                'display_name' => 'Production audio',
                'original_name' => 'media.mp3',
                'media_type' => 'audio',
                'mime_type' => 'audio/mpeg',
                'storage_disk' => 'local',
                'storage_path' => $storedAssetPath,
                'file_size' => 13,
                'status' => MediaAssetStatus::Available,
            ]);

            $this->actingAs($user)
                ->getJson("/api/v1/download-jobs/{$job->id}")
                ->assertSuccessful()
                ->assertJsonPath('data.has_downloadable_file', true);
        } finally {
            Storage::forgetDisk('local');
            File::deleteDirectory($temporaryRoot);
        }
    }

    public function test_has_downloadable_file_false_when_asset_file_is_missing(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $job = DownloadJob::factory()->completed()->create([
            'user_id' => $user->id,
        ]);

        MediaAsset::create([
            'user_id' => $user->id,
            'download_job_id' => $job->id,
            'display_name' => 'Missing audio',
            'original_name' => 'media.mp3',
            'media_type' => 'audio',
            'mime_type' => 'audio/mpeg',
            'storage_disk' => 'local',
            'storage_path' => "private/downloads/{$user->id}/{$job->id}/media.mp3",
            'file_size' => 1024,
            'status' => MediaAssetStatus::Available,
        ]);

        $this->actingAs($user)
            ->getJson("/api/v1/download-jobs/{$job->id}")
            ->assertSuccessful()
            ->assertJsonPath('data.has_downloadable_file', false);
    }

    public function test_has_downloadable_file_false_for_zero_byte_asset(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $job = DownloadJob::factory()->completed()->create([
            'user_id' => $user->id,
        ]);
        $path = "private/downloads/{$user->id}/{$job->id}/media.mp3";
        Storage::disk('local')->put($path, 'content-exists');

        MediaAsset::create([
            'user_id' => $user->id,
            'download_job_id' => $job->id,
            'display_name' => 'Empty audio',
            'original_name' => 'media.mp3',
            'media_type' => 'audio',
            'mime_type' => 'audio/mpeg',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 0,
            'status' => MediaAssetStatus::Available,
        ]);

        $this->actingAs($user)
            ->getJson("/api/v1/download-jobs/{$job->id}")
            ->assertSuccessful()
            ->assertJsonPath('data.has_downloadable_file', false);
    }

    public function test_queue_list_and_batch_status_report_the_same_downloadable_file(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $batchId = 'downloadable-batch-'.uniqid();
        $job = DownloadJob::factory()->completed()->create([
            'user_id' => $user->id,
            'batch_id' => $batchId,
            'mode' => DownloadMode::Single,
            'source_type' => SourceType::Video,
            'is_batch_work_item' => true,
        ]);
        $path = "private/downloads/{$user->id}/{$job->id}/media.mp3";
        Storage::disk('local')->put($path, 'audio-content');

        MediaAsset::create([
            'user_id' => $user->id,
            'download_job_id' => $job->id,
            'display_name' => 'Audio',
            'original_name' => 'media.mp3',
            'media_type' => 'audio',
            'mime_type' => 'audio/mpeg',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'file_size' => 13,
            'status' => MediaAssetStatus::Available,
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/download-jobs')
            ->assertSuccessful()
            ->assertJsonPath('data.0.has_downloadable_file', true);

        $this->actingAs($user)
            ->getJson("/api/v1/download-batches/{$batchId}")
            ->assertSuccessful()
            ->assertJsonPath('data.has_downloadable_files', true)
            ->assertJsonPath('data.jobs.0.has_downloadable_file', true);
    }
}
