<?php

namespace App\Http\Requests\Commerce;

use App\Models\CommerceDigitalFile;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexCommerceDigitalFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:160'],
            'status' => [
                'nullable',
                Rule::in([
                    CommerceDigitalFile::STATUS_READY,
                    CommerceDigitalFile::STATUS_SOLD,
                    CommerceDigitalFile::STATUS_DELIVERED,
                    CommerceDigitalFile::STATUS_DOWNLOADED,
                    CommerceDigitalFile::STATUS_DISABLED,
                ]),
            ],
            'product_id' => [
                'nullable',
                'uuid',
                Rule::exists('commerce_products', 'id'),
            ],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
