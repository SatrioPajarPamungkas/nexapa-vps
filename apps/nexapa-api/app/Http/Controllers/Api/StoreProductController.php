<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commerce\IndexStoreProductRequest;
use App\Http\Resources\CommerceProductResource;
use App\Models\CommerceProduct;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StoreProductController extends Controller
{
    public function index(
        IndexStoreProductRequest $request,
    ): AnonymousResourceCollection {
        $validated = $request->validated();

        $query = CommerceProduct::query()
            ->where('status', CommerceProduct::STATUS_ACTIVE)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->orderByDesc('published_at')
            ->orderByDesc('created_at');

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('type', 'like', "%{$search}%");
            });
        }

        if (! empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        return CommerceProductResource::collection(
            $query->paginate((int) ($validated['per_page'] ?? 24)),
        )->additional([
            'success' => true,
            'message' => 'Store products retrieved.',
        ]);
    }

    public function show(string $slug): CommerceProductResource
    {
        $product = CommerceProduct::query()
            ->where('slug', $slug)
            ->where('status', CommerceProduct::STATUS_ACTIVE)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->firstOrFail();

        return (new CommerceProductResource($product))->additional([
            'success' => true,
            'message' => 'Store product retrieved.',
        ]);
    }
}
