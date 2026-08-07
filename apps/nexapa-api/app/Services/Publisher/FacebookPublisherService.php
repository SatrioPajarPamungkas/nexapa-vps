<?php

namespace App\Services\Publisher;

use App\Models\ConnectedAccount;
use App\Models\PublisherPost;
use App\Services\OAuth\FacebookOAuthException;
use App\Services\OAuth\FacebookOAuthService;
use App\Services\SettingsService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class FacebookPublisherService
{
    public function __construct(
        private FacebookOAuthService $oauthService,
        private SettingsService $settingsService
    ) {}

    public function publishText(PublisherPost $post, string $visibility): array
    {
        $account = $post->connectedAccount;

        if (!$account->isFacebookPage()) {
            throw new FacebookPublisherException(
                'Account must be a Facebook Page',
                400,
                'facebook_page_required',
                'The selected account is not a Facebook Page'
            );
        }

        if ($account->needsTokenRefresh()) {
            $this->refreshAccountToken($account);
        }

        $accessToken = $account->access_token_encrypted;
        $pageId = $account->external_account_id;
        $message = $post->caption ?? '';

        if (empty(trim($message))) {
            throw new FacebookPublisherException(
                'Message is required for text post',
                400,
                'message_required',
                'Text post requires a non-empty message'
            );
        }

        $published = $visibility === 'PUBLISHED';
        $postId = $this->publishToFeed($accessToken, $pageId, $message, $published);

        $post->update([
            'provider_publish_id' => $postId,
            'status' => 'completed',
            'provider_status' => 'published',
            'published_at' => now(),
        ]);

        Log::info('Facebook text post published', [
            'page_id' => $pageId,
            'post_id' => $postId,
        ]);

        return [
            'status' => 'completed',
            'post_id' => $postId,
        ];
    }

    public function publishImage(PublisherPost $post, string $visibility, bool $allowComments): array
    {
        $account = $post->connectedAccount;

        if (!$account->isFacebookPage()) {
            throw new FacebookPublisherException(
                'Account must be a Facebook Page',
                400,
                'facebook_page_required',
                'The selected account is not a Facebook Page'
            );
        }

        if ($account->needsTokenRefresh()) {
            $this->refreshAccountToken($account);
        }

        $accessToken = $account->access_token_encrypted;
        $pageId = $account->external_account_id;
        $mediaAsset = $post->mediaAsset;

        if (!$mediaAsset) {
            throw new FacebookPublisherException(
                'Media asset is required for image post',
                400,
                'media_required',
                'Image post requires a media asset'
            );
        }

        if ($mediaAsset->media_type !== 'image') {
            throw new FacebookPublisherException(
                'Media must be an image',
                400,
                'invalid_media_type',
                'Image post requires an image file'
            );
        }

        $published = $visibility === 'PUBLISHED';
        $photoId = $this->uploadPhotoToFacebook($accessToken, $pageId, $mediaAsset, $post->caption ?? '', $published, $allowComments);

        $post->update([
            'provider_publish_id' => $photoId,
            'status' => 'completed',
            'provider_status' => 'published',
            'published_at' => now(),
        ]);

        Log::info('Facebook image post published', [
            'page_id' => $pageId,
            'photo_id' => $photoId,
        ]);

        return [
            'status' => 'completed',
            'photo_id' => $photoId,
        ];
    }

    public function publishVideo(PublisherPost $post, string $visibility, bool $allowComments): array
    {
        $account = $post->connectedAccount;

        if (!$account->isFacebookPage()) {
            throw new FacebookPublisherException(
                'Account must be a Facebook Page',
                400,
                'facebook_page_required',
                'The selected account is not a Facebook Page'
            );
        }

        if ($account->needsTokenRefresh()) {
            $this->refreshAccountToken($account);
        }

        $accessToken = $account->access_token_encrypted;
        $pageId = $account->external_account_id;
        $mediaAsset = $post->mediaAsset;

        if (!$mediaAsset) {
            throw new FacebookPublisherException(
                'Media asset is required for video post',
                400,
                'media_required',
                'Video post requires a media asset'
            );
        }

        if ($mediaAsset->media_type !== 'video') {
            throw new FacebookPublisherException(
                'Media must be a video',
                400,
                'invalid_media_type',
                'Video post requires a video file'
            );
        }

        $videoId = $this->uploadVideoToFacebook($accessToken, $pageId, $mediaAsset, $post->caption ?? '', $visibility, $allowComments);

        $post->update([
            'provider_publish_id' => $videoId,
            'status' => 'processing',
            'provider_status' => 'PROCESSING',
        ]);

        return [
            'status' => 'processing',
            'video_id' => $videoId,
        ];
    }

    private function publishToFeed(string $accessToken, string $pageId, string $message, bool $published): string
    {
        $graphApiVersion = $this->oauthService->getGraphApiVersion();
        $feedUrl = "https://graph.facebook.com/{$graphApiVersion}/{$pageId}/feed";

        $response = Http::withToken($accessToken)
            ->timeout(30)
            ->asForm()
            ->post($feedUrl, [
                'message' => $message,
                'published' => $published ? 'true' : 'false',
            ]);

        $httpStatus = $response->status();
        $json = $response->json();

        if (!$response->ok() || empty($json['id'])) {
            $this->handleProviderError($response, $httpStatus, $json);
        }

        return $json['id'];
    }

    private function uploadPhotoToFacebook(string $accessToken, string $pageId, $mediaAsset, string $caption, bool $published, bool $allowComments): string
    {
        $disk = $mediaAsset->storage_disk;
        $path = $mediaAsset->storage_path;

        if (!Storage::disk($disk)->exists($path)) {
            throw new FacebookPublisherException(
                'Media file not found',
                400,
                'file_not_found',
                'The media file does not exist on storage'
            );
        }

        $fullPath = Storage::disk($disk)->path($path);
        $fileSize = @filesize($fullPath);

        if ($fileSize === false || $fileSize === 0) {
            throw new FacebookPublisherException(
                'Invalid media file size',
                400,
                'invalid_file_size',
                'The media file size is invalid or zero'
            );
        }

        $graphApiVersion = $this->oauthService->getGraphApiVersion();
        $photosUrl = "https://graph.facebook.com/{$graphApiVersion}/{$pageId}/photos";

        $response = Http::withToken($accessToken)
            ->timeout(120)
            ->attach('source', file_get_contents($fullPath), basename($fullPath))
            ->post($photosUrl, [
                'message' => $caption,
                'published' => $published ? 'true' : 'false',
                'allow_comments' => $allowComments ? 'true' : 'false',
            ]);

        $httpStatus = $response->status();
        $json = $response->json();

        if (!$response->ok() || empty($json['id'])) {
            $this->handleProviderError($response, $httpStatus, $json);
        }

        return $json['id'];
    }

    private function uploadVideoToFacebook(string $accessToken, string $pageId, $mediaAsset, string $caption, string $visibility, bool $allowComments): string
    {
        $disk = $mediaAsset->storage_disk;
        $path = $mediaAsset->storage_path;

        if (!Storage::disk($disk)->exists($path)) {
            throw new FacebookPublisherException(
                'Media file not found',
                400,
                'file_not_found',
                'The media file does not exist on storage'
            );
        }

        $fullPath = Storage::disk($disk)->path($path);
        $fileSize = @filesize($fullPath);

        if ($fileSize === false || $fileSize === 0) {
            throw new FacebookPublisherException(
                'Invalid media file size',
                400,
                'invalid_file_size',
                'The media file size is invalid or zero'
            );
        }

        $maxSize = 10 * 1024 * 1024 * 1024;
        if ($fileSize > $maxSize) {
            throw new FacebookPublisherException(
                'File too large for Facebook (max 10GB)',
                400,
                'file_too_large',
                'The media file exceeds Facebook maximum size'
            );
        }

        $graphApiVersion = $this->oauthService->getGraphApiVersion();
        $videoUrl = "https://graph.facebook.com/{$graphApiVersion}/{$pageId}/videos";

        $published = $visibility === 'PUBLISHED';

        $response = Http::withToken($accessToken)
            ->timeout(300)
            ->attach('video_file', file_get_contents($fullPath), basename($fullPath))
            ->post($videoUrl, [
                'description' => $caption,
                'published' => $published,
                'allow_comments' => $allowComments ? 'true' : 'false',
            ]);

        $httpStatus = $response->status();
        $json = $response->json();

        if (!$response->ok() || empty($json['id'])) {
            $this->handleProviderError($response, $httpStatus, $json);
        }

        Log::info('Facebook video upload initiated', [
            'page_id' => $pageId,
            'video_id' => $json['id'],
            'file_size' => $fileSize,
        ]);

        return $json['id'];
    }

    public function checkPublishStatus(string $accessToken, string $videoId): array
    {
        $graphApiVersion = $this->oauthService->getGraphApiVersion();
        
        $url = "https://graph.facebook.com/{$graphApiVersion}/{$videoId}";

        $response = Http::withToken($accessToken)
            ->timeout(30)
            ->get($url, [
                'fields' => 'status,id,permalink_url,created_time',
            ]);

        if (!$response->ok()) {
            Log::error('Facebook status check HTTP error', [
                'video_id' => $videoId,
                'http_status' => $response->status(),
                'response_body' => $response->body(),
                'url' => $url,
            ]);

            throw new FacebookPublisherException(
                'Failed to fetch Facebook video status',
                500,
                'status_fetch_failed',
                'Could not retrieve video status from Facebook'
            );
        }

        $data = $response->json();
        
        $fbStatus = $this->extractFacebookVideoStatus($data);

        if ($fbStatus === null) {
            Log::warning('Facebook video status could not be extracted', [
                'video_id' => $videoId,
                'status_field' => $data['status'] ?? null,
            ]);
        }

        $appStatus = $this->mapFacebookStatus($fbStatus ?? 'unknown');

        return [
            'status' => $appStatus,
            'provider_status' => $fbStatus ?? 'unknown',
            'video_id' => $data['id'] ?? $videoId,
            'permalink_url' => $data['permalink_url'] ?? null,
            'created_time' => $data['created_time'] ?? null,
        ];
    }

    private function extractFacebookVideoStatus(array $response): ?string
    {
        if (isset($response['video_status']) && is_string($response['video_status'])) {
            return $response['video_status'];
        }

        if (isset($response['status'])) {
            if (is_string($response['status'])) {
                return $response['status'];
            }
            
            if (is_array($response['status'])) {
                if (isset($response['status']['video_status']) && is_string($response['status']['video_status'])) {
                    return $response['status']['video_status'];
                }
                
                if (isset($response['status']['status']) && is_string($response['status']['status'])) {
                    return $response['status']['status'];
                }
                
                if (isset($response['status']['processing_phase']['status']) && is_string($response['status']['processing_phase']['status'])) {
                    return $response['status']['processing_phase']['status'];
                }
            }
        }

        if (isset($response['processing_phase']['status']) && is_string($response['processing_phase']['status'])) {
            return $response['processing_phase']['status'];
        }

        return null;
    }

    private function mapFacebookStatus(string $fbStatus): string
    {
        return match ($fbStatus) {
            'ready' => 'completed',
            'published' => 'completed',
            'processing' => 'processing',
            'uploading' => 'uploading',
            'error' => 'failed',
            'deleted' => 'failed',
            default => 'processing',
        };
    }

    private function refreshAccountToken(ConnectedAccount $account): void
    {
        try {
            $facebookSettings = $this->settingsService->getFacebookSettings();
            $appId = $facebookSettings['facebook_app_id'];
            $appSecret = $facebookSettings['facebook_app_secret'];

            if (empty($appId) || empty($appSecret)) {
                throw new RuntimeException('Facebook app credentials not configured');
            }

            $graphApiVersion = $this->oauthService->getGraphApiVersion();
            $url = "https://graph.facebook.com/{$graphApiVersion}/oauth/access_token";

            $response = Http::withHeaders([
                'Content-Type' => 'application/x-www-form-urlencoded',
                'Accept' => 'application/json',
            ])
                ->timeout(30)
                ->asForm()
                ->get($url, [
                    'grant_type' => 'fb_exchange_token',
                    'client_id' => $appId,
                    'client_secret' => $appSecret,
                    'fb_exchange_token' => $account->access_token_encrypted,
                ]);

            if (!$response->ok()) {
                throw new FacebookPublisherException(
                    'Failed to refresh Facebook token',
                    401,
                    'facebook_token_expired',
                    'Could not refresh Facebook access token'
                );
            }

            $json = $response->json();
            $newToken = $json['access_token'] ?? null;

            if ($newToken) {
                $account->update([
                    'access_token_encrypted' => $newToken,
                    'token_expires_at' => now()->addSeconds($json['expires_in'] ?? 5184000),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Facebook token refresh failed', [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);
            throw new FacebookPublisherException(
                'Facebook token refresh failed',
                401,
                'facebook_reconnect_required',
                'Facebook access token expired. Reconnect required.'
            );
        }
    }

    private function handleProviderError($response, int $httpStatus, array $json): void
    {
        $error = $json['error']['message'] ?? 'Facebook publishing failed';
        $errorCode = $json['error']['code'] ?? 'provider_error';
        $errorType = $json['error']['type'] ?? 'unknown';
        $fbTraceId = $json['error']['fbtrace_id'] ?? null;

        Log::error('Facebook publisher error', [
            'http_status' => $httpStatus,
            'error_code' => $errorCode,
            'error_type' => $errorType,
            'error_message' => $error,
        ]);

        if ($httpStatus >= 500) {
            throw new FacebookPublisherException(
                'Facebook provider error',
                503,
                'provider_error',
                $error
            );
        }

        if ($httpStatus === 401 || $httpStatus === 403) {
            throw new FacebookPublisherException(
                'Facebook authentication failed',
                401,
                'facebook_reconnect_required',
                $error
            );
        }

        throw new FacebookPublisherException(
            'Facebook publishing failed',
            $httpStatus,
            $this->mapErrorCode($errorCode),
            $error
        );
    }

    private function mapErrorCode(string $code): string
    {
        return match ($code) {
            '100' => 'facebook_publish_failed',
            '200' => 'facebook_permission_missing',
            '368' => 'facebook_media_unreachable',
            default => 'facebook_publish_failed',
        };
    }
}

class FacebookPublisherException extends \Exception
{
    public function __construct(
        string $message,
        int $httpStatus,
        private string $errorCode,
        private string $errorMessage
    ) {
        parent::__construct($message, $httpStatus);
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getErrorMessage(): string
    {
        return $this->errorMessage;
    }
}