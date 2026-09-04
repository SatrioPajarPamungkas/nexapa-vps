<?php

namespace App\Http\Controllers\Api\OAuth;

use App\Http\Controllers\Controller;
use App\Models\ConnectedAccount;
use App\Models\User;
use App\Services\OAuth\FacebookOAuthException;
use App\Services\OAuth\FacebookOAuthService;
use App\Services\OAuth\FacebookOAuthStateService;
use App\Services\OAuth\FacebookPageSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use InvalidArgumentException;
use Exception;

class FacebookOAuthController extends Controller
{
    public function __construct(
        private readonly FacebookOAuthService $oauthService,
        private readonly FacebookOAuthStateService $stateService,
        private readonly FacebookPageSyncService $pageSyncService,
    ) {}

    public function callback(Request $request): RedirectResponse
    {
        $state = $request->query('state');
        $code = $request->query('code');
        $error = $request->query('error');
        $errorDescription = $request->query('error_description');

        $correlationId = $this->generateCorrelationId();
        $startTime = now();
        // State is single-use. Keep a safe fallback available before
        // consuming it so repeated/expired callbacks still redirect to
        // the frontend instead of throwing an undefined-variable error.
        $returnTo = '/accounts';

        $payload = $this->stateService->consumeState($state);

        if ($payload === null) {
            if ($this->stateService->isExpiredState($state)) {
                return $this->redirectToFrontend('expired_state', null, [], $returnTo);
            }
            return $this->redirectToFrontend('invalid_state', null, [], $returnTo);
        }

        $userId = $payload['user_id'];
        $reconnectAdminAccountId = $payload['reconnect_admin_account_id'] ?? null;
        $returnTo = $payload['return_to'] ?? '/accounts';
        $mode = $payload['mode'] ?? 'initial_connect';

        $user = User::find($userId);
        if ($user === null) {
            return $this->redirectToFrontend('provider_error', null, [], $returnTo);
        }

        if (!empty($error)) {
            $this->logProviderError('facebook_authorization_error', $error, $errorDescription, null, null, $correlationId);
            
            $safeErrorCode = $this->mapFacebookErrorToSafeCode($error);
            return $this->redirectToFrontend($safeErrorCode, null, [], $returnTo);
        }

        if (empty($code)) {
            return $this->redirectToFrontend('provider_error', null, [], $returnTo);
        }

        try {
            $tokenResult = $this->oauthService->exchangeAuthorizationCode($code);
        } catch (FacebookOAuthException $e) {
            $this->logTokenExchangeError($e, $correlationId);
            $safeErrorCode = $this->mapFacebookErrorToSafeCode($e->getErrorCode() ?? 'provider_error');
            return $this->redirectToFrontend($safeErrorCode, null, [], $returnTo);
        } catch (InvalidArgumentException $e) {
            $this->logTokenExchangeError($e, $correlationId, 'invalid_code');
            return $this->redirectToFrontend('provider_error', null, [], $returnTo);
        } catch (RuntimeException $e) {
            $statusCode = $e->getCode();
            
            if ($statusCode === 401) {
                $this->logTokenExchangeError($e, $correlationId, 'token_exchange_failed');
                return $this->redirectToFrontend('token_exchange_failed', null, [], $returnTo);
            }

            $this->logTokenExchangeError($e, $correlationId);
            return $this->redirectToFrontend('provider_error', null, [], $returnTo);
        }

        try {
            $longLivedToken = $this->oauthService->getLongLivedToken($tokenResult['access_token']);
        } catch (Exception $e) {
            Log::warning('Facebook long-lived token exchange failed, using short-lived token', [
                'correlation_id' => $correlationId,
                'error' => $e->getMessage(),
            ]);
            $longLivedToken = $tokenResult;
        }

        try {
            $userInfo = $this->oauthService->fetchUserInfo($longLivedToken['access_token']);
        } catch (FacebookOAuthException $e) {
            $this->logUserInfoError($e, $correlationId);
            $safeErrorCode = $this->mapFacebookErrorToSafeCode($e->getErrorCode() ?? 'user_info_failed');
            return $this->redirectToFrontend($safeErrorCode, null, [], $returnTo);
        } catch (RuntimeException $e) {
            $this->logUserInfoError($e, $correlationId);
            return $this->redirectToFrontend('user_info_failed', null, [], $returnTo);
        }

        $facebookUserId = $userInfo['id'];
        if ($facebookUserId === null) {
            return $this->redirectToFrontend('provider_error', null, [], $returnTo);
        }

        $grantedPermissions = $this->oauthService->fetchGrantedPermissions($longLivedToken['access_token']);

        try {
            $adminAccount = DB::transaction(function () use ($user, $longLivedToken, $userInfo, $facebookUserId, $reconnectAdminAccountId, $grantedPermissions, $mode) {
                if ($reconnectAdminAccountId !== null) {
                    $existingAdmin = ConnectedAccount::where('id', $reconnectAdminAccountId)
                        ->where('user_id', $user->id)
                        ->where('platform', 'facebook')
                        ->where('account_type', 'facebook_admin')
                        ->first();

                    if (!$existingAdmin) {
                        throw new Exception('facebook_admin_account_mismatch');
                    }

                    if ($existingAdmin->external_account_id !== null && $existingAdmin->external_account_id !== $facebookUserId) {
                        throw new Exception('facebook_admin_account_mismatch');
                    }

                    $adminAccount = $existingAdmin;
                } else {
                    $existing = ConnectedAccount::withTrashed()
                        ->where('user_id', $user->id)
                        ->where('platform', 'facebook')
                        ->where('account_type', 'facebook_admin')
                        ->where('external_account_id', $facebookUserId)
                        ->first();

                    if ($existing) {
                        $existing->restore();
                        $adminAccount = $existing;
                    } else {
                        $adminAccount = new ConnectedAccount();
                        $adminAccount->id = (string) Str::uuid();
                        $adminAccount->user_id = $user->id;
                        $adminAccount->platform = 'facebook';
                        $adminAccount->account_type = 'facebook_admin';
                        $adminAccount->is_publishable = false;
                    }
                }

                $adminAccount->external_account_id = $facebookUserId;
                $adminAccount->display_name = $userInfo['name'];
                $adminAccount->avatar_url = $userInfo['picture'] ?? null;
                $adminAccount->status = 'connected';
                $adminAccount->connection_method = 'oauth';
                $adminAccount->last_validated_at = now();
                $adminAccount->access_token_encrypted = $longLivedToken['access_token'];
                $adminAccount->scopes = $grantedPermissions;
                $adminAccount->metadata = [
                    'token_type' => 'long_lived',
                ];

                if ($longLivedToken['expires_in'] > 0) {
                    $adminAccount->token_expires_at = now()->addSeconds($longLivedToken['expires_in']);
                }

                $adminAccount->save();

                return $adminAccount;
            });
        } catch (Exception $e) {
            if ($e->getMessage() === 'facebook_admin_account_mismatch') {
                return $this->redirectToFrontend('facebook_admin_account_mismatch', null, [], $returnTo);
            }

            Log::error('Facebook OAuth account persistence failed', [
                'error' => 'provider_error',
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'state' => $state,
                'correlation_id' => $correlationId,
            ]);
            return $this->redirectToFrontend('provider_error', null, [], $returnTo);
        }

        $pagesSynced = 0;
        try {
            $syncSummary = $this->pageSyncService->syncPages($adminAccount, $user->id);
            $pagesSynced = $syncSummary['total_returned'] ?? 0;

            $adminAccount->metadata = array_merge($adminAccount->metadata ?? [], [
                'last_synced_at' => now()->toISOString(),
            ]);
            $adminAccount->save();
        } catch (Exception $e) {
            Log::error('Facebook Page synchronization failed', [
                'admin_account_id' => $adminAccount->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'correlation_id' => $correlationId,
            ]);
            return $this->redirectToFrontend('facebook_page_sync_failed', null, [], $returnTo);
        }

        $duration = $startTime->diffInSeconds(now());

        Log::info('Facebook OAuth completed successfully', [
            'correlation_id' => $correlationId,
            'user_id' => $user->id,
            'admin_account_id' => $adminAccount->id,
            'pages_synchronized' => $pagesSynced,
            'mode' => $mode,
            'duration_seconds' => $duration,
        ]);

        $extraParams = ['connected' => 'facebook', 'synced' => 'facebook'];
        if ($reconnectAdminAccountId !== null) {
            $extraParams = ['reconnected' => 'facebook', 'synced' => 'facebook'];
        }

        return $this->redirectToFrontend('connected', null, $extraParams, $returnTo);
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

    private function mapFacebookErrorToSafeCode(string $facebookError): string
    {
        return match ($facebookError) {
            'access_denied', 'user_denied' => 'facebook_access_denied',
            'invalid_scope' => 'facebook_invalid_scope',
            'invalid_request' => 'facebook_invalid_request',
            'invalid_grant' => 'facebook_invalid_grant',
            'temporarily_unavailable' => 'facebook_temporarily_unavailable',
            'server_error' => 'facebook_server_error',
            'pages_show_list_missing' => 'facebook_pages_show_list_missing',
            'pages_read_engagement_missing' => 'facebook_pages_read_engagement_missing',
            'pages_manage_posts_missing' => 'facebook_pages_manage_posts_missing',
            default => 'facebook_provider_error',
        };
    }

    private function logProviderError(
        string $errorType,
        string $errorCode,
        ?string $errorDescription,
        ?string $fbTraceId,
        ?int $httpStatus,
        string $correlationId
    ): void {
        Log::warning('Facebook OAuth provider error', [
            'phase' => 'authorization',
            'provider_error_code' => $errorCode,
            'provider_error_description' => $this->sanitizeErrorDescription($errorDescription),
            'fbtrace_id' => $fbTraceId,
            'http_status' => $httpStatus,
            'correlation_id' => $correlationId,
        ]);
    }

    private function logTokenExchangeError(Exception $e, string $correlationId, string $phase = 'token_exchange'): void
    {
        $errorData = [
            'phase' => $phase,
            'correlation_id' => $correlationId,
        ];

        if ($e instanceof FacebookOAuthException) {
            $errorData['provider_error_code'] = $e->getErrorCode();
            $errorData['provider_error_description'] = $this->sanitizeErrorDescription($e->getErrorDescription());
            $errorData['fbtrace_id'] = $e->getFbTraceId();
            $errorData['http_status'] = $e->getHttpStatus();
        } else {
            $errorData['error_message'] = $e->getMessage();
        }

        Log::error('Facebook OAuth token exchange failed', $errorData);
    }

    private function logUserInfoError(Exception $e, string $correlationId): void
    {
        $errorData = [
            'phase' => 'user_info_fetch',
            'correlation_id' => $correlationId,
        ];

        if ($e instanceof FacebookOAuthException) {
            $errorData['provider_error_code'] = $e->getErrorCode();
            $errorData['provider_error_description'] = $this->sanitizeErrorDescription($e->getErrorDescription());
            $errorData['fbtrace_id'] = $e->getFbTraceId();
        } else {
            $errorData['error_message'] = $e->getMessage();
        }

        Log::error('Facebook OAuth user info fetch failed', $errorData);
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
        return 'facebook_oauth_' . bin2hex(random_bytes(8));
    }
}
