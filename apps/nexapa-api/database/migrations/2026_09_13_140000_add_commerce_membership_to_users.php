<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('commerce_registered_at')
                ->nullable()
                ->after('commerce_access_status')
                ->index();
        });

        // Identitas pusat bukan otomatis user Commerce.
        DB::table('users')
            ->where('is_admin', false)
            ->update([
                'commerce_access_status' =>
                    'not_provisioned',
                'commerce_registered_at' => null,
                'commerce_suspended_at' => null,
                'commerce_suspension_reason' => null,
            ]);

        // Pertahankan pembeli nyata sebagai user Commerce.
        if (Schema::hasTable('commerce_orders')) {
            $buyers = DB::table('commerce_orders')
                ->whereNotNull('user_id')
                ->selectRaw(
                    'user_id, min(created_at) as first_order_at'
                )
                ->groupBy('user_id')
                ->get();

            foreach ($buyers as $buyer) {
                DB::table('users')
                    ->where('id', $buyer->user_id)
                    ->update([
                        'commerce_access_status' => 'active',
                        'commerce_registered_at' =>
                            $buyer->first_order_at ?? now(),
                    ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(
                'commerce_registered_at'
            );
        });
    }
};
