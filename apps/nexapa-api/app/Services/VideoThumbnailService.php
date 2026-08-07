<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Exception\ProcessTimedOutException;
use Symfony\Component\Process\Process;

class VideoThumbnailService
{
    private const MAX_WIDTH = 640;
    private const OUTPUT_FORMAT = 'jpg';
    private const OUTPUT_QUALITY = 85;
    private const FFMPEG_TIMEOUT = 45;
    private const FFPROBE_TIMEOUT = 15;

    public function generateFromVideo(string $disk, string $videoPath): ?string
    {
        try {
            $localPath = Storage::disk($disk)->path($videoPath);
            
            if (!file_exists($localPath)) {
                Log::warning('Video file not found for thumbnail generation', [
                    'disk' => $disk,
                    'path' => $videoPath,
                ]);
                return null;
            }

            $duration = $this->getVideoDuration($localPath);
            if ($duration === null) {
                Log::warning('Failed to get video duration', [
                    'video_path' => $videoPath,
                ]);
                return null;
            }

            $thumbnailPosition = $this->calculateThumbnailPosition($duration);

            $thumbnailDir = dirname($videoPath);
            $thumbnailFilename = pathinfo($videoPath, PATHINFO_FILENAME) . '.' . self::OUTPUT_FORMAT;
            $tempThumbnailPath = $thumbnailDir . '/' . pathinfo($thumbnailFilename, PATHINFO_FILENAME) . '.tmp.' . self::OUTPUT_FORMAT;
            $finalThumbnailPath = $thumbnailDir . '/' . $thumbnailFilename;

            $localTempPath = Storage::disk($disk)->path($tempThumbnailPath);
            $localFinalPath = Storage::disk($disk)->path($finalThumbnailPath);

            $success = $this->extractFrame($localPath, $localTempPath, $thumbnailPosition);
            
            if (!$success || !file_exists($localTempPath)) {
                Log::warning('Thumbnail extraction failed or no output', [
                    'video_path' => $videoPath,
                    'temp_path' => $tempThumbnailPath,
                ]);
                if (file_exists($localTempPath)) {
                    @unlink($localTempPath);
                }
                return null;
            }

            $fileSize = filesize($localTempPath);
            if ($fileSize === false || $fileSize === 0) {
                Log::warning('Thumbnail file is empty', [
                    'temp_path' => $tempThumbnailPath,
                ]);
                @unlink($localTempPath);
                return null;
            }

            if (!@rename($localTempPath, $localFinalPath)) {
                Log::error('Failed to move thumbnail from temp to final location', [
                    'temp_path' => $tempThumbnailPath,
                    'final_path' => $finalThumbnailPath,
                ]);
                @unlink($localTempPath);
                return null;
            }

            Log::info('Video thumbnail generated successfully', [
                'video_path' => $videoPath,
                'thumbnail_path' => $finalThumbnailPath,
                'position' => $thumbnailPosition,
                'file_size' => $fileSize,
            ]);

            return $finalThumbnailPath;
        } catch (\Throwable $e) {
            Log::warning('Video thumbnail generation failed', [
                'disk' => $disk,
                'video_path' => $videoPath,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function getVideoDuration(string $videoPath): ?float
    {
        $process = new Process([
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            $videoPath,
        ]);

        $process->setTimeout(self::FFPROBE_TIMEOUT);

        try {
            $process->mustRun();
            $output = trim($process->getOutput());
            $duration = $output ? floatval($output) : null;
            return $duration > 0 ? $duration : 1.0;
        } catch (ProcessTimedOutException $e) {
            Log::warning('FFprobe timeout', ['video_path' => $videoPath]);
            return null;
        } catch (ProcessFailedException $e) {
            Log::warning('FFprobe failed', [
                'video_path' => $videoPath,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function calculateThumbnailPosition(float $duration): float
    {
        if ($duration <= 2) {
            return 0.5;
        }

        if ($duration <= 10) {
            return 1.0;
        }

        return min($duration * 0.1, 5.0);
    }

    private function extractFrame(string $inputPath, string $outputPath, float $position): bool
    {
        $process = new Process([
            'ffmpeg',
            '-y',
            '-ss', number_format($position, 2, '.', ''),
            '-t', '1',
            '-i', $inputPath,
            '-vf', "scale=" . self::MAX_WIDTH . ":-1",
            '-q:v', (string) self::OUTPUT_QUALITY,
            '-frames:v', '1',
            $outputPath,
        ]);

        $process->setTimeout(self::FFMPEG_TIMEOUT);

        try {
            $process->mustRun();
            return true;
        } catch (ProcessTimedOutException $e) {
            Log::warning('FFmpeg timeout', [
                'video_path' => $inputPath,
                'timeout' => self::FFMPEG_TIMEOUT,
            ]);
            if (file_exists($outputPath)) {
                @unlink($outputPath);
            }
            return false;
        } catch (ProcessFailedException $e) {
            Log::warning('FFmpeg failed', [
                'video_path' => $inputPath,
                'error' => $e->getMessage(),
            ]);
            if (file_exists($outputPath)) {
                @unlink($outputPath);
            }
            return false;
        }
    }
}
