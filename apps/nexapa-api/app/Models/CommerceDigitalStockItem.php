<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommerceDigitalStockItem extends Model
{
    use HasUuids;

    public const STATUS_AVAILABLE = 'available';
    public const STATUS_RESERVED = 'reserved';
    public const STATUS_SOLD = 'sold';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_DOWNLOADED = 'downloaded';
    public const STATUS_INVALID = 'invalid';
    public const STATUS_DISABLED = 'disabled';

    protected $fillable = [
        'commerce_product_id',
        'commerce_product_variant_id',
        'import_batch_id',
        'masked_identifier',
        'payload',
        'fingerprint',
        'status',
        'sort_order',
        'reservation_token',
        'order_reference',
        'buyer_id',
        'reserved_until',
        'sold_at',
        'delivered_at',
        'downloaded_at',
        'created_by',
    ];

    protected $hidden = [
        'payload',
        'fingerprint',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'encrypted:array',
            'sort_order' => 'integer',
            'reserved_until' => 'datetime',
            'sold_at' => 'datetime',
            'delivered_at' => 'datetime',
            'downloaded_at' => 'datetime',
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

    public function batch(): BelongsTo
    {
        return $this->belongsTo(
            CommerceDigitalImportBatch::class,
            'import_batch_id',
        );
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }
}
