<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConnectedAccount;
use App\Services\OAuth\TikTokOAuthService;
use App\Services\Publisher\PublisherReadinessService;
use App\Services\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PublisherReadinessController extends Controller
{
    public function __construct(
        private SettingsService $settingsService,
        private PublisherReadinessService $readinessService
    ) {}

    public function check(Request $request): JsonResponse
    {
        $user = $request->user();

        $checks = [
            'storage_writable' => $this->checkStorageWritable(),
            'database_available' => $this->checkDatabaseAvailable(),
            'tiktok_configured' => $this->checkTikTokConfigured(),
            'connected_account' => $this->checkConnectedAccount($user),
            'account_scope' => null,
            'queue_configured' => $this->checkQueueConfigured(),
        ];

        $overallStatus = 'ready';
        $reasonCode = null;
        $reasonMessage = null;

        if (!$checks['storage_writable']) {
            $overallStatus = 'unavailable';
            $reasonCode = 'storage_unavailable';
            $reasonMessage = 'Private storage is not writable';
        } elseif (!$checks['database_available']) {
            $overallStatus = 'unavailable';
            $reasonCode = 'database_unavailable';
            $reasonMessage = 'Database is not available';
        } elseif (!$checks['tiktok_configured']) {
            $overallStatus = 'unavailable';
            $reasonCode = 'tiktok_configuration_missing';
            $reasonMessage = 'TikTok developer settings are not configured';
        } elseif (!$checks['connected_account']) {
            $overallStatus = 'action_required';
            $reasonCode = 'no_connected_account';
            $reasonMessage = 'No TikTok account connected';
        } else {
            $account = ConnectedAccount::defaultForPlatform('tiktok')
                ->where('user_id', $user->id)
                ->first()
                ?? ConnectedAccount::where('platform', 'tiktok')
                    ->where('user_id', $user->id)
                    ->where('status', 'connected')
                    ->first();

            if ($account) {
                $readiness = $this->readinessService->checkAccount($account);
                $checks['account_scope'] = $readiness['ready'];

                if (! $readiness['ready']) {
                    $overallStatus = 'action_required';
                    $reasonCode = $readiness['code'];
                    $reasonMessage = $readiness['message'];
                }
            } else {
                $overallStatus = 'action_required';
                $reasonCode = 'no_connected_account';
                $reasonMessage = 'No default TikTok account found';
            }
        }

        if (!$checks['queue_configured']) {
            if ($overallStatus === 'ready') {
                $overallStatus = 'action_required';
            }
            if (!$reasonCode) {
                $reasonCode = 'queue_not_configured';
                $reasonMessage = 'Queue is not configured. Publishing may not work.';
            }
        }

        return response()->json([
            'status' => $overallStatus,
            'reason_code' => $reasonCode,
            'reason_message' => $reasonMessage,
            'checks' => $checks,
        ]);
    }

    public function checkForAccount(Request $request, ConnectedAccount $account): JsonResponse
    {
        $user = $request->user();

        if ($account->user_id !== $user->id) {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        $action = $request->query('action', 'draft');
        $readiness = $this->readinessService->checkForAccount($account, $action);

        $status = $readiness['ready'] ? 'ready' : 'action_required';
        $reasonCode = $readiness['code'];
        $reasonMessage = $readiness['message'];

        return response()->json([
            'status' => $status,
            'reason_code' => $reasonCode,
            'reason_message' => $reasonMessage,
            'has_video_upload_scope' => in_array('video.upload', $readiness['scopes'], true),
            'has_video_publish_scope' => in_array('video.publish', $readiness['scopes'], true),
            'required_scope' => $readiness['required_scope'] ?? null,
            'scopes' => $readiness['scopes'],
            'provider_mode' => $readiness['provider_mode'] ?? null,
        ]);
    }

    public function creatorInfo(Request $request, ConnectedAccount $account, TikTokPublisherService $publisherService): JsonResponse
    {
        $user = $request->user();

        if ($account->user_id !== $user->id) {
            return response()->json([
                'error' => 'Unauthorized',
            ], 403);
        }

        if ($account->platform !== 'tiktok') {
            return response()->json([
                'error' => 'Unsupported platform',
            ], 400);
        }

        if ($account->status !== 'connected') {
            return response()->json([
                'error' => 'Account not connected',
            ], 400);
        }

        $scopes = $account->scopes ?? [];
        if (!in_array('video.publish', $scopes, true)) {
            return response()->json([
                'error' => 'Missing video.publish scope',
            ], 403);
        }

        try {
            $creatorInfo = $publisherService->getCreatorInfo($account);
            
            return response()->json([
                'data' => $creatorInfo,
            ]);
        } catch (\App\Services\Publisher\TikTokPublisherException $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'code' => $e->getErrorCode(),
            ], $e->getCode());
        }
    }

    private function checkStorageWritable(): bool
    {
        try {
            $disk = config('filesystems.default', 'local');
            $testPath = 'publisher-media/test_' . uniqid() . '.tmp';
            Storage::disk($disk)->put($testPath, 'test');
            Storage::disk($disk)->delete($testPath);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    private function checkDatabaseAvailable(): bool
    {
        try {
            \DB::connection()->getPdo();
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    private function checkTikTokConfigured(): bool
    {
        try {
            $settings = $this->settingsService->getTikTokSettings();
            return !empty($settings['tiktok_client_key']) && !empty($settings['tiktok_client_secret']);
        } catch (\Exception $e) {
            return false;
        }
    }

    private function checkConnectedAccount($user): bool
    {
        return ConnectedAccount::where('user_id', $user->id)
            ->where('platform', 'tiktok')
            ->where('status', 'connected')
            ->exists();
    }

    private function checkQueueConfigured(): bool
    {
        $queueDriver = config('queue.default', 'sync');
        return $queueDriver !== null;
    }
}
