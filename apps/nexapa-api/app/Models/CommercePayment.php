<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommercePayment extends Model
{
    use HasUuids;

    protected $fillable = [
        'commerce_order_id',
        'provider',
        'provider_order_id',
        'snap_token',
        'redirect_url',
        'transaction_id',
        'payment_type',
        'transaction_status',
        'fraud_status',
        'gross_amount',
        'raw_notification',
        'last_notified_at',
    ];

    protected $hidden = [
        'raw_notification',
    ];

    protected function casts(): array
    {
        return [
            'gross_amount' => 'integer',
            'raw_notification' => 'encrypted:array',
            'last_notified_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(
            CommerceOrder::class,
            'commerce_order_id',
        );
    }
}
