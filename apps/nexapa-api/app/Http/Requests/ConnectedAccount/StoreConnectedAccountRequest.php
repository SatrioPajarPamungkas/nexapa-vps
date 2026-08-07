<?php

namespace App\Http\Requests\ConnectedAccount;

use App\Enums\ConnectedAccountPlatform;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreConnectedAccountRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Merge the platform route parameter into validated request data.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'platform' => $this->route('platform'),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'platform' => ['required', Rule::enum(ConnectedAccountPlatform::class)],
            'redirect_uri' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'mode' => ['sometimes', 'nullable', 'in:upload_as_draft,direct_post'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'platform.enum' => 'Invalid platform. Supported: tiktok, facebook.',
            'redirect_uri.url' => 'Redirect URI must be a valid URL.',
        ];
    }
}
