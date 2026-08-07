<?php

namespace App\Http\Controllers\Api\OAuth;

use App\Http\Controllers\Controller;
use App\Models\ConnectedAccount;
use App\Models\User;
use App\Services\OAuth\TikTokOAuthException;
use App\Services\OAuth\TikTokOAuthService;
use App\Services\OAuth\TikTokOAuthStateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use InvalidArgumentException;
use Exception;

class TikTokOAuthController extends Controller
{
    public function __construct(
        private readonly TikTokOAuthService $oauthService,
        private readonly TikTokOAuthStateService $stateService,
    ) {}

    public function callback(Request $request): RedirectResponse
    {
        $state = $request->query('state');
        $code = $request->query('code');
        $error = $request->query('error');
        $errorDescription = $request->query('error_description');
        $logId = $request->query('log_id');

        $payload = $this->stateService->consumeState($state);

        if ($payload === null) {
            if ($this->isExpiredState($state)) {
                return $this->redirectToFrontend('expired_state');
            }
            return $this->redirectToFrontend('invalid_state');
        }

        $userId = $payload['user_id'];
        $reconnectAccountId = $payload['reconnect_account_id'] ?? null;
        $returnTo = $payload['return_to'] ?? '/accounts';

        $user = User::find($userId);
        if ($user === null) {
            return $this->redirectToFrontend('provider_error', null, $returnTo);
        }

        if (!empty($error)) {
            $correlationId = $this->generateCorrelationId();
            $this->logProviderError('tiktok_authorization_error', $error, $errorDescription, $logId, null, $correlationId);
            
            $safeErrorCode = $this->mapTikTokErrorToSafeCode($error);
            return $this->redirectToFrontend($safeErrorCode, null, $returnTo);
        }

        if (empty($code)) {
            return $this->redirectToFrontend('provider_error', null, $returnTo);
        }

        try {
            $tokenResult = $this->oauthService->exchangeAuthorizationCode($code);
        } catch (TikTokOAuthException $e) {
            $correlationId = $this->generateCorrelationId();
            $providerErrorCode = $e->getErrorCode() ?? 'provider_error';
            $safeErrorCode = $this->mapTikTokErrorToSafeCode($providerErrorCode);
            
            Log::error('TikTok OAuth token exchange failed', [
                'phase' => 'token_exchange',
                'provider_error_code' => $providerErrorCode,
                'provider_error_description' => $this->sanitizeErrorDescription($e->getErrorDescription()),
                'provider_log_id' => $e->getLogId(),
                'http_status' => $e->getHttpStatus(),
                'correlation_id' => $correlationId,
            ]);
            
            return $this->redirectToFrontend($safeErrorCode, null, $returnTo);
        } catch (InvalidArgumentException $e) {
            $correlationId = $this->generateCorrelationId();
            Log::error('TikTok OAuth token exchange failed', [
                'phase' => 'token_exchange',
                'provider_error_code' => 'invalid_code',
                'provider_error_description' => $this->sanitizeErrorDescription($e->getMessage()),
                'provider_log_id' => null,
                'http_status' => null,
                'correlation_id' => $correlationId,
            ]);
            return $this->redirectToFrontend('provider_error', null, $returnTo);
        } catch (RuntimeException $e) {
            $statusCode = $e->getCode();
            $correlationId = $this->generateCorrelationId();
            
            if ($statusCode === 401) {
                Log::error('TikTok OAuth token exchange failed', [
                    'phase' => 'token_exchange',
                    'provider_error_code' => 'token_exchange_failed',
                    'provider_error_description' => $this->sanitizeErrorDescription($e->getMessage()),
                    'provider_log_id' => null,
                    'http_status' => $statusCode,
                    'correlation_id' => $correlationId,
                ]);
                return $this->redirectToFrontend('token_exchange_failed', null, $returnTo);
            }

            Log::error('TikTok OAuth token exchange failed', [
                'phase' => 'token_exchange',
                'provider_error_code' => 'provider_error',
                'provider_error_description' => $this->sanitizeErrorDescription($e->getMessage()),
                'provider_log_id' => null,
                'http_status' => $statusCode,
                'correlation_id' => $correlationId,
            ]);
            return $this->redirectToFrontend('provider_error', null, $returnTo);
        }

        try {
            $userInfo = $this->oauthService->fetchUserInfo($tokenResult['access_token']);
        } catch (TikTokOAuthException $e) {
            $correlationId = $this->generateCorrelationId();
            $providerErrorCode = $e->getErrorCode() ?? 'user_info_failed';
            $safeErrorCode = $this->mapTikTokErrorToSafeCode($providerErrorCode);
            
            Log::error('TikTok OAuth user info fetch failed', [
                'phase' => 'user_info_fetch',
                'provider_error_code' => $providerErrorCode,
                'provider_error_description' => $this->sanitizeErrorDescription($e->getErrorDescription()),
                'provider_log_id' => $e->getLogId(),
                'http_status' => $e->getHttpStatus(),
                'correlation_id' => $correlationId,
            ]);
            
            return $this->redirectToFrontend($safeErrorCode, null, $returnTo);
        } catch (RuntimeException $e) {
            $correlationId = $this->generateCorrelationId();
            Log::error('TikTok OAuth user info fetch failed', [
                'phase' => 'user_info_fetch',
                'provider_error_code' => 'user_info_failed',
                'provider_error_description' => $this->sanitizeErrorDescription($e->getMessage()),
                'provider_log_id' => null,
                'http_status' => $e->getCode() ?: null,
                'correlation_id' => $correlationId,
            ]);
            return $this->redirectToFrontend('user_info_failed', null, $returnTo);
        }

        $openId = $tokenResult['open_id'] ?? $userInfo['open_id'] ?? null;
        if ($openId === null) {
            return $this->redirectToFrontend('provider_error', null, $returnTo);
        }

        if (isset($userInfo['open_id']) && $userInfo['open_id'] !== $openId) {
            return $this->redirectToFrontend('provider_error', null, $returnTo);
        }

        try {
            $account = DB::transaction(function () use ($user, $tokenResult, $userInfo, $openId, $reconnectAccountId, $returnTo) {
                if ($reconnectAccountId !== null) {
                    $existingAccount = ConnectedAccount::where('id', $reconnectAccountId)
                        ->where('user_id', $user->id)
                        ->where('platform', 'tiktok')
                        ->first();

                    if (!$existingAccount) {
                        throw new Exception('reconnect_account_mismatch');
                    }

                    if ($existingAccount->external_account_id !== null && $existingAccount->external_account_id !== $openId) {
                        throw new Exception('reconnect_account_mismatch');
                    }

                    $account = $existingAccount;
                } else {
                    $existing = ConnectedAccount::withTrashed()
                        ->where('user_id', $user->id)
                        ->where('platform', 'tiktok')
                        ->where('external_account_id', $openId)
                        ->first();

                    if ($existing) {
                        $existing->restore();
                        $account = $existing;
                    } else {
                        $hasDefault = ConnectedAccount::where('user_id', $user->id)
                            ->where('platform', 'tiktok')
                            ->where('is_default', true)
                            ->exists();

                        $account = new ConnectedAccount();
                        $account->user_id = $user->id;
                        $account->platform = 'tiktok';
                        $account->is_default = !$hasDefault;
                    }
                }

                $account->external_account_id = $openId;
                $account->display_name = $userInfo['display_name'] ?? 'TikTok User';
                $account->avatar_url = $userInfo['avatar_url'] ?? null;
                $account->status = 'connected';
                $account->connection_method = 'oauth';
                $account->last_validated_at = now();
                $account->access_token_encrypted = $tokenResult['access_token'];
                $account->refresh_token_encrypted = $tokenResult['refresh_token'];

                if ($tokenResult['expires_in'] > 0) {
                    $account->token_expires_at = now()->addSeconds($tokenResult['expires_in']);
                }

                if (isset($tokenResult['refresh_expires_in']) && $tokenResult['refresh_expires_in'] > 0) {
                    $account->refresh_token_expires_at = now()->addSeconds($tokenResult['refresh_expires_in']);
                }

                if (!empty($tokenResult['scope'])) {
                    $account->scopes = explode(',', $tokenResult['scope']);
                }

                $account->metadata = array_filter([
                    'union_id' => $userInfo['union_id'] ?? null,
                    'token_type' => $tokenResult['token_type'] ?? null,
                ]);

                $account->save();

                return $account;
            });
        } catch (Exception $e) {
            if ($e->getMessage() === 'reconnect_account_mismatch') {
                return $this->redirectToFrontend('reconnect_account_mismatch', null, $returnTo);
            }

            Log::error('TikTok OAuth account persistence failed', [
                'error' => 'provider_error',
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'state' => $state,
            ]);
            return $this->redirectToFrontend('provider_error', null, $returnTo);
        }

        $grantedScopes = $tokenResult['scope'] ?? '';
        $hasVideoPublish = str_contains($grantedScopes, 'video.publish');

        if ($reconnectAccountId !== null && !$hasVideoPublish) {
            return $this->redirectToFrontend('video_publish_not_granted', null, $returnTo);
        }

        $extraParams = ['connected' => 'tiktok'];
        if ($reconnectAccountId !== null) {
            $extraParams['reconnected'] = 'tiktok';
        }

        return $this->redirectToFrontend('connected', null, $extraParams);
    }

    private function redirectToFrontend(string $errorCode, ?string $errorDescription = null, array $extraParams = [], ?string $returnTo = null): RedirectResponse
    {
        $frontendUrl = Config::get('nexapa.frontend_url', 'https://app.nexapa.me');
        $frontendUrl = rtrim($frontendUrl, '/');
        
        $params = [];
        
        if ($errorCode === 'connected') {
            $params = $extraParams;
        } else {
            $params['oauth_error'] = $errorCode;
        }

        $redirectPath = $returnTo ?? '/accounts';
        $url = $frontendUrl . $redirectPath;
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        return redirect($url);
    }

    private function mapTikTokErrorToSafeCode(string $tiktokError): string
    {
        return match ($tiktokError) {
            'temporarily_unavailable' => 'temporarily_unavailable',
            'invalid_client' => 'invalid_client',
            'invalid_scope' => 'invalid_scope',
            'invalid_request' => 'invalid_request',
            'invalid_grant' => 'invalid_grant',
            'unauthorized_client' => 'unauthorized_client',
            'access_denied' => 'access_denied',
            'server_error' => 'server_error',
            'user_denied' => 'access_denied',
            'login_again' => 'invalid_grant',
            default => 'provider_error',
        };
    }

    private function isExpiredState(?string $state): bool
    {
        if ($state === null) {
            return false;
        }
        
        $storedPayload = $this->stateService->consumeState($state);
        return $storedPayload === null;
    }

    private function logProviderError(
        string $errorType,
        string $errorCode,
        ?string $errorDescription,
        ?string $logId,
        ?int $httpStatus,
        string $correlationId
    ): void {
        Log::warning('TikTok OAuth provider error', [
            'phase' => 'authorization',
            'provider_error_code' => $errorCode,
            'provider_error_description' => $this->sanitizeErrorDescription($errorDescription),
            'provider_log_id' => $logId,
            'http_status' => $httpStatus,
            'correlation_id' => $correlationId,
        ]);
    }

    private function sanitizeErrorDescription(?string $description): ?string
    {
        if ($description === null) {
            return null;
        }

        $sanitized = preg_replace('/[^\x20-\x7E]/', '', $description);
        return substr($sanitized, 0, 500);
    }

    private function generateCorrelationId(): string
    {
        return 'tiktok_oauth_' . bin2hex(random_bytes(8));
    }
}
