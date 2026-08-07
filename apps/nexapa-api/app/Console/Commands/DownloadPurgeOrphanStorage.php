<?php

namespace App\Console\Commands;

use App\Models\DownloadJob;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class DownloadPurgeOrphanStorage extends Command
{
    protected $signature = 'download:purge-orphan-storage {--dry-run : Show what would be deleted without actually deleting} {--execute : Actually delete orphaned directories}';
    
    protected $description = 'Purge orphaned download storage directories that are not associated with any existing download jobs';

    public function handle(): int
    {
        // Check that either --dry-run or --execute is specified
        $dryRun = $this->option('dry-run');
        $execute = $this->option('execute');
        
        if (!$dryRun && !$execute) {
            $this->error('Please specify either --dry-run or --execute option.');
            $this->line('Example: php artisan download:purge-orphan-storage --dry-run');
            $this->line('Example: php artisan download:purge-orphan-storage --execute');
            return self::FAILURE;
        }
        
        if ($dryRun && $execute) {
            $this->error('Please specify only one of --dry-run or --execute options.');
            return self::FAILURE;
        }

        $this->info(($dryRun ? 'DRY RUN MODE' : 'EXECUTE MODE') . ' - Purging orphaned download storage directories');
        $this->line('');

        // Define the storage path to scan
        $downloadsPath = storage_path('app/private/downloads');
        
        // Check if the directory exists
        if (!is_dir($downloadsPath)) {
            $this->warn("Downloads directory does not exist: {$downloadsPath}");
            return self::SUCCESS;
        }

        // Get all existing job IDs (including soft deleted ones) for checking orphans
        $existingJobIds = DownloadJob::withTrashed()->pluck('id')->toArray();
        $existingJobIds = array_map('strval', $existingJobIds); // Convert to strings for comparison
        
        // Track statistics
        $totalDirectories = 0;
        $orphanDirectories = 0;
        $totalBytes = 0;
        $deletedBytes = 0;
        $deletedDirectories = 0;
        $invalidPaths = 0;
        $unsafePaths = 0;
        
        // Scan user directories
        $userDirs = glob("{$downloadsPath}/*", GLOB_ONLYDIR);
        
        foreach ($userDirs as $userDir) {
            // Validate user directory name (should be numeric user ID)
            $userId = basename($userDir);
            if (!is_numeric($userId)) {
                $this->warn("Skipping invalid user directory: {$userDir}");
                $invalidPaths++;
                continue;
            }
            
            // Scan job directories for this user
            $jobDirs = glob("{$userDir}/*", GLOB_ONLYDIR);
            
            foreach ($jobDirs as $jobDir) {
                $totalDirectories++;
                
                // Get job ID from directory name
                $jobId = basename($jobDir);
                
                // Validate job ID format (should be UUID-like)
                if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $jobId)) {
                    $this->warn("Skipping invalid job directory: {$jobDir}");
                    $invalidPaths++;
                    continue;
                }
                
                // Check if this job still exists in the database
                if (in_array($jobId, $existingJobIds)) {
                    // Not an orphan, skip
                    continue;
                }
                
                // This is an orphan directory
                $orphanDirectories++;
                
                // Calculate directory size
                $dirSize = $this->getDirectorySize($jobDir);
                $totalBytes += $dirSize;
                
                $this->line("Found orphan directory: {$jobDir} (" . $this->formatBytes($dirSize) . ")");
                
                // Delete if in execute mode
                if ($execute) {
                    try {
                        // Additional safety check to ensure we're within the downloads path
                        $realJobDir = realpath($jobDir);
                        $realDownloadsPath = realpath($downloadsPath);
                        
                        if ($realJobDir === false || $realDownloadsPath === false) {
                            $this->warn("Skipping unsafe path (cannot resolve): {$jobDir}");
                            $unsafePaths++;
                            continue;
                        }
                        
                        if (!str_starts_with($realJobDir, $realDownloadsPath . DIRECTORY_SEPARATOR)) {
                            $this->warn("Skipping unsafe path (outside root): {$jobDir}");
                            $unsafePaths++;
                            continue;
                        }
                        
                        // Recursively delete the directory
                        $this->recursiveRemoveDirectory($jobDir);
                        $deletedBytes += $dirSize;
                        $deletedDirectories++;
                        
                        $this->info("Deleted orphan directory: {$jobDir}");
                    } catch (\Exception $e) {
                        $this->error("Failed to delete orphan directory: {$jobDir} - " . $e->getMessage());
                    }
                }
            }
        }

        // Show summary
        $this->line('');
        $this->info('Summary:');
        $this->table(
            ['Metric', 'Value'],
            [
                ['Total scanned directories', $totalDirectories],
                ['Orphan directories found', $orphanDirectories],
                ['Invalid paths skipped', $invalidPaths],
                ['Unsafe paths skipped', $unsafePaths],
                ['Total orphan size', $this->formatBytes($totalBytes)],
            ]
        );
        
        if ($execute) {
            $this->info("Deleted {$deletedDirectories} orphan directories (" . $this->formatBytes($deletedBytes) . ")");
        } elseif ($dryRun) {
            $this->info("Would delete {$orphanDirectories} orphan directories (" . $this->formatBytes($totalBytes) . ") in execute mode");
        }
        
        return self::SUCCESS;
    }
    
    /**
     * Calculate the size of a directory recursively
     */
    private function getDirectorySize(string $directory): int
    {
        $size = 0;
        
        try {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($directory, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::LEAVES_ONLY
            );
            
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $size += $file->getSize();
                }
            }
        } catch (\Exception $e) {
            // Ignore errors, return 0
        }
        
        return $size;
    }
    
    /**
     * Format bytes to human readable format
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= pow(1024, $pow);
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }
    
    /**
     * Recursively remove a directory and all its contents
     */
    private function recursiveRemoveDirectory(string $directory): void
    {
        if (!is_dir($directory)) {
            return;
        }
        
        $files = array_diff(scandir($directory), ['.', '..']);
        
        foreach ($files as $file) {
            $path = "{$directory}/{$file}";
            
            if (is_dir($path)) {
                $this->recursiveRemoveDirectory($path);
            } else {
                unlink($path);
            }
        }
        
        rmdir($directory);
    }
}