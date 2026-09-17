<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commerce_product_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('commerce_product_id')
                ->constrained('commerce_products')
                ->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('sku', 100)->nullable();
            $table->unsignedBigInteger('price_amount');
            $table->unsignedBigInteger('discount_price_amount')->nullable();
            $table->unsignedBigInteger('sold_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index([
                'commerce_product_id',
                'is_active',
                'sort_order',
            ], 'commerce_variants_product_active_sort_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commerce_product_variants');
    }
};
