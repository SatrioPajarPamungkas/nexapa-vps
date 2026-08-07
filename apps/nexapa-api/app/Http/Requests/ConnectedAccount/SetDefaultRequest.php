<?php

namespace App\Http\Requests\ConnectedAccount;

use Illuminate\Foundation\Http\FormRequest;

class SetDefaultRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'platform' => ['required', 'string', 'in:tiktok,facebook'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'platform.required' => 'Platform is required.',
            'platform.in' => 'Invalid platform. Supported: tiktok, facebook.',
        ];
    }
}