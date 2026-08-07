<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeveloperSettings\UpdateTikTokSettingsRequest;
use App\Http\Requests\DeveloperSettings\UpdateFacebookSettingsRequest;
use App\Http\Resources\TikTokSettingsResource;
use App\Http\Resources\FacebookSettingsResource;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;

class DeveloperSettingsController extends Controller
{
    public function __construct(private SettingsService $settingsService)
    {
    }

    public function getTikTokSettings(): JsonResponse
    {
        $settings = $this->settingsService->getTikTokSettings();

        return response()->json([
            'success' => true,
            'message' => 'TikTok settings retrieved successfully',
            'data' => new TikTokSettingsResource((object) $settings),
        ]);
    }

    public function updateTikTokSettings(UpdateTikTokSettingsRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $validated['has_stored_secret'] = $request->boolean('has_stored_secret', false);
        
        $settings = $this->settingsService->updateTikTokSettings($validated);

        return response()->json([
            'success' => true,
            'message' => 'TikTok settings saved successfully',
            'data' => new TikTokSettingsResource((object) $settings),
        ]);
    }

    public function getFacebookSettings(): JsonResponse
    {
        $settings = $this->settingsService->getFacebookSettings();

        return response()->json([
            'success' => true,
            'message' => 'Facebook settings retrieved successfully',
            'data' => new FacebookSettingsResource((object) $settings),
        ]);
    }

    public function updateFacebookSettings(UpdateFacebookSettingsRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $validated['has_stored_secret'] = $request->boolean('has_stored_secret', false);
        
        $settings = $this->settingsService->updateFacebookSettings($validated);

        return response()->json([
            'success' => true,
            'message' => 'Facebook settings saved successfully',
            'data' => new FacebookSettingsResource((object) $settings),
        ]);
    }
}