<?php

namespace App\Http\Requests\Commerce;

use App\Models\CommerceProduct;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCommerceProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'slug' => [
                'nullable',
                'string',
                'max:180',
                'alpha_dash:ascii',
                Rule::unique('commerce_products', 'slug')->ignore($this->route('product')),
            ],
            'description' => ['nullable', 'string', 'max:10000'],
            'type' => ['required', 'string', 'max:80'],
            'price_amount' => ['required', 'integer', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'status' => [
                'required',
                Rule::in([
                    CommerceProduct::STATUS_DRAFT,
                    CommerceProduct::STATUS_ACTIVE,
                    CommerceProduct::STATUS_ARCHIVED,
                ]),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'slug' => $this->filled('slug') ? strtolower(trim((string) $this->input('slug'))) : null,
            'type' => trim((string) $this->input('type')),
            'currency' => strtoupper((string) $this->input('currency', 'IDR')),
        ]);
    }
}
