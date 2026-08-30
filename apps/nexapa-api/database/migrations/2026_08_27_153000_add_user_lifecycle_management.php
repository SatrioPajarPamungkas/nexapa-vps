<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('is_suspended')
                ->default(false)
                ->after('is_admin');
            $table->timestamp('suspended_at')
                ->nullable()
                ->after('is_suspended');
            $table->softDeletes();
        });

        Schema::create(
            'admin_user_lifecycle_states',
            function (Blueprint $table): void {
                $table->id();
                $table->string('email')->unique();
                $table->string('publisher_user_id')->nullable();
                $table->uuid('crm_user_id')->nullable();
                $table->string('status', 20)->default('active');
                $table->foreignId('acted_by')->nullable();
                $table->timestamp('acted_at')->nullable();
                $table->timestamps();

                $table->index('status');
                $table->index('crm_user_id');
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_user_lifecycle_states');

        Schema::table('users', function (Blueprint $table): void {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'is_suspended',
                'suspended_at',
            ]);
        });
    }
};
