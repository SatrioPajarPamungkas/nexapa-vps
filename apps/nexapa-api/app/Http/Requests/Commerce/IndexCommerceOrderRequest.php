<?php

namespace App\Http\Requests\Commerce;

use App\Models\CommerceOrder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexCommerceOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:120'],
            'status' => [
                'nullable',
                Rule::in([
                    CommerceOrder::STATUS_PAYMENT_PENDING,
                    CommerceOrder::STATUS_PAID,
                    CommerceOrder::STATUS_PROCESSING,
                    CommerceOrder::STATUS_COMPLETED,
                    CommerceOrder::STATUS_CANCELLED,
                    CommerceOrder::STATUS_EXPIRED,
                    CommerceOrder::STATUS_REFUNDED,
                ]),
            ],
            'payment_status' => [
                'nullable',
                Rule::in([
                    CommerceOrder::PAYMENT_PENDING,
                    CommerceOrder::PAYMENT_PAID,
                    CommerceOrder::PAYMENT_FAILED,
                    CommerceOrder::PAYMENT_EXPIRED,
                    CommerceOrder::PAYMENT_REFUNDED,
                ]),
            ],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
