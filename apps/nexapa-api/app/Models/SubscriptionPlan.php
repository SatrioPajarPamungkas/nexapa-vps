<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'monthly_price' => 'integer',
            'yearly_price' => 'integer',
            'monthly_promo_price' => 'integer',
            'yearly_promo_price' => 'integer',
            'limits' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function priceFor(string $billingCycle): int
    {
        return $billingCycle === 'yearly'
            ? $this->yearly_price
            : $this->monthly_price;
    }

    public function finalPriceFor(string $billingCycle): int
    {
        $promo = $billingCycle === 'yearly'
            ? $this->yearly_promo_price
            : $this->monthly_promo_price;

        return $promo === null
            ? $this->priceFor($billingCycle)
            : (int) $promo;
    }
}
