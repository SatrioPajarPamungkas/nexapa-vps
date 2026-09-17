<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commerce_digital_import_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('commerce_product_id')
                ->constrained('commerce_products')->cascadeOnDelete();
            $table->foreignUuid('commerce_product_variant_id')
                ->nullable()->constrained('commerce_product_variants')->nullOnDelete();
            $table->string('original_name');
            $table->json('headers');
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('imported_rows')->default(0);
            $table->unsignedInteger('duplicate_rows')->default(0);
            $table->unsignedInteger('invalid_rows')->default(0);
            $table->foreignId('created_by')
                ->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('commerce_digital_stock_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('commerce_product_id')
                ->constrained('commerce_products')->cascadeOnDelete();
            $table->foreignUuid('commerce_product_variant_id')
                ->nullable()->constrained('commerce_product_variants')->nullOnDelete();
            $table->foreignUuid('import_batch_id')
                ->nullable()->constrained('commerce_digital_import_batches')->nullOnDelete();

            $table->string('masked_identifier', 190);
            $table->longText('payload');
            $table->char('fingerprint', 64)->unique();
            $table->string('status', 24)->default('available');
            $table->unsignedInteger('sort_order')->default(0);

            $table->uuid('reservation_token')->nullable()->index();
            $table->string('order_reference', 120)->nullable()->index();
            $table->foreignId('buyer_id')
                ->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reserved_until')->nullable()->index();
            $table->timestamp('sold_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('downloaded_at')->nullable();

            $table->foreignId('created_by')
                ->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(
                [
                    'commerce_product_id',
                    'commerce_product_variant_id',
                    'status',
                    'sort_order',
                ],
                'commerce_stock_fifo_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commerce_digital_stock_items');
        Schema::dropIfExists('commerce_digital_import_batches');
    }
};
