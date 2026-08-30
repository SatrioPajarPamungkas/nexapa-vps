<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'subscription_plans',
            function (Blueprint $table): void {
                $table->id();
                $table->string('code', 30)->unique();
                $table->string('name', 100);
                $table->unsignedBigInteger('monthly_price');
                $table->unsignedBigInteger('yearly_price');
                $table->json('limits');
                $table->boolean('is_active')->default(true);
                $table->unsignedSmallInteger('sort_order')->default(0);
                $table->timestamps();
            }
        );

        Schema::create(
            'subscriptions',
            function (Blueprint $table): void {
                $table->id();

                $table->foreignId('subscription_plan_id')
                    ->constrained('subscription_plans');

                $table->string('email')->index();

                $table->foreignId('publisher_user_id')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->uuid('crm_user_id')->nullable()->index();
                $table->uuid('crm_account_id')->nullable()->index();

                $table->string('plan_code', 30);
                $table->string('plan_name', 100);
                $table->string('billing_cycle', 20);
                $table->unsignedBigInteger('price_paid');

                $table->json('limits_snapshot');

                $table->string('status', 20)
                    ->default('active')
                    ->index();

                $table->timestamp('starts_at');
                $table->timestamp('expires_at')->index();
                $table->timestamp('cancelled_at')->nullable();

                $table->foreignId('created_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();

                $table->index([
                    'email',
                    'status',
                ]);
            }
        );

        Schema::create(
            'subscription_usages',
            function (Blueprint $table): void {
                $table->id();

                $table->foreignId('subscription_id')
                    ->constrained('subscriptions')
                    ->cascadeOnDelete();

                $table->timestamp('period_starts_at');
                $table->timestamp('period_ends_at');

                $table->unsignedInteger('ai_requests')->default(0);
                $table->unsignedInteger('broadcasts_sent')->default(0);
                $table->unsignedInteger('scheduled_posts')->default(0);

                $table->timestamps();

                $table->unique([
                    'subscription_id',
                    'period_starts_at',
                ]);
            }
        );

        $now = now();

        DB::table('subscription_plans')->insert([
            [
                'code' => 'starter',
                'name' => 'Starter',
                'monthly_price' => 50000,
                'yearly_price' => 500000,
                'limits' => json_encode([
                    'team_members' => 1,
                    'social_accounts' => 3,
                    'whatsapp_numbers' => 1,
                    'crm_contacts' => 1000,
                    'ai_requests_per_month' => 50,
                ]),
                'is_active' => true,
                'sort_order' => 10,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'pro',
                'name' => 'Pro',
                'monthly_price' => 75000,
                'yearly_price' => 750000,
                'limits' => json_encode([
                    'team_members' => 5,
                    'social_accounts' => 10,
                    'whatsapp_numbers' => 1,
                    'crm_contacts' => 5000,
                    'ai_requests_per_month' => 300,
                ]),
                'is_active' => true,
                'sort_order' => 20,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'code' => 'business',
                'name' => 'Business',
                'monthly_price' => 100000,
                'yearly_price' => 1000000,
                'limits' => json_encode([
                    'team_members' => 15,
                    'social_accounts' => 30,
                    'whatsapp_numbers' => 3,
                    'crm_contacts' => 25000,
                    'ai_requests_per_month' => 1000,
                ]),
                'is_active' => true,
                'sort_order' => 30,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_usages');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('subscription_plans');
    }
};
