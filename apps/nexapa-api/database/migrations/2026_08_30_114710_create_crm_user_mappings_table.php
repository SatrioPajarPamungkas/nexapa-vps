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
            'crm_user_mappings',
            function (Blueprint $table): void {
                $table->id();

                $table->foreignId('publisher_user_id')
                    ->unique()
                    ->constrained('users')
                    ->cascadeOnDelete();

                $table->uuid('crm_user_id')
                    ->unique();

                $table->uuid('crm_account_id')
                    ->nullable()
                    ->index();

                $table->uuid('crm_profile_id')
                    ->nullable()
                    ->index();

                $table->timestamp('provisioned_at')
                    ->nullable();

                $table->timestamps();
            }
        );

        // Salin mapping akun lama dari subscription terbaru.
        $subscriptions = DB::table('subscriptions')
            ->whereNotNull('publisher_user_id')
            ->whereNotNull('crm_user_id')
            ->orderByDesc('id')
            ->get([
                'publisher_user_id',
                'crm_user_id',
                'crm_account_id',
                'created_at',
                'updated_at',
            ])
            ->unique('publisher_user_id');

        foreach ($subscriptions as $subscription) {
            DB::table('crm_user_mappings')->insertOrIgnore([
                'publisher_user_id' =>
                    $subscription->publisher_user_id,
                'crm_user_id' =>
                    $subscription->crm_user_id,
                'crm_account_id' =>
                    $subscription->crm_account_id,
                'crm_profile_id' => null,
                'provisioned_at' =>
                    $subscription->created_at ?? now(),
                'created_at' =>
                    $subscription->created_at ?? now(),
                'updated_at' =>
                    $subscription->updated_at ?? now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_user_mappings');
    }
};
