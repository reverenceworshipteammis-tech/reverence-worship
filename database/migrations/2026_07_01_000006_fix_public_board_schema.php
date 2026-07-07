<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('public_board')) {
            return;
        }

        $hasPublishingColumn = Schema::hasColumn('public_board', 'is_published');

        Schema::table('public_board', function (Blueprint $table) {
            if (!Schema::hasColumn('public_board', 'type')) {
                $table->string('type')->default('update');
            }

            if (!Schema::hasColumn('public_board', 'event_date')) {
                $table->dateTime('event_date')->nullable();
            }

            if (!Schema::hasColumn('public_board', 'location')) {
                $table->string('location')->nullable();
            }

            if (!Schema::hasColumn('public_board', 'image_path')) {
                $table->string('image_path')->nullable();
            }

            if (!Schema::hasColumn('public_board', 'is_published')) {
                $table->boolean('is_published')->default(false);
            }

            if (!Schema::hasColumn('public_board', 'is_pinned')) {
                $table->boolean('is_pinned')->default(false);
            }
        });

        if (!$hasPublishingColumn) {
            DB::table('public_board')->update(['is_published' => true]);
        }
    }

    public function down(): void
    {
        // Keep historical data intact on rollback.
    }
};
