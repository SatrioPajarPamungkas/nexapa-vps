<?php

namespace App\Http\Resources;

use App\Models\CommerceDigitalFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommerceDigitalFileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size_bytes' => (int) $this->size_bytes,
            'checksum_sha256' => $this->checksum_sha256,
            'status' => $this->status,
            'status_label' => $this->statusLabel(),
            'sort_order' => (int) $this->sort_order,
            'product' => [
                'id' => $this->product->id,
                'name' => $this->product->name,
            ],
            'variant' => $this->variant ? [
                'id' => $this->variant->id,
                'name' => $this->variant->name,
                'sku' => $this->variant->sku,
            ] : null,
            'sold_at' => $this->sold_at?->toISOString(),
            'delivered_at' => $this->delivered_at?->toISOString(),
            'downloaded_at' => $this->downloaded_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function statusLabel(): string
    {
        return match ($this->status) {
            CommerceDigitalFile::STATUS_READY => 'Siap dijual',
            CommerceDigitalFile::STATUS_SOLD => 'Terjual',
            CommerceDigitalFile::STATUS_DELIVERED => 'Terkirim ke chat',
            CommerceDigitalFile::STATUS_DOWNLOADED => 'Sudah diunduh',
            CommerceDigitalFile::STATUS_DISABLED => 'Dinonaktifkan',
            default => $this->status,
        };
    }
}
