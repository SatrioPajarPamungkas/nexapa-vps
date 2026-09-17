<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commerce_customers', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->timestamp('email_verified_at')->nullable();
            $table->string('access_status', 24)->default('active')->index();
            $table->timestamp('registered_at')->nullable()->index();
            $table->timestamp('suspended_at')->nullable();
            $table->text('suspension_reason')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('crm_accounts', function (Blueprint $table): void {
            $table->id();
            $table->uuid('crm_user_id')->unique();
            $table->uuid('crm_account_id')->nullable()->index();
            $table->uuid('crm_profile_id')->nullable()->index();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('access_status', 24)->default('active')->index();
            $table->timestamp('registered_at')->nullable()->index();
            $table->timestamp('suspended_at')->nullable();
            $table->text('suspension_reason')->nullable();
            $table->timestamps();
        });

        Schema::table('subscriptions', function (Blueprint $table): void {
            $table->string('product', 20)
                ->default('publisher')
                ->after('email')
                ->index();
        });

        $this->separateSubscriptions();

        $this->migrateCommerceCustomers();
        $this->migrateCrmAccounts();
        $this->separateCommerceOrders();
        $this->separateDigitalStockBuyers();
    }

    private function migrateCommerceCustomers(): void
    {
        $userIds = collect();

        if (Schema::hasColumn('users', 'commerce_registered_at')) {
            $userIds = DB::table('users')
                ->whereNotNull('commerce_registered_at')
                ->pluck('id');
        }

        if (Schema::hasTable('commerce_orders')) {
            $userIds = $userIds
                ->merge(
                    DB::table('commerce_orders')
                        ->whereNotNull('user_id')
                        ->pluck('user_id')
                )
                ->unique()
                ->values();
        }

        if ($userIds->isEmpty()) {
            return;
        }

        DB::table('users')
            ->whereIn('id', $userIds)
            ->orderBy('id')
            ->get()
            ->each(function (object $user): void {
                DB::table('commerce_customers')->insertOrIgnore([
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => strtolower(trim($user->email)),
                    'password' => $user->password,
                    'email_verified_at' => $user->email_verified_at,
                    'access_status' =>
                        $user->commerce_access_status ?? 'active',
                    'registered_at' =>
                        $user->commerce_registered_at
                            ?? $user->created_at
                            ?? now(),
                    'suspended_at' =>
                        $user->commerce_suspended_at ?? null,
                    'suspension_reason' =>
                        $user->commerce_suspension_reason ?? null,
                    'remember_token' => null,
                    'created_at' => $user->created_at ?? now(),
                    'updated_at' => $user->updated_at ?? now(),
                ]);
            });
    }

    private function separateSubscriptions(): void
    {
        $shared = DB::table('subscriptions')
            ->whereNotNull('publisher_user_id')
            ->whereNotNull('crm_user_id')
            ->orderBy('id')
            ->get();

        foreach ($shared as $subscription) {
            $crmSubscription = (array) $subscription;
            unset($crmSubscription['id']);
            $crmSubscription['product'] = 'crm';
            $crmSubscription['publisher_user_id'] = null;

            $crmSubscriptionId = DB::table('subscriptions')
                ->insertGetId($crmSubscription);

            if (Schema::hasTable('subscription_usages')) {
                DB::table('subscription_usages')
                    ->where('subscription_id', $subscription->id)
                    ->get()
                    ->each(function (object $usage) use (
                        $crmSubscriptionId,
                    ): void {
                        $copy = (array) $usage;
                        unset($copy['id']);
                        $copy['subscription_id'] = $crmSubscriptionId;
                        DB::table('subscription_usages')->insert($copy);
                    });
            }

            DB::table('subscriptions')
                ->where('id', $subscription->id)
                ->update([
                    'product' => 'publisher',
                    'crm_user_id' => null,
                    'crm_account_id' => null,
                ]);
        }

        DB::table('subscriptions')
            ->whereNull('publisher_user_id')
            ->whereNotNull('crm_user_id')
            ->update(['product' => 'crm']);

        DB::table('subscriptions')
            ->whereNotNull('publisher_user_id')
            ->whereNull('crm_user_id')
            ->update(['product' => 'publisher']);
    }

    private function migrateCrmAccounts(): void
    {
        if (! Schema::hasTable('crm_user_mappings')) {
            return;
        }

        DB::table('crm_user_mappings as mappings')
            ->join('users', 'users.id', '=', 'mappings.publisher_user_id')
            ->select([
                'mappings.crm_user_id',
                'mappings.crm_account_id',
                'mappings.crm_profile_id',
                'mappings.provisioned_at',
                'users.name',
                'users.email',
                'users.crm_access_status',
                'users.crm_suspended_at',
                'users.crm_suspension_reason',
                'users.created_at',
                'users.updated_at',
            ])
            ->orderBy('mappings.id')
            ->get()
            ->each(function (object $row): void {
                DB::table('crm_accounts')->insertOrIgnore([
                    'crm_user_id' => $row->crm_user_id,
                    'crm_account_id' => $row->crm_account_id,
                    'crm_profile_id' => $row->crm_profile_id,
                    'name' => $row->name,
                    'email' => strtolower(trim($row->email)),
                    'access_status' =>
                        $row->crm_access_status ?? 'active',
                    'registered_at' =>
                        $row->provisioned_at
                            ?? $row->created_at
                            ?? now(),
                    'suspended_at' => $row->crm_suspended_at,
                    'suspension_reason' =>
                        $row->crm_suspension_reason,
                    'created_at' => $row->created_at ?? now(),
                    'updated_at' => $row->updated_at ?? now(),
                ]);
            });
    }

    private function separateCommerceOrders(): void
    {
        if (! Schema::hasTable('commerce_orders')) {
            return;
        }

        Schema::table('commerce_orders', function (Blueprint $table): void {
            $table->dropForeign(['user_id']);
        });

        Schema::table('commerce_orders', function (Blueprint $table): void {
            $table->foreign('user_id')
                ->references('id')
                ->on('commerce_customers')
                ->cascadeOnDelete();
        });
    }

    private function separateDigitalStockBuyers(): void
    {
        if (! Schema::hasTable('commerce_digital_stock_items')) {
            return;
        }

        Schema::table(
            'commerce_digital_stock_items',
            function (Blueprint $table): void {
                $table->dropForeign(['buyer_id']);
            },
        );

        Schema::table(
            'commerce_digital_stock_items',
            function (Blueprint $table): void {
                $table->foreign('buyer_id')
                    ->references('id')
                    ->on('commerce_customers')
                    ->nullOnDelete();
            },
        );
    }

    public function down(): void
    {
        throw new RuntimeException(
            'Platform account separation is restored from the deployment database backup.'
        );
    }
};
