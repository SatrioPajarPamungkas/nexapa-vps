<?php

namespace App\Services;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadPlatform;
use App\Models\DownloadJob;
use Illuminate\Support\Facades\DB;

class DownloadJobClaimService
{
    public function claim(string $workerId, array $capabilities): ?DownloadJob
    {
        return DB::transaction(function () use ($workerId, $capabilities) {
            // Check if there are jobs that were previously claimed by this worker but are now stale
            // This prevents a worker from claiming a job that it previously had but lost due to recovery
            $recentlyRecoveredJobs = DownloadJob::whereIn('status', [DownloadJobStatus::Claimed, DownloadJobStatus::Processing])
                ->where('worker_id', $workerId)
                ->where('analysis_client_heartbeat_at', '<', now()->subMinutes(5))
                ->exists();

            if ($recentlyRecoveredJobs) {
                // Don't allow this worker to claim new jobs if it had stale jobs that were recovered
                return null;
            }

            $query = DownloadJob::query()
                ->where(function ($q) {
                    $q->where('status', DownloadJobStatus::Queued)
                      ->orWhere('status', DownloadJobStatus::Ready);
                })
                ->where('claimed_at', null)
                ->whereNotIn('status', [
                    DownloadJobStatus::AwaitingSelection,
                    DownloadJobStatus::Cancelled,
                    DownloadJobStatus::Completed,
                    DownloadJobStatus::Failed,
                    DownloadJobStatus::Skipped,
                ]);

            // Apply platform filtering if specified
            $platforms = $capabilities['platforms'] ?? [];
            if (! empty($platforms)) {
                $platformValues = array_map(fn ($p) => $p instanceof DownloadPlatform ? $p->value : $p, $platforms);
                $query->whereIn('platform', $platformValues);
            }

            // Apply mode filtering if specified
            $modes = $capabilities['modes'] ?? [];
            if (! empty($modes)) {
                $modeValues = array_map(fn ($m) => is_string($m) ? $m : $m->value, $modes);
                $query->whereIn('mode', $modeValues);
            }

            // Apply job kind filtering based on capabilities
            $jobKinds = $capabilities['job_kinds'] ?? [];
            if (! empty($jobKinds)) {
                // Filter unknown job kinds safely
                $validJobKinds = array_intersect($jobKinds, ['profile_analysis', 'media_download']);

                if (! empty($validJobKinds)) {
                    $query->where(function ($kindQuery) use ($validJobKinds) {
                        if (in_array('profile_analysis', $validJobKinds)) {
                            $kindQuery->orWhere(function ($profileQuery) {
                                $profileQuery->whereNull('parent_download_job_id')
                                    ->where('mode', 'profile')
                                    ->whereNotIn('status', [DownloadJobStatus::AwaitingSelection]);
                            });
                        }

                        if (in_array('media_download', $validJobKinds)) {
                            $kindQuery->orWhere(function ($mediaQuery) {
                                $mediaQuery->whereNotNull('parent_download_job_id')
                                    ->whereNotNull('download_result_id');
                            });
                        }
                    });
                }
            } else {
                // Backward compatibility: if no job_kinds specified, allow both profile analysis parents and media download children
                $query->where(function ($safeQuery) {
                    // Allow profile analysis parent jobs:
                    // - mode=profile
                    // - parent_download_job_id IS NULL
                    // - download_result_id IS NULL
                    // - status bukan awaiting_selection/terminal
                    $safeQuery->orWhere(function ($profileQuery) {
                        $profileQuery->whereNull('parent_download_job_id')
                            ->whereNull('download_result_id')
                            ->where('mode', 'profile')
                            ->whereNotIn('status', [
                                DownloadJobStatus::AwaitingSelection,
                                DownloadJobStatus::Cancelled,
                                DownloadJobStatus::Completed,
                                DownloadJobStatus::Failed,
                                DownloadJobStatus::Skipped,
                            ]);
                    });

                    // OR allow media download child jobs:
                    // - parent_download_job_id IS NOT NULL
                    // - download_result_id IS NOT NULL
                    $safeQuery->orWhere(function ($mediaQuery) {
                        $mediaQuery->whereNotNull('parent_download_job_id')
                            ->whereNotNull('download_result_id');
                    });
                });
            }

            // Deterministic ordering with row locking
            $job = $query->lockForUpdate()
                ->orderBy('created_at')
                ->orderBy('id')
                ->first();

            if (! $job) {
                return null;
            }

            // Additional safety checks for profile analysis jobs
            if ($job->isProfileAnalysisJob()) {
                // Ensure profile analysis jobs are not in awaiting selection
                if ($job->status === DownloadJobStatus::AwaitingSelection) {
                    return null;
                }

                // Ensure profile analysis jobs are not terminal
                if ($job->status->isTerminal()) {
                    return null;
                }
            }

            // Additional safety checks for media download child jobs
            if ($job->isMediaDownloadChild()) {
                // Ensure parent job exists and is not cancelled
                if ($job->parentDownloadJob) {
                    if (in_array($job->parentDownloadJob->status, [
                        DownloadJobStatus::Cancelled,
                    ])) {
                        return null;
                    }
                } else {
                    // Parent job doesn't exist, this child job is orphaned
                    return null;
                }

                // Ensure download result exists
                if (! $job->downloadResult) {
                    return null;
                }
            }

            // Check for recovery attempts in metadata to prevent infinite loops
            $recoveryAttempts = $job->metadata['recovery_attempts'] ?? 0;
            if ($recoveryAttempts > 10) {
                // Too many recovery attempts, mark as failed
                $job->update([
                    'status' => DownloadJobStatus::Failed,
                    'error_code' => 'RECOVERY_LIMIT_EXCEEDED',
                    'error_message' => 'Job exceeded maximum recovery attempts',
                ]);
                return null;
            }

            // Atomically claim the job
            $job->update([
                'worker_id' => $workerId,
                'claimed_at' => now(),
                'analysis_client_heartbeat_at' => now(), // Initialize heartbeat
                'status' => DownloadJobStatus::Claimed,
            ]);

            return $job->fresh();
        });
    }
}
