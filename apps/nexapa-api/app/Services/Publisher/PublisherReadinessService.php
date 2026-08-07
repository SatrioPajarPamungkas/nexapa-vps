<?php

namespace App\Services\Publisher;

use App\Enums\MediaAssetStatus;
use App\Models\ConnectedAccount;
use App\Models\MediaAsset;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Storage;

class PublisherReadinessService
{
    public const RECONNECT_MESSAGE = 'Reconnect TikTok to grant video upload permission.';

    public function __construct(private SettingsService $settingsService) {}

    public function normalizedScopes(ConnectedAccount $account): array
    {
        $scopes = $account->getRawOriginal('scopes');

        if (is_string($scopes)) {
            $decoded = json_decode($scopes, true);
            $scopes = is_array($decoded) || is_string($decoded) ? $decoded : $scopes;
        }

        if (is_string($scopes)) {
            $scopes = preg_split('/[\s,]+/', $scopes, -1, PREG_SPLIT_NO_EMPTY);
        }

        if (! is_array($scopes)) {
            return [];
        }

        $normalized = [];
        foreach ($scopes as $scope) {
            if (! is_string($scope)) {
                continue;
            }

            foreach (preg_split('/[\s,]+/', $scope, -1, PREG_SPLIT_NO_EMPTY) as $name) {
                $normalized[] = trim($name);
            }
        }

        return array_values(array_unique(array_filter($normalized)));
    }

    public function checkAccount(ConnectedAccount $account, ?string $action = null, ?string $userId = null): array
    {
        $scopes = $this->normalizedScopes($account);

        if ($account->trashed()) {
            return $this->failure('connected_account_deleted', 'This connected account has been deleted.', null, $scopes, 409);
        }

        if ($account->platform === 'tiktok') {
            return $this->checkTikTokAccount($account, $action, $scopes);
        }

        if ($account->platform === 'facebook') {
            return $this->checkFacebookAccount($account, $action, $scopes, $userId);
        }

        return $this->failure('unsupported_platform', 'Only TikTok and Facebook are currently supported.', null, $scopes, 409);
    }

    private function checkTikTokAccount(ConnectedAccount $account, ?string $action, array $scopes): array
    {
        if ($account->status !== 'connected') {
            return $this->failure('tiktok_account_not_connected', 'Reconnect TikTok before publishing.', null, $scopes, 409);
        }

        $action = $action ?? 'draft';
        
        if ($action === 'publish_now' || $action === 'schedule') {
            if (! in_array('video.publish', $scopes, true)) {
                return $this->failure('tiktok_reconnect_required', 'Reconnect TikTok to grant direct publishing permission.', null, $scopes, 409);
            }
            
            return [
                'ready' => true,
                'code' => null,
                'message' => null,
                'http_status' => 200,
                'provider_mode' => 'direct_post',
                'required_scope' => 'video.publish',
                'scopes' => $scopes,
            ];
        }

        if ($action === 'draft') {
            if (! in_array('video.upload', $scopes, true)) {
                return $this->failure('tiktok_reconnect_required', 'Reconnect TikTok to grant video upload permission.', null, $scopes, 409);
            }
            
            return [
                'ready' => true,
                'code' => null,
                'message' => null,
                'http_status' => 200,
                'provider_mode' => 'upload_as_draft',
                'required_scope' => 'video.upload',
                'scopes' => $scopes,
            ];
        }

        return $this->failure('invalid_action', 'Invalid publisher action.', null, $scopes, 409);
    }

    private function checkFacebookAccount(ConnectedAccount $account, ?string $action, array $scopes, ?string $userId): array
    {
        if (($userId !== null && (string) $account->user_id !== $userId) || ! $account->isFacebookPage()) {
            return $this->failure('facebook_page_required', 'Only Facebook Page accounts can publish posts.', null, $scopes, 409);
        }

        if ($account->status !== 'connected') {
            return $this->failure('facebook_account_not_connected', 'Reconnect Facebook before publishing.', null, $scopes, 409);
        }

        if (! $account->is_publishable || empty($account->access_token_encrypted)) {
            return $this->failure('facebook_page_not_publishable', 'Reconnect Facebook before publishing to this Page.', null, $scopes, 409);
        }

        $parentAccount = ConnectedAccount::query()
            ->whereKey($account->parent_connected_account_id)
            ->where('user_id', $account->user_id)
            ->where('platform', 'facebook')
            ->where('account_type', 'facebook_admin')
            ->where('status', 'connected')
            ->first();

        if (! $parentAccount) {
            return $this->failure('facebook_account_not_connected', 'Reconnect Facebook before publishing.', null, [], 409);
        }

        $parentScopes = array_values(array_unique(array_map(
            static fn (string $scope): string => strtolower(trim($scope)),
            $this->normalizedScopes($parentAccount)
        )));
        $pageTasks = collect(data_get($account->metadata, 'tasks', []))
            ->map(static fn ($task): string => strtoupper(trim((string) $task)))
            ->filter()
            ->values();

        if (! in_array('pages_manage_posts', $parentScopes, true) || ! $pageTasks->contains(
            static fn (string $task): bool => in_array($task, ['CREATE_CONTENT', 'MANAGE'], true)
        )) {
            return $this->failure('facebook_permission_missing', 'Reconnect Facebook to grant publishing permissions.', null, $parentScopes, 409);
        }

        $requiredPermissions = ['pages_manage_posts'];

        $action = $action ?? 'publish_now';
        
        if ($action === 'publish_now' || $action === 'draft') {
            return [
                'ready' => true,
                'code' => null,
                'message' => null,
                'http_status' => 200,
                'provider_mode' => 'direct_post',
                'required_permissions' => $requiredPermissions,
                'scopes' => $parentScopes,
            ];
        }

        return $this->failure('invalid_action', 'Invalid publisher action.', null, $parentScopes, 409);
    }

    public function checkMedia(MediaAsset $media, ?string $platform = null): array
    {
        $status = $media->status instanceof MediaAssetStatus ? $media->status->value : (string) $media->status;
        $platform = $platform ?? 'tiktok';

        if ($platform === 'tiktok') {
            if ($media->media_type !== 'video') {
                return $this->failure('media_type_not_supported', 'TikTok publishing requires a video.', null, [], 409);
            }
        }

        if (! in_array($media->status, [
            MediaAssetStatus::Available,
            MediaAssetStatus::Archived,
        ], true)) {
            return $this->failure('media_not_ready', 'Wait for the media upload to finish before publishing.', null, [], 409);
        }

        if (! $media->storage_disk || ! $media->storage_path || ! Storage::disk($media->storage_disk)->exists($media->storage_path)) {
            return $this->failure('media_file_missing', 'The uploaded media file is unavailable. Upload the video again.', null, [], 409);
        }

        return [
            'ready' => true,
            'code' => null,
            'message' => null,
            'http_status' => 200,
            'media_status' => $status,
        ];
    }

    private function failure(string $code, string $message, ?string $mode, array $scopes, int $httpStatus): array
    {
        return [
            'ready' => false,
            'code' => $code,
            'message' => $message,
            'http_status' => $httpStatus,
            'provider_mode' => $mode,
            'scopes' => $scopes,
        ];
    }

    public function checkForAction(ConnectedAccount $account, string $action, ?string $userId = null): array
    {
        return $this->checkAccount($account, $action, $userId);
    }
}
