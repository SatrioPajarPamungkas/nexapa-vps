<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UploadMediaAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $maxKilobytes = max(1, (int) config('nexapa.publisher_max_upload_mb', 500)) * 1024;
        $isImage = $this->input('expected_media_kind') === 'image';

        return [
            'expected_media_kind' => ['required', Rule::in(['image', 'video'])],
            'file' => [
                'required',
                'file',
                $isImage
                    ? 'mimetypes:image/jpeg,image/png,image/webp'
                    : 'mimetypes:video/mp4,video/quicktime,video/webm',
                $isImage ? 'extensions:jpg,jpeg,png,webp' : 'extensions:mp4,mov,webm',
                'max:'.$maxKilobytes,
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'expected_media_kind.required' => 'Select whether the upload is an image or video.',
            'expected_media_kind.in' => 'The expected media kind must be image or video.',
            'file.required' => 'Select a supported media file to upload.',
            'file.file' => 'The uploaded media must be a file.',
            'file.mimetypes' => $this->input('expected_media_kind') === 'image'
                ? 'The selected file must be a JPG, JPEG, PNG, or WebP image.'
                : 'The selected file must be an MP4, MOV, or WebM video.',
            'file.extensions' => $this->input('expected_media_kind') === 'image'
                ? 'The selected image must use a .jpg, .jpeg, .png, or .webp extension.'
                : 'The selected video must use a .mp4, .mov, or .webm extension.',
            'file.max' => 'The selected file exceeds the maximum upload size of '.config('nexapa.publisher_max_upload_mb', 500).' MB.',
        ];
    }
}
