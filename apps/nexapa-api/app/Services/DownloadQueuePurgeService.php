<?php

namespace App\Services;

use App\Enums\DownloadJobStatus;
use App\Exceptions\InvalidTransitionException;
use App\Models\DownloadJob;
use App\Models\DownloadResult;
use App\Models\MediaAsset;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class DownloadQueuePurgeService
{
    public function __construct(
        private readonly TemporaryDownloadOutputService $temporaryOutputs,
    ) {}

    /**
     * Permanently remove a standalone queue item or an entire parent/profile batch.
     *
     * @return array{removed_parents: int, removed_children: int, removed_results: int, removed_media_assets: int, removed_files: int, removed_directories: int, missing_files: int, unsafe_paths: int}
     */
    public function remove(string $jobId, int|string $userId, bool $allowAwaitingSelectionDelete = true): array
    {
        $target = DownloadJob::query()
            ->whereKey($jobId)
            ->where('user_id', $userId)
            ->first();

        if ($target === null) {
            throw (new ModelNotFoundException())->setModel(DownloadJob::class, [$jobId]);
        }

        // For clearTerminal operations, we always want to operate on the specified job,
        // not its parent, even if it has one
        $parentId = (string) ($target->parent_download_job_id ?: $target->id);

        $purge = DB::transaction(function () use ($parentId, $userId, $allowAwaitingSelectionDelete): array {
            $parent = DownloadJob::query()
                ->whereKey($parentId)
                ->where('user_id', $userId)
                ->lockForUpdate()
                ->first();

            if ($parent === null) {
                throw (new ModelNotFoundException())->setModel(DownloadJob::class, [$parentId]);
            }

            $children = $this->lockDescendants($parent, $userId);
            // Debug: Log the count of children found
            $childCount = $children->count();
            
            // Special handling for awaiting_selection parents
            if ($parent->status === DownloadJobStatus::AwaitingSelection && !$allowAwaitingSelectionDelete) {
                // Allow deletion of awaiting_selection parents with terminal children
                // Check if all children are terminal statuses
                $nonTerminalChildren = $children->filter(function (DownloadJob $job): bool {
                    return !in_array($job->status, [
                        DownloadJobStatus::Completed,
                        DownloadJobStatus::Failed,
                        DownloadJobStatus::Skipped,
                        DownloadJobStatus::Cancelled,
                        DownloadJobStatus::PartiallyCompleted,
                    ], true);
                });
                
                if ($nonTerminalChildren->isNotEmpty()) {
                    throw new InvalidTransitionException(
                        'Clear queue operation cannot remove awaiting_selection parent jobs with active children.'
                    );
                }
                // If all children are terminal, we can proceed with deletion
                // Continue with normal deletion process
            }
            
            // For single delete, check if there are any active descendants
            // Active statuses that should prevent deletion:
            // queued, ready, claimed, processing, analyzing
            $activeDescendants = $children->filter(
                static fn (DownloadJob $job): bool => in_array($job->status, [
                    DownloadJobStatus::Queued,
                    DownloadJobStatus::Ready,
                    DownloadJobStatus::Claimed,
                    DownloadJobStatus::Processing,
                    DownloadJobStatus::Analyzing,
                ], true)
            );
            
            $hasActiveJobs = $activeDescendants->isNotEmpty();

            if ($hasActiveJobs) {
                throw new InvalidTransitionException(
                    'Queue item still has active jobs and cannot be removed.'
                );
            }

            $allJobs = collect([$parent])->concat($children);
            $jobIds = $allJobs->pluck('id')->map(static fn ($id): string => (string) $id)->all();
            $childIds = $children->pluck('id')->map(static fn ($id): string => (string) $id)->all();
            $batchIds = $allJobs->pluck('batch_id')->filter()->unique()->values()->all();
            
            // Collect all file paths before deletion
            $temporaryPaths = $this->collectTemporaryPaths($allJobs);
            $mediaAssetPaths = $this->collectMediaAssetPaths($jobIds);
            
            // Count database records before deletion
            $removedResults = DownloadResult::query()
                ->whereIn('download_job_id', $jobIds)
                ->count();
                
            $removedMediaAssets = MediaAsset::query()
                ->whereIn('download_job_id', $jobIds)
                ->count();

            // Delete Media Assets and their associated files
            $deletedMediaAssets = MediaAsset::query()
                ->whereIn('download_job_id', $jobIds)
                ->get();
                
            // Delete the media assets from database
            MediaAsset::query()
                ->whereIn('download_job_id', $jobIds)
                ->delete();
                
            // Children must be physically removed before their parent results and parent row.
            foreach (array_chunk(array_reverse($childIds), 500) as $ids) {
                DownloadJob::withTrashed()->whereIn('id', $ids)->forceDelete();
            }

            DownloadResult::query()
                ->whereIn('download_job_id', $jobIds)
                ->delete();

            DownloadJob::withTrashed()->whereKey($parent->id)->forceDelete();

            return [
                'counts' => [
                    'removed_parents' => 1,
                    'removed_children' => count($childIds), // This is the correct count of children to be removed
                    'removed_results' => $removedResults,
                    'removed_media_assets' => $removedMediaAssets,
                ],
                'job_ids' => $jobIds,
                'batch_ids' => $batchIds,
                'temporary_paths' => $temporaryPaths,
                'media_asset_paths' => $mediaAssetPaths,
                'deleted_media_assets' => $deletedMediaAssets,
                'debug' => [
                    'initial_child_count' => $childCount,
                    'final_child_ids_count' => count($childIds),
                ],
            ];
        }, 3);

        // Delete filesystem artifacts and get detailed stats
        $fileDeletionStats = $this->purgeFilesystemArtifacts(
            $purge['temporary_paths'],
            $purge['media_asset_paths'],
            $purge['job_ids'],
            $purge['batch_ids'],
        );

        // Delete media asset files
        $mediaAssetFileStats = $this->deleteMediaAssetFiles($purge['deleted_media_assets']);

        foreach ($purge['batch_ids'] as $batchId) {
            Cache::forget("download-batch:{$batchId}");
        }

        return [
            'removed_parents' => $purge['counts']['removed_parents'],
            'removed_children' => $purge['counts']['removed_children'],
            'removed_results' => $purge['counts']['removed_results'],
            'removed_media_assets' => $purge['counts']['removed_media_assets'],
            'removed_files' => $fileDeletionStats['removed_files'] + $mediaAssetFileStats['removed_files'],
            'removed_directories' => $fileDeletionStats['removed_directories'] + $mediaAssetFileStats['removed_directories'],
            'missing_files' => $fileDeletionStats['missing_files'] + $mediaAssetFileStats['missing_files'],
            'unsafe_paths' => $fileDeletionStats['unsafe_paths'] + $mediaAssetFileStats['unsafe_paths'],
        ];
    }

    /**
     * @return array{removed_parents: int, removed_children: int, removed_results: int, removed_media_assets: int, removed_files: int, removed_directories: int, missing_files: int, skipped_active: int, unsafe_paths: int}
     */
    public function clearTerminal(int|string $userId, int $chunkSize = 100): array
    {
        $totals = [
            'removed_parents' => 0,
            'removed_children' => 0,
            'removed_results' => 0,
            'removed_media_assets' => 0,
            'removed_files' => 0,
            'removed_directories' => 0,
            'missing_files' => 0,
            'skipped_active' => 0,
            'unsafe_paths' => 0,
        ];

        // Only delete top-level parent jobs (those without parent_download_job_id)
        // Do NOT include AwaitingSelection status for clearTerminal per product requirements
        DownloadJob::query()
            ->where('user_id', $userId)
            ->whereNull('parent_download_job_id')
            ->whereIn('status', [
                DownloadJobStatus::Completed,
                DownloadJobStatus::Failed,
                DownloadJobStatus::Skipped,
                DownloadJobStatus::Cancelled,
                DownloadJobStatus::PartiallyCompleted,
            ])
            ->orderBy('id')
            ->chunkById($chunkSize, function (Collection $parents) use ($userId, &$totals): void {
                foreach ($parents as $parent) {
                    try {
                        $removed = $this->remove((string) $parent->id, $userId, false); // Do not allow awaiting_selection deletion for clearTerminal
                        $totals['removed_parents'] += $removed['removed_parents'];
                        $totals['removed_children'] += $removed['removed_children']; // Accumulate the actual removed children count
                        $totals['removed_results'] += $removed['removed_results'];
                        $totals['removed_media_assets'] += $removed['removed_media_assets'];
                        $totals['removed_files'] += $removed['removed_files'];
                        $totals['removed_directories'] += $removed['removed_directories'];
                        $totals['missing_files'] += $removed['missing_files'];
                        $totals['unsafe_paths'] += $removed['unsafe_paths'];
                    } catch (InvalidTransitionException $e) {
                        $totals['skipped_active']++;
                    } catch (ModelNotFoundException) {
                        // A concurrent cleanup already removed it; nothing remains to count.
                    }
                }
            });

        return $totals;
    }

    /**
     * @return Collection<int, DownloadJob>
     */
    private function lockDescendants(DownloadJob $parent, int|string $userId): Collection
    {
        $descendants = new Collection();
        $parentIds = [(string) $parent->id];

        while ($parentIds !== []) {
            $level = DownloadJob::withTrashed()
                ->where('user_id', $userId)
                ->whereIn('parent_download_job_id', $parentIds)
                ->lockForUpdate()
                ->get();

            if ($level->isEmpty()) {
                break;
            }

            $descendants = $descendants->concat($level);
            $parentIds = $level->pluck('id')->map(static fn ($id): string => (string) $id)->all();
        }

        // Explicitly count the descendants to ensure we're getting the right number
        $count = $descendants->count();
        
        return $descendants;
    }

    /**
     * @param iterable<DownloadJob> $jobs
     * @return list<string>
     */
    private function collectTemporaryPaths(iterable $jobs): array
    {
        $paths = [];

        foreach ($jobs as $job) {
            foreach ($this->temporaryOutputs->getTemporaryOutputs($job) as $output) {
                foreach (['media', 'thumbnail'] as $kind) {
                    $path = $this->temporaryOutputs->resolveOutputFile($output, $kind);
                    if ($path !== null) {
                        $paths[$path] = $path;
                    }
                }
                
                // Also check for files that are referenced but don't exist
                $disk = $output['storage_disk'] ?? 'local';
                if ($disk === 'local') {
                    $root = config("filesystems.disks.{$disk}.root");
                    if (!empty($root) && is_dir($root)) {
                        // Check media path
                        $mediaPath = $output['storage_path'] ?? null;
                        if ($mediaPath) {
                            $normalizedPath = str_replace('\\', '/', $mediaPath);
                            if (str_starts_with($normalizedPath, 'downloads/')) {
                                $relativePath = implode(DIRECTORY_SEPARATOR, explode('/', $normalizedPath));
                                $fullPath = rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $relativePath;
                                // Don't add if it would be resolved successfully
                                if (!file_exists($fullPath)) {
                                    // Just track that we tried to delete something that doesn't exist
                                }
                            }
                        }
                        
                        // Check thumbnail path
                        $thumbPath = $output['thumbnail_path'] ?? null;
                        if ($thumbPath) {
                            $normalizedPath = str_replace('\\', '/', $thumbPath);
                            if (str_starts_with($normalizedPath, 'downloads/')) {
                                $relativePath = implode(DIRECTORY_SEPARATOR, explode('/', $normalizedPath));
                                $fullPath = rtrim($root, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $relativePath;
                                // Don't add if it would be resolved successfully
                                if (!file_exists($fullPath)) {
                                    // Just track that we tried to delete something that doesn't exist
                                }
                            }
                        }
                    }
                }
            }
        }

        return array_values($paths);
    }

    /**
     * @param list<string> $jobIds
     * @return list<array{storage_disk: string, storage_path: string, thumbnail_path: string|null}>
     */
    private function collectMediaAssetPaths(array $jobIds): array
    {
        $mediaAssets = MediaAsset::query()
            ->whereIn('download_job_id', $jobIds)
            ->get();

        $paths = [];
        foreach ($mediaAssets as $asset) {
            $paths[] = [
                'storage_disk' => $asset->storage_disk,
                'storage_path' => $asset->storage_path,
                'thumbnail_path' => $asset->thumbnail_path,
            ];
        }

        return $paths;
    }

    /**
     * @param list<string> $temporaryPaths
     * @param list<array{storage_disk: string, storage_path: string, thumbnail_path: string|null}> $mediaAssetPaths
     * @param list<string> $jobIds
     * @param list<string> $batchIds
     * @return array{removed_files: int, removed_directories: int, missing_files: int, unsafe_paths: int}
     */
    private function purgeFilesystemArtifacts(array $temporaryPaths, array $mediaAssetPaths, array $jobIds, array $batchIds): array
    {
        $stats = [
            'removed_files' => 0,
            'removed_directories' => 0,
            'missing_files' => 0,
            'unsafe_paths' => 0,
        ];

        foreach ($temporaryPaths as $path) {
            $result = $this->deleteAllowedFile($path, storage_path('app/private/downloads'));
            if ($result === 'deleted') {
                $stats['removed_files']++;
            } elseif ($result === 'missing') {
                $stats['missing_files']++;
            } elseif ($result === 'unsafe') {
                $stats['unsafe_paths']++;
            }
        }

        $archiveRoot = storage_path('app/private/archives');
        if (is_dir($archiveRoot)) {
            try {
                $files = new \FilesystemIterator($archiveRoot, \FilesystemIterator::SKIP_DOTS);
                foreach ($files as $file) {
                    if (! $file->isFile()) {
                        continue;
                    }

                    $name = $file->getFilename();
                    if ($this->isOwnedArchiveName($name, $jobIds, $batchIds)) {
                        $result = $this->deleteAllowedFile($file->getPathname(), $archiveRoot);
                        if ($result === 'deleted') {
                            $stats['removed_files']++;
                        } elseif ($result === 'missing') {
                            $stats['missing_files']++;
                        } elseif ($result === 'unsafe') {
                            $stats['unsafe_paths']++;
                        }
                    }
                }
            } catch (Throwable) {
                // Filesystem errors are non-fatal
            }
        }

        return $stats;
    }

    /**
     * @param list<string> $jobIds
     * @param list<string> $batchIds
     */
    private function isOwnedArchiveName(string $name, array $jobIds, array $batchIds): bool
    {
        foreach ($jobIds as $jobId) {
            if (preg_match('/^nexapa-job-'.preg_quote($jobId, '/').'-[^\/]+\.zip$/', $name) === 1) {
                return true;
            }
        }

        foreach ($batchIds as $batchId) {
            $quotedBatch = preg_quote((string) $batchId, '/');
            $shortId = preg_quote(substr((string) $batchId, 0, 8), '/');

            if (
                preg_match('/^nexapa-multiple-'.$shortId.'-[^\/]+\.zip$/', $name) === 1
                || preg_match('/^batch-'.$quotedBatch.'-(?:manifest\.json|parts\.zip|part-\d+\.zip)$/', $name) === 1
            ) {
                return true;
            }
        }

        return false;
    }

    private function deleteAllowedFile(string $path, string $allowedRoot): string
    {
        $realRoot = realpath($allowedRoot);
        $realPath = realpath($path);

        // Check if path is safe
        if ($realRoot === false || $realPath === false) {
            return 'unsafe';
        }

        // Check if file exists
        if (!is_file($realPath)) {
            return 'missing';
        }

        // Containment check
        if (!str_starts_with($realPath, $realRoot . DIRECTORY_SEPARATOR)) {
            return 'unsafe';
        }

        // Attempt deletion
        if (@unlink($realPath)) {
            return 'deleted';
        }

        return 'missing'; // Failed to delete
    }

    /**
     * @param Collection<int, MediaAsset> $mediaAssets
     * @return array{removed_files: int, removed_directories: int, missing_files: int, unsafe_paths: int}
     */
    private function deleteMediaAssetFiles(Collection $mediaAssets): array
    {
        $stats = [
            'removed_files' => 0,
            'removed_directories' => 0,
            'missing_files' => 0,
            'unsafe_paths' => 0,
        ];

        foreach ($mediaAssets as $asset) {
            // Delete main media file
            $result = $this->deleteMediaAssetFile($asset->storage_disk, $asset->storage_path);
            if ($result === 'deleted') {
                $stats['removed_files']++;
            } elseif ($result === 'missing') {
                $stats['missing_files']++;
            } elseif ($result === 'unsafe') {
                $stats['unsafe_paths']++;
            }

            // Delete thumbnail file if it exists
            if ($asset->thumbnail_path) {
                $thumbResult = $this->deleteMediaAssetFile($asset->storage_disk, $asset->thumbnail_path);
                if ($thumbResult === 'deleted') {
                    $stats['removed_files']++;
                } elseif ($thumbResult === 'missing') {
                    $stats['missing_files']++;
                } elseif ($thumbResult === 'unsafe') {
                    $stats['unsafe_paths']++;
                }
            }
        }

        return $stats;
    }

    private function deleteMediaAssetFile(string $disk, string $path): string
    {
        // Get disk root
        $allowedDisks = config('nexapa.allowed_storage_disks', ['local', 'public']);
        if (!in_array($disk, $allowedDisks, true)) {
            return 'unsafe';
        }

        $root = config("filesystems.disks.{$disk}.root");
        if (empty($root) || !is_dir($root)) {
            return 'unsafe';
        }

        // Normalize both Unix and Windows separators before validation.
        $normalizedPath = str_replace('\\', '/', $path);

        // Reject Unix absolute paths, UNC paths, and Windows drive paths.
        if (
            str_starts_with($normalizedPath, '/')
            || preg_match('/^[A-Za-z]:/', $normalizedPath) === 1
        ) {
            return 'unsafe';
        }

        // Reject traversal and current-directory segments.
        $segments = explode('/', $normalizedPath);
        if (
            in_array('.', $segments, true)
            || in_array('..', $segments, true)
        ) {
            return 'unsafe';
        }

        $relativePath = implode(DIRECTORY_SEPARATOR, $segments);
        $full = rtrim($root, DIRECTORY_SEPARATOR)
            . DIRECTORY_SEPARATOR
            . $relativePath;
        $realRoot = realpath($root);
        $realFile = realpath($full);

        // Check if path is safe
        if ($realRoot === false || $realFile === false) {
            return 'unsafe';
        }

        // Check if file exists
        if (!is_file($realFile)) {
            return 'missing';
        }

        // Containment check
        if (!str_starts_with($realFile, $realRoot . DIRECTORY_SEPARATOR)) {
            return 'unsafe';
        }

        // Attempt deletion
        if (@unlink($realFile)) {
            return 'deleted';
        }

        return 'missing'; // Failed to delete
    }
}
