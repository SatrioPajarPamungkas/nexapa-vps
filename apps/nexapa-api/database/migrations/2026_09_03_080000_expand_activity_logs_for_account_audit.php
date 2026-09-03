<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_logs', function (Blueprint $table): void {
            $table->string('actor_name')->nullable()->after('user_id');
            $table->string('actor_email')->nullable()->after('actor_name');
            $table->string('product', 32)->nullable()->index()->after('platform');
            $table->string('ip_address', 45)->nullable()->index()->after('metadata');
            $table->text('user_agent')->nullable()->after('ip_address');

            $table->index(['user_id', 'created_at']);
            $table->index(['action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table): void {
            $table->dropIndex(['user_id', 'created_at']);
            $table->dropIndex(['action', 'created_at']);
            $table->dropIndex(['product']);
            $table->dropIndex(['ip_address']);
            $table->dropColumn([
                'actor_name',
                'actor_email',
                'product',
                'ip_address',
                'user_agent',
            ]);
        });
    }
};
