<?php

namespace App\Jobs;

use App\Models\PublisherPost;
use App\Services\OAuth\FacebookOAuthException;
use App\Services\Publisher\FacebookPublisherService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckFacebookPublishStatus implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 10;
    public int $backoff = 10;

    private static array $terminalStatuses = ['completed', 'failed', 'published'];
    private static array $nonRetryableCodes = [
        'authentication_failed',
        'facebook_reconnect_required',
        'permission_denied',
        'video_not_found',
    ];

    public function __construct(
        public PublisherPost $post,
        public int $attemptNumber = 1
    ) {}

    public function handle(FacebookPublisherService $facebookService): void
    {
        $post = PublisherPost::find($this->post->id);

        if (!$post) {
            Log::warning('CheckFacebookPublishStatus job: post not found', ['post_id' => $this->post->id]);
            return;
        }

        if ($post->isCompleted() || $post->isFailed()) {
            Log::info('CheckFacebookPublishStatus job: post in terminal state', [
                'post_id' => $post->id,
                'status' => $post->status,
            ]);
            return;
        }

        $videoId = $post->provider_publish_id;
        if (empty($videoId)) {
            Log::error('CheckFacebookPublishStatus job: video ID missing', [
                'post_id' => $post->id,
            ]);
            
            $post->update([
                'status' => 'failed',
                'failure_code' => 'missing_video_id',
                'failure_message' => 'Facebook video ID is missing',
            ]);
            return;
        }

        $account = $post->connectedAccount;
        $accessToken = $account->access_token_encrypted;

        try {
            $result = $facebookService->checkPublishStatus($accessToken, $videoId);
            
            $providerStatus = $result['provider_status'];
            $appStatus = $result['status'];
            $permalinkUrl = $result['permalink_url'] ?? null;

            $updateData = [
                'provider_status' => $providerStatus,
                'status' => $appStatus,
                'metadata' => array_merge($post->metadata ?? [], [
                    'last_status_check_at' => now()->toIso8601String(),
                    'check_attempt' => $this->attemptNumber,
                ]),
            ];

            if ($permalinkUrl) {
                $updateData['metadata']['permalink_url'] = $permalinkUrl;
            }

            if ($appStatus === 'completed' && $permalinkUrl) {
                $updateData['published_at'] = now();
            }

            $post->update($updateData);

            Log::info('Facebook publish status checked', [
                'post_id' => $post->id,
                'video_id' => $videoId,
                'provider_status' => $providerStatus,
                'app_status' => $appStatus,
                'attempt' => $this->attemptNumber,
            ]);

            if (!in_array($appStatus, self::$terminalStatuses, true)) {
                $this->scheduleNextCheck($post);
            }
        } catch (FacebookOAuthException $e) {
            Log::error('Facebook status check OAuth error', [
                'post_id' => $post->id,
                'error_code' => $e->getErrorCode(),
                'error_message' => $e->getMessage(),
            ]);

            $post->update([
                'status' => 'failed',
                'failure_code' => $e->getErrorCode(),
                'failure_message' => $e->getMessage(),
            ]);

            if ($e->getErrorCode() === 'facebook_reconnect_required') {
                $account->update(['status' => 'error']);
            }

            if (in_array($e->getErrorCode(), self::$nonRetryableCodes, true)) {
                return;
            }

            throw $e;
        } catch (\Exception $e) {
            Log::error('CheckFacebookPublishStatus unexpected error', [
                'post_id' => $post->id,
                'error' => $e->getMessage(),
            ]);

            if ($this->attemptNumber >= 10) {
                $post->update([
                    'status' => 'failed',
                    'failure_code' => 'status_check_failed',
                    'failure_message' => 'Failed to check publishing status after multiple attempts',
                ]);
                return;
            }

            $this->scheduleNextCheck($post);
        }
    }

    private function scheduleNextCheck(PublisherPost $post): void
    {
        $nextAttempt = $this->attemptNumber + 1;
        
        $delaySeconds = min(
            10 * pow(1.5, $this->attemptNumber - 1),
            300
        );

        self::dispatch($post, $nextAttempt)->delay($delaySeconds)->afterCommit();

        Log::info('Next Facebook status check scheduled', [
            'post_id' => $post->id,
            'next_attempt' => $nextAttempt,
            'delay_seconds' => $delaySeconds,
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('CheckFacebookPublishStatus job failed permanently', [
            'post_id' => $this->post->id,
            'error' => $exception->getMessage(),
        ]);

        $post = PublisherPost::find($this->post->id);
        if ($post && !$post->isCompleted()) {
            $post->update([
                'status' => 'failed',
                'failure_code' => 'status_check_job_failed',
                'failure_message' => 'Status check job failed after retries',
            ]);
        }
    }
}