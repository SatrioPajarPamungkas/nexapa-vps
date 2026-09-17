<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'subscription_orders',
            function (Blueprint $table): void {
                $table->uuid('id')->primary();
                $table->string('order_number', 80)->unique();

                $table->string('product', 30);
                $table->foreignId('subscription_plan_id')
                    ->constrained('subscription_plans')
                    ->restrictOnDelete();

                $table->foreignId('subscription_id')
                    ->nullable()
                    ->constrained('subscriptions')
                    ->nullOnDelete();

                $table->foreignId('publisher_user_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->string('crm_user_id', 80)->nullable();
                $table->string('crm_account_id', 80)->nullable();

                $table->string('customer_name', 255);
                $table->string('customer_email', 255);
                $table->string('customer_phone', 40)->nullable();

                $table->string('plan_code', 100);
                $table->string('plan_name', 150);
                $table->string('billing_cycle', 20);

                $table->string('currency', 10)->default('IDR');
                $table->unsignedBigInteger('base_price');
                $table->unsignedBigInteger('discount_amount')
                    ->default(0);
                $table->unsignedBigInteger('total_amount');

                $table->string('status', 30)
                    ->default('payment_pending');
                $table->string('payment_status', 30)
                    ->default('pending');

                $table->string('snap_token', 255)->nullable();
                $table->text('redirect_url')->nullable();
                $table->string('transaction_id', 190)->nullable();
                $table->string('transaction_status', 40)->nullable();
                $table->string('payment_type', 80)->nullable();
                $table->string('fraud_status', 40)->nullable();

                $table->json('raw_notification')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('paid_at')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->timestamps();

                $table->index(
                    ['product', 'payment_status'],
                    'subscription_orders_product_payment_idx'
                );

                $table->index(
                    ['publisher_user_id', 'created_at'],
                    'subscription_orders_publisher_idx'
                );

                $table->index(
                    ['crm_user_id', 'created_at'],
                    'subscription_orders_crm_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_orders');
    }
};
