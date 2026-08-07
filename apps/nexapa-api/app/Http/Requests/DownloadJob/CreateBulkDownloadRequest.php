<?php

namespace App\Http\Requests\DownloadJob;

use Illuminate\Foundation\Http\FormRequest;

class CreateBulkDownloadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'parent_job_id' => ['required', 'exists:download_jobs,id'],
            'selection_type' => ['sometimes', 'string', 'in:all,selected,completed,failed'],
            'retry_failed' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'parent_job_id.required' => 'Parent job ID is required.',
            'parent_job_id.exists' => 'Parent job not found.',
            'selection_type.in' => 'Selection type must be one of: all, selected, completed, failed.',
        ];
    }
}