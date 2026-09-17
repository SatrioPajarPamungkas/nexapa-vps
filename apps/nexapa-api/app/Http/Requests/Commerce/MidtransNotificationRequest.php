<?php

namespace App\Http\Requests\Commerce;

use Illuminate\Foundation\Http\FormRequest;

class MidtransNotificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'order_id' => ['required', 'string', 'max:120'],
            'status_code' => ['required', 'string', 'max:10'],
            'gross_amount' => ['required', 'numeric', 'min:0'],
            'signature_key' => ['required', 'string', 'size:128'],
            'transaction_status' => [
                'required',
                'string',
                'max:40',
            ],
            'transaction_id' => ['nullable', 'string', 'max:190'],
            'payment_type' => ['nullable', 'string', 'max:80'],
            'fraud_status' => ['nullable', 'string', 'max:40'],
        ];
    }
}
