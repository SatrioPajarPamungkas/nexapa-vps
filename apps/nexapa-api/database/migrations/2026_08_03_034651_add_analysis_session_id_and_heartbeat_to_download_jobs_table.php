<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('download_jobs', function (Blueprint $table) {
            $table->uuid('analysis_session_id')->nullable()->index();
            $table->timestamp('analysis_client_heartbeat_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('download_jobs', function (Blueprint $table) {
            $table->dropColumn(['analysis_session_id', 'analysis_client_heartbeat_at']);
        });
    }
};
