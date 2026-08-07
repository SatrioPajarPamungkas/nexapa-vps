<?php

namespace App\Services;

use App\Models\ConnectedAccount;
use App\Services\OAuth\TikTokOAuthService;
use App\Services\OAuth\TikTokOAuthStateService;
use App\Services\OAuth\FacebookOAuthService;
use App\Services\OAuth\FacebookOAuthStateService;
use App\Services\OAuth\FacebookOAuthException;
use App\Services\OAuth\FacebookPageSyncService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use InvalidArgumentException;

class ConnectedAccountService
{
    public function __construct(
        private readonly TikTokOAuthStateService $tikTokStateService,
        private readonly TikTokOAuthService $tikTokOAuthService,
        private readonly FacebookOAuthService $facebookOAuthService,
        private readonly FacebookOAuthStateService $facebookStateService,
        private readonly FacebookPageSyncService $facebookPageSyncService,
    ) {}

    /**
     * Get all accounts for a user.
     *
     * @param  string|null  $userId
     * @return \Illuminate\Database\Eloquent\Collection<int, ConnectedAccount>
     */
    public function getAccountsForUser(?string $userId): \Illuminate\Database\Eloquent\Collection
    {
        if (!$userId) {
            return (new ConnectedAccount())->newCollection();
        }

        return ConnectedAccount::where('user_id', $userId)
            ->orderBy('platform')
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Initiate connection for a platform.
     * Returns OAuth URL or indicates browser session requirement.
     *
     * @throws \RuntimeException if OAuth not configured
     * @throws \InvalidArgumentException if platform not supported
     */
    public function initiateConnection(string $platform, ?string $userId, ?string $redirectUri = null, string $mode = 'upload_as_draft'): array
    {
        if (!$userId) {
            throw new RuntimeException('Authentication required to connect accounts.');
        }

        if ($platform === 'tiktok') {
            return $this->initiateTikTokConnection($userId, $redirectUri, $mode);
        }

        if ($platform === 'facebook') {
            return $this->initiateFacebookConnection($userId, $redirectUri);
        }

        throw new InvalidArgumentException('Unsupported platform: ' . $platform);
    }

    /**
     * Initiate TikTok OAuth connection.
     */
    private function initiateTikTokConnection(string $userId, ?string $redirectUri, string $mode = 'upload_as_draft'): array
    {
        if (!$this->tikTokOAuthService->isConfigured()) {
            throw new RuntimeException('TikTok OAuth is not configured.', 503);
        }

        $state = $this->tikTokStateService->generateState($userId);
        
        $scopes = $this->getScopesForMode($mode);
        $authorizationUrl = $this->tikTokOAuthService->buildAuthorizationUrl($state, $scopes);

        return [
            'authorization_url' => $authorizationUrl,
            'mode' => $mode,
            'scopes' => $scopes,
        ];
    }

    /**
     * Initiate Facebook OAuth connection.
     */
    private function initiateFacebookConnection(string $userId, ?string $redirectUri): array
    {
        try {
            $state = $this->facebookStateService->generateState($userId, 'initial_connect', null, $redirectUri ?? '/accounts');
            $authorizationUrl = $this->facebookOAuthService->buildAuthorizationUrl($state);
        } catch (FacebookOAuthException $e) {
            throw new RuntimeException('OAuth configuration not available. Please configure credentials in Settings.', 503);
        }

        return [
            'authorization_url' => $authorizationUrl,
            'platform' => 'facebook',
        ];
    }

    /**
     * Initiate TikTok reconnection for an existing account.
     *
     * @throws \RuntimeException if OAuth not configured
     * @throws \InvalidArgumentException if account not found or not owned by user
     */
    public function initiateReconnect(string $accountId, ?string $userId, ?string $returnTo = null): array
    {
        if (!$userId) {
            throw new RuntimeException('Authentication required to reconnect accounts.');
        }

        $account = ConnectedAccount::where('id', $accountId)
            ->where('user_id', $userId)
            ->where('platform', 'tiktok')
            ->first();

        if (!$account) {
            throw new InvalidArgumentException('TikTok account not found or access denied.');
        }

        $state = $this->tikTokStateService->generateState($userId, $accountId, $returnTo);
        
        $scopes = ['user.info.basic', 'video.upload', 'video.publish'];
        $authorizationUrl = $this->tikTokOAuthService->buildAuthorizationUrl($state, $scopes);

        return [
            'authorization_url' => $authorizationUrl,
            'mode' => 'direct_post',
            'scopes' => $scopes,
        ];
    }

    /**
     * Initiate Facebook reconnection for an admin account.
     *
     * @throws \RuntimeException if OAuth not configured
     * @throws \InvalidArgumentException if account not found or not owned by user
     */
    public function initiateFacebookReconnect(string $accountId, ?string $userId, ?string $returnTo = null): array
    {
        if (!$userId) {
            throw new RuntimeException('Authentication required to reconnect accounts.');
        }

        $account = ConnectedAccount::where('id', $accountId)
            ->where('user_id', $userId)
            ->where('platform', 'facebook')
            ->where('account_type', 'facebook_admin')
            ->first();

        if (!$account) {
            throw new InvalidArgumentException('Facebook admin account not found or access denied.');
        }

        try {
            $state = $this->facebookStateService->generateState($userId, 'reconnect_and_sync', $accountId, $returnTo ?? '/accounts');
            $authorizationUrl = $this->facebookOAuthService->buildAuthorizationUrl($state, null, true);
        } catch (FacebookOAuthException $e) {
            throw new RuntimeException('OAuth configuration not available. Please configure credentials in Settings.', 503);
        }

        return [
            'authorization_url' => $authorizationUrl,
            'platform' => 'facebook',
        ];
    }

    /**
     * Get scopes based on publishing mode.
     */
    private function getScopesForMode(string $mode): array
    {
        return match ($mode) {
            'upload_as_draft' => ['user.info.basic', 'video.upload'],
            'direct_post' => ['user.info.basic', 'video.publish'],
            default => ['user.info.basic', 'video.upload'],
        };
    }

    /**
     * Refresh account validation status.
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \RuntimeException
     */
    public function refreshAccount(string $accountId, ?string $userId): ConnectedAccount
    {
        $account = ConnectedAccount::where('id', $accountId)
            ->where('user_id', $userId)
            ->firstOrFail();

        if ($account->platform === 'tiktok') {
            if (!$this->tikTokOAuthService->isConfigured()) {
                throw new RuntimeException('TikTok OAuth is not configured.', 503);
            }
            $this->refreshTikTokAccount($account);
            $account->last_validated_at = now();
            $account->save();
            return $account;
        }

        if ($account->platform === 'facebook' && $account->account_type === 'facebook_admin') {
            if (!$this->facebookOAuthService->isConfigured()) {
                throw new RuntimeException('Facebook OAuth is not configured.', 503);
            }
            return $this->refreshFacebookAdminAccount($account);
        }

        throw new InvalidArgumentException('Refresh not supported for platform: ' . $account->platform);
    }

    /**
     * Refresh Facebook admin profile and avatar from Graph API.
     */
    private function refreshFacebookAdminAccount(ConnectedAccount $account): ConnectedAccount
    {
        $accessToken = $account->access_token_encrypted;

        if (empty($accessToken)) {
            $account->status = 'expired';
            $account->save();
            throw new RuntimeException('No access token available. Please reconnect the Facebook account.');
        }

        try {
            $userInfo = $this->facebookOAuthService->fetchUserInfo($accessToken);
        } catch (\Exception $e) {
            Log::warning('Facebook admin profile refresh failed', [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);
            
            if (str_contains($e->getMessage(), 'authentication') || str_contains($e->getMessage(), 'invalid') || $e instanceof FacebookOAuthException) {
                $account->status = 'expired';
                $account->save();
                throw new RuntimeException('Facebook connection expired. Reconnect the account.');
            }
            
            throw new RuntimeException('Failed to fetch Facebook profile. Please reconnect the account.');
        }

        $account->display_name = $userInfo['name'];
        if (!empty($userInfo['picture'])) {
            $account->avatar_url = $userInfo['picture'];
        }
        $account->last_validated_at = now();
        $account->status = 'connected';
        $account->save();

        try {
            $syncSummary = $this->facebookPageSyncService->syncPages($account, $account->user_id);
            $account->metadata = array_merge($account->metadata ?? [], [
                'last_synced_at' => now()->toISOString(),
                'pages_synced' => $syncSummary['total_returned'] ?? 0,
            ]);
            $account->save();
        } catch (\Exception $e) {
            Log::warning('Facebook Page sync during refresh failed', [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);
        }

        return $account;
    }

    /**
     * Refresh TikTok account tokens.
     */
    private function refreshTikTokAccount(ConnectedAccount $account): void
    {
        $refreshToken = $account->refresh_token_encrypted;

        if (empty($refreshToken)) {
            $account->status = 'expired';
            $account->save();
            throw new RuntimeException('No refresh token available. Please reconnect the TikTok account.');
        }

        try {
            $tokenResult = $this->tikTokOAuthService->refreshAccessToken($refreshToken);
        } catch (RuntimeException $e) {
            if ($e->getCode() === 401 || str_contains($e->getMessage(), 'invalid_grant')) {
                $account->status = 'expired';
                $account->save();
                throw new RuntimeException('TikTok refresh token expired. Please reconnect the account.');
            }

            if ($e->getCode() === 503) {
                throw new RuntimeException('TikTok service temporarily unavailable. Please try again later.', 503);
            }

            throw $e;
        }

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

        $account->status = 'connected';
        $account->save();
    }

    /**
     * Set account as default for its platform.
     * Transactional: clears other defaults for same platform.
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     * @throws \InvalidArgumentException
     */
    public function setDefault(string $accountId, string $platform, ?string $userId): ConnectedAccount
    {
        if (!in_array($platform, ['tiktok', 'facebook'], true)) {
            throw new InvalidArgumentException('Invalid platform');
        }

        return DB::transaction(function () use ($accountId, $platform, $userId) {
            ConnectedAccount::where('user_id', $userId)
                ->where('platform', $platform)
                ->where('is_default', true)
                ->update(['is_default' => false]);

            $account = ConnectedAccount::where('id', $accountId)
                ->where('user_id', $userId)
                ->where('platform', $platform)
                ->firstOrFail();

            $account->is_default = true;
            $account->save();

            return $account;
        });
    }

    /**
     * Remove account.
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function removeAccount(string $accountId, ?string $userId): void
    {
        $account = ConnectedAccount::where('id', $accountId)
            ->where('user_id', $userId)
            ->firstOrFail();

        if ($account->platform === 'tiktok') {
            $this->disconnectTikTokAccount($account);
            return;
        }

        $account->delete();
    }

    /**
     * Disconnect TikTok account with provider revocation.
     */
    private function disconnectTikTokAccount(ConnectedAccount $account): void
    {
        $accessToken = $account->access_token_encrypted;

        if (!empty($accessToken)) {
            try {
                $this->tikTokOAuthService->revokeAccessToken($accessToken);
            } catch (RuntimeException $e) {
                if ($e->getCode() === 503) {
                    throw new RuntimeException('TikTok service temporarily unavailable. Cannot revoke token. Please try again later.', 503);
                }
            }
        }

        DB::transaction(function () use ($account) {
            $account->access_token_encrypted = null;
            $account->refresh_token_encrypted = null;
            $account->token_expires_at = null;
            $account->refresh_token_expires_at = null;
            $account->scopes = null;
            $account->status = 'disconnected';
            $account->is_default = false;
            $account->save();

            $account->delete();
        });
    }
}
