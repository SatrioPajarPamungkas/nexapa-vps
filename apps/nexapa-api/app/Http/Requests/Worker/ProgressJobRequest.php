<?php

namespace App\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProgressJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'progress' => ['required', 'integer', 'min:0', 'max:100'],
            'stage' => ['sometimes', 'string', Rule::in(['analyzing', 'extracting', 'downloading', 'processing', 'saving'])],
            'message' => ['sometimes', 'string', 'max:500'],
        ];
    }
}
