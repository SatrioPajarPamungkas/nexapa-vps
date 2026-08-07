<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DownloadResultResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Eager load child jobs to prevent N+1 queries
        if (! $this->relationLoaded('childDownloadJob')) {
            $this->load('childDownloadJob');
        }

        $childJob = $this->childDownloadJob->first();

        return [
            'id' => $this->id,
            'download_job_id' => $this->download_job_id,
            'external_id' => $this->external_id,
            'title' => $this->title,
            'source_url' => $this->source_url,
            'thumbnail_url' => $this->thumbnail_url,
            'media_type' => $this->media_type,
            'duration_seconds' => $this->duration_seconds,
            'published_at' => $this->published_at?->toISOString(),
            'selected' => $this->selected,
            'status' => $this->status->value,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
            // Authoritative fields for determining if result has child or is queued
            'child_job_id' => $childJob?->id,
            'batch_id' => $childJob?->batch_id,
            'is_queued' => $childJob !== null,
        ];
    }
}
