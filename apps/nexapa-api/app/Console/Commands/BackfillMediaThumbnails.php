<?php

namespace App\Console\Commands;

use App\Models\MediaAsset;
use App\Services\VideoThumbnailService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class BackfillMediaThumbnails extends Command
{
    protected $signature = 'media:backfill-thumbnails 
                            {--limit=10 : Maximum number of media assets to process}
                            {--user= : Filter by specific user ID}
                            {--dry-run : Show what would be processed without executing}
                            {--execute : Actually process the thumbnails}';
    
    protected $description = 'Backfill thumbnails for existing video media assets';

    public function __construct(
        private VideoThumbnailService $thumbnailService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $limit = (int) $this->option('limit');
        $userId = $this->option('user');
        $dryRun = !$this->option('execute');

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be made');
            $this->warn('Use --execute to actually generate thumbnails');
        }

        $query = MediaAsset::where('media_type', 'video')
            ->whereNull('thumbnail_path')
            ->orderBy('created_at', 'asc')
            ->limit($limit);

        if ($userId) {
            $query->where('user_id', $userId);
        }

        $mediaAssets = $query->get();

        if ($mediaAssets->isEmpty()) {
            $this->info('No video media assets found that need thumbnails.');
            return self::SUCCESS;
        }

        $this->info("Found {$mediaAssets->count()} video(s) that need thumbnails");
        $this->table(
            ['ID', 'User', 'Storage Path', 'Created At'],
            $mediaAssets->map(fn($m) => [
                substr($m->id, 0, 8) . '...',
                $m->user_id,
                basename($m->storage_path),
                $m->created_at->format('Y-m-d H:i'),
            ])
        );

        if ($dryRun) {
            $this->info("\nRun with --execute to generate thumbnails");
            return self::SUCCESS;
        }

        $generated = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($mediaAssets as $mediaAsset) {
            $this->newLine();
            $this->info("Processing: {$mediaAsset->id} ({$mediaAsset->storage_path})");

            if (!$mediaAsset->storage_path) {
                $this->warn('  ⚠ Skipped: No storage path');
                $skipped++;
                continue;
            }

            $disk = $mediaAsset->storage_disk;
            if (!Storage::disk($disk)->exists($mediaAsset->storage_path)) {
                $this->warn('  ⚠ Skipped: Video file not found on disk');
                $skipped++;
                continue;
            }

            $thumbnailPath = $this->thumbnailService->generateFromVideo($disk, $mediaAsset->storage_path);

            if ($thumbnailPath) {
                $mediaAsset->update(['thumbnail_path' => $thumbnailPath]);
                $this->info('  ✓ Generated: ' . basename($thumbnailPath));
                $generated++;
            } else {
                $this->error('  ✗ Failed to generate thumbnail');
                $failed++;
            }
        }

        $this->newLine();
        $this->table(
            ['Status', 'Count'],
            [
                ['Generated', $generated],
                ['Skipped', $skipped],
                ['Failed', $failed],
                ['Total', $generated + $skipped + $failed],
            ]
        );

        return self::SUCCESS;
    }
}
