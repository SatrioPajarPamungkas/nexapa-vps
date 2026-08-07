<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppearanceThemeResource extends JsonResource
{
    private ?string $baseUrl = null;

    public function withBaseUrl(?string $baseUrl): self
    {
        $this->baseUrl = $baseUrl;
        return $this;
    }

    public function toArray(Request $request): array
    {
        $theme = $this->resource;

        $backgroundUrl = null;

        if ($theme->background_type === 'static_image' && $theme->background_path && $this->baseUrl) {
            $backgroundUrl = rtrim($this->baseUrl, '/') . '/api/v1/appearance/wallpapers/' . $theme->getKey() . '/content';
        }

        return [
            'id' => $theme->getKey(),
            'name' => $theme->name,
            'background_type' => $theme->background_type,
            'background_url' => $backgroundUrl,
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
            'created_at' => $theme->created_at?->toISOString(),
            'updated_at' => $theme->updated_at?->toISOString(),
        ];
    }
}
