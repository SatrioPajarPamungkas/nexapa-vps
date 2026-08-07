<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('publisher_posts', function (Blueprint $table) {
            $table->uuid('media_asset_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('publisher_posts', function (Blueprint $table) {
            $table->uuid('media_asset_id')->nullable(false)->change();
        });
    }
};
