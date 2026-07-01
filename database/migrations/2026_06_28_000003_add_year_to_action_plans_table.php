<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('action_plans', 'year')) {
            Schema::table('action_plans', function (Blueprint $table) {
                $table->integer('year')->nullable();
            });
        }

        DB::statement("
            UPDATE action_plans
            SET year = COALESCE(
                year,
                EXTRACT(YEAR FROM due_date)::integer,
                EXTRACT(YEAR FROM created_at)::integer,
                EXTRACT(YEAR FROM CURRENT_DATE)::integer
            )
        ");
    }

    public function down(): void
    {
        if (Schema::hasColumn('action_plans', 'year')) {
            Schema::table('action_plans', function (Blueprint $table) {
                $table->dropColumn('year');
            });
        }
    }
};
