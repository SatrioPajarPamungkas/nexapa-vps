<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commerce\IndexCommerceOrderRequest;
use App\Http\Resources\CommerceOrderResource;
use App\Models\CommerceOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CommerceOrderController extends Controller
{
    public function index(
        IndexCommerceOrderRequest $request,
    ): AnonymousResourceCollection {
        $filters = $request->validated();

        $summary = [
            'total' => CommerceOrder::query()->count(),
            'pending' => CommerceOrder::query()
                ->where('payment_status', CommerceOrder::PAYMENT_PENDING)
                ->count(),
            'paid' => CommerceOrder::query()
                ->where('payment_status', CommerceOrder::PAYMENT_PAID)
                ->count(),
            'completed' => CommerceOrder::query()
                ->where('status', CommerceOrder::STATUS_COMPLETED)
                ->count(),
        ];

        $orders = CommerceOrder::query()
            ->with(['items', 'payments'])
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
                            ->orWhere(
                                'customer_name',
                                'like',
                                "%{$search}%",
                            )
                            ->orWhere(
                                'customer_email',
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
            ->paginate($filters['per_page'] ?? 25)
            ->withQueryString();

        return CommerceOrderResource::collection($orders)
            ->additional(['summary' => $summary]);
    }

    public function show(
        Request $request,
        CommerceOrder $commerceOrder,
    ): JsonResponse {
        $resource = new CommerceOrderResource(
            $commerceOrder->load(['items', 'payments']),
        );

        return response()->json([
            'data' => $resource->resolve($request),
        ]);
    }
}
