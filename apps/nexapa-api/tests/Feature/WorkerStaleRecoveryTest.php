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

class WorkerStaleRecoveryTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected DownloadJob $parentJob;

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
    }

    /**
     * Test that claimed jobs with stale heartbeat are recovered back to queued.
     */
    public function test_claimed_heartbeat_stale_back_to_queued(): void
    {
        // Create a job that was claimed but has a stale heartbeat
        $staleJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'parent_download_job_id' => $this->parentJob->id,
            'download_result_id' => DownloadResult::factory()->create([
                'download_job_id' => $this->parentJob->id,
            ])->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Claimed,
            'worker_id' => 'worker-1',
            'claimed_at' => now()->subMinutes(6), // Stale (more than 5 minutes ago)
            'analysis_client_heartbeat_at' => now()->subMinutes(6), // Stale heartbeat
            'original_input' => 'https://tiktok.com/@testuser/video/123',
        ]);

        // Run the stale recovery command
        $this->artisan('download:recover-stale-jobs')
            ->assertExitCode(0);

        // Refresh the job
        $staleJob->refresh();

        // Assert job was recovered to queued status
        $this->assertEquals(DownloadJobStatus::Queued, $staleJob->status);
        $this->assertNull($staleJob->worker_id);
        $this->assertNull($staleJob->claimed_at);
    }

    /**
     * Test that processing jobs with stale heartbeat are recovered back to queued if safe.
     */
    public function test_processing_heartbeat_stale_back_to_queued_if_safe(): void
    {
        // Create a job that is processing but has a stale heartbeat
        $staleJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'parent_download_job_id' => $this->parentJob->id,
            'download_result_id' => DownloadResult::factory()->create([
                'download_job_id' => $this->parentJob->id,
            ])->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Processing,
            'worker_id' => 'worker-1',
            'claimed_at' => now()->subMinutes(6), // Stale (more than 5 minutes ago)
            'analysis_client_heartbeat_at' => now()->subMinutes(6), // Stale heartbeat
            'started_at' => now()->subMinutes(6),
            'original_input' => 'https://tiktok.com/@testuser/video/123',
        ]);

        // Run the stale recovery command
        $this->artisan('download:recover-stale-jobs')
            ->assertExitCode(0);

        // Refresh the job
        $staleJob->refresh();

        // Assert job was recovered to queued status
        $this->assertEquals(DownloadJobStatus::Queued, $staleJob->status);
        $this->assertNull($staleJob->worker_id);
        $this->assertNull($staleJob->claimed_at);
        $this->assertNull($staleJob->started_at);
    }

    /**
     * Test that jobs with fresh heartbeat are not recovered.
     */
    public function test_heartbeat_fresh_not_recovered(): void
    {
        // Create a job that was claimed recently with fresh heartbeat
        $freshJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'parent_download_job_id' => $this->parentJob->id,
            'download_result_id' => DownloadResult::factory()->create([
                'download_job_id' => $this->parentJob->id,
            ])->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Claimed,
            'worker_id' => 'worker-1',
            'claimed_at' => now()->subMinutes(2), // Recent (less than 5 minutes ago)
            'analysis_client_heartbeat_at' => now()->subMinutes(2), // Fresh heartbeat
            'original_input' => 'https://tiktok.com/@testuser/video/456',
        ]);

        // Run the stale recovery command
        $this->artisan('download:recover-stale-jobs')
            ->assertExitCode(0);

        // Refresh the job
        $freshJob->refresh();

        // Assert job was not recovered
        $this->assertEquals(DownloadJobStatus::Claimed, $freshJob->status);
        $this->assertEquals('worker-1', $freshJob->worker_id);
        $this->assertNotNull($freshJob->claimed_at);
    }

    /**
     * Test that cancelled/completed jobs are not recovered.
     */
    public function test_cancelled_completed_not_recovered(): void
    {
        // Create a cancelled job
        $cancelledJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'parent_download_job_id' => $this->parentJob->id,
            'download_result_id' => DownloadResult::factory()->create([
                'download_job_id' => $this->parentJob->id,
            ])->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Cancelled,
            'worker_id' => 'worker-1',
            'claimed_at' => now()->subMinutes(10),
            'analysis_client_heartbeat_at' => now()->subMinutes(10),
            'cancelled_at' => now()->subMinutes(10),
            'original_input' => 'https://tiktok.com/@testuser/video/789',
        ]);

        // Create a completed job
        $completedJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'parent_download_job_id' => $this->parentJob->id,
            'download_result_id' => DownloadResult::factory()->create([
                'download_job_id' => $this->parentJob->id,
            ])->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Completed,
            'worker_id' => 'worker-1',
            'claimed_at' => now()->subMinutes(10),
            'analysis_client_heartbeat_at' => now()->subMinutes(10),
            'completed_at' => now()->subMinutes(10),
            'original_input' => 'https://tiktok.com/@testuser/video/101',
        ]);

        // Run the stale recovery command
        $this->artisan('download:recover-stale-jobs')
            ->assertExitCode(0);

        // Refresh the jobs
        $cancelledJob->refresh();
        $completedJob->refresh();

        // Assert jobs were not recovered
        $this->assertEquals(DownloadJobStatus::Cancelled, $cancelledJob->status);
        $this->assertEquals(DownloadJobStatus::Completed, $completedJob->status);
    }

    /**
     * Test that two recovery invocations do not duplicate reset.
     */
    public function test_two_recovery_invocations_no_duplication(): void
    {
        // Create a job that was claimed but has a stale heartbeat
        $staleJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'parent_download_job_id' => $this->parentJob->id,
            'download_result_id' => DownloadResult::factory()->create([
                'download_job_id' => $this->parentJob->id,
            ])->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Claimed,
            'worker_id' => 'worker-1',
            'claimed_at' => now()->subMinutes(6), // Stale (more than 5 minutes ago)
            'analysis_client_heartbeat_at' => now()->subMinutes(6), // Stale heartbeat
            'original_input' => 'https://tiktok.com/@testuser/video/123',
        ]);

        // Run the stale recovery command twice
        $this->artisan('download:recover-stale-jobs')
            ->assertExitCode(0);
            
        $this->artisan('download:recover-stale-jobs')
            ->assertExitCode(0);

        // Refresh the job
        $staleJob->refresh();

        // Assert job was recovered to queued status (still only once)
        $this->assertEquals(DownloadJobStatus::Queued, $staleJob->status);
        $this->assertNull($staleJob->worker_id);
        $this->assertNull($staleJob->claimed_at);
    }

    /**
     * Test that stale temporary .part files are cleaned up.
     */
    public function test_stale_part_files_cleaned_up(): void
    {
        // Create directories and files for testing
        $basePath = storage_path('app/downloads/guest');
        $jobId = 'test-job-id';
        $jobPath = "{$basePath}/{$jobId}";
        
        // Ensure base directory exists
        if (!is_dir(storage_path('app/downloads'))) {
            mkdir(storage_path('app/downloads'), 0755, true);
        }
        
        // Clean up any existing directories
        if (is_dir($jobPath)) {
            $this->cleanDirectory($jobPath);
        }
        
        if (!is_dir($jobPath)) {
            mkdir($jobPath, 0755, true);
        }
        
        // Create a temporary .part file that is stale
        $partFilePath = "{$jobPath}/test-file.part";
        file_put_contents($partFilePath, 'fake content');
        
        // Modify the file's timestamp to make it appear stale (older than 1 hour)
        touch($partFilePath, time() - 3601); // 1 hour and 1 second ago
        
        // Create a non-stale file that should not be deleted
        $recentFilePath = "{$jobPath}/recent-file.mp4";
        file_put_contents($recentFilePath, 'recent content');
        
        // Create a job that was claimed but has a stale heartbeat
        $staleJob = DownloadJob::factory()->create([
            'id' => 'test-job-id', // Match the directory name in the test
            'user_id' => null, // Guest user
            'parent_download_job_id' => $this->parentJob->id,
            'download_result_id' => DownloadResult::factory()->create([
                'download_job_id' => $this->parentJob->id,
            ])->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Claimed,
            'worker_id' => 'worker-1',
            'claimed_at' => now()->subMinutes(65), // Clearly stale (more than 1 hour ago)
            'analysis_client_heartbeat_at' => now()->subMinutes(65), // Clearly stale heartbeat
            'original_input' => 'https://tiktok.com/@testuser/video/123',
        ]);

        // Run the stale recovery command
        $this->artisan('download:recover-stale-jobs')
            ->assertExitCode(0);

        // Assert that the stale .part file was deleted but the recent file wasn't
        $this->assertFalse(file_exists($partFilePath), "Stale .part file should have been deleted");
        $this->assertTrue(file_exists($recentFilePath), "Recent file should not have been deleted");

        // Clean up remaining files
        if (file_exists($recentFilePath)) {
            unlink($recentFilePath);
        }
        
        // Clean up directories
        if (is_dir($jobPath)) {
            rmdir($jobPath);
        }
        if (is_dir($basePath)) {
            rmdir($basePath);
        }
    }

    /**
     * Test that valid final files are not deleted during cleanup.
     */
    public function test_final_valid_files_not_deleted(): void
    {
        // Create directories and files for testing
        $basePath = storage_path('app/downloads/guest');
        $jobId = 'test-job-id';
        $jobPath = "{$basePath}/{$jobId}";
        
        // Ensure base directory exists
        if (!is_dir(storage_path('app/downloads'))) {
            mkdir(storage_path('app/downloads'), 0755, true);
        }
        
        // Clean up any existing directories
        if (is_dir($jobPath)) {
            $this->cleanDirectory($jobPath);
        }
        
        if (!is_dir($jobPath)) {
            mkdir($jobPath, 0755, true);
        }
        
        // Create a final file that should not be deleted
        $finalFilePath = "{$jobPath}/final-file.mp4";
        file_put_contents($finalFilePath, 'final content');
        
        // Create a job
        $job = DownloadJob::factory()->create([
            'user_id' => null, // Guest user
            'parent_download_job_id' => $this->parentJob->id,
            'download_result_id' => DownloadResult::factory()->create([
                'download_job_id' => $this->parentJob->id,
            ])->id,
            'mode' => DownloadMode::Single,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'status' => DownloadJobStatus::Completed,
            'worker_id' => 'worker-1',
            'claimed_at' => now()->subMinutes(10),
            'analysis_client_heartbeat_at' => now()->subMinutes(10),
            'completed_at' => now()->subMinutes(10),
            'original_input' => 'https://tiktok.com/@testuser/video/123',
        ]);

        // Add metadata indicating this job has temporary outputs
        $job->metadata = [
            'temporary_outputs' => [
                [
                    'display_name' => 'Final Video',
                    'original_name' => 'final-file.mp4',
                    'storage_path' => "downloads/guest/{$jobId}/final-file.mp4",
                ]
            ]
        ];
        $job->save();

        // Run the stale recovery command
        $this->artisan('download:recover-stale-jobs')
            ->assertExitCode(0);

        // Assert that the final file was not deleted
        $this->assertTrue(file_exists($finalFilePath), "Final file should not have been deleted");

        // Clean up files and directories
        if (file_exists($finalFilePath)) {
            unlink($finalFilePath);
        }
        
        // Clean up directories (they might not be empty because of other files created by the test)
        if (is_dir($jobPath)) {
            $this->cleanDirectory($jobPath);
        }
        if (is_dir($basePath) && is_dir(storage_path('app/downloads'))) {
            $this->cleanDirectory(storage_path('app/downloads'));
        }
    }

    /**
     * Helper method to recursively clean a directory
     */
    private function cleanDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        
        $objects = scandir($dir);
        foreach ($objects as $object) {
            if ($object != "." && $object != "..") {
                $path = $dir . "/" . $object;
                if (is_dir($path)) {
                    $this->cleanDirectory($path);
                } else {
                    unlink($path);
                }
            }
        }
        rmdir($dir);
    }
}