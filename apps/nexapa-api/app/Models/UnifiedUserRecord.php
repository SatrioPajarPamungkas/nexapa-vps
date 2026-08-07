<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UnifiedUserRecord extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'email_verified' => 'boolean',
            'publisher_registered_at' => 'datetime',
            'crm_registered_at' => 'datetime',
        ];
    }

    public static function fromArray(array $attributes): self
    {
        $record = new self($attributes);
        $record->exists = true;

        return $record;
    }
}
