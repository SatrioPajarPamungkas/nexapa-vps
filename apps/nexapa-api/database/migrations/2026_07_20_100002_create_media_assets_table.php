<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_assets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->uuid('download_job_id')->nullable()->index();
            $table->string('display_name');
            $table->string('original_name');
            $table->string('media_type');
            $table->string('mime_type')->nullable();
            $table->string('storage_disk')->default('local');
            $table->text('storage_path');
            $table->text('public_url')->nullable();
            $table->text('thumbnail_path')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->string('source_platform')->nullable()->index();
            $table->text('source_url')->nullable();
            $table->string('status')->index()->default('pending');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('created_at');

            $table->foreign('download_job_id')->references('id')->on('download_jobs')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_assets');
    }
};
