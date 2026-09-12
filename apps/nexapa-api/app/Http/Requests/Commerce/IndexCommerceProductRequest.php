<?php

namespace App\Http\Requests\Commerce;

use App\Models\CommerceProduct;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexCommerceProductRequest extends FormRequest
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
                    CommerceProduct::STATUS_DRAFT,
                    CommerceProduct::STATUS_ACTIVE,
                    CommerceProduct::STATUS_ARCHIVED,
                ]),
            ],
            'type' => ['nullable', 'string', 'max:80'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
