<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('connected_accounts', function (Blueprint $table) {
            $table->json('scopes')->nullable()->after('metadata');
            $table->timestamp('refresh_token_expires_at')->nullable()->after('token_expires_at');
        });

        $duplicates = DB::table('connected_accounts')
            ->select('user_id', 'platform', 'external_account_id')
            ->whereNotNull('external_account_id')
            ->groupBy('user_id', 'platform', 'external_account_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        if ($duplicates->isNotEmpty()) {
            $details = $duplicates->map(function ($dup) {
                return "user_id={$dup->user_id}, platform={$dup->platform}, external_account_id={$dup->external_account_id}";
            })->join('; ');

            throw new \RuntimeException(
                "Duplicate connected accounts detected for TikTok OAuth uniqueness constraint. " .
                "Please resolve duplicates manually before running this migration. " .
                "Duplicates: {$details}"
            );
        }

        Schema::table('connected_accounts', function (Blueprint $table) {
            $table->unique(['user_id', 'platform', 'external_account_id'], 'connected_accounts_user_platform_external_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('connected_accounts', function (Blueprint $table) {
            $table->dropUnique('connected_accounts_user_platform_external_unique');
            $table->dropColumn(['scopes', 'refresh_token_expires_at']);
        });
    }
};
