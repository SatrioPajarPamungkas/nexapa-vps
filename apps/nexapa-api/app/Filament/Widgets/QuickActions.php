<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;

class QuickActions extends Widget
{
    protected static string $view = 'filament.widgets.quick-actions';

    protected static ?int $sort = 7;

    protected int | string | array $columnSpan = [
        'default' => 1,
        'sm' => 2,
        'md' => 12,
        'lg' => 4,
        'xl' => 4,
    ];

    public array $actions = [];

    public function mount(): void
    {
        $actions = [];

        // View Failed Posts - only if resource URL can be resolved
        try {
            $actions[] = [
                'label' => 'View Failed Posts',
                'url' => \App\Filament\Resources\PublisherPostResource::getUrl('index', [
                    'tableFilters' => ['status' => ['value' => 'failed']],
                ]),
                'icon' => 'heroicon-o-exclamation-triangle',
                'color' => 'danger',
            ];
        } catch (\Throwable $e) {
            // omit if not resolvable
        }

        // Queue Monitor
        try {
            $actions[] = [
                'label' => 'Queue Monitor',
                'url' => \App\Filament\Pages\QueueMonitor::getUrl(),
                'icon' => 'heroicon-o-queue-list',
                'color' => 'gray',
            ];
        } catch (\Throwable $e) {
            // omit
        }

        // Users
        try {
            $actions[] = [
                'label' => 'Users',
                'url' => \App\Filament\Resources\UserResource::getUrl('index'),
                'icon' => 'heroicon-o-users',
                'color' => 'gray',
            ];
        } catch (\Throwable $e) {
            // omit
        }

        // System Health
        try {
            $actions[] = [
                'label' => 'System Health',
                'url' => \App\Filament\Pages\SystemHealth::getUrl(),
                'icon' => 'heroicon-o-heart',
                'color' => 'gray',
            ];
        } catch (\Throwable $e) {
        }

        // Media Assets
        try {
            $actions[] = [
                'label' => 'Media Assets',
                'url' => \App\Filament\Resources\MediaAssetResource::getUrl('index'),
                'icon' => 'heroicon-o-photo',
                'color' => 'gray',
            ];
        } catch (\Throwable $e) {
        }

        $this->actions = $actions;
    }
}
