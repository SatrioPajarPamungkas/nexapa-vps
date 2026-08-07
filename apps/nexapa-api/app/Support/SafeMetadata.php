<?php

namespace App\Support;

use Illuminate\Support\Str;

final class SafeMetadata
{
    private const BLOCKED_KEY_PARTS = [
        'password',
        'secret',
        'token',
        'authorization',
        'cookie',
        'credential',
        'api_key',
        'apikey',
        'signed_url',
        'proxy_password',
    ];

    public static function sanitize(mixed $value, int $depth = 0): mixed
    {
        if ($depth >= 5) {
            return '[DIBATASI]';
        }

        if (! is_array($value)) {
            return is_string($value) ? Str::limit($value, 500) : $value;
        }

        $safe = [];

        foreach ($value as $key => $item) {
            if (is_string($key) && self::isSensitiveKey($key)) {
                $safe[$key] = '[DIHAPUS]';

                continue;
            }

            $safe[$key] = self::sanitize($item, $depth + 1);
        }

        return $safe;
    }

    public static function summary(mixed $metadata): string
    {
        if (! is_array($metadata) || $metadata === []) {
            return '—';
        }

        $json = json_encode(self::sanitize($metadata), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return Str::limit($json ?: '—', 250);
    }

    private static function isSensitiveKey(string $key): bool
    {
        $normalized = Str::of($key)->lower()->replace(['-', ' '], '_')->toString();

        foreach (self::BLOCKED_KEY_PARTS as $blocked) {
            if (str_contains($normalized, $blocked)) {
                return true;
            }
        }

        return false;
    }
}
