<?php

return [
    'frontend_url' => env('FRONTEND_URL', 'https://app.nexapa.app'),
    'worker_token' => env('NEXAPA_WORKER_TOKEN', ''),
    'tiktok' => [
        'client_key' => env('TIKTOK_CLIENT_KEY'),
        'client_secret' => env('TIKTOK_CLIENT_SECRET'),
        'redirect_uri' => env('TIKTOK_REDIRECT_URI', 'http://localhost:3000/callback/tiktok'),
        'authorization_url' => 'https://www.tiktok.com/v2/auth/authorize/',
        'token_url' => 'https://open.tiktokapis.com/v2/oauth/token/',
        'revoke_url' => 'https://open.tiktokapis.com/v2/user/revoke/',
        'user_info_url' => 'https://open.tiktokapis.com/v2/user/info/',
        'scopes' => ['user.info.basic'],
        'environment' => env('TIKTOK_ENVIRONMENT', 'development'),
    ],
    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect_uri' => env('FACEBOOK_REDIRECT_URI', 'http://localhost:3000/callback/facebook'),
        'authorization_url' => 'https://www.facebook.com/v18.0/dialog/oauth',
        'token_url' => 'https://graph.facebook.com/v18.0/oauth/access_token',
    ],
    'allowed_storage_path_prefixes' => [
        'media',
        'thumbnails',
        'downloads',
        'publisher-media',
    ],

]; ?>
