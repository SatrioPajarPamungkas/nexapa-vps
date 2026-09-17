<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommerceOrder extends Model
{
    use HasUuids;

    public const STATUS_PAYMENT_PENDING = 'payment_pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_REFUNDED = 'refunded';

    public const PAYMENT_PENDING = 'pending';
    public const PAYMENT_PAID = 'paid';
    public const PAYMENT_FAILED = 'failed';
    public const PAYMENT_EXPIRED = 'expired';
    public const PAYMENT_REFUNDED = 'refunded';

    protected $fillable = [
        'order_number',
        'checkout_token',
        'user_id',
        'customer_name',
        'customer_email',
        'customer_phone',
        'currency',
        'subtotal_amount',
        'discount_amount',
        'total_amount',
        'status',
        'payment_status',
        'promotion_code',
        'placed_at',
        'expires_at',
        'paid_at',
        'completed_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'subtotal_amount' => 'integer',
            'discount_amount' => 'integer',
            'total_amount' => 'integer',
            'placed_at' => 'datetime',
            'expires_at' => 'datetime',
            'paid_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(
            CommerceCustomer::class,
            'user_id',
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            CommerceOrderItem::class,
            'commerce_order_id',
        );
    }

    public function payments(): HasMany
    {
        return $this->hasMany(
            CommercePayment::class,
            'commerce_order_id',
        );
    }
}
