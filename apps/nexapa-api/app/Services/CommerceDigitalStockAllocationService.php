<?php

namespace App\Services;

use App\Models\CommerceDigitalStockItem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CommerceDigitalStockAllocationService
{
    public function reserve(
        string $productId,
        ?string $variantId,
        int $quantity,
        string $orderReference,
        int $buyerId,
        int $minutes = 15,
    ): Collection {
        if ($quantity < 1 || $quantity > 100) {
            throw ValidationException::withMessages([
                'quantity' => 'Jumlah pembelian harus 1 sampai 100.',
            ]);
        }

        return DB::transaction(function () use (
            $productId,
            $variantId,
            $quantity,
            $orderReference,
            $buyerId,
            $minutes,
        ): Collection {
            $existing = CommerceDigitalStockItem::query()
                ->where('order_reference', $orderReference)
                ->whereIn('status', [
                    CommerceDigitalStockItem::STATUS_RESERVED,
                    CommerceDigitalStockItem::STATUS_SOLD,
                    CommerceDigitalStockItem::STATUS_DELIVERED,
                    CommerceDigitalStockItem::STATUS_DOWNLOADED,
                ])
                ->orderBy('sort_order')
                ->get();

            if ($existing->count() === $quantity) {
                return $existing;
            }

            CommerceDigitalStockItem::query()
                ->where('status', CommerceDigitalStockItem::STATUS_RESERVED)
                ->where('reserved_until', '<=', now())
                ->update([
                    'status' => CommerceDigitalStockItem::STATUS_AVAILABLE,
                    'reservation_token' => null,
                    'order_reference' => null,
                    'buyer_id' => null,
                    'reserved_until' => null,
                    'updated_at' => now(),
                ]);

            $query = CommerceDigitalStockItem::query()
                ->where('commerce_product_id', $productId)
                ->where(
                    'status',
                    CommerceDigitalStockItem::STATUS_AVAILABLE,
                )
                ->when(
                    $variantId,
                    fn ($builder) => $builder->where(
                        'commerce_product_variant_id',
                        $variantId,
                    ),
                    fn ($builder) => $builder->whereNull(
                        'commerce_product_variant_id',
                    ),
                )
                ->orderBy('sort_order')
                ->lockForUpdate()
                ->limit($quantity);

            $items = $query->get();

            if ($items->count() < $quantity) {
                throw ValidationException::withMessages([
                    'quantity' =>
                        'Stok tidak mencukupi. Tersedia '
                        .$items->count().' unit.',
                ]);
            }

            $token = (string) Str::uuid();

            CommerceDigitalStockItem::query()
                ->whereIn('id', $items->pluck('id'))
                ->where(
                    'status',
                    CommerceDigitalStockItem::STATUS_AVAILABLE,
                )
                ->update([
                    'status' =>
                        CommerceDigitalStockItem::STATUS_RESERVED,
                    'reservation_token' => $token,
                    'order_reference' => $orderReference,
                    'buyer_id' => $buyerId,
                    'reserved_until' => now()->addMinutes($minutes),
                    'updated_at' => now(),
                ]);

            return CommerceDigitalStockItem::query()
                ->where('reservation_token', $token)
                ->orderBy('sort_order')
                ->get();
        });
    }

    public function confirmPaid(string $orderReference): int
    {
        return CommerceDigitalStockItem::query()
            ->where('order_reference', $orderReference)
            ->where(
                'status',
                CommerceDigitalStockItem::STATUS_RESERVED,
            )
            ->update([
                'status' => CommerceDigitalStockItem::STATUS_SOLD,
                'sold_at' => now(),
                'reserved_until' => null,
                'updated_at' => now(),
            ]);
    }

    public function release(string $orderReference): int
    {
        return CommerceDigitalStockItem::query()
            ->where('order_reference', $orderReference)
            ->where(
                'status',
                CommerceDigitalStockItem::STATUS_RESERVED,
            )
            ->update([
                'status' =>
                    CommerceDigitalStockItem::STATUS_AVAILABLE,
                'reservation_token' => null,
                'order_reference' => null,
                'buyer_id' => null,
                'reserved_until' => null,
                'updated_at' => now(),
            ]);
    }

    public function markDelivered(string $orderReference): int
    {
        return CommerceDigitalStockItem::query()
            ->where('order_reference', $orderReference)
            ->where(
                'status',
                CommerceDigitalStockItem::STATUS_SOLD,
            )
            ->update([
                'status' =>
                    CommerceDigitalStockItem::STATUS_DELIVERED,
                'delivered_at' => now(),
                'updated_at' => now(),
            ]);
    }

    public function markDownloaded(string $orderReference): int
    {
        return CommerceDigitalStockItem::query()
            ->where('order_reference', $orderReference)
            ->whereIn('status', [
                CommerceDigitalStockItem::STATUS_SOLD,
                CommerceDigitalStockItem::STATUS_DELIVERED,
            ])
            ->update([
                'status' =>
                    CommerceDigitalStockItem::STATUS_DOWNLOADED,
                'downloaded_at' => now(),
                'updated_at' => now(),
            ]);
    }

    public function purchasedPayloads(
        string $orderReference,
        int $buyerId,
    ): array {
        return CommerceDigitalStockItem::query()
            ->where('order_reference', $orderReference)
            ->where('buyer_id', $buyerId)
            ->whereIn('status', [
                CommerceDigitalStockItem::STATUS_SOLD,
                CommerceDigitalStockItem::STATUS_DELIVERED,
                CommerceDigitalStockItem::STATUS_DOWNLOADED,
            ])
            ->orderBy('sort_order')
            ->get()
            ->map(fn (CommerceDigitalStockItem $item): array => [
                'id' => $item->id,
                'data' => $item->payload,
            ])
            ->all();
    }
}
