<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->is_admin === true) {
            return response()->json([
                'success' => true,
                'data' => [
                    'is_admin' => true,
                    'subscription_required' => false,
                ],
            ]);
        }

        $subscription = Subscription::query()
            ->where(function ($query) use ($user): void {
                $query
                    ->where(
                        'publisher_user_id',
                        $user->getKey()
                    )
                    ->orWhereRaw(
                        'LOWER(email) = LOWER(?)',
                        [$user->email]
                    );
            })
            ->with([
                'usages' => fn ($query) =>
                    $query->latest('period_starts_at')->limit(1),
            ])
            ->latest('id')
            ->first();

        if ($subscription === null) {
            return response()->json([
                'success' => true,
                'data' => [
                    'subscription_required' => true,
                    'status' => 'missing',
                    'active' => false,
                ],
            ]);
        }

        if (
            $subscription->status === 'active'
            && $subscription->expires_at->isPast()
        ) {
            $subscription->forceFill([
                'status' => 'expired',
            ])->save();
        }

        $usage = $subscription->usages->first();
        $limits = $subscription->limits_snapshot;

        return response()->json([
            'success' => true,
            'data' => [
                'subscription_required' => true,
                'active' => $subscription->isActive(),
                'status' => $subscription->status,
                'plan' => [
                    'code' => $subscription->plan_code,
                    'name' => $subscription->plan_name,
                    'billing_cycle' =>
                        $subscription->billing_cycle,
                    'price_paid' =>
                        $subscription->price_paid,
                ],
                'starts_at' =>
                    $subscription->starts_at->toIso8601String(),
                'expires_at' =>
                    $subscription->expires_at->toIso8601String(),
                'limits' => $limits,
                'usage' => [
                    'ai_requests' =>
                        $usage?->ai_requests ?? 0,
                    'ai_limit' =>
                        $limits['ai_requests_per_month'] ?? 0,
                    'broadcasts_sent' =>
                        $usage?->broadcasts_sent ?? 0,
                    'scheduled_posts' =>
                        $usage?->scheduled_posts ?? 0,
                    'period_starts_at' =>
                        $usage?->period_starts_at
                            ?->toIso8601String(),
                    'period_ends_at' =>
                        $usage?->period_ends_at
                            ?->toIso8601String(),
                ],
            ],
        ]);
    }
}
