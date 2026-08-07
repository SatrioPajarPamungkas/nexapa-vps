<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppearanceTheme extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'scope_type',
        'scope_id',
        'name',
        'preset_key',
        'background_type',
        'background_path',
        'fallback_image_path',
        'background_position',
        'background_size',
        'background_attachment',
        'card_opacity',
        'card_blur',
        'sidebar_opacity',
        'topbar_opacity',
        'overlay_opacity',
        'animation_speed',
        'motion_intensity',
        'settings',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'scope_id' => 'integer',
            'card_opacity' => 'integer',
            'card_blur' => 'integer',
            'sidebar_opacity' => 'integer',
            'topbar_opacity' => 'integer',
            'overlay_opacity' => 'integer',
            'animation_speed' => 'float',
            'motion_intensity' => 'integer',
            'settings' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function isBuiltin(): bool
    {
        return $this->background_type === 'builtin' && $this->preset_key !== null;
    }

    public function isCustomUpload(): bool
    {
        return in_array($this->background_type, ['static_image', 'image'], true) && $this->preset_key === null;
    }
}
