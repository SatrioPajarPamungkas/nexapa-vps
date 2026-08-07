<?php

namespace App\Filament\Widgets;

use App\Models\PublisherPost;
use Filament\Widgets\Widget;

class PublishingOperations extends Widget
{
    protected static string $view = 'filament.widgets.publishing-operations';

    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = [
        'default' => 1,
        'sm' => 2,
        'md' => 12,
        'lg' => 8,
        'xl' => 8,
    ];

    public array $statusCounts = [];
    public int $totalPosts = 0;

    /**
     * Real statuses proven from app/Filament/Resources/PublisherPostResource.php and app/Models/PublisherPost.php
     * draft, scheduled, queued, uploading, processing, publishing, completed, failed, cancelled
     */
    public const STATUS_CONFIG = [
        'completed' => ['label' => 'Published', 'color' => '#10b981', 'bg' => 'rgba(16,185,129,0.9)'],
        'scheduled' => ['label' => 'Scheduled', 'color' => '#3b82f6', 'bg' => 'rgba(59,130,246,0.9)'],
        'queued' => ['label' => 'Queued', 'color' => '#6366f1', 'bg' => 'rgba(99,102,241,0.9)'],
        'processing' => ['label' => 'Processing', 'color' => '#8b5cf6', 'bg' => 'rgba(139,92,246,0.9)'],
        'uploading' => ['label' => 'Uploading', 'color' => '#06b6d4', 'bg' => 'rgba(6,182,214,0.9)'],
        'publishing' => ['label' => 'Publishing', 'color' => '#0ea5e9', 'bg' => 'rgba(14,165,233,0.9)'],
        'failed' => ['label' => 'Failed', 'color' => '#ef4444', 'bg' => 'rgba(239,68,68,0.9)'],
        'cancelled' => ['label' => 'Cancelled', 'color' => '#6b7280', 'bg' => 'rgba(107,114,128,0.9)'],
        'draft' => ['label' => 'Draft', 'color' => '#9ca3af', 'bg' => 'rgba(156,163,175,0.9)'],
    ];

    public function mount(): void
    {
        // Single grouped query to avoid N+1
        $grouped = PublisherPost::selectRaw('status, COUNT(*) as cnt')
            ->groupBy('status')
            ->pluck('cnt', 'status')
            ->toArray();

        $this->totalPosts = array_sum($grouped);

        // Build only statuses that exist in DB / have >0 or are known proven
        $result = [];
        foreach (self::STATUS_CONFIG as $key => $cfg) {
            $count = $grouped[$key] ?? 0;
            // Include if count >0 OR if it's a core operational status we want to show even at 0?
            // Spec says: Do not create fake zero-value categories when status does not exist.
            // We'll show only if count>0, except we always show major ones if they exist in DB historically?
            // To be safe: show only if count>0, but also include any status key that is present in grouped.
            // However for UX we want to show the bar even if some are 0, as long as total>0.
            // Interpretation: don't invent statuses not in model. All our statuses are proven.
            // We'll show statuses where count>0, but also if total=0 show nothing.
            $result[$key] = [
                'key' => $key,
                'label' => $cfg['label'],
                'color' => $cfg['color'],
                'bg' => $cfg['bg'],
                'count' => $count,
            ];
        }

        // Filter to only statuses with count>0 to avoid fake zero categories, plus sort by count desc but keep logical order?
        // Keep defined order, but only include those with count>0
        $filtered = array_filter($result, fn($r) => $r['count'] > 0);

        // If no posts at all, keep empty -> view will show empty state
        $this->statusCounts = $filtered;
    }
}
