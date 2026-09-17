<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commerce\IndexCommerceOrderRequest;
use App\Http\Resources\CommerceOrderResource;
use App\Models\CommerceDigitalFile;
use App\Models\CommerceOrder;
use App\Models\CommerceOrderItem;
use App\Services\CommerceDigitalStockAllocationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StoreOrderController extends Controller
{
    public function index(
        IndexCommerceOrderRequest $request,
    ): AnonymousResourceCollection {
        $filters = $request->validated();

        $orders = CommerceOrder::query()
            ->with(['items', 'payments'])
            ->where('user_id', $request->user()->id)
            ->when(
                $filters['search'] ?? null,
                function ($query, string $search): void {
                    $query->where(function ($builder) use (
                        $search,
                    ): void {
                        $builder
                            ->where(
                                'order_number',
                                'like',
                                "%{$search}%",
                            )
                            ->orWhereHas(
                                'items',
                                fn ($items) => $items->where(
                                    'product_name',
                                    'like',
                                    "%{$search}%",
                                ),
                            );
                    });
                },
            )
            ->when(
                $filters['status'] ?? null,
                fn ($query, string $status) =>
                    $query->where('status', $status),
            )
            ->when(
                $filters['payment_status'] ?? null,
                fn ($query, string $status) =>
                    $query->where('payment_status', $status),
            )
            ->latest('created_at')
            ->paginate($filters['per_page'] ?? 20)
            ->withQueryString();

        return CommerceOrderResource::collection($orders);
    }

    public function show(
        IndexCommerceOrderRequest $request,
        CommerceOrder $commerceOrder,
    ): JsonResponse {
        abort_unless(
            (int) $commerceOrder->user_id
                === (int) $request->user()->id,
            404,
        );

        $resource = new CommerceOrderResource(
            $commerceOrder->load(['items', 'payments']),
        );

        return response()->json([
            'data' => $resource->resolve($request),
        ]);
    }


    public function delivery(
        Request $request,
        CommerceOrder $commerceOrder,
        CommerceDigitalStockAllocationService $stock,
    ): JsonResponse {
        abort_unless(
            (int) $commerceOrder->user_id
                === (int) $request->user()->id,
            404,
        );

        abort_unless(
            $commerceOrder->payment_status
                === CommerceOrder::PAYMENT_PAID,
            409,
            'Pembayaran pesanan belum berhasil.',
        );

        $items = $commerceOrder->items()
            ->orderBy('created_at')
            ->get();

        $deliveryItems = [];
        $allItemsFulfilled = $items->isNotEmpty();

        foreach ($items as $item) {
            if (
                $item->fulfillment_type
                    === CommerceOrderItem::FULFILLMENT_UNIQUE_STOCK
            ) {
                abort_unless(
                    filled($item->stock_reference),
                    409,
                    'Referensi stok pesanan tidak tersedia.',
                );

                $payloads = $stock->purchasedPayloads(
                    $item->stock_reference,
                    (int) $request->user()->id,
                );

                abort_unless(
                    count($payloads) === (int) $item->quantity,
                    409,
                    'Data pembelian belum tersedia lengkap.',
                );

                $deliveryItems[] = [
                    'order_item_id' => $item->id,
                    'product_name' => $item->product_name,
                    'variant_name' => $item->variant_name,
                    'sku' => $item->sku,
                    'quantity' => (int) $item->quantity,
                    'credentials' => collect($payloads)
                        ->values()
                        ->map(
                            fn (array $payload, int $index): array => [
                                'number' => $index + 1,
                                'data' => $payload['data'],
                            ],
                        )
                        ->all(),
                    'files' => [],
                ];

                continue;
            }

            if (
                $item->fulfillment_type
                    === CommerceOrderItem::FULFILLMENT_REUSABLE_FILE
            ) {
                $files = CommerceDigitalFile::query()
                    ->where(
                        'commerce_product_id',
                        $item->commerce_product_id,
                    )
                    ->where(
                        'status',
                        CommerceDigitalFile::STATUS_READY,
                    )
                    ->when(
                        $item->commerce_product_variant_id,
                        fn ($query) => $query->where(
                            function ($builder) use ($item): void {
                                $builder
                                    ->where(
                                        'commerce_product_variant_id',
                                        $item->commerce_product_variant_id,
                                    )
                                    ->orWhereNull(
                                        'commerce_product_variant_id',
                                    );
                            },
                        ),
                        fn ($query) => $query->whereNull(
                            'commerce_product_variant_id',
                        ),
                    )
                    ->orderBy('sort_order')
                    ->get();

                abort_unless(
                    $files->isNotEmpty(),
                    409,
                    'File pembelian belum tersedia.',
                );

                CommerceDigitalFile::query()
                    ->whereIn('id', $files->pluck('id'))
                    ->whereNull('delivered_at')
                    ->update([
                        'delivered_at' => now(),
                        'updated_at' => now(),
                    ]);

                $deliveryItems[] = [
                    'order_item_id' => $item->id,
                    'product_name' => $item->product_name,
                    'variant_name' => $item->variant_name,
                    'sku' => $item->sku,
                    'quantity' => (int) $item->quantity,
                    'credentials' => [],
                    'files' => $files
                        ->map(fn (CommerceDigitalFile $file): array => [
                            'id' => $file->id,
                            'label' => $file->label,
                            'original_name' => $file->original_name,
                            'mime_type' => $file->mime_type,
                            'size_bytes' => (int) $file->size_bytes,
                            'download_url' => url(
                                "/api/v1/store/orders/{$commerceOrder->id}"
                                ."/items/{$item->id}/files/{$file->id}",
                            ),
                        ])
                        ->values()
                        ->all(),
                ];

                continue;
            }

            $allItemsFulfilled = false;
        }

        foreach (
            $items->pluck('stock_reference')->filter()->unique()
            as $reference
        ) {
            $stock->markDelivered($reference);
        }

        if ($allItemsFulfilled) {
            $commerceOrder->update([
                'status' => CommerceOrder::STATUS_COMPLETED,
                'completed_at' =>
                    $commerceOrder->completed_at ?? now(),
            ]);
        }

        return response()->json([
            'data' => [
                'order_id' => $commerceOrder->id,
                'order_number' => $commerceOrder->order_number,
                'delivered_at' => now()->toISOString(),
                'items' => $deliveryItems,
            ],
        ])->withHeaders([
            'Cache-Control' =>
                'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function download(
        Request $request,
        CommerceOrder $commerceOrder,
        CommerceOrderItem $commerceOrderItem,
        CommerceDigitalFile $commerceDigitalFile,
    ): StreamedResponse {
        abort_unless(
            (int) $commerceOrder->user_id
                === (int) $request->user()->id,
            404,
        );

        abort_unless(
            $commerceOrder->payment_status
                === CommerceOrder::PAYMENT_PAID,
            409,
            'Pembayaran pesanan belum berhasil.',
        );

        abort_unless(
            (string) $commerceOrderItem->commerce_order_id
                === (string) $commerceOrder->id
            && $commerceOrderItem->fulfillment_type
                === CommerceOrderItem::FULFILLMENT_REUSABLE_FILE,
            404,
        );

        $variantMatches =
            $commerceOrderItem->commerce_product_variant_id === null
                ? $commerceDigitalFile
                    ->commerce_product_variant_id === null
                : (
                    $commerceDigitalFile
                        ->commerce_product_variant_id === null
                    || (string) $commerceDigitalFile
                        ->commerce_product_variant_id
                        === (string) $commerceOrderItem
                            ->commerce_product_variant_id
                );

        abort_unless(
            (string) $commerceDigitalFile->commerce_product_id
                === (string) $commerceOrderItem->commerce_product_id
            && $variantMatches
            && $commerceDigitalFile->status
                === CommerceDigitalFile::STATUS_READY,
            404,
        );

        $disk = Storage::disk($commerceDigitalFile->disk);

        abort_unless(
            $disk->exists($commerceDigitalFile->path),
            404,
            'File tidak ditemukan di penyimpanan.',
        );

        $commerceDigitalFile->update([
            'delivered_at' =>
                $commerceDigitalFile->delivered_at ?? now(),
            'downloaded_at' => now(),
        ]);

        return $disk->download(
            $commerceDigitalFile->path,
            $commerceDigitalFile->original_name,
            [
                'Content-Type' =>
                    $commerceDigitalFile->mime_type
                        ?: 'application/octet-stream',
                'Cache-Control' =>
                    'private, no-store, max-age=0',
                'Pragma' => 'no-cache',
                'X-Content-Type-Options' => 'nosniff',
            ],
        );
    }

}
