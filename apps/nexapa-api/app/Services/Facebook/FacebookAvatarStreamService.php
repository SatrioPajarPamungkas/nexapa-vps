<?php

namespace App\Services\Facebook;

use App\Models\ConnectedAccount;
use App\Services\OAuth\FacebookOAuthService;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class FacebookAvatarStreamService
{
    private const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

    public function __construct(
        private readonly FacebookOAuthService $facebookOAuthService,
    ) {}

    /**
     * Fetch the current Facebook profile picture without persisting it locally.
     *
     * @return array{body: string, content_type: string}
     */
    public function fetch(ConnectedAccount $account): array
    {
        if ($account->platform !== 'facebook') {
            throw new RuntimeException('Avatar streaming is only available for Facebook accounts.');
        }

        $accessToken = $account->access_token_encrypted;

        if (empty($accessToken)) {
            throw new RuntimeException('Facebook access token is unavailable.');
        }

        $graphUrl = sprintf(
            'https://graph.facebook.com/%s/me/picture',
            $this->facebookOAuthService->getGraphApiVersion(),
        );

        $metadataResponse = Http::withToken($accessToken)
            ->acceptJson()
            ->connectTimeout(5)
            ->timeout(15)
            ->get($graphUrl, [
                'redirect' => 'false',
                'type' => 'large',
                'width' => 256,
                'height' => 256,
            ]);

        if (! $metadataResponse->ok()) {
            throw new RuntimeException('Facebook profile picture metadata is unavailable.');
        }

        $payload = $metadataResponse->json();
        $imageUrl = $payload['data']['url'] ?? null;

        if (! is_string($imageUrl) || ! $this->isTrustedFacebookImageUrl($imageUrl)) {
            throw new RuntimeException('Facebook returned an invalid profile picture URL.');
        }

        $imageResponse = Http::connectTimeout(5)
            ->timeout(20)
            ->get($imageUrl);

        $contentTypeHeader = (string) $imageResponse->header('Content-Type');
        $contentType = strtolower(trim(explode(';', $contentTypeHeader, 2)[0]));
        $body = $imageResponse->body();

        if (! $imageResponse->ok()
            || ! str_starts_with($contentType, 'image/')
            || $body === ''
            || strlen($body) > self::MAX_IMAGE_BYTES
        ) {
            throw new RuntimeException('Facebook profile picture could not be loaded.');
        }

        return [
            'body' => $body,
            'content_type' => $contentType,
        ];
    }

    private function isTrustedFacebookImageUrl(string $url): bool
    {
        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));

        if ($scheme !== 'https' || $host === '') {
            return false;
        }

        foreach (['facebook.com', 'fbcdn.net', 'fbsbx.com'] as $domain) {
            if ($host === $domain || str_ends_with($host, '.'.$domain)) {
                return true;
            }
        }

        return false;
    }
}
