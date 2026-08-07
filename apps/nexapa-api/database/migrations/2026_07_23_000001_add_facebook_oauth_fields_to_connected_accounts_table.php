<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('connected_accounts', function (Blueprint $table) {
            // Account type for distinguishing facebook_admin vs facebook_page
            $table->string('account_type')->nullable()->after('platform');
            
            // Parent relationship for Facebook Pages -> Facebook Admin
            $table->uuid('parent_connected_account_id')->nullable()->after('account_type');
            
            // Add foreign key for parent relationship
            $table->foreign('parent_connected_account_id')
                ->references('id')
                ->on('connected_accounts')
                ->onDelete('cascade');
            
            // Add indexes for efficient queries
            $table->index(['account_type']);
            $table->index(['parent_connected_account_id']);
            $table->index(['platform', 'account_type']);
            
            // Add uniqueness constraint for facebook_admin (user + platform + external_account_id)
            // and facebook_page (user + platform + external_account_id)
            // The existing unique constraint already covers this
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('connected_accounts', function (Blueprint $table) {
            $table->dropForeign(['parent_connected_account_id']);
            $table->dropIndex(['account_type']);
            $table->dropIndex(['parent_connected_account_id']);
            $table->dropIndex(['platform', 'account_type']);
            $table->dropColumn(['account_type', 'parent_connected_account_id']);
        });
    }
};
