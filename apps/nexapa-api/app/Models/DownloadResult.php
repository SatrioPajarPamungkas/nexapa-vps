<?php

namespace App\Models;

use App\Enums\DownloadResultStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DownloadResult extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';

    protected $fillable = [
        'download_job_id',
        'external_id',
        'title',
        'source_url',
        'thumbnail_url',
        'media_type',
        'duration_seconds',
        'published_at',
        'selected',
        'status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'status' => DownloadResultStatus::class,
            'selected' => 'boolean',
            'duration_seconds' => 'integer',
            'published_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function downloadJob(): BelongsTo
    {
        return $this->belongsTo(DownloadJob::class);
    }

    public function childDownloadJob(): HasMany
    {
        return $this->hasMany(DownloadJob::class, 'download_result_id');
    }
}
