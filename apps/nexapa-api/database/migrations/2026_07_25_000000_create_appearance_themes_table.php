<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appearance_themes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('scope_type')->default('user');
            $table->unsignedBigInteger('scope_id')->nullable();
            $table->string('name');
            $table->string('preset_key')->nullable();
            $table->string('background_type')->default('builtin');
            $table->string('background_path')->nullable();
            $table->string('fallback_image_path')->nullable();
            $table->string('background_position')->default('center');
            $table->string('background_size')->default('cover');
            $table->string('background_attachment')->default('fixed');
            $table->unsignedSmallInteger('card_opacity')->default(10);
            $table->unsignedSmallInteger('card_blur')->default(24);
            $table->unsignedSmallInteger('sidebar_opacity')->default(65);
            $table->unsignedSmallInteger('topbar_opacity')->default(5);
            $table->unsignedSmallInteger('overlay_opacity')->default(2);
            $table->decimal('animation_speed', 4, 2)->default(1.00);
            $table->unsignedSmallInteger('motion_intensity')->default(20);
            $table->json('settings')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
            $table->index(['user_id', 'preset_key']);
            $table->index(['scope_type', 'scope_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appearance_themes');
    }
};
