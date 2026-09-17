<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommerceDigitalImportBatch extends Model
{
    use HasUuids;

    protected $fillable = [
        'commerce_product_id',
        'commerce_product_variant_id',
        'original_name',
        'headers',
        'total_rows',
        'imported_rows',
        'duplicate_rows',
        'invalid_rows',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'headers' => 'array',
            'total_rows' => 'integer',
            'imported_rows' => 'integer',
            'duplicate_rows' => 'integer',
            'invalid_rows' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(CommerceProduct::class, 'commerce_product_id');
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(
            CommerceProductVariant::class,
            'commerce_product_variant_id',
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            CommerceDigitalStockItem::class,
            'import_batch_id',
        );
    }
}
