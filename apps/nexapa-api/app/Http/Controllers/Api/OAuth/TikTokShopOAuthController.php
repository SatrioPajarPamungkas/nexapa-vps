<?php

namespace App\Http\Controllers\Api\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TikTokShopOAuthController extends Controller
{
    public function callback(Request $request): JsonResponse
    {
        $code = $request->query('code')
            ?? $request->query('auth_code');

        $state = $request->query('state');

        $error = $request->query('error');
        $errorDescription = $request->query('error_description');

        if ($error) {
            Log::warning('TikTok Shop OAuth authorization failed', [
                'error' => $error,
                'error_description' => $errorDescription,
                'state_present' => !empty($state),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'TikTok Shop authorization failed.',
                'error' => $error,
            ], 400);
        }

        Log::info('TikTok Shop OAuth callback received', [
            'code_present' => !empty($code),
            'state_present' => !empty($state),
        ]);

        return response()->json([
            'ok' => true,
            'message' => 'TikTok Shop callback received.',
            'code_received' => !empty($code),
            'state_received' => !empty($state),
        ]);
    }
}
