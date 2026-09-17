<?php

namespace App\Services;

use App\Models\CommerceProduct;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class CommerceProductService
{
    public function create(array $data, User $actor): CommerceProduct
    {
        $image = $data['image'] ?? null;
        $variants = $data['variants'] ?? [];

        unset(
            $data['image'],
            $data['remove_image'],
            $data['variants'],
        );

        $storedPath = null;

        try {
            if ($image instanceof UploadedFile) {
                $storedPath = $image->store(
                    'commerce/products',
                    'public',
                );
                $data['image_path'] = $storedPath;
            }

            return DB::transaction(function () use (
                $data,
                $variants,
                $actor,
            ): CommerceProduct {
                $data['slug'] = $data['slug']
                    ?? $this->uniqueSlug($data['name']);
                $data['published_at'] =
                    $this->publishedAtForStatus($data['status']);
                $data['created_by'] = $actor->getKey();
                $data['updated_by'] = $actor->getKey();

                $product = CommerceProduct::create($data);
                $this->syncVariants($product, $variants);

                return $product->refresh()->load('variants');
            });
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk('public')->delete($storedPath);
            }

            throw $exception;
        }
    }

    public function update(
        CommerceProduct $product,
        array $data,
        User $actor,
    ): CommerceProduct {
        $image = $data['image'] ?? null;
        $removeImage = (bool) ($data['remove_image'] ?? false);
        $shouldSyncVariants = array_key_exists('variants', $data);
        $variants = $data['variants'] ?? [];

        unset(
            $data['image'],
            $data['remove_image'],
            $data['variants'],
        );

        $oldPath = $product->image_path;
        $newPath = null;

        try {
            if ($image instanceof UploadedFile) {
                $newPath = $image->store(
                    'commerce/products',
                    'public',
                );
                $data['image_path'] = $newPath;
            } elseif ($removeImage) {
                $data['image_path'] = null;
                $data['image_alt'] = null;
            }

            $product = DB::transaction(function () use (
                $product,
                $data,
                $variants,
                $shouldSyncVariants,
                $actor,
            ): CommerceProduct {
                $data['slug'] = $data['slug'] ?? $product->slug;
                $data['published_at'] =
                    $this->publishedAtForStatus(
                        $data['status'],
                        $product->published_at,
                    );
                $data['updated_by'] = $actor->getKey();

                $product->update($data);

                if ($shouldSyncVariants) {
                    $this->syncVariants($product, $variants);
                }

                return $product->refresh()->load('variants');
            });
        } catch (Throwable $exception) {
            if ($newPath) {
                Storage::disk('public')->delete($newPath);
            }

            throw $exception;
        }

        if (($newPath || $removeImage) && $oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return $product;
    }

    public function delete(CommerceProduct $product): void
    {
        $product->delete();
    }

    private function syncVariants(
        CommerceProduct $product,
        array $variants,
    ): void {
        $keptIds = [];

        foreach (array_values($variants) as $index => $variantData) {
            $payload = [
                'name' => trim((string) $variantData['name']),
                'sku' => filled($variantData['sku'] ?? null)
                    ? strtoupper(trim((string) $variantData['sku']))
                    : null,
                'price_amount' =>
                    (int) $variantData['price_amount'],
                'discount_price_amount' =>
                    filled($variantData['discount_price_amount'] ?? null)
                        ? (int) $variantData['discount_price_amount']
                        : null,
                'is_active' =>
                    (bool) ($variantData['is_active'] ?? true),
                'sort_order' => $index,
            ];

            if (! empty($variantData['id'])) {
                $variant = $product->variants()
                    ->whereKey($variantData['id'])
                    ->firstOrFail();

                $variant->update($payload);
            } else {
                $variant = $product->variants()->create($payload);
            }

            $keptIds[] = $variant->getKey();
        }

        $deleteQuery = $product->variants();

        if ($keptIds === []) {
            $deleteQuery->delete();

            return;
        }

        $deleteQuery->whereNotIn('id', $keptIds)->delete();
    }

    private function publishedAtForStatus(
        string $status,
        mixed $current = null,
    ): mixed {
        if ($status === CommerceProduct::STATUS_ACTIVE) {
            return $current ?? now();
        }

        return null;
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'produk';
        $slug = $base;
        $suffix = 2;

        while (
            CommerceProduct::withTrashed()
                ->where('slug', $slug)
                ->exists()
        ) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
