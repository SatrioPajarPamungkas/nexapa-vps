<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class InternalCrmAuditController extends Controller
{
    private const ACTIONS = [
        'whatsapp.connection_saved',
        'whatsapp.connection_selected',
        'whatsapp.connection_deleted',
    ];

    public function __construct(
        private readonly ActivityLogService $activityLog
    ) {}

    public function store(Request $request): JsonResponse
    {
        $configuredKey = trim((string) config('services.nexapa_internal.crm_auth_key'));
        $providedKey = trim((string) $request->header('X-Nexapa-Crm-Auth-Key'));

        if ($configuredKey === '' || $providedKey === '' || ! hash_equals($configuredKey, $providedKey)) {
            return response()->json(['success' => false], Response::HTTP_UNAUTHORIZED);
        }

        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'action' => ['required', Rule::in(self::ACTIONS)],
            'title' => ['required', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['success', 'failed', 'blocked'])],
            'subject_id' => ['nullable', 'string', 'max:255'],
            'ip_address' => ['nullable', 'ip'],
            'user_agent' => ['nullable', 'string', 'max:1000'],
            'metadata' => ['sometimes', 'array'],
        ]);

        $email = Str::lower(Str::trim($data['email']));
        $user = User::withTrashed()->whereRaw('LOWER(email) = ?', [$email])->first();

        $log = $this->activityLog->log([
            'user' => $user,
            'actor_name' => $data['name'] ?? $user?->name,
            'actor_email' => $email,
            'category' => 'whatsapp',
            'action' => $data['action'],
            'title' => $data['title'],
            'status' => $data['status'] ?? 'success',
            'subject_type' => 'whatsapp_connection',
            'subject_id' => $data['subject_id'] ?? null,
            'product' => 'crm',
            'ip_address' => $data['ip_address'] ?? null,
            'user_agent' => $data['user_agent'] ?? null,
            'metadata' => $data['metadata'] ?? [],
        ]);

        return response()->json(['success' => $log !== null], $log ? 201 : 500);
    }
}
