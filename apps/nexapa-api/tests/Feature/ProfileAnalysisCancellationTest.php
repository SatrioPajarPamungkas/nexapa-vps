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
use Illuminate\Support\Str;
use Tests\TestCase;

class ProfileAnalysisCancellationTest extends TestCase
{
    use RefreshDatabase;

    public function test_cancel_queued_profile_analysis_removes_partial_results(): void
    {
        $user = User::factory()->create();
        
        // Create a queued profile job
        $job = DownloadJob::factory()->profileMode()->create([
            'user_id' => $user->id,
            'status' => DownloadJobStatus::Queued,
            'analysis_session_id' => (string) Str::uuid(),
        ]);
        
        // Add some results to simulate partial processing
        DownloadResult::factory()->count(5)->create([
            'download_job_id' => $job->id,
            'status' => DownloadResultStatus::Discovered,
        ]);
        
        // Cancel the job
        $response = $this->actingAs($user)
            ->postJson("/api/v1/download-jobs/{$job->id}/cancel");
            
        $response->assertOk()->assertJson([
            'success' => true,
            'message' => 'Download job cancelled.',
        ]);
        
        // Verify job is cancelled
        $this->assertDatabaseHas('download_jobs', [
            'id' => $job->id,
            'status' => DownloadJobStatus::Cancelled->value,
        ]);
        
        // Verify results are deleted
        $this->assertSame(0, DownloadResult::where('download_job_id', $job->id)->count());
    }

    public function test_cancel_claimed_profile_analysis_removes_partial_results(): void
    {
        $user = User::factory()->create();
        
        // Create a claimed profile job
        $job = DownloadJob::factory()->profileMode()->create([
            'user_id' => $user->id,
            'status' => DownloadJobStatus::Claimed,
            'worker_id' => 'test-worker-1',
            'claimed_at' => now(),
            'analysis_session_id' => (string) Str::uuid(),
        ]);
        
        // Add some results to simulate partial processing
        DownloadResult::factory()->count(10)->create([
            'download_job_id' => $job->id,
            'status' => DownloadResultStatus::Discovered,
        ]);
        
        // Cancel the job
        $response = $this->actingAs($user)
            ->postJson("/api/v1/download-jobs/{$job->id}/cancel");
            
        $response->assertOk()->assertJson([
            'success' => true,
            'message' => 'Download job cancelled.',
        ]);
        
        // Verify job is cancelled
        $this->assertDatabaseHas('download_jobs', [
            'id' => $job->id,
            'status' => DownloadJobStatus::Cancelled->value,
        ]);
        
        // Verify results are deleted
        $this->assertSame(0, DownloadResult::where('download_job_id', $job->id)->count());
    }

    public function test_analysis_heartbeat_endpoint_updates_timestamp(): void
    {
        $user = User::factory()->create();
        
        // Create an active profile job
        $job = DownloadJob::factory()->profileMode()->create([
            'user_id' => $user->id,
            'status' => DownloadJobStatus::Analyzing,
            'analysis_session_id' => (string) Str::uuid(),
        ]);
        
        // Send heartbeat
        $response = $this->actingAs($user)
            ->postJson("/api/v1/download-jobs/{$job->id}/analysis-heartbeat");
            
        $response->assertOk()->assertJson([
            'success' => true,
            'message' => 'Heartbeat received.',
        ]);
        
        // Verify heartbeat timestamp is updated
        $this->assertDatabaseMissing('download_jobs', [
            'id' => $job->id,
            'analysis_client_heartbeat_at' => null,
        ]);
        
        // Verify the job is still in analyzing state
        $this->assertDatabaseHas('download_jobs', [
            'id' => $job->id,
            'status' => DownloadJobStatus::Analyzing->value,
        ]);
    }

    public function test_analysis_heartbeat_only_accepts_profile_jobs(): void
    {
        $user = User::factory()->create();
        
        // Create a single download job (not profile)
        $job = DownloadJob::factory()->singleMode()->create([
            'user_id' => $user->id,
            'status' => DownloadJobStatus::Queued,
        ]);
        
        // Try to send heartbeat
        $response = $this->actingAs($user)
            ->postJson("/api/v1/download-jobs/{$job->id}/analysis-heartbeat");
            
        $response->assertStatus(422)->assertJson([
            'success' => false,
            'message' => 'Heartbeat only accepted for profile jobs.',
        ]);
    }

    public function test_analysis_heartbeat_only_accepts_active_jobs(): void
    {
        $user = User::factory()->create();
        
        // Create a cancelled profile job
        $job = DownloadJob::factory()->profileMode()->create([
            'user_id' => $user->id,
            'status' => DownloadJobStatus::Cancelled,
            'cancelled_at' => now(),
            'analysis_session_id' => (string) Str::uuid(),
        ]);
        
        // Try to send heartbeat
        $response = $this->actingAs($user)
            ->postJson("/api/v1/download-jobs/{$job->id}/analysis-heartbeat");
            
        $response->assertStatus(422)->assertJson([
            'success' => false,
            'message' => 'Heartbeat only accepted for active jobs.',
        ]);
    }

    public function test_cancelled_job_rejects_new_results(): void
    {
        $user = User::factory()->create();
        
        // Create a cancelled profile job
        $job = DownloadJob::factory()->profileMode()->create([
            'user_id' => $user->id,
            'status' => DownloadJobStatus::Cancelled,
            'cancelled_at' => now(),
            'analysis_session_id' => (string) Str::uuid(),
        ]);
        
        // Try to submit results (simulating worker call)
        $response = $this->withHeader('Authorization', 'Bearer ' . env('NEXAPA_WORKER_TOKEN', 'test-worker-token'))
            ->postJson("/api/v1/worker/download-jobs/{$job->id}/results", [
                'results' => [
                    [
                        'external_id' => 'test123',
                        'title' => 'Test Video',
                        'source_url' => 'https://example.com/video',
                        'media_type' => 'video',
                    ]
                ]
            ]);
            
        $response->assertStatus(422)->assertJson([
            'success' => false,
            'message' => 'Job is cancelled. Results discarded.',
        ]);
        
        // Verify no results were created
        $this->assertSame(0, DownloadResult::where('download_job_id', $job->id)->count());
    }

    public function test_other_user_cannot_cancel_job(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        
        // Create a profile job
        $job = DownloadJob::factory()->profileMode()->create([
            'user_id' => $owner->id,
            'status' => DownloadJobStatus::Queued,
            'analysis_session_id' => (string) Str::uuid(),
        ]);
        
        // Try to cancel as other user
        $response = $this->actingAs($otherUser)
            ->postJson("/api/v1/download-jobs/{$job->id}/cancel");
            
        $response->assertNotFound();
        
        // Verify job is still queued
        $this->assertDatabaseHas('download_jobs', [
            'id' => $job->id,
            'status' => DownloadJobStatus::Queued->value,
        ]);
    }

    public function test_cancel_twice_is_idempotent(): void
    {
        $user = User::factory()->create();
        
        // Create a profile job
        $job = DownloadJob::factory()->profileMode()->create([
            'user_id' => $user->id,
            'status' => DownloadJobStatus::Queued,
            'analysis_session_id' => (string) Str::uuid(),
        ]);
        
        // Add some results
        DownloadResult::factory()->count(3)->create([
            'download_job_id' => $job->id,
            'status' => DownloadResultStatus::Discovered,
        ]);
        
        // Cancel twice
        $this->actingAs($user)
            ->postJson("/api/v1/download-jobs/{$job->id}/cancel")
            ->assertOk();
            
        $response = $this->actingAs($user)
            ->postJson("/api/v1/download-jobs/{$job->id}/cancel");
            
        $response->assertOk()->assertJson([
            'success' => true,
            'message' => 'Download job cancelled.',
        ]);
        
        // Verify job is still cancelled
        $this->assertDatabaseHas('download_jobs', [
            'id' => $job->id,
            'status' => DownloadJobStatus::Cancelled->value,
        ]);
        
        // Verify results are deleted
        $this->assertSame(0, DownloadResult::where('download_job_id', $job->id)->count());
    }

    public function test_awaiting_selection_job_not_cancelled_by_refresh(): void
    {
        $user = User::factory()->create();
        
        // Create a job in awaiting_selection state
        $job = DownloadJob::factory()->profileMode()->create([
            'user_id' => $user->id,
            'status' => DownloadJobStatus::AwaitingSelection,
            'analysis_session_id' => (string) Str::uuid(),
        ]);
        
        // Add some results
        DownloadResult::factory()->count(25)->create([
            'download_job_id' => $job->id,
            'status' => DownloadResultStatus::Discovered,
        ]);
        
        // Try to cancel (simulating refresh)
        $response = $this->actingAs($user)
            ->postJson("/api/v1/download-jobs/{$job->id}/cancel");
            
        $response->assertOk();
        
        // Verify job is cancelled
        $this->assertDatabaseHas('download_jobs', [
            'id' => $job->id,
            'status' => DownloadJobStatus::Cancelled->value,
        ]);
        
        // Verify results are deleted
        $this->assertSame(0, DownloadResult::where('download_job_id', $job->id)->count());
    }
}