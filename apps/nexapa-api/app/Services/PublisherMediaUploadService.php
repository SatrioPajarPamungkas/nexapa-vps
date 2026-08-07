<?php

namespace App\Services;

use App\Enums\MediaAssetStatus;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class PublisherMediaUploadService
{
    public function __construct(
        private VideoThumbnailService $thumbnailService
    ) {}

    public function store(User $user, UploadedFile $file): MediaAsset
    {
        $disk = 'local';
        $mimeType = $file->getMimeType();
        $extension = $this->extensionForMime($mimeType);
        $mediaType = str_starts_with($mimeType, 'image/') ? 'image' : 'video';
        $path = sprintf('publisher-media/%s/%s.%s', $user->getKey(), Str::uuid(), $extension);

        if (! Storage::disk($disk)->putFileAs(dirname($path), $file, basename($path))) {
            throw new RuntimeException('Failed to store uploaded media.');
        }

        try {
            return DB::transaction(function () use ($user, $disk, $path, $mimeType, $mediaType, $file, $extension) {
                $thumbnailPath = null;

                if ($mediaType === 'video') {
                    $thumbnailPath = $this->thumbnailService->generateFromVideo($disk, $path);
                }

                return MediaAsset::create([
                    'user_id' => $user->getKey(),
                    'display_name' => $this->sanitizeDisplayName(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)),
                    'original_name' => $this->sanitizeOriginalFilename($file->getClientOriginalName(), $extension),
                    'media_type' => $mediaType,
                    'mime_type' => $mimeType,
                    'storage_disk' => $disk,
                    'storage_path' => $path,
                    'thumbnail_path' => $thumbnailPath,
                    'file_size' => $file->getSize(),
                    'status' => MediaAssetStatus::Available,
                ]);
            });
        } catch (Throwable $exception) {
            Storage::disk($disk)->delete($path);

            throw $exception;
        }
    }

    private function extensionForMime(string $mimeType): string
    {
        return match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'video/mp4' => 'mp4',
            'video/quicktime' => 'mov',
            'video/webm' => 'webm',
            default => throw new RuntimeException('Unsupported uploaded media type.'),
        };
    }

    private function sanitizeDisplayName(string $name): string
    {
        $name = preg_replace('/[^\pL\pN _.-]+/u', '_', $name) ?? '';

        return Str::limit(trim($name, " ._\t\n\r\0\x0B"), 100, '') ?: 'media';
    }

    private function sanitizeOriginalFilename(string $name, string $extension): string
    {
        $base = $this->sanitizeDisplayName(pathinfo($name, PATHINFO_FILENAME));

        return $base.'.'.$extension;
    }
}
