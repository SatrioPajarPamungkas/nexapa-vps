<?php

namespace App\Http\Resources;

use App\Models\CommerceDigitalStockItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommerceDigitalStockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'masked_identifier' => $this->masked_identifier,
            'status' => $this->status,
            'status_label' => $this->statusLabel(),
            'sort_order' => (int) $this->sort_order,
            'order_reference' => $this->order_reference,
            'product' => [
                'id' => $this->product->id,
                'name' => $this->product->name,
            ],
            'variant' => $this->variant ? [
                'id' => $this->variant->id,
                'name' => $this->variant->name,
                'sku' => $this->variant->sku,
            ] : null,
            'batch_id' => $this->import_batch_id,
            'reserved_until' =>
                $this->reserved_until?->toISOString(),
            'sold_at' => $this->sold_at?->toISOString(),
            'delivered_at' => $this->delivered_at?->toISOString(),
            'downloaded_at' =>
                $this->downloaded_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }

    private function statusLabel(): string
    {
        return match ($this->status) {
            CommerceDigitalStockItem::STATUS_AVAILABLE =>
                'Tersedia',
            CommerceDigitalStockItem::STATUS_RESERVED =>
                'Direservasi',
            CommerceDigitalStockItem::STATUS_SOLD =>
                'Terjual',
            CommerceDigitalStockItem::STATUS_DELIVERED =>
                'Terkirim ke chat',
            CommerceDigitalStockItem::STATUS_DOWNLOADED =>
                'Sudah diunduh',
            CommerceDigitalStockItem::STATUS_INVALID =>
                'Bermasalah',
            CommerceDigitalStockItem::STATUS_DISABLED =>
                'Dinonaktifkan',
            default => $this->status,
        };
    }
}
