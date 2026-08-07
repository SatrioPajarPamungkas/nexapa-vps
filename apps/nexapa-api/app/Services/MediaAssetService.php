<?php

namespace App\Services;

use App\Enums\MediaAssetStatus;
use App\Models\DownloadJob;
use App\Models\MediaAsset;
use Illuminate\Support\Facades\Storage;

class MediaAssetService
{
    public function createFromWorkerCompletion(DownloadJob $job, array $mediaData): MediaAsset
    {
        $this->validateStoragePath($mediaData['storage_path'] ?? '', $mediaData['storage_disk'] ?? 'local');

        return MediaAsset::create([
            'user_id' => $job->user_id,
            'download_job_id' => $job->id,
            'display_name' => $mediaData['display_name'] ?? $job->original_input,
            'original_name' => $mediaData['original_name'] ?? 'unknown',
            'media_type' => $mediaData['media_type'] ?? 'video',
            'mime_type' => $mediaData['mime_type'] ?? null,
            'storage_disk' => $mediaData['storage_disk'] ?? 'local',
            'storage_path' => $mediaData['storage_path'],
            'public_url' => $mediaData['public_url'] ?? null,
            'thumbnail_path' => $mediaData['thumbnail_path'] ?? null,
            'file_size' => $mediaData['file_size'] ?? null,
            'width' => $mediaData['width'] ?? null,
            'height' => $mediaData['height'] ?? null,
            'duration_seconds' => $mediaData['duration_seconds'] ?? null,
            'source_platform' => $mediaData['source_platform'] ?? $job->platform->value,
            'source_url' => $mediaData['source_url'] ?? $job->normalized_url,
            'status' => MediaAssetStatus::Available,
            'metadata' => $mediaData['metadata'] ?? null,
        ]);
    }

    private function validateStoragePath(string $path, string $disk): void
    {
        $allowedDisks = config('nexapa.allowed_storage_disks', ['local', 'public']);
        $allowedPrefixes = config('nexapa.allowed_storage_path_prefixes', ['media', 'thumbnails', 'downloads']);

        if (! in_array($disk, $allowedDisks)) {
            throw new \InvalidArgumentException("Storage disk [{$disk}] is not allowed");
        }

        $normalizedPath = ltrim($path, '/');
        $firstSegment = explode('/', $normalizedPath)[0] ?? '';

        if (! in_array($firstSegment, $allowedPrefixes)) {
            throw new \InvalidArgumentException("Storage path prefix [{$firstSegment}] is not allowed");
        }
    }

    public function delete(MediaAsset $mediaAsset): void
    {
        if ($mediaAsset->storage_path) {
            Storage::disk($mediaAsset->storage_disk)->delete($mediaAsset->storage_path);
        }
        if ($mediaAsset->thumbnail_path) {
            Storage::disk($mediaAsset->storage_disk)->delete($mediaAsset->thumbnail_path);
        }
        $infoPath = preg_replace('/\.[^.]+$/', '.info.json', $mediaAsset->storage_path);
        if ($infoPath && Storage::disk($mediaAsset->storage_disk)->exists($infoPath)) {
            Storage::disk($mediaAsset->storage_disk)->delete($infoPath);
        }
        $mediaAsset->delete();
    }
}
