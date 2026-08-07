<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SchedulerStatusController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        $lastRunAt = Cache::get('publisher_scheduler_last_run_at');
        
        $queueConnection = config('queue.default', 'database');
        
        $schedulerStatus = 'stale';
        if ($lastRunAt) {
            $lastRunTime = \Carbon\Carbon::parse($lastRunAt);
            $minutesSinceLastRun = $lastRunTime->diffInMinutes(now());
            
            if ($minutesSinceLastRun <= 2) {
                $schedulerStatus = 'ready';
            }
        }
        
        return response()->json([
            'scheduler' => $schedulerStatus,
            'last_run_at' => $lastRunAt,
            'queue_connection' => $queueConnection,
        ]);
    }
}