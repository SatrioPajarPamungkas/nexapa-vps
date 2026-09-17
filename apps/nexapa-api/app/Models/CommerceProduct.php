<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CommerceProduct extends Model
{
    use HasUuids, SoftDeletes;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_ARCHIVED = 'archived';

    protected $with = ['variants'];

    protected $fillable = [
        'name',
        'slug',
        'description',
        'image_path',
        'image_alt',
        'type',
        'price_amount',
        'discount_price_amount',
        'sold_count',
        'expires_at',
        'expiration_warning_sent_at',
        'expired_at',
        'first_sold_at',
        'republished_count',
        'currency',
        'status',
        'published_at',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'price_amount' => 'integer',
            'discount_price_amount' => 'integer',
            'sold_count' => 'integer',
            'published_at' => 'datetime',
            'expires_at' => 'datetime',
            'expiration_warning_sent_at' => 'datetime',
            'expired_at' => 'datetime',
            'first_sold_at' => 'datetime',
            'republished_count' => 'integer',
        ];
    }

    public function variants(): HasMany
    {
        return $this->hasMany(
            CommerceProductVariant::class,
            'commerce_product_id',
        )->orderBy('sort_order');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
