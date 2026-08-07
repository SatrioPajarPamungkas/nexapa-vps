<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Appearance\StoreAppearanceThemeRequest;
use App\Http\Requests\Appearance\UpdateAppearanceThemeRequest;
use App\Http\Resources\AppearanceThemeResource;
use App\Models\AppearanceTheme;
use App\Services\AppearanceThemeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AppearanceThemeController extends Controller
{
    public function __construct(
        private AppearanceThemeService $themeService
    ) {}

    public function showCurrent(Request $request): JsonResponse
    {
        $user = $request->user();
        $active = $this->themeService->getActiveForUser($user);

        if ($active === null) {
            $data = $this->themeService->defaultResponseData(config('app.url'));
            return response()->json([
                'success' => true,
                'data' => [
                    'theme' => $data,
                    'is_default' => true,
                ],
            ]);
        }

        $data = $this->themeService->buildResponseData($active, config('app.url'));

        return response()->json([
            'success' => true,
            'data' => [
                'theme' => $data,
                'is_default' => false,
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $scope = $request->input('scope', 'user');

        if ($scope === 'company') {
            if (!$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only administrators can list company themes.',
                ], 403);
            }

            $themes = $this->themeService->listCompanyThemes();
            $baseUrl = config('app.url');

            $collection = $themes->map(function ($theme) use ($baseUrl) {
                return (new AppearanceThemeResource($theme))->withBaseUrl($baseUrl)->toArray(request());
            });

            $active = $themes->firstWhere('is_active', true);
            $activeData = $active
                ? $this->themeService->buildCompanyResponseData($active, $baseUrl)
                : $this->themeService->companyDefaultResponseData($baseUrl);

            return response()->json([
                'success' => true,
                'data' => [
                    'themes' => $collection->values(),
                    'active_theme' => $activeData,
                    'is_default' => $active === null,
                ],
            ]);
        }

        $themes = $this->themeService->listForUser($user);

        $baseUrl = config('app.url');

        $collection = $themes->map(function ($theme) use ($baseUrl) {
            return (new AppearanceThemeResource($theme))->withBaseUrl($baseUrl)->toArray(request());
        });

        $active = $themes->firstWhere('is_active', true);
        $activeData = $active
            ? $this->themeService->buildResponseData($active, config('app.url'))
            : $this->themeService->defaultResponseData(config('app.url'));

        return response()->json([
            'success' => true,
            'data' => [
                'themes' => $collection->values(),
                'active_theme' => $activeData,
                'is_default' => $active === null,
            ],
        ]);
    }

    public function store(StoreAppearanceThemeRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();
        $scopeType = $data['scope_type'] ?? 'user';

        if ($scopeType === 'company') {
            if (!$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only administrators can manage company themes.',
                ], 403);
            }

            try {
                $theme = $this->themeService->createCompanyTheme($user, $data);
                $resource = (new AppearanceThemeResource($theme))->withBaseUrl(config('app.url'));

                return $resource->response()->setStatusCode(201)->setData([
                    'success' => true,
                    'data' => [
                        'theme' => $resource->toArray($request),
                    ],
                ]);
            } catch (\Throwable $e) {
                report($e);
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        try {
            $theme = $this->themeService->createForUser($user, $data);

            $resource = (new AppearanceThemeResource($theme))
                ->withBaseUrl(config('app.url'));

            return $resource->response()->setStatusCode(201)->setData([
                'success' => true,
                'data' => [
                    'theme' => $resource->toArray($request),
                ],
            ]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function update(UpdateAppearanceThemeRequest $request, AppearanceTheme $theme): JsonResponse
    {
        $user = $request->user();

        // Company themes: admin only
        if ($theme->scope_type === 'company') {
            if (!$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only administrators can update company themes.',
                ], 403);
            }
        } else {
            // User themes: owner only
            if ((int) $theme->user_id !== (int) $user->getKey()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Theme not found.',
                ], 404);
            }
        }

        try {
            $updated = $this->themeService->updateForUser($theme, $request->validated());
            $resource = (new AppearanceThemeResource($updated))->withBaseUrl(config('app.url'));

            return response()->json([
                'success' => true,
                'data' => [
                    'theme' => $resource->toArray($request),
                ],
            ]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function activate(Request $request, AppearanceTheme $theme): JsonResponse
    {
        $user = $request->user();

        // Company themes: admin only
        if ($theme->scope_type === 'company') {
            if (!$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only administrators can activate company themes.',
                ], 403);
            }

            try {
                $activated = $this->themeService->activateCompanyTheme($user, $theme);
                $data = $this->themeService->buildCompanyResponseData($activated, config('app.url'));

                return response()->json([
                    'success' => true,
                    'data' => [
                        'theme' => $data,
                    ],
                ]);
            } catch (\Throwable $e) {
                report($e);
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        // User themes: owner only
        if ((int) $theme->user_id !== (int) $user->getKey()) {
            return response()->json([
                'success' => false,
                'message' => 'Theme not found.',
            ], 404);
        }

        try {
            $activated = $this->themeService->activateForUser($user, $theme);
            $data = $this->themeService->buildResponseData($activated, config('app.url'));

            return response()->json([
                'success' => true,
                'data' => [
                    'theme' => $data,
                ],
            ]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    public function reset(Request $request): JsonResponse
    {
        $user = $request->user();
        $scope = $request->input('scope', 'user');

        if ($scope === 'company') {
            if (!$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only administrators can reset company themes.',
                ], 403);
            }

            $this->themeService->resetCompanyTheme($user);

            $defaultData = $this->themeService->companyDefaultResponseData(config('app.url'));

            return response()->json([
                'success' => true,
                'data' => [
                    'theme' => $defaultData,
                    'is_default' => true,
                ],
            ]);
        }

        $this->themeService->resetForUser($user);

        $defaultData = $this->themeService->defaultResponseData(config('app.url'));

        return response()->json([
            'success' => true,
            'data' => [
                'theme' => $defaultData,
                'is_default' => true,
            ],
        ]);
    }

    public function destroy(Request $request, AppearanceTheme $theme): JsonResponse
    {
        $user = $request->user();

        // Company themes: admin only
        if ($theme->scope_type === 'company') {
            if (!$user->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only administrators can delete company themes.',
                ], 403);
            }

            try {
                $this->themeService->deleteCompanyTheme($user, $theme);

                return response()->json([
                    'success' => true,
                    'message' => 'Theme deleted.',
                ]);
            } catch (\Throwable $e) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        // User themes: owner only
        if ((int) $theme->user_id !== (int) $user->getKey()) {
            return response()->json([
                'success' => false,
                'message' => 'Theme not found.',
            ], 404);
        }

        try {
            $this->themeService->deleteForUser($user, $theme);

            return response()->json([
                'success' => true,
                'message' => 'Theme deleted.',
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}
