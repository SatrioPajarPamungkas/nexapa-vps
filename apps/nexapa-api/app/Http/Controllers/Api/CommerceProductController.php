<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commerce\IndexCommerceProductRequest;
use App\Http\Requests\Commerce\StoreCommerceProductRequest;
use App\Http\Requests\Commerce\UpdateCommerceProductRequest;
use App\Http\Resources\CommerceProductResource;
use App\Models\CommerceProduct;
use App\Services\CommerceProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommerceProductController extends Controller
{
    public function __construct(
        private readonly CommerceProductService $products,
    ) {}

    public function overview(Request $request): JsonResponse
    {
        $recent = CommerceProduct::query()
            ->latest('updated_at')
            ->limit(5)
            ->get()
            ->map(fn (CommerceProduct $product): array =>
                (new CommerceProductResource($product))->resolve($request)
            )
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'metrics' => [
                    'total' => CommerceProduct::query()->count(),
                    'active' => CommerceProduct::query()
                        ->where('status', CommerceProduct::STATUS_ACTIVE)
                        ->count(),
                    'draft' => CommerceProduct::query()
                        ->where('status', CommerceProduct::STATUS_DRAFT)
                        ->count(),
                    'archived' => CommerceProduct::query()
                        ->where('status', CommerceProduct::STATUS_ARCHIVED)
                        ->count(),
                    'active_catalog_value' => (int) CommerceProduct::query()
                        ->where('status', CommerceProduct::STATUS_ACTIVE)
                        ->sum('price_amount'),
                ],
                'recent' => $recent,
            ],
        ]);
    }

    public function index(IndexCommerceProductRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();
        $query = CommerceProduct::query()->latest();

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('type', 'like', "%{$search}%");
            });
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        return CommerceProductResource::collection(
            $query->paginate((int) ($validated['per_page'] ?? 50)),
        )->additional([
            'success' => true,
            'message' => 'Commerce products retrieved.',
        ]);
    }

    public function store(StoreCommerceProductRequest $request): JsonResponse
    {
        $product = $this->products->create(
            $request->validated(),
            $request->user(),
        );

        return (new CommerceProductResource($product))
            ->additional([
                'success' => true,
                'message' => 'Commerce product created.',
            ])
            ->response()
            ->setStatusCode(201);
    }

    public function show(CommerceProduct $product): CommerceProductResource
    {
        return (new CommerceProductResource($product))->additional([
            'success' => true,
            'message' => 'Commerce product retrieved.',
        ]);
    }

    public function update(
        UpdateCommerceProductRequest $request,
        CommerceProduct $product,
    ): CommerceProductResource {
        $product = $this->products->update(
            $product,
            $request->validated(),
            $request->user(),
        );

        return (new CommerceProductResource($product))->additional([
            'success' => true,
            'message' => 'Commerce product updated.',
        ]);
    }

    public function destroy(CommerceProduct $product): JsonResponse
    {
        $this->products->delete($product);

        return response()->json([
            'success' => true,
            'message' => 'Commerce product deleted.',
        ]);
    }
}
