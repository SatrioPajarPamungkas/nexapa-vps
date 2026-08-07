<?php

namespace App\Services;

use App\Enums\DownloadJobStatus;
use App\Models\DownloadJob;
use Illuminate\Support\Facades\DB;

class DownloadJobService
{
    private static ?array $transitions = null;

    private static function getTransitions(): array
    {
        return self::$transitions ??= [
            DownloadJobStatus::Queued->value => [
                DownloadJobStatus::Analyzing->value,
                DownloadJobStatus::Ready->value,
                DownloadJobStatus::Claimed->value,
                DownloadJobStatus::Cancelled->value,
            ],
            DownloadJobStatus::Analyzing->value => [
                DownloadJobStatus::AwaitingSelection->value,
                DownloadJobStatus::Ready->value,
                DownloadJobStatus::Failed->value,
                DownloadJobStatus::Cancelled->value,
            ],
            DownloadJobStatus::AwaitingSelection->value => [
                DownloadJobStatus::Ready->value,
                DownloadJobStatus::Cancelled->value,
            ],
            DownloadJobStatus::Ready->value => [
                DownloadJobStatus::Claimed->value,
                DownloadJobStatus::Cancelled->value,
            ],
            DownloadJobStatus::Claimed->value => [
                DownloadJobStatus::Processing->value,
                DownloadJobStatus::Cancelled->value,
                DownloadJobStatus::Failed->value,
                DownloadJobStatus::Skipped->value,
            ],
            DownloadJobStatus::Processing->value => [
                DownloadJobStatus::Completed->value,
                DownloadJobStatus::PartiallyCompleted->value,
                DownloadJobStatus::Failed->value,
                DownloadJobStatus::Cancelled->value,
                DownloadJobStatus::AwaitingSelection->value,
                DownloadJobStatus::Skipped->value,
            ],
            DownloadJobStatus::PartiallyCompleted->value => [
                DownloadJobStatus::Queued->value,
            ],
            DownloadJobStatus::Failed->value => [
                DownloadJobStatus::Queued->value,
            ],
            DownloadJobStatus::Skipped->value => [],
            DownloadJobStatus::Cancelled->value => [],
            DownloadJobStatus::Completed->value => [],
        ];
    }

    public function canTransition(DownloadJob $job, DownloadJobStatus $to): bool
    {
        $allowed = self::getTransitions()[$job->status->value] ?? [];

        return in_array($to->value, $allowed);
    }

    public function transitionTo(DownloadJob $job, DownloadJobStatus $to): DownloadJob
    {
        // If already in the target status, just return the job
        if ($job->status === $to) {
            return $job;
        }

        // Special case: transitioning from Claimed/Processing to Queued is a recovery
        $isRecovery = in_array($job->status, [DownloadJobStatus::Claimed, DownloadJobStatus::Processing])
                      && $to === DownloadJobStatus::Queued;

        if (!$isRecovery && !$this->canTransition($job, $to)) {
            throw new \App\Exceptions\InvalidTransitionException(
                "Cannot transition from [{$job->status->value}] to [{$to->value}]"
            );
        }

        $job->status = $to;

        match ($to) {
            DownloadJobStatus::Cancelled => $job->cancelled_at = now(),
            DownloadJobStatus::Skipped => $job->skipped_at = now(),
            DownloadJobStatus::Completed, DownloadJobStatus::PartiallyCompleted => $job->completed_at = now(),
            DownloadJobStatus::Queued => $this->handleQueuedTransition($job, $isRecovery),
            default => null,
        };

        $job->save();

        return $job;
    }

    public function createJob(array $data): DownloadJob
    {
        return DB::transaction(function () use ($data) {
            // For profile jobs, check if there's already a non-terminal parent job
            // with the same user, normalized URL, and settings
            if (($data['mode'] ?? null) === \App\Enums\DownloadMode::Profile->value) {
                $existingParent = DownloadJob::where('user_id', $data['user_id'])
                    ->where('mode', \App\Enums\DownloadMode::Profile->value)
                    ->where('normalized_url', $data['normalized_url'])
                    ->where('output_format', $data['output_format'] ?? 'mp4')
                    ->where('quality', $data['quality'] ?? 'best')
                    ->where('filename_mode', $data['filename_mode'] ?? 'original')
                    ->whereIn('status', [
                        DownloadJobStatus::Queued->value,
                        DownloadJobStatus::Analyzing->value,
                        DownloadJobStatus::AwaitingSelection->value,
                        DownloadJobStatus::Ready->value,
                        DownloadJobStatus::Claimed->value,
                        DownloadJobStatus::Processing->value,
                    ])
                    ->first();

                if ($existingParent) {
                    return $existingParent;
                }
            }

            // Generate analysis_session_id for profile jobs
            $analysisSessionId = null;
            if (($data['mode'] ?? null) === \App\Enums\DownloadMode::Profile->value) {
                $analysisSessionId = (string) \Illuminate\Support\Str::uuid();
            }

            return DownloadJob::create([
                'user_id' => $data['user_id'] ?? null,
                'batch_id' => $data['batch_id'] ?? null,
                'mode' => $data['mode'],
                'original_input' => $data['original_input'],
                'normalized_url' => $data['normalized_url'] ?? null,
                'platform' => $data['platform'],
                'source_type' => $data['source_type'],
                'output_format' => $data['output_format'] ?? 'mp4',
                'quality' => $data['quality'] ?? 'best',
                'filename_mode' => $data['filename_mode'] ?? 'original',
                'delay_seconds' => $data['delay_seconds'] ?? 0,
                'status' => DownloadJobStatus::Queued,
                'max_retries' => $data['max_retries'] ?? 3,
                'metadata' => $data['metadata'] ?? null,
                'analysis_session_id' => $analysisSessionId,
            ]);
        });
    }

    public function cancel(DownloadJob $job): DownloadJob
    {
        // If already cancelled, return as-is (idempotent)
        if ($job->status === DownloadJobStatus::Cancelled) {
            return $job;
        }

        // Clean up partial results and metadata for profile jobs
        if ($job->mode === \App\Enums\DownloadMode::Profile) {
            DB::transaction(function () use ($job) {
                // Delete all download results for this job
                $job->results()->delete();

                // Clear temporary metadata
                $metadata = $job->metadata ?? [];
                unset($metadata['temporary_outputs']);
                $job->metadata = $metadata;
                $job->save();
            });
        }

        return $this->transitionTo($job, DownloadJobStatus::Cancelled);
    }

    public function retry(DownloadJob $job): DownloadJob
    {
        if (! $this->canRetry($job)) {
            throw new \App\Exceptions\InvalidTransitionException(
                'Job cannot be retried in its current state'
            );
        }

        if ($job->retry_count >= $job->max_retries) {
            throw new \App\Exceptions\InvalidTransitionException(
                'Maximum retries exceeded'
            );
        }

        $job->retry_count += 1;
        $job->error_code = null;
        $job->error_message = null;
        $job->current_stage = null;
        $job->progress = 0;
        $job->save();

        return $this->transitionTo($job, DownloadJobStatus::Queued);
    }

    public function canRetry(DownloadJob $job): bool
    {
        return in_array($job->status, [
            DownloadJobStatus::Failed,
            DownloadJobStatus::PartiallyCompleted,
        ]);
    }

    private function handleQueuedTransition(DownloadJob $job, bool $isRecovery): void
    {
        // Every queued job must be claimable, including retries from failed.
        $job->worker_id = null;
        $job->claimed_at = null;
        $job->started_at = null;
        $job->analysis_client_heartbeat_at = null;

        if ($isRecovery) {
            // Increment recovery attempts in metadata
            $metadata = $job->metadata ?? [];
            $metadata['recovery_attempts'] = ($metadata['recovery_attempts'] ?? 0) + 1;
            $metadata['last_recovery_at'] = now()->toISOString();
            $job->metadata = $metadata;
        }
    }

    public function delete(DownloadJob $job): bool
    {
        if ($job->status === DownloadJobStatus::Processing) {
            throw new \App\Exceptions\InvalidTransitionException(
                'Cannot delete a processing job'
            );
        }

        return $job->delete();
    }
}
