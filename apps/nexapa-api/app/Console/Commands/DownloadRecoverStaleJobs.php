<?php

namespace App\Console\Commands;

use App\Enums\DownloadJobStatus;
use App\Models\DownloadJob;
use App\Services\DownloadJobService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class DownloadRecoverStaleJobs extends Command
{
    protected $signature = 'download:recover-stale-jobs 
                            {--minutes=5 : Minutes after which a heartbeat is considered stale}
                            {--cleanup-after-hours=1 : Hours after which temporary files are cleaned up}
                            {--max-attempts=3 : Maximum recovery attempts per job}
                            {--dry-run : Show what would be processed without executing}';
    
    protected $description = 'Recover stale claimed/processing download jobs and cleanup temporary files';

    public function __construct(
        private DownloadJobService $jobService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $minutes = (int) $this->option('minutes');
        $cleanupHours = (int) $this->option('cleanup-after-hours');
        $maxAttempts = (int) $this->option('max-attempts');
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be made');
        }

        $this->info("Checking for stale download jobs (threshold: {$minutes} minutes)");

        // Find stale jobs that are either claimed or processing
        $staleJobs = DownloadJob::whereIn('status', [
                DownloadJobStatus::Claimed,
                DownloadJobStatus::Processing
            ])
            ->whereNotNull('analysis_client_heartbeat_at')
            ->where('analysis_client_heartbeat_at', '<', Carbon::now()->subMinutes($minutes))
            ->where(function ($query) {
                // Only consider jobs with recovery attempts less than max
                $query->whereNull('metadata')
                    ->orWhereRaw("COALESCE(CAST(JSON_EXTRACT(metadata, '$.recovery_attempts') AS INTEGER), 0) < ?", [3]);
            })
            ->get();

        $this->info("Found {$staleJobs->count()} stale jobs");

        if ($staleJobs->isEmpty()) {
            $this->info('No stale jobs found.');
            return self::SUCCESS;
        }

        $recovered = 0;
        $alreadyRecovered = 0;
        $failed = 0;

        foreach ($staleJobs as $job) {
            $this->info("Processing job: {$job->id} (Status: {$job->status->value})");
            
            // Check if job has already been recovered recently (within last minute)
            $lastRecoveryAt = $job->metadata['last_recovery_at'] ?? null;
            if ($lastRecoveryAt && Carbon::parse($lastRecoveryAt)->isAfter(Carbon::now()->subMinute())) {
                $this->warn("  ⚠ Skipping: Recently recovered");
                $alreadyRecovered++;
                continue;
            }

            // Check recovery attempts
            $recoveryAttempts = $job->metadata['recovery_attempts'] ?? 0;
            if ($recoveryAttempts >= $maxAttempts) {
                $this->warn("  ⚠ Skipping: Max recovery attempts reached ({$recoveryAttempts})");
                $failed++;
                continue;
            }

            if (!$dryRun) {
                try {
                    // Increment recovery attempts
                    $metadata = $job->metadata ?? [];
                    $metadata['recovery_attempts'] = $recoveryAttempts + 1;
                    $metadata['last_recovery_at'] = Carbon::now()->toISOString();
                    
                    // Reset worker association
                    $job->update([
                        'worker_id' => null,
                        'claimed_at' => null,
                        'started_at' => null,
                        'analysis_client_heartbeat_at' => null,
                        'status' => DownloadJobStatus::Queued,
                        'metadata' => $metadata
                    ]);
                    
                    $this->info("  ✓ Recovered: Job returned to queued status");
                    $recovered++;
                    
                    // Log the recovery
                    \Log::info("Download job recovered", [
                        'job_id' => $job->id,
                        'previous_status' => $job->status->value,
                        'recovery_attempts' => $recoveryAttempts + 1
                    ]);
                } catch (\Exception $e) {
                    $this->error("  ✗ Failed to recover job: " . $e->getMessage());
                    $failed++;
                }
            } else {
                $this->info("  Would recover: Job returned to queued status");
                $recovered++;
            }
        }

        $this->info("\nRecovery Summary:");
        $this->table(
            ['Action', 'Count'],
            [
                ['Recovered', $recovered],
                ['Already Recovered', $alreadyRecovered],
                ['Failed', $failed],
                ['Total Processed', $recovered + $alreadyRecovered + $failed],
            ]
        );

        // Cleanup stale temporary files
        $this->info("\nCleaning up stale temporary files...");
        $this->cleanupStaleTempFiles($cleanupHours, $dryRun);

        return self::SUCCESS;
    }

    private function cleanupStaleTempFiles(int $hours, bool $dryRun): void
    {
        // Use the standard storage path for downloads instead of the local disk
        $downloadsPath = storage_path('app/downloads');
        
        if (!File::exists($downloadsPath)) {
            $this->info("Downloads directory not found: {$downloadsPath}");
            return;
        }

        $cutoffTime = Carbon::now()->subHours($hours);
        $deletedCount = 0;
        $errorCount = 0;
        
        // Walk through all user directories in downloads
        foreach (File::directories($downloadsPath) as $userDir) {
            // Walk through all job directories in user directory
            foreach (File::directories($userDir) as $jobDir) {
                // Get job ID from directory name
                $jobId = basename($jobDir);
                
                // Check if this job still exists in the database
                $jobExists = DownloadJob::where('id', $jobId)->exists();
                
                try {
                    // Look for .part files in this directory
                    $partFiles = File::glob("{$jobDir}/*.part");
                    
                    foreach ($partFiles as $partFile) {
                        $fileName = basename($partFile);
                        
                        // Check if file is old enough to be considered stale
                        $fileModifiedTime = Carbon::createFromTimestamp(File::lastModified($partFile));
                        $isFileStale = $fileModifiedTime->isBefore($cutoffTime);
                        
                        // For existing jobs, check if they're stale (claimed or processing with stale heartbeat)
                        // For non-existing jobs, we can safely delete all .part files that are old enough
                        $shouldDelete = false;
                        if ($jobExists) {
                            $job = DownloadJob::find($jobId);
                            // Check if job is in a terminal state (completed, failed, cancelled, skipped)
                            $isTerminalJob = $job && in_array($job->status, [
                                DownloadJobStatus::Completed,
                                DownloadJobStatus::Failed,
                                DownloadJobStatus::Cancelled,
                                DownloadJobStatus::Skipped,
                                DownloadJobStatus::PartiallyCompleted
                            ]);
                            
                            // For non-terminal jobs, check if they're stale (claimed or processing with stale heartbeat)
                            $isStaleJob = $job && !$isTerminalJob && in_array($job->status, [DownloadJobStatus::Claimed, DownloadJobStatus::Processing]) &&
                                $job->analysis_client_heartbeat_at &&
                                Carbon::parse($job->analysis_client_heartbeat_at)->isBefore($cutoffTime);
                                
                            // Check if job was recently recovered (within the last few minutes)
                            // This handles the case where job recovery happened before file cleanup
                            $wasRecentlyRecovered = false;
                            if ($job && isset($job->metadata['last_recovery_at'])) {
                                $lastRecoveryAt = Carbon::parse($job->metadata['last_recovery_at']);
                                // Consider recently recovered jobs (within last 10 minutes) as stale for file cleanup
                                $wasRecentlyRecovered = $lastRecoveryAt->isAfter(Carbon::now()->subMinutes(10));
                            }
                            
                            // Delete .part files for stale jobs, recently recovered jobs, or terminal jobs
                            $shouldDelete = ($isStaleJob || $wasRecentlyRecovered || $isTerminalJob) && $isFileStale;
                        } else {
                            // If job doesn't exist, we can safely delete all .part files that are old enough
                            $shouldDelete = $isFileStale;
                        }
                        
                        // Delete .part files for stale jobs or orphaned jobs
                        if ($shouldDelete) {
                            if (!$dryRun) {
                                if (File::delete($partFile)) {
                                    $deletedCount++;
                                } else {
                                    $errorCount++;
                                }
                            } else {
                                $deletedCount++;
                            }
                        }
                    }
                } catch (\Exception $e) {
                    $errorCount++;
                }
            }
        }
        
        $this->info("Temporary file cleanup complete: {$deletedCount} files deleted, {$errorCount} errors");
    }
}