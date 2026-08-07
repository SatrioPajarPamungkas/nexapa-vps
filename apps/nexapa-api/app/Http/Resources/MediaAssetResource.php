<?php

namespace App\Http\Resources;

use App\Enums\MediaAssetStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MediaAssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $hasContent = $this->storage_path && in_array($this->status, [
            MediaAssetStatus::Available,
            MediaAssetStatus::Archived,
        ], true);
        $hasThumbnail = ! empty($this->thumbnail_path);

        return [
            'id' => $this->id,
            'download_job_id' => $this->download_job_id,
            'display_name' => $this->display_name,
            'original_name' => $this->original_name,
            'original_filename' => $this->original_name,
            'media_type' => $this->media_type,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'size_bytes' => $this->file_size,
            'width' => $this->width,
            'height' => $this->height,
            'duration_seconds' => $this->duration_seconds,
            'source_platform' => $this->source_platform,
            'source_url' => $this->source_url,
            'status' => $this->status->value,
            'created_at' => $this->created_at->toISOString(),
            'content_url' => $hasContent ? route('api.v1.media-assets.content', $this->resource) : null,
            'download_url' => $hasContent ? route('api.v1.media-assets.content', $this->resource) . '?download=1' : null,
            'thumbnail_url' => $hasThumbnail ? route('api.v1.media-assets.thumbnail', $this->resource) : null,
            'usage_count' => (int) ($this->posts_count ?? 0),
            'active_usage_count' => (int) ($this->active_posts_count ?? 0),
            'is_in_use' => (int) ($this->posts_count ?? 0) > 0,
        ];
    }
}
