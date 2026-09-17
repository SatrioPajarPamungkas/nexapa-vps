<?php

namespace App\Http\Requests\Commerce;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ImportCommerceDigitalStockRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->input('commerce_product_variant_id') === '') {
            $this->merge(['commerce_product_variant_id' => null]);
        }
    }

    public function authorize(): bool
    {
        return $this->user()?->isAdmin() === true;
    }

    public function rules(): array
    {
        return [
            'commerce_product_id' => [
                'required',
                'uuid',
                Rule::exists('commerce_products', 'id'),
            ],
            'commerce_product_variant_id' => [
                'nullable',
                'uuid',
                Rule::exists('commerce_product_variants', 'id')
                    ->where(fn ($query) => $query->where(
                        'commerce_product_id',
                        $this->input('commerce_product_id'),
                    )),
            ],
            'file' => ['required', 'file', 'max:10240'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Pilih CSV atau TXT stok digital.',
            'file.max' => 'Ukuran file impor maksimal 10 MB.',
            'commerce_product_id.required' =>
                'Pilih produk tujuan impor.',
            'commerce_product_variant_id.exists' =>
                'Varian tidak valid atau bukan milik produk.',
        ];
    }
}
