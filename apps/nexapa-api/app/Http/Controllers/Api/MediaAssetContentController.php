<?php

namespace App\Http\Controllers\Api;

use App\Enums\MediaAssetStatus;
use App\Http\Controllers\Controller;
use App\Models\MediaAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaAssetContentController extends Controller
{
    public function content(MediaAsset $mediaAsset, Request $request): StreamedResponse|JsonResponse
    {
        abort_unless($request->user()?->is($mediaAsset->user), 404);

        if (! in_array($mediaAsset->status, [
            MediaAssetStatus::Available,
            MediaAssetStatus::Archived,
        ], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Media asset is not available.',
            ], 404);
        }

        $disk = $mediaAsset->storage_disk;
        $path = $mediaAsset->storage_path;

        if (! $this->isValidStoragePath($disk, $path)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid storage path.',
            ], 404);
        }

        if (! \Storage::disk($disk)->exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Media file not found.',
            ], 404);
        }

        $mimeType = $mediaAsset->mime_type ?? \Storage::disk($disk)->mimeType($path) ?? 'application/octet-stream';
        $fileName = $mediaAsset->original_name;
        $isDownload = $request->boolean('download', false);

        $headers = [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=86400',
        ];

        if ($isDownload) {
            $headers['Content-Disposition'] = 'attachment; filename="' . $this->sanitizeFileName($fileName) . '"';
        } else {
            $headers['Content-Disposition'] = 'inline; filename="' . $this->sanitizeFileName($fileName) . '"';
        }

        $fileSize = \Storage::disk($disk)->size($path);

        $start = null;
        $end = null;

        if ($request->hasHeader('Range')) {
            $rangeHeader = $request->header('Range');
            if (preg_match('/bytes=(\d*)-(\d*)/', $rangeHeader, $matches)) {
                $start = $matches[1] !== '' ? (int) $matches[1] : null;
                $end = $matches[2] !== '' ? (int) $matches[2] : null;

                if ($start !== null && $end === null) {
                    $end = $fileSize - 1;
                } elseif ($start === null && $end !== null) {
                    $start = $fileSize - $end;
                    $end = $fileSize - 1;
                }

                if ($start !== null && $end !== null && $start > $end) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid range.',
                    ], 416);
                }
            }
        }

        if ($start !== null && $end !== null) {
            $headers['Content-Range'] = "bytes {$start}-{$end}/{$fileSize}";
            $headers['Content-Length'] = $end - $start + 1;
            $headers['Accept-Ranges'] = 'bytes';

            $stream = function () use ($disk, $path, $start, $end) {
                $handle = \Storage::disk($disk)->readStream($path);
                if ($handle) {
                    fseek($handle, $start);
                    $remaining = $end - $start + 1;
                    $chunkSize = 8192;
                    while ($remaining > 0 && !feof($handle)) {
                        $bytesToRead = min($chunkSize, $remaining);
                        echo fread($handle, $bytesToRead);
                        $remaining -= $bytesToRead;
                    }
                    fclose($handle);
                }
            };

            return response()->stream($stream, 206, $headers);
        }

        $headers['Content-Length'] = $fileSize;
        $headers['Accept-Ranges'] = 'bytes';

        $stream = function () use ($disk, $path) {
            $handle = \Storage::disk($disk)->readStream($path);
            if ($handle) {
                fpassthru($handle);
                fclose($handle);
            }
        };

        return response()->stream($stream, 200, $headers);
    }

    public function thumbnail(MediaAsset $mediaAsset, Request $request): StreamedResponse|JsonResponse
    {
        abort_unless($request->user()?->is($mediaAsset->user), 404);

        if (! $mediaAsset->thumbnail_path) {
            return response()->json([
                'success' => false,
                'message' => 'Thumbnail not available.',
            ], 404);
        }

        $disk = $mediaAsset->storage_disk;
        $path = $mediaAsset->thumbnail_path;

        if (! $this->isValidStoragePath($disk, $path)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid storage path.',
            ], 404);
        }

        if (! \Storage::disk($disk)->exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Thumbnail file not found.',
            ], 404);
        }

        $mimeType = \Storage::disk($disk)->mimeType($path) ?? 'image/jpeg';

        $headers = [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=86400',
            'Content-Disposition' => 'inline',
        ];

        $fileSize = \Storage::disk($disk)->size($path);
        $headers['Content-Length'] = $fileSize;

        $stream = function () use ($disk, $path) {
            $handle = \Storage::disk($disk)->readStream($path);
            if ($handle) {
                fpassthru($handle);
                fclose($handle);
            }
        };

        return response()->stream($stream, 200, $headers);
    }

    private function isValidStoragePath(string $disk, string $path): bool
    {
        $allowedDisks = config('nexapa.allowed_storage_disks', ['local', 'public']);
        $allowedPrefixes = config('nexapa.allowed_storage_path_prefixes', ['media', 'thumbnails', 'downloads']);

        if (! in_array($disk, $allowedDisks)) {
            return false;
        }

        $normalizedPath = ltrim($path, '/') ;
        $firstSegment = explode('/', $normalizedPath)[0] ?? '';

        if (! in_array($firstSegment, $allowedPrefixes)) {
            return false;
        }

        $diskRoot = config("filesystems.disks.{$disk}.root");

        if (! is_string($diskRoot) || $diskRoot === '') {
            return false;
        }

        $storageBase = realpath($diskRoot);
        $realPath = $storageBase !== false
            ? realpath($storageBase.DIRECTORY_SEPARATOR.$normalizedPath)
            : false;

        if ($realPath === false || $storageBase === false) {
            return false;
        }

        return $realPath === $storageBase
            || str_starts_with($realPath, $storageBase.DIRECTORY_SEPARATOR);
    }

    private function sanitizeFileName(string $fileName): string
    {
        return preg_replace('/[^\w\.\-]/', '_', $fileName);
    }
}
