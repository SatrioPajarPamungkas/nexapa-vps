<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CommerceSubscriptionPlanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['product' => ['nullable', Rule::in(['publisher', 'crm'])]]);
        $plans = SubscriptionPlan::query()
            ->when($data['product'] ?? null, fn ($query, $product) => $query->where('product', $product))
            ->orderBy('product')->orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['data' => $plans->map(fn (SubscriptionPlan $plan) => $this->serialize($plan))->values()]);
    }

    public function update(Request $request, SubscriptionPlan $subscriptionPlan): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:3000'],
            'monthly_price' => ['required', 'integer', 'min:0'],
            'monthly_promo_price' => ['nullable', 'integer', 'min:0'],
            'yearly_price' => ['required', 'integer', 'min:0'],
            'yearly_promo_price' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:10000'],
        ]);
        if (($data['monthly_promo_price'] ?? null) !== null && $data['monthly_promo_price'] >= $data['monthly_price']) {
            throw ValidationException::withMessages(['monthly_promo_price' => 'Harga promo bulanan harus lebih kecil dari harga normal.']);
        }
        if (($data['yearly_promo_price'] ?? null) !== null && $data['yearly_promo_price'] >= $data['yearly_price']) {
            throw ValidationException::withMessages(['yearly_promo_price' => 'Harga promo tahunan harus lebih kecil dari harga normal.']);
        }
        $subscriptionPlan->update($data);

        return response()->json(['success' => true, 'message' => 'Daftar harga berhasil diperbarui.', 'data' => $this->serialize($subscriptionPlan->fresh())]);
    }

    private function serialize(SubscriptionPlan $plan): array
    {
        return [
            'id' => $plan->getKey(), 'product' => $plan->product, 'code' => $plan->code,
            'name' => $plan->name, 'description' => $plan->description,
            'monthly_price' => (int) $plan->monthly_price,
            'yearly_price' => (int) $plan->yearly_price,
            'monthly_promo_price' => $plan->monthly_promo_price === null ? null : (int) $plan->monthly_promo_price,
            'yearly_promo_price' => $plan->yearly_promo_price === null ? null : (int) $plan->yearly_promo_price,
            'limits' => $plan->limits, 'is_active' => (bool) $plan->is_active,
            'sort_order' => (int) $plan->sort_order,
        ];
    }
}
