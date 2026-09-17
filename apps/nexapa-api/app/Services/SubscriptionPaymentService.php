<?php

namespace App\Services;

use App\Models\CrmAccount;
use App\Models\Subscription;
use App\Models\SubscriptionOrder;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use UnexpectedValueException;

class SubscriptionPaymentService
{
    public function __construct(
        private readonly PlatformSubscriptionService $subscriptions,
    ) {}

    public function createPublisher(
        User $user,
        string $planCode,
        string $billingCycle,
    ): SubscriptionOrder {
        return $this->create(
            product: 'publisher',
            planCode: $planCode,
            billingCycle: $billingCycle,
            customerName: $user->name,
            customerEmail: $user->email,
            publisherUserId: (int) $user->getKey(),
        );
    }

    public function createCrm(
        CrmAccount $account,
        string $planCode,
        string $billingCycle,
    ): SubscriptionOrder {
        return $this->create(
            product: 'crm',
            planCode: $planCode,
            billingCycle: $billingCycle,
            customerName:
                $account->name
                ?? $account->account_name
                ?? $account->email,
            customerEmail: $account->email,
            customerPhone: $account->phone ?? null,
            crmUserId: $account->crm_user_id,
            crmAccountId: $account->crm_account_id,
        );
    }

    private function create(
        string $product,
        string $planCode,
        string $billingCycle,
        string $customerName,
        string $customerEmail,
        ?string $customerPhone = null,
        ?int $publisherUserId = null,
        ?string $crmUserId = null,
        ?string $crmAccountId = null,
    ): SubscriptionOrder {
        if (! in_array(
            $billingCycle,
            ['monthly', 'yearly'],
            true,
        )) {
            throw ValidationException::withMessages([
                'billing_cycle' =>
                    'Periode pembayaran tidak valid.',
            ]);
        }

        $plan = SubscriptionPlan::query()
            ->where('product', $product)
            ->where('code', $planCode)
            ->where('is_active', true)
            ->first();

        if ($plan === null) {
            throw ValidationException::withMessages([
                'plan_code' =>
                    'Paket tidak tersedia.',
            ]);
        }

        $existing = SubscriptionOrder::query()
            ->where('product', $product)
            ->where('subscription_plan_id', $plan->getKey())
            ->where('billing_cycle', $billingCycle)
            ->where('payment_status', 'pending')
            ->where('expires_at', '>', now())
            ->when(
                $product === 'publisher',
                fn ($query) => $query->where(
                    'publisher_user_id',
                    $publisherUserId,
                ),
                fn ($query) => $query->where(
                    'crm_user_id',
                    $crmUserId,
                ),
            )
            ->latest('id')
            ->first();

        if (
            $existing !== null
            && filled($existing->redirect_url)
        ) {
            return $existing;
        }

        $basePrice = $plan->priceFor($billingCycle);
        $totalAmount = $plan->finalPriceFor($billingCycle);

        if ($totalAmount < 1) {
            throw ValidationException::withMessages([
                'plan_code' =>
                    'Harga paket harus lebih besar dari nol.',
            ]);
        }

        $order = SubscriptionOrder::query()->create([
            'order_number' => $this->orderNumber(),
            'product' => $product,
            'subscription_plan_id' => $plan->getKey(),
            'publisher_user_id' => $publisherUserId,
            'crm_user_id' => $crmUserId,
            'crm_account_id' => $crmAccountId,
            'customer_name' => trim($customerName),
            'customer_email' =>
                Str::lower(trim($customerEmail)),
            'customer_phone' => $customerPhone,
            'plan_code' => $plan->code,
            'plan_name' => $plan->name,
            'billing_cycle' => $billingCycle,
            'currency' => 'IDR',
            'base_price' => $basePrice,
            'discount_amount' =>
                max(0, $basePrice - $totalAmount),
            'total_amount' => $totalAmount,
            'status' => 'payment_pending',
            'payment_status' => 'pending',
            'expires_at' => now()->addMinutes(
                (int) config(
                    'commerce.checkout_expiry_minutes',
                    15,
                ),
            ),
        ]);

        try {
            $transaction = $this->createMidtransTransaction(
                $order
            );

            $order->forceFill([
                'snap_token' => $transaction['token'],
                'redirect_url' =>
                    $transaction['redirect_url'],
            ])->save();
        } catch (\Throwable $exception) {
            $order->forceFill([
                'status' => 'failed',
                'payment_status' => 'failed',
                'cancelled_at' => now(),
            ])->save();

            throw $exception;
        }

        return $order->fresh();
    }

    private function createMidtransTransaction(
        SubscriptionOrder $order,
    ): array {
        $finishUrl = $order->product === 'crm'
            ? 'https://crm.nexapa.app/subscription-required'
            : 'https://app.nexapa.app/profile';

        $separator = str_contains($finishUrl, '?')
            ? '&'
            : '?';

        $payload = [
            'transaction_details' => [
                'order_id' => $order->order_number,
                'gross_amount' => (int) $order->total_amount,
            ],
            'item_details' => [[
                'id' =>
                    $order->product
                    . '-'
                    . $order->plan_code
                    . '-'
                    . $order->billing_cycle,
                'price' => (int) $order->total_amount,
                'quantity' => 1,
                'name' => Str::limit(
                    $order->plan_name
                    . ' '
                    . ucfirst($order->product)
                    . ' '
                    . ucfirst($order->billing_cycle),
                    50,
                    '',
                ),
            ]],
            'customer_details' => [
                'first_name' => $order->customer_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
            ],
            'expiry' => [
                'start_time' =>
                    now()->format('Y-m-d H:i:s O'),
                'unit' => 'minutes',
                'duration' => (int) config(
                    'commerce.checkout_expiry_minutes',
                    15,
                ),
            ],
            'callbacks' => [
                'finish' =>
                    $finishUrl
                    . $separator
                    . 'subscription_order='
                    . $order->id,
            ],
        ];

        $client = $this->client();
        $notificationUrl = trim((string) config(
            'commerce.midtrans.subscription_notification_url'
        ));

        if ($notificationUrl !== '') {
            $client = $client->withHeaders([
                'X-Override-Notification' => $notificationUrl,
            ]);
        }

        $response = $client->post(
            rtrim(
                (string) config(
                    'commerce.midtrans.snap_url'
                ),
                '/',
            ) . '/transactions',
            $payload,
        );

        if ($response->failed()) {
            throw new RuntimeException(
                'Midtrans gagal membuat pembayaran paket: '
                . Str::limit($response->body(), 500)
            );
        }

        $result = $response->json();

        if (
            ! is_array($result)
            || empty($result['token'])
            || empty($result['redirect_url'])
        ) {
            throw new RuntimeException(
                'Respons pembayaran Midtrans tidak lengkap.'
            );
        }

        return [
            'token' => (string) $result['token'],
            'redirect_url' =>
                (string) $result['redirect_url'],
        ];
    }

    /**
     * Reconcile an order against Midtrans's authenticated status API.
     * This safely recovers payments when a webhook was delayed or missed.
     */
    public function synchronize(
        SubscriptionOrder $order,
    ): SubscriptionOrder {
        $response = $this->client()
            ->retry(2, 300)
            ->get(
                rtrim(
                    (string) config(
                        'commerce.midtrans.api_url'
                    ),
                    '/',
                )
                . '/'
                . rawurlencode($order->order_number)
                . '/status'
            );

        if ($response->failed()) {
            throw new RuntimeException(
                'Midtrans gagal memeriksa pembayaran paket: '
                . Str::limit($response->body(), 500)
            );
        }

        $payload = $response->json();

        if (! is_array($payload)) {
            throw new RuntimeException(
                'Respons status pembayaran Midtrans tidak valid.'
            );
        }

        return $this->handleNotification($payload);
    }

    public function handleNotification(
        array $payload,
    ): SubscriptionOrder {
        return DB::transaction(
            function () use ($payload): SubscriptionOrder {
                $order = SubscriptionOrder::query()
                    ->where(
                        'order_number',
                        $payload['order_id'],
                    )
                    ->lockForUpdate()
                    ->firstOrFail();

                $grossAmount = (int) round(
                    (float) $payload['gross_amount']
                );

                if (
                    $grossAmount
                    !== (int) $order->total_amount
                ) {
                    throw new UnexpectedValueException(
                        'Nominal pembayaran paket tidak sesuai.'
                    );
                }

                $transactionStatus = Str::lower(
                    (string) $payload[
                        'transaction_status'
                    ]
                );

                $fraudStatus = Str::lower(
                    (string) (
                        $payload['fraud_status']
                        ?? ''
                    )
                );

                $order->forceFill([
                    'transaction_id' =>
                        $payload['transaction_id']
                        ?? $order->transaction_id,
                    'transaction_status' =>
                        $transactionStatus,
                    'payment_type' =>
                        $payload['payment_type']
                        ?? $order->payment_type,
                    'fraud_status' =>
                        $fraudStatus !== ''
                            ? $fraudStatus
                            : $order->fraud_status,
                    'raw_notification' => $payload,
                ])->save();

                if (
                    $this->isPaid(
                        $transactionStatus,
                        $fraudStatus,
                    )
                ) {
                    return $this->markPaid($order);
                }

                if (
                    in_array(
                        $transactionStatus,
                        ['deny', 'cancel'],
                        true,
                    )
                ) {
                    $order->forceFill([
                        'status' => 'cancelled',
                        'payment_status' => 'failed',
                        'cancelled_at' => now(),
                    ])->save();
                }

                if ($transactionStatus === 'expire') {
                    $order->forceFill([
                        'status' => 'expired',
                        'payment_status' => 'expired',
                        'cancelled_at' => now(),
                    ])->save();
                }

                if (
                    in_array(
                        $transactionStatus,
                        ['refund', 'partial_refund'],
                        true,
                    )
                ) {
                    $order->forceFill([
                        'status' => 'refunded',
                        'payment_status' => 'refunded',
                    ])->save();

                    if ($order->subscription_id) {
                        Subscription::query()
                            ->whereKey(
                                $order->subscription_id
                            )
                            ->where('status', 'active')
                            ->update([
                                'status' => 'cancelled',
                                'cancelled_at' => now(),
                                'updated_at' => now(),
                            ]);
                    }
                }

                return $order->fresh();
            }
        );
    }

    private function markPaid(
        SubscriptionOrder $order,
    ): SubscriptionOrder {
        if (
            $order->payment_status === 'paid'
            && $order->subscription_id !== null
        ) {
            return $order;
        }

        if ($order->product === 'publisher') {
            $user = User::query()
                ->whereKey($order->publisher_user_id)
                ->firstOrFail();

            $subscription =
                $this->subscriptions->activatePublisher(
                    $user,
                    $order->plan_code,
                    $order->billing_cycle,
                    $user,
                );
        } elseif ($order->product === 'crm') {
            $account = CrmAccount::query()
                ->where(
                    'crm_user_id',
                    $order->crm_user_id,
                )
                ->firstOrFail();

            $actor = User::query()
                ->where('is_admin', true)
                ->orderBy('id')
                ->first();

            if ($actor === null) {
                throw new ModelNotFoundException(
                    'Akun administrator aktivasi tidak ditemukan.'
                );
            }

            $subscription =
                $this->subscriptions->activateCrm(
                    $account,
                    $order->plan_code,
                    $order->billing_cycle,
                    $actor,
                );
        } else {
            throw new UnexpectedValueException(
                'Jenis produk langganan tidak valid.'
            );
        }

        $subscription->forceFill([
            'price_paid' => $order->total_amount,
        ])->save();

        $order->forceFill([
            'subscription_id' => $subscription->getKey(),
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => $order->paid_at ?? now(),
        ])->save();

        return $order->fresh();
    }

    private function isPaid(
        string $transactionStatus,
        string $fraudStatus,
    ): bool {
        if ($transactionStatus === 'settlement') {
            return true;
        }

        return $transactionStatus === 'capture'
            && $fraudStatus === 'accept';
    }

    private function orderNumber(): string
    {
        do {
            $number =
                'NXSUB-'
                . now()->format('YmdHis')
                . '-'
                . Str::upper(Str::random(8));
        } while (
            SubscriptionOrder::query()
                ->where('order_number', $number)
                ->exists()
        );

        return $number;
    }

    private function client(): PendingRequest
    {
        $serverKey = trim(
            (string) config(
                'commerce.midtrans.server_key'
            )
        );

        if ($serverKey === '') {
            throw new RuntimeException(
                'MIDTRANS_SERVER_KEY belum dikonfigurasi.'
            );
        }

        return Http::withBasicAuth($serverKey, '')
            ->acceptJson()
            ->asJson()
            ->connectTimeout(10)
            ->timeout(30);
    }
}
