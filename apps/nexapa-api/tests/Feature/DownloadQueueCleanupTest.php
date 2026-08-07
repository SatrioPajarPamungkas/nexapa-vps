<?php

namespace Tests\Feature;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadMode;
use App\Enums\DownloadPlatform;
use App\Enums\MediaAssetStatus;
use App\Enums\SourceType;
use App\Models\DownloadJob;
use App\Models\DownloadResult;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class DownloadQueueCleanupTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_remove_mixed_terminal_profile_batch_with_hard_delete_of_media_assets(): void
    {
        $diskRoot = sys_get_temp_dir().'/nexapa-queue-purge-'.Str::uuid();
        mkdir($diskRoot.'/media', 0777, true);
        config(['filesystems.disks.local.root' => $diskRoot]);
        
        $user = User::factory()->create();
        [$parent, $children, $results] = $this->profileBatch($user, 45, 1);
        $mediaJob = $children->first();
        
        // Create physical file for media asset
        Storage::disk('local')->put('media/temp-video.mp4', 'downloaded-media');
        Storage::disk('local')->put('media/temp-video-thumb.jpg', 'thumbnail');
        
        $asset = MediaAsset::create([
            'user_id' => $user->id,
            'download_job_id' => $mediaJob->id,
            'display_name' => 'Downloaded video',
            'original_name' => 'temp-video.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => 'media/temp-video.mp4',
            'thumbnail_path' => 'media/temp-video-thumb.jpg',
            'source_platform' => 'tiktok',
            'source_url' => 'https://example.com/video',
            'status' => MediaAssetStatus::Available,
            'file_size' => 1024,
        ]);

        $response = $this->actingAs($user)
            ->deleteJson("/api/v1/download-jobs/{$parent->id}");

        $response->assertOk()->assertJson([
            'success' => true,
            'message' => 'Queue item and associated media permanently deleted.',
            'data' => [
                'removed_parents' => 1,
                'removed_children' => 46,
                'removed_results' => 46,
                'removed_media_assets' => 1,
                'removed_files' => 2, // media file + thumbnail
                'removed_directories' => 0,
                'missing_files' => 0,
                'unsafe_paths' => 0,
            ],
        ]);

        // Verify database records are deleted
        $this->assertSame(0, DownloadJob::withTrashed()->whereKey($parent->id)->count());
        $this->assertSame(0, DownloadJob::withTrashed()->where('parent_download_job_id', $parent->id)->count());
        $this->assertSame(0, DownloadResult::whereIn('id', $results->pluck('id'))->count());
        $this->assertSame(0, MediaAsset::where('id', $asset->id)->count());
        
        // Verify files are deleted
        Storage::disk('local')->assertMissing('media/temp-video.mp4');
        Storage::disk('local')->assertMissing('media/temp-video-thumb.jpg');
        
        @unlink($diskRoot.'/media/temp-video.mp4');
        @unlink($diskRoot.'/media/temp-video-thumb.jpg');
        @rmdir($diskRoot.'/media');
        @rmdir($diskRoot);
    }

    public function test_parent_with_processing_child_returns_conflict_without_deleting_data(): void
    {
        $user = User::factory()->create();
        [$parent, $children, $results] = $this->profileBatch($user, 1, 0);
        $children->first()->update(['status' => DownloadJobStatus::Processing]);

        $this->actingAs($user)
            ->deleteJson("/api/v1/download-jobs/{$parent->id}")
            ->assertConflict()
            ->assertJson([
                'success' => false,
                'message' => 'Queue item still has active jobs and cannot be removed.',
            ]);

        $this->assertSame(1, DownloadJob::whereKey($parent->id)->count());
        $this->assertSame(1, DownloadJob::where('parent_download_job_id', $parent->id)->count());
        $this->assertSame(1, DownloadResult::whereIn('id', $results->pluck('id'))->count());
    }

    public function test_other_user_receives_not_found_and_cannot_delete_queue_item(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        [$parent] = $this->profileBatch($owner, 1, 0);

        $this->actingAs($otherUser)
            ->deleteJson("/api/v1/download-jobs/{$parent->id}")
            ->assertNotFound();

        $this->assertSame(1, DownloadJob::whereKey($parent->id)->count());
        $this->assertSame(1, DownloadJob::where('parent_download_job_id', $parent->id)->count());
    }

    public function test_clear_queue_removes_only_current_users_terminal_top_level_items_with_hard_delete(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        foreach ([
            DownloadJobStatus::Completed,
            DownloadJobStatus::Failed,
            DownloadJobStatus::Skipped,
            DownloadJobStatus::Cancelled,
        ] as $status) {
            DownloadJob::factory()->create(['user_id' => $user->id, 'status' => $status]);
        }

        // Create a proper terminal parent (completed) with one terminal child
        $terminalParent = DownloadJob::factory()->profileMode()->completed()->create([
            'user_id' => $user->id,
            'source_type' => SourceType::Profile,
            'platform' => DownloadPlatform::Tiktok,
        ]);
        
        $terminalChild = DownloadJob::factory()->singleMode()->completed()->create([
            'user_id' => $user->id,
            'parent_download_job_id' => $terminalParent->id,
            'batch_id' => (string) Str::uuid(),
        ]);
        
        // Create an awaiting_selection parent that should survive the clear operation
        $awaitingSelectionParent = DownloadJob::factory()->profileMode()->awaitingSelection()->create([
            'user_id' => $user->id,
            'source_type' => SourceType::Profile,
            'platform' => DownloadPlatform::Tiktok,
        ]);
        
        $awaitingSelectionChild = DownloadJob::factory()->singleMode()->completed()->create([
            'user_id' => $user->id,
            'parent_download_job_id' => $awaitingSelectionParent->id,
            'batch_id' => (string) Str::uuid(),
        ]);
        
        $active = DownloadJob::factory()->create([
            'user_id' => $user->id,
            'status' => DownloadJobStatus::Queued,
        ]);
        $otherTerminal = DownloadJob::factory()->create([
            'user_id' => $otherUser->id,
            'status' => DownloadJobStatus::Completed,
        ]);

        // Create a media asset for one of the user's terminal jobs
        $terminalJob = DownloadJob::where('user_id', $user->id)
            ->where('status', DownloadJobStatus::Completed)
            ->first();
            
        $diskRoot = sys_get_temp_dir().'/nexapa-clear-test-'.Str::uuid();
        mkdir($diskRoot.'/media', 0777, true);
        config(['filesystems.disks.local.root' => $diskRoot]);
        
        Storage::disk('local')->put('media/test-file.mp4', 'test-content');
        
        $asset = MediaAsset::create([
            'user_id' => $user->id,
            'download_job_id' => $terminalJob->id,
            'display_name' => 'Test file',
            'original_name' => 'test-file.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => 'media/test-file.mp4',
            'source_platform' => 'tiktok',
            'source_url' => 'https://example.com/video',
            'status' => MediaAssetStatus::Available,
        ]);

        $response = $this->actingAs($user)
            ->deleteJson('/api/v1/download-jobs/queue');

        $response->assertOk();
        
        // Store the IDs before doing the delete operation
        $activeId = $active->id;
        $otherTerminalId = $otherTerminal->id;
        $awaitingSelectionParentId = $awaitingSelectionParent->id;
        $awaitingSelectionChildId = $awaitingSelectionChild->id;

        // Verify the terminal parent and its child were deleted
        $this->assertSame(0, DownloadJob::withTrashed()->whereKey($terminalParent->id)->count());
        $this->assertSame(0, DownloadJob::withTrashed()->whereKey($terminalChild->id)->count());
        
        // Verify the awaiting_selection parent and its child were NOT deleted
        $this->assertSame(1, DownloadJob::whereKey($awaitingSelectionParentId)->count());
        $this->assertSame(1, DownloadJob::whereKey($awaitingSelectionChildId)->count());
        
        // Verify active and other user's jobs remain
        $this->assertDatabaseHas('download_jobs', ['id' => $activeId, 'deleted_at' => null]);
        $this->assertDatabaseHas('download_jobs', ['id' => $otherTerminalId, 'deleted_at' => null]);
        
        // Verify user has exactly 3 jobs remaining (awaiting_selection parent + child, active job)
        $this->assertSame(3, DownloadJob::where('user_id', $user->id)->count());
        
        // Other user should still have their terminal job
        $this->assertSame(1, DownloadJob::where('user_id', $otherUser->id)->count());
        
        // Verify the media asset was deleted
        $this->assertSame(0, MediaAsset::where('id', $asset->id)->count());
        Storage::disk('local')->assertMissing('media/test-file.mp4');
        
        @unlink($diskRoot.'/media/test-file.mp4');
        @rmdir($diskRoot.'/media');
        @rmdir($diskRoot);
    }

    public function test_missing_temporary_archive_does_not_fail_purge_operation(): void
    {
        $user = User::factory()->create();
        $job = DownloadJob::factory()->completed()->create([
            'user_id' => $user->id,
            'metadata' => [
                'temporary_outputs' => [[
                    'storage_disk' => 'local',
                    'storage_path' => 'downloads/already-missing.mp4',
                    'thumbnail_path' => 'downloads/already-missing.jpg',
                ]],
            ],
        ]);

        $response = $this->actingAs($user)
            ->deleteJson("/api/v1/download-jobs/{$job->id}");
            
        $response->assertOk()->assertJson([
            'success' => true,
            'message' => 'Queue item and associated media permanently deleted.',
            'data' => [
                'removed_parents' => 1,
                'removed_children' => 0,
                'removed_results' => 0,
                'removed_media_assets' => 0,
                'removed_files' => 0,
                'removed_directories' => 0,
                'missing_files' => 0, // The files don't exist so they're not counted as missing during deletion
                'unsafe_paths' => 0,
            ],
        ]);

        $this->assertSame(0, DownloadJob::withTrashed()->whereKey($job->id)->count());
    }

    public function test_second_purge_request_returns_not_found_safely(): void
    {
        $user = User::factory()->create();
        $job = DownloadJob::factory()->completed()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->deleteJson("/api/v1/download-jobs/{$job->id}")
            ->assertOk();

        $this->deleteJson("/api/v1/download-jobs/{$job->id}")
            ->assertNotFound();
    }

    public function test_unrelated_media_assets_remain_after_deleting_different_queue_item(): void
    {
        $user = User::factory()->create();
        
        // Create a job with media assets
        $jobWithAssets = DownloadJob::factory()->completed()->create(['user_id' => $user->id]);
        
        $diskRoot = sys_get_temp_dir().'/nexapa-unrelated-test-'.Str::uuid();
        mkdir($diskRoot.'/media', 0777, true);
        config(['filesystems.disks.local.root' => $diskRoot]);
        
        Storage::disk('local')->put('media/unrelated.mp4', 'unrelated-content');
        
        $unrelatedAsset = MediaAsset::create([
            'user_id' => $user->id,
            'download_job_id' => $jobWithAssets->id,
            'display_name' => 'Unrelated file',
            'original_name' => 'unrelated.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => 'media/unrelated.mp4',
            'source_platform' => 'tiktok',
            'source_url' => 'https://example.com/video',
            'status' => MediaAssetStatus::Available,
        ]);
        
        // Create another job to delete (unrelated)
        $jobToDelete = DownloadJob::factory()->completed()->create(['user_id' => $user->id]);
        
        // Delete the unrelated job
        $response = $this->actingAs($user)
            ->deleteJson("/api/v1/download-jobs/{$jobToDelete->id}");
            
        $response->assertOk();
        
        // Verify the unrelated media asset still exists
        $this->assertDatabaseHas('media_assets', ['id' => $unrelatedAsset->id]);
        Storage::disk('local')->assertExists('media/unrelated.mp4');
        
        // Clean up
        Storage::disk('local')->delete('media/unrelated.mp4');
        @rmdir($diskRoot.'/media');
        @rmdir($diskRoot);
    }

    public function test_unsafe_paths_are_not_deleted_but_reported_in_stats(): void
    {
        $user = User::factory()->create();
        $job = DownloadJob::factory()->completed()->create(['user_id' => $user->id]);
        
        // Create a media asset with a path outside the allowed directory
        $asset = MediaAsset::create([
            'user_id' => $user->id,
            'download_job_id' => $job->id,
            'display_name' => 'Unsafe file',
            'original_name' => 'unsafe-file.mp4',
            'media_type' => 'video',
            'mime_type' => 'video/mp4',
            'storage_disk' => 'local',
            'storage_path' => '../outside-storage/unsafe-file.mp4', // This is unsafe
            'source_platform' => 'tiktok',
            'source_url' => 'https://example.com/video',
            'status' => MediaAssetStatus::Available,
        ]);
        
        $diskRoot = sys_get_temp_dir().'/nexapa-unsafe-test-'.Str::uuid();
        mkdir($diskRoot.'/outside-storage', 0777, true);
        config(['filesystems.disks.local.root' => $diskRoot . '/storage']);
        mkdir($diskRoot.'/storage', 0777, true);
        
        // Create the "unsafe" file outside the storage root
        file_put_contents($diskRoot.'/outside-storage/unsafe-file.mp4', 'unsafe-content');
        
        $response = $this->actingAs($user)
            ->deleteJson("/api/v1/download-jobs/{$job->id}");
            
        $response->assertOk()->assertJson([
            'success' => true,
            'message' => 'Queue item and associated media permanently deleted.',
            'data' => [
                'unsafe_paths' => 1,
                'removed_media_assets' => 1,
            ],
        ]);
        
        // Verify the unsafe file was NOT deleted
        $this->assertFileExists($diskRoot.'/outside-storage/unsafe-file.mp4');
        
        // Clean up
        unlink($diskRoot.'/outside-storage/unsafe-file.mp4');
        rmdir($diskRoot.'/outside-storage');
        rmdir($diskRoot.'/storage');
        rmdir($diskRoot);
    }

    public function test_symlink_escape_is_prevented_during_purge(): void
    {
        $user = User::factory()->create();
        $job = DownloadJob::factory()->completed()->create(['user_id' => $user->id]);
        
        $diskRoot = sys_get_temp_dir().'/nexapa-symlink-test-'.Str::uuid();
        mkdir($diskRoot.'/storage/media', 0777, true);
        mkdir($diskRoot.'/outside', 0777, true);
        config(['filesystems.disks.local.root' => $diskRoot . '/storage']);
        
        // Create a real file outside storage
        file_put_contents($diskRoot.'/outside/sensitive-file.txt', 'sensitive-content');
        
        // Create symlink inside storage pointing outside
        if (PHP_OS_FAMILY !== 'Windows') {
            symlink($diskRoot.'/outside/sensitive-file.txt', $diskRoot.'/storage/media/symlink-file.txt');
            
            // Create media asset pointing to the symlink
            $asset = MediaAsset::create([
                'user_id' => $user->id,
                'download_job_id' => $job->id,
                'display_name' => 'Symlink file',
                'original_name' => 'symlink-file.txt',
                'media_type' => 'document',
                'mime_type' => 'text/plain',
                'storage_disk' => 'local',
                'storage_path' => 'media/symlink-file.txt',
                'source_platform' => 'generic',
                'source_url' => 'https://example.com/file',
                'status' => MediaAssetStatus::Available,
            ]);
            
            $response = $this->actingAs($user)
                ->deleteJson("/api/v1/download-jobs/{$job->id}");
                
            $response->assertOk()->assertJson([
                'success' => true,
                'message' => 'Queue item and associated media permanently deleted.',
                'data' => [
                    'unsafe_paths' => 1, // Should be reported as unsafe
                ],
            ]);
            
            // Verify the original file outside storage was NOT deleted
            $this->assertFileExists($diskRoot.'/outside/sensitive-file.txt');
            
            // Clean up
            unlink($diskRoot.'/storage/media/symlink-file.txt');
        }
        
        rmdir($diskRoot.'/storage/media');
        rmdir($diskRoot.'/storage');
        unlink($diskRoot.'/outside/sensitive-file.txt');
        rmdir($diskRoot.'/outside');
        rmdir($diskRoot);
    }

    public function test_single_delete_parent_awaiting_selection_with_no_children_returns_200_and_removes_all_data(): void
    {
        $user = User::factory()->create();
        $parent = DownloadJob::factory()->profileMode()->awaitingSelection()->create([
            'user_id' => $user->id,
            'source_type' => SourceType::Profile,
            'platform' => DownloadPlatform::Tiktok,
        ]);
        
        // Create 46 download results
        $results = DownloadResult::factory()->count(46)->create([
            'download_job_id' => $parent->id,
        ]);
        
        // Ensure no children exist
        $this->assertSame(0, DownloadJob::where('parent_download_job_id', $parent->id)->count());
        
        $response = $this->actingAs($user)
            ->deleteJson("/api/v1/download-jobs/{$parent->id}");
            
        $response->assertOk()->assertJson([
            'success' => true,
            'message' => 'Queue item and associated media permanently deleted.',
            'data' => [
                'removed_parents' => 1,
                'removed_children' => 0,
                'removed_results' => 46,
                'removed_media_assets' => 0,
            ],
        ]);
        
        // Verify parent is deleted
        $this->assertSame(0, DownloadJob::withTrashed()->whereKey($parent->id)->count());
        
        // Verify results are deleted
        $this->assertSame(0, DownloadResult::whereIn('id', $results->pluck('id'))->count());
    }
    
    public function test_single_delete_parent_awaiting_selection_with_processing_child_returns_409_and_no_data_removed(): void
    {
        $user = User::factory()->create();
        $parent = DownloadJob::factory()->profileMode()->awaitingSelection()->create([
            'user_id' => $user->id,
            'source_type' => SourceType::Profile,
            'platform' => DownloadPlatform::Tiktok,
        ]);
        
        // Create one processing child
        $child = DownloadJob::factory()->singleMode()->create([
            'user_id' => $user->id,
            'parent_download_job_id' => $parent->id,
            'status' => DownloadJobStatus::Processing,
        ]);
        
        $response = $this->actingAs($user)
            ->deleteJson("/api/v1/download-jobs/{$parent->id}");
            
        $response->assertStatus(409)->assertJson([
            'success' => false,
            'message' => 'Queue item still has active jobs and cannot be removed.',
        ]);
        
        // Verify no data was deleted
        $this->assertSame(1, DownloadJob::whereKey($parent->id)->count());
        $this->assertSame(1, DownloadJob::whereKey($child->id)->count());
        $this->assertSame(DownloadJobStatus::Processing->value, DownloadJob::find($child->id)->status->value);
    }

    /**
     * @return array{DownloadJob, \Illuminate\Database\Eloquent\Collection, \Illuminate\Database\Eloquent\Collection}
     */
    private function profileBatch(User $user, int $completed, int $failed): array
    {
        $parent = DownloadJob::factory()->profileMode()->awaitingSelection()->create([
            'user_id' => $user->id,
            'source_type' => SourceType::Profile,
            'platform' => DownloadPlatform::Tiktok,
        ]);
        $batchId = (string) Str::uuid();
        $results = DownloadResult::factory()->count($completed + $failed)->create([
            'download_job_id' => $parent->id,
        ]);

        $children = $results->values()->map(function (DownloadResult $result, int $index) use ($user, $parent, $batchId, $completed): DownloadJob {
            return DownloadJob::factory()->singleMode()->create([
                'user_id' => $user->id,
                'parent_download_job_id' => $parent->id,
                'download_result_id' => $result->id,
                'batch_id' => $batchId,
                'status' => $index < $completed
                    ? DownloadJobStatus::Completed
                    : DownloadJobStatus::Failed,
            ]);
        });

        return [$parent, $children, $results];
    }
}