<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commerce_products', function (Blueprint $table) {
            $table->unsignedBigInteger('sold_count')
                ->default(0)
                ->after('discount_price_amount');
        });
    }

    public function down(): void
    {
        Schema::table('commerce_products', function (Blueprint $table) {
            $table->dropColumn('sold_count');
        });
    }
};
