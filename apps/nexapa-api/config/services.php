<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google_auth_enabled' =>
        env('GOOGLE_AUTH_ENABLED', false),

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'crm_supabase' => [
        'url' => env('CRM_SUPABASE_URL'),
        'service_role_key' => env('CRM_SUPABASE_SERVICE_ROLE_KEY'),
        'timeout' => (int) env('CRM_SUPABASE_TIMEOUT', 10),
        'cache_ttl' => (int) env('CRM_SUPABASE_CACHE_TTL', 45),
    ],

    'nexapa_internal' => [
        'entitlement_key' =>
            env('NEXAPA_ENTITLEMENT_KEY'),
        'crm_auth_key' =>
            env('NEXAPA_CRM_AUTH_KEY'),
        'owner_crm_user_id' =>
            env('NEXAPA_OWNER_CRM_USER_ID'),
    ],

];
