<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommerceCustomer;
use App\Models\CommerceOrder;
use App\Services\CommerceCustomerAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CommerceCustomerAccountController extends Controller
{
    public function __construct(
        private readonly CommerceCustomerAccountService $accounts,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => [
                'nullable',
                Rule::in(['active', 'suspended', 'archived']),
            ],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $search = trim((string) ($data['search'] ?? ''));
        $customers = CommerceCustomer::query()
            ->when(
                $search !== '',
                fn ($query) => $query->where(
                    fn ($query) => $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"),
                ),
            )
            ->when(
                filled($data['status'] ?? null),
                fn ($query) => $query->where(
                    'access_status',
                    $data['status'],
                ),
            )
            ->with('latestOrder')
            ->withCount([
                'orders',
                'orders as paid_orders_count' =>
                    fn ($query) => $query->where(
                        'payment_status',
                        CommerceOrder::PAYMENT_PAID,
                    ),
            ])
            ->withSum([
                'orders as total_spent_amount' =>
                    fn ($query) => $query->where(
                        'payment_status',
                        CommerceOrder::PAYMENT_PAID,
                    ),
            ], 'total_amount')
            ->latest('id')
            ->paginate((int) ($data['per_page'] ?? 25))
            ->withQueryString();

        return response()->json([
            'data' => collect($customers->items())
                ->map(fn (CommerceCustomer $customer): array =>
                    $this->serialize($customer))
                ->values(),
            'meta' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:commerce_customers,email',
            ],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'email_verified' => ['sometimes', 'boolean'],
        ]);

        $customer = $this->accounts->create(
            $data,
            $request->user(),
        );
        $this->loadAccount($customer);

        return response()->json([
            'success' => true,
            'message' => 'Akun Commerce berhasil dibuat.',
            'data' => $this->serialize($customer),
        ], 201);
    }

    public function show(CommerceCustomer $commerceUser): JsonResponse
    {
        $this->loadAccount($commerceUser);

        return response()->json([
            'data' => $this->serialize($commerceUser),
        ]);
    }

    public function suspend(
        Request $request,
        CommerceCustomer $commerceUser,
    ): JsonResponse {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $customer = $this->accounts->suspend(
            $commerceUser,
            $data['reason'] ?? null,
            $request->user(),
        );
        $this->loadAccount($customer);

        return response()->json([
            'success' => true,
            'message' => 'Akun Commerce berhasil disuspend.',
            'data' => $this->serialize($customer),
        ]);
    }

    public function activate(
        Request $request,
        CommerceCustomer $commerceUser,
    ): JsonResponse {
        $customer = $this->accounts->activate(
            $commerceUser,
            $request->user(),
        );
        $this->loadAccount($customer);

        return response()->json([
            'success' => true,
            'message' => 'Akun Commerce berhasil diaktifkan.',
            'data' => $this->serialize($customer),
        ]);
    }

    public function destroy(
        Request $request,
        CommerceCustomer $commerceUser,
    ): JsonResponse {
        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $customer = $this->accounts->archive(
            $commerceUser,
            $data['reason'] ?? null,
            $request->user(),
        );
        $this->loadAccount($customer);

        return response()->json([
            'success' => true,
            'message' => 'Akun Commerce berhasil diarsipkan.',
            'data' => $this->serialize($customer),
        ]);
    }

    public function forceDestroy(
        Request $request,
        CommerceCustomer $commerceUser,
    ): JsonResponse {
        $data = $request->validate([
            'email_confirmation' => [
                'required',
                'string',
                function (string $attribute, mixed $value, $fail) use (
                    $commerceUser,
                ): void {
                    if (strcasecmp(trim((string) $value), $commerceUser->email) !== 0) {
                        $fail('Konfirmasi email tidak sesuai.');
                    }
                },
            ],
        ]);

        $this->accounts->forceDelete(
            $commerceUser,
            $request->user(),
            $data['email_confirmation'],
        );

        return response()->json([
            'success' => true,
            'message' => 'Akun dan data Commerce dihapus permanen.',
        ]);
    }

    private function loadAccount(CommerceCustomer $customer): void
    {
        $customer->load('latestOrder')
            ->loadCount([
                'orders',
                'orders as paid_orders_count' =>
                    fn ($query) => $query->where(
                        'payment_status',
                        CommerceOrder::PAYMENT_PAID,
                    ),
            ])->loadSum([
                'orders as total_spent_amount' =>
                    fn ($query) => $query->where(
                        'payment_status',
                        CommerceOrder::PAYMENT_PAID,
                    ),
            ], 'total_amount');
    }

    private function serialize(CommerceCustomer $customer): array
    {
        $lastOrder = $customer->latestOrder;

        return [
            'id' => $customer->getKey(),
            'name' => $customer->name,
            'email' => $customer->email,
            'email_verified' => $customer->hasVerifiedEmail(),
            'commerce_status' => $customer->access_status,
            'commerce_registered_at' =>
                $customer->registered_at?->toIso8601String(),
            'commerce_suspended_at' =>
                $customer->suspended_at?->toIso8601String(),
            'commerce_suspension_reason' =>
                $customer->suspension_reason,
            'orders_count' => (int) ($customer->orders_count ?? 0),
            'paid_orders_count' =>
                (int) ($customer->paid_orders_count ?? 0),
            'total_spent_amount' =>
                (int) ($customer->total_spent_amount ?? 0),
            'last_order' => $lastOrder === null ? null : [
                'id' => $lastOrder->getKey(),
                'order_number' => $lastOrder->order_number,
                'status' => $lastOrder->status,
                'payment_status' => $lastOrder->payment_status,
                'total_amount' => (int) $lastOrder->total_amount,
                'created_at' => $lastOrder->created_at?->toIso8601String(),
            ],
            'created_at' => $customer->created_at?->toIso8601String(),
            'updated_at' => $customer->updated_at?->toIso8601String(),
        ];
    }
}
