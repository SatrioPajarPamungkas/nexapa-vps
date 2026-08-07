<?php

namespace App\Console\Commands;

use App\Models\PublisherPost;
use App\Jobs\PublishPost;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class DispatchScheduledPosts extends Command
{
    protected $signature = 'publisher:dispatch-scheduled';
    protected $description = 'Dispatch scheduled publisher posts that are due';

    public function handle(): int
    {
        $now = now();
        $dispatchedCount = 0;
        $failedCount = 0;

        $duePosts = PublisherPost::where('status', 'scheduled')
            ->where('scheduled_at', '<=', $now)
            ->lockForUpdate()
            ->get();

        foreach ($duePosts as $post) {
            try {
                DB::transaction(function () use ($post, &$dispatchedCount) {
                    $claimed = DB::table('publisher_posts')
                        ->where('id', $post->id)
                        ->where('status', 'scheduled')
                        ->lockForUpdate()
                        ->update([
                            'status' => 'queued',
                            'updated_at' => now(),
                        ]);

                    if ($claimed > 0) {
                        PublishPost::dispatch($post)->afterCommit();
                        $dispatchedCount++;

                        Log::info('Scheduled post dispatched', [
                            'post_id' => $post->id,
                            'scheduled_at' => $post->scheduled_at,
                        ]);
                    }
                });
            } catch (\Exception $e) {
                Log::error('Failed to dispatch scheduled post', [
                    'post_id' => $post->id,
                    'error' => $e->getMessage(),
                ]);
                $failedCount++;
            }
        }

        Cache::put('publisher_scheduler_last_run_at', now()->toIso8601String(), 300);

        $this->info("Dispatched {$dispatchedCount} scheduled posts, {$failedCount} failed");

        return self::SUCCESS;
    }
}
