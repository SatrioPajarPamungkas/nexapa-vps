<?php

namespace App\Services\Scheduler;

use App\Enums\MediaAssetStatus;
use App\Models\ConnectedAccount;
use App\Models\MediaAsset;
use App\Models\PublisherPost;
use App\Services\Publisher\PublisherReadinessService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BatchScheduleService
{
    public function __construct(private PublisherReadinessService $readinessService) {}

    public function createBatchSchedule(
        string $userId,
        string $platform,
        string|array $connectedAccountIds,
        string $timezone,
        array $items
    ): array {
        $correlationId = (string) Str::uuid();
        $accountIds = is_array($connectedAccountIds) ? $connectedAccountIds : [$connectedAccountIds];

        $connectedAccounts = ConnectedAccount::where('user_id', $userId)
            ->whereIn('id', $accountIds)
            ->get()
            ->keyBy('id');

        if ($connectedAccounts->count() !== count($accountIds)) {
            throw new \Exception('One or more connected accounts were not found or do not belong to user.');
        }

        foreach ($accountIds as $accountId) {
            $connectedAccount = $connectedAccounts[$accountId];

            if ($connectedAccount->platform !== $platform) {
                throw new \Exception('Selected account does not match the specified platform.');
            }

            if ($connectedAccount->status !== 'connected') {
                throw new \Exception('Account is not connected.');
            }

            if ($platform === 'facebook') {
                if (!$connectedAccount->isFacebookPage()) {
                    throw new \Exception('Only Facebook Page accounts can be used for scheduling.');
                }
                if (!$connectedAccount->is_publishable) {
                    throw new \Exception('Facebook Page is not publishable.');
                }
            }

            if ($platform === 'tiktok' && $connectedAccount->status !== 'connected') {
                throw new \Exception('TikTok account is not connected.');
            }
        }

        // Validate items and collect media assets
        $validatedItems = [];
        $mediaIds = array_column($items, 'media_asset_id');
        $mediaAssets = MediaAsset::whereIn('id', $mediaIds)
            ->where('user_id', $userId)
            ->get()
            ->keyBy('id');

        foreach ($items as $index => $item) {
            $mediaAssetId = $item['media_asset_id'];

            // Check media exists and belongs to user
            if (!isset($mediaAssets[$mediaAssetId])) {
                throw new \Exception("Media asset at index {$index} does not exist or does not belong to user.");
            }

            $mediaAsset = $mediaAssets[$mediaAssetId];

            // Archived media remains reusable while its storage files stay intact.
            if (! in_array($mediaAsset->status, [
                MediaAssetStatus::Available,
                MediaAssetStatus::Archived,
            ], true)) {
                throw new \Exception("Media asset at index {$index} is not ready for publishing.");
            }

            // Validate media type is video
            if ($mediaAsset->media_type !== 'video') {
                throw new \Exception("Media asset at index {$index} is not a video.");
            }

            // Validate scheduled_at is at least 5 minutes in the future
            $scheduledAt = \Carbon\Carbon::parse($item['scheduled_at'], $timezone);
            $minScheduledAt = now()->addMinutes(5);
            
            if ($scheduledAt->lt($minScheduledAt)) {
                throw new \Exception("Item at index {$index} must be scheduled at least 5 minutes in the future.");
            }

            $validatedItems[] = [
                'media_asset' => $mediaAsset,
                'caption' => $item['caption'] ?? '',
                'scheduled_at' => $scheduledAt->utc(),
                'post_type' => $item['post_type'],
                'platform_settings' => $item['platform_settings'] ?? [],
            ];
        }

        // Create all scheduled posts in a transaction
        $createdPosts = DB::transaction(function () use ($userId, $connectedAccounts, $accountIds, $validatedItems, $platform) {
            $posts = [];

            foreach ($accountIds as $accountId) {
                $connectedAccount = $connectedAccounts[$accountId];

                foreach ($validatedItems as $item) {
                    $metadata = [
                        'post_type' => 'video',
                    ];

                    if (!empty($item['platform_settings'])) {
                        $metadata = array_merge($metadata, $item['platform_settings']);
                    }

                    $post = PublisherPost::create([
                        'user_id' => $userId,
                        'connected_account_id' => $connectedAccount->id,
                        'media_asset_id' => $item['media_asset']->id,
                        'platform' => $platform,
                        'caption' => $item['caption'],
                        'action' => 'schedule',
                        'provider_mode' => 'direct_post',
                        'status' => 'scheduled',
                        'scheduled_at' => $item['scheduled_at'],
                        'metadata' => $metadata,
                    ]);

                    $posts[] = $post;
                }
            }

            return $posts;
        });

        Log::info('Batch schedule created', [
            'platform' => $platform,
            'connected_account_ids' => $accountIds,
            'items_count' => count($createdPosts),
            'correlation_id' => $correlationId,
        ]);

        return [
            'created_count' => count($createdPosts),
            'destination_count' => count($accountIds),
            'video_count' => count($validatedItems),
            'posts' => $createdPosts,
        ];
    }

    public function cancelBatch(string $userId, array $ids): array
    {
        $correlationId = (string) Str::uuid();

        $cancelledPosts = DB::transaction(function () use ($userId, $ids) {
            $cancelled = [];

            foreach ($ids as $id) {
                $post = PublisherPost::where('user_id', $userId)
                    ->where('id', $id)
                    ->lockForUpdate()
                    ->first();

                if (!$post) {
                    continue;
                }

                if ($post->status !== 'scheduled') {
                    continue;
                }

                $post->update([
                    'status' => 'cancelled',
                ]);

                $cancelled[] = $post;
            }

            return $cancelled;
        });

        Log::info('Batch schedules cancelled', [
            'user_id' => $userId,
            'cancelled_count' => count($cancelledPosts),
            'correlation_id' => $correlationId,
        ]);

        return [
            'cancelled_count' => count($cancelledPosts),
            'posts' => $cancelledPosts,
        ];
    }
}
