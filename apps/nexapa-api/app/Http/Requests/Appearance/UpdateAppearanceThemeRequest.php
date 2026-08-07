<?php

namespace App\Http\Requests\Appearance;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAppearanceThemeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:120'],
            'preset_key' => ['nullable', 'string', 'max:120'],
            'background_type' => ['sometimes', 'string', 'in:static_image,builtin,animated_gradient'],
            'background_path' => ['nullable', 'string', 'max:500'],
            'background_position' => ['sometimes', 'string', 'in:center,top,bottom,left,right'],
            'background_size' => ['sometimes', 'string', 'in:cover,contain'],
            'background_attachment' => ['sometimes', 'string', 'in:fixed,scroll'],
            'card_opacity' => ['sometimes', 'integer', 'min:5', 'max:60'],
            'card_blur' => ['sometimes', 'integer', 'min:0', 'max:40'],
            'sidebar_opacity' => ['sometimes', 'integer', 'min:30', 'max:95'],
            'topbar_opacity' => ['sometimes', 'integer', 'min:0', 'max:80'],
            'overlay_opacity' => ['sometimes', 'integer', 'min:0', 'max:50'],
            'animation_speed' => ['sometimes', 'numeric', 'min:0.25', 'max:2'],
            'motion_intensity' => ['sometimes', 'integer', 'min:0', 'max:100'],
        ];
    }
}
