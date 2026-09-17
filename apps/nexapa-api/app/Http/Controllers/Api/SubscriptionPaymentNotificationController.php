<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Commerce\MidtransSnapService;
use App\Services\SubscriptionPaymentService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;
use UnexpectedValueException;

class SubscriptionPaymentNotificationController extends Controller
{
    public function store(
        Request $request,
        MidtransSnapService $midtrans,
        SubscriptionPaymentService $payments,
    ): JsonResponse {
        $payload = $request->validate([
            'order_id' => ['required', 'string', 'max:100'],
            'status_code' => ['required', 'string', 'max:10'],
            'gross_amount' => ['required', 'numeric'],
            'signature_key' => ['required', 'string'],
            'transaction_status' => [
                'required',
                'string',
                'max:50',
            ],
            'transaction_id' => [
                'nullable',
                'string',
                'max:100',
            ],
            'payment_type' => [
                'nullable',
                'string',
                'max:100',
            ],
            'fraud_status' => [
                'nullable',
                'string',
                'max:50',
            ],
        ]);

        if (! $midtrans->signatureIsValid($payload)) {
            return response()->json([
                'message' => 'Signature notifikasi tidak valid.',
            ], 401);
        }

        try {
            $order = $payments->handleNotification($payload);
        } catch (UnexpectedValueException $exception) {
            report($exception);

            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        } catch (ModelNotFoundException $exception) {
            report($exception);

            return response()->json([
                'message' =>
                    'Pesanan langganan tidak ditemukan.',
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
                    'Notifikasi langganan gagal diproses.',
            ], 500);
        }

        return response()->json([
            'message' => 'Notifikasi langganan diterima.',
            'data' => [
                'order_number' => $order->order_number,
                'product' => $order->product,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
            ],
        ]);
    }
}
