<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SettingsService
{
    public function getTikTokSettings(): array
    {
        $defaults = [
            'tiktok_client_key' => '',
            'tiktok_client_secret' => '',
            'tiktok_environment' => 'sandbox',
        ];

        $keys = array_keys($defaults);
        $settings = Setting::whereIn('key', $keys)->get()->pluck('value', 'key');

        return array_merge($defaults, $settings->toArray());
    }

    public function updateTikTokSettings(array $data): array
    {
        $settings = [
            'tiktok_client_key' => $data['client_key'],
            'tiktok_environment' => $data['environment'],
        ];

        if (isset($data['client_secret']) && $data['client_secret'] !== '') {
            $settings['tiktok_client_secret'] = $data['client_secret'];
        }

        DB::transaction(function () use ($settings) {
            foreach ($settings as $key => $value) {
                Setting::updateOrCreate(['key' => $key], ['value' => $value]);
            }
        });

        return $this->getTikTokSettings();
    }

    public function getFacebookSettings(): array
    {
        $defaults = [
            'facebook_app_id' => '',
            'facebook_app_secret' => '',
            'facebook_configuration_id' => null,
            'facebook_graph_api_version' => 'v21.0',
        ];

        $keys = array_keys($defaults);
        $settings = Setting::whereIn('key', $keys)->get()->pluck('value', 'key');

        return array_merge($defaults, $settings->toArray());
    }

    public function updateFacebookSettings(array $data): array
    {
        $settings = [
            'facebook_app_id' => $data['app_id'],
            'facebook_graph_api_version' => $data['graph_api_version'],
        ];

        if (isset($data['configuration_id']) && $data['configuration_id'] !== '') {
            $settings['facebook_configuration_id'] = $data['configuration_id'];
        } else {
            $settings['facebook_configuration_id'] = null;
        }

        if (isset($data['app_secret']) && $data['app_secret'] !== '') {
            $settings['facebook_app_secret'] = $data['app_secret'];
        }

        DB::transaction(function () use ($settings) {
            foreach ($settings as $key => $value) {
                Setting::updateOrCreate(['key' => $key], ['value' => $value]);
            }
        });

        return $this->getFacebookSettings();
    }
}