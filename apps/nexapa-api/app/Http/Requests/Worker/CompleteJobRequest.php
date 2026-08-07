<?php

namespace App\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

class CompleteJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'temporary_outputs' => ['required', 'array', 'min:1'],
            'temporary_outputs.*.display_name' => ['required', 'string', 'max:255'],
            'temporary_outputs.*.original_name' => ['required', 'string', 'max:255'],
            'temporary_outputs.*.media_type' => ['required', 'string', 'in:video,audio,image,gif,unknown'],
            'temporary_outputs.*.mime_type' => ['sometimes', 'string', 'max:100'],
            'temporary_outputs.*.storage_disk' => ['sometimes', 'string', 'max:50'],
            'temporary_outputs.*.storage_path' => ['required', 'string', 'max:1000'],
            'temporary_outputs.*.public_url' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'temporary_outputs.*.thumbnail_path' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'temporary_outputs.*.file_size' => ['sometimes', 'integer', 'min:0'],
            'temporary_outputs.*.width' => ['sometimes', 'integer', 'min:0'],
            'temporary_outputs.*.height' => ['sometimes', 'integer', 'min:0'],
            'temporary_outputs.*.duration_seconds' => ['sometimes', 'integer', 'min:0'],
            'temporary_outputs.*.source_platform' => ['sometimes', 'string'],
            'temporary_outputs.*.source_url' => ['sometimes', 'string', 'url'],
            'temporary_outputs.*.metadata' => ['sometimes', 'array'],
            'progress' => ['sometimes', 'integer', 'min:0', 'max:100'],
        ];
    }
}
