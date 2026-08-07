<?php

namespace App\Services;

use App\Models\Collection;
use App\Models\DownloadJob;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CollectionService
{
public function createProfileScrapeCollection(DownloadJob $job, array $mediaAssets): Collection
    {
        // Only create collection for profile mode jobs with user
        if ($job->mode->value !== 'profile' || !$job->user_id) {
            throw new \InvalidArgumentException('Job must be profile mode with user');
        }

        // Find existing collection based on user_id and download_job_id
        $collection = Collection::where('user_id', $job->user_id)
            ->where('download_job_id', $job->id)
            ->first();

        // Prepare asset IDs
        $assetIds = collect($mediaAssets)->pluck('id')->unique()->toArray();

        // If collection doesn't exist, create it
        if (!$collection) {
            $username = $this->extractUsername($job, $mediaAssets);
            $folderName = $this->formatFolderName($username, $job->created_at);
            
            $collection = DB::transaction(function () use ($job, $folderName) {
                return Collection::create([
                    'user_id' => $job->user_id,
                    'name' => $folderName,
                    'source_type' => 'profile_scrape',
                    'download_job_id' => $job->id,
                    'profile_url' => $job->original_input,
                    'source_platform' => $job->platform->value,
                    'media_count' => 0, // Will be updated after sync
                ]);
            });
        }

        // Sync assets without detaching existing ones
        $collection->mediaAssets()->syncWithoutDetaching($assetIds);

        // Update media count with actual count
        $collection->update([
            'media_count' => $collection->mediaAssets()->count(),
        ]);

        // Refresh collection to return updated media_count
        $collection->refresh();

        return $collection;
    }

    private function extractUsername(DownloadJob $job, array $mediaAssets): string
    {
        // Try original input first
        $url = $job->original_input;
        if ($url) {
            $parsed = parse_url($url);
            if (isset($parsed['host'])) {
                $host = strtolower($parsed['host']);
                $path = $parsed['path'] ?? '';

                // TikTok
                if (str_contains($host, 'tiktok.com')) {
                    $matches = [];
                    if (preg_match('@/(@[a-zA-Z0-9_.]+)@', $path, $matches)) {
                        return $matches[1];
                    }
                }

                // Instagram
                if (str_contains($host, 'instagram.com')) {
                    $matches = [];
                    if (preg_match('@/([a-zA-Z0-9_.]+)/?$@', $path, $matches)) {
                        return '@' . ltrim($matches[1], '@');
                    }
                }
            }
        }

        // Try first asset's uploader metadata
        if (!empty($mediaAssets)) {
            $firstAsset = $mediaAssets[0];
            if ($firstAsset->metadata && is_array($firstAsset->metadata)) {
                $uploader = $firstAsset->metadata['uploader'] ?? null;
                if ($uploader) {
                    return '@' . ltrim($uploader, '@');
                }
            }
        }

        // Fallback
        return 'Profile scrape';
    }

    private function formatFolderName(string $username, $createdAt): string
    {
        $date = $createdAt->format('d M Y H:i');
        return "$username — $date";
    }
}