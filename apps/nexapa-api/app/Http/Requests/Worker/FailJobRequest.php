<?php

namespace App\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

class FailJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'error_code' => ['required', 'string', 'max:100'],
            'error_message' => ['required', 'string', 'max:500'],
            'retryable' => ['sometimes', 'boolean'],
        ];
    }
}
