<?php

namespace App\Services;

use App\Models\CommerceProduct;
use App\Models\User;
use Illuminate\Support\Str;

class CommerceProductService
{
    public function create(array $data, User $actor): CommerceProduct
    {
        $data['slug'] = $data['slug'] ?? $this->uniqueSlug($data['name']);
        $data['published_at'] = $this->publishedAtForStatus($data['status']);
        $data['created_by'] = $actor->getKey();
        $data['updated_by'] = $actor->getKey();

        return CommerceProduct::create($data);
    }

    public function update(CommerceProduct $product, array $data, User $actor): CommerceProduct
    {
        $data['slug'] = $data['slug'] ?? $product->slug;
        $data['published_at'] = $this->publishedAtForStatus(
            $data['status'],
            $product->published_at,
        );
        $data['updated_by'] = $actor->getKey();

        $product->update($data);

        return $product->refresh();
    }

    public function delete(CommerceProduct $product): void
    {
        $product->delete();
    }

    private function publishedAtForStatus(string $status, mixed $current = null): mixed
    {
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

        while (CommerceProduct::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
