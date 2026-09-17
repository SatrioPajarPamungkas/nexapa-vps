<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CommerceChatConversation extends Model
{
    use HasUuids;

    protected $fillable = [
        'commerce_order_id', 'commerce_customer_id', 'status',
        'customer_last_read_at', 'admin_last_read_at', 'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'customer_last_read_at' => 'datetime',
            'admin_last_read_at' => 'datetime',
            'last_message_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(CommerceOrder::class, 'commerce_order_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(CommerceCustomer::class, 'commerce_customer_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(CommerceChatMessage::class, 'commerce_chat_conversation_id');
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(CommerceChatMessage::class, 'commerce_chat_conversation_id')->latestOfMany();
    }
}
