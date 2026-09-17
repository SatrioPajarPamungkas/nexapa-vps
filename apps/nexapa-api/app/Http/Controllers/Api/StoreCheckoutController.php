<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commerce\StoreCheckoutRequest;
use App\Models\CommerceOrder;
use App\Services\Commerce\CommerceCheckoutService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class StoreCheckoutController extends Controller
{
    public function store(
        StoreCheckoutRequest $request,
        CommerceCheckoutService $checkout,
    ): JsonResponse {
        try {
            $order = $checkout->checkout(
                $request->user(),
                $request->validated(),
            );
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage(),
            ], 502);
        }

        return response()->json([
            'data' => $this->serializeOrder($order),
        ], 201);
    }

    private function serializeOrder(CommerceOrder $order): array
    {
        $order->loadMissing(['items', 'payments']);

        $payment = $order->payments
            ->where('provider', 'midtrans')
            ->sortByDesc('created_at')
            ->first();

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'currency' => $order->currency,
            'subtotal_amount' => $order->subtotal_amount,
            'discount_amount' => $order->discount_amount,
            'total_amount' => $order->total_amount,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'placed_at' => $order->placed_at?->toISOString(),
            'expires_at' => $order->expires_at?->toISOString(),
            'payment' => [
                'provider' => $payment?->provider,
                'snap_token' => $payment?->snap_token,
                'redirect_url' => $payment?->redirect_url,
            ],
            'items' => $order->items
                ->map(fn ($item): array => [
                    'id' => $item->id,
                    'product_name' => $item->product_name,
                    'product_slug' => $item->product_slug,
                    'variant_name' => $item->variant_name,
                    'sku' => $item->sku,
                    'unit_price_amount' =>
                        $item->unit_price_amount,
                    'quantity' => $item->quantity,
                    'subtotal_amount' => $item->subtotal_amount,
                ])
                ->values()
                ->all(),
        ];
    }
}
