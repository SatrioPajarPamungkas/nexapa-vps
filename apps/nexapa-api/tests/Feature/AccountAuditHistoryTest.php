<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountAuditHistoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_successful_login_records_identity_ip_and_device(): void
    {
        $user = User::factory()->create([
            'email' => 'audit@example.com',
            'password' => 'password',
        ]);

        $this->withHeaders([
            'User-Agent' => 'Nexapa Audit Test Browser',
            'X-Forwarded-For' => '203.0.113.10',
        ])->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $log = ActivityLog::query()
            ->where('action', 'auth.login_succeeded')
            ->firstOrFail();

        $this->assertSame($user->id, $log->user_id);
        $this->assertSame($user->name, $log->actor_name);
        $this->assertSame($user->email, $log->actor_email);
        $this->assertSame('publisher', $log->product);
        $this->assertStringContainsString('Nexapa Audit Test Browser', $log->user_agent);
    }

    public function test_failed_login_records_no_plain_text_password_or_email(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'unknown@example.com',
            'password' => 'do-not-store-this',
        ])->assertUnprocessable();

        $log = ActivityLog::query()
            ->where('action', 'auth.login_failed')
            ->firstOrFail();

        $encoded = json_encode($log->toArray());
        $this->assertStringNotContainsString('do-not-store-this', $encoded);
        $this->assertStringNotContainsString('unknown@example.com', $encoded);
        $this->assertNotEmpty($log->metadata['email_hash'] ?? null);
    }

    public function test_account_history_keeps_identity_snapshot_after_user_deletion(): void
    {
        $user = User::factory()->create();

        app(\App\Services\ActivityLogService::class)->log([
            'user' => $user,
            'category' => 'account',
            'action' => 'account.test',
            'title' => 'Audit retention test.',
        ]);

        $user->forceDelete();

        $log = ActivityLog::query()->firstOrFail();
        $this->assertNull($log->user_id);
        $this->assertSame($user->name, $log->actor_name);
        $this->assertSame($user->email, $log->actor_email);
    }
}
