<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmAccount;
use App\Services\ActivityLogService;
use App\Services\Provisioning\CrmProvisioningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class InternalCrmLoginController extends Controller
{
    public function __construct(
        private readonly CrmProvisioningService $crm,
        private readonly ActivityLogService $activityLog,
    ) {}

    public function store(Request $request): JsonResponse
    {
        if (! $this->hasValidInternalKey($request)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized internal request.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:4096'],
        ]);
        $email = Str::lower(Str::trim($data['email']));

        try {
            $identity = $this->crm->authenticateWithPassword(
                $email,
                $data['password'],
            );
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' => 'Layanan login CRM belum tersedia.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        if ($identity === null) {
            $this->audit('auth.crm_login_failed', $email, 'failed');

            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (! $identity['email_verified']) {
            return response()->json([
                'success' => false,
                'message' => 'Verifikasi email CRM terlebih dahulu.',
                'code' => 'email_not_verified',
            ], Response::HTTP_FORBIDDEN);
        }

        $profile = $this->crm->findProfileByUserId($identity['user_id']);
        $account = $this->crm->findAccountByOwnerUserId($identity['user_id']);
        $local = CrmAccount::query()->firstOrCreate(
            ['crm_user_id' => $identity['user_id']],
            [
                'crm_account_id' => $profile['account_id']
                    ?? ($account['account_id'] ?? null),
                'crm_profile_id' => $profile['profile_id'] ?? null,
                'name' => $account['name'] ?? $email,
                'email' => $email,
                'access_status' => 'active',
                'registered_at' => now(),
            ],
        );

        if ($local->access_status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Akses CRM tidak aktif.',
                'code' => 'crm_access_'.$local->access_status,
            ], Response::HTTP_FORBIDDEN);
        }

        try {
            $tokenHash = $this->crm->generateLoginToken(
                $email,
                $identity['user_id'],
            );
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat sesi CRM.',
            ], Response::HTTP_BAD_GATEWAY);
        }

        $this->audit('auth.crm_login_succeeded', $email);

        return response()->json([
            'success' => true,
            'token_hash' => $tokenHash,
            'crm_user_id' => $identity['user_id'],
        ]);
    }

    private function hasValidInternalKey(Request $request): bool
    {
        $configured = trim((string) config(
            'services.nexapa_internal.crm_auth_key',
        ));
        $provided = trim((string) $request->header(
            'X-Nexapa-Crm-Auth-Key',
        ));

        return $configured !== ''
            && $provided !== ''
            && hash_equals($configured, $provided);
    }

    private function audit(
        string $action,
        string $email,
        string $status = 'success',
    ): void {
        $this->activityLog->log([
            'category' => 'authentication',
            'action' => $action,
            'title' => $action === 'auth.crm_login_succeeded'
                ? 'Login CRM berhasil.'
                : 'Percobaan login CRM gagal.',
            'status' => $status,
            'product' => 'crm',
            'metadata' => ['email_hash' => hash('sha256', $email)],
        ]);
    }
}
