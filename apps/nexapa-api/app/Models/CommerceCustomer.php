<?php

namespace App\Models;

use App\Notifications\VerifyEmailNotification;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class CommerceCustomer extends Authenticatable implements MustVerifyEmail
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'email_verified_at',
        'access_status',
        'registered_at',
        'suspended_at',
        'suspension_reason',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'email_verified_at' => 'datetime',
            'registered_at' => 'datetime',
            'suspended_at' => 'datetime',
        ];
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(
            new VerifyEmailNotification(
                destination: 'store',
                routeName: 'store.verification.verify',
            )
        );
    }

    public function orders(): HasMany
    {
        return $this->hasMany(CommerceOrder::class, 'user_id');
    }

    public function latestOrder(): HasOne
    {
        return $this->hasOne(
            CommerceOrder::class,
            'user_id',
        )->latestOfMany('created_at');
    }
}
