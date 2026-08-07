<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CollectionResource;
use App\Models\Collection;
use App\Models\MediaAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CollectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Collection::where('user_id', $request->user()->id)->withCount('mediaAssets');

        if ($request->filled('source_type')) {
            $query->where('source_type', $request->source_type);
        }

        if ($request->filled('download_job_id')) {
            $query->where('download_job_id', $request->download_job_id);
        }

        $collections = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Collections retrieved.',
            'data' => CollectionResource::collection($collections),
        ]);
    }

    public function show(Collection $collection, Request $request): JsonResponse
    {
        // Authorization check
        if ($request->user()->id !== $collection->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Collection not found.',
            ], 404);
        }

        $collection->loadCount('mediaAssets');

        return response()->json([
            'success' => true,
            'message' => 'Collection retrieved.',
            'data' => new CollectionResource($collection),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // Validate request
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:60',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $name = trim($request->input('name'));

        // Check if user already has a manual collection with this name
        $existing = Collection::where('user_id', $request->user()->id)
            ->where('source_type', 'manual')
            ->where('name', $name)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'A folder with this name already exists.',
            ], 422);
        }

        // Check if user has reached the maximum number of manual collections
        $manualCount = Collection::where('user_id', $request->user()->id)
            ->where('source_type', 'manual')
            ->count();

        if ($manualCount >= 30) {
            return response()->json([
                'success' => false,
                'message' => 'Maximum number of folders reached.',
            ], 422);
        }

        // Create collection
        $collection = Collection::create([
            'user_id' => $request->user()->id,
            'name' => $name,
            'source_type' => 'manual',
            'media_count' => 0,
        ]);

        $collection->loadCount('mediaAssets');

        return response()->json([
            'success' => true,
            'message' => 'Folder created.',
            'data' => new CollectionResource($collection),
        ], 201);
    }

    public function update(Collection $collection, Request $request): JsonResponse
    {
        // Authorization check
        if ($request->user()->id !== $collection->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Collection not found.',
            ], 404);
        }

        // Validate request
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:60',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $name = trim($request->input('name'));

        // Check if user already has another manual collection with this name
        $existing = Collection::where('user_id', $request->user()->id)
            ->where('source_type', 'manual')
            ->where('name', $name)
            ->where('id', '!=', $collection->id)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'A folder with this name already exists.',
            ], 422);
        }

        // Update collection
        $collection->update(['name' => $name]);

        $collection->loadCount('mediaAssets');

        return response()->json([
            'success' => true,
            'message' => 'Folder updated.',
            'data' => new CollectionResource($collection),
        ]);
    }

    public function destroy(Collection $collection, Request $request): JsonResponse
    {
        // Authorization check
        if ($request->user()->id !== $collection->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Collection not found.',
            ], 404);
        }

        // Only allow deletion of manual collections
        if ($collection->source_type !== 'manual') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete this collection type.',
            ], 422);
        }

        $collection->mediaAssets()->detach();
        $collection->delete();

        return response()->json([
            'success' => true,
            'message' => 'Folder deleted.',
        ]);
    }

    public function addMediaAssets(Collection $collection, Request $request): JsonResponse
    {
        // Authorization check
        if ($request->user()->id !== $collection->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Collection not found.',
            ], 404);
        }

        // Only allow adding to manual collections
        if ($collection->source_type !== 'manual') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot add media to this collection type.',
            ], 422);
        }

        // Validate request
        $validator = Validator::make($request->all(), [
            'media_asset_ids' => 'required|array|min:1|max:100',
            'media_asset_ids.*' => 'required|string|uuid|distinct',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $mediaAssetIds = $request->input('media_asset_ids');

        // Verify that all media assets belong to the user and have download_job_id NULL
        $validAssets = MediaAsset::where('user_id', $request->user()->id)
            ->whereNull('download_job_id')
            ->whereIn('id', $mediaAssetIds)
            ->pluck('id')
            ->toArray();

        // Check if all requested assets are valid
        $invalidAssets = array_diff($mediaAssetIds, $validAssets);
        if (!empty($invalidAssets)) {
            return response()->json([
                'success' => false,
                'message' => 'Some media assets are invalid or not accessible.',
            ], 422);
        }

        // Use a database transaction for consistency
        DB::transaction(function () use ($collection, $validAssets) {
            // Detach these assets from all user's manual collections
            Collection::where('user_id', $collection->user_id)
                ->where('source_type', 'manual')
                ->eachById(function ($userCollection) use ($validAssets) {
                    $userCollection->mediaAssets()->detach($validAssets);
                    // Refresh media count
                    $userCollection->update(['media_count' => $userCollection->mediaAssets()->count()]);
                });

            // Attach assets to the target collection
            $collection->mediaAssets()->attach($validAssets);
            
            // Refresh media count for target collection
            $collection->update(['media_count' => $collection->mediaAssets()->count()]);
        });

        $collection->loadCount('mediaAssets');

        return response()->json([
            'success' => true,
            'message' => 'Media assets added to folder.',
            'data' => new CollectionResource($collection),
        ]);
    }

    public function removeMediaAssets(Collection $collection, Request $request): JsonResponse
    {
        // Authorization check
        if ($request->user()->id !== $collection->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Collection not found.',
            ], 404);
        }

        // Only allow removing from manual collections
        if ($collection->source_type !== 'manual') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot remove media from this collection type.',
            ], 422);
        }

        // Validate request
        $validator = Validator::make($request->all(), [
            'media_asset_ids' => 'required|array|min:1|max:100',
            'media_asset_ids.*' => 'required|string|uuid|distinct',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $mediaAssetIds = $request->input('media_asset_ids');

        // Verify that all media assets belong to the user and are attached to this collection
        $validAssets = $collection->mediaAssets()
            ->whereIn('media_assets.id', $mediaAssetIds)
            ->pluck('media_assets.id')
            ->toArray();

        // Detach assets from the collection
        $collection->mediaAssets()->detach($validAssets);
        
        // Refresh media count
        $collection->update(['media_count' => $collection->mediaAssets()->count()]);

        $collection->loadCount('mediaAssets');

        return response()->json([
            'success' => true,
            'message' => 'Media assets removed from folder.',
            'data' => new CollectionResource($collection),
        ]);
    }
}
