<?php

namespace App\Http\Controllers\Api;

use App\Enums\DownloadJobStatus;
use App\Http\Controllers\Controller;
use App\Models\DownloadJob;
use App\Models\DownloadResult;
use App\Models\MediaAsset;
use App\Services\DownloadBatchService;
use App\Services\DownloadQueuePurgeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DownloadBatchController extends Controller
{
    public function __construct(private readonly DownloadBatchService $batchService) {}

    /**
     * Trigger download all for a parent download job
     * This creates child jobs for all associated download results
     */
    public function downloadAll(Request $request, string $downloadJobId): JsonResponse
    {
        // Get the parent download job
        $parentJob = DownloadJob::query()
            ->whereKey($downloadJobId)
            ->where('user_id', auth()->id())
            ->first();
        if (!$parentJob) {
            return response()->json([
                'success' => false,
                'message' => 'Parent download job not found.',
            ], 404);
        }

        // Validate parent job is in awaiting_selection state
        if ($parentJob->status !== DownloadJobStatus::AwaitingSelection) {
            return response()->json([
                'success' => false,
                'message' => 'Parent job is not in awaiting selection state.',
            ], 400);
        }

        // Validate request parameters
        $validated = $request->validate([
            'output_format' => 'nullable|string|in:mp4,audio,original',
            'quality' => 'nullable|string|in:best,worst,1080p,720p,480p,360p',
            'filename_mode' => 'nullable|string|in:original,clean,sequential',
        ]);

        // Get all results for this parent job (Download All Fast should use all results)
        $downloadResults = DownloadResult::where('download_job_id', $parentJob->id)
            ->get();

        if ($downloadResults->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No results found for this job.',
            ], 400);
        }

        // Implement idempotency with proper locking
        $outputFormat = $validated['output_format'] ?? $parentJob->output_format;
        $quality = $validated['quality'] ?? $parentJob->quality;
        $filenameMode = $validated['filename_mode'] ?? $parentJob->filename_mode;

        $batchId = DB::transaction(function () use ($parentJob, $outputFormat, $quality, $filenameMode, $downloadResults) {
            // Lock the parent job to prevent race conditions
            DownloadJob::whereKey($parentJob->id)->lockForUpdate()->firstOrFail();

            // Find existing batch with same settings
            $existingChild = DownloadJob::where('parent_download_job_id', $parentJob->id)
                ->where('output_format', $outputFormat)
                ->where('quality', $quality)
                ->where('filename_mode', $filenameMode)
                ->first();

            if ($existingChild && $existingChild->batch_id) {
                return $existingChild->batch_id;
            }

            // No existing batch found, create a new one
            return Str::uuid()->toString();
        });

        // Prepare job data with merged settings
        $jobData = [
            'user_id' => $parentJob->user_id,
            'mode' => 'single', // Each child job is a single download
            'platform' => $parentJob->platform,
            'source_type' => $parentJob->source_type,
            'output_format' => $outputFormat,
            'quality' => $quality,
            'filename_mode' => $filenameMode,
            'delay_seconds' => $parentJob->delay_seconds,
            'status' => DownloadJobStatus::Queued,
            'batch_id' => $batchId,
            'parent_download_job_id' => $parentJob->id,
        ];

        // Track statistics
        $totalJobs = 0;
        $createdJobs = 0;
        $existingJobs = 0;

        // Create child jobs with idempotency check using upsert
        foreach ($downloadResults as $result) {
            $totalJobs++;

            // Use firstOrCreate with the unique constraint to ensure idempotency
            $childJob = DownloadJob::firstOrCreate(
                [
                    'parent_download_job_id' => $parentJob->id,
                    'download_result_id' => $result->id,
                    'output_format' => $jobData['output_format'],
                    'quality' => $jobData['quality'],
                    'filename_mode' => $jobData['filename_mode'],
                ],
                array_merge($jobData, [
                    'original_input' => $result->source_url,
                    'normalized_url' => $result->source_url,
                    'download_result_id' => $result->id,
                ])
            );

            if ($childJob->wasRecentlyCreated) {
                $createdJobs++;
            } else {
                $existingJobs++;
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Download batch created successfully.',
            'data' => [
                'batch_id' => $batchId,
                'total' => $totalJobs,
                'created' => $createdJobs,
                'existing' => $existingJobs,
            ],
        ]);
    }

    public function show(string $batchId): JsonResponse
    {
        $data = $this->batchService->getStatus($batchId, auth()->id());
        if ($data === null) {
            return response()->json([
                'success' => false,
                'message' => 'Batch not found.',
                'data' => null,
            ], 404);
        }
        return response()->json([
            'success' => true,
            'message' => 'Batch status retrieved.',
            'data' => $data,
        ]);
    }

    public function archive(string $batchId): BinaryFileResponse|JsonResponse
    {
        $status = $this->batchService->getStatus($batchId, auth()->id());
        if ($status === null) {
            return response()->json([
                'success' => false,
                'message' => 'Batch not found.',
                'data' => null,
            ], 404);
        }
        if (! $status['is_terminal']) {
            return response()->json([
                'success' => false,
                'message' => 'Batch is not terminal.',
                'data' => $status,
            ], 409);
        }
        if (! $status['can_download_zip']) {
            return response()->json([
                'success' => false,
                'message' => 'No downloadable media assets in batch.',
                'data' => $status,
            ], 404);
        }

        $result = $this->batchService->createZip($batchId, auth()->id());
        if ($result === null || empty($result['path'])) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create ZIP archive.',
                'data' => $status,
            ], 500);
        }
        $shortId = substr($batchId, 0, 8);
        $fileName = "nexapa-multiple-{$shortId}.zip";
        return response()->download($result['path'], $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Create and download bulk ZIP parts for fast download mode
     */
    public function cancelBatch(string $batchId): JsonResponse
    {
        $userId = auth()->id();

        // Check if batch exists for this user
        $batchExists = DownloadJob::where('batch_id', $batchId)
            ->where('user_id', $userId)
            ->where('is_batch_work_item', true)
            ->exists();

        if (!$batchExists) {
            return response()->json([
                'success' => false,
                'message' => 'Batch not found.',
            ], 404);
        }

        // Get all batch jobs for the user
        $batchJobs = DownloadJob::where('batch_id', $batchId)
            ->where('user_id', $userId)
            ->where('is_batch_work_item', true)
            ->get();

        // Use transaction for consistency
        DB::transaction(function () use ($batchJobs, $userId) {
            foreach ($batchJobs as $job) {
                // Only cancel active jobs (queued, claimed, processing)
                if (in_array($job->status, [
                    DownloadJobStatus::Queued,
                    DownloadJobStatus::Claimed,
                    DownloadJobStatus::Processing
                ])) {
                    // Clear worker lease if needed
                    $metadata = $job->metadata ?? [];
                    unset($metadata['worker_lease']);

                    $job->update([
                        'status' => DownloadJobStatus::Cancelled,
                        'metadata' => $metadata,
                        'updated_at' => now(),
                    ]);
                }
            }
        });

        // Update batch aggregation
        app(DownloadBatchService::class)->getStatus($batchId, $userId);

        return response()->json([
            'success' => true,
            'message' => 'Batch cancelled successfully.',
        ]);
    }

    public function retryFailedBatch(string $batchId): JsonResponse
    {
        $userId = auth()->id();

        // Check if batch exists for this user with retryable jobs
        $retryableJobsExist = DownloadJob::where('batch_id', $batchId)
            ->where('user_id', $userId)
            ->where('is_batch_work_item', true)
            ->whereIn('status', [
                DownloadJobStatus::Failed,
                DownloadJobStatus::Skipped
            ])
            ->exists();

        if (!$retryableJobsExist) {
            return response()->json([
                'success' => false,
                'message' => 'No retryable jobs found in batch.',
            ], 404);
        }

        // Get all failed/skipped batch jobs for the user
        $batchJobs = DownloadJob::where('batch_id', $batchId)
            ->where('user_id', $userId)
            ->where('is_batch_work_item', true)
            ->whereIn('status', [
                DownloadJobStatus::Failed,
                DownloadJobStatus::Skipped
            ])
            ->get();

        $retriedCount = 0;

        // Use transaction for consistency
        DB::transaction(function () use ($batchJobs, &$retriedCount, $userId) {
            foreach ($batchJobs as $job) {
                // Check if job is retryable (business logic can be expanded here)
                $isRetryable = true;

                if ($isRetryable) {
                    // Reset job to queued status with cleared error/lease
                    $metadata = $job->metadata ?? [];
                    unset($metadata['worker_lease']);
                    unset($metadata['last_error']);

                    $job->update([
                        'status' => DownloadJobStatus::Queued,
                        'metadata' => $metadata,
                        'error_message' => null,
                        'failed_at' => null,
                        'updated_at' => now(),
                    ]);

                    $retriedCount++;
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Retry initiated for failed jobs.',
            'data' => [
                'retried_count' => $retriedCount,
            ],
        ]);
    }

public function deleteBatch(string $batchId): JsonResponse
    {
        $userId = auth()->id();

        // Check if batch exists for this user
        $batchExists = DownloadJob::where('batch_id', $batchId)
            ->where('user_id', $userId)
            ->where('is_batch_work_item', true)
            ->exists();

        if (!$batchExists) {
            return response()->json([
                'success' => false,
                'message' => 'Batch not found.',
            ], 404);
        }

        // Get all batch jobs for the user
        $batchJobs = DownloadJob::where('batch_id', $batchId)
            ->where('user_id', $userId)
            ->where('is_batch_work_item', true)
            ->get();

        // Check if batch is active (any non-terminal jobs)
        $activeJobs = $batchJobs->filter(function ($job) {
            return !$job->status->isTerminal();
        });

        if ($activeJobs->isNotEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete active batch.',
            ], 409);
        }

        // Use DownloadQueuePurgeService to handle the cleanup
        $purgeService = app(DownloadQueuePurgeService::class);

        try {
            // Collect all job IDs for the batch
            $jobIds = $batchJobs->pluck('id')->toArray();

            // Initialize stats
            $totalRemovedJobs = 0;
            $totalRemovedResults = 0;
            $totalRemovedMediaAssets = 0;
            $totalRemovedFiles = 0;
            $totalRemovedDirectories = 0;
            $totalMissingFiles = 0;
            $totalUnsafePaths = 0;

            // Process each job individually using the purge service
            foreach ($jobIds as $jobId) {
                try {
                    $result = $purgeService->remove($jobId, $userId, true);

                    $totalRemovedJobs += $result['removed_parents'] + $result['removed_children'];
                    $totalRemovedResults += $result['removed_results'];
                    $totalRemovedMediaAssets += $result['removed_media_assets'];
                    $totalRemovedFiles += $result['removed_files'];
                    $totalRemovedDirectories += $result['removed_directories'];
                    $totalMissingFiles += $result['missing_files'];
                    $totalUnsafePaths += $result['unsafe_paths'];
                } catch (\Exception $e) {
                    // Log error but continue with other jobs
                    \Log::warning('Failed to delete job in batch', [
                        'job_id' => $jobId,
                        'batch_id' => $batchId,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Additionally, delete the entire batch directory for the user
            $batchStoragePath = storage_path("app/private/downloads/{$userId}/{$batchId}");
            if (is_dir($batchStoragePath)) {
                try {
                    $removedDirs = $this->deleteBatchDirectory($batchStoragePath);
                    $totalRemovedDirectories += $removedDirs;
                } catch (\Exception $e) {
                    \Log::warning('Failed to delete batch directory', [
                        'batch_id' => $batchId,
                        'user_id' => $userId,
                        'path' => $batchStoragePath,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Clean up any individual job directories
            foreach ($batchJobs as $job) {
                $jobStoragePath = storage_path("app/private/downloads/{$userId}/{$job->id}");
                if (is_dir($jobStoragePath)) {
                    try {
                        $removedDirs = $this->deleteBatchDirectory($jobStoragePath);
                        $totalRemovedDirectories += $removedDirs;
                    } catch (\Exception $e) {
                        \Log::warning('Failed to delete job directory', [
                            'job_id' => $job->id,
                            'batch_id' => $batchId,
                            'user_id' => $userId,
                            'path' => $jobStoragePath,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Batch deleted successfully.',
                'data' => [
                    'removed_jobs' => $totalRemovedJobs,
                    'removed_results' => $totalRemovedResults,
                    'removed_media_assets' => $totalRemovedMediaAssets,
                    'removed_files' => $totalRemovedFiles,
                    'removed_directories' => $totalRemovedDirectories,
                    'missing_files' => $totalMissingFiles,
                    'unsafe_paths' => $totalUnsafePaths,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete batch: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete an entire directory recursively
     */
    private function deleteBatchDirectory(string $directoryPath): int
    {
        $removedDirs = 0;

        // Check if directory exists
        if (!is_dir($directoryPath)) {
            return $removedDirs;
        }

        // Ensure the path is within our allowed storage root
        $allowedRoot = storage_path('app/private/downloads');
        $realRoot = realpath($allowedRoot);
        $realDirPath = realpath($directoryPath);

        // Safety checks
        if ($realRoot === false || $realDirPath === false) {
            throw new \InvalidArgumentException('Invalid directory path');
        }

        // Make sure the directory is within our allowed root
        if (!str_starts_with($realDirPath, $realRoot . DIRECTORY_SEPARATOR)) {
            throw new \InvalidArgumentException('Directory path is outside allowed root');
        }

        // Recursively delete directory contents
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($directoryPath, \RecursiveDirectoryIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($iterator as $file) {
            if ($file->isDir()) {
                if (@rmdir($file->getPathname())) {
                    $removedDirs++;
                }
            } else {
                @unlink($file->getPathname());
            }
        }

        // Remove the directory itself
        if (@rmdir($directoryPath)) {
            $removedDirs++;
        }

        return $removedDirs;
    }

    public function bulkArchive(string $batchId, Request $request): BinaryFileResponse|JsonResponse
    {
        $status = $this->batchService->getStatus($batchId, auth()->id());
        if ($status === null) {
            return response()->json([
                'success' => false,
                'message' => 'Batch not found.',
                'data' => null,
            ], 404);
        }

        if (! $status['is_terminal']) {
            return response()->json([
                'success' => false,
                'message' => 'Batch is not terminal.',
                'data' => $status,
            ], 409);
        }

        if (! $status['can_download_zip']) {
            return response()->json([
                'success' => false,
                'message' => 'No downloadable media assets in batch.',
                'data' => $status,
            ], 404);
        }

        // Check if requesting a specific part or manifest
        $part = $request->query('part');
        $manifest = $request->query('manifest', false);

        if ($part !== null) {
            // Return specific part
            $partsResult = $this->batchService->createBulkZipParts($batchId, auth()->id());
            if ($partsResult === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create ZIP parts.',
                    'data' => $status,
                ], 500);
            }

            $partIndex = (int)$part - 1;
            if (!isset($partsResult['parts'][$partIndex])) {
                return response()->json([
                    'success' => false,
                    'message' => 'ZIP part not found.',
                    'data' => null,
                ], 404);
            }

            $partInfo = $partsResult['parts'][$partIndex];
            return response()->download($partInfo['path'], $partInfo['filename'])->deleteFileAfterSend(true);
        }

        if ($manifest) {
            // Return manifest file
            $partsResult = $this->batchService->createBulkZipParts($batchId, auth()->id());
            if ($partsResult === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create manifest.',
                    'data' => $status,
                ], 500);
            }

            return response()->download($partsResult['manifest']['path'], 'manifest.json')->deleteFileAfterSend(true);
        }

        // Return all parts as a single archive
        $partsResult = $this->batchService->createBulkZipParts($batchId, auth()->id());
        if ($partsResult === null) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create ZIP parts.',
                'data' => $status,
            ], 500);
        }

        // Create a master ZIP containing all parts and manifest
        $tempDir = storage_path('app/private/archives');
        $masterZipPath = $tempDir . DIRECTORY_SEPARATOR . "batch-{$batchId}-parts.zip";

        $zip = new \ZipArchive();
        if ($zip->open($masterZipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create master ZIP archive.',
                'data' => $status,
            ], 500);
        }

        // Add all parts to master ZIP
        foreach ($partsResult['parts'] as $partInfo) {
            $zip->addFile($partInfo['path'], $partInfo['filename']);
        }

        // Add manifest
        $zip->addFile($partsResult['manifest']['path'], 'manifest.json');

        $zip->close();

        $shortId = substr($batchId, 0, 8);
        $fileName = "nexapa-bulk-{$shortId}-parts.zip";
        return response()->download($masterZipPath, $fileName)->deleteFileAfterSend(true);
    }
}
