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
        if (Schema::hasTable('announcement_user_reads')) {
            return;
        }

        Schema::create('announcement_user_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('announcement_id')->constrained('announcements')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('read_at')->nullable()->useCurrent();
            $table->timestamps();

            $table->unique(['announcement_id', 'user_id']);
            $table->index('announcement_id', 'idx_announcement_user_reads_announcement');
            $table->index('user_id', 'idx_announcement_user_reads_user');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('announcement_user_reads');
    }
};
