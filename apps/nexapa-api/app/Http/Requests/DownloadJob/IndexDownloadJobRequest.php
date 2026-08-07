<?php

namespace App\Http\Requests\DownloadJob;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexDownloadJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', Rule::in(['queued', 'analyzing', 'awaiting_selection', 'ready', 'claimed', 'processing', 'completed', 'partially_completed', 'failed', 'cancelled'])],
            'platform' => ['sometimes', 'string', Rule::in(['tiktok', 'facebook', 'instagram', 'youtube', 'generic'])],
            'mode' => ['sometimes', 'string', Rule::in(['single', 'multiple', 'profile'])],
            'source_type' => ['sometimes', 'string', Rule::in(['video', 'post', 'profile', 'channel', 'playlist', 'collection', 'unknown'])],
            'output_format' => ['sometimes', 'string', Rule::in(['original', 'mp4', 'audio'])],
            'created_from' => ['sometimes', 'date'],
            'created_to' => ['sometimes', 'date'],
            'sort' => ['sometimes', 'string', Rule::in(['created_at', '-created_at', 'status', '-status'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}

