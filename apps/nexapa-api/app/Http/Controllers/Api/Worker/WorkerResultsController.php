<?php

namespace App\Http\Controllers\Api\Worker;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadResultStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Worker\DiscoverResultsRequest;
use App\Http\Resources\DownloadResultResource;
use App\Models\DownloadJob;
use App\Services\ActivityLogService;
use App\Services\DownloadResultService;
use Illuminate\Http\JsonResponse;

class WorkerResultsController extends Controller
{
    public function __construct(
        private readonly DownloadResultService $resultService,
        private readonly ActivityLogService $activityLog,
    ) {}

    public function discover(DownloadJob $downloadJob, DiscoverResultsRequest $request): JsonResponse
    {
        // Check if job is cancelled before accepting results
        $downloadJob->refresh();
        if ($downloadJob->status === \App\Enums\DownloadJobStatus::Cancelled) {
            return response()->json([
                'success' => false,
                'message' => 'Job is cancelled. Results discarded.',
            ], 422);
        }

        $validated = $request->validated();

        $created = $this->resultService->discoverResults(
            $downloadJob,
            $validated['results']
        );

        // For profile jobs, status transition is handled by the worker when discovery is complete
        // We don't automatically change the status here

        $this->activityLog->log([
            'category' => 'worker',
            'action' => 'results_discovered',
            'title' => count($created) . ' results discovered',
            'subject' => $downloadJob,
            'status' => 'awaiting_selection',
            'platform' => $downloadJob->platform->value,
            'metadata' => ['discovered_count' => count($created)],
        ]);

        return response()->json([
            'success' => true,
            'message' => count($created) . ' new results discovered.',
            'data' => DownloadResultResource::collection($created),
        ]);
    }
}
