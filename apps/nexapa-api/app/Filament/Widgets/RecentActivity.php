<?php

namespace App\Filament\Widgets;

use App\Models\ActivityLog;
use Filament\Widgets\Widget;

class RecentActivity extends Widget
{
    protected static string $view = 'filament.widgets.recent-activity';

    protected static ?int $sort = 6;

    protected int | string | array $columnSpan = [
        'default' => 1,
        'sm' => 2,
        'md' => 12,
        'lg' => 8,
        'xl' => 8,
    ];

    public array $activities = [];

    public function mount(): void
    {
        try {
            $logs = ActivityLog::with('user')
                ->latest()
                ->take(8)
                ->get();

            $this->activities = $logs->map(function ($log) {
                // Use real description/event/title, don't fabricate from updated_at
                $title = $log->title ?? $log->description ?? $log->action ?? $log->event ?? 'Activity recorded';
                $category = $log->category ?? null;
                $platform = $log->platform ?? null;
                $status = $log->status ?? null;

                return [
                    'id' => $log->id,
                    'title' => $title,
                    'category' => $category,
                    'platform' => $platform,
                    'status' => $status,
                    'description' => $log->description ?? '',
                    'user' => $log->user?->name ?? 'System',
                    'initial' => strtoupper(substr($log->user?->name ?? 'S', 0, 1)),
                    'created_at' => $log->created_at?->diffForHumans(),
                    'created_iso' => $log->created_at?->toIso8601String(),
                ];
            })->toArray();
        } catch (\Throwable $e) {
            $this->activities = [];
        }
    }
}
