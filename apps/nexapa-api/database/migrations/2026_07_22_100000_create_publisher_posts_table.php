<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('publisher_posts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->uuid('connected_account_id')->index();
            $table->uuid('media_asset_id')->index();
            $table->string('platform')->index();
            $table->text('caption')->nullable();
            $table->string('action')->index()->default('draft');
            $table->string('provider_mode')->default('upload_as_draft');
            $table->string('status')->index()->default('draft');
            $table->datetime('scheduled_at')->nullable()->index();
            $table->string('provider_publish_id')->nullable();
            $table->string('provider_status')->nullable();
            $table->string('failure_code')->nullable();
            $table->text('failure_message')->nullable();
            $table->datetime('published_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('connected_account_id')->references('id')->on('connected_accounts')->cascadeOnDelete();
            $table->foreign('media_asset_id')->references('id')->on('media_assets')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('publisher_posts');
    }
};
