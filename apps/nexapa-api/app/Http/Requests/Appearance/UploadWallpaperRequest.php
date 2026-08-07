<?php

namespace App\Http\Requests\Appearance;

use Illuminate\Foundation\Http\FormRequest;

class UploadWallpaperRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:15360',
                'mimetypes:image/jpeg,image/png,image/webp,image/avif',
                'extensions:jpg,jpeg,png,webp,avif',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Select an image file to upload.',
            'file.file' => 'The uploaded file must be a valid file.',
            'file.max' => 'Wallpaper must not exceed 15 MB.',
            'file.mimetypes' => 'Only JPG, PNG, WebP, and AVIF images are allowed.',
            'file.extensions' => 'Only .jpg, .jpeg, .png, .webp, .avif extensions are allowed.',
        ];
    }
}
