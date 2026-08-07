<?php

namespace App\Services;

use App\Enums\DownloadJobStatus;
use App\Models\DownloadJob;
use App\Models\MediaAsset;
use Illuminate\Support\Facades\Storage;
use ZipArchive;
use RuntimeException;

class DownloadBatchService
{
    /**
     * Get batch status summary.
     * Returns null when batch does not exist or user doesn't own it.
     */
    public function getStatus(string $batchId, ?string $userId = null): ?array
    {
        $query = DownloadJob::where('batch_id', $batchId);

        // If userId is provided, filter by user ownership
        if ($userId !== null) {
            $query->where('user_id', $userId);
        }

        $jobs = $query
            ->with(['mediaAssets:id,download_job_id,storage_disk,storage_path,file_size'])
            ->get();
        if ($jobs->isEmpty()) {
            return null;
        }

        // Filter jobs to only include batch work items
        $filteredJobs = $jobs->filter(function (DownloadJob $job) {
            return $job->isBatchWorkItem();
        });

        // Log filtered jobs for debugging
        \Log::info('DownloadBatchService jobs after filtering:', $filteredJobs->map(function ($job) {
            return [
                'id' => $job->id,
                'status' => $job->status,
                'parent_download_job_id' => $job->parent_download_job_id,
            ];
        })->toArray());

        // Calculate job counts
        $total = $filteredJobs->count();
        $queuedCount = $filteredJobs->where('status', DownloadJobStatus::Queued)->count();
        $claimedCount = $filteredJobs->where('status', DownloadJobStatus::Claimed)->count();
        $processingCount = $filteredJobs->where('status', DownloadJobStatus::Processing)->count();
        $completedCount = $filteredJobs->whereIn('status', [
            DownloadJobStatus::Completed,
            DownloadJobStatus::PartiallyCompleted,
        ])->count();
        $skippedCount = $filteredJobs->where('status', DownloadJobStatus::Skipped)->count();
        $failedCount = $filteredJobs->where('status', DownloadJobStatus::Failed)->count();
        $cancelledCount = $filteredJobs->where('status', DownloadJobStatus::Cancelled)->count();

        // Terminal jobs (all completed/skipped/failed/cancelled)
        $terminalCount = $filteredJobs->filter(
            static fn (DownloadJob $job): bool => $job->status->isTerminal()
                || $job->status === DownloadJobStatus::PartiallyCompleted
        )->count();

        // Active jobs (queued, claimed, processing)
        $activeCount = $queuedCount + $claimedCount + $processingCount;

        // Processed jobs (completed + skipped + failed + cancelled)
        $processedCount = $completedCount + $skippedCount + $failedCount + $cancelledCount;
        $remainingCount = $total - $processedCount;
        $progressPercentage = $total > 0 ? ($processedCount / $total) * 100 : 0;

        $jobAvailability = $filteredJobs
            ->values()
            ->map(static function (DownloadJob $job): array {
                $downloadableFilesCount = $job->downloadableMediaAssets()->count();

                return [
                    'id' => $job->id,
                    'status' => $job->status->value,
                    'has_downloadable_file' => $downloadableFilesCount > 0,
                ];
            });
        $availableFiles = $filteredJobs
            ->sum(static fn (DownloadJob $job): int => $job->downloadableMediaAssets()->count());

        $isTerminal = $activeCount === 0 && $terminalCount === $total;
        $canDownloadZip = $availableFiles > 0 && $isTerminal;

        return [
            // Batch info
            'batch_id' => $batchId,

            // Total job counts (new and alias fields)
            'total' => $total,
            'total_jobs' => $total,

            // Queued job counts (new and alias fields)
            'queued' => $queuedCount,
            'queued_jobs' => $queuedCount,

            // Claimed job counts
            'claimed' => $claimedCount,

            // Processing job counts (new and alias fields)
            'processing' => $processingCount,
            'processing_jobs' => $processingCount,

            // Completed job counts (new and alias fields)
            'completed' => $completedCount,
            'completed_jobs' => $completedCount,

            // Skipped job counts (new and alias fields)
            'skipped' => $skippedCount,
            'skipped_jobs' => $skippedCount,

            // Failed job counts (new and alias fields)
            'failed' => $failedCount,
            'failed_jobs' => $failedCount,

            // Cancelled job counts (new and alias fields)
            'cancelled' => $cancelledCount,
            'cancelled_jobs' => $cancelledCount,

            // Active jobs (jobs still being processed)
            'active' => $activeCount,

            // Terminal jobs (all finished jobs)
            'terminal' => $terminalCount,
            'terminal_jobs' => $terminalCount,

            // Processed and remaining jobs
            'processed' => $processedCount,
            'remaining' => $remainingCount,

            // Progress percentage (new and alias fields)
            'progress' => $progressPercentage,
            'progress_percentage' => $progressPercentage,

            // File availability info
            'downloadable_files_count' => $availableFiles,
            'has_downloadable_files' => $availableFiles > 0,
            'jobs' => $jobAvailability->all(),

            // Status flags
            'is_terminal' => $isTerminal,
            'can_download_zip' => $canDownloadZip,
        ];
    }

    /**
     * Create a ZIP archive for a terminal batch.
     * Returns ['path' => string, 'files_added' => int] or null on error.
     */
    public function createZip(string $batchId, int|string|null $userId = null): ?array
    {
        $status = $this->getStatus($batchId, $userId === null ? null : (string) $userId);
        if ($status === null || ! $status['is_terminal']) {
            return null;
        }

        if (! $status['can_download_zip']) {
            return null;
        }

        $jobs = DownloadJob::where('batch_id', $batchId)
            ->when($userId !== null, fn ($query) => $query->where('user_id', $userId))
            ->orderBy('created_at')
            ->get()
            ->keyBy(fn (DownloadJob $job): string => (string) $job->id);

        // We won't preload assets anymore since we need to handle both legacy and temporary outputs
        // $assetsByJob = MediaAsset::whereIn('download_job_id', $jobs->keys())
        //     ->where('status', 'available')
        //     ->orderBy('created_at')
        //     ->get()
        //     ->groupBy(fn (MediaAsset $asset): string => (string) $asset->download_job_id);

        $tempDir = storage_path('app/private/archives');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $shortId = substr($batchId, 0, 8);
        $zipPath = $tempDir
            . DIRECTORY_SEPARATOR
            . "nexapa-multiple-{$shortId}-"
            . uniqid()
            . '.zip';

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return null;
        }

        $sanitizeName = static function (string $rawName, string $fallback): string {
            $rawName = basename(str_replace('\\', '/', $rawName));
            $rawName = preg_replace('/[\x00-\x1F\x7F]/u', '', $rawName) ?? '';
            $rawName = preg_replace('/[^A-Za-z0-9 \-_\.]/u', '_', $rawName) ?? '';

            return trim($rawName) !== '' ? $rawName : $fallback;
        };

        $makeUniqueName = static function (string $rawName, array &$usedNames): string {
            $candidate = $rawName;
            $index = 2;

            while (in_array(strtolower($candidate), $usedNames, true)) {
                $base = pathinfo($rawName, PATHINFO_FILENAME);
                $extension = pathinfo($rawName, PATHINFO_EXTENSION);

                $candidate = $base
                    . " ({$index})"
                    . ($extension !== '' ? ".{$extension}" : '');

                $index++;
            }

            $usedNames[] = strtolower($candidate);

            return $candidate;
        };

        $outerUsedNames = [];
        $temporaryNestedZips = [];
        $filesAdded = 0;
        $temporaryService = new \App\Services\TemporaryDownloadOutputService();

        foreach ($jobs as $job) {
            $resolvedItems = [];

            // Check for temporary outputs first
            $temporaryOutputs = $job->metadata['temporary_outputs'] ?? [];
            if (is_array($temporaryOutputs) && !empty($temporaryOutputs)) {
                // Use temporary outputs
                foreach ($temporaryOutputs as $output) {
                    $realFile = $temporaryService->resolveOutputFile($output);
                    if ($realFile === null) {
                        continue;
                    }

                    $resolvedItems[] = [
                        'type' => 'temporary',
                        'data' => $output,
                        'path' => $realFile,
                    ];
                }
            } else {
                // Legacy fallback: use media assets
                $assets = MediaAsset::where('download_job_id', $job->id)
                    ->orderBy('created_at')
                    ->get();

                foreach ($assets as $asset) {
                    $realFile = $this->resolveAssetFile($asset);
                    if ($realFile === null) {
                        continue;
                    }

                    $resolvedItems[] = [
                        'type' => 'legacy',
                        'data' => $asset,
                        'path' => $realFile,
                    ];
                }
            }

            if ($resolvedItems === []) {
                continue;
            }

            /*
             * A job with one asset is written directly into the main ZIP.
             */
            if (count($resolvedItems) === 1) {
                $item = $resolvedItems[0];
                $realFile = $item['path'];

                if ($item['type'] === 'temporary') {
                    /** @var array $output */
                    $output = $item['data'];
                    $itemId = "temp-" . md5($realFile); // Generate ID for temporary items

                    $extension = pathinfo($realFile, PATHINFO_EXTENSION);
                    $fallback = 'media-'
                        . substr($itemId, 0, 8)
                        . ($extension !== '' ? ".{$extension}" : '');

                    $rawName = $output['original_name']
                        ?? $output['display_name']
                        ?? pathinfo($realFile, PATHINFO_BASENAME);
                } else {
                    /** @var MediaAsset $asset */
                    $asset = $item['data'];
                    $itemId = (string) $asset->id;

                    $extension = pathinfo($realFile, PATHINFO_EXTENSION);
                    $fallback = 'media-'
                        . substr($itemId, 0, 8)
                        . ($extension !== '' ? ".{$extension}" : '');

                    $rawName = $asset->original_name
                        ?: $asset->display_name
                        ?: pathinfo($realFile, PATHINFO_BASENAME);
                }

                $entryName = $makeUniqueName(
                    $sanitizeName((string) $rawName, $fallback),
                    $outerUsedNames,
                );

                if ($zip->addFile($realFile, $entryName)) {
                    $filesAdded++;
                }

                continue;
            }

            /*
             * A job with multiple assets is packaged as one nested ZIP.
             * Example: photo_7651562557597158676.zip
             */
            $nestedPath = $tempDir
                . DIRECTORY_SEPARATOR
                . 'nested-'
                . substr((string) $job->id, 0, 8)
                . '-'
                . uniqid()
                . '.zip';

            $nestedZip = new ZipArchive();
            if (
                $nestedZip->open(
                    $nestedPath,
                    ZipArchive::CREATE | ZipArchive::OVERWRITE
                ) !== true
            ) {
                continue;
            }

            $nestedUsedNames = [];
            $typeCounters = [
                'image' => 0,
                'gif' => 0,
                'audio' => 0,
                'video' => 0,
                'media' => 0,
            ];
            $nestedFilesAdded = 0;

            foreach ($resolvedItems as $item) {
                $realFile = $item['path'];

                if ($item['type'] === 'temporary') {
                    /** @var array $output */
                    $output = $item['data'];
                    $itemId = "temp-" . md5($realFile); // Generate ID for temporary items

                    $extension = strtolower(pathinfo($realFile, PATHINFO_EXTENSION));
                    $mediaType = strtolower((string) ($output['media_type'] ?? 'media'));
                } else {
                    /** @var MediaAsset $asset */
                    $asset = $item['data'];
                    $itemId = (string) $asset->id;

                    $extension = strtolower(pathinfo($realFile, PATHINFO_EXTENSION));
                    $mediaType = strtolower((string) ($asset->media_type ?? 'media'));
                }

                if ($mediaType === 'image' || $mediaType === 'gif') {
                    $nestedUsedType = $mediaType;
                    $nestedUsedBase = 'photo';
                } elseif ($mediaType === 'audio') {
                    $nestedUsedType = 'audio';
                    $nestedUsedBase = 'audio';
                } elseif ($mediaType === 'video') {
                    $nestedUsedType = 'video';
                    $nestedUsedBase = 'video';
                } else {
                    $nestedUsedType = 'media';
                    $nestedUsedBase = 'media';
                }

                $typeCounters[$nestedUsedType]++;

                if (
                    $nestedUsedType === 'audio'
                    && $typeCounters[$nestedUsedType] === 1
                ) {
                    $rawNestedName = 'audio'
                        . ($extension !== '' ? ".{$extension}" : '');
                } else {
                    $rawNestedName = $nestedUsedBase
                        . '_'
                        . $typeCounters[$nestedUsedType]
                        . ($extension !== '' ? ".{$extension}" : '');
                }

                $nestedEntryName = $makeUniqueName(
                    $sanitizeName(
                        $rawNestedName,
                        'media-' . substr($itemId, 0, 8)
                    ),
                    $nestedUsedNames,
                );

                if ($nestedZip->addFile($realFile, $nestedEntryName)) {
                    $nestedFilesAdded++;
                }
            }

            $nestedZip->close();

            if ($nestedFilesAdded === 0 || ! is_file($nestedPath)) {
                @unlink($nestedPath);
                continue;
            }

            $sourceUrl = (string) (
                $job->original_input
                ?: $job->normalized_url
                ?: ''
            );

            $postId = null;
            if (
                preg_match(
                    '~/(?:photo|video)/([0-9]+)~',
                    $sourceUrl,
                    $matches
                ) === 1
            ) {
                $postId = $matches[1];
            }

            $nestedRawName = $postId !== null
                ? "photo_{$postId}.zip"
                : 'media_' . substr((string) $job->id, 0, 8) . '.zip';

            $nestedEntryName = $makeUniqueName(
                $sanitizeName(
                    $nestedRawName,
                    'media_' . substr((string) $job->id, 0, 8) . '.zip'
                ),
                $outerUsedNames,
            );

            if ($zip->addFile($nestedPath, $nestedEntryName)) {
                $temporaryNestedZips[] = $nestedPath;
                $filesAdded += $nestedFilesAdded;
            } else {
                @unlink($nestedPath);
            }
        }

        $zip->close();

        foreach ($temporaryNestedZips as $temporaryNestedZip) {
            @unlink($temporaryNestedZip);
        }

        if ($filesAdded === 0 || ! is_file($zipPath)) {
            @unlink($zipPath);

            return null;
        }

        return [
            'path' => $zipPath,
            'files_added' => $filesAdded,
        ];
    }

    /**
     * Safely resolve a MediaAsset to an absolute file path.
     * Returns null if the asset is unsafe or the file does not exist.
     */
    public function resolveAssetFileForZip(MediaAsset $asset): ?string
    {
        return $this->resolveAssetFile($asset);
    }

    private function resolveAssetFile(MediaAsset $asset): ?string
    {
        $allowed = config('nexapa.allowed_storage_disks', ['local', 'public']);
        $disk = $asset->storage_disk;
        if (! in_array($disk, $allowed, true)) {
            return null;
        }
        $path = $asset->storage_path;
        if ((int) $asset->file_size <= 0
            || ! is_string($path) || $path === '' || str_contains($path, "\0")) {
            return null;
        }

        // Normalize both Unix and Windows separators before validation.
        $normalizedPath = str_replace('\\', '/', $path);

        // Reject Unix absolute paths, UNC paths, and Windows drive paths.
        if (
            str_starts_with($normalizedPath, '/')
            || preg_match('/^[A-Za-z]:/', $normalizedPath) === 1
        ) {
            return null;
        }

        // Reject traversal and current-directory segments.
        $segments = explode('/', $normalizedPath);
        if (
            in_array('.', $segments, true)
            || in_array('..', $segments, true)
        ) {
            return null;
        }

        $diskStorage = Storage::disk($disk);
        $candidatePaths = [$normalizedPath];
        $diskRoot = str_replace('\\', '/', (string) config("filesystems.disks.{$disk}.root"));

        if ($disk === 'local'
            && str_ends_with(rtrim($diskRoot, '/'), '/private')
            && str_starts_with($normalizedPath, 'private/')) {
            $candidatePaths[] = substr($normalizedPath, strlen('private/'));
        }

        foreach ($candidatePaths as $candidatePath) {
            if ($diskStorage->exists($candidatePath)) {
                return $diskStorage->path($candidatePath);
            }
        }

        return null;
    }

    /**
     * Create bulk ZIP parts for fast download mode.
     * Returns array with parts and manifest information or null on error.
     */
    public function createBulkZipParts(string $batchId, int|string|null $userId = null): ?array
    {
        $status = $this->getStatus($batchId, $userId === null ? null : (string) $userId);
        if ($status === null || ! $status['is_terminal']) {
            return null;
        }

        if (! $status['can_download_zip']) {
            return null;
        }

        $jobs = DownloadJob::where('batch_id', $batchId)
            ->when($userId !== null, fn ($query) => $query->where('user_id', $userId))
            ->orderBy('created_at')
            ->get()
            ->keyBy(fn (DownloadJob $job): string => (string) $job->id);

        $tempDir = storage_path('app/private/archives');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $sanitizeName = static function (string $rawName, string $fallback): string {
            $rawName = basename(str_replace('\\', '/', $rawName));
            $rawName = preg_replace('/[\x00-\x1F\x7F]/u', '', $rawName) ?? '';
            $rawName = preg_replace('/[^A-Za-z0-9 \-_\.]/u', '_', $rawName) ?? '';

            return trim($rawName) !== '' ? $rawName : $fallback;
        };

        $makeUniqueName = static function (string $rawName, array &$usedNames): string {
            $candidate = $rawName;
            $index = 2;

            while (in_array(strtolower($candidate), $usedNames, true)) {
                $base = pathinfo($rawName, PATHINFO_FILENAME);
                $extension = pathinfo($rawName, PATHINFO_EXTENSION);

                $candidate = $base
                    . " ({$index})"
                    . ($extension !== '' ? ".{$extension}" : '');

                $index++;
            }

            $usedNames[] = strtolower($candidate);

            return $candidate;
        };

        // Create parts - each part will contain up to 100 files
        $parts = [];
        $partSizeLimit = 100; // Number of files per part
        $currentPartFiles = [];
        $partIndex = 1;
        $outerUsedNames = [];
        $temporaryService = new \App\Services\TemporaryDownloadOutputService();

        foreach ($jobs as $job) {
            $resolvedItems = [];

            // Check for temporary outputs first
            $temporaryOutputs = $job->metadata['temporary_outputs'] ?? [];
            if (is_array($temporaryOutputs) && !empty($temporaryOutputs)) {
                // Use temporary outputs
                foreach ($temporaryOutputs as $output) {
                    $realFile = $temporaryService->resolveOutputFile($output);
                    if ($realFile === null) {
                        continue;
                    }

                    $resolvedItems[] = [
                        'type' => 'temporary',
                        'data' => $output,
                        'path' => $realFile,
                    ];
                }
            } else {
                // Legacy fallback: use media assets
                $assets = MediaAsset::where('download_job_id', $job->id)
                    ->orderBy('created_at')
                    ->get();

                foreach ($assets as $asset) {
                    $realFile = $this->resolveAssetFile($asset);
                    if ($realFile === null) {
                        continue;
                    }

                    $resolvedItems[] = [
                        'type' => 'legacy',
                        'data' => $asset,
                        'path' => $realFile,
                    ];
                }
            }

            if ($resolvedItems === []) {
                continue;
            }

            // Add items to current part
            foreach ($resolvedItems as $item) {
                $currentPartFiles[] = $item;

                // If we've reached the part size limit, create the part
                if (count($currentPartFiles) >= $partSizeLimit) {
                    $partResult = $this->createZipPart($currentPartFiles, $partIndex, $tempDir, $sanitizeName, $makeUniqueName, $outerUsedNames);
                    if ($partResult !== null) {
                        $parts[] = $partResult;
                    }

                    // Reset for next part
                    $currentPartFiles = [];
                    $partIndex++;
                    $outerUsedNames = []; // Reset names for each part
                }
            }
        }

        // Create final part with remaining files
        if (!empty($currentPartFiles)) {
            $partResult = $this->createZipPart($currentPartFiles, $partIndex, $tempDir, $sanitizeName, $makeUniqueName, $outerUsedNames);
            if ($partResult !== null) {
                $parts[] = $partResult;
            }
        }

        if (empty($parts)) {
            return null;
        }

        // Create manifest file
        $manifestData = [
            'batch_id' => $batchId,
            'total_parts' => count($parts),
            'parts' => array_map(function ($part) {
                return [
                    'filename' => $part['filename'],
                    'files_count' => $part['files_count'],
                ];
            }, $parts)
        ];

        $manifestPath = $tempDir . DIRECTORY_SEPARATOR . "batch-{$batchId}-manifest.json";
        file_put_contents($manifestPath, json_encode($manifestData, JSON_PRETTY_PRINT));

        return [
            'parts' => $parts,
            'manifest' => [
                'path' => $manifestPath,
                'filename' => 'manifest.json'
            ]
        ];
    }

    /**
     * Create a single ZIP part from a collection of files.
     */
    private function createZipPart(array $files, int $partIndex, string $tempDir, callable $sanitizeName, callable $makeUniqueName, array &$outerUsedNames): ?array
    {
        $partZipPath = $tempDir . DIRECTORY_SEPARATOR . "batch-part-{$partIndex}.zip";
        $zip = new ZipArchive();

        if ($zip->open($partZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return null;
        }

        $filesAdded = 0;
        $temporaryService = new \App\Services\TemporaryDownloadOutputService();

        foreach ($files as $item) {
            $realFile = $item['path'];

            if ($item['type'] === 'temporary') {
                /** @var array $output */
                $output = $item['data'];
                $itemId = "temp-" . md5($realFile); // Generate ID for temporary items

                $extension = pathinfo($realFile, PATHINFO_EXTENSION);
                $fallback = 'media-'
                    . substr($itemId, 0, 8)
                    . ($extension !== '' ? ".{$extension}" : '');

                $rawName = $output['original_name']
                    ?? $output['display_name']
                    ?? pathinfo($realFile, PATHINFO_BASENAME);
            } else {
                /** @var MediaAsset $asset */
                $asset = $item['data'];
                $itemId = (string) $asset->id;

                $extension = pathinfo($realFile, PATHINFO_EXTENSION);
                $fallback = 'media-'
                    . substr($itemId, 0, 8)
                    . ($extension !== '' ? ".{$extension}" : '');

                $rawName = $asset->original_name
                    ?: $asset->display_name
                    ?: pathinfo($realFile, PATHINFO_BASENAME);
            }

            $entryName = $makeUniqueName(
                $sanitizeName((string) $rawName, $fallback),
                $outerUsedNames,
            );

            if ($zip->addFile($realFile, $entryName)) {
                $filesAdded++;
            }
        }

        $zip->close();

        if ($filesAdded === 0 || ! is_file($partZipPath)) {
            @unlink($partZipPath);
            return null;
        }

        return [
            'path' => $partZipPath,
            'filename' => "part-{$partIndex}.zip",
            'files_count' => $filesAdded
        ];
    }
}
