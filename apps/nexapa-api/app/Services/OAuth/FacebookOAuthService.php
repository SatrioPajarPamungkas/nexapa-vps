<?php

namespace App\Services\OAuth;

use App\Services\SettingsService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use InvalidArgumentException;

class FacebookOAuthService
{
    private ?string $appId = null;
    private ?string $appSecret = null;
    private ?string $redirectUri = null;
    private ?string $graphApiVersion = null;
    private ?string $configurationId = null;
    private array $scopes;

    public function __construct(
        private SettingsService $settingsService
    )
    {
        $this->scopes = Config::get('nexapa.facebook.scopes', [
            'public_profile',
            'pages_show_list',
            'pages_read_engagement',
            'read_insights',
            'pages_manage_posts',
        ]);
    }

    private function resolveConfiguration(): void
    {
        $facebookSettings = $this->settingsService->getFacebookSettings();

        $this->appId = $facebookSettings['facebook_app_id'] ?: Config::get('nexapa.facebook.app_id');
        $this->appSecret = $facebookSettings['facebook_app_secret'] ?: Config::get('nexapa.facebook.app_secret');
        $this->graphApiVersion = $facebookSettings['facebook_graph_api_version'] ?: Config::get('nexapa.facebook.graph_api_version', 'v21.0');
        $this->configurationId = $facebookSettings['facebook_configuration_id'] ?: null;

        $this->redirectUri = Config::get('nexapa.facebook.redirect_uri')
            ?? Config::get('nexapa.facebook.callback_url')
            ?? $this->buildBackendRedirectUri();

        Log::info('Facebook OAuth configuration resolved', [
            'app_id_configured' => !empty($this->appId),
            'app_secret_configured' => !empty($this->appSecret),
            'redirect_uri' => $this->redirectUri,
            'graph_api_version' => $this->graphApiVersion,
            'config_source' => !empty($facebookSettings['facebook_app_id']) ? 'database' : 'config',
            'scopes' => $this->scopes,
        ]);
    }

    private function buildBackendRedirectUri(): string
    {
        $appUrl = Config::get('app.url', 'https://api.nexapa.app');
        return rtrim($appUrl, '/') . '/api/v1/oauth/facebook/callback';
    }

    private function resolveConfigurationIfNeeded(): void
    {
        if ($this->appId === null) {
            $this->resolveConfiguration();
        }
    }

    public function isConfigured(): bool
    {
        $this->resolveConfigurationIfNeeded();

        return !empty($this->appId) &&
               !empty($this->appSecret) &&
               !empty($this->redirectUri) &&
               !empty($this->graphApiVersion) &&
               preg_match('/^v\d+\.\d+$/', $this->graphApiVersion);
    }

    public function assertConfigured(): void
    {
        $this->resolveConfigurationIfNeeded();

        if (empty($this->appId)) {
            Log::error('Facebook OAuth initialization failed: App ID missing', [
                'database_configured' => !empty($this->settingsService->getFacebookSettings()['facebook_app_id']),
                'config_fallback' => !empty(Config::get('nexapa.facebook.app_id')),
            ]);
            throw new FacebookOAuthException(
                'Facebook App ID is not configured. Please configure it in Developer Settings.',
                503,
                'facebook_configuration_error',
                'Facebook App ID is missing.',
                null,
                503
            );
        }

        if (empty($this->appSecret)) {
            Log::error('Facebook OAuth initialization failed: App Secret missing', [
                'app_id_present' => !empty($this->appId),
            ]);
            throw new FacebookOAuthException(
                'Facebook App Secret is not configured. Please configure it in Developer Settings.',
                503,
                'facebook_configuration_error',
                'Facebook App Secret is missing.',
                null,
                503
            );
        }

        if (empty($this->redirectUri)) {
            throw new FacebookOAuthException(
                'Facebook Redirect URI is not configured. Please configure FACEBOOK_REDIRECT_URI in environment.',
                503,
                'facebook_configuration_error',
                'Facebook Redirect URI is missing.',
                null,
                503
            );
        }

        if (!preg_match('/^v\d+\.\d+$/', $this->graphApiVersion)) {
            throw new FacebookOAuthException(
                'Facebook Graph API version is invalid.',
                503,
                'facebook_configuration_error',
                'Facebook Graph API version must be in format vXX.X.',
                null,
                503
            );
        }
    }

    public function buildAuthorizationUrl(string $state, array $scopes = null, bool $reconnect = false): string
    {
        $this->resolveConfiguration();
        $this->assertConfigured();

        $effectiveScopes = $scopes ?? $this->scopes;

        $params = [
            'client_id' => $this->appId,
            'redirect_uri' => $this->redirectUri,
            'state' => $state,
            'scope' => implode(',', $effectiveScopes),
            'response_type' => 'code',
        ];

        if ($this->configurationId !== null && !$reconnect) {
            $params['config_id'] = $this->configurationId;
        }

        Log::info('Facebook OAuth redirect prepared', [
            'app_id' => $this->appId ? substr($this->appId, 0, 8) . '...' : null,
            'redirect_uri' => $this->redirectUri,
            'scopes' => $effectiveScopes,
            'config_source' => !empty($this->appId) ? 'database_or_config' : 'missing',
            'reconnect' => $reconnect,
        ]);

        $paramsString = http_build_query($params, '', '&', PHP_QUERY_RFC3986);

        return 'https://www.facebook.com/' . $this->graphApiVersion . '/dialog/oauth?' . $paramsString;
    }

    public function exchangeAuthorizationCode(string $code): array
    {
        $this->resolveConfiguration();
        $this->assertConfigured();

        if (empty($code)) {
            throw new InvalidArgumentException('Authorization code is required.');
        }

        $tokenUrl = 'https://graph.facebook.com/' . $this->graphApiVersion . '/oauth/access_token';

        $response = Http::withHeaders([
            'Content-Type' => 'application/x-www-form-urlencoded',
            'Accept' => 'application/json',
        ])
            ->timeout(30)
            ->asForm()
            ->post($tokenUrl, [
                'client_id' => $this->appId,
                'client_secret' => $this->appSecret,
                'code' => $code,
                'redirect_uri' => $this->redirectUri,
            ]);

        $httpStatus = $response->status();

        if (!$response->ok()) {
            $this->handleProviderError($response, $httpStatus);
        }

        $json = $response->json();

        if (empty($json['access_token'])) {
            throw new FacebookOAuthException(
                'Facebook returned malformed token response.',
                400,
                'invalid_response',
                'Access token is missing from response.',
                null,
                $httpStatus
            );
        }

        return [
            'access_token' => $json['access_token'],
            'expires_in' => $json['expires_in'] ?? 0,
        ];
    }

    public function getLongLivedToken(string $shortLivedToken): array
    {
        $this->resolveConfiguration();
        $this->assertConfigured();

        if (empty($shortLivedToken)) {
            throw new InvalidArgumentException('Short-lived token is required.');
        }

        $tokenUrl = 'https://graph.facebook.com/' . $this->graphApiVersion . '/oauth/access_token';

        $response = Http::withHeaders([
            'Content-Type' => 'application/x-www-form-urlencoded',
            'Accept' => 'application/json',
        ])
            ->timeout(30)
            ->asForm()
            ->get($tokenUrl, [
                'grant_type' => 'fb_exchange_token',
                'client_id' => $this->appId,
                'client_secret' => $this->appSecret,
                'fb_exchange_token' => $shortLivedToken,
            ]);

        $httpStatus = $response->status();

        if (!$response->ok()) {
            $this->handleProviderError($response, $httpStatus);
        }

        $json = $response->json();

        if (empty($json['access_token'])) {
            throw new FacebookOAuthException(
                'Facebook returned malformed long-lived token response.',
                400,
                'invalid_response',
                'Long-lived access token is missing from response.',
                null,
                $httpStatus
            );
        }

        return [
            'access_token' => $json['access_token'],
            'expires_in' => $json['expires_in'] ?? 5184000,
        ];
    }

    public function fetchUserInfo(string $accessToken): array
    {
        $this->resolveConfiguration();
        $this->assertConfigured();

        if (empty($accessToken)) {
            throw new InvalidArgumentException('Access token is required.');
        }

        $url = 'https://graph.facebook.com/' . $this->graphApiVersion . '/me';

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $accessToken,
            'Accept' => 'application/json',
        ])
            ->timeout(30)
            ->get($url, [
                'fields' => 'id,name,picture.type(large)',
            ]);

        if (!$response->ok()) {
            $this->handleProviderError($response);
        }

        $data = $response->json();

        return [
            'id' => $data['id'] ?? null,
            'name' => $data['name'] ?? 'Facebook User',
            'picture' => $data['picture']['data']['url'] ?? null,
        ];
    }

    public function fetchGrantedPermissions(string $accessToken): array
    {
        if (empty($accessToken)) {
            return [];
        }

        $url = 'https://graph.facebook.com/' . $this->graphApiVersion . '/me/permissions';

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Accept' => 'application/json',
            ])
                ->timeout(30)
                ->get($url);

            if (!$response->ok()) {
                return [];
            }

            $data = $response->json();
            $permissions = $data['data'] ?? [];

            $grantedPermissions = array_filter($permissions, fn($p) => $p['status'] === 'granted');
            return array_column($grantedPermissions, 'permission');
        } catch (\Exception $e) {
            Log::warning('Facebook granted permissions fetch failed', [
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    public function fetchManagedPages(string $accessToken): array
    {
        $this->resolveConfiguration();
        $this->assertConfigured();

        if (empty($accessToken)) {
            throw new InvalidArgumentException('Access token is required.');
        }

        $url = 'https://graph.facebook.com/' . $this->graphApiVersion . '/me/accounts';
        $pages = [];
        $nextUrl = null;

        do {
            $requestUrl = $nextUrl ?? $url;

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Accept' => 'application/json',
            ])
                ->timeout(60)
                ->get($requestUrl, [
                    'fields' => 'id,name,username,picture.type(large),access_token,tasks',
                    'limit' => 100,
                ]);

            if (!$response->ok()) {
                $this->handleProviderError($response);
            }

            $data = $response->json();
            $pageData = $data['data'] ?? [];

            foreach ($pageData as $page) {
                $pages[] = [
                    'id' => $page['id'] ?? null,
                    'name' => $page['name'] ?? 'Unknown Page',
                    'username' => $page['username'] ?? null,
                    'picture' => $page['picture']['data']['url'] ?? null,
                    'access_token' => $page['access_token'] ?? null,
                    'tasks' => $page['tasks'] ?? null,
                ];
            }

            $nextUrl = $data['paging']['next'] ?? null;
        } while ($nextUrl);

        return $pages;
    }

    public function revokeAccessToken(string $accessToken): void
    {
        if (empty($accessToken)) {
            return;
        }

        try {
            $url = 'https://graph.facebook.com/' . $this->graphApiVersion . '/me/permissions';

            Http::withHeaders([
                'Content-Type' => 'application/x-www-form-urlencoded',
                'Accept' => 'application/json',
            ])
                ->timeout(30)
                ->asForm()
                ->delete($url, [
                    'access_token' => $accessToken,
                ]);
        } catch (RequestException $e) {
            if ($e->response?->status() >= 500) {
                throw new RuntimeException('Facebook token revocation failed due to provider error.', 503, $e);
            }
        }
    }

    public function getAppId(): ?string
    {
        $this->resolveConfigurationIfNeeded();
        return $this->appId;
    }

    public function getGraphApiVersion(): string
    {
        $this->resolveConfigurationIfNeeded();
        return $this->graphApiVersion ?? 'v21.0';
    }

    private function handleProviderError(\Illuminate\Http\Client\Response $response, ?int $explicitStatus = null): void
    {
        $status = $explicitStatus ?? $response->status();
        $json = $response->json() ?? [];

        $error = $json['error']['message'] ?? null;
        $errorCode = $json['error']['code'] ?? null;
        $errorType = $json['error']['type'] ?? null;
        $fbTraceId = $json['error']['fbtrace_id'] ?? null;

        if ($status >= 500) {
            throw new FacebookOAuthException(
                'Facebook provider error (status: ' . $status . ').',
                503,
                $errorType ?? 'provider_error',
                $error,
                $fbTraceId,
                $status
            );
        }

        if ($status === 401 || $status === 403) {
            throw new FacebookOAuthException(
                'Facebook authentication failed. Tokens may be invalid or expired.',
                401,
                $errorType ?? 'authentication_failed',
                $error,
                $fbTraceId,
                $status
            );
        }

        if ($status === 400) {
            throw new FacebookOAuthException(
                'Facebook OAuth error: ' . ($error ?? 'Invalid request.'),
                400,
                $errorType ?? 'invalid_request',
                $error,
                $fbTraceId,
                $status
            );
        }

        if ($status === 0) {
            throw new FacebookOAuthException(
                'Facebook OAuth connection failed. No response received.',
                0,
                'connection_failed',
                'Unable to connect to Facebook OAuth server.',
                $fbTraceId,
                0
            );
        }

        throw new FacebookOAuthException(
            'Facebook provider returned unexpected status: ' . $status,
            $status,
            $errorType ?? 'provider_error',
            $error,
            $fbTraceId,
            $status
        );
    }
}
