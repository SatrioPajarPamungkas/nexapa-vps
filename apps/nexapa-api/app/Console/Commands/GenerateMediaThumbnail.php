<?php

namespace App\Console\Commands;

use App\Models\MediaAsset;
use App\Services\VideoThumbnailService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class GenerateMediaThumbnail extends Command
{
    protected $signature = 'media:generate-thumbnail {mediaAssetId}';
    protected $description = 'Generate thumbnail for a specific video media asset';

    public function __construct(
        private VideoThumbnailService $thumbnailService
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $mediaAssetId = $this->argument('mediaAssetId');
        
        $mediaAsset = MediaAsset::find($mediaAssetId);
        
        if (!$mediaAsset) {
            $this->error("Media asset not found: {$mediaAssetId}");
            return self::FAILURE;
        }

        if ($mediaAsset->media_type !== 'video') {
            $this->warn("Media asset is not a video: {$mediaAssetId} (type: {$mediaAsset->media_type})");
            return self::SUCCESS;
        }

        if ($mediaAsset->thumbnail_path) {
            $this->warn("Media asset already has a thumbnail: {$mediaAsset->thumbnail_path}");
            $this->ask('Continue anyway?', 'no');
            if (strtolower($this->output->ask('Continue?') ?? 'no') !== 'yes') {
                return self::SUCCESS;
            }
        }

        if (!$mediaAsset->storage_path) {
            $this->error("Media asset has no storage path: {$mediaAssetId}");
            return self::FAILURE;
        }

        $disk = $mediaAsset->storage_disk;
        $videoPath = $mediaAsset->storage_path;

        $this->info("Generating thumbnail for media asset: {$mediaAssetId}");
        $this->info("Video path: {$videoPath} (disk: {$disk})");

        $thumbnailPath = $this->thumbnailService->generateFromVideo($disk, $videoPath);

        if ($thumbnailPath) {
            $mediaAsset->update(['thumbnail_path' => $thumbnailPath]);
            $this->info("✓ Thumbnail generated: {$thumbnailPath}");
            
            $fileExists = Storage::disk($disk)->exists($thumbnailPath);
            $this->info("File exists: " . ($fileExists ? 'yes' : 'no'));
            
            return self::SUCCESS;
        }

        $this->error("Failed to generate thumbnail");
        return self::FAILURE;
    }
}
