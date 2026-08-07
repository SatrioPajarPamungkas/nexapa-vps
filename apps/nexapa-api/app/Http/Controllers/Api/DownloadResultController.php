<?php

namespace App\Http\Controllers\Api;

use App\Enums\DownloadResultStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\DownloadJob\SelectResultsRequest;
use App\Http\Resources\DownloadResultResource;
use App\Models\DownloadJob;
use App\Services\ActivityLogService;
use App\Services\DownloadJobService;
use App\Services\DownloadResultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DownloadResultController extends Controller
{
    public function __construct(
        private readonly DownloadResultService $resultService,
        private readonly DownloadJobService $jobService,
        private readonly ActivityLogService $activityLog,
    ) {}

    public function index(DownloadJob $downloadJob, Request $request): JsonResponse
    {
        $this->ensureOwnedByCurrentUser($downloadJob);
        $perPage = $request->integer('per_page', 50);
        $status = $request->input('status');

        $query = $downloadJob->results()->with('childDownloadJob')->orderBy('created_at');

        if ($status) {
            $query->where('status', $status);
        }

        $results = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Download results retrieved.',
            'data' => DownloadResultResource::collection($results),
            'meta' => [
                'current_page' => $results->currentPage(),
                'last_page' => $results->lastPage(),
                'per_page' => $results->perPage(),
                'total' => $results->total(),
            ],
        ]);
    }

    public function select(DownloadJob $downloadJob, SelectResultsRequest $request): JsonResponse
    {
        $this->ensureOwnedByCurrentUser($downloadJob);
        $validated = $request->validated();

        if (empty($validated['result_ids']) && empty($validated['select_all'])) {
            return response()->json([
                'success' => false,
                'message' => 'No results selected.',
            ], 422);
        }

        $selectAll = ! empty($validated['select_all']);
        $resultIds = $selectAll
            ? null
            : ($validated['result_ids'] ?? []);

        // One locked, chunk-safe operation. Null means every selectable result.
        $result = $this->resultService->selectAndCreateChildJobs(
            $downloadJob,
            $resultIds
        );

        // Brutal Download batch partition.
        $batchIds = $this->resultService
            ->rebatchChildJobs(
                $downloadJob,
                50
            );

        $batchId = $batchIds[0]
            ?? $result['batch_id'];
        $totalJobs = $result['total'];
        $createdJobs = $result['created'];
        $existingJobs = $result['existing'];

        // Transition parent job to Ready status
        $this->jobService->transitionTo($downloadJob, \App\Enums\DownloadJobStatus::Ready);

        $this->activityLog->log([
            'user_id' => auth()->id(),
            'category' => 'download',
            'action' => 'results_selected',
            'title' => $totalJobs . ' results selected for processing',
            'subject' => $downloadJob,
            'status' => 'ready',
            'platform' => $downloadJob->platform->value,
            'metadata' => [
                'selected_count' => $totalJobs,
                'child_jobs_created' => $totalJobs,
                'batch_id' => $batchId,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Results selected and job marked as ready.',
            'data' => [
                'selected_count' => $totalJobs,
                'batch_id' => $batchId,
                'total' => $totalJobs,
                'created' => $createdJobs,
                'existing' => $existingJobs,
            ],
        ]);
    }

    private function ensureOwnedByCurrentUser(DownloadJob $downloadJob): void
    {
        if ((string) $downloadJob->user_id !== (string) auth()->id()) {
            abort(404);
        }
    }
}
