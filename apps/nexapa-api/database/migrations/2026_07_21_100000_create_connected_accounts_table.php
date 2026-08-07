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
        Schema::create('connected_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('platform'); // tiktok, facebook
            $table->string('external_account_id')->nullable();
            $table->string('display_name');
            $table->string('username')->nullable();
            $table->text('avatar_url')->nullable();
            $table->string('status')->default('disconnected'); // connected, expired, error, disconnected
            $table->string('connection_method')->default('oauth');
            $table->boolean('is_default')->default(false);
            $table->timestamp('last_validated_at')->nullable();
            $table->json('metadata')->nullable();
            
            // Encrypted tokens (never exposed to frontend)
            $table->text('access_token_encrypted')->nullable();
            $table->text('refresh_token_encrypted')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            
            $table->timestamps();
            $table->softDeletes();

            // Indexes for common queries
            $table->index(['user_id', 'platform']);
            $table->index(['platform', 'is_default']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('connected_accounts');
    }
};
