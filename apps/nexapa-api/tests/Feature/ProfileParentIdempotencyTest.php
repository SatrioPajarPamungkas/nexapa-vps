<?php

namespace Tests\Feature;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadMode;
use App\Enums\DownloadPlatform;
use App\Enums\SourceType;
use App\Models\DownloadJob;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileParentIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a user
        $this->user = User::factory()->create();
    }

    /**
     * Test that identical profile analyze requests don't create duplicate parents
     */
    public function test_identical_profile_analyze_requests_create_single_parent(): void
    {
        $this->actingAs($this->user);

        $profileUrl = 'https://www.tiktok.com/@testuser';

        // First request
        $response1 = $this->postJson('/api/v1/download-jobs', [
            'urls' => [$profileUrl],
            'mode' => 'profile',
            'output_format' => 'mp4',
            'quality' => 'best',
            'filename_mode' => 'original',
        ]);

        $response1->assertCreated();
        $response1->assertJson([
            'success' => true,
            'data' => [
                'accepted' => [
                    [
                        'mode' => 'profile',
                        'original_input' => $profileUrl,
                    ]
                ],
                'rejected' => [],
                'duplicates' => [],
            ],
        ]);

        $firstJobId = $response1->json('data.accepted.0.id');

        // Second identical request
        $response2 = $this->postJson('/api/v1/download-jobs', [
            'urls' => [$profileUrl],
            'mode' => 'profile',
            'output_format' => 'mp4',
            'quality' => 'best',
            'filename_mode' => 'original',
        ]);

        $response2->assertCreated();
        $response2->assertJson([
            'success' => true,
            'data' => [
                'accepted' => [
                    [
                        'id' => $firstJobId, // Same ID as first request
                        'mode' => 'profile',
                        'original_input' => $profileUrl,
                    ]
                ],
                'rejected' => [],
                'duplicates' => [],
            ],
        ]);

        // Verify only one job exists in the database
        $this->assertEquals(1, DownloadJob::where('user_id', $this->user->id)
            ->where('mode', DownloadMode::Profile)
            ->where('original_input', $profileUrl)
            ->count());
    }

    /**
     * Test that profile parents with different settings are not considered duplicates
     */
    public function test_profile_parents_with_different_settings_are_not_duplicates(): void
    {
        $this->actingAs($this->user);

        $profileUrl = 'https://www.tiktok.com/@testuser';

        // First request with one set of settings
        $response1 = $this->postJson('/api/v1/download-jobs', [
            'urls' => [$profileUrl],
            'mode' => 'profile',
            'output_format' => 'mp4',
            'quality' => 'best',
            'filename_mode' => 'original',
        ]);

        $response1->assertCreated();
        $firstJobId = $response1->json('data.accepted.0.id');

        // Second request with different settings
        $response2 = $this->postJson('/api/v1/download-jobs', [
            'urls' => [$profileUrl],
            'mode' => 'profile',
            'output_format' => 'audio',
            'quality' => 'best',
            'filename_mode' => 'original',
        ]);

        $response2->assertCreated();
        $secondJobId = $response2->json('data.accepted.0.id');

        // Should be different jobs
        $this->assertNotEquals($firstJobId, $secondJobId);

        // Verify both jobs exist in the database
        $this->assertEquals(2, DownloadJob::where('user_id', $this->user->id)
            ->where('mode', DownloadMode::Profile)
            ->where('original_input', $profileUrl)
            ->count());
    }

    /**
     * Test that profile parents in terminal states are not reused
     */
    public function test_profile_parents_in_terminal_states_are_not_reused(): void
    {
        $this->actingAs($this->user);

        $profileUrl = 'https://www.tiktok.com/@testuser';

        // Create a completed profile job
        $completedJob = DownloadJob::factory()->create([
            'user_id' => $this->user->id,
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Profile,
            'status' => DownloadJobStatus::Completed,
            'original_input' => $profileUrl,
            'normalized_url' => $profileUrl,
            'output_format' => 'mp4',
            'quality' => 'best',
            'filename_mode' => 'original',
        ]);

        // Make request with same settings
        $response = $this->postJson('/api/v1/download-jobs', [
            'urls' => [$profileUrl],
            'mode' => 'profile',
            'output_format' => 'mp4',
            'quality' => 'best',
            'filename_mode' => 'original',
        ]);

        $response->assertCreated();
        $newJobId = $response->json('data.accepted.0.id');

        // Should create a new job, not reuse the completed one
        $this->assertNotEquals($completedJob->id, $newJobId);

        // Verify both jobs exist in the database
        $this->assertEquals(2, DownloadJob::where('user_id', $this->user->id)
            ->where('mode', DownloadMode::Profile)
            ->where('original_input', $profileUrl)
            ->count());
    }

    /**
     * Test that after parent deletion, new requests create fresh parents
     */
    public function test_new_requests_after_deletion_create_fresh_parents(): void
    {
        $this->actingAs($this->user);

        $profileUrl = 'https://www.tiktok.com/@testuser';

        // First request
        $response1 = $this->postJson('/api/v1/download-jobs', [
            'urls' => [$profileUrl],
            'mode' => 'profile',
            'output_format' => 'mp4',
            'quality' => 'best',
            'filename_mode' => 'original',
        ]);

        $response1->assertCreated();
        $firstJobId = $response1->json('data.accepted.0.id');

        // Delete the job with hard delete (as implemented in the controller)
        $this->deleteJson("/api/v1/download-jobs/{$firstJobId}")
            ->assertOk();

        // Verify job is completely deleted (not soft deleted)
        $this->assertDatabaseMissing('download_jobs', ['id' => $firstJobId]);

        // Second request with same URL
        $response2 = $this->postJson('/api/v1/download-jobs', [
            'urls' => [$profileUrl],
            'mode' => 'profile',
            'output_format' => 'mp4',
            'quality' => 'best',
            'filename_mode' => 'original',
        ]);

        $response2->assertCreated();
        $secondJobId = $response2->json('data.accepted.0.id');

        // Should create a new job
        $this->assertNotEquals($firstJobId, $secondJobId);

        // Verify new job exists
        $this->assertDatabaseHas('download_jobs', ['id' => $secondJobId]);
        $this->assertDatabaseMissing('download_jobs', ['id' => $firstJobId]);
    }
}