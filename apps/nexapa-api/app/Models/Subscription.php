<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'price_paid' => 'integer',
            'limits_snapshot' => 'array',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(
            SubscriptionPlan::class,
            'subscription_plan_id'
        );
    }

    public function publisherUser(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'publisher_user_id'
        );
    }

    public function usages(): HasMany
    {
        return $this->hasMany(SubscriptionUsage::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active'
            && $this->starts_at?->isPast()
            && $this->expires_at?->isFuture();
    }
}
