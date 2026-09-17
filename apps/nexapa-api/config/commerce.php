<?php

return [
    'checkout_expiry_minutes' => (int) env(
        'COMMERCE_CHECKOUT_EXPIRY_MINUTES',
        15,
    ),

    'storefront_url' => rtrim(
        env('COMMERCE_STOREFRONT_URL', 'https://store.nexapa.app'),
        '/',
    ),

    /*
     * Beri waktu bagi webhook pembayaran yang terlambat masuk
     * sebelum reservasi stok dilepaskan.
     */
    'order_release_grace_minutes' => (int) env(
        'COMMERCE_ORDER_RELEASE_GRACE_MINUTES',
        5,
    ),

    'midtrans' => [
        'server_key' => env('MIDTRANS_SERVER_KEY'),
        'client_key' => env('MIDTRANS_CLIENT_KEY'),
        'is_production' => (bool) env('MIDTRANS_IS_PRODUCTION', false),

        'snap_url' => env(
            'MIDTRANS_SNAP_URL',
            env('MIDTRANS_IS_PRODUCTION', false)
                ? 'https://app.midtrans.com/snap/v1'
                : 'https://app.sandbox.midtrans.com/snap/v1',
        ),

        'api_url' => env(
            'MIDTRANS_API_URL',
            env('MIDTRANS_IS_PRODUCTION', false)
                ? 'https://api.midtrans.com/v2'
                : 'https://api.sandbox.midtrans.com/v2',
        ),

        'subscription_notification_url' => env(
            'MIDTRANS_SUBSCRIPTION_NOTIFICATION_URL',
            'https://api.nexapa.app/api/v1/subscription/payments/midtrans/notification',
        ),
    ],
];
