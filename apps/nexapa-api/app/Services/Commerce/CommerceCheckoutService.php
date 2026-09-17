<?php

namespace App\Services\Commerce;

use App\Models\CommerceDigitalFile;
use App\Models\CommerceDigitalStockItem;
use App\Models\CommerceCustomer;
use App\Models\CommerceOrder;
use App\Models\CommerceOrderItem;
use App\Models\CommercePayment;
use App\Models\CommerceProduct;
use App\Models\CommerceProductVariant;
use App\Services\CommerceDigitalStockAllocationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class CommerceCheckoutService
{
    public function __construct(
        private readonly CommerceDigitalStockAllocationService $stock,
        private readonly MidtransSnapService $midtrans,
    ) {
    }

    public function checkout(
        CommerceCustomer $buyer,
        array $input,
    ): CommerceOrder
    {
        $existing = CommerceOrder::query()
            ->where('user_id', $buyer->id)
            ->where('checkout_token', $input['checkout_token'])
            ->first();

        if ($existing) {
            return $existing->load(['items', 'payments']);
        }

        $orderNumber = $this->nextOrderNumber();
        $minutes = max(
            5,
            (int) config('commerce.checkout_expiry_minutes', 15),
        );

        $normalizedItems = $this->normalizeItems($input['items']);

        $order = DB::transaction(function () use (
            $buyer,
            $input,
            $orderNumber,
            $minutes,
            $normalizedItems,
        ): CommerceOrder {
            $resolved = collect($normalizedItems)
                ->map(fn (array $item): array =>
                    $this->resolveItem($item, $orderNumber)
                );

            $currencies = $resolved
                ->pluck('currency')
                ->unique()
                ->values();

            if ($currencies->count() !== 1 || $currencies->first() !== 'IDR') {
                throw ValidationException::withMessages([
                    'items' =>
                        'Checkout saat ini hanya mendukung mata uang IDR.',
                ]);
            }

            $subtotal = (int) $resolved->sum('subtotal_amount');

            if ($subtotal < 1) {
                throw ValidationException::withMessages([
                    'items' => 'Total pembayaran tidak valid.',
                ]);
            }

            $order = CommerceOrder::query()->create([
                'order_number' => $orderNumber,
                'checkout_token' => $input['checkout_token'],
                'user_id' => $buyer->id,
                'customer_name' => $buyer->name,
                'customer_email' => $buyer->email,
                'customer_phone' => $input['customer_phone'] ?? null,
                'currency' => 'IDR',
                'subtotal_amount' => $subtotal,
                'discount_amount' => 0,
                'total_amount' => $subtotal,
                'status' => CommerceOrder::STATUS_PAYMENT_PENDING,
                'payment_status' => CommerceOrder::PAYMENT_PENDING,
                'placed_at' => now(),
                'expires_at' => now()->addMinutes($minutes),
            ]);

            foreach ($resolved as $item) {
                if (
                    $item['fulfillment_type']
                    === CommerceOrderItem::FULFILLMENT_UNIQUE_STOCK
                ) {
                    $this->stock->reserve(
                        $item['commerce_product_id'],
                        $item['commerce_product_variant_id'],
                        $item['quantity'],
                        $item['stock_reference'],
                        $buyer->id,
                        $minutes,
                    );
                }

                $orderItem = $item;
                unset($orderItem['currency']);

                $order->items()->create($orderItem);
            }

            $order->payments()->create([
                'provider' => 'midtrans',
                'provider_order_id' => $orderNumber,
                'gross_amount' => $subtotal,
                'transaction_status' => 'pending_creation',
            ]);

            return $order;
        });

        try {
            $snap = $this->midtrans->createTransaction(
                $order->load(['items', 'payments']),
            );

            $order->payments()
                ->where('provider', 'midtrans')
                ->where('provider_order_id', $orderNumber)
                ->update([
                    'snap_token' => $snap['token'],
                    'redirect_url' => $snap['redirect_url'],
                    'transaction_status' => 'pending',
                    'updated_at' => now(),
                ]);
        } catch (Throwable $exception) {
            $this->cancelFailedCheckout($order);

            throw new RuntimeException(
                'Pembayaran belum dapat dibuat. Silakan coba kembali.',
                0,
                $exception,
            );
        }

        return $order->fresh(['items', 'payments']);
    }

    private function normalizeItems(array $items): array
    {
        $normalized = [];

        foreach ($items as $item) {
            $productId = (string) $item['product_id'];
            $variantId = $item['variant_id'] ?? null;
            $key = $productId.'|'.($variantId ?: 'default');

            if (! isset($normalized[$key])) {
                $normalized[$key] = [
                    'product_id' => $productId,
                    'variant_id' => $variantId,
                    'quantity' => 0,
                ];
            }

            $normalized[$key]['quantity'] += (int) $item['quantity'];

            if ($normalized[$key]['quantity'] > 100) {
                throw ValidationException::withMessages([
                    'items' =>
                        'Jumlah produk yang sama maksimal 100 unit.',
                ]);
            }
        }

        return array_values($normalized);
    }

    private function resolveItem(
        array $input,
        string $orderNumber,
    ): array {
        $product = CommerceProduct::query()
            ->whereKey($input['product_id'])
            ->where('status', CommerceProduct::STATUS_ACTIVE)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->lockForUpdate()
            ->first();

        if (! $product) {
            throw ValidationException::withMessages([
                'items' =>
                    'Salah satu produk tidak tersedia atau sudah tidak aktif.',
            ]);
        }

        if (
            $product->sold_count === 0
            && $product->expires_at !== null
            && $product->expires_at->isPast()
        ) {
            throw ValidationException::withMessages([
                'items' =>
                    "Produk {$product->name} sudah kedaluwarsa.",
            ]);
        }

        $variant = $this->resolveVariant(
            $product,
            $input['variant_id'] ?? null,
        );

        $quantity = (int) $input['quantity'];
        $variantId = $variant?->id;
        $fulfillment = $this->resolveFulfillment(
            $product->id,
            $variantId,
        );

        $stockReference = null;

        if (
            $fulfillment
            === CommerceOrderItem::FULFILLMENT_UNIQUE_STOCK
        ) {
            $stockReference = $orderNumber.':'.substr(
                hash(
                    'sha256',
                    $product->id.'|'.($variantId ?: 'default'),
                ),
                0,
                20,
            );
        }

        $unitPrice = $this->effectivePrice($product, $variant);

        return [
            'commerce_product_id' => $product->id,
            'commerce_product_variant_id' => $variantId,
            'product_name' => $product->name,
            'product_slug' => $product->slug,
            'variant_name' => $variant?->name,
            'sku' => $variant?->sku,
            'fulfillment_type' => $fulfillment,
            'stock_reference' => $stockReference,
            'unit_price_amount' => $unitPrice,
            'quantity' => $quantity,
            'subtotal_amount' => $unitPrice * $quantity,
            'currency' => strtoupper($product->currency),
        ];
    }

    private function resolveVariant(
        CommerceProduct $product,
        ?string $variantId,
    ): ?CommerceProductVariant {
        $activeVariants = $product->variants
            ->where('is_active', true);

        if ($variantId === null) {
            if ($activeVariants->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'items' =>
                        "Pilih varian untuk produk {$product->name}.",
                ]);
            }

            return null;
        }

        $variant = $activeVariants->firstWhere('id', $variantId);

        if (! $variant) {
            throw ValidationException::withMessages([
                'items' =>
                    "Varian produk {$product->name} tidak valid.",
            ]);
        }

        return $variant;
    }

    private function effectivePrice(
        CommerceProduct $product,
        ?CommerceProductVariant $variant,
    ): int {
        if ($variant) {
            if ($variant->discount_price_amount !== null) {
                return (int) $variant->discount_price_amount;
            }

            if ($variant->price_amount !== null) {
                return (int) $variant->price_amount;
            }
        }

        if ($product->discount_price_amount !== null) {
            return (int) $product->discount_price_amount;
        }

        return (int) $product->price_amount;
    }

    private function resolveFulfillment(
        string $productId,
        ?string $variantId,
    ): string {
        $uniqueStockConfigured = CommerceDigitalStockItem::query()
            ->where('commerce_product_id', $productId)
            ->when(
                $variantId,
                fn ($query) => $query->where(
                    'commerce_product_variant_id',
                    $variantId,
                ),
                fn ($query) => $query->whereNull(
                    'commerce_product_variant_id',
                ),
            )
            ->exists();

        if ($uniqueStockConfigured) {
            return CommerceOrderItem::FULFILLMENT_UNIQUE_STOCK;
        }

        $reusableFileAvailable = CommerceDigitalFile::query()
            ->where('commerce_product_id', $productId)
            ->where('status', CommerceDigitalFile::STATUS_READY)
            ->when(
                $variantId,
                fn ($query) => $query->where(function ($builder) use (
                    $variantId,
                ): void {
                    $builder
                        ->where(
                            'commerce_product_variant_id',
                            $variantId,
                        )
                        ->orWhereNull(
                            'commerce_product_variant_id',
                        );
                }),
                fn ($query) => $query->whereNull(
                    'commerce_product_variant_id',
                ),
            )
            ->exists();

        if (! $reusableFileAvailable) {
            throw ValidationException::withMessages([
                'items' =>
                    'File atau stok digital untuk salah satu produk belum tersedia.',
            ]);
        }

        return CommerceOrderItem::FULFILLMENT_REUSABLE_FILE;
    }

    private function cancelFailedCheckout(CommerceOrder $order): void
    {
        DB::transaction(function () use ($order): void {
            $order->refresh();

            if (
                $order->payment_status
                !== CommerceOrder::PAYMENT_PENDING
            ) {
                return;
            }

            foreach (
                $order->items()
                    ->whereNotNull('stock_reference')
                    ->pluck('stock_reference')
                    ->unique()
                as $reference
            ) {
                $this->stock->release($reference);
            }

            $order->payments()
                ->where('provider', 'midtrans')
                ->update([
                    'transaction_status' => 'create_failed',
                    'updated_at' => now(),
                ]);

            $order->update([
                'status' => CommerceOrder::STATUS_CANCELLED,
                'payment_status' => CommerceOrder::PAYMENT_FAILED,
                'cancelled_at' => now(),
            ]);
        });
    }

    private function nextOrderNumber(): string
    {
        do {
            $number = 'NX-'
                .now()->format('YmdHis')
                .'-'
                .strtoupper(Str::random(8));
        } while (
            CommerceOrder::query()
                ->where('order_number', $number)
                ->exists()
        );

        return $number;
    }
}
