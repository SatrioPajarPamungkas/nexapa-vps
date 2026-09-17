<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommerceChatAttachment extends Model
{
    use HasUuids;

    protected $fillable = [
        'commerce_chat_message_id', 'disk', 'path', 'original_name',
        'mime_type', 'size_bytes',
    ];

    protected function casts(): array
    {
        return ['size_bytes' => 'integer'];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(CommerceChatMessage::class, 'commerce_chat_message_id');
    }
}
