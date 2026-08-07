<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('download_jobs', function (Blueprint $table) {
            // Add parent_download_job_id column
            $table->uuid('parent_download_job_id')->nullable()->index();
            
            // Add download_result_id column
            $table->uuid('download_result_id')->nullable()->index();
            
            // Add skipped_at column
            $table->timestamp('skipped_at')->nullable();
            
            // Add skip_reason column
            $table->text('skip_reason')->nullable();
            
            // Add is_batch_work_item column
            $table->boolean('is_batch_work_item')->default(false)->index();
            
            // Add foreign key constraints
            $table->foreign('parent_download_job_id')
                  ->references('id')
                  ->on('download_jobs')
                  ->nullOnDelete();
                  
            $table->foreign('download_result_id')
                  ->references('id')
                  ->on('download_results')
                  ->nullOnDelete();
                  
            // Add unique constraint for idempotency
            $table->unique([
                'parent_download_job_id',
                'download_result_id',
                'output_format',
                'quality',
                'filename_mode'
            ], 'download_jobs_profile_result_settings_unique');
        });
    }

    public function down(): void
    {
        Schema::table('download_jobs', function (Blueprint $table) {
            // Drop unique constraint
            $table->dropUnique('download_jobs_profile_result_settings_unique');
            
            // Drop foreign key constraints
            $table->dropForeign(['parent_download_job_id']);
            $table->dropForeign(['download_result_id']);
            
            // Drop columns
            $table->dropColumn([
                'parent_download_job_id',
                'download_result_id',
                'skipped_at',
                'skip_reason'
            ]);
        });
    }
};