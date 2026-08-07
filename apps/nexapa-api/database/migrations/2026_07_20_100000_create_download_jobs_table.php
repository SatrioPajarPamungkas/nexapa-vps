<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('download_jobs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('mode');
            $table->text('original_input');
            $table->text('normalized_url')->nullable();
            $table->string('platform')->index();
            $table->string('source_type')->index();
            $table->string('output_format')->default('mp4');
            $table->string('quality')->default('best');
            $table->string('filename_mode')->default('original');
            $table->unsignedInteger('delay_seconds')->default(0);
            $table->string('status')->index()->default('queued');
            $table->unsignedSmallInteger('progress')->default(0);
            $table->string('current_stage')->nullable();
            $table->string('error_code')->nullable();
            $table->text('error_message')->nullable();
            $table->unsignedSmallInteger('retry_count')->default(0);
            $table->unsignedSmallInteger('max_retries')->default(3);
            $table->string('worker_id')->nullable()->index();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('user_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('download_jobs');
    }
};
