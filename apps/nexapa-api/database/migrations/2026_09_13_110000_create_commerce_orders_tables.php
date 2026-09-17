<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commerce_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('order_number', 80)->unique();
            $table->uuid('checkout_token')->unique();
            $table->foreignId('user_id')
                ->constrained('users')->restrictOnDelete();

            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone', 40)->nullable();

            $table->string('currency', 3)->default('IDR');
            $table->unsignedBigInteger('subtotal_amount');
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->unsignedBigInteger('total_amount');

            $table->string('status', 32)->default('payment_pending');
            $table->string('payment_status', 32)->default('pending');
            $table->string('promotion_code', 80)->nullable();

            $table->timestamp('placed_at');
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('commerce_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('commerce_order_id')
                ->constrained('commerce_orders')->cascadeOnDelete();
            $table->foreignUuid('commerce_product_id')
                ->nullable()->constrained('commerce_products')->nullOnDelete();
            $table->foreignUuid('commerce_product_variant_id')
                ->nullable()->constrained('commerce_product_variants')->nullOnDelete();

            $table->string('product_name');
            $table->string('product_slug');
            $table->string('variant_name')->nullable();
            $table->string('sku')->nullable();
            $table->string('fulfillment_type', 32);
            $table->string('stock_reference', 190)->nullable()->index();
            $table->unsignedBigInteger('unit_price_amount');
            $table->unsignedInteger('quantity');
            $table->unsignedBigInteger('subtotal_amount');
            $table->timestamps();

            $table->index(['commerce_order_id', 'created_at']);
        });

        Schema::create('commerce_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('commerce_order_id')
                ->constrained('commerce_orders')->cascadeOnDelete();
            $table->string('provider', 40)->default('midtrans');
            $table->string('provider_order_id', 120)->unique();
            $table->text('snap_token')->nullable();
            $table->text('redirect_url')->nullable();
            $table->string('transaction_id')->nullable()->index();
            $table->string('payment_type')->nullable();
            $table->string('transaction_status')->nullable();
            $table->string('fraud_status')->nullable();
            $table->unsignedBigInteger('gross_amount');
            $table->longText('raw_notification')->nullable();
            $table->timestamp('last_notified_at')->nullable();
            $table->timestamps();

            $table->index(['commerce_order_id', 'provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commerce_payments');
        Schema::dropIfExists('commerce_order_items');
        Schema::dropIfExists('commerce_orders');
    }
};
