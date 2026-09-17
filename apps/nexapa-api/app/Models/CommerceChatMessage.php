<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommerceChatMessage extends Model
{
    use HasUuids;

    protected $fillable = [
        'commerce_chat_conversation_id', 'sender_type', 'sender_id',
        'sender_name', 'body',
    ];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(CommerceChatConversation::class, 'commerce_chat_conversation_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(CommerceChatAttachment::class, 'commerce_chat_message_id');
    }
}
