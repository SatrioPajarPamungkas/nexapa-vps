<?php

namespace App\Models;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadMode;
use App\Enums\DownloadOutputFormat;
use App\Enums\DownloadPlatform;
use App\Enums\DownloadQuality;
use App\Enums\SourceType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\Storage;
use Throwable;

class DownloadJob extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'mode',
        'original_input',
        'normalized_url',
        'platform',
        'source_type',
        'output_format',
        'quality',
        'filename_mode',
        'delay_seconds',
        'status',
        'progress',
        'current_stage',
        'error_code',
        'error_message',
        'retry_count',
        'max_retries',
        'worker_id',
        'claimed_at',
        'started_at',
        'completed_at',
        'cancelled_at',
        'metadata',
        'batch_id',
        'parent_download_job_id',
        'download_result_id',
        'is_batch_work_item',
        'skipped_at',
        'skip_reason',
        'analysis_session_id',
        'analysis_client_heartbeat_at',
    ];

    protected function casts(): array
    {
        return [
            'mode' => DownloadMode::class,
            'platform' => DownloadPlatform::class,
            'source_type' => SourceType::class,
            'output_format' => DownloadOutputFormat::class,
            'quality' => DownloadQuality::class,
            'status' => DownloadJobStatus::class,
            'metadata' => 'array',
            'claimed_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'skipped_at' => 'datetime',
            'analysis_client_heartbeat_at' => 'datetime',
            'batch_id' => 'string',
            'parent_download_job_id' => 'string',
            'download_result_id' => 'string',
            'is_batch_work_item' => 'boolean',
            'progress' => 'integer',
            'retry_count' => 'integer',
            'max_retries' => 'integer',
            'delay_seconds' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function results(): HasMany
    {
        return $this->hasMany(DownloadResult::class);
    }

    public function parentDownloadJob(): BelongsTo
    {
        return $this->belongsTo(DownloadJob::class, 'parent_download_job_id');
    }

    public function childDownloadJobs(): HasMany
    {
        return $this->hasMany(DownloadJob::class, 'parent_download_job_id');
    }

    public function downloadResult(): BelongsTo
    {
        return $this->belongsTo(DownloadResult::class, 'download_result_id');
    }

    public function mediaAssets(): HasMany
    {
        return $this->hasMany(MediaAsset::class);
    }

    /**
     * Media assets whose persisted files satisfy the download contract.
     *
     * @return SupportCollection<int, MediaAsset>
     */
    public function downloadableMediaAssets(): SupportCollection
    {
        if (! in_array($this->status, [
            DownloadJobStatus::Completed,
            DownloadJobStatus::PartiallyCompleted,
        ], true)) {
            return collect();
        }

        $assets = $this->relationLoaded('mediaAssets')
            ? $this->mediaAssets
            : $this->mediaAssets()->get();

        return $assets
            ->filter(static fn (MediaAsset $asset): bool => self::assetFileExists($asset))
            ->values();
    }

    public function hasDownloadableFile(): bool
    {
        return $this->downloadableMediaAssets()->isNotEmpty();
    }

    /**
     * Check the path through its configured disk. Some existing local assets
     * store an app-relative `private/...` path even though the local disk root
     * already points at `storage/app/private`; strip that duplicated segment
     * once, only as a compatibility fallback.
     */
    private static function assetFileExists(MediaAsset $asset): bool
    {
        if ((int) $asset->file_size <= 0) {
            return false;
        }

        $diskName = $asset->storage_disk;
        $storagePath = $asset->storage_path;

        if (! is_string($diskName) || $diskName === ''
            || ! is_string($storagePath) || $storagePath === '') {
            return false;
        }

        try {
            $disk = Storage::disk($diskName);

            if ($disk->exists($storagePath)) {
                return true;
            }

            $normalizedPath = str_replace('\\', '/', $storagePath);
            $diskRoot = str_replace('\\', '/', (string) config("filesystems.disks.{$diskName}.root"));

            return $diskName === 'local'
                && str_ends_with(rtrim($diskRoot, '/'), '/private')
                && str_starts_with($normalizedPath, 'private/')
                && $disk->exists(substr($normalizedPath, strlen('private/')));
        } catch (Throwable) {
            return false;
        }
    }

    public function activityLogs(): HasMany
    {
        return $this->morphMany(ActivityLog::class, 'subject');
    }

    /**
     * Determine if this job is a profile analysis job (top-level parent)
     *
     * @return bool
     */
    public function isProfileAnalysisJob(): bool
    {
        return $this->parent_download_job_id === null
            && $this->download_result_id === null
            && ($this->mode === \App\Enums\DownloadMode::Profile
                || $this->source_type === \App\Enums\SourceType::Profile);
    }

    /**
     * Determine if this job is a media download child job
     *
     * @return bool
     */
    public function isMediaDownloadChild(): bool
    {
        return $this->parent_download_job_id !== null
            && $this->download_result_id !== null;
    }

    /**
     * Determine if this job is a standalone media download job
     *
     * @return bool
     */
    public function isStandaloneMediaDownload(): bool
    {
        return $this->parent_download_job_id === null
            && !$this->isProfileAnalysisJob();
    }

    /**
     * Determine if this job should be counted as a batch work item
     *
     * @return bool
     */
    public function isBatchWorkItem(): bool
    {
        // Count child media jobs
        if ($this->isMediaDownloadChild()) {
            return true;
        }

        // Count standalone media-download jobs
        if ($this->isStandaloneMediaDownload()) {
            return true;
        }

        // Don't count profile-analysis parent/container jobs
        return false;
    }
}
