<?php

namespace App\Services\OAuth;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class FacebookOAuthStateService
{
    private const CACHE_PREFIX = 'facebook_oauth_state:';
    private const EXPIRY_MINUTES = 10;

    public function generateState(
        string $userId,
        string $mode = 'initial_connect',
        ?string $reconnectAdminAccountId = null,
        ?string $returnTo = null
    ): string {
        $state = Str::random(64);
        $nonce = Str::random(16);

        $payload = [
            'user_id' => $userId,
            'provider' => 'facebook',
            'mode' => $mode,
            'nonce' => $nonce,
            'created_at' => now()->timestamp,
        ];

        if ($reconnectAdminAccountId !== null) {
            $payload['reconnect_admin_account_id'] = $reconnectAdminAccountId;
        }

        if ($returnTo !== null) {
            $payload['return_to'] = $returnTo;
        }

        $hashedState = hash('sha256', $state);

        Cache::put(
            self::CACHE_PREFIX . $hashedState,
            $payload,
            now()->addMinutes(self::EXPIRY_MINUTES)
        );

        return $state;
    }

    public function consumeState(string $state): ?array
    {
        if (empty($state)) {
            return null;
        }

        $hashedState = hash('sha256', $state);
        $cacheKey = self::CACHE_PREFIX . $hashedState;

        $payload = Cache::pull($cacheKey);

        if (!is_array($payload)) {
            return null;
        }

        if (!$this->isValidPayload($payload)) {
            return null;
        }

        return $payload;
    }

    private function isValidPayload(array $payload): bool
    {
        if (!isset($payload['user_id'], $payload['provider'], $payload['created_at'], $payload['mode'])) {
            return false;
        }

        if ($payload['provider'] !== 'facebook') {
            return false;
        }

        if (!in_array($payload['mode'], ['initial_connect', 'reconnect_and_sync'], true)) {
            return false;
        }

        if (!is_string($payload['user_id'])) {
            return false;
        }

        if (!is_int($payload['created_at'])) {
            return false;
        }

        $createdAt = now()->timestamp($payload['created_at']);
        if ($createdAt->addMinutes(self::EXPIRY_MINUTES)->isPast()) {
            return false;
        }

        return true;
    }

    public function isExpiredState(?string $state): bool
    {
        if ($state === null) {
            return false;
        }

        $hashedState = hash('sha256', $state);
        $cacheKey = self::CACHE_PREFIX . $hashedState;

        return !Cache::has($cacheKey);
    }
}
