<?php

namespace App\Http\Controllers\Api\Worker;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadResultStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Worker\CompleteJobRequest;
use App\Http\Requests\Worker\FailJobRequest;
use App\Http\Resources\DownloadJobResource;
use App\Models\DownloadJob;
use App\Models\DownloadResult;
use App\Models\MediaAsset;
use App\Services\ActivityLogService;
use App\Services\DownloadJobService;
use App\Services\DownloadResultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class WorkerCompletionController extends Controller
{
    public function __construct(
        private readonly DownloadJobService $jobService,
        private readonly DownloadResultService $resultService,
        private readonly ActivityLogService $activityLog,
    ) {}

    public function complete(DownloadJob $downloadJob, CompleteJobRequest $request): JsonResponse
    {
        // Ensure we're working within a transaction for consistency
        return DB::transaction(function () use ($downloadJob, $request) {
            \Log::info("Starting completion for job: " . $downloadJob->id);

            $validated = $request->validated();

            // Lock the job row to prevent race conditions and ensure we have the latest data
            $downloadJob = DownloadJob::with(['parentDownloadJob', 'downloadResult'])->where('id', $downloadJob->id)->lockForUpdate()->firstOrFail();

            // Reload relationships to make sure they're still valid
            $downloadJob->load(['parentDownloadJob', 'downloadResult']);

            // Validate worker ownership if applicable
            // Note: We're not enforcing worker ownership as per existing contract

            // Validate job parent and download result still exist
            // For media download children, parent job and download result must exist
            if ($downloadJob->isMediaDownloadChild()) {
                if (!$downloadJob->parentDownloadJob || !$downloadJob->downloadResult) {
                    \Log::error("Parent job or download result missing", [
                        'job_id' => $downloadJob->id,
                        'parent_job_id' => $downloadJob->parent_download_job_id,
                        'download_result_id' => $downloadJob->download_result_id,
                        'parent_job_loaded' => $downloadJob->parentDownloadJob ? 'loaded' : null,
                        'download_result_loaded' => $downloadJob->downloadResult ? 'loaded' : null,
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Parent job or download result missing for media download child job.',
                    ], 400);
                }
            }

            // Track whether assets were created or already existed
            $assetsCreated = 0;
            $assetsExisting = 0;
            $mediaAssetIds = [];

            // Handle idempotency - check if MediaAsset already exists for this job
            $existingAsset = MediaAsset::where('download_job_id', $downloadJob->id)->first();

            if ($existingAsset) {
                // Asset already exists, use it for idempotency
                $assetsExisting = count($validated['temporary_outputs']);
                $mediaAssetIds[] = $existingAsset->id;

                // For idempotency, we still validate ALL outputs match and exist
                foreach ($validated['temporary_outputs'] as $output) {
                    // Validate file exists and is not zero-byte
                    $fullPath = storage_path('app/' . $output['storage_path']);
                    if (!file_exists($fullPath) || filesize($fullPath) <= 0) {
                        return response()->json([
                            'success' => false,
                            'message' => 'File does not exist or is empty.',
                        ], 400);
                    }

                    // Validate file path
                    try {
                        $this->validateFilePath($output['storage_path'], $downloadJob);
                    } catch (\Exception $e) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Path validation error: ' . $e->getMessage(),
                        ], 400);
                    }
                }

                // TODO: In a stricter implementation, we would compare the existing asset with the provided data
                // For now, we'll just accept the idempotent call
            } else {
                // Validate all temporary outputs before creating any MediaAssets
                if (empty($validated['temporary_outputs'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No temporary outputs provided.',
                    ], 400);
                }

                // Validate each output before proceeding
                foreach ($validated['temporary_outputs'] as $output) {
                    // Validate file exists and is not zero-byte
                    $fullPath = storage_path('app/' . $output['storage_path']);
                    if (!file_exists($fullPath) || filesize($fullPath) <= 0) {
                        return response()->json([
                            'success' => false,
                            'message' => 'File does not exist or is empty.',
                        ], 400);
                    }

                    // Validate file path
                    try {
                        $this->validateFilePath($output['storage_path'], $downloadJob);
                    } catch (\Exception $e) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Path validation error: ' . $e->getMessage(),
                        ], 400);
                    }
                }

                // Create MediaAssets from all temporary outputs (not just the first one)
                $assetsCreated = 0;
                foreach ($validated['temporary_outputs'] as $output) {
                    try {
                        // Create new MediaAsset
                        $mediaAsset = MediaAsset::create([
                            'download_job_id' => $downloadJob->id,
                            'user_id' => $downloadJob->user_id,
                            'display_name' => $output['display_name'],
                            'original_name' => $output['original_name'],
                            'media_type' => $output['media_type'],
                            'mime_type' => $output['mime_type'] ?? null,
                            'storage_disk' => $output['storage_disk'] ?? 'local',
                            'storage_path' => $output['storage_path'],
                            'public_url' => $output['public_url'] ?? null,
                            'thumbnail_path' => $output['thumbnail_path'] ?? null,
                            'file_size' => $output['file_size'] ?? null,
                            'width' => $output['width'] ?? null,
                            'height' => $output['height'] ?? null,
                            'duration_seconds' => $output['duration_seconds'] ?? null,
                            'source_platform' => $output['source_platform'] ?? $downloadJob->platform->value,
                            'source_url' => $output['source_url'] ?? $downloadJob->original_input,
                            'status' => 'pending',
                            'metadata' => $output['metadata'] ?? null,
                        ]);

                        $assetsCreated++;
                        $mediaAssetIds[] = $mediaAsset->id;
                    } catch (\Exception $e) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Error creating MediaAsset: ' . $e->getMessage(),
                        ], 400);
                    }
                }
            }

            // Update job progress
            $downloadJob->update([
                'progress' => $validated['progress'] ?? 100,
            ]);

            // For profile jobs, we don't process results here as they should be handled separately
            if ($downloadJob->mode !== \App\Enums\DownloadMode::Profile) {
                DownloadResult::where('download_job_id', $downloadJob->id)
                    ->whereIn('status', [DownloadResultStatus::Selected, DownloadResultStatus::Queued])
                    ->update(['status' => DownloadResultStatus::Processed]);
            }

            $hasFailedResults = $downloadJob->results()
                ->where('status', DownloadResultStatus::Failed)
                ->exists();

            $status = $hasFailedResults
                ? DownloadJobStatus::PartiallyCompleted
                : DownloadJobStatus::Completed;

            // Ensure we have at least one MediaAsset before marking as completed
            if ($status === DownloadJobStatus::Completed && empty($mediaAssetIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot mark job as completed without creating MediaAssets.',
                ], 400);
            }

            $job = $this->jobService->transitionTo($downloadJob, $status);

            $temporaryOutputsCount = count($validated['temporary_outputs']);

            $this->activityLog->log([
                'category' => 'worker',
                'action' => 'job_completed',
                'title' => 'Download job completed',
                'subject' => $job,
                'status' => $job->status->value,
                'platform' => $job->platform->value,
                'metadata' => [
                    'temporary_outputs_count' => $temporaryOutputsCount,
                    'assets_created' => $assetsCreated,
                    'assets_existing' => $assetsExisting,
                ],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Job completed.',
                'data' => [
                    'media_asset_ids' => $mediaAssetIds,
                    'created' => $assetsCreated > 0,
                    'existing' => $assetsExisting > 0,
                ],
            ]);
        });
    }

    public function fail(DownloadJob $downloadJob, FailJobRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $platform = $downloadJob->platform instanceof \BackedEnum
            ? $downloadJob->platform->value
            : (string) $downloadJob->platform;

        $sourceType = $downloadJob->source_type instanceof \BackedEnum
            ? $downloadJob->source_type->value
            : (string) $downloadJob->source_type;

        $normalizedMessage = strtolower(
            (string) $validated['error_message']
        );

        $tiktokUnavailableMarkers = [
            'requested format is not available',
            'unable to extract universal data for rehydration',
            'unexpected response from webpage request',
            'video_stream_missing',
        ];

        $matchesUnavailableMarker = false;

        foreach ($tiktokUnavailableMarkers as $marker) {
            if (str_contains($normalizedMessage, $marker)) {
                $matchesUnavailableMarker = true;
                break;
            }
        }

        $shouldSkip = $platform === 'tiktok'
            && $sourceType === 'video'
            && $matchesUnavailableMarker;

        $targetStatus = $shouldSkip
            ? DownloadJobStatus::Skipped
            : DownloadJobStatus::Failed;

        $effectiveErrorCode = $shouldSkip
            ? 'TIKTOK_VIDEO_UNAVAILABLE'
            : $validated['error_code'];

        $downloadJob->error_code = $effectiveErrorCode;
        $downloadJob->error_message = $validated['error_message'];

        if ($shouldSkip) {
            $downloadJob->progress = 100;
            $downloadJob->current_stage = 'skipped';
            $downloadJob->skipped_at = now();
            $downloadJob->skip_reason =
                'TikTok returned audio-only media or blocked video metadata.';
        }

        $downloadJob->save();

        $job = $this->jobService->transitionTo(
            $downloadJob,
            $targetStatus,
        );

        $activityAction = $shouldSkip
            ? 'job_skipped'
            : 'job_failed';

        $activityTitle = $shouldSkip
            ? 'Download job skipped: TikTok video unavailable'
            : 'Download job failed: ' . $effectiveErrorCode;

        $this->activityLog->log([
            'category' => 'worker',
            'action' => $activityAction,
            'title' => $activityTitle,
            'subject' => $job,
            'status' => $job->status->value,
            'platform' => $job->platform->value,
            'metadata' => [
                'error_code' => $effectiveErrorCode,
                'retryable' => $shouldSkip
                    ? false
                    : ($validated['retryable'] ?? false),
                'classified_as_unavailable' => $shouldSkip,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => $shouldSkip
                ? 'Job skipped because TikTok video is unavailable.'
                : 'Job marked as failed.',
            'data' => new DownloadJobResource($job),
        ]);
    }

    /**
     * Validate file path to prevent directory traversal attacks and ensure it's in the correct location
     */
    private function validateFilePath(string $path, DownloadJob $job): void
    {
        // Prevent directory traversal
        if (preg_match('/\.\.[\/\\\\]/', $path)) {
            throw new \InvalidArgumentException('Invalid file path - contains parent directory traversal.');
        }

        // Ensure path is within allowed directory
        $expectedBase = "private/downloads/{$job->user_id}/{$job->id}/";
        if (strpos($path, $expectedBase) !== 0) {
            throw new \InvalidArgumentException("Invalid file path - must be in {$expectedBase}");
        }

        // Basic check that path is within storage/app and doesn't contain traversal patterns
        $basePath = storage_path('app');
        if (strpos($path, '..') !== false || strpos($path, '../') !== false) {
            throw new \InvalidArgumentException('Invalid file path - potential directory traversal.');
        }
    }
}
