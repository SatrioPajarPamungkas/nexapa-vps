<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionUsage extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'period_starts_at' => 'datetime',
            'period_ends_at' => 'datetime',
            'ai_requests' => 'integer',
            'broadcasts_sent' => 'integer',
            'scheduled_posts' => 'integer',
        ];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }
}
