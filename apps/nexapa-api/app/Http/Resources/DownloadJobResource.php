<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DownloadJobResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Temporary Downloader outputs take priority over legacy MediaAsset counts.
        $metadata = is_array($this->metadata) ? $this->metadata : [];
        $temporaryOutputs = $metadata['temporary_outputs'] ?? [];

        if (is_array($temporaryOutputs) && $temporaryOutputs !== []) {
            $mediaAssetsCountValue = app(
                \App\Services\TemporaryDownloadOutputService::class
            )->countExistingOutputs($this->resource);
        } else {
            $mediaAssetsCount = $this->whenCounted('mediaAssets');

            $mediaAssetsCountValue = is_numeric($mediaAssetsCount)
                ? (int) $mediaAssetsCount
                : 0;
        }

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'mode' => $this->mode->value,
            'batch_id' => $this->batch_id,
            'parent_download_job_id' => $this->parent_download_job_id,
            'original_input' => $this->original_input,
            'normalized_url' => $this->normalized_url,
            'platform' => $this->platform->value,
            'source_type' => $this->source_type->value,
            'output_format' => $this->output_format->value,
            'quality' => $this->quality->value,
            'filename_mode' => $this->filename_mode,
            'delay_seconds' => $this->delay_seconds,
            'status' => $this->status->value,
            'progress' => $this->progress,
            'current_stage' => $this->current_stage,
            'error_code' => $this->error_code,
            'error_message' => $this->error_message,
            'retry_count' => $this->retry_count,
            'max_retries' => $this->max_retries,
            'claimed_at' => $this->claimed_at?->toISOString(),
            'started_at' => $this->started_at?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'cancelled_at' => $this->cancelled_at?->toISOString(),
            'metadata' => $this->metadata,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
            'results_count' => $this->whenCounted('results'),
            'media_assets_count' => $mediaAssetsCountValue,
            'has_downloadable_file' => $this->resource->hasDownloadableFile(),
        ];
    }
}
