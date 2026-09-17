<?php

namespace App\Models;

use App\Notifications\VerifyEmailNotification;
use Database\Factories\UserFactory;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'email_verified_at', 'google_id', 'google_avatar_url', 'is_suspended', 'suspended_at', 'publisher_access_status', 'publisher_suspended_at', 'publisher_suspension_reason', 'crm_access_status', 'crm_suspended_at', 'crm_suspension_reason', 'commerce_access_status', 'commerce_registered_at', 'commerce_suspended_at', 'commerce_suspension_reason'])]
#[Hidden(['password', 'remember_token', 'google_id'])]
class User extends Authenticatable implements FilamentUser, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    public function sendEmailVerificationNotification()
    {
        $this->notify(new VerifyEmailNotification);
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'is_suspended' => 'boolean',
            'suspended_at' => 'datetime',
            'publisher_suspended_at' => 'datetime',
            'crm_suspended_at' => 'datetime',
            'commerce_registered_at' => 'datetime',
            'commerce_suspended_at' => 'datetime',
            'google_id' => 'string',
        ];
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return $this->is_admin === true
            && $this->is_suspended !== true;
    }

    public function isAdmin(): bool
    {
        return $this->is_admin === true;
    }

    public function isUser(): bool
    {
        return ! $this->isAdmin();
    }

    public function downloadJobs(): HasMany
    {
        return $this->hasMany(DownloadJob::class);
    }

    public function mediaAssets(): HasMany
    {
        return $this->hasMany(MediaAsset::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function connectedAccounts(): HasMany
    {
        return $this->hasMany(ConnectedAccount::class);
    }

    public function publisherPosts(): HasMany
    {
        return $this->hasMany(PublisherPost::class);
    }

    public function latestSubscription(): HasOne
    {
        return $this->hasOne(
            Subscription::class,
            'publisher_user_id',
        )->where('product', 'publisher')->latestOfMany();
    }

    public function crmUserMapping(): HasOne
    {
        return $this->hasOne(
            CrmUserMapping::class,
            'publisher_user_id',
        );
    }

    public function commerceOrders(): HasMany
    {
        return $this->hasMany(
            CommerceOrder::class,
            'user_id',
        );
    }

    public function latestCommerceOrder(): HasOne
    {
        return $this->hasOne(
            CommerceOrder::class,
            'user_id',
        )->latestOfMany('created_at');
    }

    public function collections(): HasMany
    {
        return $this->hasMany(Collection::class);
    }
}
