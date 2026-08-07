<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConnectedAccountResource extends JsonResource
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
            'platform' => $this->platform,
            'account_type' => $this->account_type,
            'external_account_id' => $this->external_account_id,
            'display_name' => $this->display_name,
            'username' => $this->username,
            'avatar_url' => $this->whenNotNull($this->avatar_url),
            'status' => $this->status,
            'connection_method' => $this->connection_method,
            'is_default' => $this->is_default,
            'is_publishable' => $this->isSelectableForPublishing(),
            'last_validated_at' => $this->whenNotNull($this->last_validated_at?->toISOString()),
            'metadata' => $this->whenNotNull($this->metadata),
            'scopes' => $this->whenNotNull($this->scopes),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}