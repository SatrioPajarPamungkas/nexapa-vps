<?php

namespace App\Console\Commands;

use App\Models\CommerceOrder;
use App\Services\CommerceDigitalStockAllocationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpirePendingCommerceOrders extends Command
{
    protected $signature = 'commerce:expire-pending-orders';

    protected $description =
        'Expire unpaid Commerce orders and release FIFO stock';

    public function handle(
        CommerceDigitalStockAllocationService $stock,
    ): int {
        $expired = 0;
        $graceMinutes = max(
            1,
            (int) config(
                'commerce.order_release_grace_minutes',
                5,
            ),
        );

        CommerceOrder::query()
            ->where(
                'payment_status',
                CommerceOrder::PAYMENT_PENDING,
            )
            ->whereNotNull('expires_at')
            ->where(
                'expires_at',
                '<=',
                now()->subMinutes($graceMinutes),
            )
            ->orderBy('id')
            ->chunkById(
                100,
                function ($orders) use (
                    $stock,
                    &$expired,
                ): void {
                    foreach ($orders as $candidate) {
                        DB::transaction(function () use (
                            $candidate,
                            $stock,
                            &$expired,
                        ): void {
                            $order = CommerceOrder::query()
                                ->whereKey($candidate->id)
                                ->lockForUpdate()
                                ->first();

                            if (
                                ! $order
                                || $order->payment_status
                                    !== CommerceOrder::PAYMENT_PENDING
                            ) {
                                return;
                            }

                            $order->load('items');

                            foreach (
                                $order->items
                                    ->pluck('stock_reference')
                                    ->filter()
                                    ->unique()
                                as $reference
                            ) {
                                $stock->release($reference);
                            }

                            $order->payments()
                                ->where('provider', 'midtrans')
                                ->whereIn(
                                    'transaction_status',
                                    [
                                        'pending_creation',
                                        'pending',
                                    ],
                                )
                                ->update([
                                    'transaction_status' =>
                                        'local_expired',
                                    'updated_at' => now(),
                                ]);

                            $order->update([
                                'status' =>
                                    CommerceOrder::STATUS_EXPIRED,
                                'payment_status' =>
                                    CommerceOrder::PAYMENT_EXPIRED,
                                'cancelled_at' => now(),
                            ]);

                            $expired++;
                        });
                    }
                },
            );

        $this->info(
            "Expired {$expired} pending Commerce order(s).",
        );

        return self::SUCCESS;
    }
}
