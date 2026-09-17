<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CommercePublisherAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommercePublisherAccountController extends Controller
{
    public function __construct(
        private readonly CommercePublisherAccountService $accounts,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => [
                'nullable',
                Rule::in(['active', 'suspended', 'archived']),
            ],
            'per_page' => [
                'nullable',
                'integer',
                'min:10',
                'max:100',
            ],
        ]);

        $search = trim((string) ($data['search'] ?? ''));

        $accounts = User::query()
            ->where('is_admin', false)
            ->where(
                'publisher_access_status',
                '!=',
                'not_provisioned',
            )
            ->when(
                $search !== '',
                fn ($query) => $query->where(
                    fn ($query) => $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere(
                            'email',
                            'like',
                            "%{$search}%",
                        ),
                ),
            )
            ->when(
                filled($data['status'] ?? null),
                fn ($query) => $query->where(
                    'publisher_access_status',
                    $data['status'],
                ),
            )
            ->with([
                'latestSubscription',
            ])
            ->withCount([
                'connectedAccounts',
                'publisherPosts',
            ])
            ->latest('id')
            ->paginate((int) ($data['per_page'] ?? 25))
            ->withQueryString();

        return response()->json([
            'data' => collect($accounts->items())
                ->map(fn (User $user) =>
                    $this->serialize($user))
                ->values(),
            'meta' => [
                'current_page' =>
                    $accounts->currentPage(),
                'last_page' => $accounts->lastPage(),
                'per_page' => $accounts->perPage(),
                'total' => $accounts->total(),
            ],
        ]);
    }

    public function show(User $publisherUser): JsonResponse
    {
        $publisherUser->load([
            'latestSubscription',
        ])->loadCount([
            'connectedAccounts',
            'publisherPosts',
        ]);

        return response()->json([
            'data' => $this->serialize($publisherUser),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'email_verified' => ['sometimes', 'boolean'],
            'plan_code' => ['required', 'string', 'max:100'],
            'billing_cycle' => ['required', Rule::in(['monthly', 'yearly'])],
        ]);
        $user = $this->accounts->create($data, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Akun Publisher berhasil dibuat.',
            'data' => $this->serialize($user),
        ], 201);
    }

    public function suspend(
        Request $request,
        User $publisherUser,
    ): JsonResponse {
        $data = $request->validate([
            'reason' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $user = $this->accounts->suspend(
            $publisherUser,
            $data['reason'] ?? null,
            $request->user(),
        );

        return response()->json([
            'success' => true,
            'message' =>
                'Akses Publisher berhasil disuspend.',
            'data' => $this->serialize($user),
        ]);
    }

    public function activate(
        Request $request,
        User $publisherUser,
    ): JsonResponse {
        $user = $this->accounts->activate(
            $publisherUser,
            $request->user(),
        );

        return response()->json([
            'success' => true,
            'message' =>
                'Akses Publisher berhasil diaktifkan.',
            'data' => $this->serialize($user),
        ]);
    }

    public function destroy(
        Request $request,
        User $publisherUser,
    ): JsonResponse {
        $data = $request->validate([
            'reason' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $user = $this->accounts->archive(
            $publisherUser,
            $data['reason'] ?? null,
            $request->user(),
        );

        return response()->json([
            'success' => true,
            'message' =>
                'Akun Publisher berhasil diarsipkan.',
            'data' => $this->serialize($user),
        ]);
    }

    public function forceDestroy(
        Request $request,
        User $publisherUser,
    ): JsonResponse {
        $request->validate([
            'email_confirmation' => [
                'required',
                'string',
                Rule::in([$publisherUser->email]),
            ],
        ]);
        $this->accounts->forceDelete($publisherUser, $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Akun dan data Publisher dihapus permanen.',
        ]);
    }

    private function serialize(User $user): array
    {
        $subscription = $user->latestSubscription;

        return [
            'id' => $user->getKey(),
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'email_verified' =>
                $user->email_verified_at !== null,
            'publisher_status' =>
                $user->publisher_access_status
                    ?? 'active',
            'publisher_suspended_at' =>
                $user->publisher_suspended_at
                    ?->toIso8601String(),
            'publisher_suspension_reason' =>
                $user->publisher_suspension_reason,
            'connected_accounts_count' =>
                (int) (
                    $user->connected_accounts_count
                    ?? 0
                ),
            'publisher_posts_count' =>
                (int) (
                    $user->publisher_posts_count
                    ?? 0
                ),
            'subscription' =>
                $subscription === null
                    ? null
                    : [
                        'plan' =>
                            $subscription->plan_code,
                        'status' =>
                            $subscription->status,
                        'expires_at' =>
                            $subscription->expires_at
                                ?->toIso8601String(),
                    ],
            'created_at' =>
                $user->created_at?->toIso8601String(),
            'updated_at' =>
                $user->updated_at?->toIso8601String(),
        ];
    }
}
