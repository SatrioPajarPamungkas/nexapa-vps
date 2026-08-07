<?php

namespace Tests\Feature;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadMode;
use App\Enums\DownloadPlatform;
use App\Enums\SourceType;
use App\Models\DownloadJob;
use App\Models\DownloadResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkerResultsTest extends TestCase
{
    use RefreshDatabase;

    private DownloadJob $parentJob;

    protected function setUp(): void
    {
        parent::setUp();

        $this->parentJob = DownloadJob::factory()->create([
            'user_id' => User::factory(),
            'mode' => DownloadMode::Profile,
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Profile,
            'status' => DownloadJobStatus::Processing,
            'worker_id' => 'worker-01',
            'original_input' => 'https://www.tiktok.com/@example',
            'normalized_url' => 'https://www.tiktok.com/@example',
        ]);
    }

    public function test_valid_profile_parent_accepts_results(): void
    {
        $response = $this->postResults([
            $this->resultPayload('video-1'),
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => '1 new results discovered.',
            ])
            ->assertJsonPath('data.0.external_id', 'video-1')
            ->assertJsonPath('data.0.child_job_id', null)
            ->assertJsonPath('data.0.is_queued', false);

        $this->assertDatabaseHas('download_results', [
            'download_job_id' => $this->parentJob->id,
            'external_id' => 'video-1',
            'title' => 'Video video-1',
            'media_type' => 'video',
            'duration_seconds' => 60,
        ]);
    }

    public function test_multiple_results_are_stored(): void
    {
        $results = array_map(
            fn (int $index): array => $this->resultPayload("video-{$index}"),
            range(1, 10),
        );

        $this->postResults($results)
            ->assertOk()
            ->assertJsonCount(10, 'data');

        $this->assertSame(
            10,
            DownloadResult::query()
                ->where('download_job_id', $this->parentJob->id)
                ->count(),
        );
    }

    public function test_duplicate_submission_is_idempotent(): void
    {
        $results = [
            $this->resultPayload('video-1'),
            $this->resultPayload('video-2'),
        ];

        $this->postResults($results)
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->postResults($results)
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => '0 new results discovered.',
            ])
            ->assertJsonCount(0, 'data');

        $this->assertSame(
            2,
            DownloadResult::query()
                ->where('download_job_id', $this->parentJob->id)
                ->count(),
        );
    }

    public function test_malformed_result_returns_422_without_writing_results(): void
    {
        $this->postResults([
            [
                'external_id' => 'video-bad',
                'source_url' => ['not-a-string'],
                'duration_seconds' => 'not-an-integer',
                'metadata' => 'not-an-object',
            ],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'results.0.source_url',
                'results.0.duration_seconds',
                'results.0.metadata',
            ]);

        $this->assertDatabaseCount('download_results', 0);
    }

    private function postResults(array $results): \Illuminate\Testing\TestResponse
    {
        return $this
            ->withHeaders([
                'Authorization' => 'Bearer '.config('nexapa.worker_token'),
                'X-Worker-ID' => 'worker-01',
            ])
            ->postJson(
                "/api/v1/worker/download-jobs/{$this->parentJob->id}/results",
                ['results' => $results],
            );
    }

    private function resultPayload(string $externalId): array
    {
        return [
            'external_id' => $externalId,
            'title' => "Video {$externalId}",
            'source_url' => "https://www.tiktok.com/@example/video/{$externalId}",
            'thumbnail_url' => "https://example.test/thumbnails/{$externalId}.jpg",
            'media_type' => 'video',
            'duration_seconds' => 60,
            'published_at' => '2026-08-03T12:00:00Z',
            'metadata' => [
                'extractor' => 'TikTok',
                'uploader' => 'example',
            ],
        ];
    }
}
