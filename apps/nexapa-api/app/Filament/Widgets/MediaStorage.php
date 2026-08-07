<?php

namespace App\Filament\Widgets;

use App\Models\MediaAsset;
use Filament\Widgets\Widget;

class MediaStorage extends Widget
{
    protected static string $view = 'filament.widgets.media-storage';

    protected static ?int $sort = 5;

    protected int | string | array $columnSpan = [
        'default' => 1,
        'sm' => 2,
        'md' => 12,
        'lg' => 4,
        'xl' => 4,
    ];

    public int $totalAssets = 0;
    public int $videoCount = 0;
    public int $imageCount = 0;
    public string $totalSizeFormatted = '0 KB';
    public int $totalSizeBytes = 0;
    public int $usedMedia = 0;
    public int $unusedMedia = 0;

    public function mount(): void
    {
        $this->totalAssets = MediaAsset::count();

        // media_type field inspected from model + migration - values: video, image etc
        $this->videoCount = MediaAsset::where('media_type', 'video')->count();
        $this->imageCount = MediaAsset::where('media_type', 'image')->count();

        $bytes = MediaAsset::sum('file_size');
        $this->totalSizeBytes = (int) $bytes;
        $this->totalSizeFormatted = $this->formatBytes((int) $bytes);

        // Reuse existing relationships: has('posts') proven in MediaStatsOverview backup and MediaAsset model activePosts()
        $this->usedMedia = MediaAsset::has('posts')->count();
        $this->unusedMedia = MediaAsset::doesntHave('posts')->count();
    }

    protected function formatBytes(int $bytes): string
    {
        if ($bytes <= 0) {
            return '0 KB';
        }
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        }
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }
}
