<?php

namespace App\Http\Controllers\Api\Worker;

use App\Enums\DownloadJobStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Worker\StartJobRequest;
use App\Http\Resources\DownloadJobResource;
use App\Models\DownloadJob;
use App\Services\ActivityLogService;
use App\Services\DownloadJobService;
use Illuminate\Http\JsonResponse;

class WorkerJobController extends Controller
{
    public function __construct(
        private readonly DownloadJobService $jobService,
        private readonly ActivityLogService $activityLog,
    ) {}

    public function start(DownloadJob $downloadJob, StartJobRequest $request): JsonResponse
    {
        $this->ensureOwnership($downloadJob, $request);

        $downloadJob->update([
            'current_stage' => $request->validated('current_stage', 'analyzing'),
            'started_at' => now(),
        ]);

        $job = $this->jobService->transitionTo($downloadJob, DownloadJobStatus::Processing);

        $this->activityLog->log([
            'category' => 'worker',
            'action' => 'job_processing_started',
            'title' => 'Worker started processing download job',
            'subject' => $job,
            'status' => 'processing',
            'platform' => $job->platform->value,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Job started.',
            'data' => new DownloadJobResource($job),
        ]);
    }

    public function progress(DownloadJob $downloadJob, \App\Http\Requests\Worker\ProgressJobRequest $request): JsonResponse
    {
        $this->ensureOwnership($downloadJob, $request);

        $validated = $request->validated();
        $newProgress = $validated['progress'];

        if ($newProgress < $downloadJob->progress && $downloadJob->status === DownloadJobStatus::Processing) {
            return response()->json([
                'success' => false,
                'message' => 'Progress cannot move backward.',
            ], 422);
        }

        $downloadJob->update([
            'progress' => $newProgress,
            'current_stage' => $validated['stage'] ?? $downloadJob->current_stage,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Progress updated.',
            'data' => new DownloadJobResource($downloadJob->fresh()),
        ]);
    }

    public function heartbeat(DownloadJob $downloadJob, \Illuminate\Http\Request $request): JsonResponse
    {
        $this->ensureOwnership($downloadJob, $request);

        // Update both claimed_at and analysis_client_heartbeat_at
        $downloadJob->update([
            'claimed_at' => now(),
            'analysis_client_heartbeat_at' => now()
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Heartbeat received.',
        ]);
    }

    public function transition(DownloadJob $downloadJob, \Illuminate\Http\Request $request): JsonResponse
    {
        $this->ensureOwnership($downloadJob, $request);

        $status = $request->input('status');

        if (!$status) {
            return response()->json([
                'success' => false,
                'message' => 'Status is required.',
            ], 422);
        }

        // Convert string status to enum
        try {
            $statusEnum = \App\Enums\DownloadJobStatus::from($status);
        } catch (\ValueError $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid status value.',
            ], 422);
        }

        // This endpoint is used by profile discovery to move the
        // parent job into the user-selection stage. The transition
        // source validation remains centralized in DownloadJobService.
        if ($statusEnum !== DownloadJobStatus::AwaitingSelection) {
            return response()->json([
                'success' => false,
                'message' => 'Only awaiting_selection is supported by this endpoint.',
            ], 422);
        }

        // Check if job is cancelled before transitioning
        $downloadJob->refresh();
        if ($downloadJob->status === \App\Enums\DownloadJobStatus::Cancelled) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot transition cancelled job to awaiting_selection.',
            ], 422);
        }

        try {
            $job = $this->jobService->transitionTo(
                $downloadJob,
                $statusEnum,
            );
        } catch (\App\Exceptions\InvalidTransitionException $error) {
            return response()->json([
                'success' => false,
                'message' => $error->getMessage(),
            ], 422);
        }

        $this->activityLog->log([
            'category' => 'worker',
            'action' => 'job_status_transition',
            'title' => "Job status transitioned to {$statusEnum->value}",
            'subject' => $job,
            'status' => $job->status->value,
            'platform' => $job->platform->value,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Job status updated.',
            'data' => new DownloadJobResource($job),
        ]);
    }

    private function ensureOwnership(DownloadJob $job, \Illuminate\Http\Request $request): void
    {
        // Ownership is already enforced by route model binding scope
        // but we verify worker_id matches the claimed worker
        $workerId = $request->input('worker_id') ?? $request->header('X-Worker-ID');

        if ($job->worker_id !== null && $workerId !== null && $job->worker_id !== $workerId) {
            abort(403, 'Job is claimed by another worker.');
        }
    }
}
