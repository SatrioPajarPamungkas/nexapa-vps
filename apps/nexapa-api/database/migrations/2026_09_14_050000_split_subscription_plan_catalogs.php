<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $columns = [
            'product' => fn (Blueprint $table) =>
                $table->string('product', 30)
                    ->default('publisher')
                    ->after('id'),

            'description' => fn (Blueprint $table) =>
                $table->text('description')
                    ->nullable()
                    ->after('name'),

            'monthly_promo_price' => fn (Blueprint $table) =>
                $table->unsignedBigInteger('monthly_promo_price')
                    ->nullable()
                    ->after('monthly_price'),

            'yearly_promo_price' => fn (Blueprint $table) =>
                $table->unsignedBigInteger('yearly_promo_price')
                    ->nullable()
                    ->after('yearly_price'),
        ];

        foreach ($columns as $column => $definition) {
            if (! Schema::hasColumn('subscription_plans', $column)) {
                Schema::table(
                    'subscription_plans',
                    fn (Blueprint $table) => $definition($table),
                );
            }
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            $hasOldIndex = DB::table('sqlite_master')
                ->where('type', 'index')
                ->where('name', 'subscription_plans_code_unique')
                ->exists();

            if ($hasOldIndex) {
                Schema::table(
                    'subscription_plans',
                    fn (Blueprint $table) =>
                        $table->dropUnique(
                            'subscription_plans_code_unique'
                        ),
                );
            }
        } elseif ($driver === 'pgsql') {
            DB::statement(
                'ALTER TABLE subscription_plans
                 DROP CONSTRAINT IF EXISTS
                 subscription_plans_code_unique'
            );
        } else {
            try {
                Schema::table(
                    'subscription_plans',
                    fn (Blueprint $table) =>
                        $table->dropUnique(
                            'subscription_plans_code_unique'
                        ),
                );
            } catch (Throwable) {
                // Index lama memang sudah tidak tersedia.
            }
        }

        DB::table('subscription_plans')
            ->whereNull('product')
            ->orWhere('product', '')
            ->update(['product' => 'publisher']);

        $descriptions = [
            'starter' =>
                'Paket awal untuk individu atau bisnis yang baru mulai menggunakan Nexapa.',
            'pro' =>
                'Paket untuk tim berkembang dengan kapasitas dan fitur lebih besar.',
            'business' =>
                'Paket lengkap untuk bisnis dengan kebutuhan operasional skala tinggi.',
        ];

        foreach (
            DB::table('subscription_plans')
                ->where('product', 'publisher')
                ->orderBy('id')
                ->get()
            as $plan
        ) {
            $description =
                $plan->description
                ?: ($descriptions[$plan->code] ?? null);

            DB::table('subscription_plans')
                ->where('id', $plan->id)
                ->update([
                    'product' => 'publisher',
                    'description' => $description,
                    'updated_at' => now(),
                ]);

            DB::table('subscription_plans')->updateOrInsert(
                [
                    'product' => 'crm',
                    'code' => $plan->code,
                ],
                [
                    'name' => $plan->name,
                    'description' => $description,
                    'monthly_price' => $plan->monthly_price,
                    'monthly_promo_price' => null,
                    'yearly_price' => $plan->yearly_price,
                    'yearly_promo_price' => null,
                    'limits' => $plan->limits,
                    'is_active' => $plan->is_active,
                    'sort_order' => $plan->sort_order,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }

        $uniqueIndex = 'subscription_plans_product_code_unique';
        $catalogIndex = 'subscription_plans_catalog_index';

        $indexExists = function (string $name) use ($driver): bool {
            if ($driver === 'sqlite') {
                return DB::table('sqlite_master')
                    ->where('type', 'index')
                    ->where('name', $name)
                    ->exists();
            }

            return false;
        };

        if (! $indexExists($uniqueIndex)) {
            Schema::table(
                'subscription_plans',
                fn (Blueprint $table) =>
                    $table->unique(
                        ['product', 'code'],
                        $uniqueIndex
                    ),
            );
        }

        if (! $indexExists($catalogIndex)) {
            Schema::table(
                'subscription_plans',
                fn (Blueprint $table) =>
                    $table->index(
                        ['product', 'is_active', 'sort_order'],
                        $catalogIndex
                    ),
            );
        }
    }

    public function down(): void
    {
        DB::table('subscription_plans')
            ->where('product', 'crm')
            ->delete();

        Schema::table(
            'subscription_plans',
            function (Blueprint $table): void {
                $table->dropUnique(
                    'subscription_plans_product_code_unique'
                );

                $table->dropIndex(
                    'subscription_plans_catalog_index'
                );

                $table->dropColumn([
                    'product',
                    'description',
                    'monthly_promo_price',
                    'yearly_promo_price',
                ]);

                $table->unique('code');
            },
        );
    }
};
