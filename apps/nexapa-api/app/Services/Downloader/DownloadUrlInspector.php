<?php

namespace App\Services\Downloader;

use App\Enums\DownloadPlatform;
use App\Enums\SourceType;

class DownloadUrlInspector
{
    private const PLATFORM_HOSTS = [
        'tiktok.com' => DownloadPlatform::Tiktok,
        'www.tiktok.com' => DownloadPlatform::Tiktok,
        'm.tiktok.com' => DownloadPlatform::Tiktok,
        'vm.tiktok.com' => DownloadPlatform::Tiktok,
        'vt.tiktok.com' => DownloadPlatform::Tiktok,
        'facebook.com' => DownloadPlatform::Facebook,
        'www.facebook.com' => DownloadPlatform::Facebook,
        'm.facebook.com' => DownloadPlatform::Facebook,
        'fb.watch' => DownloadPlatform::Facebook,
        'instagram.com' => DownloadPlatform::Instagram,
        'www.instagram.com' => DownloadPlatform::Instagram,
        'youtube.com' => DownloadPlatform::Youtube,
        'www.youtube.com' => DownloadPlatform::Youtube,
        'm.youtube.com' => DownloadPlatform::Youtube,
        'youtu.be' => DownloadPlatform::Youtube,
    ];

    public function inspect(string $url): array
    {
        $trimmed = trim($url);

        if ($trimmed === '') {
            return $this->errorResult('URL is empty');
        }

        if (! preg_match('/^https?:\/\//i', $trimmed)) {
            return $this->errorResult('URL must start with http:// or https://');
        }

        $parsed = parse_url($trimmed);

        if ($parsed === false || empty($parsed['host'])) {
            return $this->errorResult('URL is malformed');
        }

        $normalizedUrl = $this->normalize($parsed);
        $platform = $this->detectPlatform($parsed['host']);
        $sourceType = $this->detectSourceType($parsed, $platform);
        $duplicateIdentity = $this->generateDuplicateIdentity($normalizedUrl);

        return [
            'success' => true,
            'normalized_url' => $normalizedUrl,
            'platform' => $platform,
            'source_type' => $sourceType,
            'duplicate_identity' => $duplicateIdentity,
        ];
    }

    private function normalize(array $parsed): string
    {
        $scheme = strtolower($parsed['scheme'] ?? 'https');
        $host = strtolower($parsed['host'] ?? '');
        $port = $parsed['port'] ?? null;
        $path = $parsed['path'] ?? '/';
        $query = $parsed['query'] ?? null;
        $fragment = $parsed['fragment'] ?? null;

        $url = $scheme . '://' . $host;

        if ($port !== null && $port !== 80 && $port !== 443) {
            $url .= ':' . $port;
        }

        $url .= $path;

        if ($query !== null) {
            $url .= '?' . $query;
        }

        if ($fragment !== null) {
            $url .= '#' . $fragment;
        }

        return $url;
    }

    private function detectPlatform(string $host): DownloadPlatform
    {
        $host = strtolower($host);

        return self::PLATFORM_HOSTS[$host] ?? DownloadPlatform::Generic;
    }

    private function detectSourceType(array $parsed, DownloadPlatform $platform): SourceType
    {
        $path = strtolower($parsed['path'] ?? '');

        if ($platform === DownloadPlatform::Tiktok) {
            if (preg_match('#/@[\w.]+/?$#', $path)) {
                return SourceType::Profile;
            }
            if (preg_match('#/video/\d+#', $path)) {
                return SourceType::Video;
            }
            if (preg_match('#/photo/\d+#', $path)) {
                return SourceType::Post;
            }
        }

        if ($platform === DownloadPlatform::Facebook) {
            if (preg_match('#/watch/?$#', $path)) {
                return SourceType::Video;
            }
            if (preg_match('#/reel/[\w-]+/?$#', $path) || preg_match('#/reels/[\w-]+/?$#', $path)) {
                return SourceType::Video;
            }
            if (preg_match('#/stories/[\w.]+/?$#', $path)) {
                return SourceType::Profile;
            }
        }

        if ($platform === DownloadPlatform::Instagram) {
            if (preg_match('#/p/[\w-]+/?$#', $path) || preg_match('#/reel/[\w-]+/?$#', $path)) {
                return SourceType::Post;
            }
            if (preg_match('#/[^/]+/?$#', $path) && ! preg_match('#/(p|reel|reels|stories|explore)/#', $path)) {
                return SourceType::Profile;
            }
        }

        if ($platform === DownloadPlatform::Youtube) {
            if (preg_match('#/channel/[\w-]+#', $path)) {
                return SourceType::Channel;
            }
            if (preg_match('#/c/[\w-]+#', $path) || preg_match('#/@[\w.-]+#', $path)) {
                return SourceType::Channel;
            }
            if (preg_match('#/playlist#', $path)) {
                $query = $parsed['query'] ?? '';
                if (str_contains($query, 'list=')) {
                    return SourceType::Playlist;
                }
            }
            if (preg_match('#/watch#', $path)) {
                return SourceType::Video;
            }
            if (preg_match('#/shorts/[\w-]+#', $path)) {
                return SourceType::Video;
            }
        }

        return SourceType::Unknown;
    }

    private function generateDuplicateIdentity(string $normalizedUrl): string
    {
        $parsed = parse_url($normalizedUrl);
        $host = strtolower($parsed['host'] ?? '');
        $path = rtrim($parsed['path'] ?? '/', '/');

        return md5($host . $path);
    }

    private function errorResult(string $message): array
    {
        return [
            'success' => false,
            'error' => $message,
            'normalized_url' => null,
            'platform' => DownloadPlatform::Generic,
            'source_type' => SourceType::Unknown,
            'duplicate_identity' => null,
        ];
    }
}
