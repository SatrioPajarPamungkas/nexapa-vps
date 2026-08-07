<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppearanceTheme;
use App\Services\AppearanceThemeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class PublicAppearanceController extends Controller
{
    public function __construct(
        private AppearanceThemeService $themeService
    ) {}

    public function companyTheme(): JsonResponse
    {
        $data = Cache::remember('public:appearance:company', 120, function () {
            return $this->themeService->getCompanyThemeResponseData(config('app.url'));
        });

        return response()->json([
            'success' => true,
            'data' => [
                'theme' => $data,
            ],
        ])->header('Cache-Control', 'public, max-age=120');
    }

    public function companyWallpaper(AppearanceTheme $theme): \Symfony\Component\HttpFoundation\StreamedResponse|JsonResponse
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

        if (!\Illuminate\Support\Facades\Storage::disk($disk)->exists($path)) {
            return response()->json([
                'success' => false,
                'message' => 'Wallpaper file not found.',
            ], 404);
        }

        $mimeType = \Illuminate\Support\Facades\Storage::disk($disk)->mimeType($path) ?? $theme->settings['mime_type'] ?? 'image/jpeg';

        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
        if (!in_array($mimeType, $allowed, true)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid wallpaper mime.',
            ], 404);
        }

        $fileSize = \Illuminate\Support\Facades\Storage::disk($disk)->size($path);

        $headers = [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=86400',
            'Content-Disposition' => 'inline',
            'Content-Length' => $fileSize,
            'X-Content-Type-Options' => 'nosniff',
        ];

        $stream = function () use ($disk, $path) {
            $handle = \Illuminate\Support\Facades\Storage::disk($disk)->readStream($path);
            if ($handle) {
                fpassthru($handle);
                fclose($handle);
            }
        };

        return response()->stream($stream, 200, $headers);
    }
}
