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

class DownloadBatchAggregationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected string $batchId;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a user
        $this->user = User::factory()->create();
        
        // Create a batch ID
        $this->batchId = 'test-batch-' . uniqid();
    }

    /**
     * Test mixed batch becomes partially_completed with progress 100.
     */
    public function test_mixed_batch_becomes_partially_completed_and_progress_100(): void
    {
        // Create 45 completed jobs
        for ($i = 0; $i < 45; $i++) {
            DownloadJob::factory()->create([
                'user_id' => $this->user->id,
                'batch_id' => $this->batchId,
                'mode' => DownloadMode::Single,
                'platform' => DownloadPlatform::Tiktok,
                'source_type' => SourceType::Video,
                'status' => DownloadJobStatus::Completed,
                'completed_at' => now(),
                'original_input' => "https://tiktok.com/@testuser/video/{$i}",
            ]);
        }

        // Create 3 skipped jobs
        for ($i = 45; $i < 48; $i++) {
            DownloadJob::factory()->create([
                'user_id' => $this->user->id,
                'batch_id' => $this->batchId,
                'mode' => DownloadMode::Single,
                'platform' => DownloadPlatform::Tiktok,
                'source_type' => SourceType::Video,
                'status' => DownloadJobStatus::Skipped,
                'skipped_at' => now(),
                'original_input' => "https://tiktok.com/@testuser/video/{$i}",
            ]);
        }

        // Create 2 failed jobs
        for ($i = 48; $i < 50; $i++) {
            DownloadJob::factory()->create([
                'user_id' => $this->user->id,
                'batch_id' => $this->batchId,
                'mode' => DownloadMode::Single,
                'platform' => DownloadPlatform::Tiktok,
                'source_type' => SourceType::Video,
                'status' => DownloadJobStatus::Failed,
                'error_code' => 'test_error',
                'error_message' => 'Test error message',
                'original_input' => "https://tiktok.com/@testuser/video/{$i}",
            ]);
        }

        // Run the batch aggregation command
        $this->artisan("download:aggregate-batch {$this->batchId}")
            ->assertExitCode(0);

        // Check that the batch has the correct aggregated values
        $batchStatus = app(\App\Services\DownloadBatchService::class)->getStatus($this->batchId, $this->user->id);
        
        $this->assertNotNull($batchStatus);
        $this->assertEquals(50, $batchStatus['total']);
        $this->assertEquals(50, $batchStatus['total_jobs']); // alias field
        $this->assertEquals(45, $batchStatus['completed']);
        $this->assertEquals(45, $batchStatus['completed_jobs']); // alias field
        $this->assertEquals(3, $batchStatus['skipped']);
        $this->assertEquals(3, $batchStatus['skipped_jobs']); // alias field
        $this->assertEquals(2, $batchStatus['failed']);
        $this->assertEquals(2, $batchStatus['failed_jobs']); // alias field
        $this->assertEquals(0, $batchStatus['cancelled']);
        $this->assertEquals(0, $batchStatus['cancelled_jobs']); // alias field
        $this->assertEquals(0, $batchStatus['processing']); // active = 0
        $this->assertEquals(0, $batchStatus['processing_jobs']); // alias field
        $this->assertEquals(50, $batchStatus['terminal']);
        $this->assertEquals(50, $batchStatus['terminal_jobs']); // alias field
        $this->assertEquals(100, $batchStatus['progress_percentage']);
        $this->assertEquals(100, $batchStatus['progress']); // alias field
        $this->assertTrue($batchStatus['is_terminal']);
    }

    /**
     * Test that all completed jobs result in completed batch status.
     */
    public function test_all_completed_results_in_completed(): void
    {
        // Create 10 completed jobs
        for ($i = 0; $i < 10; $i++) {
            DownloadJob::factory()->create([
                'user_id' => $this->user->id,
                'batch_id' => $this->batchId,
                'mode' => DownloadMode::Single,
                'platform' => DownloadPlatform::Tiktok,
                'source_type' => SourceType::Video,
                'status' => DownloadJobStatus::Completed,
                'completed_at' => now(),
                'original_input' => "https://tiktok.com/@testuser/video/{$i}",
            ]);
        }

        // Run the batch aggregation command
        $this->artisan("download:aggregate-batch {$this->batchId}")
            ->assertExitCode(0);

        // Check that the batch has the correct aggregated values
        $batchStatus = app(\App\Services\DownloadBatchService::class)->getStatus($this->batchId, $this->user->id);
        
        $this->assertNotNull($batchStatus);
        $this->assertEquals(10, $batchStatus['total']);
        $this->assertEquals(10, $batchStatus['total_jobs']); // alias field
        $this->assertEquals(10, $batchStatus['completed']);
        $this->assertEquals(10, $batchStatus['completed_jobs']); // alias field
        $this->assertEquals(0, $batchStatus['skipped']);
        $this->assertEquals(0, $batchStatus['skipped_jobs']); // alias field
        $this->assertEquals(0, $batchStatus['failed']);
        $this->assertEquals(0, $batchStatus['failed_jobs']); // alias field
        $this->assertEquals(0, $batchStatus['processing']); // active = 0
        $this->assertEquals(0, $batchStatus['processing_jobs']); // alias field
        $this->assertEquals(10, $batchStatus['terminal']);
        $this->assertEquals(10, $batchStatus['terminal_jobs']); // alias field
        $this->assertEquals(100, $batchStatus['progress']);
        $this->assertEquals(100, $batchStatus['progress_percentage']); // alias field
        $this->assertTrue($batchStatus['is_terminal']);
    }

    /**
     * Test that all failed/skipped jobs result in failed batch status.
     */
    public function test_all_failed_skipped_results_in_failed(): void
    {
        // Create 5 failed jobs
        for ($i = 0; $i < 5; $i++) {
            DownloadJob::factory()->create([
                'user_id' => $this->user->id,
                'batch_id' => $this->batchId,
                'mode' => DownloadMode::Single,
                'platform' => DownloadPlatform::Tiktok,
                'source_type' => SourceType::Video,
                'status' => DownloadJobStatus::Failed,
                'error_code' => 'test_error',
                'error_message' => 'Test error message',
                'original_input' => "https://tiktok.com/@testuser/video/{$i}",
            ]);
        }

        // Create 5 skipped jobs
        for ($i = 5; $i < 10; $i++) {
            DownloadJob::factory()->create([
                'user_id' => $this->user->id,
                'batch_id' => $this->batchId,
                'mode' => DownloadMode::Single,
                'platform' => DownloadPlatform::Tiktok,
                'source_type' => SourceType::Video,
                'status' => DownloadJobStatus::Skipped,
                'skipped_at' => now(),
                'original_input' => "https://tiktok.com/@testuser/video/{$i}",
            ]);
        }

        // Run the batch aggregation command
        $this->artisan("download:aggregate-batch {$this->batchId}")
            ->assertExitCode(0);

        // Check that the batch has the correct aggregated values
        $batchStatus = app(\App\Services\DownloadBatchService::class)->getStatus($this->batchId, $this->user->id);
        
        $this->assertNotNull($batchStatus);
        $this->assertEquals(10, $batchStatus['total']);
        $this->assertEquals(10, $batchStatus['total_jobs']); // alias field
        $this->assertEquals(0, $batchStatus['completed']);
        $this->assertEquals(0, $batchStatus['completed_jobs']); // alias field
        $this->assertEquals(5, $batchStatus['skipped']);
        $this->assertEquals(5, $batchStatus['skipped_jobs']); // alias field
        $this->assertEquals(5, $batchStatus['failed']);
        $this->assertEquals(5, $batchStatus['failed_jobs']); // alias field
        $this->assertEquals(0, $batchStatus['processing']); // active = 0
        $this->assertEquals(0, $batchStatus['processing_jobs']); // alias field
        $this->assertEquals(10, $batchStatus['terminal']);
        $this->assertEquals(10, $batchStatus['terminal_jobs']); // alias field
        $this->assertEquals(100, $batchStatus['progress']);
        $this->assertEquals(100, $batchStatus['progress_percentage']); // alias field
        $this->assertTrue($batchStatus['is_terminal']);
    }

    /**
     * Test that parent jobs with awaiting_selection status without children are not included in aggregation.
     */
    public function test_parent_awaiting_selection_without_children_not_included(): void
    {
        // Create a parent job with awaiting_selection status but no children
        $parentJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'batch_id' => $this->batchId,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Profile,
            'status' => DownloadJobStatus::AwaitingSelection,
            'original_input' => 'https://tiktok.com/@testuser',
        ]);

        // Create one completed child job
        DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'batch_id' => $this->batchId,
            'parent_download_job_id' => $parentJob->id,
            'download_result_id' => DownloadResult::factory()->create([
                'download_job_id' => $parentJob->id,
            ])->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Completed,
            'completed_at' => now(),
            'original_input' => 'https://tiktok.com/@testuser/video/123',
        ]);

        // Run the batch aggregation command
        $this->artisan("download:aggregate-batch {$this->batchId}")
            ->assertExitCode(0);

        // Check that only the child job is counted in the aggregation
        $batchStatus = app(\App\Services\DownloadBatchService::class)->getStatus($this->batchId, $this->user->id);
        
        $this->assertNotNull($batchStatus);
        $this->assertEquals(1, $batchStatus['total']); // Only child job counted
        $this->assertEquals(1, $batchStatus['total_jobs']); // alias field
        $this->assertEquals(1, $batchStatus['completed']);
        $this->assertEquals(1, $batchStatus['completed_jobs']); // alias field
        $this->assertEquals(0, $batchStatus['processing']); // active = 0
        $this->assertEquals(0, $batchStatus['processing_jobs']); // alias field
        $this->assertEquals(1, $batchStatus['terminal']);
        $this->assertEquals(1, $batchStatus['terminal_jobs']); // alias field
        $this->assertEquals(100, $batchStatus['progress']);
        $this->assertEquals(100, $batchStatus['progress_percentage']); // alias field
        $this->assertTrue($batchStatus['is_terminal']);
    }
}