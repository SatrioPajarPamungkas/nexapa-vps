<?php

namespace App\Services\Facebook;

use App\Models\ConnectedAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class FacebookPageInsightsService
{
    private const METRICS = [
        'views' => 'page_media_view',
        'engagements' => 'page_post_engagements',
        'followers' => 'page_follows',
    ];

    public function getInsights(
        ConnectedAccount $page,
        int $days
    ): array {
        $token = $page->access_token_encrypted;

        if (! filled($token)) {
            throw new RuntimeException(
                'Facebook Page access token is unavailable.'
            );
        }

        $version = config(
            'nexapa.facebook.graph_api_version',
            'v26.0'
        );

        $until = now()->endOfDay();
        $since = now()
            ->subDays($days - 1)
            ->startOfDay();

        $series = [];
        $warnings = [];

        foreach (self::METRICS as $key => $metric) {
            try {
                $values = $this->fetchMetric(
                    $version,
                    (string) $page->external_account_id,
                    (string) $token,
                    $metric,
                    $since->timestamp,
                    $until->timestamp
                );

                foreach ($values as $point) {
                    $date = substr(
                        (string) ($point['end_time'] ?? ''),
                        0,
                        10
                    );

                    if ($date === '') {
                        continue;
                    }

                    $series[$date] ??= [
                        'date' => $date,
                        'views' => 0,
                        'engagements' => 0,
                        'followers' => 0,
                    ];

                    $series[$date][$key] =
                        $this->numericValue(
                            $point['value'] ?? 0
                        );
                }
            } catch (RuntimeException $exception) {
                $warnings[] = [
                    'metric' => $metric,
                    'message' => $exception->getMessage(),
                ];

                Log::warning(
                    'Facebook Page insight metric failed.',
                    [
                        'connected_account_id' => $page->id,
                        'page_id' => $page->external_account_id,
                        'metric' => $metric,
                        'message' => $exception->getMessage(),
                    ]
                );
            }
        }

        ksort($series);
        $series = array_values($series);

        $views = array_sum(
            array_column($series, 'views')
        );

        $engagements = array_sum(
            array_column($series, 'engagements')
        );

        $followers = 0;

        if ($series !== []) {
            $last = $series[array_key_last($series)];
            $followers = (int) ($last['followers'] ?? 0);
        }

        $posts = $this->fetchPostCount(
            $version,
            (string) $page->external_account_id,
            (string) $token,
            $since->timestamp,
            $until->timestamp,
            $warnings
        );

        if ($series === [] && count($warnings) >= 3) {
            throw new RuntimeException(
                'Facebook Insights tidak tersedia. Hubungkan ulang akun dan pastikan izin read_insights disetujui.'
            );
        }

        return [
            'page' => [
                'id' => $page->id,
                'external_account_id' =>
                    $page->external_account_id,
                'display_name' => $page->display_name,
                'username' => $page->username,
                'avatar_url' => $page->avatar_url,
                'status' => $page->status,
            ],
            'period' => [
                'days' => $days,
                'since' => $since->toDateString(),
                'until' => $until->toDateString(),
            ],
            'summary' => [
                'views' => $views,
                'engagements' => $engagements,
                'followers' => $followers,
                'posts' => $posts,
            ],
            'series' => $series,
            'warnings' => $warnings,
        ];
    }

    private function fetchMetric(
        string $version,
        string $pageId,
        string $token,
        string $metric,
        int $since,
        int $until
    ): array {
        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(45)
            ->retry(2, 300)
            ->get(
                "https://graph.facebook.com/{$version}/{$pageId}/insights",
                [
                    'metric' => $metric,
                    'period' => 'day',
                    'since' => $since,
                    'until' => $until,
                ]
            );

        if (! $response->successful()) {
            $message = data_get(
                $response->json(),
                'error.message',
                'Meta rejected the Insight request.'
            );

            throw new RuntimeException((string) $message);
        }

        return data_get(
            $response->json(),
            'data.0.values',
            []
        );
    }

    private function fetchPostCount(
        string $version,
        string $pageId,
        string $token,
        int $since,
        int $until,
        array &$warnings
    ): int {
        $response = Http::withToken($token)
            ->acceptJson()
            ->timeout(45)
            ->get(
                "https://graph.facebook.com/{$version}/{$pageId}/feed",
                [
                    'fields' => 'id',
                    'limit' => 1,
                    'summary' => 'true',
                    'since' => $since,
                    'until' => $until,
                ]
            );

        if (! $response->successful()) {
            $warnings[] = [
                'metric' => 'posts',
                'message' => (string) data_get(
                    $response->json(),
                    'error.message',
                    'Post count is unavailable.'
                ),
            ];

            return 0;
        }

        return (int) data_get(
            $response->json(),
            'summary.total_count',
            0
        );
    }

    private function numericValue(mixed $value): int
    {
        if (is_numeric($value)) {
            return (int) round((float) $value);
        }

        if (is_array($value)) {
            return (int) array_sum(
                array_filter(
                    $value,
                    static fn ($item): bool =>
                        is_numeric($item)
                )
            );
        }

        return 0;
    }
}
