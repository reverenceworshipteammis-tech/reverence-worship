<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('action_plans', 'start_date')) {
            Schema::table('action_plans', function (Blueprint $table) {
                $table->date('start_date')->nullable();
            });
        }

        DB::statement("
            UPDATE action_plans
            SET start_date = COALESCE(start_date, due_date, created_at::date, CURRENT_DATE)
        ");
    }

    public function down(): void
    {
        if (Schema::hasColumn('action_plans', 'start_date')) {
            Schema::table('action_plans', function (Blueprint $table) {
                $table->dropColumn('start_date');
            });
        }
    }
};
