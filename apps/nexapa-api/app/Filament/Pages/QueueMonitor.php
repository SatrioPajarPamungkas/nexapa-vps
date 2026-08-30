<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use Illuminate\Support\Facades\DB;

class QueueMonitor extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-queue-list';

    protected static string $view = 'filament.pages.queue-monitor';

    protected static ?string $navigationLabel = 'Queue Monitor';

    protected static ?int $navigationSort = 6;

    protected static ?string $navigationGroup = 'Operasional Sistem';

    public static function canAccess(): bool
    {
        return auth()->user()?->is_admin === true;
    }

    public function getTitle(): string
    {
        return 'Queue Monitor';
    }

    public function getHeading(): string
    {
        return 'Queue Monitor';
    }

    public function getSubheading(): string
    {
        return 'Monitor and manage queue jobs';
    }

    public function getQueueConnection(): string
    {
        return config('queue.default');
    }

    public function getPendingJobsCount(): int
    {
        try {
            return DB::table('jobs')->count();
        } catch (\Exception $e) {
            return 0;
        }
    }

    public function getFailedJobsCount(): int
    {
        try {
            return DB::table('failed_jobs')->count();
        } catch (\Exception $e) {
            return 0;
        }
    }
}
