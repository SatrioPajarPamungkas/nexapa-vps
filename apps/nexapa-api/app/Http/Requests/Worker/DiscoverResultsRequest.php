<?php

namespace App\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

class DiscoverResultsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'results' => ['required', 'array', 'min:1', 'max:100'],
            'results.*.external_id' => ['sometimes', 'string', 'max:255'],
            'results.*.title' => ['sometimes', 'string', 'max:500'],
            'results.*.source_url' => ['required', 'string', 'url', 'max:2048'],
            'results.*.thumbnail_url' => ['sometimes', 'nullable', 'string', 'url', 'max:2048'],
            'results.*.media_type' => ['sometimes', 'string', 'in:video,audio,image,gif,carousel,mixed,unknown'],
            'results.*.duration_seconds' => ['sometimes', 'integer', 'min:0'],
            'results.*.published_at' => ['sometimes', 'nullable', 'date'],
            'results.*.metadata' => ['sometimes', 'array'],
        ];
    }
}

