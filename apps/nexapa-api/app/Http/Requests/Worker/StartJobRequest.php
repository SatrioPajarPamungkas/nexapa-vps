<?php

namespace App\Http\Requests\Worker;

use App\Enums\DownloadJobStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StartJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_stage' => ['sometimes', 'string', 'max:100'],
        ];
    }
}
