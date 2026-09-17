<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commerce\ImportCommerceDigitalStockRequest;
use App\Http\Requests\Commerce\IndexCommerceDigitalStockRequest;
use App\Http\Requests\Commerce\PreviewCommerceDigitalStockRequest;
use App\Http\Resources\CommerceDigitalStockResource;
use App\Models\CommerceDigitalStockItem;
use App\Services\CommerceDigitalStockImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommerceDigitalStockController extends Controller
{
    public function __construct(
        private readonly CommerceDigitalStockImportService $imports,
    ) {}

    public function index(
        IndexCommerceDigitalStockRequest $request,
    ): AnonymousResourceCollection {
        $validated = $request->validated();

        $query = CommerceDigitalStockItem::query()
            ->with([
                'product:id,name',
                'variant:id,name,sku',
            ])
            ->orderBy('commerce_product_id')
            ->orderBy('sort_order');

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where(
                        'masked_identifier',
                        'like',
                        "%{$search}%",
                    )
                    ->orWhere(
                        'order_reference',
                        'like',
                        "%{$search}%",
                    )
                    ->orWhereHas(
                        'product',
                        fn ($product) => $product->where(
                            'name',
                            'like',
                            "%{$search}%",
                        ),
                    )
                    ->orWhereHas(
                        'variant',
                        fn ($variant) => $variant
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%"),
                    );
            });
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['product_id'])) {
            $query->where(
                'commerce_product_id',
                $validated['product_id'],
            );
        }

        $summary = CommerceDigitalStockItem::query()
            ->selectRaw('COUNT(*) as total')
            ->selectRaw(
                "SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as available",
                [CommerceDigitalStockItem::STATUS_AVAILABLE],
            )
            ->selectRaw(
                "SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as reserved",
                [CommerceDigitalStockItem::STATUS_RESERVED],
            )
            ->selectRaw(
                "SUM(CASE WHEN status IN (?, ?, ?) THEN 1 ELSE 0 END) as sold",
                [
                    CommerceDigitalStockItem::STATUS_SOLD,
                    CommerceDigitalStockItem::STATUS_DELIVERED,
                    CommerceDigitalStockItem::STATUS_DOWNLOADED,
                ],
            )
            ->selectRaw(
                "SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as downloaded",
                [CommerceDigitalStockItem::STATUS_DOWNLOADED],
            )
            ->first();

        return CommerceDigitalStockResource::collection(
            $query->paginate((int) ($validated['per_page'] ?? 50)),
        )->additional([
            'success' => true,
            'summary' => [
                'total' => (int) ($summary->total ?? 0),
                'available' => (int) ($summary->available ?? 0),
                'reserved' => (int) ($summary->reserved ?? 0),
                'sold' => (int) ($summary->sold ?? 0),
                'downloaded' => (int) ($summary->downloaded ?? 0),
            ],
        ]);
    }

    public function preview(
        PreviewCommerceDigitalStockRequest $request,
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'data' => $this->imports->preview(
                $request->file('file'),
            ),
        ]);
    }

    public function import(
        ImportCommerceDigitalStockRequest $request,
    ): JsonResponse {
        $validated = $request->validated();

        $batch = $this->imports->import(
            $request->file('file'),
            $validated['commerce_product_id'],
            $validated['commerce_product_variant_id'] ?? null,
            $request->user()->getKey(),
        );

        return response()->json([
            'success' => true,
            'message' => 'Stok digital berhasil diimpor.',
            'data' => [
                'id' => $batch->id,
                'product' => $batch->product,
                'variant' => $batch->variant,
                'original_name' => $batch->original_name,
                'headers' => $batch->headers,
                'total_rows' => $batch->total_rows,
                'imported_rows' => $batch->imported_rows,
                'duplicate_rows' => $batch->duplicate_rows,
                'invalid_rows' => $batch->invalid_rows,
                'created_at' =>
                    $batch->created_at?->toISOString(),
            ],
        ], 201);
    }

    public function destroy(
        CommerceDigitalStockItem $stockItem,
    ): JsonResponse {
        if (! in_array(
            $stockItem->status,
            [
                CommerceDigitalStockItem::STATUS_AVAILABLE,
                CommerceDigitalStockItem::STATUS_INVALID,
                CommerceDigitalStockItem::STATUS_DISABLED,
            ],
            true,
        )) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Stok yang sudah dialokasikan tidak dapat dihapus.',
            ], 409);
        }

        $stockItem->delete();

        return response()->json([
            'success' => true,
            'message' => 'Stok digital dihapus.',
        ]);
    }
}
