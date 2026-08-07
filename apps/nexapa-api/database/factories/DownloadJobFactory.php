<?php

namespace Database\Factories;

use App\Enums\DownloadJobStatus;
use App\Enums\DownloadMode;
use App\Enums\DownloadPlatform;
use App\Enums\DownloadQuality;
use App\Enums\SourceType;
use App\Models\DownloadJob;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DownloadJob>
 */
class DownloadJobFactory extends Factory
{
    protected $model = DownloadJob::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'mode' => DownloadMode::Single,
            'original_input' => $this->faker->url(),
            'normalized_url' => $this->faker->url(),
            'platform' => DownloadPlatform::Tiktok,
            'source_type' => SourceType::Video,
            'quality' => DownloadQuality::Best,
            'status' => DownloadJobStatus::Queued,
            'progress' => 0,
            'retry_count' => 0,
            'max_retries' => 3,
            'delay_seconds' => 0,
            'metadata' => [],
        ];
    }
}