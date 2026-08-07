<?php

namespace Database\Factories;

use App\Models\DownloadResult;
use App\Models\DownloadJob;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DownloadResult>
 */
class DownloadResultFactory extends Factory
{
    protected $model = DownloadResult::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'download_job_id' => DownloadJob::factory(),
            'external_id' => fake()->uuid(),
            'title' => fake()->sentence(),
            'source_url' => fake()->url(),
            'thumbnail_url' => fake()->imageUrl(),
            'media_type' => fake()->randomElement(['video', 'image']),
            'duration_seconds' => fake()->numberBetween(10, 300),
            'published_at' => fake()->dateTime(),
            'selected' => fake()->boolean(),
            'metadata' => [],
        ];
    }
}