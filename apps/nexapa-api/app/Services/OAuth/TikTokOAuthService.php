<?php

namespace App\Services\OAuth;

use App\Services\SettingsService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use InvalidArgumentException;

class TikTokOAuthService
{
    private ?string $clientKey = null;
    private ?string $clientSecret = null;
    private ?string $redirectUri = null;
    private array $scopes;
    private ?string $authorizationUrl = null;
    private ?string $tokenUrl = null;
    private ?string $revokeUrl = null;
    private ?string $userInfoUrl = null;

    public function __construct(
        private SettingsService $settingsService
    )
    {
        $this->scopes = Config::get('nexapa.tiktok.scopes', ['user.info.basic']);
    }

    private function resolveConfiguration(): void
    {
        if ($this->clientKey !== null) {
            return;
        }

        $tiktokSettings = $this->settingsService->getTikTokSettings();

        $this->clientKey = $tiktokSettings['tiktok_client_key'] ?? Config::get('nexapa.tiktok.client_key');
        $this->clientSecret = $tiktokSettings['tiktok_client_secret'] ?? Config::get('nexapa.tiktok.client_secret');
        $this->redirectUri = Config::get('nexapa.tiktok.redirect_uri');
        $this->authorizationUrl = Config::get('nexapa.tiktok.authorization_url');
        $this->tokenUrl = Config::get('nexapa.tiktok.token_url');
        $this->revokeUrl = Config::get('nexapa.tiktok.revoke_url');
        $this->userInfoUrl = Config::get('nexapa.tiktok.user_info_url');
    }

    public function isConfigured(): bool
    {
        $this->resolveConfiguration();

        return !empty($this->clientKey) &&
               !empty($this->clientSecret) &&
               !empty($this->redirectUri) &&
               !empty($this->authorizationUrl) &&
               !empty($this->tokenUrl) &&
               !empty($this->revokeUrl) &&
               !empty($this->userInfoUrl);
    }

    public function assertConfigured(): void
    {
        $this->resolveConfiguration();

        // Skip validation in testing environment
        if (app()->environment('testing')) {
            return;
        }

        if (empty($this->clientKey)) {
            throw new RuntimeException('TikTok OAuth client_key is not configured. Set TIKTOK_CLIENT_KEY in environment.');
        }

        if (empty($this->clientSecret)) {
            throw new RuntimeException('TikTok OAuth client_secret is not configured. Set TIKTOK_CLIENT_SECRET in environment.');
        }

        if (empty($this->redirectUri)) {
            throw new RuntimeException('TikTok OAuth redirect_uri is not configured. Set TIKTOK_REDIRECT_URI in environment.');
        }

        if (empty($this->authorizationUrl)) {
            throw new RuntimeException('TikTok OAuth authorization_url is not configured.');
        }

        if (empty($this->tokenUrl)) {
            throw new RuntimeException('TikTok OAuth token_url is not configured.');
        }

        if (empty($this->revokeUrl)) {
            throw new RuntimeException('TikTok OAuth revoke_url is not configured.');
        }

        if (empty($this->userInfoUrl)) {
            throw new RuntimeException('TikTok OAuth user_info_url is not configured.');
        }
    }

    public function buildAuthorizationUrl(string $state, array $scopes = null): string
    {
        $this->assertConfigured();

        $effectiveScopes = $scopes ?? $this->scopes;

        $params = http_build_query([
            'client_key' => $this->clientKey,
            'response_type' => 'code',
            'scope' => implode(',', $effectiveScopes),
            'redirect_uri' => $this->redirectUri,
            'state' => $state,
        ], '', '&', PHP_QUERY_RFC3986);

        return rtrim($this->authorizationUrl, '/') . '?' . $params;
    }

    public function exchangeAuthorizationCode(string $code): array
    {
        $this->assertConfigured();

        if (empty($code)) {
            throw new InvalidArgumentException('Authorization code is required.');
        }

        $response = Http::withHeaders([
            'Content-Type' => 'application/x-www-form-urlencoded',
            'Accept' => 'application/json',
        ])
            ->timeout(30)
            ->asForm()
            ->post($this->tokenUrl, [
                'client_key' => $this->clientKey,
                'client_secret' => $this->clientSecret,
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $this->redirectUri,
            ]);

        $httpStatus = $response->status();

        if (!$response->ok()) {
            $this->handleProviderError($response, $httpStatus);
        }

        $json = $response->json();

        $payload = isset($json['data']) && is_array($json['data'])
            ? $json['data']
            : $json;

        return $this->normalizeTokenResponse($payload, $httpStatus);
    }

    public function refreshAccessToken(string $refreshToken): array
    {
        $this->assertConfigured();

        if (empty($refreshToken)) {
            throw new InvalidArgumentException('Refresh token is required.');
        }

        $response = Http::withHeaders([
            'Content-Type' => 'application/x-www-form-urlencoded',
            'Accept' => 'application/json',
        ])
            ->timeout(30)
            ->asForm()
            ->post($this->tokenUrl, [
                'client_key' => $this->clientKey,
                'client_secret' => $this->clientSecret,
                'grant_type' => 'refresh_token',
                'refresh_token' => $refreshToken,
            ]);

        $httpStatus = $response->status();

        if (!$response->ok()) {
            $this->handleProviderError($response, $httpStatus);
        }

        $json = $response->json();

        $payload = isset($json['data']) && is_array($json['data'])
            ? $json['data']
            : $json;

        return $this->normalizeTokenResponse($payload, $httpStatus);
    }

    public function fetchUserInfo(string $accessToken): array
    {
        $this->assertConfigured();

        if (empty($accessToken)) {
            throw new InvalidArgumentException('Access token is required.');
        }

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $accessToken,
            'Accept' => 'application/json',
        ])
            ->timeout(30)
            ->get($this->userInfoUrl, [
                'fields' => 'open_id,union_id,display_name,avatar_url',
            ]);

        if (!$response->ok()) {
            $this->handleProviderError($response);
        }

        $data = $response->json();

        return $this->normalizeUserInfoResponse($data);
    }

    public function revokeAccessToken(string $accessToken): void
    {
        $this->assertConfigured();

        if (empty($accessToken)) {
            return;
        }

        try {
            Http::withHeaders([
                'Content-Type' => 'application/x-www-form-urlencoded',
                'Accept' => 'application/json',
            ])
                ->timeout(30)
                ->asForm()
                ->post($this->revokeUrl, [
                    'client_key' => $this->clientKey,
                    'client_secret' => $this->clientSecret,
                    'token' => $accessToken,
                ]);
        } catch (RequestException $e) {
            if ($e->response?->status() >= 500) {
                throw new RuntimeException('TikTok token revocation failed due to provider error.', 503, $e);
            }
        }
    }

    private function normalizeTokenResponse(array $data, int $httpStatus): array
    {
        if (empty($data['access_token'])) {
            $this->logMalformedResponse($data, $httpStatus);
            throw new TikTokOAuthException(
                'TikTok returned malformed token response.',
                400,
                'invalid_response',
                'Access token is missing from response.',
                $data['log_id'] ?? null,
                $httpStatus,
                ['error' => $data['error'] ?? null, 'error_description' => $data['error_description'] ?? null]
            );
        }

        if (empty($data['open_id'])) {
            $this->logMalformedResponse($data, $httpStatus);
            throw new TikTokOAuthException(
                'TikTok returned malformed token response.',
                400,
                'invalid_response',
                'Open ID is missing from response.',
                $data['log_id'] ?? null,
                $httpStatus,
                ['error' => $data['error'] ?? null, 'error_description' => $data['error_description'] ?? null]
            );
        }

        if (!isset($data['expires_in']) || !is_numeric($data['expires_in'])) {
            $this->logMalformedResponse($data, $httpStatus);
            throw new TikTokOAuthException(
                'TikTok returned malformed token response.',
                400,
                'invalid_response',
                'Expires in field is missing or invalid.',
                $data['log_id'] ?? null,
                $httpStatus,
                ['error' => $data['error'] ?? null, 'error_description' => $data['error_description'] ?? null]
            );
        }

        return [
            'open_id' => $data['open_id'],
            'access_token' => $data['access_token'],
            'refresh_token' => $data['refresh_token'] ?? null,
            'expires_in' => (int) $data['expires_in'],
            'refresh_expires_in' => isset($data['refresh_expires_in']) ? (int) $data['refresh_expires_in'] : 0,
            'scope' => $data['scope'] ?? '',
            'token_type' => $data['token_type'] ?? 'Bearer',
        ];
    }

    private function logMalformedResponse(array $data, int $httpStatus): void
    {
        Log::error('TikTok OAuth malformed token response', [
            'http_status' => $httpStatus,
            'content_type' => null,
            'response_keys' => is_array($data) ? array_keys($data) : [],
            'has_access_token' => filled($data['access_token'] ?? null),
            'has_open_id' => filled($data['open_id'] ?? null),
            'has_refresh_token' => filled($data['refresh_token'] ?? null),
            'provider_log_id' => $data['log_id'] ?? null,
        ]);
    }

    private function normalizeUserInfoResponse(array $data): array
    {
        if (!isset($data['data'], $data['data']['user'])) {
            throw new RuntimeException('Invalid user info response from TikTok.');
        }

        $user = $data['data']['user'];

        return [
            'open_id' => $user['open_id'] ?? null,
            'union_id' => $user['union_id'] ?? null,
            'display_name' => $user['display_name'] ?? null,
            'avatar_url' => $user['avatar_url'] ?? null,
        ];
    }

    private function handleProviderError(\Illuminate\Http\Client\Response $response, ?int $explicitStatus = null): void
    {
        $status = $explicitStatus ?? $response->status();
        $json = $response->json() ?? [];

        $payload = isset($json['data']) && is_array($json['data'])
            ? $json['data']
            : $json;

        $error = $payload['error'] ?? null;
        $errorDescription = $payload['error_description'] ?? null;
        $logId = $payload['log_id'] ?? null;

        if (!is_array($json) || (empty($json) && $status !== 0)) {
            Log::error('TikTok OAuth malformed token response', [
                'http_status' => $status,
                'content_type' => $response->header('Content-Type'),
                'response_keys' => [],
                'has_access_token' => false,
                'has_open_id' => false,
                'has_refresh_token' => false,
                'provider_log_id' => null,
            ]);
        }

        $errorInfo = [];
        if ($error !== null) {
            $errorInfo['error'] = $error;
        }
        if ($errorDescription !== null) {
            $errorInfo['error_description'] = $this->sanitizeErrorDescription($errorDescription);
        }
        if ($logId !== null) {
            $errorInfo['log_id'] = $logId;
        }

        if ($status >= 500) {
            throw new TikTokOAuthException(
                'TikTok provider error (status: ' . $status . ').',
                503,
                $error,
                $errorDescription,
                $logId,
                $status,
                $errorInfo
            );
        }

        if ($status === 401 || $status === 403) {
            throw new TikTokOAuthException(
                'TikTok authentication failed. Tokens may be invalid or expired.',
                401,
                $error ?? 'authentication_failed',
                $errorDescription,
                $logId,
                $status,
                $errorInfo
            );
        }

        if ($status === 400) {
            throw new TikTokOAuthException(
                'TikTok OAuth error: ' . ($errorDescription ?? 'Invalid request.'),
                400,
                $error ?? 'invalid_request',
                $errorDescription,
                $logId,
                $status,
                $errorInfo
            );
        }

        if ($status === 0) {
            throw new TikTokOAuthException(
                'TikTok OAuth connection failed. No response received.',
                0,
                'connection_failed',
                'Unable to connect to TikTok OAuth server.',
                $logId,
                0,
                $errorInfo
            );
        }

        throw new TikTokOAuthException(
            'TikTok provider returned unexpected status: ' . $status,
            $status,
            $error ?? 'provider_error',
            $errorDescription,
            $logId,
            $status,
            $errorInfo
        );
    }

    private function sanitizeErrorDescription(string $description): string
    {
        $sanitized = preg_replace('/[^\x20-\x7E]/', '', $description);
        return substr($sanitized, 0, 500);
    }
}
