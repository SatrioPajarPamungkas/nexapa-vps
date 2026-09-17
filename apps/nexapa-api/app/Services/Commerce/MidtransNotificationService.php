<?php

namespace App\Services\Commerce;

use App\Models\CommerceOrder;
use App\Models\CommercePayment;
use App\Models\CommerceProduct;
use App\Models\CommerceProductVariant;
use App\Services\CommerceDigitalStockAllocationService;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use UnexpectedValueException;

class MidtransNotificationService
{
    public function __construct(
        private readonly CommerceDigitalStockAllocationService $stock,
    ) {
    }

    public function handle(array $payload): CommerceOrder
    {
        return DB::transaction(function () use (
            $payload,
        ): CommerceOrder {
            $payment = CommercePayment::query()
                ->where('provider', 'midtrans')
                ->where(
                    'provider_order_id',
                    $payload['order_id'],
                )
                ->lockForUpdate()
                ->firstOrFail();

            $order = CommerceOrder::query()
                ->whereKey($payment->commerce_order_id)
                ->lockForUpdate()
                ->firstOrFail();

            $order->load('items');

            $grossAmount = (int) round(
                (float) $payload['gross_amount'],
            );

            if ($grossAmount !== (int) $order->total_amount) {
                throw new UnexpectedValueException(
                    'Nominal notifikasi tidak sesuai dengan pesanan.',
                );
            }

            $transactionStatus = strtolower(
                (string) $payload['transaction_status'],
            );

            $fraudStatus = strtolower(
                (string) ($payload['fraud_status'] ?? ''),
            );

            $payment->fill([
                'transaction_id' =>
                    $payload['transaction_id']
                    ?? $payment->transaction_id,
                'payment_type' =>
                    $payload['payment_type']
                    ?? $payment->payment_type,
                'transaction_status' => $transactionStatus,
                'fraud_status' =>
                    $fraudStatus !== ''
                        ? $fraudStatus
                        : $payment->fraud_status,
                'gross_amount' => $grossAmount,
                'raw_notification' => $payload,
                'last_notified_at' => now(),
            ])->save();

            if (
                $this->isPaid($transactionStatus, $fraudStatus)
            ) {
                $this->markPaid($order);

                return $order->fresh(['items', 'payments']);
            }

            if (
                in_array(
                    $transactionStatus,
                    ['deny', 'cancel'],
                    true,
                )
            ) {
                $this->markFailed($order);

                return $order->fresh(['items', 'payments']);
            }

            if ($transactionStatus === 'expire') {
                $this->markExpired($order);

                return $order->fresh(['items', 'payments']);
            }

            if (
                in_array(
                    $transactionStatus,
                    ['refund', 'partial_refund'],
                    true,
                )
            ) {
                $this->markRefunded($order);

                return $order->fresh(['items', 'payments']);
            }

            return $order->fresh(['items', 'payments']);
        });
    }

    private function isPaid(
        string $transactionStatus,
        string $fraudStatus,
    ): bool {
        if ($transactionStatus === 'settlement') {
            return true;
        }

        return $transactionStatus === 'capture'
            && $fraudStatus === 'accept';
    }

    private function markPaid(CommerceOrder $order): void
    {
        if (
            in_array(
                $order->payment_status,
                [
                    CommerceOrder::PAYMENT_PAID,
                    CommerceOrder::PAYMENT_REFUNDED,
                ],
                true,
            )
        ) {
            return;
        }

        $uniqueItems = $order->items
            ->whereNotNull('stock_reference');

        foreach ($uniqueItems as $item) {
            $confirmed = $this->stock->confirmPaid(
                $item->stock_reference,
            );

            if ($confirmed !== (int) $item->quantity) {
                throw new RuntimeException(
                    'Reservasi stok pesanan tidak lengkap.',
                );
            }
        }

        foreach ($order->items as $item) {
            if (! $item->commerce_product_id) {
                continue;
            }

            $product = CommerceProduct::query()
                ->whereKey($item->commerce_product_id)
                ->lockForUpdate()
                ->first();

            if ($product) {
                $product->sold_count =
                    (int) $product->sold_count
                    + (int) $item->quantity;

                $product->first_sold_at ??= now();
                $product->expires_at = null;
                $product->expiration_warning_sent_at = null;
                $product->expired_at = null;
                $product->save();
            }

            if ($item->commerce_product_variant_id) {
                $variant = CommerceProductVariant::query()
                    ->whereKey(
                        $item->commerce_product_variant_id,
                    )
                    ->lockForUpdate()
                    ->first();

                if ($variant) {
                    $variant->sold_count =
                        (int) $variant->sold_count
                        + (int) $item->quantity;
                    $variant->save();
                }
            }
        }

        $order->update([
            'status' => CommerceOrder::STATUS_PAID,
            'payment_status' => CommerceOrder::PAYMENT_PAID,
            'paid_at' => $order->paid_at ?? now(),
        ]);
    }

    private function markFailed(CommerceOrder $order): void
    {
        if (
            $order->payment_status
            !== CommerceOrder::PAYMENT_PENDING
        ) {
            return;
        }

        $this->releaseOrderStock($order);

        $order->update([
            'status' => CommerceOrder::STATUS_CANCELLED,
            'payment_status' => CommerceOrder::PAYMENT_FAILED,
            'cancelled_at' => now(),
        ]);
    }

    private function markExpired(CommerceOrder $order): void
    {
        if (
            $order->payment_status
            !== CommerceOrder::PAYMENT_PENDING
        ) {
            return;
        }

        $this->releaseOrderStock($order);

        $order->update([
            'status' => CommerceOrder::STATUS_EXPIRED,
            'payment_status' => CommerceOrder::PAYMENT_EXPIRED,
            'cancelled_at' => now(),
        ]);
    }

    private function markRefunded(CommerceOrder $order): void
    {
        if (
            $order->payment_status
            !== CommerceOrder::PAYMENT_PAID
        ) {
            return;
        }

        /*
         * Stok akun digital tidak dikembalikan otomatis karena
         * kredensial mungkin sudah dilihat pembeli.
         */
        $order->update([
            'status' => CommerceOrder::STATUS_REFUNDED,
            'payment_status' => CommerceOrder::PAYMENT_REFUNDED,
        ]);
    }

    private function releaseOrderStock(
        CommerceOrder $order,
    ): void {
        foreach (
            $order->items
                ->pluck('stock_reference')
                ->filter()
                ->unique()
            as $reference
        ) {
            $this->stock->release($reference);
        }
    }
}
