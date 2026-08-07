<?php

namespace App\Observers;

use App\Enums\MediaAssetStatus;
use App\Models\PublisherPost;

class PublisherPostObserver
{
    private const TERMINAL_STATUSES = ['completed', 'published', 'failed', 'cancelled'];

    public function updated(PublisherPost $publisherPost): void
    {
        // Handle archiving for successful posts
        if ($publisherPost->wasChanged('status') && in_array($publisherPost->status, ['completed', 'published'], true)) {
            $publisherPost->mediaAsset()
                ->where('user_id', $publisherPost->user_id)
                ->where('status', MediaAssetStatus::Available->value)
                ->update(['status' => MediaAssetStatus::Archived->value]);
        }
        
        // Handle marking media as used for all terminal statuses
        if ($publisherPost->wasChanged('status') && in_array($publisherPost->status, self::TERMINAL_STATUSES, true)) {
            // We don't archive media for failed/cancelled posts, but we do mark it as used
            // This is handled in the frontend by checking usageCount
        }
    }
}
