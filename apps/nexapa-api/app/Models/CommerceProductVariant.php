<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommerceProductVariant extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'sku',
        'price_amount',
        'discount_price_amount',
        'sold_count',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price_amount' => 'integer',
            'discount_price_amount' => 'integer',
            'sold_count' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(
            CommerceProduct::class,
            'commerce_product_id',
        );
    }
}
