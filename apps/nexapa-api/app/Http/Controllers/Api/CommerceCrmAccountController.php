<?php

namespace App\Http\Controllers\Api;

use App\Data\Crm\CrmUserData;
use App\Http\Controllers\Controller;
use App\Models\CrmAccount;
use App\Services\CommerceCrmAccountService;
use App\Services\Crm\CrmUserDirectoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CommerceCrmAccountController extends Controller
{
    public function __construct(
        private readonly CrmUserDirectoryService $directory,
        private readonly CommerceCrmAccountService $accounts,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'suspended', 'archived', 'unmanaged'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);
        $page = (int) ($data['page'] ?? 1);
        $perPage = (int) ($data['per_page'] ?? 25);
        $search = Str::lower(trim((string) ($data['search'] ?? '')));
        $locals = CrmAccount::query()->get()->keyBy('crm_user_id');
        $rows = $this->loadAllUsers()
            ->map(fn (CrmUserData $crm) => $this->serialize(
                $crm,
                $locals->get($crm->id),
            ))
            ->when($search !== '', fn (Collection $rows) => $rows->filter(
                fn (array $row) => str_contains(
                    Str::lower(implode(' ', [
                        $row['name'],
                        $row['email'],
                        $row['account_name'] ?? '',
                    ])),
                    $search,
                ),
            ))
            ->when(filled($data['status'] ?? null), fn (Collection $rows) =>
                $rows->where('crm_access_status', $data['status']))
            ->values();
        $total = $rows->count();

        return response()->json([
            'data' => $rows->forPage($page, $perPage)->values(),
            'meta' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('crm_accounts', 'email')],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'email_verified' => ['sometimes', 'boolean'],
            'workspace_name' => ['required', 'string', 'max:255'],
            'plan_code' => ['required', 'string', 'max:100'],
            'billing_cycle' => ['required', Rule::in(['monthly', 'yearly'])],
        ]);
        $account = $this->accounts->create($data, $request->user());
        $crm = $this->directory->findUser($account->crm_user_id);

        return response()->json([
            'success' => true,
            'message' => 'Akun CRM berhasil dibuat.',
            'data' => $this->serialize($crm, $account),
        ], 201);
    }

    public function show(string $crmUserId): JsonResponse
    {
        $this->validateCrmId($crmUserId);
        $crm = $this->directory->findUser($crmUserId);

        return response()->json(['data' => $this->serialize(
            $crm,
            CrmAccount::query()->where('crm_user_id', $crmUserId)->first(),
        )]);
    }

    public function suspend(Request $request, string $crmUserId): JsonResponse
    {
        $this->validateCrmId($crmUserId);
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);
        $this->accounts->suspend($crmUserId, $data['reason'] ?? null, $request->user());

        return $this->mutationResponse($crmUserId, 'Akses CRM berhasil disuspend.');
    }

    public function activate(Request $request, string $crmUserId): JsonResponse
    {
        $this->validateCrmId($crmUserId);
        $this->accounts->activate($crmUserId, $request->user());

        return $this->mutationResponse($crmUserId, 'Akses CRM berhasil diaktifkan.');
    }

    public function destroy(Request $request, string $crmUserId): JsonResponse
    {
        $this->validateCrmId($crmUserId);
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);
        $this->accounts->archive($crmUserId, $data['reason'] ?? null, $request->user());

        return $this->mutationResponse($crmUserId, 'Akun CRM berhasil diarsipkan.');
    }

    public function forceDestroy(Request $request, string $crmUserId): JsonResponse
    {
        $this->validateCrmId($crmUserId);
        $account = CrmAccount::query()->where('crm_user_id', $crmUserId)->firstOrFail();
        $request->validate([
            'email_confirmation' => ['required', 'string', Rule::in([$account->email])],
        ]);
        $this->accounts->forceDelete($crmUserId, $request->user());

        return response()->json(['success' => true, 'message' => 'Akun dan data CRM dihapus permanen.']);
    }

    private function mutationResponse(string $crmUserId, string $message): JsonResponse
    {
        $crm = $this->directory->findUser($crmUserId);
        $local = CrmAccount::query()->where('crm_user_id', $crmUserId)->first();

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $this->serialize($crm, $local),
        ]);
    }

    private function serialize(CrmUserData $crm, ?CrmAccount $local): array
    {
        $ownerId = trim((string) config('services.nexapa_internal.owner_crm_user_id'));

        return [
            ...$crm->toArray(),
            'crm_access_status' => $local?->access_status ?? 'unmanaged',
            'mapping_status' => $local ? 'managed' : 'unmanaged',
            'crm_suspended_at' => $local?->suspended_at?->toIso8601String(),
            'crm_suspension_reason' => $local?->suspension_reason,
            'manageable' => $local !== null && ($ownerId === '' || ! hash_equals($ownerId, $crm->id)),
        ];
    }

    private function loadAllUsers(): Collection
    {
        $page = 1;
        $users = collect();
        do {
            $result = $this->directory->listUsers(page: $page, perPage: 100);
            $batch = collect($result['users']);
            $users = $users->concat($batch);
            $page++;
        } while ($batch->isNotEmpty() && $users->count() < (int) $result['total']);

        return $users->unique(fn (CrmUserData $user) => $user->id)->values();
    }

    private function validateCrmId(string $crmUserId): void
    {
        abort_unless(Str::isUuid($crmUserId), 404, 'User CRM tidak ditemukan.');
    }
}
