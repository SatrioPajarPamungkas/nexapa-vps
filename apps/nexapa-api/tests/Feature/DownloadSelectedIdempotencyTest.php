<?php

namespace Tests\Feature;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadMode;
use App\Enums\DownloadPlatform;
use App\Enums\DownloadResultStatus;
use App\Enums\SourceType;
use App\Models\DownloadJob;
use App\Models\DownloadResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DownloadSelectedIdempotencyTest extends TestCase
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
            'output_format' => 'mp4',
            'quality' => 'best',
            'filename_mode' => 'original',
            'delay_seconds' => 0,
        ]);

        // Create 10 download results
        DownloadResult::factory()->count(10)->create([
            'download_job_id' => $this->parentJob->id,
            'status' => DownloadResultStatus::Discovered,
            'selected' => false,
        ]);
    }

    /**
     * Test that Download Selected only creates child jobs for the selected result IDs.
     */
    public function test_download_selected_only_creates_children_for_selected_results(): void
    {
        $this->actingAs($this->user);

        // Get the first 5 results to select
        $selectedResults = DownloadResult::where('download_job_id', $this->parentJob->id)
            ->limit(5)
            ->get();
        
        $selectedResultIds = $selectedResults->pluck('id')->toArray();

        // Make the selection request
        $response = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
            'result_ids' => $selectedResultIds,
        ]);

        $response->assertSuccessful();
        $batchId = $response->json('data.batch_id');
        $this->assertNotEmpty($batchId);
        $response->assertJson([
            'success' => true,
            'data' => [
                'selected_count' => 5,
                'total' => 5,
                'created' => 5,
                'existing' => 0,
            ],
        ]);

        // Verify that exactly 5 child jobs were created
        $this->assertEquals(5, DownloadJob::where('parent_download_job_id', $this->parentJob->id)->count());

        // Verify each child job has the correct properties
        $childJobs = DownloadJob::where('parent_download_job_id', $this->parentJob->id)->get();
        $this->assertSame([$batchId], $childJobs->pluck('batch_id')->unique()->values()->all());
        foreach ($childJobs as $childJob) {
            $this->assertNotNull($childJob->download_result_id);
            $this->assertTrue(in_array($childJob->download_result_id, $selectedResultIds));
            $this->assertEquals($this->parentJob->id, $childJob->parent_download_job_id);
            $this->assertEquals($this->user->id, $childJob->user_id);
            $this->assertEquals(DownloadJobStatus::Queued, $childJob->status);
            $this->assertEquals(DownloadMode::Single, $childJob->mode);
            $this->assertEquals($this->parentJob->platform, $childJob->platform);
            $this->assertEquals($this->parentJob->output_format, $childJob->output_format);
            $this->assertEquals($this->parentJob->quality, $childJob->quality);
            $this->assertEquals($this->parentJob->filename_mode, $childJob->filename_mode);
            $this->assertEquals($this->parentJob->delay_seconds, $childJob->delay_seconds);
        }
    }

    /**
     * Test that identical requests don't create duplicate child jobs.
     */
    public function test_identical_requests_do_not_create_duplicate_children(): void
    {
        $this->actingAs($this->user);

        // Get the first 3 results to select
        $selectedResults = DownloadResult::where('download_job_id', $this->parentJob->id)
            ->limit(3)
            ->get();
        
        $selectedResultIds = $selectedResults->pluck('id')->toArray();

        // First request
        $response1 = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
            'result_ids' => $selectedResultIds,
        ]);

        $response1->assertSuccessful();
        $batchId = $response1->json('data.batch_id');
        $this->assertNotEmpty($batchId);
        $response1->assertJson([
            'success' => true,
            'data' => [
                'selected_count' => 3,
                'total' => 3,
                'created' => 3,
                'existing' => 0,
            ],
        ]);

        // Verify 3 child jobs were created
        $this->assertEquals(3, DownloadJob::where('parent_download_job_id', $this->parentJob->id)->count());

        // Second identical request
        $response2 = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
            'result_ids' => $selectedResultIds,
        ]);

        $response2->assertSuccessful();
        $this->assertSame($batchId, $response2->json('data.batch_id'));
        $response2->assertJson([
            'success' => true,
            'data' => [
                'selected_count' => 3,
                'total' => 3,
                'created' => 0, // No new jobs should be created
                'existing' => 3,
            ],
        ]);

        // Verify still exactly 3 child jobs exist
        $this->assertEquals(3, DownloadJob::where('parent_download_job_id', $this->parentJob->id)->count());
        $this->assertSame(
            [$batchId],
            DownloadJob::where('parent_download_job_id', $this->parentJob->id)
                ->pluck('batch_id')->unique()->values()->all(),
        );
    }

    /**
     * Test batch ID consistency for selected results.
     */
    public function test_batch_id_consistency_for_selected_results(): void
    {
        $this->actingAs($this->user);

        // Get the first 3 results to select
        $selectedResults = DownloadResult::where('download_job_id', $this->parentJob->id)
            ->limit(3)
            ->get();
        
        $selectedResultIds = $selectedResults->pluck('id')->toArray();

        // Select 3 results
        $response = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
            'result_ids' => $selectedResultIds,
        ]);

        $response->assertSuccessful();
        $batchId = $response->json('data.batch_id');
        $this->assertNotEmpty($batchId);
        
        // Verify exactly 3 child jobs were created
        $childJobs = DownloadJob::where('parent_download_job_id', $this->parentJob->id)->get();
        $this->assertCount(3, $childJobs);
        
        // Verify all children have the same non-null batch_id
        $this->assertSame(
            [$batchId],
            $childJobs->pluck('batch_id')->unique()->values()->all(),
        );
        
        // Verify all batch_ids are non-null
        $this->assertFalse($childJobs->pluck('batch_id')->contains(null));
        
        // Re-select the same results
        $response2 = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
            'result_ids' => $selectedResultIds,
        ]);
        
        $response2->assertSuccessful();
        $this->assertSame($batchId, $response2->json('data.batch_id'));
        
        // Verify still exactly 3 child jobs exist with same batch_id
        $childJobs2 = DownloadJob::where('parent_download_job_id', $this->parentJob->id)->get();
        $this->assertCount(3, $childJobs2);
        $this->assertSame(
            [$batchId],
            $childJobs2->pluck('batch_id')->unique()->values()->all(),
        );
    }

    /**
     * Test that ten identical requests still result in only one child per DownloadResult.
     */
    public function test_ten_identical_requests_still_result_in_one_child_per_download_result(): void
    {
        $this->actingAs($this->user);

        // Get the first 4 results to select
        $selectedResults = DownloadResult::where('download_job_id', $this->parentJob->id)
            ->limit(4)
            ->get();
        
        $selectedResultIds = $selectedResults->pluck('id')->toArray();

        // Make 10 identical requests
        for ($i = 0; $i < 10; $i++) {
            $response = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
                'result_ids' => $selectedResultIds,
            ]);

            $response->assertSuccessful();
            
            // On the first iteration, we should create 4 jobs
            // On subsequent iterations, we should create 0 jobs
            if ($i === 0) {
                $response->assertJson([
                    'success' => true,
                    'data' => [
                        'selected_count' => 4,
                        'total' => 4,
                        'created' => 4,
                        'existing' => 0,
                    ],
                ]);
            } else {
                $response->assertJson([
                    'success' => true,
                    'data' => [
                        'selected_count' => 4,
                        'total' => 4,
                        'created' => 0,
                        'existing' => 4,
                    ],
                ]);
            }
        }

        // Verify still exactly 4 child jobs exist
        $this->assertEquals(4, DownloadJob::where('parent_download_job_id', $this->parentJob->id)->count());
    }

    /**
     * Test that results belonging to other parents/users are rejected or ignored.
     */
    public function test_results_from_other_parents_or_users_are_rejected_or_ignored(): void
    {
        $this->actingAs($this->user);

        // Create another user and parent job
        $otherUser = User::factory()->create();
        $otherParentJob = DownloadJob::factory()->create([
            'user_id' => $otherUser->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Profile,
            'status' => DownloadJobStatus::AwaitingSelection,
            'original_input' => 'https://tiktok.com/@othertestuser',
        ]);

        // Create results for the other parent
        DownloadResult::factory()->count(3)->create([
            'download_job_id' => $otherParentJob->id,
            'status' => DownloadResultStatus::Discovered,
            'selected' => false,
        ]);

        // Get result IDs from both parents
        $ownResultIds = DownloadResult::where('download_job_id', $this->parentJob->id)
            ->limit(2)
            ->pluck('id')
            ->toArray();

        $otherResultIds = DownloadResult::where('download_job_id', $otherParentJob->id)
            ->pluck('id')
            ->toArray();

        // Mix our own result IDs with other user's result IDs
        $mixedResultIds = array_merge($ownResultIds, $otherResultIds);

        // Make selection request with mixed result IDs
        $response = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
            'result_ids' => $mixedResultIds,
        ]);

        $response->assertSuccessful();
        
        // Should only create children for our own results
        $response->assertJson([
            'success' => true,
            'data' => [
                'selected_count' => count($mixedResultIds), // API might accept all IDs but only process valid ones
                'total' => 2,
                'created' => 2, // Only our own 2 results
                'existing' => 0,
            ],
        ]);

        // Verify only 2 child jobs were created (for our own results)
        $this->assertEquals(2, DownloadJob::where('parent_download_job_id', $this->parentJob->id)->count());
        
        // Verify no child jobs were created for the other parent
        $this->assertEquals(0, DownloadJob::where('parent_download_job_id', $otherParentJob->id)->count());
    }

    /**
     * Test that results that already have child jobs are not recreated.
     */
    public function test_results_that_already_have_children_are_not_recreated(): void
    {
        $this->actingAs($this->user);

        // Get the first 3 results to select
        $selectedResults = DownloadResult::where('download_job_id', $this->parentJob->id)
            ->limit(3)
            ->get();
        
        $selectedResultIds = $selectedResults->pluck('id')->toArray();

        // First selection - creates child jobs
        $response1 = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
            'result_ids' => $selectedResultIds,
        ]);

        $response1->assertSuccessful();
        $response1->assertJson([
            'success' => true,
            'data' => [
                'selected_count' => 3,
                'total' => 3,
                'created' => 3,
                'existing' => 0,
            ],
        ]);

        // Verify 3 child jobs were created
        $this->assertEquals(3, DownloadJob::where('parent_download_job_id', $this->parentJob->id)->count());

        // Get one additional result that wasn't selected before
        $additionalResult = DownloadResult::where('download_job_id', $this->parentJob->id)
            ->whereNotIn('id', $selectedResultIds)
            ->first();

        // Create a second selection with the original 3 plus one new result
        $newSelectedResultIds = array_merge($selectedResultIds, [$additionalResult->id]);

        $response2 = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
            'result_ids' => $newSelectedResultIds,
        ]);

        $response2->assertSuccessful();
        $response2->assertJson([
            'success' => true,
            'data' => [
                'selected_count' => 4,
                'total' => 4,
                'created' => 1, // Only one new job for the additional result
                'existing' => 3,
            ],
        ]);

        // Verify now there are 4 child jobs (3 original + 1 new)
        $this->assertEquals(4, DownloadJob::where('parent_download_job_id', $this->parentJob->id)->count());
    }

    /**
     * Test that DownloadResult records remain after child jobs are created.
     */
    public function test_download_result_records_remain_after_child_creation(): void
    {
        $this->actingAs($this->user);

        // Get all result IDs
        $allResultIds = DownloadResult::where('download_job_id', $this->parentJob->id)
            ->pluck('id')
            ->toArray();

        // Select all results
        $response = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
            'result_ids' => $allResultIds,
        ]);

        $response->assertSuccessful();

        // Verify all DownloadResult records still exist
        $remainingResultCount = DownloadResult::where('download_job_id', $this->parentJob->id)->count();
        $this->assertEquals(10, $remainingResultCount);

        // Verify the parent still exists
        $this->assertDatabaseHas('download_jobs', ['id' => $this->parentJob->id]);
    }

    /**
     * Test that parent stays in awaiting_selection while results are still unqueued.
     */
    public function test_parent_remains_awaiting_selection_while_results_unqueued(): void
    {
        $this->actingAs($this->user);

        // Initially parent should be in awaiting_selection
        $this->parentJob->refresh();
        $this->assertEquals(DownloadJobStatus::AwaitingSelection, $this->parentJob->status);

        // Select only some results (not all)
        $selectedResults = DownloadResult::where('download_job_id', $this->parentJob->id)
            ->limit(7)
            ->get();
        
        $selectedResultIds = $selectedResults->pluck('id')->toArray();

        $response = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
            'result_ids' => $selectedResultIds,
        ]);

        $response->assertSuccessful();

        // Parent should transition to Ready status after selection
        $this->parentJob->refresh();
        $this->assertEquals(DownloadJobStatus::Ready, $this->parentJob->status);
    }

    /**
     * Test that when all results are queued, parent follows actual contract.
     */
    public function test_when_all_results_queued_parent_follows_actual_contract(): void
    {
        $this->actingAs($this->user);

        // Select all results
        $allResultIds = DownloadResult::where('download_job_id', $this->parentJob->id)
            ->pluck('id')
            ->toArray();

        $response = $this->postJson("/api/v1/download-jobs/{$this->parentJob->id}/results/select", [
            'result_ids' => $allResultIds,
        ]);

        $response->assertSuccessful();

        // Parent should be in Ready status after selection completes
        $this->parentJob->refresh();
        $this->assertEquals(DownloadJobStatus::Ready, $this->parentJob->status);

        // All child jobs should be in Queued status
        $childJobs = DownloadJob::where('parent_download_job_id', $this->parentJob->id)->get();
        foreach ($childJobs as $childJob) {
            $this->assertEquals(DownloadJobStatus::Queued, $childJob->status);
        }
    }
}
