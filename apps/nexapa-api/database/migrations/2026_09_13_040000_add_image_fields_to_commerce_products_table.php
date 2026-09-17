<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commerce_products', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('description');
            $table->string('image_alt', 160)->nullable()->after('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('commerce_products', function (Blueprint $table) {
            $table->dropColumn(['image_path', 'image_alt']);
        });
    }
};
