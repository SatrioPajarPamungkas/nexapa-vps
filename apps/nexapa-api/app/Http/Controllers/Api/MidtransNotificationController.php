<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commerce\MidtransNotificationRequest;
use App\Services\Commerce\MidtransNotificationService;
use App\Services\Commerce\MidtransSnapService;
use App\Services\SubscriptionPaymentService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;
use UnexpectedValueException;

class MidtransNotificationController extends Controller
{
    public function store(
        MidtransNotificationRequest $request,
        MidtransSnapService $midtrans,
        MidtransNotificationService $commerce,
        SubscriptionPaymentService $subscriptions,
    ): JsonResponse {
        $payload = $request->validated();

        try {
            if (! $midtrans->signatureIsValid($payload)) {
                return response()->json([
                    'message' =>
                        'Signature notifikasi tidak valid.',
                ], 401);
            }

            $isSubscription = Str::startsWith(
                (string) $payload['order_id'],
                'NXSUB-'
            );

            $order = $isSubscription
                ? $subscriptions->handleNotification($payload)
                : $commerce->handle($payload);
        } catch (UnexpectedValueException $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        } catch (ModelNotFoundException $exception) {
            report($exception);

            return response()->json([
                'message' =>
                    'Pesanan pembayaran tidak ditemukan.',
            ], 404);
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage(),
            ], 500);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' =>
                    'Notifikasi pembayaran gagal diproses.',
            ], 500);
        }

        return response()->json([
            'message' => 'Notifikasi pembayaran diterima.',
            'data' => [
                'order_number' => $order->order_number,
                'status' => $order->status,
                'payment_status' =>
                    $order->payment_status,
            ],
        ]);
    }
}
