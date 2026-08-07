<?php

namespace Tests\Feature;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadMode;
use App\Enums\DownloadPlatform;
use App\Enums\SourceType;
use App\Models\DownloadJob;
use App\Models\DownloadResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WorkerCompletionIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected DownloadJob $parentJob;
    protected DownloadJob $childJob;
    protected DownloadResult $downloadResult;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a user
        $this->user = User::factory()->create();

        // Create a profile analysis parent job
        $this->parentJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Profile,
            'status' => DownloadJobStatus::Completed,
            'original_input' => 'https://tiktok.com/@testuser',
        ]);

        // Create a download result
        $this->downloadResult = DownloadResult::factory()->create([
            'download_job_id' => $this->parentJob->id,
            'selected' => true,
        ]);

        // Create a child job for media download
        $this->childJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'parent_download_job_id' => $this->parentJob->id,
            'download_result_id' => $this->downloadResult->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Processing,
            'worker_id' => 'test-worker',
            'original_input' => 'https://tiktok.com/@testuser/video/123',
        ]);
        
        // Ensure the job is recognized as a media download child
        $this->assertTrue($this->childJob->isMediaDownloadChild());
    }

    /**
     * Test valid completion creates MediaAsset
     */
    public function test_valid_completion_creates_media_asset(): void
    {
        // Create a temporary file
        $filePath = "private/downloads/{$this->user->id}/{$this->childJob->id}/test-video.mp4";
        $fullPath = storage_path('app/' . $filePath);
        
        // Ensure directory exists
        $directory = dirname($fullPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }
        
        file_put_contents($fullPath, 'fake video content');

        $response = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => [
                    [
                        'display_name' => 'Test Video',
                        'original_name' => 'test-video.mp4',
                        'media_type' => 'video',
                        'storage_path' => $filePath,
                        'file_size' => 1024,
                        'source_platform' => 'tiktok',
                        'source_url' => 'https://tiktok.com/@testuser/video/123',
                    ]
                ]
            ]);

        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'Job completed.',
            'data' => [
                'created' => true,
                'existing' => false,
            ]
        ]);

        // Verify MediaAsset was created
        $this->assertDatabaseHas('media_assets', [
            'download_job_id' => $this->childJob->id,
            'user_id' => $this->user->id,
            'display_name' => 'Test Video',
            'storage_path' => $filePath,
        ]);

        // Verify job status was updated
        $this->childJob->refresh();
        $this->assertEquals(DownloadJobStatus::Completed, $this->childJob->status);
    }

    /**
     * Test duplicate identical idempotent completion
     */
    public function test_duplicate_identical_idempotent(): void
    {
        // Create a temporary file
        $filePath = "private/downloads/{$this->user->id}/{$this->childJob->id}/test-video.mp4";
        $fullPath = storage_path('app/' . $filePath);
        
        // Ensure directory exists
        $directory = dirname($fullPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }
        
        file_put_contents($fullPath, 'fake video content');

        // First completion request
        $response1 = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => [
                    [
                        'display_name' => 'Test Video',
                        'original_name' => 'test-video.mp4',
                        'media_type' => 'video',
                        'storage_path' => $filePath,
                        'file_size' => 1024,
                        'source_platform' => 'tiktok',
                        'source_url' => 'https://tiktok.com/@testuser/video/123',
                    ]
                ]
            ]);

        $response1->assertSuccessful();
        $responseData1 = $response1->json();

        // Extract media asset ID from first response
        $mediaAssetId = $responseData1['data']['media_asset_ids'][0];

        // Second identical completion request (idempotent)
        $response2 = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => [
                    [
                        'display_name' => 'Test Video',
                        'original_name' => 'test-video.mp4',
                        'media_type' => 'video',
                        'storage_path' => $filePath,
                        'file_size' => 1024,
                        'source_platform' => 'tiktok',
                        'source_url' => 'https://tiktok.com/@testuser/video/123',
                    ]
                ]
            ]);

        $response2->assertSuccessful();
        $response2->assertJson([
            'success' => true,
            'message' => 'Job completed.',
            'data' => [
                'media_asset_ids' => [$mediaAssetId],
                'created' => false,
                'existing' => true,
            ]
        ]);

        // Verify only one MediaAsset exists
        $this->assertEquals(1, \App\Models\MediaAsset::where('download_job_id', $this->childJob->id)->count());
    }

    /**
     * Test 10 identical requests only create one MediaAsset
     */
    public function test_10_identical_requests_only_one_media_asset(): void
    {
        // Create a temporary file
        $filePath = "private/downloads/{$this->user->id}/{$this->childJob->id}/test-video.mp4";
        $fullPath = storage_path('app/' . $filePath);
        
        // Ensure directory exists
        $directory = dirname($fullPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }
        
        file_put_contents($fullPath, 'fake video content');

        $mediaAssetId = null;

        // Send 10 identical requests
        for ($i = 0; $i < 10; $i++) {
        $response = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => [
                    [
                        'display_name' => 'Test Video',
                        'original_name' => 'test-video.mp4',
                        'media_type' => 'video',
                        'storage_path' => $filePath,
                        'file_size' => 1024,
                        'source_platform' => 'tiktok',
                        'source_url' => 'https://tiktok.com/@testuser/video/123',
                    ]
                ]
            ]);

            $response->assertSuccessful();
            $responseData = $response->json();

            // Extract media asset ID from first response
            if ($i === 0) {
                $mediaAssetId = $responseData['data']['media_asset_ids'][0];
            }

            // Verify same media asset ID is returned
            $this->assertEquals([$mediaAssetId], $responseData['data']['media_asset_ids']);
            $this->assertEquals($i === 0, $responseData['data']['created']);
            $this->assertEquals($i > 0, $responseData['data']['existing']);
        }

        // Verify only one MediaAsset exists
        $this->assertEquals(1, \App\Models\MediaAsset::where('download_job_id', $this->childJob->id)->count());
    }

    /**
     * Test missing file is rejected
     */
    public function test_missing_file_rejected(): void
    {
        // Try to complete with non-existent file
        $filePath = "private/downloads/{$this->user->id}/{$this->childJob->id}/nonexistent.mp4";
        
        $response = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => [
                    [
                        'display_name' => 'Test Video',
                        'original_name' => 'test-video.mp4',
                        'media_type' => 'video',
                        'storage_path' => $filePath,
                        'file_size' => 1024,
                        'source_platform' => 'tiktok',
                        'source_url' => 'https://tiktok.com/@testuser/video/123',
                    ]
                ]
            ]);
        


        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'message' => 'File does not exist or is empty.',
        ]);
    }

    /**
     * Test zero-byte file is rejected
     */
    public function test_zero_byte_file_rejected(): void
    {
        // Create a zero-byte file
        $filePath = "private/downloads/{$this->user->id}/{$this->childJob->id}/zero-byte.mp4";
        $fullPath = storage_path('app/' . $filePath);
        
        // Ensure directory exists
        $directory = dirname($fullPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }
        
        file_put_contents($fullPath, '');

        $response = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => [
                    [
                        'display_name' => 'Zero Byte Video',
                        'original_name' => 'zero-byte.mp4',
                        'media_type' => 'video',
                        'storage_path' => $filePath,
                        'file_size' => 0,
                        'source_platform' => 'tiktok',
                        'source_url' => 'https://tiktok.com/@testuser/video/123',
                    ]
                ]
            ]);

        $response->assertStatus(400);
        $response->assertJson([
            'success' => false,
            'message' => 'File does not exist or is empty.',
        ]);
    }

    /**
     * Test path traversal/outside allowlist is rejected
     */
    public function test_path_traversal_rejected(): void
    {
        // Try to complete with path traversal
        $response = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => [
                    [
                        'display_name' => 'Malicious File',
                        'original_name' => 'malicious.mp4',
                        'media_type' => 'video',
                        'storage_path' => "../../../etc/passwd",
                        'file_size' => 1024,
                        'source_platform' => 'tiktok',
                        'source_url' => 'https://tiktok.com/@testuser/video/123',
                    ]
                ]
            ]);

        $response->assertStatus(400);
        // Controller should reject with validation error message
    }

    /**
     * Test completed job cannot be overwritten
     */
    public function test_completed_job_cannot_be_overwritten(): void
    {
        // Create a temporary file
        $filePath = "private/downloads/{$this->user->id}/{$this->childJob->id}/test-video.mp4";
        $fullPath = storage_path('app/' . $filePath);
        
        // Ensure directory exists
        $directory = dirname($fullPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }
        
        file_put_contents($fullPath, 'fake video content');

        // Complete the job first
        $response1 = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => [
                    [
                        'display_name' => 'Test Video',
                        'original_name' => 'test-video.mp4',
                        'media_type' => 'video',
                        'storage_path' => $filePath,
                        'file_size' => 1024,
                        'source_platform' => 'tiktok',
                        'source_url' => 'https://tiktok.com/@testuser/video/123',
                    ]
                ]
            ]);

        $response1->assertSuccessful();

        // Try to complete again with different data
        $response2 = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => [
                    [
                        'display_name' => 'Different Video',
                        'original_name' => 'different-video.mp4',
                        'media_type' => 'video',
                        'storage_path' => $filePath,
                        'file_size' => 2048,
                        'source_platform' => 'tiktok',
                        'source_url' => 'https://tiktok.com/@testuser/video/123',
                    ]
                ]
            ]);

        $response2->assertSuccessful();
        
        // Should return existing asset, not create new one
        $responseData2 = $response2->json();
        $this->assertFalse($responseData2['data']['created']);
        $this->assertTrue($responseData2['data']['existing']);
        
        // Verify the MediaAsset still has original data
        $mediaAsset = \App\Models\MediaAsset::where('download_job_id', $this->childJob->id)->first();
        $this->assertEquals('Test Video', $mediaAsset->display_name);
        $this->assertEquals(1024, $mediaAsset->file_size);
    }

    /**
     * Test cancelled job cannot be completed
     */
    public function test_cancelled_job_cannot_be_completed(): void
    {
        // Cancel the job
        $this->childJob->update([
            'status' => DownloadJobStatus::Cancelled,
            'cancelled_at' => now(),
        ]);

        // Try to complete a cancelled job
        $response = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => [
                    [
                        'display_name' => 'Test Video',
                        'original_name' => 'test-video.mp4',
                        'media_type' => 'video',
                        'storage_path' => "private/downloads/{$this->user->id}/{$this->childJob->id}/test-video.mp4",
                        'file_size' => 1024,
                        'source_platform' => 'tiktok',
                        'source_url' => 'https://tiktok.com/@testuser/video/123',
                    ]
                ]
            ]);

        // Should fail - job is cancelled
        $response->assertStatus(400);
    }

    /**
     * Test user_id/platform MediaAsset is correct
     */
    public function test_user_id_platform_media_asset_correct(): void
    {
        // Create a temporary file
        $filePath = "private/downloads/{$this->user->id}/{$this->childJob->id}/test-video.mp4";
        $fullPath = storage_path('app/' . $filePath);
        
        // Ensure directory exists
        $directory = dirname($fullPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }
        
        file_put_contents($fullPath, 'fake video content');

        $response = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => [
                    [
                        'display_name' => 'Test Video',
                        'original_name' => 'test-video.mp4',
                        'media_type' => 'video',
                        'storage_path' => $filePath,
                        'file_size' => 1024,
                        'source_platform' => 'tiktok',
                        'source_url' => 'https://tiktok.com/@testuser/video/123',
                    ]
                ]
            ]);

        $response->assertSuccessful();

        // Verify MediaAsset has correct user_id and source_platform
        $this->assertDatabaseHas('media_assets', [
            'download_job_id' => $this->childJob->id,
            'user_id' => $this->user->id,
            'source_platform' => 'tiktok',
        ]);
    }
    
    /**
     * Test that child job cannot be marked as completed without creating MediaAssets
     */
    public function test_child_job_cannot_be_completed_without_media_assets(): void
    {
        // Try to complete without any temporary outputs
        $response = $this->withHeader('Authorization', 'Bearer test-worker-token')
            ->postJson("/api/v1/worker/download-jobs/{$this->childJob->id}/complete", [
                'progress' => 100,
                'temporary_outputs' => []
            ]);

        $response->assertStatus(422);

        // Verify job status is still Processing
        $this->childJob->refresh();
        $this->assertEquals(DownloadJobStatus::Processing, $this->childJob->status);
    }
}