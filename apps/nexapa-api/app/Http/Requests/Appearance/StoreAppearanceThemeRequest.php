<?php

namespace App\Http\Requests\Appearance;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppearanceThemeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'scope_type' => ['sometimes', 'string', 'in:user,company'],
            'scope_id' => ['nullable', 'integer'],
            'preset_key' => ['nullable', 'string', 'max:120'],
            'background_type' => ['required', 'string', 'in:static_image,builtin,animated_gradient'],
            'background_path' => ['nullable', 'string', 'max:500'],
            'background_position' => ['required', 'string', 'in:center,top,bottom,left,right'],
            'background_size' => ['required', 'string', 'in:cover,contain'],
            'background_attachment' => ['sometimes', 'string', 'in:fixed,scroll'],
            'card_opacity' => ['required', 'integer', 'min:5', 'max:60'],
            'card_blur' => ['required', 'integer', 'min:0', 'max:40'],
            'sidebar_opacity' => ['required', 'integer', 'min:30', 'max:95'],
            'topbar_opacity' => ['required', 'integer', 'min:0', 'max:80'],
            'overlay_opacity' => ['required', 'integer', 'min:0', 'max:50'],
            'animation_speed' => ['required', 'numeric', 'min:0.25', 'max:2'],
            'motion_intensity' => ['required', 'integer', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Theme name is required.',
            'background_type.in' => 'Invalid background type.',
            'card_opacity.min' => 'Card opacity must be between 5 and 60.',
            'card_opacity.max' => 'Card opacity must be between 5 and 60.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'scope_type' => $this->input('scope_type', 'user'),
        ]);
    }
}
