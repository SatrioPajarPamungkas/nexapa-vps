<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmUserMapping extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'provisioned_at' => 'datetime',
        ];
    }

    public function publisherUser(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'publisher_user_id'
        );
    }
}
