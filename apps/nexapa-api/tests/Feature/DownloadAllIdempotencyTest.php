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
use Tests\TestCase;

class DownloadAllIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected DownloadJob $parentJob;

   protected function setUp(): void
    {
        parent::setUp();

        // Create a user
        $this->user = User::factory()->create();

        // Create a parent download job in awaiting_selection state
        $this->parentJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Profile,
            'status' => DownloadJobStatus::AwaitingSelection,
            'original_input' => 'https://tiktok.com/@testuser',
        ]);

        // Create 50 download results with mixed selected status
        DownloadResult::factory()->count(30)->create([
            'download_job_id' => $this->parentJob->id,
            'selected' => true,
        ]);
        
        DownloadResult::factory()->count(20)->create([
            'download_job_id' => $this->parentJob->id,
            'selected' => false,
        ]);
    }

    /**
     * Test idempotency of Download All endpoint
     */
    public function test_download_all_idempotency(): void
    {
        $this->actingAs($this->user);

        // First request
        $response1 = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/download-all", [
            'output_format' => 'mp4',
            'quality' => 'best',
            'filename_mode' => 'original',
        ]);

        $response1->assertSuccessful();
        $response1->assertJson([
            'success' => true,
            'data' => [
                'total' => 50,
                'created' => 50,
                'existing' => 0,
            ],
        ]);
        
        $firstBatchId = $response1->json('data.batch_id');
        $this->assertNotNull($firstBatchId);

        // Verify child jobs were created
        $this->assertEquals(50, DownloadJob::where('batch_id', $firstBatchId)->count());
        $this->assertEquals(50, DownloadJob::where('parent_download_job_id', $this->parentJob->id)->count());

        // Second identical request
        $response2 = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/download-all", [
            'output_format' => 'mp4',
            'quality' => 'best',
            'filename_mode' => 'original',
        ]);

        $response2->assertSuccessful();
        $response2->assertJson([
            'success' => true,
            'data' => [
                'total' => 50,
                'created' => 0,
                'existing' => 50,
            ],
        ]);
        
        $secondBatchId = $response2->json('data.batch_id');
        $this->assertNotNull($secondBatchId);
        
        // Verify batch IDs are identical
        $this->assertEquals($firstBatchId, $secondBatchId, 'Batch ID should be the same for identical requests');

        // Verify no additional jobs were created
        $this->assertEquals(50, DownloadJob::where('batch_id', $firstBatchId)->count());
        $this->assertEquals(50, DownloadJob::where('parent_download_job_id', $this->parentJob->id)->count());
        
        // Verify all child jobs have the correct batch ID
        $childJobs = DownloadJob::where('parent_download_job_id', $this->parentJob->id)->get();
        foreach ($childJobs as $childJob) {
            $this->assertEquals($firstBatchId, $childJob->batch_id, 'All child jobs should have the same batch ID');
        }

        // Verify all child jobs have the correct relationships
        $childJobs = DownloadJob::where('parent_download_job_id', $this->parentJob->id)->get();
        foreach ($childJobs as $childJob) {
            $this->assertNotNull($childJob->download_result_id);
            $this->assertEquals($firstBatchId, $childJob->batch_id);
        }
        
        // Test batch status endpoint
        $statusResponse = $this->getJson("/api/v1/download-batches/{$firstBatchId}");
        $statusResponse->assertSuccessful();
        $statusResponse->assertJson([
            'success' => true,
            'data' => [
                'batch_id' => $firstBatchId,
                'total' => 50,
                'total_jobs' => 50, // alias field
            ],
        ]);
    }

    /**
     * Test skipped status functionality
     */
    public function test_skipped_status_functionality(): void
    {
        $this->actingAs($this->user);

        // Create a child job
        $childJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Processing,
            'parent_download_job_id' => $this->parentJob->id,
        ]);

        // Transition to skipped
        $childJob->update([
            'status' => DownloadJobStatus::Skipped,
            'skipped_at' => now(),
            'skip_reason' => 'Permanent TikTok error',
            'error_code' => 'TIKTOK_PERMANENT_ERROR',
        ]);

        // Verify the job was updated correctly
        $childJob->refresh();
        $this->assertEquals(DownloadJobStatus::Skipped, $childJob->status);
        $this->assertNotNull($childJob->skipped_at);
        $this->assertEquals('Permanent TikTok error', $childJob->skip_reason);
        $this->assertEquals('TIKTOK_PERMANENT_ERROR', $childJob->error_code);
    }

    public function test_batch_ownership_security(): void
    {
        // Create another user
        $otherUser = User::factory()->create();
        
        // First user creates a batch
        $this->actingAs($this->user);
        
        // Make a download all request to create a batch
        $response = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/download-all", [
            'output_format' => 'mp4',
            'quality' => 'best',
            'filename_mode' => 'original',
        ]);
        
        $response->assertSuccessful();
        $batchId = $response->json('data.batch_id');
        $this->assertNotNull($batchId);

        // Switch to other user
        $this->actingAs($otherUser);

        // Try to access show endpoint - should get 404
        $response = $this->getJson("/api/v1/download-batches/{$batchId}");
        $response->assertNotFound();

        // Try to access archive endpoint - should get 404
        $response = $this->get("/api/v1/download-batches/{$batchId}/archive");
        $response->assertNotFound();

        // Try to access bulk archive endpoint - should get 404
        $response = $this->get("/api/v1/download-batches/{$batchId}/bulk-archive");
        $response->assertNotFound();
    }
}