<?php

namespace App\Http\Requests\Commerce;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommerceDigitalFileRequest extends FormRequest
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
            'label' => ['nullable', 'string', 'max:160'],
            'file' => ['required', 'file', 'max:102400'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Pilih file digital yang akan diunggah.',
            'file.max' => 'Ukuran file digital maksimal 100 MB.',
            'commerce_product_id.required' => 'Pilih produk untuk file digital.',
            'commerce_product_variant_id.exists' =>
                'Varian tidak valid atau bukan milik produk yang dipilih.',
        ];
    }
}
