<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FacebookSettingsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $hasStoredSecret = !empty($this->facebook_app_secret);
        
        return [
            'app_id' => $this->facebook_app_id ?? '',
            'app_secret' => $hasStoredSecret ? str_repeat('•', 8) : '',
            'has_stored_secret' => $hasStoredSecret,
            'configuration_id' => $this->facebook_configuration_id ?? null,
            'graph_api_version' => $this->facebook_graph_api_version ?? 'v21.0',
            'callback_url' => config('nexapa.facebook.callback_url', 'https://api.nexapa.me/api/v1/oauth/facebook/callback'),
        ];
    }
}
