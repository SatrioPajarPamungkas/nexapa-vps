<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConnectedAccount;
use App\Services\Facebook\FacebookPageInsightsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

class FacebookPageInsightController extends Controller
{
    public function __invoke(
        Request $request,
        ConnectedAccount $connectedAccount,
        FacebookPageInsightsService $insights
    ): JsonResponse {
        $user = $request->user();

        if (
            ! $user ||
            $connectedAccount->user_id !== $user->id
        ) {
            abort(Response::HTTP_NOT_FOUND);
        }

        if (! $connectedAccount->isFacebookPage()) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Insight hanya tersedia untuk Facebook Page.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $validated = $request->validate([
            'days' => ['nullable', 'integer', 'in:7,28,90'],
        ]);

        try {
            $data = $insights->getInsights(
                $connectedAccount,
                (int) ($validated['days'] ?? 28)
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'code' => 'facebook_insights_unavailable',
            ], Response::HTTP_BAD_GATEWAY);
        }

        return response()->json([
            'success' => true,
            'message' => 'Facebook Page insights retrieved.',
            'data' => $data,
        ]);
    }
}
