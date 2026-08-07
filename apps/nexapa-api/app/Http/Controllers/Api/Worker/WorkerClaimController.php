<?php

namespace App\Http\Controllers\Api\Worker;

use App\Enums\DownloadJobStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Worker\ClaimJobRequest;
use App\Http\Resources\DownloadJobResource;
use App\Services\ActivityLogService;
use App\Services\DownloadJobClaimService;
use Illuminate\Http\JsonResponse;

class WorkerClaimController extends Controller
{
    public function __construct(
        private readonly DownloadJobClaimService $claimService,
        private readonly ActivityLogService $activityLog,
    ) {}

    public function store(ClaimJobRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $job = $this->claimService->claim(
            $validated['worker_id'],
            $validated['capabilities'] ?? []
        );

        if (! $job) {
            return response()->json([
                'success' => true,
                'message' => 'No compatible jobs available.',
                'data' => null,
            ]);
        }

        $this->activityLog->log([
            'category' => 'worker',
            'action' => 'job_claimed',
            'title' => "Job claimed by worker {$validated['worker_id']}",
            'subject' => $job,
            'status' => 'claimed',
            'platform' => $job->platform->value,
            'metadata' => ['worker_id' => $validated['worker_id']],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Job claimed successfully.',
            'data' => new DownloadJobResource($job),
        ]);
    }
}
