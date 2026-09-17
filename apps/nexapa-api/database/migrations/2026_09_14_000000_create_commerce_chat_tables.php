<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commerce_chat_conversations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('commerce_order_id')->unique()
                ->constrained('commerce_orders')->cascadeOnDelete();
            $table->foreignId('commerce_customer_id')
                ->constrained('commerce_customers')->cascadeOnDelete();
            $table->string('status', 20)->default('open');
            $table->timestampTz('customer_last_read_at')->nullable();
            $table->timestampTz('admin_last_read_at')->nullable();
            $table->timestampTz('last_message_at')->nullable()->index();
            $table->timestampsTz();
            $table->index(['commerce_customer_id', 'last_message_at'], 'commerce_chat_customer_last_idx');
        });

        Schema::create('commerce_chat_messages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('commerce_chat_conversation_id')
                ->constrained('commerce_chat_conversations')->cascadeOnDelete();
            $table->string('sender_type', 20);
            $table->unsignedBigInteger('sender_id')->nullable();
            $table->string('sender_name', 160);
            $table->text('body')->nullable();
            $table->timestampsTz();
            $table->index(
                ['commerce_chat_conversation_id', 'created_at'],
                'commerce_chat_messages_time_idx'
            );
        });

        Schema::create('commerce_chat_attachments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('commerce_chat_message_id')
                ->constrained('commerce_chat_messages')->cascadeOnDelete();
            $table->string('disk', 40)->default('local');
            $table->string('path', 1024);
            $table->string('original_name', 255);
            $table->string('mime_type', 160)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commerce_chat_attachments');
        Schema::dropIfExists('commerce_chat_messages');
        Schema::dropIfExists('commerce_chat_conversations');
    }
};
