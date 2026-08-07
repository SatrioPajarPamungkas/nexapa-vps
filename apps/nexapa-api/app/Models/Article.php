<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Article extends Model
{
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_PUBLISHED = 'published';

    protected $fillable = [
        'title',
        'slug',
        'excerpt',
        'content',
        'featured_image',
        'category',
        'author_name',
        'status',
        'published_at',
        'is_featured',
        'meta_title',
        'meta_description',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'is_featured' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Article $article): void {
            if ($article->status === self::STATUS_DRAFT) {
                $article->published_at = null;
            }

            if (
                $article->status === self::STATUS_PUBLISHED
                && (
                    $article->published_at === null
                    || $article->published_at->isFuture()
                )
            ) {
                $article->published_at = now();
            }
        });
    }

    public static function statusOptions(): array
    {
        return [
            self::STATUS_DRAFT => 'Draft',
            self::STATUS_SCHEDULED => 'Terjadwal',
            self::STATUS_PUBLISHED => 'Terbit',
        ];
    }

    public function scopePubliclyVisible(Builder $query): Builder
    {
        return $query
            ->whereIn('status', [
                self::STATUS_PUBLISHED,
                self::STATUS_SCHEDULED,
            ])
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function isPubliclyVisible(): bool
    {
        return in_array($this->status, [
            self::STATUS_PUBLISHED,
            self::STATUS_SCHEDULED,
        ], true)
            && $this->published_at !== null
            && $this->published_at->lessThanOrEqualTo(now());
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function getFeaturedImageUrlAttribute(): ?string
    {
        if (!$this->featured_image) {
            return null;
        }

        $storageUrl = Storage::disk('public')->url(
            $this->featured_image
        );

        if (
            str_starts_with($storageUrl, 'http://')
            || str_starts_with($storageUrl, 'https://')
        ) {
            return $storageUrl;
        }

        return url($storageUrl);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }
}
