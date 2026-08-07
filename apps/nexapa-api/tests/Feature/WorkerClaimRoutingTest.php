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

class WorkerClaimRoutingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected DownloadJob $profileParentJob;
    protected DownloadJob $mediaChildJob;
    protected DownloadResult $downloadResult;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a user
        $this->user = User::factory()->create();

        // Create a profile analysis parent job
        $this->profileParentJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Profile,
            'status' => DownloadJobStatus::Queued,
            'original_input' => 'https://tiktok.com/@testuser',
        ]);

        // Create a download result
        $this->downloadResult = DownloadResult::factory()->create([
            'download_job_id' => $this->profileParentJob->id,
        ]);

        // Create a media download child job
        $this->mediaChildJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'parent_download_job_id' => $this->profileParentJob->id,
            'download_result_id' => $this->downloadResult->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Queued,
            'original_input' => 'https://tiktok.com/@testuser/video/123',
        ]);
    }

    protected function claimJobAsWorker(string $workerId, array $capabilities = []): \Illuminate\Testing\TestResponse
    {
        return $this->withHeader('Authorization', 'Bearer ' . config('nexapa.worker_token'))
            ->postJson('/api/v1/worker/download-jobs/claim', [
                'worker_id' => $workerId,
                'capabilities' => $capabilities
            ]);
    }

    /**
     * Test that profile analysis parent queued can be claimed
     */
    public function test_profile_analysis_parent_queued_can_be_claimed(): void
    {
        // Act as worker with profile_analysis capability
        $response = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['profile_analysis']
        ]);

        // Assert successful response
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'Job claimed successfully.'
        ]);
        
        // Assert job data is returned
        $responseData = $response->json();
        $this->assertNotNull($responseData['data']);
        $this->assertEquals($this->profileParentJob->id, $responseData['data']['id']);
        $this->assertEquals('profile', $responseData['data']['mode']);
        $this->assertNull($responseData['data']['parent_download_job_id']);

        // Assert job status was updated
        $this->profileParentJob->refresh();
        $this->assertEquals(DownloadJobStatus::Claimed, $this->profileParentJob->status);
        $this->assertEquals('test-worker-1', $this->profileParentJob->worker_id);
        $this->assertNotNull($this->profileParentJob->claimed_at);
    }

    public function test_retrying_failed_job_clears_stale_lease_and_makes_it_claimable(): void
    {
        $this->profileParentJob->update([
            'status' => DownloadJobStatus::Failed,
            'worker_id' => 'stale-worker',
            'claimed_at' => now()->subMinute(),
            'started_at' => now()->subMinute(),
            'analysis_client_heartbeat_at' => now()->subMinute(),
        ]);

        app(\App\Services\DownloadJobService::class)
            ->retry($this->profileParentJob->fresh());

        $this->profileParentJob->refresh();
        $this->assertEquals(DownloadJobStatus::Queued, $this->profileParentJob->status);
        $this->assertNull($this->profileParentJob->worker_id);
        $this->assertNull($this->profileParentJob->claimed_at);
        $this->assertNull($this->profileParentJob->started_at);
        $this->assertNull($this->profileParentJob->analysis_client_heartbeat_at);

        $response = $this->claimJobAsWorker('worker-01', [
            'job_kinds' => ['profile_analysis'],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.id', $this->profileParentJob->id);
    }

    /**
     * Test that awaiting-selection profile job cannot be claimed
     */
    public function test_awaiting_selection_profile_job_cannot_be_claimed(): void
    {
        // Change the profile job status to awaiting selection
        $this->profileParentJob->update(['status' => DownloadJobStatus::AwaitingSelection]);

        // Act as worker with profile_analysis capability
        $response = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['profile_analysis']
        ]);

        // Assert successful response but no job data
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'No compatible jobs available.',
            'data' => null,
        ]);
    }

    /**
     * Test that terminal/cancelled profile job cannot be claimed
     */
    public function test_terminal_cancelled_profile_job_cannot_be_claimed(): void
    {
        // Change the profile job status to cancelled
        $this->profileParentJob->update(['status' => DownloadJobStatus::Cancelled]);

        // Act as worker with profile_analysis capability
        $response = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['profile_analysis']
        ]);

        // Assert successful response but no job data
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'No compatible jobs available.',
            'data' => null,
        ]);
    }

    /**
     * Test that valid child media job can be claimed
     */
    public function test_valid_child_media_job_can_be_claimed(): void
    {
        // Act as worker with media_download capability
        $response = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['media_download']
        ]);

        // Assert successful response
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'Job claimed successfully.'
        ]);
        
        // Assert job data is returned
        $responseData = $response->json();
        $this->assertNotNull($responseData['data']);
        $this->assertEquals($this->mediaChildJob->id, $responseData['data']['id']);
        $this->assertEquals('single', $responseData['data']['mode']);
        $this->assertEquals($this->profileParentJob->id, $responseData['data']['parent_download_job_id']);

        // Assert job status was updated
        $this->mediaChildJob->refresh();
        $this->assertEquals(DownloadJobStatus::Claimed, $this->mediaChildJob->status);
        $this->assertEquals('test-worker-1', $this->mediaChildJob->worker_id);
        $this->assertNotNull($this->mediaChildJob->claimed_at);
    }

    /**
     * Test that child without download_result_id cannot be claimed as media
     */
    public function test_child_without_download_result_id_cannot_be_claimed_as_media(): void
    {
        // Create a child job without download_result_id
        $childWithoutResult = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'parent_download_job_id' => $this->profileParentJob->id,
            'download_result_id' => null, // No download result
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Queued,
        ]);

        // Act as worker with media_download capability
        $response = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['media_download']
        ]);

        // Assert successful response but no job data (claims the valid child instead)
        $response->assertSuccessful();
        
        // Since there's a valid child job, it should claim that one
        $responseData = $response->json();
        $this->assertNotNull($responseData['data']);
        $this->assertEquals($this->mediaChildJob->id, $responseData['data']['id']);
        
        // The invalid child should still be unclaimed
        $childWithoutResult->refresh();
        $this->assertNull($childWithoutResult->worker_id);
        $this->assertNull($childWithoutResult->claimed_at);
        $this->assertNotEquals(DownloadJobStatus::Claimed, $childWithoutResult->status);
    }

    /**
     * Test that child with cancelled parent cannot be claimed
     */
    public function test_child_with_cancelled_parent_cannot_be_claimed(): void
    {
        // Cancel the parent job
        $this->profileParentJob->update(['status' => DownloadJobStatus::Cancelled]);

        // Act as worker with media_download capability
        $response = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['media_download']
        ]);

        // Assert successful response but no job data
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'No compatible jobs available.',
            'data' => null,
        ]);

        // Assert the child job was not claimed
        $this->mediaChildJob->refresh();
        $this->assertNull($this->mediaChildJob->worker_id);
        $this->assertNull($this->mediaChildJob->claimed_at);
        $this->assertNotEquals(DownloadJobStatus::Claimed, $this->mediaChildJob->status);
    }

    /**
     * Test that profile_analysis capability only gets profile parent jobs
     */
    public function test_profile_analysis_capability_only_gets_profile_parent_jobs(): void
    {
        // Act as worker with profile_analysis capability
        $response = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['profile_analysis']
        ]);

        // Assert successful response
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'Job claimed successfully.'
        ]);
        
        // Assert job data is returned and it's the profile parent job
        $responseData = $response->json();
        $this->assertNotNull($responseData['data']);
        $this->assertEquals($this->profileParentJob->id, $responseData['data']['id']);
        $this->assertNull($responseData['data']['parent_download_job_id']);
        
        // Reset the claimed job
        $this->profileParentJob->update([
            'worker_id' => null,
            'claimed_at' => null,
            'status' => DownloadJobStatus::Queued,
        ]);

        // Now try with a worker that only accepts media_download - should not get the profile job
        $response = $this->claimJobAsWorker('test-worker-2', [
            'job_kinds' => ['media_download']
        ]);

        // Assert successful response
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'Job claimed successfully.'
        ]);
        
        // Assert job data is returned and it's the media child job
        $responseData = $response->json();
        $this->assertNotNull($responseData['data']);
        $this->assertEquals($this->mediaChildJob->id, $responseData['data']['id']);
        $this->assertEquals($this->profileParentJob->id, $responseData['data']['parent_download_job_id']);
    }

    /**
     * Test that media_download capability only gets child jobs
     */
    public function test_media_download_capability_only_gets_child_jobs(): void
    {
        // Act as worker with media_download capability
        $response = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['media_download']
        ]);

        // Assert successful response
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'Job claimed successfully.'
        ]);
        
        // Assert job data is returned and it's the media child job
        $responseData = $response->json();
        $this->assertNotNull($responseData['data']);
        $this->assertEquals($this->mediaChildJob->id, $responseData['data']['id']);
        $this->assertEquals($this->profileParentJob->id, $responseData['data']['parent_download_job_id']);
        
        // Reset the claimed job
        $this->mediaChildJob->update([
            'worker_id' => null,
            'claimed_at' => null,
            'status' => DownloadJobStatus::Queued,
        ]);

        // Now try with a worker that only accepts profile_analysis - should not get the media job
        $response = $this->claimJobAsWorker('test-worker-2', [
            'job_kinds' => ['profile_analysis']
        ]);

        // Assert successful response
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'Job claimed successfully.'
        ]);
        
        // Assert job data is returned and it's the profile parent job
        $responseData = $response->json();
        $this->assertNotNull($responseData['data']);
        $this->assertEquals($this->profileParentJob->id, $responseData['data']['id']);
        $this->assertNull($responseData['data']['parent_download_job_id']);
    }

    /**
     * Test that both capabilities follow correct ordering
     */
    public function test_both_capabilities_follow_correct_ordering(): void
    {
        // Create another profile job that was created earlier
        $olderProfileJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Profile,
            'status' => DownloadJobStatus::Queued,
            'original_input' => 'https://tiktok.com/@testuser2',
            'created_at' => now()->subMinute(),
        ]);

        // Act as worker with both capabilities
        $response = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['profile_analysis', 'media_download']
        ]);

        // Assert successful response
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'Job claimed successfully.'
        ]);
        
        // Assert job data is returned and it's the older profile job (based on created_at ordering)
        $responseData = $response->json();
        $this->assertNotNull($responseData['data']);
        $this->assertEquals($olderProfileJob->id, $responseData['data']['id']);
        $this->assertNull($responseData['data']['parent_download_job_id']);
    }

    /**
     * Test unknown capability handling
     */
    public function test_unknown_capability_handling(): void
    {
        // Act as worker with unknown capability
        $response = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['unknown_kind']
        ]);

        // Assert successful response with a job (since unknown capabilities are ignored, 
        // it defaults to only allowing child media download jobs)
        $response->assertSuccessful();
        $response->assertJson([
            'success' => true,
            'message' => 'Job claimed successfully.'
        ]);
        
        // Assert job data is returned
        $responseData = $response->json();
        $this->assertNotNull($responseData['data']);
        $this->assertArrayHasKey('id', $responseData['data']);
    }

    /**
     * Test sequential claims against one child job
     */
    public function test_sequential_claims_against_one_child_job(): void
    {
        // First worker claims the job
        $response1 = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['media_download']
        ]);

        // Assert first claim was successful
        $response1->assertSuccessful();
        $response1->assertJson([
            'success' => true,
            'message' => 'Job claimed successfully.'
        ]);
        
        // Second worker tries to claim the same job
        $response2 = $this->claimJobAsWorker('test-worker-2', [
            'job_kinds' => ['media_download']
        ]);

        // Assert second claim was unsuccessful (no job available)
        $response2->assertSuccessful();
        $response2->assertJson([
            'success' => true,
            'message' => 'No compatible jobs available.',
            'data' => null,
        ]);
    }

    /**
     * Test five workers claiming five different jobs
     */
    public function test_five_workers_claiming_five_different_jobs(): void
    {
        // Create additional child jobs
        $childJobs = [];
        for ($i = 1; $i <= 4; $i++) {
            $downloadResult = DownloadResult::factory()->create([
                'download_job_id' => $this->profileParentJob->id,
            ]);
            
            $childJobs[] = DownloadJob::factory()->create([
                'user_id' => $this->user->id,
                'parent_download_job_id' => $this->profileParentJob->id,
                'download_result_id' => $downloadResult->id,
                'mode' => DownloadMode::Single,
                'platform' => DownloadPlatform::Tiktok,
                'source_type' => SourceType::Video,
                'status' => DownloadJobStatus::Queued,
                'original_input' => "https://tiktok.com/@testuser/video/{$i}",
            ]);
        }
        
        // Add our existing media child job to the array
        $childJobs[] = $this->mediaChildJob;
        
        // Five workers claiming jobs
        $workerIds = ['worker-1', 'worker-2', 'worker-3', 'worker-4', 'worker-5'];
        $claimedJobIds = [];
        
        foreach ($workerIds as $workerId) {
            $response = $this->claimJobAsWorker($workerId, [
                'job_kinds' => ['media_download']
            ]);
            
            // Assert successful response
            $response->assertSuccessful();
            $response->assertJson([
                'success' => true,
                'message' => 'Job claimed successfully.'
            ]);
            
            // Collect claimed job IDs
            $responseData = $response->json();
            $this->assertNotNull($responseData['data']);
            $claimedJobIds[] = $responseData['data']['id'];
        }
        
        // Assert all claimed job IDs are unique
        $this->assertCount(5, array_unique($claimedJobIds));
        
        // Try a sixth worker - should get no job
        $response6 = $this->claimJobAsWorker('worker-6', [
            'job_kinds' => ['media_download']
        ]);
        
        // Assert no job available
        $response6->assertSuccessful();
        $response6->assertJson([
            'success' => true,
            'message' => 'No compatible jobs available.',
            'data' => null,
        ]);
    }

    /**
     * Test cancelled/soft-deleted jobs cannot be claimed
     */
    public function test_cancelled_soft_deleted_jobs_cannot_be_claimed(): void
    {
        // Create a cancelled job
        $cancelledJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Profile,
            'status' => DownloadJobStatus::Cancelled,
            'original_input' => 'https://tiktok.com/@cancelleduser',
        ]);

        // Create a soft-deleted job
        $softDeletedJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Profile,
            'status' => DownloadJobStatus::Queued,
            'original_input' => 'https://tiktok.com/@deleteduser',
            'deleted_at' => now(),
        ]);

        // Act as worker with profile_analysis capability
        $response = $this->claimJobAsWorker('test-worker-1', [
            'job_kinds' => ['profile_analysis']
        ]);

        // Assert successful response but no job data (should claim the valid job instead)
        $response->assertSuccessful();
        
        // Should claim the valid profile job we created in setUp
        $responseData = $response->json();
        $this->assertNotNull($responseData['data']);
        $this->assertEquals($this->profileParentJob->id, $responseData['data']['id']);
    }

    /**
     * Test worker auth/middleware safety
     */
    public function test_worker_auth_middleware_safety(): void
    {
        // Try to claim a job without proper authorization
        $response = $this->postJson('/api/v1/worker/download-jobs/claim', [
            'worker_id' => 'test-worker-1',
            'capabilities' => [
                'job_kinds' => ['profile_analysis']
            ]
        ]);

        // Assert unauthorized response
        $response->assertUnauthorized();
    }
}
?>
