<?php

namespace App\Services;

use App\Models\DownloadJob;
use Illuminate\Support\Facades\Storage;

class TemporaryDownloadOutputService
{
    /**
     * Get normalized temporary output descriptors from DownloadJob metadata.
     *
     * @return array[]
     */
    public function getTemporaryOutputs(DownloadJob $job): array
    {
        $outputs = $job->metadata['temporary_outputs'] ?? [];
        
        if (! is_array($outputs)) {
            return [];
        }
        
        return array_values($outputs);
    }
    
    /**
     * Count downloadable temporary outputs that exist as files.
     */
    public function countExistingOutputs(DownloadJob $job): int
    {
        $outputs = $this->getTemporaryOutputs($job);
        $count = 0;
        
        foreach ($outputs as $output) {
            if ($this->resolveOutputFile($output) !== null) {
                $count++;
            }
        }
        
        return $count;
    }
    
    /**
     * Safely resolve a temporary output to an absolute file path.
     * Returns null if the output is unsafe or the file does not exist.
     */
    public function resolveOutputFile(array $output, string $kind = 'media'): ?string
    {
        $disk = $output['storage_disk'] ?? 'local';
        if ($disk !== 'local') {
            return null;
        }
        
        $root = config("filesystems.disks.{$disk}.root");
        if (empty($root) || ! is_dir($root)) {
            return null;
        }
        
        $path = $kind === 'thumbnail' 
            ? ($output['thumbnail_path'] ?? null) 
            : ($output['storage_path'] ?? null);
            
        if (! is_string($path) || $path === '' || str_contains($path, "\0")) {
            return null;
        }
        
        // Normalize both Unix and Windows separators before validation.
        $normalizedPath = str_replace('\\', '/', $path);
        
        // Require downloads/ prefix
        if (! str_starts_with($normalizedPath, 'downloads/')) {
            return null;
        }
        
        // Reject Unix absolute paths, UNC paths, and Windows drive paths.
        if (
            str_starts_with($normalizedPath, '/')
            || preg_match('/^[A-Za-z]:/', $normalizedPath) === 1
        ) {
            return null;
        }
        
        // Reject traversal and current-directory segments.
        $segments = explode('/', $normalizedPath);
        if (
            in_array('.', $segments, true)
            || in_array('..', $segments, true)
        ) {
            return null;
        }
        
        $relativePath = implode(DIRECTORY_SEPARATOR, $segments);
        $full = rtrim($root, DIRECTORY_SEPARATOR)
            . DIRECTORY_SEPARATOR
            . $relativePath;
        $realRoot = realpath($root);
        $realFile = realpath($full);
        if ($realRoot === false || $realFile === false) {
            return null;
        }
        if (! is_file($realFile)) {
            return null;
        }
        // Containment check
        if ($realFile === $realRoot || str_starts_with($realFile, $realRoot . DIRECTORY_SEPARATOR)) {
            return $realFile;
        }
        return null;
    }
    
    /**
     * Produce frontend-compatible virtual media asset arrays from temporary outputs.
     *
     * @return array[]
     */
    public function getVirtualMediaAssets(DownloadJob $job): array
    {
        $outputs = $this->getTemporaryOutputs($job);
        $virtualAssets = [];
        $createdAt = $job->metadata['temporary_outputs_created_at'] ?? $job->completed_at?->toISOString() ?? now()->toISOString();
        
        foreach ($outputs as $index => $output) {
            // Skip outputs that don't resolve to existing files
            if ($this->resolveOutputFile($output) === null) {
                continue;
            }
            
            $virtualAssets[] = [
                'id' => "temporary-{$job->id}-{$index}",
                'download_job_id' => $job->id,
                'display_name' => $output['display_name'] ?? "Temporary Output #{$index}",
                'original_name' => $output['original_name'] ?? 'downloaded-file',
                'media_type' => $output['media_type'] ?? 'unknown',
                'mime_type' => $output['mime_type'] ?? 'application/octet-stream',
                'file_size' => $output['file_size'] ?? 0,
                'width' => $output['width'] ?? null,
                'height' => $output['height'] ?? null,
                'duration_seconds' => $output['duration_seconds'] ?? null,
                'source_platform' => $output['source_platform'] ?? 'generic',
                'source_url' => $output['source_url'] ?? '',
                'status' => 'available',
                'content_url' => route('api.v1.download-jobs.temporary-content', [
                    'downloadJob' => $job->id,
                    'outputIndex' => $index,
                ]),
                'thumbnail_url' => $this->resolveOutputFile($output, 'thumbnail') !== null
                    ? route('api.v1.download-jobs.temporary-content', [
                        'downloadJob' => $job->id,
                        'outputIndex' => $index,
                        'kind' => 'thumbnail',
                    ])
                    : null,
                'created_at' => $createdAt,
                'metadata' => $output['metadata'] ?? [],
            ];
        }
        
        return $virtualAssets;
    }
}