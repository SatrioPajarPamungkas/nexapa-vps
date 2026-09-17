<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CommerceProductResource;
use App\Models\CommerceProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommerceStorefrontProductController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:160'],
            'type' => ['nullable', 'string', 'max:80'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ]);

        $query = CommerceProduct::query()
            ->where('status', CommerceProduct::STATUS_ACTIVE)
            ->latest('published_at');

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
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
            'message' => 'Storefront products retrieved.',
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $product = CommerceProduct::query()
            ->where('status', CommerceProduct::STATUS_ACTIVE)
            ->where('slug', $slug)
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => new CommerceProductResource($product),
        ]);
    }
}
