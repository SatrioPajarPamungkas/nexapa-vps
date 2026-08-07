<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SystemHealth extends Widget
{
    protected static string $view = 'filament.widgets.system-health';

    protected static ?int $sort = 4;

    protected int | string | array $columnSpan = [
        'default' => 1,
        'sm' => 2,
        'md' => 12,
        'lg' => 8,
        'xl' => 8,
    ];

    public array $checks = [];

    public function mount(): void
    {
        $checks = [];

        // API / Application - proven if app boots (this widget renders) => configured
        $checks[] = [
            'key' => 'api',
            'label' => 'API / Application',
            'status' => 'Operational',
            'state' => 'ok',
            'detail' => config('app.env') . ' · Laravel ' . app()->version(),
        ];

        // Database - real check via SELECT 1
        try {
            DB::select('SELECT 1');
            $checks[] = [
                'key' => 'database',
                'label' => 'Database',
                'status' => 'Connected',
                'state' => 'ok',
                'detail' => config('database.default'),
            ];
        } catch (\Throwable $e) {
            $checks[] = [
                'key' => 'database',
                'label' => 'Database',
                'status' => 'Unavailable',
                'state' => 'error',
                'detail' => 'Connection failed',
            ];
        }

        // Queue - check jobs table exists
        try {
            DB::table('jobs')->count();
            $heartbeat = Cache::get('system_health.queue_worker_last_seen');
            if ($heartbeat) {
                try {
                    $parsed = \Carbon\Carbon::parse($heartbeat);
                    $isRecent = $parsed->gt(now()->subMinutes(10));
                    $checks[] = [
                        'key' => 'queue',
                        'label' => 'Queue',
                        'status' => $isRecent ? 'Active' : 'Stale',
                        'state' => $isRecent ? 'ok' : 'warning',
                        'detail' => 'Last heartbeat ' . $parsed->diffForHumans(),
                    ];
                } catch (\Throwable $e) {
                    $checks[] = [
                        'key' => 'queue',
                        'label' => 'Queue',
                        'status' => 'Connected',
                        'state' => 'ok',
                        'detail' => config('queue.default'),
                    ];
                }
            } else {
                $checks[] = [
                    'key' => 'queue',
                    'label' => 'Queue',
                    'status' => 'Connected',
                    'state' => 'ok',
                    'detail' => config('queue.default'),
                ];
            }
        } catch (\Throwable $e) {
            $checks[] = [
                'key' => 'queue',
                'label' => 'Queue',
                'status' => 'Not checked',
                'state' => 'neutral',
                'detail' => 'Queue table unavailable',
            ];
        }

        // Scheduler - reuse existing logic, never label operational unless proven
        $schedulerLastRun = Cache::get('publisher_scheduler_last_run_at') ?? Cache::get('system_health.scheduler_last_seen');
        if ($schedulerLastRun) {
            try {
                $parsed = \Carbon\Carbon::parse($schedulerLastRun);
                $isRecent = $parsed->gt(now()->subHour());
                $checks[] = [
                    'key' => 'scheduler',
                    'label' => 'Scheduler',
                    'status' => $isRecent ? 'Active' : 'Stale',
                    'state' => $isRecent ? 'ok' : 'warning',
                    'detail' => 'Last run ' . $parsed->diffForHumans(),
                ];
            } catch (\Throwable $e) {
                $checks[] = [
                    'key' => 'scheduler',
                    'label' => 'Scheduler',
                    'status' => 'Not checked',
                    'state' => 'neutral',
                    'detail' => 'Unable to parse heartbeat',
                ];
            }
        } else {
            $checks[] = [
                'key' => 'scheduler',
                'label' => 'Scheduler',
                'status' => 'Not checked',
                'state' => 'neutral',
                'detail' => 'No heartbeat found',
            ];
        }

        // Storage - real check is_writable
        try {
            $writable = is_writable(storage_path());
            $checks[] = [
                'key' => 'storage',
                'label' => 'Storage',
                'status' => $writable ? 'Writable' : 'Not writable',
                'state' => $writable ? 'ok' : 'error',
                'detail' => storage_path(),
            ];
        } catch (\Throwable $e) {
            $checks[] = [
                'key' => 'storage',
                'label' => 'Storage',
                'status' => 'Not checked',
                'state' => 'neutral',
                'detail' => 'Unable to check storage',
            ];
        }

        // Email - only claim configured if mail.default truthy, never claim operational
        $mailDefault = config('mail.default');
        if ($mailDefault) {
            $checks[] = [
                'key' => 'email',
                'label' => 'Email',
                'status' => 'Configured',
                'state' => 'ok',
                'detail' => $mailDefault,
            ];
        } else {
            $checks[] = [
                'key' => 'email',
                'label' => 'Email',
                'status' => 'Not checked',
                'state' => 'neutral',
                'detail' => 'Mail driver not set',
            ];
        }

        $this->checks = $checks;
    }
}
