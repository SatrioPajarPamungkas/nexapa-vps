<?php

namespace App\Http\Requests\DeveloperSettings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTikTokSettingsRequest extends FormRequest
{
    private bool $hasStoredSecret = false;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->hasStoredSecret = $this->boolean('has_stored_secret', false);
    }

    public function rules(): array
    {
        $secretRules = ['string', 'max:255'];
        
        if (!$this->hasStoredSecret) {
            $secretRules = array_merge(['required'], $secretRules);
        }

        return [
            'client_key' => ['required', 'string', 'max:255'],
            'client_secret' => $secretRules,
            'environment' => ['required', 'string', 'in:sandbox,production'],
        ];
    }

    public function messages(): array
    {
        return [
            'client_key.required' => 'Client Key is required',
            'client_secret.required' => 'Client Secret is required when no secret is currently stored',
            'environment.required' => 'Environment is required',
            'environment.in' => 'Environment must be either sandbox or production',
        ];
    }
}
