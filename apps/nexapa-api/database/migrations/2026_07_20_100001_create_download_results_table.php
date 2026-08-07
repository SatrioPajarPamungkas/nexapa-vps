<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('download_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('download_job_id')->index();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('external_id')->nullable();
            $table->string('title')->nullable();
            $table->text('source_url');
            $table->text('thumbnail_url')->nullable();
            $table->string('media_type')->default('video');
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->boolean('selected')->default(false);
            $table->string('status')->default('discovered');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('download_job_id')->references('id')->on('download_jobs')->cascadeOnDelete();
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('download_results');
    }
};
