<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Appearance\UploadWallpaperRequest;
use App\Http\Resources\AppearanceThemeResource;
use App\Models\AppearanceTheme;
use App\Services\AppearanceThemeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AppearanceWallpaperController extends Controller
{
    public function __construct(
        private AppearanceThemeService $themeService
    ) {}

    public function upload(UploadWallpaperRequest $request): JsonResponse
    {
        $user = $request->user();
        $scope = $request->input('scope', 'user');

        if ($scope === 'company') {
            if (!$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only administrators can upload company wallpapers.',
                ], 403);
            }

            try {
                $theme = $this->themeService->storeCompanyWallpaperUpload($user, $request->file('file'));
                $resource = (new AppearanceThemeResource($theme))->withBaseUrl(config('app.url'));

                return $resource->response()->setStatusCode(201)->setData([
                    'success' => true,
                    'data' => [
                        'theme' => $resource->toArray($request),
                    ],
                ]);
            } catch (\Throwable $e) {
                report($e);
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        try {
            $theme = $this->themeService->storeWallpaperUpload($user, $request->file('file'));

            $resource = (new AppearanceThemeResource($theme))->withBaseUrl(config('app.url'));

            return $resource->response()->setStatusCode(201)->setData([
                'success' => true,
                'data' => [
                    'theme' => $resource->toArray($request),
                ],
            ]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function content(Request $request, AppearanceTheme $theme): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        // Company wallpapers: allow any authenticated user
        if ($theme->scope_type !== 'company') {
            if ((int) $theme->user_id !== (int) $user->getKey()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Wallpaper not found.',
                ], 404);
            }
        }

        if ($theme->background_type !== 'static_image' || !$theme->background_path) {
            return response()->json([
                'success' => false,
                'message' => 'Theme is not a custom wallpaper.',
            ], 404);
        }

        $disk = 'local';
        $path = $theme->background_path;

        if (!$this->isValidStoragePath($disk, $path)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid storage path.',
            ], 404);
        }

        if (!Storage::disk($disk)->exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Wallpaper file not found.',
            ], 404);
        }

        $mimeType = Storage::disk($disk)->mimeType($path) ?? $theme->settings['mime_type'] ?? 'image/jpeg';

        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
        if (!in_array($mimeType, $allowed, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid wallpaper mime.',
            ], 404);
        }

        $fileSize = Storage::disk($disk)->size($path);

        $headers = [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=86400',
            'Content-Disposition' => 'inline',
            'Content-Length' => $fileSize,
            'X-Content-Type-Options' => 'nosniff',
        ];

        $stream = function () use ($disk, $path) {
            $handle = Storage::disk($disk)->readStream($path);
            if ($handle) {
                fpassthru($handle);
                fclose($handle);
            }
        };

        return response()->stream($stream, 200, $headers);
    }

    public function publicContent(AppearanceTheme $theme): StreamedResponse|JsonResponse
    {
        if ($theme->scope_type !== 'company') {
            return response()->json([
                'success' => false,
                'message' => 'Wallpaper not found.',
            ], 404);
        }

        if ($theme->background_type !== 'static_image' || !$theme->background_path) {
            return response()->json([
                'success' => false,
                'message' => 'Theme is not a custom wallpaper.',
            ], 404);
        }

        $disk = 'local';
        $path = $theme->background_path;

        if (!$this->isValidStoragePath($disk, $path)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid storage path.',
            ], 404);
        }

        if (!Storage::disk($disk)->exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Wallpaper file not found.',
            ], 404);
        }

        $mimeType = Storage::disk($disk)->mimeType($path) ?? $theme->settings['mime_type'] ?? 'image/jpeg';

        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
        if (!in_array($mimeType, $allowed, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid wallpaper mime.',
            ], 404);
        }

        $fileSize = Storage::disk($disk)->size($path);

        $headers = [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=86400',
            'Content-Disposition' => 'inline',
            'Content-Length' => $fileSize,
            'X-Content-Type-Options' => 'nosniff',
        ];

        $stream = function () use ($disk, $path) {
            $handle = Storage::disk($disk)->readStream($path);
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
        $allowedPrefixes = config('nexapa.allowed_storage_path_prefixes', ['media', 'thumbnails', 'downloads', 'publisher-media']);

        if (!in_array($disk, $allowedDisks, true)) {
            return false;
        }

        $normalized = ltrim($path, '/');
        $firstSegment = explode('/', $normalized)[0] ?? '';

        if (!in_array($firstSegment, $allowedPrefixes, true)) {
            return false;
        }

        if (str_contains($normalized, '..')) {
            return false;
        }

        $diskRoot = config("filesystems.disks.{$disk}.root");

        if (!is_string($diskRoot) || $diskRoot === '') {
            return false;
        }

        $base = realpath($diskRoot);
        if ($base === false) {
            return false;
        }

        $full = $base . DIRECTORY_SEPARATOR . $normalized;
        $real = realpath(dirname($full));
        if ($real === false) {
            // directory may still be valid if file doesn't exist yet
            return true;
        }

        return $real === $base || str_starts_with($real, $base . DIRECTORY_SEPARATOR) || str_starts_with($full, $base . DIRECTORY_SEPARATOR);
    }
}
