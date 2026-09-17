<?php

namespace App\Services\Commerce;

use App\Models\CommerceOrder;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class MidtransSnapService
{
    public function createTransaction(CommerceOrder $order): array
    {
        $order->loadMissing('items');

        $payload = [
            'transaction_details' => [
                'order_id' => $order->order_number,
                'gross_amount' => (int) $order->total_amount,
            ],
            'item_details' => $this->itemDetails($order),
            'customer_details' => [
                'first_name' => $order->customer_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
            ],
            'expiry' => [
                'start_time' => now()->format('Y-m-d H:i:s O'),
                'unit' => 'minutes',
                'duration' => (int) config(
                    'commerce.checkout_expiry_minutes',
                    15,
                ),
            ],
            'callbacks' => [
                'finish' => config('commerce.storefront_url')
                    . '/orders/' . $order->id,
            ],
        ];

        $response = $this->client()->post(
            rtrim((string) config('commerce.midtrans.snap_url'), '/')
                . '/transactions',
            $payload,
        );

        if ($response->failed()) {
            throw new RuntimeException(
                'Midtrans gagal membuat transaksi: '
                . Str::limit($response->body(), 500),
            );
        }

        $result = $response->json();

        if (
            ! is_array($result)
            || empty($result['token'])
            || empty($result['redirect_url'])
        ) {
            throw new RuntimeException(
                'Respons transaksi Midtrans tidak lengkap.',
            );
        }

        return [
            'token' => (string) $result['token'],
            'redirect_url' => (string) $result['redirect_url'],
            'payload' => $payload,
        ];
    }

    public function transactionStatus(string $providerOrderId): array
    {
        $url = rtrim((string) config('commerce.midtrans.api_url'), '/')
            . '/'
            . rawurlencode($providerOrderId)
            . '/status';

        $response = $this->client(true)->get($url);

        if ($response->failed()) {
            throw new RuntimeException(
                'Midtrans gagal memeriksa transaksi: '
                . Str::limit($response->body(), 500),
            );
        }

        $result = $response->json();

        if (! is_array($result)) {
            throw new RuntimeException(
                'Respons status Midtrans tidak valid.',
            );
        }

        return $result;
    }

    public function signatureIsValid(array $notification): bool
    {
        $signature = (string) ($notification['signature_key'] ?? '');

        if ($signature === '') {
            return false;
        }

        $expected = hash(
            'sha512',
            (string) ($notification['order_id'] ?? '')
                . (string) ($notification['status_code'] ?? '')
                . (string) ($notification['gross_amount'] ?? '')
                . $this->serverKey(),
        );

        return hash_equals($expected, strtolower($signature));
    }

    private function itemDetails(CommerceOrder $order): array
    {
        $items = $order->items
            ->map(fn ($item): array => [
                'id' => (string) ($item->sku ?: $item->product_id),
                'price' => (int) $item->unit_price_amount,
                'quantity' => (int) $item->quantity,
                'name' => Str::limit(
                    trim(
                        $item->product_name
                        . ($item->variant_name
                            ? ' - ' . $item->variant_name
                            : ''),
                    ),
                    50,
                    '',
                ),
            ])
            ->values()
            ->all();

        $itemTotal = collect($items)->sum(
            fn (array $item): int =>
                $item['price'] * $item['quantity'],
        );

        if ($itemTotal !== (int) $order->total_amount) {
            return [[
                'id' => $order->order_number,
                'price' => (int) $order->total_amount,
                'quantity' => 1,
                'name' => Str::limit(
                    'Pesanan Nexapa ' . $order->order_number,
                    50,
                    '',
                ),
            ]];
        }

        return $items;
    }

    private function client(bool $retry = false): PendingRequest
    {
        $request = Http::withBasicAuth($this->serverKey(), '')
            ->acceptJson()
            ->asJson()
            ->connectTimeout(10)
            ->timeout(30);

        return $retry
            ? $request->retry(2, 300)
            : $request;
    }

    private function serverKey(): string
    {
        $serverKey = trim(
            (string) config('commerce.midtrans.server_key'),
        );

        if ($serverKey === '') {
            throw new RuntimeException(
                'MIDTRANS_SERVER_KEY belum dikonfigurasi.',
            );
        }

        return $serverKey;
    }
}
