<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ConnectedAccount extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'platform',
        'account_type',
        'parent_connected_account_id',
        'external_account_id',
        'display_name',
        'username',
        'avatar_url',
        'status',
        'connection_method',
        'is_default',
        'is_publishable',
        'last_validated_at',
        'metadata',
        'scopes',
        'access_token_encrypted',
        'refresh_token_encrypted',
        'token_expires_at',
        'refresh_token_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'is_publishable' => 'boolean',
            'last_validated_at' => 'datetime',
            'token_expires_at' => 'datetime',
            'refresh_token_expires_at' => 'datetime',
            'metadata' => 'array',
            'scopes' => 'array',
            'access_token_encrypted' => 'encrypted',
            'refresh_token_encrypted' => 'encrypted',
        ];
    }

    protected $hidden = [
        'access_token_encrypted',
        'refresh_token_encrypted',
        'parent_connected_account_id',
    ];

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(ConnectedAccount::class, 'parent_connected_account_id');
    }

    public function children(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(ConnectedAccount::class, 'parent_connected_account_id');
    }

    public function posts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\PublisherPost::class, 'connected_account_id');
    }

    /**
     * Scope to get default account for a platform.
     */
    public function scopeDefaultForPlatform($query, string $platform)
    {
        return $query->where('platform', $platform)->where('is_default', true);
    }

    /**
     * Scope to filter by account type.
     */
    public function scopeOfType($query, string $accountType)
    {
        return $query->where('account_type', $accountType);
    }

    /**
     * Scope to get parent accounts (no parent).
     */
    public function scopeParents($query)
    {
        return $query->whereNull('parent_connected_account_id');
    }

    /**
     * Scope to get child accounts (has parent).
     */
    public function scopeChildren($query)
    {
        return $query->whereNotNull('parent_connected_account_id');
    }

    /**
     * Check if this is a Facebook admin account.
     */
    public function isFacebookAdmin(): bool
    {
        return $this->platform === 'facebook' && $this->account_type === 'facebook_admin';
    }

    /**
     * Check if this is a Facebook Page.
     */
    public function isFacebookPage(): bool
    {
        return $this->platform === 'facebook' && $this->account_type === 'facebook_page';
    }

    /**
     * Check if this account is selectable for publishing.
     */
    public function isSelectableForPublishing(): bool
    {
        if ($this->platform === 'facebook') {
            return $this->isFacebookPage() && $this->status === 'connected';
        }
        
        return $this->status === 'connected';
    }

    /**
     * Check if this account needs token refresh.
     */
    public function needsTokenRefresh(): bool
    {
        if (!$this->token_expires_at) {
            return false;
        }

        return $this->token_expires_at->subMinutes(5)->isPast();
    }
}
