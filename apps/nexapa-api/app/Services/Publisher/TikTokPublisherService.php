<?php

namespace App\Services\Publisher;

use App\Models\ConnectedAccount;
use App\Models\PublisherPost;
use App\Services\OAuth\TikTokOAuthException;
use App\Services\OAuth\TikTokOAuthService;
use App\Services\SettingsService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use InvalidArgumentException;

class TikTokPublisherService
{
    private const CHUNK_SIZE = 10 * 1024 * 1024;
    private const MIN_CHUNK_SIZE = 5 * 1024 * 1024;
    private const MAX_CHUNK_SIZE = 64 * 1024 * 1024;

    public function __construct(
        private TikTokOAuthService $oauthService,
        private SettingsService $settingsService,
        private PublisherReadinessService $readinessService
    ) {}

    public function getCreatorInfo(ConnectedAccount $account): array
    {
        if ($account->needsTokenRefresh()) {
            $this->refreshAccountToken($account);
        }

        $accessToken = $account->access_token_encrypted;

        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->asJson()
            ->timeout(30)
            ->post('https://open.tiktokapis.com/v2/post/publish/creator_info/query/');

        $httpStatus = $response->status();
        $json = $response->json();

        if (!$response->ok()) {
            $this->handleCreatorInfoError($response, $httpStatus, $json);
        }

        $data = $json['data'] ?? [];
        
        $privacyLevels = $data['privacy_level_options'] ?? [];
        $commentDisabled = $data['comment_disabled'] ?? false;
        $duetDisabled = $data['duet_disabled'] ?? false;
        $stitchDisabled = $data['stitch_disabled'] ?? false;
        $maxDuration = $data['max_video_post_duration_sec'] ?? 300;

        return [
            'creator_nickname' => $data['creator_nickname'] ?? '',
            'creator_username' => $data['creator_username'] ?? '',
            'creator_avatar_url' => $data['creator_avatar_url'] ?? '',
            'privacy_level_options' => $privacyLevels,
            'comment_disabled' => (bool) $commentDisabled,
            'duet_disabled' => (bool) $duetDisabled,
            'stitch_disabled' => (bool) $stitchDisabled,
            'max_video_post_duration_sec' => (int) $maxDuration,
        ];
    }

    public function publishDirect(PublisherPost $post, string $privacyLevel, bool $disableComment, bool $disableDuet, bool $disableStitch, bool $brandContentToggle, bool $brandOrganicToggle): array
    {
        $account = $post->connectedAccount;

        $readiness = $this->readinessService->checkForAction($account, 'publish_now');
        if (!$readiness['ready']) {
            throw new TikTokPublisherException(
                'Missing video.publish scope',
                403,
                $readiness['code'] ?? 'permission_denied',
                $readiness['message'] ?? 'Missing video.publish scope',
            );
        }

        if ($account->needsTokenRefresh()) {
            $this->refreshAccountToken($account);
        }

        $accessToken = $account->access_token_encrypted;
        $mediaAsset = $post->mediaAsset;

        $initResponse = $this->initializeDirectPostUpload($accessToken, $mediaAsset, $privacyLevel, $disableComment, $disableDuet, $disableStitch, $brandContentToggle, $brandOrganicToggle);

        $uploadUrl = $initResponse['upload_url'] ?? null;
        $publishId = $initResponse['publish_id'] ?? null;

        if (!$uploadUrl || !$publishId) {
            throw new TikTokPublisherException(
                'TikTok direct post initialization failed',
                500,
                'init_failed',
                'Missing upload_url or publish_id in response'
            );
        }

        $post->update([
            'provider_publish_id' => $publishId,
            'status' => 'uploading',
        ]);

        $this->uploadFile($uploadUrl, $mediaAsset);

        $post->update([
            'status' => 'processing',
            'provider_status' => 'PROCESSING_UPLOAD',
        ]);

        return [
            'status' => 'PROCESSING_UPLOAD',
            'publish_id' => $publishId,
        ];
    }

    private function initializeDirectPostUpload(string $accessToken, $mediaAsset, string $privacyLevel, bool $disableComment, bool $disableDuet, bool $disableStitch, bool $brandContentToggle, bool $brandOrganicToggle): array
    {
        $disk = $mediaAsset->storage_disk;
        $path = $mediaAsset->storage_path;

        if (!Storage::disk($disk)->exists($path)) {
            throw new TikTokPublisherException(
                'Media file not found',
                400,
                'file_not_found',
                'The media file does not exist on storage'
            );
        }

        $fullPath = Storage::disk($disk)->path($path);
        $fileSize = @filesize($fullPath);

        if ($fileSize === false || $fileSize === 0) {
            throw new TikTokPublisherException(
                'Invalid media file size',
                400,
                'invalid_file_size',
                'The media file size is invalid or zero'
            );
        }

        $maxSize = 300 * 1024 * 1024;
        if ($fileSize > $maxSize) {
            throw new TikTokPublisherException(
                'File exceeds maximum size limit',
                400,
                'file_too_large',
                'File size exceeds the 300 MB limit'
            );
        }

        $chunkSize = $this->calculateChunkSize($fileSize);
        $totalChunks = (int) ceil($fileSize / $chunkSize);

        $payload = [
            'post_info' => [
                'title' => $mediaAsset->display_name ?? '',
                'privacy_level' => $privacyLevel,
                'disable_comment' => $disableComment,
                'disable_duet' => $disableDuet,
                'disable_stitch' => $disableStitch,
                'brand_content_toggle' => $brandContentToggle,
                'brand_organic_toggle' => $brandOrganicToggle,
            ],
            'source_info' => [
                'source' => 'FILE_UPLOAD',
                'video_size' => $fileSize,
                'chunk_size' => $chunkSize,
                'total_chunk_count' => $totalChunks,
            ],
        ];

        Log::info('TikTok direct post upload initialization', [
            'privacy_level' => $privacyLevel,
            'disable_comment' => $disableComment,
            'disable_duet' => $disableDuet,
            'disable_stitch' => $disableStitch,
            'source' => 'FILE_UPLOAD',
            'video_size' => $fileSize,
            'chunk_size' => $chunkSize,
            'total_chunk_count' => $totalChunks,
            'mime_type' => $mediaAsset->mime_type,
        ]);

        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->asJson()
            ->timeout(30)
            ->post('https://open.tiktokapis.com/v2/post/publish/video/init/', $payload);

        $httpStatus = $response->status();
        $json = $response->json();

        if (!$response->ok()) {
            $this->handleProviderError($response, $httpStatus, 'init', $json);
        }

        $data = $json['data'] ?? [];
        $publishId = $data['publish_id'] ?? null;
        $uploadUrl = $data['upload_url'] ?? null;

        if (!$publishId || !$uploadUrl) {
            $this->handleProviderError($response, $httpStatus, 'init', $json);
        }

        return [
            'publish_id' => $publishId,
            'upload_url' => $uploadUrl,
        ];
    }

    private function handleCreatorInfoError($response, int $httpStatus, array $json): void
    {
        $providerError = is_array($json['error'] ?? null)
            ? $json['error']
            : $json;

        $errorCode = $providerError['code'] ?? 'unknown_error';
        $errorMessage = $providerError['message']
            ?? $providerError['error_description']
            ?? 'TikTok Creator Info API request failed';

        Log::error('TikTok Creator Info error', [
            'http_status' => $httpStatus,
            'error_code' => $errorCode,
            'error_message' => $errorMessage,
        ]);

        if ($httpStatus >= 500) {
            throw new TikTokPublisherException(
                'TikTok provider error',
                503,
                'provider_error',
                $errorMessage,
            );
        }

        if ($httpStatus === 401 || $httpStatus === 403) {
            throw new TikTokPublisherException(
                'TikTok authentication failed',
                401,
                'authentication_failed',
                $errorMessage,
            );
        }

        throw new TikTokPublisherException(
            $errorMessage,
            $httpStatus,
            $errorCode,
            $errorMessage,
        );
    }

    public function requiresReconnect(ConnectedAccount $account): bool
    {
        return ! $this->readinessService->checkAccount($account)['ready'];
    }

    public function getReconnectReason(): string
    {
        return 'tiktok_reconnect_required';
    }

    public function getReconnectMessage(): string
    {
        return PublisherReadinessService::RECONNECT_MESSAGE;
    }

    public function uploadAsDraft(PublisherPost $post): array
    {
        $account = $post->connectedAccount;

        if ($this->requiresReconnect($account)) {
            throw new TikTokPublisherException(
                'Missing video.upload scope',
                403,
                $this->getReconnectReason(),
                $this->getReconnectMessage()
            );
        }

        if ($account->needsTokenRefresh()) {
            $this->refreshAccountToken($account);
        }

        $accessToken = $account->access_token_encrypted;
        $mediaAsset = $post->mediaAsset;

        $initResponse = $this->initializeUpload($accessToken, $mediaAsset);

        $uploadUrl = $initResponse['upload_url'] ?? null;
        $publishId = $initResponse['publish_id'] ?? null;

        if (!$uploadUrl || !$publishId) {
            throw new TikTokPublisherException(
                'TikTok initialization failed',
                500,
                'init_failed',
                'Missing upload_url or publish_id in response'
            );
        }

        $post->update([
            'provider_publish_id' => $publishId,
            'status' => 'uploading',
        ]);

        $this->uploadFile($uploadUrl, $mediaAsset);

        $post->update([
            'status' => 'processing',
            'provider_status' => 'PROCESSING_UPLOAD',
        ]);

        return [
            'status' => 'PROCESSING_UPLOAD',
            'publish_id' => $publishId,
        ];
    }

    private function initializeUpload(string $accessToken, $mediaAsset): array
    {
        $disk = $mediaAsset->storage_disk;
        $path = $mediaAsset->storage_path;

        if (!Storage::disk($disk)->exists($path)) {
            throw new TikTokPublisherException(
                'Media file not found',
                400,
                'file_not_found',
                'The media file does not exist on storage'
            );
        }

        $fullPath = Storage::disk($disk)->path($path);
        $fileSize = @filesize($fullPath);

        if ($fileSize === false || $fileSize === 0) {
            throw new TikTokPublisherException(
                'Invalid media file size',
                400,
                'invalid_file_size',
                'The media file size is invalid or zero'
            );
        }

        $maxSize = 300 * 1024 * 1024;
        if ($fileSize > $maxSize) {
            throw new TikTokPublisherException(
                'File exceeds maximum size limit',
                400,
                'file_too_large',
                'File size exceeds the 300 MB limit'
            );
        }

        $chunkSize = $this->calculateChunkSize($fileSize);
        $totalChunks = (int) ceil($fileSize / $chunkSize);

        $payload = [
            'source_info' => [
                'source' => 'FILE_UPLOAD',
                'video_size' => $fileSize,
                'chunk_size' => $chunkSize,
                'total_chunk_count' => $totalChunks,
            ],
        ];

        Log::info('TikTok upload initialization', [
            'source' => 'FILE_UPLOAD',
            'video_size' => $fileSize,
            'chunk_size' => $chunkSize,
            'total_chunk_count' => $totalChunks,
            'mime_type' => $mediaAsset->mime_type,
        ]);

        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->asJson()
            ->timeout(30)
            ->post('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', $payload);

        $httpStatus = $response->status();
        $json = $response->json();

        if (!$response->ok()) {
            $this->handleProviderError($response, $httpStatus, 'init', $json);
        }

        $data = $json['data'] ?? [];
        $publishId = $data['publish_id'] ?? null;
        $uploadUrl = $data['upload_url'] ?? null;

        if (!$publishId || !$uploadUrl) {
            $this->handleProviderError($response, $httpStatus, 'init', $json);
        }

        return [
            'publish_id' => $publishId,
            'upload_url' => $uploadUrl,
        ];
    }

    private function uploadFile(string $uploadUrl, $mediaAsset): void
    {
        $disk = $mediaAsset->storage_disk;
        $path = $mediaAsset->storage_path;

        if (!Storage::disk($disk)->exists($path)) {
            throw new TikTokPublisherException(
                'Media file not found',
                400,
                'file_not_found',
                'The media file does not exist on storage'
            );
        }

        $fullPath = Storage::disk($disk)->path($path);
        $fileSize = @filesize($fullPath);

        if ($fileSize === false || $fileSize === 0) {
            throw new TikTokPublisherException(
                'Invalid media file size',
                400,
                'invalid_file_size',
                'The media file size is invalid or zero'
            );
        }

        $chunkSize = $this->calculateChunkSize($fileSize);
        $totalChunks = (int) ceil($fileSize / $chunkSize);

        for ($chunkIndex = 0; $chunkIndex < $totalChunks; $chunkIndex++) {
            $offset = $chunkIndex * $chunkSize;
            $isLastChunk = $chunkIndex === $totalChunks - 1;
            $currentChunkSize = $isLastChunk ? ($fileSize - $offset) : $chunkSize;

            $contentRange = sprintf(
                'bytes %d-%d/%d',
                $offset,
                $offset + $currentChunkSize - 1,
                $fileSize
            );

            $stream = $this->getChunkStream($disk, $path, $offset, $currentChunkSize);

            $uploadResponse = Http::withHeaders([
                'Content-Type' => $mediaAsset->mime_type,
                'Content-Length' => (string) $currentChunkSize,
                'Content-Range' => $contentRange,
            ])
                ->timeout(120)
                ->withBody($stream, $mediaAsset->mime_type)
                ->put($uploadUrl);

            $status = $uploadResponse->status();

            if ($isLastChunk) {
                if ($status !== 201 && !$uploadResponse->ok()) {
                    throw new TikTokPublisherException(
                        'Final chunk upload failed',
                        $status,
                        'chunk_upload_failed',
                        'Failed to upload final chunk'
                    );
                }
            } else {
                if ($status !== 206 && !$uploadResponse->ok()) {
                    throw new TikTokPublisherException(
                        'Chunk upload failed',
                        $status,
                        'chunk_upload_failed',
                        'Failed to upload chunk ' . $chunkIndex
                    );
                }
            }
        }
    }

    private function getChunkStream(string $disk, string $path, int $offset, int $length)
    {
        $fullPath = Storage::disk($disk)->path($path);
        $handle = fopen($fullPath, 'rb');

        if ($handle === false) {
            throw new RuntimeException('Cannot open file for chunked upload');
        }

        fseek($handle, $offset);
        $chunk = fread($handle, $length);
        fclose($handle);

        return $chunk;
    }

    private function calculateChunkSize(int $fileSize): int
    {
        if ($fileSize <= self::MIN_CHUNK_SIZE) {
            return $fileSize;
        }

        $chunkSize = self::CHUNK_SIZE;

        if ($chunkSize < self::MIN_CHUNK_SIZE) {
            $chunkSize = self::MIN_CHUNK_SIZE;
        }

        if ($chunkSize > self::MAX_CHUNK_SIZE) {
            $chunkSize = self::MAX_CHUNK_SIZE;
        }

        return $chunkSize;
    }

    private function fetchPublishStatus(string $accessToken, string $publishId): array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $accessToken,
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])
            ->timeout(30)
            ->post('https://open.tiktokapis.com/v2/post/publish/status/fetch/', [
                'publish_id' => $publishId,
            ]);

        $httpStatus = $response->status();
        $json = $response->json();

        if (!$response->ok()) {
            $this->handleProviderError($response, $httpStatus, 'status');
        }

        $data = $json['data'] ?? [];
        $status = $data['status'] ?? 'UNKNOWN';
        $uploadedBytes = $data['uploaded_bytes'] ?? null;
        $failReason = $data['fail_reason'] ?? null;

        return [
            'status' => $status,
            'publish_id' => $publishId,
            'uploaded_bytes' => $uploadedBytes,
            'fail_reason' => $failReason,
            'raw_response' => $json,
        ];
    }

    public function mapProviderStatus(string $providerStatus): string
    {
        return match ($providerStatus) {
            'UPLOAD_COMPLETE', 'PROCESSING_UPLOAD', 'PROCESSING' => 'processing',
            'SEND_TO_USER_INBOX' => 'completed',
            'PUBLISH_COMPLETE' => 'completed',
            'PUBLISH_FAILED', 'FAILED' => 'failed',
            'PROCESSING_DOWNLOAD' => 'processing',
            'CANCELLED' => 'cancelled',
            default => 'processing',
        };
    }

    private function refreshAccountToken(ConnectedAccount $account): void
    {
        $oauthService = app(TikTokOAuthService::class);

        try {
            $tokenData = $oauthService->refreshAccessToken($account->refresh_token_encrypted);

            $account->update([
                'access_token_encrypted' => $tokenData['access_token'],
                'refresh_token_encrypted' => $tokenData['refresh_token'] ?? $account->refresh_token_encrypted,
                'token_expires_at' => now()->addSeconds($tokenData['expires_in']),
                'refresh_token_expires_at' => isset($tokenData['refresh_expires_in'])
                    ? now()->addSeconds($tokenData['refresh_expires_in'])
                    : $account->refresh_token_expires_at,
                'scopes' => $tokenData['scope'] ? explode(',', $tokenData['scope']) : $account->scopes,
                'last_validated_at' => now(),
            ]);
        } catch (TikTokOAuthException $e) {
            Log::error('TikTok token refresh failed', [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);

            $account->update([
                'status' => 'expired',
            ]);

            throw new TikTokPublisherException(
                'Token refresh failed',
                401,
                'token_expired',
                'TikTok access token expired. Please reconnect.'
            );
        }
    }

    private function handleProviderError($response, int $httpStatus, string $phase, array $json = null): void
    {
        $json = $json ?? $response->json() ?? [];

        $providerError = is_array($json['error'] ?? null)
            ? $json['error']
            : $json;

        $errorCode = $providerError['code'] ?? 'unknown_error';
        $errorMessage = $providerError['message']
            ?? $providerError['error_description']
            ?? 'TikTok API request failed';
        $logId = $providerError['log_id'] ?? null;

        Log::error('TikTok Publisher error', [
            'phase' => $phase,
            'http_status' => $httpStatus,
            'error_code' => $errorCode,
            'error_message' => $errorMessage,
            'log_id' => $logId,
        ]);

        if ($httpStatus >= 500) {
            throw new TikTokPublisherException(
                'TikTok provider error',
                503,
                'provider_error',
                $errorMessage,
                $logId
            );
        }

        if ($httpStatus === 429) {
            throw new TikTokPublisherException(
                'TikTok rate limit exceeded',
                429,
                'rate_limit_exceeded',
                $errorMessage,
                $logId
            );
        }

        if ($httpStatus === 401 || $httpStatus === 403) {
            throw new TikTokPublisherException(
                'TikTok authentication failed',
                401,
                'authentication_failed',
                $errorMessage,
                $logId
            );
        }

        throw new TikTokPublisherException(
            $errorMessage,
            $httpStatus,
            $errorCode,
            $errorMessage,
            $logId
        );
    }
}

class TikTokPublisherException extends RuntimeException
{
    public function __construct(
        string $message,
        int $code,
        private string $errorCode,
        private string $errorMessage,
        private ?string $logId = null
    ) {
        parent::__construct($message, $code);
    }

    public function getErrorCode(): string
    {
        return $this->errorCode;
    }

    public function getErrorMessage(): string
    {
        return $this->errorMessage;
    }

    public function getLogId(): ?string
    {
        return $this->logId;
    }
}
