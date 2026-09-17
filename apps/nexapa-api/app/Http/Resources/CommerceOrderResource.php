<?php

namespace App\Http\Resources;

use App\Models\CommerceOrder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommerceOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $this->loadMissing(['items', 'payments']);

        $payment = $this->payments
            ->sortByDesc('created_at')
            ->first();

        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'customer' => [
                'name' => $this->customer_name,
                'email' => $this->customer_email,
                'phone' => $this->customer_phone,
            ],
            'currency' => $this->currency,
            'subtotal_amount' => (int) $this->subtotal_amount,
            'discount_amount' => (int) $this->discount_amount,
            'total_amount' => (int) $this->total_amount,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'promotion_code' => $this->promotion_code,
            'can_pay' =>
                $this->payment_status
                    === CommerceOrder::PAYMENT_PENDING
                && (
                    $this->expires_at === null
                    || $this->expires_at->isFuture()
                ),
            'placed_at' => $this->placed_at?->toISOString(),
            'expires_at' => $this->expires_at?->toISOString(),
            'paid_at' => $this->paid_at?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'cancelled_at' => $this->cancelled_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'payment' => $payment ? [
                'provider' => $payment->provider,
                'redirect_url' =>
                    $this->payment_status
                        === CommerceOrder::PAYMENT_PENDING
                        ? $payment->redirect_url
                        : null,
                'transaction_id' => $payment->transaction_id,
                'payment_type' => $payment->payment_type,
                'transaction_status' =>
                    $payment->transaction_status,
                'fraud_status' => $payment->fraud_status,
                'last_notified_at' =>
                    $payment->last_notified_at?->toISOString(),
            ] : null,
            'items' => $this->items
                ->map(fn ($item): array => [
                    'id' => $item->id,
                    'product_id' =>
                        $item->commerce_product_id,
                    'variant_id' =>
                        $item->commerce_product_variant_id,
                    'product_name' => $item->product_name,
                    'product_slug' => $item->product_slug,
                    'variant_name' => $item->variant_name,
                    'sku' => $item->sku,
                    'fulfillment_type' =>
                        $item->fulfillment_type,
                    'unit_price_amount' =>
                        (int) $item->unit_price_amount,
                    'quantity' => (int) $item->quantity,
                    'subtotal_amount' =>
                        (int) $item->subtotal_amount,
                ])
                ->values()
                ->all(),
        ];
    }
}
