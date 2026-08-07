<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CollectionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'source_type' => $this->source_type,
            'download_job_id' => $this->download_job_id,
            'profile_url' => $this->profile_url,
            'source_platform' => $this->source_platform,
            'media_count' => isset($this->media_assets_count)
                ? (int) $this->media_assets_count
                : $this->mediaAssets()->count(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
