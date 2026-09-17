<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmAccount;
use App\Models\SubscriptionOrder;
use App\Models\SubscriptionPlan;
use App\Services\SubscriptionPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class SubscriptionCheckoutController extends Controller
{
    public function __construct(
        private readonly SubscriptionPaymentService $payments,
    ) {}

    public function plans(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product' => [
                'required',
                Rule::in(['publisher', 'crm']),
            ],
        ]);

        $plans = SubscriptionPlan::query()
            ->where('product', $data['product'])
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (SubscriptionPlan $plan) => [
                'code' => $plan->code,
                'name' => $plan->name,
                'description' => $plan->description,
                'monthly_price' =>
                    (int) $plan->monthly_price,
                'monthly_final_price' =>
                    $plan->finalPriceFor('monthly'),
                'yearly_price' =>
                    (int) $plan->yearly_price,
                'yearly_final_price' =>
                    $plan->finalPriceFor('yearly'),
                'limits' => $plan->limits,
            ])
            ->values();

        return response()->json(['data' => $plans]);
    }

    public function publisherCheckout(
        Request $request,
    ): JsonResponse {
        $data = $this->checkoutData($request);

        $order = $this->payments->createPublisher(
            $request->user(),
            $data['plan_code'],
            $data['billing_cycle'],
        );

        return response()->json([
            'success' => true,
            'data' => $this->serialize($order),
        ], 201);
    }

    public function publisherOrder(
        Request $request,
        SubscriptionOrder $subscriptionOrder,
    ): JsonResponse {
        abort_unless(
            $subscriptionOrder->product === 'publisher'
            && (int) $subscriptionOrder->publisher_user_id
                === (int) $request->user()->getKey(),
            404
        );

        return response()->json([
            'data' => $this->serialize(
                $subscriptionOrder
            ),
        ]);
    }

    public function crmCheckout(
        Request $request,
    ): JsonResponse {
        $this->authorizeInternal($request);

        $data = [
            ...$this->checkoutData($request),
            ...$request->validate([
                'crm_user_id' => ['required', 'uuid'],
            ]),
        ];

        $account = CrmAccount::query()
            ->where('crm_user_id', $data['crm_user_id'])
            ->where('access_status', 'active')
            ->firstOrFail();

        $order = $this->payments->createCrm(
            $account,
            $data['plan_code'],
            $data['billing_cycle'],
        );

        return response()->json([
            'success' => true,
            'data' => $this->serialize($order),
        ], 201);
    }

    public function crmOrder(
        Request $request,
        SubscriptionOrder $subscriptionOrder,
    ): JsonResponse {
        $this->authorizeInternal($request);

        $data = $request->validate([
            'crm_user_id' => ['required', 'uuid'],
        ]);

        abort_unless(
            $subscriptionOrder->product === 'crm'
            && hash_equals(
                (string) $subscriptionOrder->crm_user_id,
                (string) $data['crm_user_id'],
            ),
            404
        );

        return response()->json([
            'data' => $this->serialize(
                $subscriptionOrder
            ),
        ]);
    }

    private function checkoutData(Request $request): array
    {
        return $request->validate([
            'plan_code' => [
                'required',
                'string',
                'max:100',
            ],
            'billing_cycle' => [
                'required',
                Rule::in(['monthly', 'yearly']),
            ],
        ]);
    }

    private function authorizeInternal(
        Request $request,
    ): void {
        $configured = trim(
            (string) config(
                'services.nexapa_internal.entitlement_key'
            )
        );

        $provided = trim(
            (string) $request->header(
                'X-Nexapa-Entitlement-Key'
            )
        );

        abort_if(
            $configured === ''
            || $provided === ''
            || ! hash_equals($configured, $provided),
            Response::HTTP_UNAUTHORIZED,
            'Unauthorized internal request.'
        );
    }

    private function serialize(
        SubscriptionOrder $order,
    ): array {
        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'product' => $order->product,
            'plan' => [
                'code' => $order->plan_code,
                'name' => $order->plan_name,
                'billing_cycle' =>
                    $order->billing_cycle,
            ],
            'currency' => $order->currency,
            'base_price' => $order->base_price,
            'discount_amount' =>
                $order->discount_amount,
            'total_amount' => $order->total_amount,
            'status' => $order->status,
            'payment_status' =>
                $order->payment_status,
            'redirect_url' => $order->redirect_url,
            'expires_at' =>
                $order->expires_at?->toIso8601String(),
            'paid_at' =>
                $order->paid_at?->toIso8601String(),
        ];
    }
}
