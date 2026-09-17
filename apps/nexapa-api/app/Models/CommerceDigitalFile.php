<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommerceDigitalFile extends Model
{
    use HasUuids;

    public const STATUS_READY = 'ready';
    public const STATUS_SOLD = 'sold';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_DOWNLOADED = 'downloaded';
    public const STATUS_DISABLED = 'disabled';

    protected $fillable = [
        'commerce_product_id',
        'commerce_product_variant_id',
        'label',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size_bytes',
        'checksum_sha256',
        'status',
        'sort_order',
        'sold_at',
        'delivered_at',
        'downloaded_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'sort_order' => 'integer',
            'sold_at' => 'datetime',
            'delivered_at' => 'datetime',
            'downloaded_at' => 'datetime',
        ];
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
