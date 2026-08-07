<?php

namespace App\Filament\Widgets;

use App\Models\ConnectedAccount;
use App\Models\PublisherPost;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class NeedsAttention extends Widget
{
    protected static string $view = 'filament.widgets.needs-attention';

    protected static ?int $sort = 3;

    protected int | string | array $columnSpan = [
        'default' => 1,
        'sm' => 2,
        'md' => 12,
        'lg' => 4,
        'xl' => 4,
    ];

    public array $issues = [];
    public bool $allOperational = true;

    public function mount(): void
    {
        $issues = [];

        // 1. Failed PublisherPosts - real actionable
        $failedPostsCount = PublisherPost::where('status', 'failed')->count();
        if ($failedPostsCount > 0) {
            try {
                $url = \App\Filament\Resources\PublisherPostResource::getUrl('index', [
                    'tableFilters' => ['status' => ['value' => 'failed']],
                ]);
            } catch (\Throwable $e) {
                $url = null;
            }
            $issues[] = [
                'type' => 'failed_posts',
                'title' => 'Failed publish attempts',
                'count' => $failedPostsCount,
                'explanation' => $failedPostsCount === 1 ? '1 post failed to publish' : "{$failedPostsCount} posts failed to publish",
                'color' => 'danger',
                'url' => $url,
            ];
        }

        // 2. Failed queue jobs - only if failed_jobs table exists
        try {
            $failedJobsCount = DB::table('failed_jobs')->count();
            if ($failedJobsCount > 0) {
                try {
                    $queueUrl = \App\Filament\Pages\QueueMonitor::getUrl();
                } catch (\Throwable $e) {
                    $queueUrl = null;
                }
                $issues[] = [
                    'type' => 'failed_jobs',
                    'title' => 'Failed queue jobs',
                    'count' => $failedJobsCount,
                    'explanation' => 'Jobs in failed_jobs require review',
                    'color' => 'danger',
                    'url' => $queueUrl,
                ];
            }
        } catch (\Throwable $e) {
            // table absent - do not include
        }

        // 3. Disconnected / expired connected accounts - reliable field: status != connected
        // Proven: statuses from migration: connected, expired, error, disconnected
        $disconnectedCount = ConnectedAccount::where('status', '!=', 'connected')->count();
        if ($disconnectedCount > 0) {
            try {
                $accUrl = \App\Filament\Resources\ConnectedAccountResource::getUrl('index', [
                    'tableFilters' => ['status' => ['value' => 'disconnected']],
                ]);
            } catch (\Throwable $e) {
                // fallback without filter if filter not supported
                try {
                    $accUrl = \App\Filament\Resources\ConnectedAccountResource::getUrl('index');
                } catch (\Throwable $e2) {
                    $accUrl = null;
                }
            }
            $issues[] = [
                'type' => 'disconnected_accounts',
                'title' => 'Disconnected accounts',
                'count' => $disconnectedCount,
                'explanation' => 'Accounts need reconnection or validation',
                'color' => 'warning',
                'url' => $accUrl,
            ];
        }

        // 4. Expired tokens - reliable field token_expires_at
        $expiredTokens = ConnectedAccount::whereNotNull('token_expires_at')
            ->where('token_expires_at', '<', now())
            ->count();
        if ($expiredTokens > 0 && $expiredTokens !== $disconnectedCount) {
            // Only add if not already covered by disconnected count to avoid double counting same issue
            // But expired tokens deserve explicit mention if status still says connected
            $stillConnectedExpired = ConnectedAccount::where('status', 'connected')
                ->whereNotNull('token_expires_at')
                ->where('token_expires_at', '<', now())
                ->count();
            if ($stillConnectedExpired > 0) {
                $issues[] = [
                    'type' => 'expired_tokens',
                    'title' => 'Expired tokens',
                    'count' => $stillConnectedExpired,
                    'explanation' => 'Access tokens have expired',
                    'color' => 'warning',
                    'url' => $accUrl ?? null,
                ];
            }
        }

        // 5. Scheduler / worker failure only when existing System Health logic can prove it
        // Reuse logic from SystemHealth page: cache keys
        $schedulerLastRun = Cache::get('publisher_scheduler_last_run_at') ?? Cache::get('system_health.scheduler_last_seen');
        if ($schedulerLastRun) {
            try {
                $lastRun = \Carbon\Carbon::parse($schedulerLastRun);
                if ($lastRun->lt(now()->subHours(2))) {
                    $issues[] = [
                        'type' => 'scheduler_stale',
                        'title' => 'Scheduler heartbeat stale',
                        'count' => null,
                        'explanation' => 'Last scheduler run was ' . $lastRun->diffForHumans(),
                        'color' => 'warning',
                        'url' => null,
                    ];
                }
            } catch (\Throwable $e) {
                // ignore parse errors
            }
        }
        // Do NOT fake scheduler failure when cache missing - treat as not checked

        $workerLastSeen = Cache::get('system_health.queue_worker_last_seen');
        if ($workerLastSeen) {
            try {
                $lastSeen = \Carbon\Carbon::parse($workerLastSeen);
                if ($lastSeen->lt(now()->subMinutes(10))) {
                    $issues[] = [
                        'type' => 'worker_stale',
                        'title' => 'Queue worker heartbeat stale',
                        'count' => null,
                        'explanation' => 'Last worker heartbeat ' . $lastSeen->diffForHumans(),
                        'color' => 'warning',
                        'url' => null,
                    ];
                }
            } catch (\Throwable $e) {
                // ignore
            }
        }

        $this->issues = $issues;
        $this->allOperational = count($issues) === 0;
    }
}
