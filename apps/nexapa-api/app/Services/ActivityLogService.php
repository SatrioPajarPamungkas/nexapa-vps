<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

class ActivityLogService
{
    public function log(array $data): ActivityLog
    {
        return ActivityLog::create([
            'user_id' => $data['user_id'] ?? null,
            'category' => $data['category'],
            'action' => $data['action'],
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'subject_type' => $data['subject'] instanceof Model ? get_class($data['subject']) : ($data['subject_type'] ?? null),
            'subject_id' => $data['subject'] instanceof Model ? $data['subject']->id : ($data['subject_id'] ?? null),
            'status' => $data['status'],
            'platform' => $data['platform'] ?? null,
            'metadata' => $data['metadata'] ?? null,
        ]);
    }
}
