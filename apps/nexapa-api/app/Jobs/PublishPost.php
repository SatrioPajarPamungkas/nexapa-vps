<?php

namespace App\Jobs;

use App\Jobs\CheckTikTokPublishStatus;
use App\Jobs\CheckFacebookPublishStatus;
use App\Models\PublisherPost;
use App\Services\Publisher\TikTokPublisherService;
use App\Services\Publisher\FacebookPublisherService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PublishPost implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    private static array $nonRetryableCodes = [
        'invalid_params',
        'file_not_found',
        'invalid_file_size',
        'file_too_large',
        'permission_denied',
        'authentication_failed',
        'tiktok_reconnect_required',
        'facebook_reconnect_required',
    ];

    public function __construct(
        public PublisherPost $post
    ) {}

    public function middleware(): array
    {
        return [
            (new WithoutOverlapping($this->post->id))->dontRelease(),
        ];
    }

    public function handle(TikTokPublisherService $tiktokService, FacebookPublisherService $facebookService): void
    {
        $post = PublisherPost::find($this->post->id);

        if (!$post) {
            Log::warning('PublishPost job: post not found', ['post_id' => $this->post->id]);
            return;
        }

        if ($post->isCompleted() || $post->isFailed()) {
            Log::warning('PublishPost job: post already in terminal state', [
                'post_id' => $post->id,
                'status' => $post->status,
            ]);
            return;
        }

        DB::transaction(function () use ($post) {
            $claimed = DB::table('publisher_posts')
                ->where('id', $post->id)
                ->where('status', 'queued')
                ->lockForUpdate()
                ->update(['status' => 'uploading']);

            if ($claimed === 0) {
                throw new \RuntimeException('Failed to claim post for publishing');
            }
        });

        try {
            $platform = $post->platform;
            
            if ($platform === 'tiktok') {
                $this->handleTikTokPublishing($post, $tiktokService);
            } elseif ($platform === 'facebook') {
                $this->handleFacebookPublishing($post, $facebookService);
            } else {
                throw new \RuntimeException("Unsupported platform: {$platform}");
            }
        } catch (\App\Services\Publisher\TikTokPublisherException $e) {
            $this->handlePublisherException($post, $e);
        } catch (\App\Services\Publisher\FacebookPublisherException $e) {
            $this->handlePublisherException($post, $e);
        } catch (\Exception $e) {
            Log::error('PublishPost unexpected error', [
                'post_id' => $post->id,
                'error' => $e->getMessage(),
            ]);

            $post->update([
                'status' => 'failed',
                'failure_code' => 'unexpected_error',
                'failure_message' => 'An unexpected error occurred',
            ]);

            throw $e;
        }
    }

    private function handleTikTokPublishing(PublisherPost $post, TikTokPublisherService $publisherService): void
    {
        $providerMode = $post->provider_mode ?? 'upload_as_draft';
        
        if ($providerMode === 'direct_post') {
            $metadata = $post->metadata ?? [];
            $privacyLevel = $metadata['privacy_level'] ?? 'SELF_ONLY';
            $disableComment = $metadata['disable_comment'] ?? false;
            $disableDuet = $metadata['disable_duet'] ?? false;
            $disableStitch = $metadata['disable_stitch'] ?? false;
            $brandContentToggle = $metadata['brand_content_toggle'] ?? false;
            $brandOrganicToggle = $metadata['brand_organic_toggle'] ?? false;
            
            $result = $publisherService->publishDirect(
                $post,
                $privacyLevel,
                $disableComment,
                $disableDuet,
                $disableStitch,
                $brandContentToggle,
                $brandOrganicToggle
            );
        } else {
            $result = $publisherService->uploadAsDraft($post);
        }

        $providerStatus = $result['status'] ?? 'PROCESSING_UPLOAD';
        $appStatus = $publisherService->mapProviderStatus($providerStatus);

        $post->update([
            'provider_status' => $providerStatus,
            'status' => $appStatus,
            'metadata' => array_merge($post->metadata ?? [], [
                'upload_completed_at' => now()->toIso8601String(),
                'publish_id' => $result['publish_id'] ?? null,
            ]),
        ]);

        $delaySeconds = 12;
        CheckTikTokPublishStatus::dispatch($post, 1)->delay($delaySeconds)->afterCommit();

        Log::info('TikTok upload complete, status check scheduled', [
            'post_id' => $post->id,
            'provider_publish_id' => $post->provider_publish_id,
            'provider_status' => $providerStatus,
            'provider_mode' => $providerMode,
            'delay_seconds' => $delaySeconds,
        ]);
    }

    private function handleFacebookPublishing(PublisherPost $post, FacebookPublisherService $facebookService): void
    {
        $providerMode = $post->provider_mode ?? 'direct_post';
        
        if ($providerMode !== 'direct_post') {
            throw new \RuntimeException('Facebook only supports direct_post mode');
        }

        $metadata = $post->metadata ?? [];
        $visibility = $metadata['privacy_level'] ?? 'PUBLISHED';
        $allowComments = !($metadata['disable_comment'] ?? false);
        
        $postType = $metadata['post_type'] ?? 'text';
        
        if ($postType === 'text') {
            $result = $facebookService->publishText($post, $visibility);
        } elseif ($postType === 'image') {
            $result = $facebookService->publishImage($post, $visibility, $allowComments);
        } else {
            $result = $facebookService->publishVideo($post, $visibility, $allowComments);
            
            $providerStatus = $result['status'] ?? 'PROCESSING';
            $appStatus = $providerStatus;

            $post->update([
                'provider_publish_id' => $result['video_id'],
                'provider_status' => $providerStatus,
                'status' => $appStatus,
                'metadata' => array_merge($post->metadata ?? [], [
                    'upload_completed_at' => now()->toIso8601String(),
                ]),
            ]);

            $delaySeconds = 10;
            CheckFacebookPublishStatus::dispatch($post, 1)->delay($delaySeconds)->afterCommit();

            Log::info('Facebook video upload complete, status check scheduled', [
                'post_id' => $post->id,
                'provider_publish_id' => $post->provider_publish_id,
                'provider_status' => $providerStatus,
                'delay_seconds' => $delaySeconds,
            ]);
            
            return;
        }

        $post->update([
            'provider_publish_id' => $result['post_id'] ?? $result['photo_id'] ?? null,
            'provider_status' => $result['status'],
            'status' => $result['status'],
        ]);

        Log::info('Facebook post published', [
            'post_id' => $post->id,
            'provider_publish_id' => $result['post_id'] ?? $result['photo_id'],
            'post_type' => $postType,
        ]);
    }

    private function handlePublisherException(PublisherPost $post, \Exception $e): void
    {
        Log::error('Publisher exception', [
            'post_id' => $post->id,
            'error_code' => method_exists($e, 'getErrorCode') ? $e->getErrorCode() : 'unknown',
            'error_message' => $e->getMessage(),
        ]);

        $post->update([
            'status' => 'failed',
            'failure_code' => method_exists($e, 'getErrorCode') ? $e->getErrorCode() : 'publisher_error',
            'failure_message' => $e->getMessage(),
        ]);

        $errorCode = method_exists($e, 'getErrorCode') ? $e->getErrorCode() : '';
        if ($errorCode === 'tiktok_reconnect_required' || $errorCode === 'facebook_reconnect_required') {
            $post->connectedAccount->update(['status' => 'error']);
        }

        if (in_array($errorCode, self::$nonRetryableCodes, true)) {
            return;
        }

        throw $e;
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('PublishPost job failed permanently', [
            'post_id' => $this->post->id,
            'error' => $exception->getMessage(),
        ]);

        $post = PublisherPost::find($this->post->id);
        if ($post && !$post->isCompleted()) {
            $post->update([
                'status' => 'failed',
                'failure_code' => 'job_failed',
                'failure_message' => 'Publishing job failed after retries',
            ]);
        }
    }
}
