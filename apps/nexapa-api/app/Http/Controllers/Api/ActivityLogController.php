<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ActivityLog::query();

        if (! empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if (! empty($request->category)) {
            $query->where('category', $request->category);
        }

        if (! empty($request->platform)) {
            $query->where('platform', $request->platform);
        }

        if (! empty($request->status)) {
            $query->where('status', $request->status);
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
        $logs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Activity logs retrieved.',
            'data' => ActivityLogResource::collection($logs),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
