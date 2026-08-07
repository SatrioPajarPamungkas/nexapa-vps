<?php

namespace App\Http\Requests\DeveloperSettings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFacebookSettingsRequest extends FormRequest
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
        $secretRules = ['nullable', 'string', 'max:255'];
        
        if (!$this->hasStoredSecret) {
            $secretRules = array_merge(['required'], $secretRules);
        }

        return [
            'app_id' => ['required', 'string', 'max:255'],
            'app_secret' => $secretRules,
            'configuration_id' => ['nullable', 'string', 'max:255'],
            'graph_api_version' => ['required', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'app_id.required' => 'Facebook App ID is required',
            'app_secret.required' => 'Facebook App Secret is required when no secret is currently stored',
            'graph_api_version.required' => 'Graph API Version is required',
            'graph_api_version.max' => 'Graph API Version must not exceed 20 characters',
        ];
    }

    protected function passedValidation(): void
    {
        $version = $this->input('graph_api_version');
        
        if (!preg_match('/^v\d+(\.\d+)?$/', $version)) {
            $this->errors()->add(
                'graph_api_version',
                'Graph API Version must be in the format v followed by a number (e.g., v21.0 or v21).'
            );
        }
    }
}