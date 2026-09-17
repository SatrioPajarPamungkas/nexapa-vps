<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CommerceProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $variants = $this->variants;

        if ($request->routeIs('api.v1.store.*')) {
            $variants = $variants
                ->where('is_active', true)
                ->values();
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'image_url' => $this->image_path
                ? url(Storage::disk('public')->url($this->image_path))
                : null,
            'image_alt' => $this->image_alt,
            'type' => $this->type,
            'price_amount' => (int) $this->price_amount,
            'discount_price_amount' => $this->discount_price_amount !== null
                ? (int) $this->discount_price_amount
                : null,
            'final_price_amount' => $this->discount_price_amount !== null
                ? (int) $this->discount_price_amount
                : (int) $this->price_amount,
            'discount_percentage' => $this->discountPercentage(
                (int) $this->price_amount,
                $this->discount_price_amount,
            ),
            'sold_count' => (int) $this->sold_count,
            'expires_at' => $this->expires_at?->toISOString(),
            'expiration_warning_sent_at' =>
                $this->expiration_warning_sent_at?->toISOString(),
            'expired_at' => $this->expired_at?->toISOString(),
            'first_sold_at' => $this->first_sold_at?->toISOString(),
            'republished_count' => (int) $this->republished_count,
            'expiration_status' => $this->expirationStatus(),
            'currency' => $this->currency,
            'status' => $this->status,
            'variants' => $variants
                ->sortBy('sort_order')
                ->values()
                ->map(fn ($variant): array => [
                    'id' => $variant->id,
                    'name' => $variant->name,
                    'sku' => $variant->sku,
                    'price_amount' => (int) $variant->price_amount,
                    'discount_price_amount' =>
                        $variant->discount_price_amount !== null
                            ? (int) $variant->discount_price_amount
                            : null,
                    'final_price_amount' =>
                        $variant->discount_price_amount !== null
                            ? (int) $variant->discount_price_amount
                            : (int) $variant->price_amount,
                    'discount_percentage' => $this->discountPercentage(
                        (int) $variant->price_amount,
                        $variant->discount_price_amount,
                    ),
                    'sold_count' => (int) $variant->sold_count,
                    'is_active' => (bool) $variant->is_active,
                    'sort_order' => (int) $variant->sort_order,
                ])
                ->all(),
            'published_at' => $this->published_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function expirationStatus(): string
    {
        if (
            (int) $this->sold_count > 0 ||
            $this->first_sold_at !== null
        ) {
            return 'sold';
        }

        if ($this->expired_at !== null) {
            return 'expired';
        }

        if ($this->expires_at === null) {
            return 'none';
        }

        if ($this->expires_at->isPast()) {
            return 'expired';
        }

        if ($this->expires_at->lessThanOrEqualTo(now()->addDay())) {
            return 'warning';
        }

        return 'active';
    }

    private function discountPercentage(
        int $price,
        mixed $discountPrice,
    ): ?int {
        if ($discountPrice === null || $price <= 0) {
            return null;
        }

        return (int) round(
            (1 - ((int) $discountPrice / $price)) * 100
        );
    }
}
