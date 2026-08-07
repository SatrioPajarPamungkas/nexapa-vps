<?php

namespace App\Http\Requests\DownloadJob;

use App\Enums\DownloadMode;
use App\Enums\DownloadOutputFormat;
use App\Enums\DownloadQuality;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDownloadJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $maxUrls = config('nexapa.max_download_urls_per_request', 50);

        return [
            'mode' => ['required', Rule::enum(DownloadMode::class)],
            'urls' => ['required', 'array', "min:1", "max:{$maxUrls}"],
            'urls.*' => ['required', 'string', 'url', 'max:2048'],
            'output_format' => ['sometimes', Rule::enum(DownloadOutputFormat::class)],
            'quality' => ['sometimes', Rule::enum(DownloadQuality::class)],
            'filename_mode' => ['sometimes', 'string', Rule::in(['original', 'platform_date', 'safe_generated'])],
            'delay_seconds' => ['sometimes', 'integer', 'min:0', 'max:300'],
            'max_retries' => ['sometimes', 'integer', 'min:0', 'max:10'],
        ];
    }

    public function messages(): array
    {
        return [
            'urls.max' => 'Maximum :max URLs allowed per request.',
            'urls.*.url' => 'URL :index is not a valid URL.',
        ];
    }
}
