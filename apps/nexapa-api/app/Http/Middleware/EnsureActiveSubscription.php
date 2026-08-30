<?php

namespace App\Http\Middleware;

use App\Models\Subscription;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveSubscription
{
    public function handle(
        Request $request,
        Closure $next
    ): Response {
        $user = $request->user();

        // Authentication middleware menangani request tanpa user.
        if ($user === null) {
            return $next($request);
        }

        // Owner/admin tidak dibatasi paket pelanggan.
        if ($user->is_admin === true) {
            return $next($request);
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
            ->latest('id')
            ->first();

        if ($subscription === null) {
            return $this->denied(
                'subscription_missing',
                'Akun belum memiliki paket Nexapa aktif.'
            );
        }

        if (
            $subscription->status === 'active'
            && $subscription->expires_at->isPast()
        ) {
            $subscription->forceFill([
                'status' => 'expired',
            ])->save();
        }

        if (! $subscription->isActive()) {
            return $this->denied(
                'subscription_'.$subscription->status,
                match ($subscription->status) {
                    'expired' =>
                        'Masa langganan telah berakhir.',
                    'suspended' =>
                        'Langganan sedang disuspend.',
                    'cancelled' =>
                        'Langganan telah dibatalkan.',
                    default =>
                        'Langganan tidak aktif.',
                },
                $subscription
            );
        }

        $request->attributes->set(
            'subscription',
            $subscription
        );

        return $next($request);
    }

    private function denied(
        string $code,
        string $message,
        ?Subscription $subscription = null
    ): Response {
        return response()->json([
            'success' => false,
            'code' => $code,
            'message' => $message,
            'subscription' => $subscription === null
                ? null
                : [
                    'plan' => $subscription->plan_code,
                    'status' => $subscription->status,
                    'expires_at' =>
                        $subscription->expires_at?->toIso8601String(),
                ],
        ], Response::HTTP_PAYMENT_REQUIRED);
    }
}
