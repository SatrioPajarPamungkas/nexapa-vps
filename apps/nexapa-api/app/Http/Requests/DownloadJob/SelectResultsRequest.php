<?php

namespace App\Http\Requests\DownloadJob;

use Illuminate\Foundation\Http\FormRequest;

class SelectResultsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Brutal Download has no application-level item-count cap.
            'result_ids' => ['required_without:select_all', 'array'],
            'result_ids.*' => ['required_with:result_ids', 'string', 'distinct'],
            'select_all' => ['sometimes', 'boolean'],
        ];
    }
}
