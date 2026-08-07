<?php

namespace App\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

class ClaimJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'worker_id' => ['required', 'string', 'max:100'],
            'capabilities' => ['sometimes', 'array'],
            'capabilities.platforms' => ['sometimes', 'array'],
            'capabilities.platforms.*' => ['string', 'in:tiktok,facebook,instagram,youtube,generic'],
            'capabilities.modes' => ['sometimes', 'array'],
            'capabilities.modes.*' => ['string', 'in:single,multiple,profile'],
            'capabilities.job_kinds' => ['sometimes', 'array'],
            'capabilities.job_kinds.*' => ['string'], // Allow any string, validation will be done in service
        ];
    }
}
