<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commerce_digital_files', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('commerce_product_id')
                ->constrained('commerce_products')
                ->cascadeOnDelete();

            $table->foreignUuid('commerce_product_variant_id')
                ->nullable()
                ->constrained('commerce_product_variants')
                ->nullOnDelete();

            $table->string('label', 160)->nullable();
            $table->string('disk', 40)->default('local');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 160)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->char('checksum_sha256', 64);
            $table->string('status', 24)->default('ready');
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamp('sold_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('downloaded_at')->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            $table->index(
                ['commerce_product_id', 'status', 'sort_order'],
                'commerce_digital_files_queue_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commerce_digital_files');
    }
};
