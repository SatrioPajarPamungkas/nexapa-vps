<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommerceOrderItem extends Model
{
    use HasUuids;

    public const FULFILLMENT_UNIQUE_STOCK = 'unique_stock';
    public const FULFILLMENT_REUSABLE_FILE = 'reusable_file';

    protected $fillable = [
        'commerce_order_id',
        'commerce_product_id',
        'commerce_product_variant_id',
        'product_name',
        'product_slug',
        'variant_name',
        'sku',
        'fulfillment_type',
        'stock_reference',
        'unit_price_amount',
        'quantity',
        'subtotal_amount',
    ];

    protected function casts(): array
    {
        return [
            'unit_price_amount' => 'integer',
            'quantity' => 'integer',
            'subtotal_amount' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(
            CommerceOrder::class,
            'commerce_order_id',
        );
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(
            CommerceProduct::class,
            'commerce_product_id',
        );
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(
            CommerceProductVariant::class,
            'commerce_product_variant_id',
        );
    }
}
