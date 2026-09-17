<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('publisher_access_status', 20)
                ->default('active')
                ->index();
            $table->timestamp('publisher_suspended_at')
                ->nullable();
            $table->text('publisher_suspension_reason')
                ->nullable();

            $table->string('crm_access_status', 20)
                ->default('not_provisioned')
                ->index();
            $table->timestamp('crm_suspended_at')
                ->nullable();
            $table->text('crm_suspension_reason')
                ->nullable();

            $table->string('commerce_access_status', 20)
                ->default('active')
                ->index();
            $table->timestamp('commerce_suspended_at')
                ->nullable();
            $table->text('commerce_suspension_reason')
                ->nullable();
        });

        // Preserve every existing identity and its data.
        // Laravel users are existing Publisher identities and remain
        // eligible to use Commerce. CRM access is enabled only where
        // an explicit Publisher-to-CRM mapping already exists.
        DB::table('users')->update([
            'publisher_access_status' => 'active',
            'crm_access_status' => 'not_provisioned',
            'commerce_access_status' => 'active',
        ]);

        if (Schema::hasTable('crm_user_mappings')) {
            $mappedPublisherIds = DB::table(
                'crm_user_mappings'
            )
                ->whereNotNull('publisher_user_id')
                ->distinct()
                ->pluck('publisher_user_id');

            if ($mappedPublisherIds->isNotEmpty()) {
                DB::table('users')
                    ->whereIn('id', $mappedPublisherIds)
                    ->update([
                        'crm_access_status' => 'active',
                    ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'publisher_access_status',
                'publisher_suspended_at',
                'publisher_suspension_reason',
                'crm_access_status',
                'crm_suspended_at',
                'crm_suspension_reason',
                'commerce_access_status',
                'commerce_suspended_at',
                'commerce_suspension_reason',
            ]);
        });
    }
};
