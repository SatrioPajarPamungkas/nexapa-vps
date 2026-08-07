<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TikTokSettingsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'client_key' => $this->tiktok_client_key ?? '',
            'client_secret' => $this->tiktok_client_secret ?? '',
            'environment' => $this->tiktok_environment ?? 'sandbox',
        ];
    }
}
