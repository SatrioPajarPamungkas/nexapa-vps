<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('commerce_products', function (Blueprint $table) {
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamp('expiration_warning_sent_at')->nullable();
            $table->timestamp('expired_at')->nullable();
            $table->timestamp('first_sold_at')->nullable();
            $table->unsignedInteger('republished_count')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('commerce_products', function (Blueprint $table) {
            $table->dropIndex(['expires_at']);
            $table->dropColumn([
                'expires_at',
                'expiration_warning_sent_at',
                'expired_at',
                'first_sold_at',
                'republished_count',
            ]);
        });
    }
};
