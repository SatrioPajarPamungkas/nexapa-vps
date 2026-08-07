<?php

namespace App\Filament\Pages;

use Filament\Pages\Dashboard as BaseDashboard;
use Illuminate\Contracts\Support\Htmlable;

class Dashboard extends BaseDashboard
{
    protected static ?string $navigationIcon = 'heroicon-o-home';

    protected static string $view = 'filament.pages.dashboard';

    public function getColumns(): int | string | array
    {
        // 12-column grid to support 8/4 layout as requested:
        // Header row (custom blade) outside widgets, then:
        // [ Total Users ] [ Connected Accounts ] [ Queued ] [ Failed ] => full row (PrimaryMetrics)
        // [ Publishing Operations 8 ][ Needs Attention 4 ]
        // [ System Health 8 ][ Media Storage 4 ]
        // [ Recent Activity 8 ][ Quick Actions 4 ]
        return [
            'default' => 1,
            'sm' => 2,
            'md' => 12,
            'lg' => 12,
            'xl' => 12,
        ];
    }

    public function getTitle(): string
    {
        return 'Nexapa Admin';
    }

    public function getHeading(): string | Htmlable
    {
        return 'Nexapa Admin';
    }

    public function getSubheading(): string | Htmlable | null
    {
        return 'Operational overview and system status';
    }

    public function getWidgets(): array
    {
        return [
            \App\Filament\Widgets\PrimaryMetrics::class,
            \App\Filament\Widgets\PublishingOperations::class,
            \App\Filament\Widgets\NeedsAttention::class,
            \App\Filament\Widgets\SystemHealth::class,
            \App\Filament\Widgets\MediaStorage::class,
            \App\Filament\Widgets\RecentActivity::class,
            \App\Filament\Widgets\QuickActions::class,
        ];
    }

    public static function getNavigationLabel(): string
    {
        return 'Dashboard';
    }
}
