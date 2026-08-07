<?php

namespace App\Http\Resources;

use App\Enums\DownloadResultStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DownloadJobDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $results = $this->whenLoaded('results');
        $mediaAssets = $this->whenLoaded('mediaAssets');

        $discoveredCount = null;
        $selectedCount = null;
        $availableMediaAssetsCount = null;

        if ($results) {
            $discoveredCount = $results->where('status', DownloadResultStatus::Discovered)->count();
            $selectedCount = $results->where('selected', true)->count();
        }

        if ($this->resource->relationLoaded('mediaAssets')) {
            $availableMediaAssetsCount = $this->resource
                ->downloadableMediaAssets()
                ->count();
        }

        return [
            'id' => $this->id,
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
            'created_at' => $this->created_at->toISOString(),
            'discovered_results_count' => $discoveredCount,
            'selected_results_count' => $selectedCount,
            'available_media_assets_count' => $availableMediaAssetsCount,
            'has_downloadable_file' => $this->resource->hasDownloadableFile(),
            'results' => DownloadResultResource::collection($results),
            'media_assets' => $this->getMediaAssetsRepresentation(),
        ];
    }

    /**
     * Get the appropriate media assets representation.
     * For jobs with temporary outputs, returns virtual media assets.
     * For legacy jobs, returns the actual media assets.
     */
    private function getMediaAssetsRepresentation()
    {
        // Check if we have temporary outputs in metadata
        $temporaryOutputs = $this->metadata['temporary_outputs'] ?? [];

        if (is_array($temporaryOutputs) && !empty($temporaryOutputs)) {
            // Use virtual media assets for temporary outputs.
            $service = app(
                \App\Services\TemporaryDownloadOutputService::class
            );

            $virtualMediaAssets = $service->getVirtualMediaAssets(
                $this->resource
            );

            // Preserve the download_url field expected by the current frontend.
            return array_map(
                static function (array $asset): array {
                    if (
                        empty($asset['download_url'])
                        && ! empty($asset['content_url'])
                    ) {
                        $asset['download_url'] = $asset['content_url'];
                    }

                    return $asset;
                },
                $virtualMediaAssets
            );
        }

        // For legacy jobs, return actual media assets
        $mediaAssets = $this->whenLoaded('mediaAssets');
        if ($mediaAssets) {
            return MediaAssetResource::collection($mediaAssets);
        }

        return [];
    }
}
