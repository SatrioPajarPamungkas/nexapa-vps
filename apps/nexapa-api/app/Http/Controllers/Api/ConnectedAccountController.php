<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConnectedAccount\SetDefaultRequest;
use App\Http\Requests\ConnectedAccount\StoreConnectedAccountRequest;
use App\Http\Resources\ConnectedAccountResource;
use App\Models\ConnectedAccount;
use App\Services\ConnectedAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConnectedAccountController extends Controller
{
    public function __construct(
        private readonly ConnectedAccountService $service,
    ) {}

    /**
     * List all connected accounts for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Check if pagination is requested
        $perPage = $request->input('per_page', 25);
        $page = $request->input('page', 1);
        $hasPagination = $request->has('per_page') || $request->has('page');

        // Build query
        $query = ConnectedAccount::where('user_id', $user?->id);

        // Default: exclude facebook_page from Connected Accounts view
        // facebook_page accounts are only shown when explicitly requested for Publisher
        if (!$request->has('account_type') && !$request->has('parent_connected_account_id')) {
            $query->where(function ($q) {
                $q->whereNull('account_type')
                  ->orWhere('account_type', '!=', 'facebook_page');
            });
        }

        // Apply filters
        if ($request->filled('platform')) {
            $query->where('platform', $request->input('platform'));
        }

        if ($request->filled('account_type')) {
            $query->where('account_type', $request->input('account_type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->input('is_publishable') !== null) {
            $query->where('is_publishable', filter_var($request->input('is_publishable'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('parent_connected_account_id')) {
            $query->where('parent_connected_account_id', $request->input('parent_connected_account_id'));
        }

        // Apply search
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('display_name', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%")
                  ->orWhere('external_account_id', 'like', "%{$search}%");
            });
        }

        if ($hasPagination) {
            // Paginated response
            $perPage = min(max((int) $perPage, 1), 100); // Limit between 1-100
            $page = max((int) $page, 1);

            $accounts = $query->orderBy('is_default', 'desc')
                ->orderBy('display_name', 'asc')
                ->paginate($perPage, ['*'], 'page', $page);

            // Inject service dependencies to check configuration
            $tiktokConfigured = app(\App\Services\OAuth\TikTokOAuthService::class)->isConfigured();
            $facebookConfigured = app(\App\Services\OAuth\FacebookOAuthService::class)->isConfigured();

            return response()->json([
                'success' => true,
                'message' => 'Connected accounts retrieved.',
                'data' => ConnectedAccountResource::collection($accounts),
                'pagination' => [
                    'current_page' => $accounts->currentPage(),
                    'last_page' => $accounts->lastPage(),
                    'per_page' => $accounts->perPage(),
                    'total' => $accounts->total(),
                    'from' => $accounts->firstItem(),
                    'to' => $accounts->lastItem(),
                ],
                'availability' => [
                    'tiktok_configured' => $tiktokConfigured,
                    'facebook_configured' => $facebookConfigured,
                ],
            ])->withHeaders($this->noStoreHeaders());
        }

        // Legacy response (no pagination)
        $accounts = $query->orderBy('platform')
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        // Inject service dependencies to check configuration
        $tiktokConfigured = app(\App\Services\OAuth\TikTokOAuthService::class)->isConfigured();
        $facebookConfigured = app(\App\Services\OAuth\FacebookOAuthService::class)->isConfigured();

        return response()->json([
            'success' => true,
            'message' => 'Connected accounts retrieved.',
            'data' => ConnectedAccountResource::collection($accounts),
            'availability' => [
                'tiktok_configured' => $tiktokConfigured,
                'facebook_configured' => $facebookConfigured,
            ],
        ])->withHeaders($this->noStoreHeaders());
    }

    /**
     * Initiate connection for a platform.
     */
    public function connect(StoreConnectedAccountRequest $request, string $platform): JsonResponse
    {
        $user = $request->user();
        $mode = $request->input('mode', 'upload_as_draft');

        try {
            $result = $this->service->initiateConnection($platform, $user?->id, $request->input('redirect_uri'), $mode);

            return response()->json([
                'success' => true,
                'message' => 'Connection initiated.',
                'data' => $result,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\RuntimeException $e) {
            // Check if it's a configuration issue
            if ($e->getCode() === 503) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 503);
            }

            return response()->json([
                'success' => false,
                'message' => 'OAuth configuration not available. Please configure credentials in Settings.',
            ], 503);
        }
    }

    /**
     * Initiate reconnection for an existing account.
     */
    public function reconnect(Request $request, string $accountId): JsonResponse
    {
        $user = $request->user();
        $returnTo = $request->input('return_to', '/accounts');

        try {
            $account = \App\Models\ConnectedAccount::where('id', $accountId)
                ->where('user_id', $user?->id)
                ->first();

            if (!$account) {
                throw new \InvalidArgumentException('Account not found or access denied.');
            }

            if ($account->platform === 'tiktok') {
                $result = $this->service->initiateReconnect($accountId, $user?->id, $returnTo);
            } elseif ($account->platform === 'facebook') {
                if ($account->account_type !== 'facebook_admin') {
                    throw new \InvalidArgumentException('Reconnection is only available for Facebook admin accounts.');
                }
                $result = $this->service->initiateFacebookReconnect($accountId, $user?->id, $returnTo);
            } else {
                throw new \InvalidArgumentException('Reconnection not supported for this platform.');
            }

            return response()->json([
                'success' => true,
                'message' => 'Reconnection initiated.',
                'data' => $result,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        } catch (\RuntimeException $e) {
            // Check if it's a configuration issue
            if ($e->getCode() === 503) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 503);
            }

            return response()->json([
                'success' => false,
                'message' => 'OAuth configuration not available. Please configure credentials in Settings.',
            ], 503);
        }
    }

    /**
     * Refresh account validation status.
     */
    public function refresh(Request $request, string $accountId): JsonResponse
    {
        $user = $request->user();

        try {
            $account = $this->service->refreshAccount($accountId, $user?->id);

            return response()->json([
                'success' => true,
                'message' => 'Account refreshed.',
                'data' => new ConnectedAccountResource($account),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found.',
            ], 404);
        } catch (\RuntimeException $e) {
            // Check if it's a configuration issue
            if ($e->getCode() === 503) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 503);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to refresh account: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Set account as default for its platform.
     */
    public function setDefault(SetDefaultRequest $request, string $accountId): JsonResponse
    {
        $user = $request->user();

        try {
            $account = $this->service->setDefault($accountId, $request->input('platform'), $user?->id);

            return response()->json([
                'success' => true,
                'message' => 'Default account updated.',
                'data' => new ConnectedAccountResource($account),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found.',
            ], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Remove/disconnect an account.
     */
    public function destroy(Request $request, string $accountId): JsonResponse
    {
        $user = $request->user();

        try {
            $this->service->removeAccount($accountId, $user?->id);

            return response()->json([
                'success' => true,
                'message' => 'Account permanently removed.',
            ])->withHeaders($this->noStoreHeaders());
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found.',
            ], 404);
        }
    }
    /**
     * Prevent browsers and intermediary caches from retaining account data.
     *
     * @return array<string, string>
     */
    private function noStoreHeaders(): array
    {
        return [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, private',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ];
    }

}
