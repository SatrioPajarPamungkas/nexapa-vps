<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommerceCustomer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class StoreAuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:commerce_customers,email',
            ],
            'password' => ['required', 'confirmed', 'min:8', 'max:128'],
            'terms_accepted' => ['accepted'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $data = $validator->validated();
        $customer = CommerceCustomer::query()->create([
            'name' => trim($data['name']),
            'email' => Str::lower(Str::trim($data['email'])),
            'password' => $data['password'],
            'access_status' => 'active',
            'registered_at' => now(),
        ]);

        try {
            $customer->sendEmailVerificationNotification();
        } catch (Throwable $exception) {
            Log::warning('Commerce verification email failed.', [
                'commerce_customer_id' => $customer->getKey(),
                'exception' => $exception::class,
            ]);

            $customer->forceDelete();

            return response()->json([
                'success' => false,
                'message' =>
                    'Email verifikasi gagal dikirim. Coba kembali.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        if ($request->hasSession()) {
            Auth::guard('commerce')->login(
                $customer,
                (bool) ($data['remember'] ?? false),
            );
            $request->session()->regenerate();
        }

        return response()->json([
            'success' => true,
            'message' =>
                'Akun Commerce berhasil dibuat. Verifikasi email Anda.',
            'data' => ['user' => $this->serialize($customer)],
        ], Response::HTTP_CREATED);
    }

    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'max:4096'],
            'remember' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $data = $validator->validated();
        $credentials = [
            'email' => Str::lower(Str::trim($data['email'])),
            'password' => $data['password'],
        ];

        if (! Auth::guard('commerce')->attempt(
            $credentials,
            (bool) ($data['remember'] ?? false),
        )) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau kata sandi Commerce salah.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        /** @var CommerceCustomer $customer */
        $customer = Auth::guard('commerce')->user();

        if ($customer->access_status !== 'active') {
            Auth::guard('commerce')->logout();

            return response()->json([
                'success' => false,
                'message' => match ($customer->access_status) {
                    'suspended' => 'Akun Commerce sedang disuspend.',
                    'archived' => 'Akun Commerce telah diarsipkan.',
                    default => 'Akun Commerce tidak aktif.',
                },
                'code' => 'commerce_access_'.$customer->access_status,
            ], Response::HTTP_FORBIDDEN);
        }

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json([
            'success' => true,
            'message' => 'Login Commerce berhasil.',
            'data' => ['user' => $this->serialize($customer)],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var CommerceCustomer $customer */
        $customer = $request->user();

        if ($customer->access_status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Akun Commerce tidak aktif.',
            ], Response::HTTP_FORBIDDEN);
        }

        return response()->json([
            'success' => true,
            'data' => ['user' => $this->serialize($customer)],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('commerce')->logout();

        if ($request->hasSession()) {
            $request->session()->regenerateToken();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logout Commerce berhasil.',
        ]);
    }

    private function serialize(CommerceCustomer $customer): array
    {
        return [
            'id' => $customer->getKey(),
            'name' => $customer->name,
            'email' => $customer->email,
            'email_verified' => $customer->hasVerifiedEmail(),
        ];
    }
}
