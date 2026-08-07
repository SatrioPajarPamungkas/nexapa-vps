<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaAssetResource;
use App\Models\MediaAsset;
use App\Services\MediaAssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaAssetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->mediaAssets();

        if ($request->boolean('library_only')) {
            $query->whereNull('download_job_id');
        }

        if (! empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('display_name', 'like', "%{$search}%")
                  ->orWhere('original_name', 'like', "%{$search}%")
                  ->orWhere('source_url', 'like', "%{$search}%");
            });
        }

        if (! empty($request->media_type)) {
            $query->where('media_type', $request->media_type);
        }

        if (! empty($request->source_platform)) {
            $query->where('source_platform', $request->source_platform);
        }

        $requestedStatuses = $request->input('status');
        $statuses = collect(
            is_array($requestedStatuses)
                ? $requestedStatuses
                : explode(',', (string) $requestedStatuses)
        )
            ->flatMap(fn ($status) => explode(',', (string) $status))
            ->map(fn ($status) => trim($status))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($statuses !== []) {
            $query->whereIn('status', $statuses);
        }

        if (! $request->boolean('library_only') && ! empty($request->download_job_id)) {
            $query->where('download_job_id', $request->download_job_id);
        }

        if (! empty($request->collection_id)) {
            $collection = $request->user()->collections()->find($request->collection_id);
            if (!$collection) {
                return response()->json([
                    'success' => false,
                    'message' => 'Collection not found.',
                ], 404);
            }
            
            $query->whereHas('collections', function ($q) use ($collection) {
                $q->where('collections.id', $collection->id);
            });
        }

        if (! empty($request->created_from)) {
            $query->where('created_at', '>=', $request->created_from);
        }

        if (! empty($request->created_to)) {
            $query->where('created_at', '<=', $request->created_to);
        }

        $sort = $request->sort ?? '-created_at';
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');
        $query->orderBy($column, $direction);

        $perPage = $request->per_page ?? 20;
        $assets = $query->withCount(['posts', 'activePosts'])->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Media assets retrieved.',
            'data' => MediaAssetResource::collection($assets),
            'meta' => [
                'current_page' => $assets->currentPage(),
                'last_page' => $assets->lastPage(),
                'per_page' => $assets->perPage(),
                'total' => $assets->total(),
            ],
        ]);
    }

    public function show(MediaAsset $mediaAsset, Request $request): JsonResponse
    {
        abort_unless($request->user()?->is($mediaAsset->user), 404);

        $mediaAsset->loadCount(['posts', 'activePosts']);

        return response()->json([
            'success' => true,
            'message' => 'Media asset retrieved.',
            'data' => new MediaAssetResource($mediaAsset),
        ]);
    }

    public function destroy(MediaAsset $mediaAsset, Request $request): JsonResponse
    {
        abort_unless($request->user()?->is($mediaAsset->user), 404);

        $hasUsage = $mediaAsset->posts()->exists();

        if ($hasUsage) {
            return response()->json([
                'success' => false,
                'message' => 'This media has been used by a publisher post and cannot be deleted.',
                'error' => 'media_has_usage',
            ], 422);
        }

        $storageDisk = $mediaAsset->storage_disk ?? 'local';
        if ($mediaAsset->storage_path && \Illuminate\Support\Facades\Storage::disk($storageDisk)->exists($mediaAsset->storage_path)) {
            \Illuminate\Support\Facades\Storage::disk($storageDisk)->delete($mediaAsset->storage_path);
        }

        if ($mediaAsset->thumbnail_path && \Illuminate\Support\Facades\Storage::disk($storageDisk)->exists($mediaAsset->thumbnail_path)) {
            \Illuminate\Support\Facades\Storage::disk($storageDisk)->delete($mediaAsset->thumbnail_path);
        }

        $mediaAsset->delete();

        return response()->json([
            'success' => true,
            'message' => 'Media asset deleted.',
        ]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'selection_mode' => ['required', 'in:ids,all_matching'],
            'ids' => ['required_if:selection_mode,ids', 'array'],
            'ids.*' => ['string', 'uuid'],
            'excluded_ids' => ['nullable', 'array'],
            'excluded_ids.*' => ['string', 'uuid'],
            'filters' => ['nullable', 'array'],
            'filters.search' => ['nullable', 'string'],
            'filters.media_type' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $query = $user->mediaAssets()->whereNull('download_job_id');

        if ($validated['selection_mode'] === 'ids') {
            $query->whereKey($validated['ids']);
        } else {
            $filters = $validated['filters'] ?? [];

            if (! empty($filters['search'])) {
                $search = $filters['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('display_name', 'like', "%{$search}%")
                      ->orWhere('original_name', 'like', "%{$search}%")
                      ->orWhere('source_url', 'like', "%{$search}%");
                });
            }

            if (! empty($filters['media_type'])) {
                $query->where('media_type', $filters['media_type']);
            }

            if (! empty($validated['excluded_ids'])) {
                $query->whereNotIn('id', $validated['excluded_ids']);
            }
        }

        $mediaAssets = $query->get();
        $deleted = 0;
        $skippedItems = [];
        $mediaAssetService = app(MediaAssetService::class);

        foreach ($mediaAssets as $mediaAsset) {
            $usageCount = $mediaAsset->posts()->count();

            if ($usageCount > 0) {
                $skippedItems[] = [
                    'id' => $mediaAsset->getKey(),
                    'reason' => 'in_use',
                    'usage_count' => $usageCount,
                ];

                continue;
            }

            try {
                $mediaAssetService->delete($mediaAsset);
                $deleted++;
            } catch (\Throwable $exception) {
                report($exception);

                $skippedItems[] = [
                    'id' => $mediaAsset->getKey(),
                    'reason' => 'delete_failed',
                    'usage_count' => $usageCount,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'requested' => $mediaAssets->count(),
                'deleted' => $deleted,
                'skipped' => count($skippedItems),
                'skipped_items' => $skippedItems,
            ],
        ]);
    }
}
