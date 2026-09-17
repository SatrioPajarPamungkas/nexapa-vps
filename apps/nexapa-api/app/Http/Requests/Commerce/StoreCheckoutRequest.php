<?php

namespace App\Http\Requests\Commerce;

use Illuminate\Foundation\Http\FormRequest;

class StoreCheckoutRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $items = collect($this->input('items', []))
            ->map(function ($item): array {
                $item = is_array($item) ? $item : [];

                if (($item['variant_id'] ?? null) === '') {
                    $item['variant_id'] = null;
                }

                return $item;
            })
            ->all();

        $this->merge(['items' => $items]);
    }

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'checkout_token' => ['required', 'uuid'],
            'customer_phone' => ['nullable', 'string', 'max:40'],
            'items' => ['required', 'array', 'min:1', 'max:20'],
            'items.*.product_id' => ['required', 'uuid'],
            'items.*.variant_id' => ['nullable', 'uuid'],
            'items.*.quantity' => [
                'required',
                'integer',
                'min:1',
                'max:100',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'checkout_token.required' =>
                'Token checkout wajib tersedia.',
            'checkout_token.uuid' =>
                'Token checkout tidak valid.',
            'items.required' =>
                'Keranjang belanja masih kosong.',
            'items.max' =>
                'Maksimal 20 jenis produk per checkout.',
            'items.*.product_id.required' =>
                'Produk checkout tidak valid.',
            'items.*.quantity.min' =>
                'Jumlah produk minimal 1.',
            'items.*.quantity.max' =>
                'Jumlah produk maksimal 100.',
        ];
    }
}
