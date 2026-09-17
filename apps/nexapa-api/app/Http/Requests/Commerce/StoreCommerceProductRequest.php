<?php

namespace App\Http\Requests\Commerce;

use App\Models\CommerceProduct;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommerceProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'slug' => ['nullable', 'string', 'max:180', 'alpha_dash:ascii', 'unique:commerce_products,slug'],
            'description' => ['nullable', 'string', 'max:10000'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'image_alt' => ['nullable', 'string', 'max:160'],
            'type' => ['required', 'string', 'max:80'],
            'price_amount' => ['required', 'integer', 'min:0'],
            'discount_price_amount' => [
                'nullable',
                'integer',
                'min:0',
                'lt:price_amount',
            ],
            'variants' => ['sometimes', 'array', 'max:50'],
            'variants.*.id' => ['nullable', 'uuid'],
            'variants.*.name' => ['required', 'string', 'max:120'],
            'variants.*.sku' => [
                'nullable',
                'string',
                'max:100',
                'distinct:ignore_case',
            ],
            'variants.*.price_amount' => [
                'required',
                'integer',
                'min:0',
            ],
            'variants.*.discount_price_amount' => [
                'nullable',
                'integer',
                'min:0',
                'lt:variants.*.price_amount',
            ],
            'variants.*.is_active' => ['required', 'boolean'],
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
        $variants = $this->input('variants');

        if (is_string($variants) && $variants !== '') {
            $decoded = json_decode($variants, true);

            if (json_last_error() === JSON_ERROR_NONE) {
                $this->merge(['variants' => $decoded]);
            }
        }

        $this->merge([
            'name' => trim((string) $this->input('name')),
            'slug' => $this->filled('slug') ? strtolower(trim((string) $this->input('slug'))) : null,
            'type' => trim((string) $this->input('type')),
            'currency' => strtoupper((string) $this->input('currency', 'IDR')),
        ]);
    }
}
