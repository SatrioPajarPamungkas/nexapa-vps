<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('connected_accounts', function (Blueprint $table) {
            if (! Schema::hasColumn('connected_accounts', 'is_publishable')) {
                $table->boolean('is_publishable')
                    ->default(true)
                    ->after('account_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('connected_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('connected_accounts', 'is_publishable')) {
                $table->dropColumn('is_publishable');
            }
        });
    }
};
