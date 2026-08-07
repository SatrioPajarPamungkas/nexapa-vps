<?php

namespace App\Models;

use App\Enums\MediaAssetStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class MediaAsset extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'download_job_id',
        'display_name',
        'original_name',
        'media_type',
        'mime_type',
        'storage_disk',
        'storage_path',
        'public_url',
        'thumbnail_path',
        'file_size',
        'width',
        'height',
        'duration_seconds',
        'source_platform',
        'source_url',
        'status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'status' => MediaAssetStatus::class,
            'metadata' => 'array',
            'file_size' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'duration_seconds' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function downloadJob(): BelongsTo
    {
        return $this->belongsTo(DownloadJob::class);
    }

    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(
            Collection::class,
            'collection_media_asset'
        );
    }

    public function posts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\PublisherPost::class, 'media_asset_id');
    }

    public function activePosts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->posts()->whereIn('status', ['scheduled', 'queued', 'uploading', 'processing', 'publishing']);
    }
}
