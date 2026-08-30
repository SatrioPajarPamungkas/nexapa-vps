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
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'email_verified_at', 'google_id', 'google_avatar_url', 'is_suspended', 'suspended_at'])]
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

    public function collections(): HasMany
    {
        return $this->hasMany(Collection::class);
    }
}
