<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * In-memory, read-only model used only to render remote CRM rows in Filament.
 */
class CrmUserRecord extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $hidden = [
        'password',
        'access_token',
        'refresh_token',
        'service_role_key',
        'user_metadata',
        'app_metadata',
    ];

    protected function casts(): array
    {
        return [
            'email_verified' => 'boolean',
            'whatsapp_configured' => 'boolean',
            'is_account_owner' => 'boolean',
            'summary' => 'array',
            'email_confirmed_at' => 'datetime',
            'last_sign_in_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'presence_last_seen_at' => 'datetime',
            'whatsapp_connected_at' => 'datetime',
            'whatsapp_registered_at' => 'datetime',
        ];
    }

    public static function fromArray(array $attributes): self
    {
        $record = new self($attributes);
        $record->exists = true;

        return $record;
    }

    public function save(array $options = []): bool
    {
        return false;
    }

    public function delete(): ?bool
    {
        return false;
    }
}
