<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use App\Support\SafeMetadata;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Throwable;

class ActivityLogService
{
    public function log(array $data): ?ActivityLog
    {
        try {
            $user = $data['user'] ?? null;
            if (! $user instanceof User && isset($data['user_id'])) {
                $user = User::withTrashed()->find($data['user_id']);
            }
            $subject = $data['subject'] ?? null;

            return ActivityLog::create([
                'user_id' => $user?->getKey() ?? ($data['user_id'] ?? null),
                'actor_name' => $data['actor_name'] ?? $user?->name,
                'actor_email' => $data['actor_email'] ?? $user?->email,
                'category' => $data['category'],
                'action' => $data['action'],
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'subject_type' => $subject instanceof Model ? get_class($subject) : ($data['subject_type'] ?? null),
                'subject_id' => $subject instanceof Model ? $subject->getKey() : ($data['subject_id'] ?? null),
                'status' => $data['status'] ?? 'success',
                'platform' => $data['platform'] ?? null,
                'product' => $data['product'] ?? 'publisher',
                'metadata' => SafeMetadata::sanitize($data['metadata'] ?? null),
                'ip_address' => $data['ip_address'] ?? request()->ip(),
                'user_agent' => Str::limit(
                    (string) ($data['user_agent'] ?? request()->userAgent()),
                    1000
                ) ?: null,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return null;
        }
    }
}
