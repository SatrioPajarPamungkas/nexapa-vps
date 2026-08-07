<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class SystemHealth extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-heart';

    protected static string $view = 'filament.pages.system-health';

    protected static ?string $navigationLabel = 'System Health';

    protected static ?int $navigationSort = 7;

    protected static ?string $navigationGroup = 'System';

    public static function canAccess(): bool
    {
        return auth()->user()?->is_admin === true;
    }

    public function getTitle(): string
    {
        return 'System Health';
    }

    public function getHeading(): string
    {
        return 'System Health';
    }

    public function getSubheading(): string
    {
        return 'Monitor system health status';
    }

    public function getLaravelVersion(): string
    {
        return app()->version();
    }

    public function getPhpVersion(): string
    {
        return PHP_VERSION;
    }

    public function getAppEnv(): string
    {
        return ucfirst(config('app.env'));
    }

    public function getDatabaseStatus(): string
    {
        try {
            DB::select('SELECT 1');
            return 'Connected';
        } catch (\Exception $e) {
            return 'Unavailable';
        }
    }

    public function getQueueConnection(): string
    {
        return config('queue.default');
    }

    public function getWorkerHeartbeat(): ?string
    {
        $lastSeen = Cache::get('system_health.queue_worker_last_seen');
        
        if (!$lastSeen) {
            return 'Unknown';
        }

        try {
            $lastSeenTime = \Carbon\Carbon::parse($lastSeen);
            return $lastSeenTime->diffForHumans();
        } catch (\Exception $e) {
            return 'Unknown';
        }
    }

    public function getSchedulerHeartbeat(): ?string
    {
        $lastRun = Cache::get('publisher_scheduler_last_run_at');
        $systemHeartbeat = Cache::get('system_health.scheduler_last_seen');
        
        $lastSeen = $systemHeartbeat ?? $lastRun;

        if (!$lastSeen) {
            return 'Unknown';
        }

        try {
            $lastSeenTime = \Carbon\Carbon::parse($lastSeen);
            return $lastSeenTime->diffForHumans();
        } catch (\Exception $e) {
            return 'Unknown';
        }
    }
}