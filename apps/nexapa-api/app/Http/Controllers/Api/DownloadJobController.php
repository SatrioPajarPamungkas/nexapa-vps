<?php

namespace App\Http\Controllers\Api;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadMode;
use App\Http\Controllers\Controller;
use App\Http\Requests\DownloadJob\IndexDownloadJobRequest;
use App\Http\Requests\DownloadJob\StoreDownloadJobRequest;
use App\Http\Requests\DownloadJob\CreateBulkDownloadRequest;
use App\Http\Resources\DownloadJobDetailResource;
use App\Http\Resources\DownloadJobResource;
use App\Models\DownloadJob;
use App\Models\MediaAsset;
use App\Services\ActivityLogService;
use App\Services\DownloadBatchService;
use App\Services\DownloadJobService;
use App\Services\DownloadQueuePurgeService;
use App\Services\DownloadResultService;
use App\Services\Downloader\DownloadUrlInspector;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use ZipArchive;

class DownloadJobController extends Controller
{
    public function __construct(
        private readonly DownloadJobService $jobService,
        private readonly DownloadResultService $resultService,
        private readonly DownloadUrlInspector $urlInspector,
        private readonly ActivityLogService $activityLog,
        private readonly DownloadBatchService $batchService,
        private readonly DownloadQueuePurgeService $queuePurge,
    ) {}

    public function store(StoreDownloadJobRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $urls = $validated['urls'];
        $mode = $validated['mode'];
        $batchId = null;
        if ($mode === DownloadMode::Multiple->value) {
            $batchId = (string) \Illuminate\Support\Str::orderedUuid();
        }

        $uniqueUrls = array_unique($urls);
        $duplicateUrls = array_diff_key($urls, array_unique($urls));

        $accepted = [];
        $rejected = [];
        $duplicates = [];

        foreach ($duplicateUrls as $index => $url) {
            $duplicates[] = [
                'index' => $index,
                'url' => $url,
                'reason' => 'Duplicate URL within the same request.',
            ];
        }

        DB::beginTransaction();

        try {
            foreach ($uniqueUrls as $index => $url) {
                $inspection = $this->urlInspector->inspect($url);

                if (! $inspection['success']) {
                    $rejected[] = [
                        'index' => array_search($url, $urls),
                        'url' => $url,
                        'reason' => $inspection['error'],
                    ];
                    continue;
                }

                $job = $this->jobService->createJob([
                    'user_id' => $request->user()?->id,
                    'mode' => $mode,
                    'original_input' => $url,
                    'normalized_url' => $inspection['normalized_url'],
                    'platform' => $inspection['platform'],
                    'source_type' => $inspection['source_type'],
                    'output_format' => $validated['output_format'] ?? 'original',
                    'quality' => $validated['quality'] ?? 'best',
                    'filename_mode' => $validated['filename_mode'] ?? 'original',
                    'delay_seconds' => $validated['delay_seconds'] ?? 0,
                    'max_retries' => $validated['max_retries'] ?? 3,
                    'batch_id' => $batchId,
                ]);

                $accepted[] = new DownloadJobResource($job);

                $this->activityLog->log([
                    'user_id' => $request->user()?->id,
                    'category' => 'download',
                    'action' => 'job_created',
                    'title' => "Download job created for {$inspection['platform']->value}",
                    'subject' => $job,
                    'status' => 'queued',
                    'platform' => $inspection['platform']->value,
                ]);
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'success' => true,
            'message' => 'Download jobs processed.',
            'data' => [
                'accepted' => $accepted,
                'rejected' => $rejected,
                'duplicates' => $duplicates,
                'batch_id' => $batchId,
                'counts' => [
                    'total' => count($urls),
                    'accepted' => count($accepted),
                    'rejected' => count($rejected),
                    'duplicates' => count($duplicates),
                ],
            ],
        ], 201);
    }

    public function index(IndexDownloadJobRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $perPage = $validated['per_page'] ?? 20;

        $query = DownloadJob::query()
            ->where('user_id', $request->user()?->getAuthIdentifier())
            ->with(['mediaAssets:id,download_job_id,storage_disk,storage_path,file_size'])
            ->withCount(['results', 'mediaAssets']);

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('original_input', 'like', "%{$search}%")
                  ->orWhere('normalized_url', 'like', "%{$search}%");
            });
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['platform'])) {
            $query->where('platform', $validated['platform']);
        }

        if (! empty($validated['mode'])) {
            $query->where('mode', $validated['mode']);
        }

        if (! empty($validated['source_type'])) {
            $query->where('source_type', $validated['source_type']);
        }

        if (! empty($validated['output_format'])) {
            $query->where('output_format', $validated['output_format']);
        }

        if (! empty($validated['created_from'])) {
            $query->where('created_at', '>=', $validated['created_from']);
        }

        if (! empty($validated['created_to'])) {
            $query->where('created_at', '<=', $validated['created_to']);
        }

        $sort = $validated['sort'] ?? '-created_at';
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');
        $query->orderBy($column, $direction);

        $jobs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Download jobs retrieved.',
            'data' => DownloadJobResource::collection($jobs),
            'meta' => [
                'current_page' => $jobs->currentPage(),
                'last_page' => $jobs->lastPage(),
                'per_page' => $jobs->perPage(),
                'total' => $jobs->total(),
            ],
        ]);
    }

    public function show(DownloadJob $downloadJob): JsonResponse
    {
        $this->ensureOwnedByCurrentUser($downloadJob);
        $downloadJob->load(['results', 'mediaAssets']);

        return response()->json([
            'success' => true,
            'message' => 'Download job retrieved.',
            'data' => new DownloadJobDetailResource($downloadJob),
        ]);
    }

    public function cancel(DownloadJob $downloadJob, Request $request): JsonResponse
    {
        $this->ensureOwnedByCurrentUser($downloadJob);
        $job = $this->jobService->cancel($downloadJob);

        $this->activityLog->log([
            'user_id' => $request->user()?->id,
            'category' => 'download',
            'action' => 'job_cancelled',
            'title' => 'Download job cancelled',
            'subject' => $job,
            'status' => 'cancelled',
            'platform' => $job->platform->value,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Download job cancelled.',
            'data' => new DownloadJobResource($job),
        ]);
    }

    public function analysisHeartbeat(DownloadJob $downloadJob, Request $request): JsonResponse
    {
        $this->ensureOwnedByCurrentUser($downloadJob);

        // Only accept heartbeat for profile jobs that are still active
        if ($downloadJob->mode !== \App\Enums\DownloadMode::Profile) {
            return response()->json([
                'success' => false,
                'message' => 'Heartbeat only accepted for profile jobs.',
            ], 422);
        }

        // Only accept heartbeat for active jobs
        $activeStatuses = [
            DownloadJobStatus::Queued,
            DownloadJobStatus::Claimed,
            DownloadJobStatus::Analyzing,
            DownloadJobStatus::Processing,
        ];

        if (!in_array($downloadJob->status, $activeStatuses)) {
            return response()->json([
                'success' => false,
                'message' => 'Heartbeat only accepted for active jobs.',
            ], 422);
        }

        $downloadJob->update(['analysis_client_heartbeat_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Heartbeat received.',
        ]);
    }

    public function retry(DownloadJob $downloadJob, Request $request): JsonResponse
    {
        $this->ensureOwnedByCurrentUser($downloadJob);
        $job = $this->jobService->retry($downloadJob);

        $this->activityLog->log([
            'user_id' => $request->user()?->id,
            'category' => 'download',
            'action' => 'job_retried',
            'title' => 'Download job retried',
            'subject' => $job,
            'status' => 'queued',
            'platform' => $job->platform->value,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Download job queued for retry.',
            'data' => new DownloadJobResource($job),
        ]);
    }

    public function destroy(string $downloadJob, Request $request): JsonResponse
    {
        $removed = $this->queuePurge->remove(
            $downloadJob,
            $request->user()->getAuthIdentifier(),
            true // Allow awaiting_selection deletion for single delete
        );

        return response()->json([
            'success' => true,
            'message' => 'Queue item and associated media permanently deleted.',
            'data' => $removed,
        ]);
    }

    public function clearQueue(Request $request): JsonResponse
    {
        $removed = $this->queuePurge->clearTerminal(
            $request->user()->getAuthIdentifier(),
        );

        return response()->json([
            'success' => true,
            'message' => 'Terminal queue items and associated media permanently deleted.',
            'data' => $removed,
        ]);
    }

    /**
     * Serve temporary content file for a download job.
     */
    public function temporaryContent(DownloadJob $downloadJob, int $outputIndex, Request $request)
    {
        $this->ensureOwnedByCurrentUser($downloadJob);
        // Only allow for terminal jobs
        $terminalStatuses = [
            DownloadJobStatus::Completed,
            DownloadJobStatus::PartiallyCompleted,
        ];

        if (! in_array($downloadJob->status, $terminalStatuses, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Job is not yet completed. Cannot access temporary content.',
            ], 409);
        }

        // Check for temporary outputs
        $temporaryOutputs = $downloadJob->metadata['temporary_outputs'] ?? [];
        if (!is_array($temporaryOutputs) || empty($temporaryOutputs)) {
            return response()->json([
                'success' => false,
                'message' => 'No temporary outputs available for this job.',
            ], 404);
        }

        // Validate index
        if (!isset($temporaryOutputs[$outputIndex])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid output index.',
            ], 404);
        }

        $output = $temporaryOutputs[$outputIndex];
        $kind = $request->query('kind', 'media'); // 'media' or 'thumbnail'

        // Resolve the output file
        $temporaryService = new \App\Services\TemporaryDownloadOutputService();
        $realFile = $temporaryService->resolveOutputFile($output, $kind);

        if ($realFile === null) {
            return response()->json([
                'success' => false,
                'message' => 'Temporary content file not found or unsafe path.',
            ], 404);
        }

        // Return the file for download
        $originalName = $output['original_name'] ?? 'downloaded-file';
        return response()->download($realFile, $originalName);
    }

    /**
     * Download all media assets for a single job as a ZIP archive.
     * Used when a standalone job has multiple media assets (e.g., carousel).
     */
    public function archive(DownloadJob $downloadJob, Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
    {
        $this->ensureOwnedByCurrentUser($downloadJob);
        // Only allow for terminal jobs
        $terminalStatuses = [
            DownloadJobStatus::Completed,
            DownloadJobStatus::PartiallyCompleted,
        ];

        if (! in_array($downloadJob->status, $terminalStatuses, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Job is not yet completed. Cannot create archive.',
            ], 409);
        }

        // Check for temporary outputs first
        $temporaryOutputs = $downloadJob->metadata['temporary_outputs'] ?? [];
        $hasTemporaryOutputs = is_array($temporaryOutputs) && !empty($temporaryOutputs);

        $filesToAdd = [];

        if ($hasTemporaryOutputs) {
            // Use temporary outputs
            $temporaryService = new \App\Services\TemporaryDownloadOutputService();
            foreach ($temporaryOutputs as $output) {
                $realFile = $temporaryService->resolveOutputFile($output);
                if ($realFile === null) {
                    continue;
                }

                $filesToAdd[] = [
                    'file' => $realFile,
                    'name' => $output['original_name'] ?? $output['display_name'] ?? pathinfo($realFile, PATHINFO_BASENAME),
                ];
            }
        } else {
            // Legacy fallback: Get available media assets
            $assets = MediaAsset::where('download_job_id', $downloadJob->id)
                ->where('status', 'available')
                ->get();

            if ($assets->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No downloadable media assets available.',
                ], 404);
            }

            foreach ($assets as $asset) {
                $realFile = $this->batchService->resolveAssetFileForZip($asset);
                if ($realFile === null) {
                    continue;
                }

                $filesToAdd[] = [
                    'file' => $realFile,
                    'name' => $asset->original_name ?: $asset->display_name ?: pathinfo($realFile, PATHINFO_BASENAME),
                ];
            }
        }

        if (empty($filesToAdd)) {
            return response()->json([
                'success' => false,
                'message' => 'No downloadable files available.',
            ], 404);
        }

        // Create temporary ZIP
        $tempDir = storage_path('app/private/archives');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $zipPath = $tempDir . DIRECTORY_SEPARATOR . "nexapa-job-{$downloadJob->id}-" . uniqid() . ".zip";

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create ZIP archive.',
            ], 500);
        }

        $usedNames = [];
        $filesAdded = 0;

        foreach ($filesToAdd as $item) {
            $realFile = $item['file'];
            $rawName = $item['name'];

            // Sanitize filename
            $rawName = basename($rawName);
            $rawName = preg_replace('/[\x00-\x1F\x7F]/u', '', $rawName);
            $rawName = preg_replace('/[^A-Za-z0-9 \-_\.]/u', '_', $rawName);

            if (empty($rawName)) {
                $ext = pathinfo($realFile, PATHINFO_EXTENSION);
                $rawName = 'media-' . substr(md5($realFile), 0, 8) . ($ext ? ".{$ext}" : '');
            }

            // Ensure unique name
            $candidate = $rawName;
            $i = 2;
            $lowerUsed = array_map('strtolower', $usedNames);
            while (in_array(strtolower($candidate), $lowerUsed)) {
                $base = pathinfo($rawName, PATHINFO_FILENAME);
                $ext = pathinfo($rawName, PATHINFO_EXTENSION);
                $candidate = $base . " ({$i})" . ($ext ? ".{$ext}" : '');
                $i++;
            }
            $usedNames[] = $candidate;

            if ($zip->addFile($realFile, $candidate) === false) {
                continue;
            }
            $filesAdded++;
        }

        $zip->close();

        if ($filesAdded === 0) {
            @unlink($zipPath);
            return response()->json([
                'success' => false,
                'message' => 'No files could be added to the archive.',
            ], 500);
        }

        // Return ZIP file
        $fileName = "nexapa-download-{$downloadJob->id}.zip";

        return Response::download($zipPath, $fileName)->deleteFileAfterSend(true);
    }

    /**
     * Create bulk download jobs for all results of a profile job (Download All Fast mode)
     */
    public function createBulkDownload(CreateBulkDownloadRequest $request, DownloadJob $downloadJob): JsonResponse
    {
        $this->ensureOwnedByCurrentUser($downloadJob);
        // Verify this is a profile job
        if ($downloadJob->source_type !== \App\Enums\SourceType::Profile) {
            return response()->json([
                'success' => false,
                'message' => 'Bulk download is only available for profile jobs.',
            ], 400);
        }

        // Verify job has results
        $resultCount = $downloadJob->results()->count();
        if ($resultCount === 0) {
            return response()->json([
                'success' => false,
                'message' => 'No results found for this profile job.',
            ], 400);
        }

        $validated = $request->validated();
        $selectionType = $validated['selection_type'] ?? 'all';
        $retryFailed = $validated['retry_failed'] ?? false;

        try {
            // Create bulk child jobs
            $result = $this->resultService->createBulkChildJobs($downloadJob, $selectionType, $retryFailed);

            // Brutal Download batch partition.
            $batchIds = $this->resultService
                ->rebatchChildJobs(
                    $downloadJob,
                    50
                );

            if ($batchIds !== []) {
                $result['batch_id']
                    = $batchIds[0];

                $result['batch_ids']
                    = $batchIds;
            }

            $this->activityLog->log([
                'user_id' => $request->user()?->id,
                'category' => 'download',
                'action' => 'bulk_download_created',
                'title' => "Bulk download jobs created ({$result['count']} items)",
                'subject' => $downloadJob,
                'status' => 'queued',
                'platform' => $downloadJob->platform->value,
                'metadata' => [
                    'batch_id' => $result['batch_id'],
                    'child_jobs_count' => $result['count'],
                    'selection_type' => $selectionType,
                    'retry_failed' => $retryFailed,
                ],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Bulk download jobs created successfully.',
                'data' => [
                    'batch_id' => $result['batch_id'],
                    'child_jobs_count' => $result['count'],
                ],
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create bulk download jobs: ' . $e->getMessage(),
            ], 500);
        }
    }

    private function ensureOwnedByCurrentUser(DownloadJob $downloadJob): void
    {
        if ((string) $downloadJob->user_id !== (string) auth()->id()) {
            abort(404);
        }
    }
}
