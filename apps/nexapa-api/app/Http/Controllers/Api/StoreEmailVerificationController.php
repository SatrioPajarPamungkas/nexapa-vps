<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommerceCustomer;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StoreEmailVerificationController extends Controller
{
    public function verify(
        Request $request,
        int $id,
        string $hash,
    ): JsonResponse {
        if (! $request->hasValidSignature()) {
            return response()->json([
                'success' => false,
                'message' => 'Tautan verifikasi tidak valid atau kedaluwarsa.',
            ], Response::HTTP_FORBIDDEN);
        }

        $customer = CommerceCustomer::query()->find($id);

        if ($customer === null) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Commerce tidak ditemukan.',
            ], Response::HTTP_NOT_FOUND);
        }

        if (! hash_equals(
            sha1($customer->getEmailForVerification()),
            $hash,
        )) {
            return response()->json([
                'success' => false,
                'message' => 'Hash verifikasi tidak valid.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (! $customer->hasVerifiedEmail()) {
            $customer->markEmailAsVerified();
            event(new Verified($customer));
        }

        return response()->json([
            'success' => true,
            'message' => 'Email Commerce berhasil diverifikasi.',
        ]);
    }

    public function resend(Request $request): JsonResponse
    {
        /** @var CommerceCustomer $customer */
        $customer = $request->user();

        if ($customer->hasVerifiedEmail()) {
            return response()->json([
                'success' => true,
                'message' => 'Email sudah diverifikasi.',
            ]);
        }

        $customer->sendEmailVerificationNotification();

        return response()->json([
            'success' => true,
            'message' => 'Email verifikasi Commerce dikirim.',
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'email_verified' =>
                    $request->user()->hasVerifiedEmail(),
            ],
        ]);
    }
}
