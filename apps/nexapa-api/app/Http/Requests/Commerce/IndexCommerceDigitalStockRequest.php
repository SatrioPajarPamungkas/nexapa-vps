<?php

namespace App\Http\Requests\Commerce;

use App\Models\CommerceDigitalStockItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexCommerceDigitalStockRequest extends FormRequest
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
                    CommerceDigitalStockItem::STATUS_AVAILABLE,
                    CommerceDigitalStockItem::STATUS_RESERVED,
                    CommerceDigitalStockItem::STATUS_SOLD,
                    CommerceDigitalStockItem::STATUS_DELIVERED,
                    CommerceDigitalStockItem::STATUS_DOWNLOADED,
                    CommerceDigitalStockItem::STATUS_INVALID,
                    CommerceDigitalStockItem::STATUS_DISABLED,
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
