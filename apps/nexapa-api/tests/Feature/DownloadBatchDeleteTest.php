<?php

namespace Tests\Feature;

use App\Enums\DownloadJobStatus;
use App\Models\DownloadJob;
use App\Models\DownloadResult;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class DownloadBatchDeleteTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $otherUser;
    protected string $batchId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->otherUser = User::factory()->create();
        $this->batchId = Str::uuid()->toString();
    }

    public function test_delete_batch_removes_all_associated_files_and_directories(): void
    {
        // Set up a temporary directory structure
        $diskRoot = sys_get_temp_dir() . '/nexapa-batch-delete-test-' . Str::uuid();
        mkdir($diskRoot . '/app/private/downloads/' . $this->user->id . '/' . $this->batchId, 0777, true);
        config(['filesystems.disks.local.root' => $diskRoot . '/app/private']);

        // Create some sample files in the batch directory
        $batchDir = $diskRoot . '/app/private/downloads/' . $this->user->id . '/' . $this->batchId;
        file_put_contents("{$batchDir}/media.mp4", 'video content');
        file_put_contents("{$batchDir}/media.mp4.part", 'partial video content');
        file_put_contents("{$batchDir}/media.mp3", 'audio content');
        file_put_contents("{$batchDir}/media.mp3.part", 'partial audio content');
        file_put_contents("{$batchDir}/media.info.json", '{"title": "Test video"}');
        mkdir("{$batchDir}/temp_extraction", 0777, true);
        file_put_contents("{$batchDir}/temp_extraction/temp.mp4", 'extracted content');

        // Create jobs in the batch with terminal status
        $jobs = [];
        for ($i = 0; $i < 3; $i++) {
            $job = DownloadJob::factory()->create([
                'user_id' => $this->user->id,
                'batch_id' => $this->batchId,
                'status' => DownloadJobStatus::Completed,
                'is_batch_work_item' => true,
            ]);

            // Create a download result for each job
            $result = DownloadResult::factory()->create([
                'download_job_id' => $job->id,
                'user_id' => $this->user->id,
            ]);

            // Create a media asset for each job
$asset = MediaAsset::create([
                'download_job_id' => $job->id,
                'user_id' => $this->user->id,
                'display_name' => 'Test Asset',
                'original_name' => 'test.mp4',
                'media_type' => 'video',
                'mime_type' => 'video/mp4',
                'storage_disk' => 'local',
                'storage_path' => "private/downloads/{$this->user->id}/{$this->batchId}/test.mp4",
                'file_size' => 1024,
                'status' => 'available',
            ]);

            $jobs[] = $job;
        }

        // Perform the delete batch operation
        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/download-batches/{$this->batchId}");

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Batch deleted successfully.',
            ])
            ->assertJsonStructure([
                'data' => [
                    'removed_jobs',
                    'removed_results',
                    'removed_media_assets',
                    'removed_files',
                    'removed_directories',
                    'missing_files',
                    'unsafe_paths',
                ],
            ]);

        // Verify all jobs are deleted
        foreach ($jobs as $job) {
            $this->assertDatabaseMissing('download_jobs', ['id' => $job->id]);
        }

        // Verify download results are deleted
        $this->assertDatabaseMissing('download_results', ['download_job_id' => $jobs[0]->id]);
        $this->assertDatabaseMissing('download_results', ['download_job_id' => $jobs[1]->id]);
        $this->assertDatabaseMissing('download_results', ['download_job_id' => $jobs[2]->id]);

        // Verify media assets are deleted
        $this->assertDatabaseMissing('media_assets', ['download_job_id' => $jobs[0]->id]);
        $this->assertDatabaseMissing('media_assets', ['download_job_id' => $jobs[1]->id]);
        $this->assertDatabaseMissing('media_assets', ['download_job_id' => $jobs[2]->id]);

        // Clean up
        $this->recursiveRemoveDirectory($diskRoot);
    }

    public function test_delete_batch_does_not_affect_other_users_data(): void
    {
        // Create jobs for the current user
        $userJobs = [];
        for ($i = 0; $i < 2; $i++) {
            $job = DownloadJob::factory()->create([
                'user_id' => $this->user->id,
                'batch_id' => $this->batchId,
                'status' => DownloadJobStatus::Completed,
                'is_batch_work_item' => true,
            ]);
            $userJobs[] = $job;
        }

        // Create a batch for another user
        $otherBatchId = Str::uuid()->toString();
        $otherJobs = [];
        for ($i = 0; $i < 2; $i++) {
            $job = DownloadJob::factory()->create([
                'user_id' => $this->otherUser->id,
                'batch_id' => $otherBatchId,
                'status' => DownloadJobStatus::Completed,
                'is_batch_work_item' => true,
            ]);
            $otherJobs[] = $job;
        }

        // Delete the current user's batch
        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/download-batches/{$this->batchId}");

        $response->assertStatus(200);

        // Verify current user's jobs are deleted
        foreach ($userJobs as $job) {
            $this->assertDatabaseMissing('download_jobs', ['id' => $job->id]);
        }

        // Verify other user's jobs are not affected
        foreach ($otherJobs as $job) {
            $this->assertDatabaseHas('download_jobs', ['id' => $job->id]);
        }
    }

    public function test_delete_active_batch_returns_409(): void
    {
        // Create an active job (non-terminal status)
        DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'batch_id' => $this->batchId,
            'status' => DownloadJobStatus::Processing,
            'is_batch_work_item' => true,
        ]);

        // Try to delete the batch
        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/download-batches/{$this->batchId}");

        $response->assertStatus(409)
            ->assertJson([
                'success' => false,
                'message' => 'Cannot delete active batch.',
            ]);
    }

    public function test_delete_batch_removes_part_files_and_temp_extraction_dir(): void
    {
        // Set up a temporary directory structure
        $diskRoot = sys_get_temp_dir() . '/nexapa-part-files-test-' . Str::uuid();
        mkdir($diskRoot . '/app/private/downloads/' . $this->user->id . '/' . $this->batchId, 0777, true);
        config(['filesystems.disks.local.root' => $diskRoot . '/app/private']);

        // Create sample files including .part files and temp_extraction directory
        $batchDir = $diskRoot . '/app/private/downloads/' . $this->user->id . '/' . $this->batchId;
        file_put_contents("{$batchDir}/media.mp4.part", 'partial video content');
        file_put_contents("{$batchDir}/media.mp3.part", 'partial audio content');
        mkdir("{$batchDir}/temp_extraction", 0777, true);
        file_put_contents("{$batchDir}/temp_extraction/temp.mp4", 'extracted content');

        // Create a job in the batch with terminal status
        $job = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'batch_id' => $this->batchId,
            'status' => DownloadJobStatus::Completed,
            'is_batch_work_item' => true,
        ]);

        // Perform the delete batch operation
        $response = $this->actingAs($this->user)
            ->deleteJson("/api/v1/download-batches/{$this->batchId}");

        $response->assertStatus(200);

        // Verify the job is deleted
        $this->assertDatabaseMissing('download_jobs', ['id' => $job->id]);

        // Clean up
        $this->recursiveRemoveDirectory($diskRoot);
    }

    /**
     * Recursively remove a directory and all its contents
     */
    private function recursiveRemoveDirectory(string $directory): void
    {
        if (!is_dir($directory)) {
            return;
        }

        $files = array_diff(scandir($directory), ['.', '..']);

        foreach ($files as $file) {
            $path = "{$directory}/{$file}";

            if (is_dir($path)) {
                $this->recursiveRemoveDirectory($path);
            } else {
                unlink($path);
            }
        }

        rmdir($directory);
    }
}