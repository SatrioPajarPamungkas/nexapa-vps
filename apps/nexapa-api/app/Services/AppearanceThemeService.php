<?php

namespace App\Services;

use App\Models\AppearanceTheme;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class AppearanceThemeService
{
    public const ALLOWED_PRESET_KEYS = [
        'windows_glass_default',
        'windows_glass_alt',
        'windows_dark_blue',
        'windows_dark_black',
        'windows_light',
        'windows_light_alt',
        'windows_grey',
        'huawei_gradient',
        'luffy',
        'honkai',
        'aurora_blue',
        'windows_flow',
    ];

    public const DEFAULT_THEME = [
        'name' => 'Windows Glass',
        'preset_key' => 'windows_glass_default',
        'background_type' => 'builtin',
        'background_position' => 'center',
        'background_size' => 'cover',
        'background_attachment' => 'fixed',
        'card_opacity' => 10,
        'card_blur' => 24,
        'sidebar_opacity' => 65,
        'topbar_opacity' => 5,
        'overlay_opacity' => 2,
        'animation_speed' => 1.0,
        'motion_intensity' => 20,
    ];

    public const ALLOWED_MIME_SNIFF = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/avif' => 'avif',
    ];

    public function getActiveForUser(User $user): ?AppearanceTheme
    {
        return AppearanceTheme::forUser($user->getKey())
            ->active()
            ->latest()
            ->first();
    }

    public function listForUser(User $user)
    {
        return AppearanceTheme::forUser($user->getKey())
            ->orderBy('is_active', 'desc')
            ->orderByDesc('updated_at')
            ->get();
    }

    public function createForUser(User $user, array $data): AppearanceTheme
    {
        return DB::transaction(function () use ($user, $data) {
            if (!empty($data['preset_key']) && !in_array($data['preset_key'], self::ALLOWED_PRESET_KEYS, true)) {
                throw new RuntimeException('Invalid preset key.');
            }

            if (($data['background_type'] ?? null) === 'builtin' && empty($data['preset_key'])) {
                throw new RuntimeException('Builtin theme requires preset_key.');
            }

            // custom static_image must have background_path validated separately (upload flow)
            $theme = AppearanceTheme::create(array_merge([
                'user_id' => $user->getKey(),
                'scope_type' => 'user',
                'scope_id' => null,
                'is_active' => false,
                'settings' => null,
            ], $data));

            return $theme;
        });
    }

    public function updateForUser(AppearanceTheme $theme, array $data): AppearanceTheme
    {
        return DB::transaction(function () use ($theme, $data) {
            if (array_key_exists('preset_key', $data) && $data['preset_key'] !== null && !in_array($data['preset_key'], self::ALLOWED_PRESET_KEYS, true)) {
                throw new RuntimeException('Invalid preset key.');
            }

            // Prevent changing ownership or scope to non-user
            unset($data['user_id'], $data['scope_type'], $data['scope_id'], $data['is_active']);

            $theme->fill($data);
            $theme->save();

            return $theme;
        });
    }

    public function activateForUser(User $user, AppearanceTheme $theme): AppearanceTheme
    {
        return DB::transaction(function () use ($user, $theme) {
            if ((int) $theme->user_id !== (int) $user->getKey()) {
                throw new RuntimeException('Ownership violation.');
            }

            AppearanceTheme::forUser($user->getKey())->update(['is_active' => false]);
            $theme->is_active = true;
            $theme->save();

            return $theme;
        });
    }

    public function resetForUser(User $user): void
    {
        DB::transaction(function () use ($user) {
            AppearanceTheme::forUser($user->getKey())->update(['is_active' => false]);
        });
    }

    public function deleteForUser(User $user, AppearanceTheme $theme): void
    {
        DB::transaction(function () use ($user, $theme) {
            if ((int) $theme->user_id !== (int) $user->getKey()) {
                throw new RuntimeException('Ownership violation.');
            }

            // Refresh from DB to ensure we have latest is_active after potential reset
            $fresh = AppearanceTheme::find($theme->getKey());
            if (!$fresh) {
                throw new RuntimeException('Theme not found.');
            }

            if ($fresh->is_active) {
                throw new RuntimeException('Cannot delete active theme. Reset first.');
            }

            $backgroundPath = $fresh->background_path;
            $fresh->delete();

            if ($backgroundPath) {
                $stillUsed = AppearanceTheme::forUser($user->getKey())
                    ->where('background_path', $backgroundPath)
                    ->exists();

                if (!$stillUsed) {
                    $disk = 'local';
                    if (Storage::disk($disk)->exists($backgroundPath)) {
                        Storage::disk($disk)->delete($backgroundPath);
                    }
                }
            }
        });
    }

    public function storeWallpaperUpload(User $user, UploadedFile $file): AppearanceTheme
    {
        $disk = 'local';

        // Server-side MIME sniff (not extension)
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $detectedMime = $finfo ? finfo_file($finfo, $file->getRealPath()) : null;
        if ($finfo) {
            finfo_close($finfo);
        }

        if (!isset(self::ALLOWED_MIME_SNIFF[$detectedMime])) {
            throw new RuntimeException('Unsupported image type detected: '.$detectedMime);
        }

        // Resolution check
        $imageInfo = @getimagesize($file->getRealPath());
        if ($imageInfo === false) {
            throw new RuntimeException('Invalid image file.');
        }

        [$width, $height] = $imageInfo;

        if ($width < 1920 || $height < 1080) {
            throw new RuntimeException('Image resolution must be at least 1920x1080.');
        }

        if ($width > 7680 || $height > 4320) {
            throw new RuntimeException('Image resolution must not exceed 7680x4320.');
        }

        $ext = self::ALLOWED_MIME_SNIFF[$detectedMime];
        $uuid = (string) Str::uuid();
        $path = sprintf('appearance-wallpapers/%s/%s.%s', $user->getKey(), $uuid, $ext);

        if (!Storage::disk($disk)->putFileAs(dirname($path), $file, basename($path))) {
            throw new RuntimeException('Failed to store wallpaper.');
        }

        try {
            $theme = DB::transaction(function () use ($user, $path, $file, $width, $height, $detectedMime, $ext) {
                $safeOriginalName = $this->sanitizeOriginalName($file->getClientOriginalName(), $ext);

                return AppearanceTheme::create([
                    'user_id' => $user->getKey(),
                    'scope_type' => 'user',
                    'scope_id' => null,
                    'name' => pathinfo($safeOriginalName, PATHINFO_FILENAME) ?: 'My Wallpaper',
                    'preset_key' => null,
                    'background_type' => 'static_image',
                    'background_path' => $path,
                    'fallback_image_path' => null,
                    'background_position' => 'center',
                    'background_size' => 'cover',
                    'background_attachment' => 'fixed',
                    'card_opacity' => self::DEFAULT_THEME['card_opacity'],
                    'card_blur' => self::DEFAULT_THEME['card_blur'],
                    'sidebar_opacity' => self::DEFAULT_THEME['sidebar_opacity'],
                    'topbar_opacity' => self::DEFAULT_THEME['topbar_opacity'],
                    'overlay_opacity' => self::DEFAULT_THEME['overlay_opacity'],
                    'animation_speed' => self::DEFAULT_THEME['animation_speed'],
                    'motion_intensity' => self::DEFAULT_THEME['motion_intensity'],
                    'settings' => [
                        'original_name' => $safeOriginalName,
                        'mime_type' => $detectedMime,
                        'width' => $width,
                        'height' => $height,
                        'file_size' => $file->getSize(),
                    ],
                    'is_active' => false,
                ]);
            });

            return $theme;
        } catch (\Throwable $e) {
            Storage::disk($disk)->delete($path);
            throw $e;
        }
    }

    private function sanitizeOriginalName(string $name, string $ext): string
    {
        $base = pathinfo($name, PATHINFO_FILENAME);
        $base = preg_replace('/[^\pL\pN _.-]+/u', '_', $base) ?? 'wallpaper';
        $base = trim($base, " ._\t\n\r\0\x0B");
        $base = $base === '' ? 'wallpaper' : $base;
        $base = Str::limit($base, 80, '');

        return $base . '.' . $ext;
    }

    public function buildResponseData(?AppearanceTheme $theme, string $baseUrl, bool $includeUrl = true): array
    {
        if ($theme === null) {
            return $this->defaultResponseData($baseUrl);
        }

        $bgUrl = null;
        if ($includeUrl) {
            $bgUrl = $this->resolveBackgroundUrl($theme, $baseUrl);
        }

        return [
            'id' => $theme->getKey(),
            'name' => $theme->name,
            'background_type' => $theme->background_type,
            'background_url' => $bgUrl,
            'preset_key' => $theme->preset_key,
            'background_position' => $theme->background_position,
            'background_size' => $theme->background_size,
            'background_attachment' => $theme->background_attachment,
            'card_opacity' => (int) $theme->card_opacity,
            'card_blur' => (int) $theme->card_blur,
            'sidebar_opacity' => (int) $theme->sidebar_opacity,
            'topbar_opacity' => (int) $theme->topbar_opacity,
            'overlay_opacity' => (int) $theme->overlay_opacity,
            'animation_speed' => (float) $theme->animation_speed,
            'motion_intensity' => (int) $theme->motion_intensity,
            'is_active' => (bool) $theme->is_active,
            'is_builtin' => $theme->background_type === 'builtin' || $theme->background_type === 'animated_gradient',
        ];
    }

    public function defaultResponseData(?string $baseUrl = null): array
    {
        return [
            'id' => null,
            'name' => self::DEFAULT_THEME['name'],
            'background_type' => self::DEFAULT_THEME['background_type'],
            'background_url' => null,
            'preset_key' => self::DEFAULT_THEME['preset_key'],
            'background_position' => self::DEFAULT_THEME['background_position'],
            'background_size' => self::DEFAULT_THEME['background_size'],
            'background_attachment' => self::DEFAULT_THEME['background_attachment'],
            'card_opacity' => self::DEFAULT_THEME['card_opacity'],
            'card_blur' => self::DEFAULT_THEME['card_blur'],
            'sidebar_opacity' => self::DEFAULT_THEME['sidebar_opacity'],
            'topbar_opacity' => self::DEFAULT_THEME['topbar_opacity'],
            'overlay_opacity' => self::DEFAULT_THEME['overlay_opacity'],
            'animation_speed' => (float) self::DEFAULT_THEME['animation_speed'],
            'motion_intensity' => self::DEFAULT_THEME['motion_intensity'],
            'is_active' => true,
            'is_builtin' => true,
        ];
    }

    public function resolveBackgroundUrl(AppearanceTheme $theme, string $baseUrl): ?string
    {
        if ($theme->background_type === 'static_image' && $theme->background_path) {
            $trimmed = rtrim($baseUrl, '/');
            return $trimmed . '/api/v1/appearance/wallpapers/' . $theme->getKey() . '/content';
        }

        // builtin & animated_gradient handled frontend via preset_key
        return null;
    }

    public function resolveStoragePath(AppearanceTheme $theme): ?string
    {
        if ($theme->background_type === 'static_image' && $theme->background_path) {
            return $theme->background_path;
        }

        return null;
    }

    // ─── Company scope ───────────────────────────────────────────────

    public function getActiveCompanyTheme(): ?AppearanceTheme
    {
        return AppearanceTheme::where('scope_type', 'company')
            ->whereNull('scope_id')
            ->active()
            ->latest()
            ->first();
    }

    public function getCompanyThemeResponseData(?string $baseUrl = null): array
    {
        $theme = $this->getActiveCompanyTheme();

        if ($theme === null) {
            return $this->companyDefaultResponseData($baseUrl);
        }

        return $this->buildCompanyResponseData($theme, $baseUrl);
    }

    public function buildCompanyResponseData(AppearanceTheme $theme, ?string $baseUrl = null): array
    {
        $bgUrl = null;
        if ($theme->background_type === 'static_image' && $theme->background_path && $baseUrl) {
            $bgUrl = rtrim($baseUrl, '/') . '/api/v1/public/appearance/company/wallpaper/' . $theme->getKey();
        }

        return [
            'name' => $theme->name,
            'preset_key' => $theme->preset_key,
            'background_type' => $theme->background_type,
            'background_url' => $bgUrl,
            'background_position' => $theme->background_position,
            'background_size' => $theme->background_size,
            'card_opacity' => (int) $theme->card_opacity,
            'card_blur' => (int) $theme->card_blur,
            'navbar_opacity' => (int) $theme->topbar_opacity,
            'overlay_opacity' => (int) $theme->overlay_opacity,
            'animation_speed' => (float) $theme->animation_speed,
            'motion_intensity' => (int) $theme->motion_intensity,
        ];
    }

    public function companyDefaultResponseData(?string $baseUrl = null): array
    {
        return [
            'name' => self::DEFAULT_THEME['name'],
            'preset_key' => self::DEFAULT_THEME['preset_key'],
            'background_type' => self::DEFAULT_THEME['background_type'],
            'background_url' => null,
            'background_position' => self::DEFAULT_THEME['background_position'],
            'background_size' => self::DEFAULT_THEME['background_size'],
            'card_opacity' => self::DEFAULT_THEME['card_opacity'],
            'card_blur' => self::DEFAULT_THEME['card_blur'],
            'navbar_opacity' => self::DEFAULT_THEME['topbar_opacity'],
            'overlay_opacity' => self::DEFAULT_THEME['overlay_opacity'],
            'animation_speed' => (float) self::DEFAULT_THEME['animation_speed'],
            'motion_intensity' => self::DEFAULT_THEME['motion_intensity'],
        ];
    }

    public function createCompanyTheme(User $admin, array $data): AppearanceTheme
    {
        return DB::transaction(function () use ($admin, $data) {
            if (!empty($data['preset_key']) && !in_array($data['preset_key'], self::ALLOWED_PRESET_KEYS, true)) {
                throw new RuntimeException('Invalid preset key.');
            }

            if (($data['background_type'] ?? null) === 'builtin' && empty($data['preset_key'])) {
                throw new RuntimeException('Builtin theme requires preset_key.');
            }

            return AppearanceTheme::create(array_merge([
                'user_id' => $admin->getKey(),
                'scope_type' => 'company',
                'scope_id' => null,
                'is_active' => false,
                'settings' => null,
                'sidebar_opacity' => self::DEFAULT_THEME['sidebar_opacity'],
            ], $data));
        });
    }

    public function activateCompanyTheme(User $admin, AppearanceTheme $theme): AppearanceTheme
    {
        return DB::transaction(function () use ($admin, $theme) {
            if ($theme->scope_type !== 'company') {
                throw new RuntimeException('Theme is not a company theme.');
            }

            // Deactivate all company themes
            AppearanceTheme::where('scope_type', 'company')
                ->whereNull('scope_id')
                ->update(['is_active' => false]);

            $theme->is_active = true;
            $theme->save();

            return $theme;
        });
    }

    public function resetCompanyTheme(User $admin): void
    {
        DB::transaction(function () {
            AppearanceTheme::where('scope_type', 'company')
                ->whereNull('scope_id')
                ->update(['is_active' => false]);
        });
    }

    public function deleteCompanyTheme(User $admin, AppearanceTheme $theme): void
    {
        DB::transaction(function () use ($admin, $theme) {
            if ($theme->scope_type !== 'company') {
                throw new RuntimeException('Theme is not a company theme.');
            }

            $fresh = AppearanceTheme::find($theme->getKey());
            if (!$fresh) {
                throw new RuntimeException('Theme not found.');
            }

            if ($fresh->is_active) {
                throw new RuntimeException('Cannot delete active company theme. Reset first.');
            }

            $backgroundPath = $fresh->background_path;
            $fresh->delete();

            if ($backgroundPath) {
                $stillUsed = AppearanceTheme::where('background_path', $backgroundPath)->exists();
                if (!$stillUsed) {
                    $disk = 'local';
                    if (Storage::disk($disk)->exists($backgroundPath)) {
                        Storage::disk($disk)->delete($backgroundPath);
                    }
                }
            }
        });
    }

    public function storeCompanyWallpaperUpload(User $admin, UploadedFile $file): AppearanceTheme
    {
        $disk = 'local';

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $detectedMime = $finfo ? finfo_file($finfo, $file->getRealPath()) : null;
        if ($finfo) {
            finfo_close($finfo);
        }

        if (!isset(self::ALLOWED_MIME_SNIFF[$detectedMime])) {
            throw new RuntimeException('Unsupported image type detected: '.$detectedMime);
        }

        $imageInfo = @getimagesize($file->getRealPath());
        if ($imageInfo === false) {
            throw new RuntimeException('Invalid image file.');
        }

        [$width, $height] = $imageInfo;

        if ($width < 1920 || $height < 1080) {
            throw new RuntimeException('Image resolution must be at least 1920x1080.');
        }

        if ($width > 7680 || $height > 4320) {
            throw new RuntimeException('Image resolution must not exceed 7680x4320.');
        }

        $ext = self::ALLOWED_MIME_SNIFF[$detectedMime];
        $uuid = (string) Str::uuid();
        $path = sprintf('appearance-wallpapers/company/%s.%s', $uuid, $ext);

        if (!Storage::disk($disk)->putFileAs(dirname($path), $file, basename($path))) {
            throw new RuntimeException('Failed to store wallpaper.');
        }

        try {
            return DB::transaction(function () use ($admin, $path, $file, $width, $height, $detectedMime, $ext) {
                $safeOriginalName = $this->sanitizeOriginalName($file->getClientOriginalName(), $ext);

                return AppearanceTheme::create([
                    'user_id' => $admin->getKey(),
                    'scope_type' => 'company',
                    'scope_id' => null,
                    'name' => pathinfo($safeOriginalName, PATHINFO_FILENAME) ?: 'Company Wallpaper',
                    'preset_key' => null,
                    'background_type' => 'static_image',
                    'background_path' => $path,
                    'fallback_image_path' => null,
                    'background_position' => 'center',
                    'background_size' => 'cover',
                    'background_attachment' => 'fixed',
                    'card_opacity' => self::DEFAULT_THEME['card_opacity'],
                    'card_blur' => self::DEFAULT_THEME['card_blur'],
                    'sidebar_opacity' => self::DEFAULT_THEME['sidebar_opacity'],
                    'topbar_opacity' => self::DEFAULT_THEME['topbar_opacity'],
                    'overlay_opacity' => self::DEFAULT_THEME['overlay_opacity'],
                    'animation_speed' => self::DEFAULT_THEME['animation_speed'],
                    'motion_intensity' => self::DEFAULT_THEME['motion_intensity'],
                    'settings' => [
                        'original_name' => $safeOriginalName,
                        'mime_type' => $detectedMime,
                        'width' => $width,
                        'height' => $height,
                        'file_size' => $file->getSize(),
                    ],
                    'is_active' => false,
                ]);
            });
        } catch (\Throwable $e) {
            Storage::disk($disk)->delete($path);
            throw $e;
        }
    }

    public function listCompanyThemes(): \Illuminate\Database\Eloquent\Collection
    {
        return AppearanceTheme::where('scope_type', 'company')
            ->whereNull('scope_id')
            ->orderBy('is_active', 'desc')
            ->orderByDesc('updated_at')
            ->get();
    }
}
