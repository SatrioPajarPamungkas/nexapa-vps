<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Provisioning\CrmWorkspaceProvisioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class InternalCrmLoginController extends Controller
{
    public function __construct(
        private readonly CrmWorkspaceProvisioningService
            $workspaceProvisioning
    ) {}

    public function store(Request $request): JsonResponse
    {
        $configuredKey = trim((string) config(
            'services.nexapa_internal.crm_auth_key'
        ));

        $providedKey = trim((string) $request->header(
            'X-Nexapa-Crm-Auth-Key'
        ));

        if (
            $configuredKey === '' ||
            $providedKey === '' ||
            ! hash_equals($configuredKey, $providedKey)
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized internal request.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $validated = $request->validate([
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
            ],
            'password' => [
                'required',
                'string',
                'max:4096',
            ],
        ]);

        $email = Str::lower(
            Str::trim($validated['email'])
        );

        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (
            ! $user ||
            ! Hash::check(
                $validated['password'],
                $user->password
            )
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ((bool) ($user->is_suspended ?? false)) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Akun sedang disuspend. Hubungi administrator.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (! $user->hasVerifiedEmail()) {
            return response()->json([
                'success' => false,
                'message' =>
                    'Verifikasi email terlebih dahulu.',
                'code' => 'email_not_verified',
            ], Response::HTTP_FORBIDDEN);
        }

        try {
            $mapping =
                $this->workspaceProvisioning
                    ->ensureForUser($user);
        } catch (Throwable $exception) {
            Log::error(
                'CRM workspace provisioning during login failed.',
                [
                    'publisher_user_id' => $user->id,
                    'exception' => $exception::class,
                    'message' => $exception->getMessage(),
                ]
            );

            return response()->json([
                'success' => false,
                'message' =>
                    'Akun CRM belum dapat disiapkan. Silakan coba kembali.',
                'code' =>
                    'crm_provisioning_failed',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $crmUserId = trim(
            (string) $mapping->crm_user_id
        );

        if ($crmUserId === '') {
            return response()->json([
                'success' => false,
                'message' =>
                    'Pemetaan akun CRM tidak valid.',
                'code' =>
                    'crm_account_missing',
            ], Response::HTTP_CONFLICT);
        }

        $supabaseUrl = rtrim(
            trim((string) config(
                'services.crm_supabase.url'
            )),
            '/'
        );

        $serviceRoleKey = trim((string) config(
            'services.crm_supabase.service_role_key'
        ));

        if (
            $supabaseUrl === '' ||
            $serviceRoleKey === ''
        ) {
            Log::error(
                'CRM shared login configuration is incomplete.'
            );

            return response()->json([
                'success' => false,
                'message' =>
                    'Layanan login CRM belum tersedia.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $supabaseResponse = Http::withHeaders([
                'apikey' => $serviceRoleKey,
            ])
            ->withToken($serviceRoleKey)
            ->acceptJson()
            ->timeout(max(
                1,
                (int) config(
                    'services.crm_supabase.timeout',
                    10
                )
            ))
            ->post(
                $supabaseUrl .
                '/auth/v1/admin/generate_link',
                [
                    'type' => 'magiclink',
                    'email' => $email,
                ]
            );

        if (! $supabaseResponse->successful()) {
            Log::warning(
                'Supabase CRM login-link generation failed.',
                [
                    'status' =>
                        $supabaseResponse->status(),
                    'publisher_user_id' => $user->id,
                    'crm_user_id' => $crmUserId,
                ]
            );

            return response()->json([
                'success' => false,
                'message' =>
                    'Gagal membuat sesi CRM.',
            ], Response::HTTP_BAD_GATEWAY);
        }

        $payload = $supabaseResponse->json();

        $tokenHash = is_array($payload)
            ? (
                data_get($payload, 'properties.hashed_token')
                ?? ($payload['hashed_token'] ?? null)
            )
            : null;

        $generatedCrmUserId = is_array($payload)
            ? (
                data_get($payload, 'user.id')
                ?? data_get($payload, 'properties.user.id')
            )
            : null;

        if (
            ! is_string($tokenHash) ||
            trim($tokenHash) === ''
        ) {
            Log::error(
                'Supabase CRM login response has no token hash.',
                [
                    'publisher_user_id' => $user->id,
                    'crm_user_id' => $crmUserId,
                ]
            );

            return response()->json([
                'success' => false,
                'message' =>
                    'Respons autentikasi CRM tidak valid.',
            ], Response::HTTP_BAD_GATEWAY);
        }

        if (
            is_string($generatedCrmUserId) &&
            $generatedCrmUserId !== '' &&
            ! hash_equals(
                $crmUserId,
                $generatedCrmUserId
            )
        ) {
            Log::error(
                'CRM shared login user mapping mismatch.',
                [
                    'publisher_user_id' => $user->id,
                    'expected_crm_user_id' => $crmUserId,
                    'generated_crm_user_id' =>
                        $generatedCrmUserId,
                ]
            );

            return response()->json([
                'success' => false,
                'message' =>
                    'Pemetaan akun CRM tidak sesuai.',
            ], Response::HTTP_CONFLICT);
        }

        return response()->json([
            'success' => true,
            'token_hash' => $tokenHash,
            'crm_user_id' => $crmUserId,
        ]);
    }
}
