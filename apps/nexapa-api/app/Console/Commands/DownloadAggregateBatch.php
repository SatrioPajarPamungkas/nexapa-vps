<?php

namespace App\Console\Commands;

use App\Enums\DownloadJobStatus;
use App\Models\DownloadJob;
use App\Services\DownloadBatchService;
use Illuminate\Console\Command;

class DownloadAggregateBatch extends Command
{
    protected $signature = 'download:aggregate-batch {batchId} 
                            {--user= : Filter by specific user ID}';
    
    protected $description = 'Aggregate batch job statistics and update parent batch status';

    public function __construct(
        private DownloadBatchService $batchService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $batchId = $this->argument('batchId');
        $userId = $this->option('user');

        $this->info("Aggregating batch: {$batchId}");

        // Get batch status
        $status = $this->batchService->getStatus($batchId, $userId);

        if ($status === null) {
            $this->error("Batch not found or access denied.");
            return self::FAILURE;
        }

        // Display current batch status
        $this->info("Batch Status:");
        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Jobs', $status['total_jobs']],
                ['Completed', $status['completed_jobs']],
                ['Skipped', $status['skipped_jobs']],
                ['Failed', $status['failed_jobs']],
                ['Cancelled', $status['cancelled_jobs']],
                ['Processing', $status['processing_jobs']],
                ['Terminal', $status['terminal_jobs']],
                ['Progress %', round($status['progress_percentage'], 2)],
                ['Is Terminal', $status['is_terminal'] ? 'Yes' : 'No'],
                ['Can Download ZIP', $status['can_download_zip'] ? 'Yes' : 'No'],
            ]
        );

        // If batch is terminal, determine final status
        if ($status['is_terminal']) {
            $this->info("\nBatch is terminal. Determining final status...");

            // Get all jobs in the batch
            $jobsQuery = DownloadJob::where('batch_id', $batchId);
            if ($userId) {
                $jobsQuery->where('user_id', $userId);
            }
            $jobs = $jobsQuery->get();

            // Count different job statuses
            $completedCount = $status['completed_jobs'];
            $skippedCount = $status['skipped_jobs'];
            $failedCount = $status['failed_jobs'];
            $totalCount = $status['total_jobs'];

            $this->info("Status breakdown:");
            $this->line("  Completed: {$completedCount}");
            $this->line("  Skipped: {$skippedCount}");
            $this->line("  Failed: {$failedCount}");
            $this->line("  Total: {$totalCount}");

            // Determine final batch status
            if ($completedCount === $totalCount) {
                $finalStatus = 'completed';
                $this->info("✓ All jobs completed successfully.");
            } elseif ($completedCount > 0) {
                $finalStatus = 'partially_completed';
                $this->info("⚠ Some jobs completed, others failed/skipped.");
            } else {
                $finalStatus = 'failed';
                $this->error("✗ No jobs completed.");
            }

            $this->info("Final batch status: {$finalStatus}");

            // Log the aggregation result
            \Log::info("Batch aggregation completed", [
                'batch_id' => $batchId,
                'user_id' => $userId,
                'final_status' => $finalStatus,
                'completed' => $completedCount,
                'skipped' => $skippedCount,
                'failed' => $failedCount,
                'total' => $totalCount,
                'progress_percentage' => $status['progress_percentage'],
            ]);
        } else {
            $this->info("Batch is still processing. Active jobs: {$status['processing_jobs']}");
        }

        return self::SUCCESS;
    }
}