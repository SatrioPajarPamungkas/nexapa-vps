<?php

namespace App\Filament\Widgets;

use App\Models\ConnectedAccount;
use App\Models\PublisherPost;
use App\Models\User;
use Filament\Widgets\Widget;

class PrimaryMetrics extends Widget
{
    protected static string $view = 'filament.widgets.primary-metrics';

    protected static ?int $sort = 1;

    protected int | string | array $columnSpan = [
        'default' => 1,
        'sm' => 2,
        'md' => 12,
        'lg' => 12,
        'xl' => 12,
    ];

    protected static ?string $pollingInterval = '30s';

    public int $totalUsers = 0;
    public int $connectedAccounts = 0;
    public int $queuedCount = 0;
    public int $failedCount = 0;
    public ?string $failedPostsUrl = null;

    public function mount(): void
    {
        $this->loadMetrics();
    }

    protected function loadMetrics(): void
    {
        $this->totalUsers = User::count();
        $this->connectedAccounts = ConnectedAccount::count();

        // Real statuses from PublisherPost model/resource: draft, scheduled, queued, uploading, processing, publishing, completed, failed, cancelled
        $this->queuedCount = PublisherPost::whereIn('status', [
            'scheduled',
            'queued',
            'uploading',
            'processing',
            'publishing',
        ])->count();

        $this->failedCount = PublisherPost::where('status', 'failed')->count();

        // Only generate filter URL if resource supports filter (it does - SelectFilter status)
        try {
            $this->failedPostsUrl = \App\Filament\Resources\PublisherPostResource::getUrl('index', [
                'tableFilters' => ['status' => ['value' => 'failed']],
            ]);
        } catch (\Throwable $e) {
            $this->failedPostsUrl = null;
        }
    }

    public function getColumnSpan(): int | string | array
    {
        return [
            'default' => 1,
            'sm' => 2,
            'md' => 12,
            'lg' => 12,
            'xl' => 12,
        ];
    }
}
