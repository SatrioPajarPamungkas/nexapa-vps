<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminUserCredential extends Model
{
    protected $fillable = [
        'normalized_email',
        'products',
        'password',
        'created_by',
        'password_updated_at',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'products' => 'array',
            'password' => 'encrypted',
            'password_updated_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
