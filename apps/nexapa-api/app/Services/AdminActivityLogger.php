<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Support\SafeMetadata;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class AdminActivityLogger
{
    private ?string $adminUserId = null;
    private ?string $ipAddress = null;
    private ?string $userAgent = null;

    public function __construct()
    {
        $this->adminUserId = Auth::id();
        $this->ipAddress = request()->ip();
        $this->userAgent = Str::limit(request()->userAgent(), 500);
    }

    public function log(
        string $action,
        ?Model $subject = null,
        string $description = '',
        string $status = 'success',
        array $metadata = []
    ): void {
        try {
            ActivityLog::create([
                'user_id' => $this->adminUserId,
                'category' => 'admin',
                'action' => $action,
                'title' => $description,
                'description' => $description,
                'subject_type' => $subject ? get_class($subject) : null,
                'subject_id' => $subject ? $subject->id : null,
                'status' => $status,
                'platform' => null,
                'metadata' => SafeMetadata::sanitize($metadata),
                'ip_address' => $this->ipAddress,
                'user_agent' => $this->userAgent,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to log admin activity', [
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function success(
        string $action,
        ?Model $subject = null,
        string $description = '',
        array $metadata = []
    ): void {
        $this->log($action, $subject, $description, 'success', $metadata);
    }

    public function failed(
        string $action,
        ?Model $subject = null,
        string $description = '',
        array $metadata = []
    ): void {
        $this->log($action, $subject, $description, 'failed', $metadata);
    }

    public function blocked(
        string $action,
        ?Model $subject = null,
        string $description = '',
        array $metadata = []
    ): void {
        $this->log($action, $subject, $description, 'blocked', $metadata);
    }

}
