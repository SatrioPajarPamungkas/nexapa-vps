<?php

namespace Tests\Unit\Services;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadMode;
use App\Enums\DownloadPlatform;
use App\Models\DownloadJob;
use App\Models\User;
use App\Services\DownloadJobClaimService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DownloadJobClaimServiceTest extends TestCase
{
    use RefreshDatabase;

    protected DownloadJobClaimService $service;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = new DownloadJobClaimService();
        $this->user = User::factory()->create();
    }

    /**
     * Test that a queued profile parent job can be claimed when no job_kinds are specified
     */
    public function test_claim_profile_parent_job_without_job_kinds()
    {
        $job = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'status' => DownloadJobStatus::Queued,
            'parent_download_job_id' => null,
            'download_result_id' => null,
        ]);

        $capabilities = [
            'platforms' => [DownloadPlatform::Tiktok],
            'modes' => [DownloadMode::Profile],
            // Note: No job_kinds specified
        ];

        $claimedJob = $this->service->claim('worker-1', $capabilities);

        $this->assertNotNull($claimedJob);
        $this->assertEquals($job->id, $claimedJob->id);
        $this->assertEquals('worker-1', $claimedJob->worker_id);
        $this->assertEquals(DownloadJobStatus::Claimed, $claimedJob->status);
    }

    /**
     * Test that a queued media child job can be claimed when no job_kinds are specified
     */
    public function test_claim_media_child_job_without_job_kinds()
    {
        $parentJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'status' => DownloadJobStatus::Completed,
        ]);

        $result = \App\Models\DownloadResult::factory()->create([
            'download_job_id' => $parentJob->id,
        ]);

        $childJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'status' => DownloadJobStatus::Queued,
            'parent_download_job_id' => $parentJob->id,
            'download_result_id' => $result->id,
        ]);

        $capabilities = [
            'platforms' => [DownloadPlatform::Tiktok],
            'modes' => [DownloadMode::Single],
            // Note: No job_kinds specified
        ];

        $claimedJob = $this->service->claim('worker-2', $capabilities);

        $this->assertNotNull($claimedJob);
        $this->assertEquals($childJob->id, $claimedJob->id);
        $this->assertEquals('worker-2', $claimedJob->worker_id);
        $this->assertEquals(DownloadJobStatus::Claimed, $claimedJob->status);
    }

    /**
     * Test that awaiting_selection profile jobs are not claimed
     */
    public function test_does_not_claim_awaiting_selection_profile()
    {
        DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'status' => DownloadJobStatus::AwaitingSelection,
            'parent_download_job_id' => null,
            'download_result_id' => null,
        ]);

        $capabilities = [
            'platforms' => [DownloadPlatform::Tiktok],
            'modes' => [DownloadMode::Profile],
            // Note: No job_kinds specified
        ];

        $claimedJob = $this->service->claim('worker-3', $capabilities);

        $this->assertNull($claimedJob);
    }

    /**
     * Test that terminal profile jobs are not claimed
     */
    public function test_does_not_claim_terminal_profile()
    {
        DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'status' => DownloadJobStatus::Completed,
            'parent_download_job_id' => null,
            'download_result_id' => null,
        ]);

        $capabilities = [
            'platforms' => [DownloadPlatform::Tiktok],
            'modes' => [DownloadMode::Profile],
            // Note: No job_kinds specified
        ];

        $claimedJob = $this->service->claim('worker-4', $capabilities);

        $this->assertNull($claimedJob);
    }

    /**
     * Test that two workers don't claim the same job
     */
    public function test_concurrent_workers_dont_claim_same_job()
    {
        $job = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'status' => DownloadJobStatus::Queued,
            'parent_download_job_id' => null,
            'download_result_id' => null,
        ]);

        $capabilities = [
            'platforms' => [DownloadPlatform::Tiktok],
            'modes' => [DownloadMode::Profile],
            // Note: No job_kinds specified
        ];

        // First worker claims the job
        $claimedJob1 = $this->service->claim('worker-5', $capabilities);
        
        // Second worker tries to claim the same job
        $claimedJob2 = $this->service->claim('worker-6', $capabilities);

        $this->assertNotNull($claimedJob1);
        $this->assertEquals($job->id, $claimedJob1->id);
        $this->assertEquals('worker-5', $claimedJob1->worker_id);
        
        $this->assertNull($claimedJob2);
    }
}