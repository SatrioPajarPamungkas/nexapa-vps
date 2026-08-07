<?php

namespace App\Jobs;

use App\Models\PublisherPost;
use App\Services\OAuth\TikTokOAuthService;
use App\Services\Publisher\TikTokPublisherService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckTikTokPublishStatus implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 10;
    public int $backoff = 30;

    private const MAX_POLL_ATTEMPTS = 30;
    private const INITIAL_DELAY_SECONDS = 12;
    private const STATUS_CHECK_ENDPOINT = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/';

    private static array $terminalProviderStatuses = [
        'SEND_TO_USER_INBOX',
        'PUBLISH_COMPLETE',
        'FAILED',
        'PUBLISH_FAILED',
        'CANCELLED',
    ];

    private static array $nonRetryableCodes = [
        'invalid_publish_id',
        'authentication_failed',
        'permission_denied',
        'tiktok_reconnect_required',
    ];

    public function __construct(
        public PublisherPost $post,
        public int $attemptNumber = 1
    ) {}

    public function middleware(): array
    {
        return [
            (new WithoutOverlapping($this->post->id))->dontRelease(),
        ];
    }

    public function handle(
        TikTokPublisherService $publisherService,
        TikTokOAuthService $oauthService
    ): void {
        $post = PublisherPost::with('connectedAccount')->find($this->post->id);

        if (!$post) {
            Log::warning('CheckTikTokPublishStatus job: post not found', [
                'post_id' => $this->post->id,
            ]);
            return;
        }

        if ($post->isCompleted() || $post->isFailed() || $post->status === 'cancelled') {
            Log::warning('CheckTikTokPublishStatus job: post in terminal state', [
                'post_id' => $post->id,
                'status' => $post->status,
                'provider_status' => $post->provider_status,
            ]);
            return;
        }

        if (empty($post->provider_publish_id)) {
            Log::error('CheckTikTokPublishStatus job: missing provider_publish_id', [
                'post_id' => $post->id,
            ]);
            $post->update([
                'status' => 'failed',
                'failure_code' => 'missing_publish_id',
                'failure_message' => 'TikTok publish ID is missing',
            ]);
            return;
        }

        if ($this->attemptNumber > self::MAX_POLL_ATTEMPTS) {
            Log::warning('CheckTikTokPublishStatus job: max polling attempts exceeded', [
                'post_id' => $post->id,
                'attempt_number' => $this->attemptNumber,
                'max_attempts' => self::MAX_POLL_ATTEMPTS,
            ]);
            $post->update([
                'status' => 'failed',
                'failure_code' => 'polling_timeout',
                'failure_message' => 'TikTok status polling exceeded maximum attempts',
            ]);
            return;
        }

        if ($post->connectedAccount->needsTokenRefresh()) {
            $this->refreshAccountToken($post->connectedAccount, $oauthService);
        }

        $accessToken = $post->connectedAccount->access_token_encrypted;
        $publishId = $post->provider_publish_id;
        $previousProviderStatus = $post->provider_status;

        $response = $this->fetchStatusFromTikTok($accessToken, $publishId);

        $providerStatus = $response['status'] ?? 'UNKNOWN';
        $providerError = $response['error'] ?? null;
        $uploadedBytes = $response['uploaded_bytes'] ?? null;
        $failReason = $response['fail_reason'] ?? null;
        $logId = $providerError['log_id'] ?? null;

        if ($providerError && ($providerError['code'] ?? '') !== 'ok') {
            Log::error('TikTok status endpoint returned error', [
                'post_id' => $post->id,
                'provider_publish_id' => $publishId,
                'error_code' => $providerError['code'] ?? 'unknown',
                'error_message' => $providerError['message'] ?? 'Unknown error',
                'log_id' => $logId,
            ]);

            $this->handleProviderError($post, $providerError);
            return;
        }

        $appStatus = $publisherService->mapProviderStatus($providerStatus);

        $updateData = [
            'provider_status' => $providerStatus,
            'status' => $appStatus,
            'metadata' => array_merge($post->metadata ?? [], [
                'last_status_check' => now()->toIso8601String(),
                'poll_attempt' => $this->attemptNumber,
                'previous_provider_status' => $previousProviderStatus,
                'uploaded_bytes' => $uploadedBytes,
                'log_id' => $logId,
            ]),
        ];

        if ($providerStatus === 'SEND_TO_USER_INBOX') {
            $updateData['published_at'] = now();
            Log::info('TikTok Upload as Draft delivered to user inbox', [
                'post_id' => $post->id,
                'provider_publish_id' => $publishId,
                'provider_status' => $providerStatus,
            ]);
        } elseif ($providerStatus === 'PUBLISH_COMPLETE') {
            $updateData['published_at'] = now();
            Log::info('TikTok post published successfully', [
                'post_id' => $post->id,
                'provider_publish_id' => $publishId,
                'provider_status' => $providerStatus,
            ]);
        } elseif ($providerStatus === 'FAILED' || $providerStatus === 'PUBLISH_FAILED') {
            $updateData['failure_code'] = 'provider_failed';
            $updateData['failure_message'] = $this->sanitizeFailReason($failReason);
            Log::error('TikTok post publishing failed', [
                'post_id' => $post->id,
                'provider_publish_id' => $publishId,
                'provider_status' => $providerStatus,
                'fail_reason' => $failReason,
            ]);
        }

        $post->update($updateData);

        if (!in_array($providerStatus, self::$terminalProviderStatuses, true)) {
            $delaySeconds = $this->calculateBackoffDelay($this->attemptNumber);
            Log::info('Scheduling next TikTok status check', [
                'post_id' => $post->id,
                'provider_publish_id' => $publishId,
                'current_provider_status' => $providerStatus,
                'next_attempt' => $this->attemptNumber + 1,
                'delay_seconds' => $delaySeconds,
            ]);

            self::dispatch($post, $this->attemptNumber + 1)
                ->delay(now()->addSeconds($delaySeconds));
        }
    }

    private function fetchStatusFromTikTok(string $accessToken, string $publishId): array
    {
        $response = \Illuminate\Support\Facades\Http::withHeaders([
            'Authorization' => 'Bearer ' . $accessToken,
            'Content-Type' => 'application/json; charset=UTF-8',
            'Accept' => 'application/json',
        ])
            ->timeout(30)
            ->post(self::STATUS_CHECK_ENDPOINT, [
                'publish_id' => $publishId,
            ]);

        $httpStatus = $response->status();
        $json = $response->json() ?? [];

        if (!$response->ok()) {
            $providerError = is_array($json['error'] ?? null)
                ? $json['error']
                : ['code' => 'http_error', 'message' => 'HTTP ' . $httpStatus, 'log_id' => null];

            return [
                'status' => 'UNKNOWN',
                'error' => array_merge($providerError, ['http_status' => $httpStatus]),
            ];
        }

        $data = $json['data'] ?? [];
        $status = $data['status'] ?? 'UNKNOWN';
        $uploadedBytes = $data['uploaded_bytes'] ?? null;
        $failReason = $data['fail_reason'] ?? null;
        $error = $json['error'] ?? ['code' => 'ok', 'message' => '', 'log_id' => null];

        return [
            'status' => $status,
            'uploaded_bytes' => $uploadedBytes,
            'fail_reason' => $failReason,
            'error' => $error,
        ];
    }

    private function handleProviderError(PublisherPost $post, array $error): void
    {
        $errorCode = $error['code'] ?? 'unknown_error';
        $errorMessage = $error['message'] ?? 'TikTok API error';
        $logId = $error['log_id'] ?? null;

        if (in_array($errorCode, self::$nonRetryableCodes, true)) {
            $post->update([
                'status' => 'failed',
                'failure_code' => $errorCode,
                'failure_message' => $this->sanitizeFailReason($errorMessage),
                'metadata' => array_merge($post->metadata ?? [], [
                    'last_status_check' => now()->toIso8601String(),
                    'error_log_id' => $logId,
                ]),
            ]);

            if ($errorCode === 'tiktok_reconnect_required') {
                $post->connectedAccount->update(['status' => 'error']);
            }

            return;
        }

        $post->update([
            'status' => 'failed',
            'failure_code' => $errorCode,
            'failure_message' => $this->sanitizeFailReason($errorMessage),
            'metadata' => array_merge($post->metadata ?? [], [
                'last_status_check' => now()->toIso8601String(),
                'error_log_id' => $logId,
            ]),
        ]);
    }

    private function calculateBackoffDelay(int $attempt): int
    {
        if ($attempt === 1) {
            return self::INITIAL_DELAY_SECONDS;
        }

        $baseDelay = 15;
        $maxDelay = 120;

        $exponentialDelay = $baseDelay * pow(2, $attempt - 1);
        $jitter = random_int(0, 10);

        return min($exponentialDelay + $jitter, $maxDelay);
    }

    private function sanitizeFailReason(?string $reason): string
    {
        if (empty($reason)) {
            return 'TikTok publishing failed';
        }

        $sanitized = preg_replace('/[^\x20-\x7E]/', '', $reason);
        return substr(trim($sanitized), 0, 500);
    }

    private function refreshAccountToken($account, TikTokOAuthService $oauthService): void
    {
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
        } catch (\App\Services\OAuth\TikTokOAuthException $e) {
            Log::error('TikTok token refresh failed during status check', [
                'post_id' => $this->post->id,
                'account_id' => $account->id,
                'error_code' => $e->getErrorCode(),
                'error_message' => $e->getErrorMessage(),
            ]);

            $account->update(['status' => 'expired']);

            throw new \App\Services\Publisher\TikTokPublisherException(
                'Token refresh failed',
                401,
                'token_expired',
                'TikTok access token expired. Please reconnect.',
                $e->getLogId()
            );
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('CheckTikTokPublishStatus job failed permanently', [
            'post_id' => $this->post->id,
            'attempt_number' => $this->attemptNumber,
            'error' => $exception->getMessage(),
        ]);

        $post = PublisherPost::find($this->post->id);
        if ($post && !$post->isCompleted()) {
            $post->update([
                'status' => 'failed',
                'failure_code' => 'status_check_failed',
                'failure_message' => 'Status polling job failed after retries',
            ]);
        }
    }
}
