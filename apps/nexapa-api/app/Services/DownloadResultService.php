<?php

namespace App\Services;

use App\Enums\DownloadResultStatus;
use App\Models\DownloadJob;
use App\Models\DownloadResult;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DownloadResultService
{
    public function discoverResults(DownloadJob $job, array $results): array
    {
        return DB::transaction(function () use ($job, $results) {
            // Check if job is cancelled before creating results
            $job->refresh();
            if ($job->status === \App\Enums\DownloadJobStatus::Cancelled) {
                return []; // Return empty array if job is cancelled
            }

            $created = [];

            foreach ($results as $resultData) {
                $existing = DownloadResult::where('download_job_id', $job->id)
                    ->where(function ($q) use ($resultData) {
                        if (! empty($resultData['external_id'])) {
                            $q->where('external_id', $resultData['external_id']);
                        } else {
                            $q->where('source_url', $resultData['source_url'] ?? '');
                        }
                    })
                    ->first();

                if ($existing) {
                    continue;
                }

                $created[] = DownloadResult::create([
                    'download_job_id' => $job->id,
                    'external_id' => $resultData['external_id'] ?? null,
                    'title' => $resultData['title'] ?? null,
                    'source_url' => $resultData['source_url'],
                    'thumbnail_url' => $resultData['thumbnail_url'] ?? null,
                    'media_type' => $resultData['media_type'] ?? 'video',
                    'duration_seconds' => $resultData['duration_seconds'] ?? null,
                    'published_at' => $resultData['published_at'] ?? null,
                    'selected' => false,
                    'status' => DownloadResultStatus::Discovered,
                    'metadata' => $resultData['metadata'] ?? null,
                ]);
            }

            return $created;
        });
    }

    public function selectResults(DownloadJob $job, array $resultIds): void
    {
        DB::transaction(function () use ($job, $resultIds) {
            DownloadResult::where('download_job_id', $job->id)
                ->where('status', DownloadResultStatus::Discovered)
                ->update(['status' => DownloadResultStatus::Skipped, 'selected' => false]);

            DownloadResult::whereIn('id', $resultIds)
                ->where('download_job_id', $job->id)
                ->where('status', DownloadResultStatus::Skipped)
                ->update(['status' => DownloadResultStatus::Selected, 'selected' => true]);
        });
    }

    public function markSelectedAsQueued(DownloadJob $job): void
    {
        DownloadResult::where('download_job_id', $job->id)
            ->where('status', DownloadResultStatus::Selected)
            ->update(['status' => DownloadResultStatus::Queued]);
    }

    public function getSelectedResults(DownloadJob $job): \Illuminate\Database\Eloquent\Collection
    {
        return DownloadResult::where('download_job_id', $job->id)
            ->where('status', DownloadResultStatus::Selected)
            ->get();
    }

    /**
     * Select any number of profile results and create child jobs safely.
     *
     * Passing null as $resultIds selects every selectable result without
     * transferring every ID through the HTTP request or loading them all
     * into one PHP array.
     */
    public function selectAndCreateChildJobs(
        DownloadJob $parentJob,
        ?array $resultIds
    ): array {
        $selectAll = $resultIds === null;

        $normalizedIds = [];

        if (! $selectAll) {
            $normalizedIds = array_values(array_unique(array_filter(
                array_map(
                    static fn ($id): string => is_scalar($id)
                        ? trim((string) $id)
                        : '',
                    $resultIds
                ),
                static fn (string $id): bool => $id !== ''
            )));

            if ($normalizedIds === []) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'result_ids' => ['No valid results were selected.'],
                ]);
            }
        }

        return DB::transaction(function () use (
            $parentJob,
            $selectAll,
            $normalizedIds
        ) {
            $parentJob = DownloadJob::query()
                ->whereKey($parentJob->id)
                ->lockForUpdate()
                ->firstOrFail();

            /*
             * For explicit selections, verify every supplied ID belongs to
             * this parent. The checks are chunked, so there is no giant IN().
             */
            if (! $selectAll) {
                $matchedCount = 0;

                foreach (array_chunk($normalizedIds, 500) as $idChunk) {
                    $matchedCount += DownloadResult::query()
                        ->where('download_job_id', $parentJob->id)
                        ->whereIn('id', $idChunk)
                        ->count();
                }

                if ($matchedCount !== count($normalizedIds)) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'result_ids' => [
                            'One or more selected results do not belong to this profile job.',
                        ],
                    ]);
                }
            }

            /*
             * Normalize only selectable states. Queued, processed and failed
             * results are not silently reset.
             */
            DownloadResult::query()
                ->where('download_job_id', $parentJob->id)
                ->whereIn('status', [
                    DownloadResultStatus::Discovered,
                    DownloadResultStatus::Selected,
                    DownloadResultStatus::Skipped,
                ])
                ->update([
                    'status' => DownloadResultStatus::Skipped,
                    'selected' => false,
                ]);

            if ($selectAll) {
                DownloadResult::query()
                    ->where('download_job_id', $parentJob->id)
                    ->where('status', DownloadResultStatus::Skipped)
                    ->update([
                        'status' => DownloadResultStatus::Selected,
                        'selected' => true,
                    ]);
            } else {
                foreach (array_chunk($normalizedIds, 500) as $idChunk) {
                    DownloadResult::query()
                        ->where('download_job_id', $parentJob->id)
                        ->whereIn('id', $idChunk)
                        ->where('status', DownloadResultStatus::Skipped)
                        ->update([
                            'status' => DownloadResultStatus::Selected,
                            'selected' => true,
                        ]);
                }
            }

            $selectedQuery = DownloadResult::query()
                ->where('download_job_id', $parentJob->id)
                ->where('status', DownloadResultStatus::Selected);

            $totalJobs = (clone $selectedQuery)->count();

            if ($totalJobs < 1) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'result_ids' => ['No selectable results were found.'],
                ]);
            }

            if (! $selectAll && $totalJobs !== count($normalizedIds)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'result_ids' => [
                        'One or more results are no longer selectable.',
                    ],
                ]);
            }

            /*
             * Reuse a previous compatible batch when present. New jobs use
             * one stable batch ID for this operation.
             */
            $existingBatchId = DownloadJob::query()
                ->where('parent_download_job_id', $parentJob->id)
                ->whereNotNull('batch_id')
                ->where('output_format', $parentJob->output_format)
                ->where('quality', $parentJob->quality)
                ->where('filename_mode', $parentJob->filename_mode)
                ->value('batch_id');

            $batchId = $existingBatchId
                ?? (string) \Illuminate\Support\Str::orderedUuid();

            $createdJobs = 0;
            $existingJobs = 0;

            /*
             * Read and create children in bounded chunks. Memory usage remains
             * stable even when the profile contains thousands of results.
             */
            $selectedQuery->chunkById(
                200,
                function ($results) use (
                    $parentJob,
                    $batchId,
                    &$createdJobs,
                    &$existingJobs
                ): void {
                    $chunkIds = $results->pluck('id')->all();

                    $existingByResult = DownloadJob::query()
                        ->where('parent_download_job_id', $parentJob->id)
                        ->whereIn('download_result_id', $chunkIds)
                        ->where('output_format', $parentJob->output_format)
                        ->where('quality', $parentJob->quality)
                        ->where('filename_mode', $parentJob->filename_mode)
                        ->lockForUpdate()
                        ->get()
                        ->keyBy('download_result_id');

                    foreach ($results as $result) {
                        $childJob = $existingByResult->get($result->id);

                        if ($childJob === null) {
                            $childJob = DownloadJob::create([
                                'user_id' => $parentJob->user_id,
                                'mode' => \App\Enums\DownloadMode::Single,
                                'original_input' => $result->source_url,
                                'normalized_url' => $result->source_url,
                                'platform' => $parentJob->platform,
                                'source_type' => \App\Enums\SourceType::Video,
                                'output_format' => $parentJob->output_format,
                                'quality' => $parentJob->quality,
                                'filename_mode' => $parentJob->filename_mode,
                                'delay_seconds' => $parentJob->delay_seconds,
                                'status' => \App\Enums\DownloadJobStatus::Queued,
                                'max_retries' => $parentJob->max_retries,
                                'batch_id' => $batchId,
                                'parent_download_job_id' => $parentJob->id,
                                'download_result_id' => $result->id,
                                'is_batch_work_item' => true,
                                'metadata' => [
                                    'parent_job_id' => $parentJob->id,
                                    'profile_result_id' => $result->id,
                                    'bulk_download_mode' => true,
                                ],
                            ]);

                            $createdJobs++;
                        } else {
                            $updates = [];

                            if (! $childJob->is_batch_work_item) {
                                $updates['is_batch_work_item'] = true;
                            }

                            if (empty($childJob->batch_id)) {
                                $updates['batch_id'] = $batchId;
                            }

                            if ($updates !== []) {
                                $childJob->update($updates);
                            }

                            $existingJobs++;
                        }

                        $resultMetadata = is_array($result->metadata)
                            ? $result->metadata
                            : [];

                        $result->update([
                            'metadata' => array_merge($resultMetadata, [
                                'child_job_id' => $childJob->id,
                                'bulk_download_batch_id' => $childJob->batch_id
                                    ?: $batchId,
                            ]),
                        ]);
                    }
                },
                'id'
            );

            return [
                'batch_id' => $batchId,
                'total' => $totalJobs,
                'created' => $createdJobs,
                'existing' => $existingJobs,
            ];
        }, 3);
    }

    /**
     * Create bulk child jobs for fast download mode
     *
     * @param DownloadJob $parentJob
     * @param string $selectionType
     * @param bool $retryFailed
     * @return array
     */
    /**
     * Divide unlimited Brutal Download results into bounded
     * archive groups.
     *
     * The overall download count remains unlimited. Only each
     * batch_id is limited to the supplied chunk size.
     *
     * @return array<int, string>
     */
    public function rebatchChildJobs(
        \App\Models\DownloadJob $parentJob,
        int $chunkSize = 50
    ): array {
        if ($chunkSize < 1) {
            throw new \InvalidArgumentException(
                'Chunk size must be at least one.'
            );
        }

        return \Illuminate\Support\Facades\DB::transaction(
            function () use (
                $parentJob,
                $chunkSize
            ): array {
                $children = \App\Models\DownloadJob::query()
                    ->where(
                        'parent_download_job_id',
                        $parentJob->id
                    )
                    ->whereNotNull(
                        'download_result_id'
                    )
                    ->orderBy('created_at')
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get();

                if ($children->isEmpty()) {
                    return [];
                }

                $batchIds = [];
                $usedBatchIds = [];

                foreach (
                    $children
                        ->chunk($chunkSize)
                        ->values()
                    as $chunk
                ) {
                    $existingBatchId = trim(
                        (string) (
                            $chunk
                                ->first()
                                ->batch_id
                            ?? ''
                        )
                    );

                    if (
                        $existingBatchId !== ''
                        && ! isset(
                            $usedBatchIds[
                                $existingBatchId
                            ]
                        )
                    ) {
                        $batchId = $existingBatchId;
                    } else {
                        $batchId = (string)
                            \Illuminate\Support\Str
                                ::orderedUuid();
                    }

                    $usedBatchIds[$batchId] = true;
                    $batchIds[] = $batchId;

                    \App\Models\DownloadJob::query()
                        ->whereIn(
                            'id',
                            $chunk
                                ->pluck('id')
                                ->values()
                                ->all()
                        )
                        ->update([
                            'batch_id' => $batchId,
                        ]);
                }

                return $batchIds;
            },
            3
        );
    }


    public function createBulkChildJobs(DownloadJob $parentJob, string $selectionType = 'all', bool $retryFailed = false): array
    {
        // Start a database transaction
        return DB::transaction(function () use ($parentJob, $selectionType, $retryFailed) {
            $query = DownloadResult::where('download_job_id', $parentJob->id);

            // Filter based on selection type
            switch ($selectionType) {
                case 'selected':
                    $query->where('selected', true);
                    break;
                case 'completed':
                    $query->where('status', \App\Enums\DownloadResultStatus::Processed);
                    break;
                case 'failed':
                    $query->where('status', \App\Enums\DownloadResultStatus::Failed);
                    break;
                case 'all':
                default:
                    // Include all discovered results
                    $query->where('status', \App\Enums\DownloadResultStatus::Discovered);
                    break;
            }

            $results = $query->get();
            $childJobs = [];
            $batchUuid = (string) \Illuminate\Support\Str::orderedUuid();

            // Chunk processing to avoid memory issues
            $chunks = $results->chunk(100);

            foreach ($chunks as $chunk) {
                foreach ($chunk as $result) {
                    // Skip if already has a child job and we're not retrying failed
                    $existingMetadata = $result->metadata ?? [];
                    if (!$retryFailed && isset($existingMetadata['child_job_id'])) {
                        continue;
                    }

                    // Create a new download job for each result
                    $childJob = DownloadJob::create([
                        'user_id' => $parentJob->user_id,
                        'mode' => \App\Enums\DownloadMode::Single,
                        'original_input' => $result->source_url,
                        'normalized_url' => $result->source_url,
                        'platform' => $parentJob->platform,
                        'source_type' => \App\Enums\SourceType::Video,
                        'output_format' => $parentJob->output_format,
                        'quality' => $parentJob->quality,
                        'filename_mode' => $parentJob->filename_mode,
                        'delay_seconds' => $parentJob->delay_seconds,
                        'status' => \App\Enums\DownloadJobStatus::Queued,
                        'max_retries' => $parentJob->max_retries,
                        'batch_id' => $batchUuid, // Assign new batch ID for this bulk operation
                        'metadata' => [
                            'parent_job_id' => $parentJob->id,
                            'profile_result_id' => $result->id,
                            'bulk_download_mode' => true,
                        ],
                    ]);

                    // Update result metadata with child job reference
                    $updatedMetadata = array_merge($existingMetadata, [
                        'child_job_id' => $childJob->id,
                        'bulk_download_batch_id' => $batchUuid,
                    ]);

                    $result->metadata = $updatedMetadata;
                    $result->save();

                    $childJobs[] = $childJob;
                }
            }

            return [
                'child_jobs' => $childJobs,
                'batch_id' => $batchUuid,
                'count' => count($childJobs),
            ];
        });
    }
}
