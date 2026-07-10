<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $indexes = [
            'role_user' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_role_user_user_role ON role_user (user_id, role_id)',
                'CREATE INDEX IF NOT EXISTS idx_perf_role_user_role_user ON role_user (role_id, user_id)',
            ],
            'roles' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_roles_name ON roles (name)',
            ],
            'pages' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_pages_name ON pages (name)',
                'CREATE INDEX IF NOT EXISTS idx_perf_pages_active_sort ON pages (is_active, sort_order)',
            ],
            'features' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_features_name ON features (name)',
            ],
            'role_page_features' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_rpf_role_page_feature ON role_page_features (role_id, page_id, feature_id)',
                'CREATE INDEX IF NOT EXISTS idx_perf_rpf_page_feature_role ON role_page_features (page_id, feature_id, role_id)',
            ],
            'announcements' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_announcements_status_created ON announcements (status, created_at DESC)',
            ],
            'announcement_user_reads' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_announcement_reads_user_announcement ON announcement_user_reads (user_id, announcement_id)',
            ],
            'forms' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_forms_active_created ON forms (is_active, created_at DESC)',
            ],
            'form_submissions' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_form_submissions_user_form ON form_submissions (user_id, form_id)',
                'CREATE INDEX IF NOT EXISTS idx_perf_form_submissions_user_release ON form_submissions (user_id, is_released, released_at)',
            ],
            'form_result_notification_reads' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_form_result_reads_user_submission ON form_result_notification_reads (user_id, submission_id)',
            ],
            'permission_requests' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_permission_requests_status ON permission_requests (status)',
            ],
            'tasks' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_tasks_assigned_status ON tasks (assigned_to, status)',
            ],
            'expenses' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_expenses_status_approver1 ON expenses (status, approver_id_1)',
                'CREATE INDEX IF NOT EXISTS idx_perf_expenses_status_approver2 ON expenses (status, approver_id_2)',
            ],
            'users' => [
                'CREATE INDEX IF NOT EXISTS idx_perf_users_pending ON users (is_active, created_by, email_verified_at)',
            ],
        ];

        foreach ($indexes as $table => $statements) {
            if (!Schema::hasTable($table)) {
                continue;
            }

            foreach ($statements as $statement) {
                DB::statement($statement);
            }
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $indexNames = [
            'idx_perf_role_user_user_role',
            'idx_perf_role_user_role_user',
            'idx_perf_roles_name',
            'idx_perf_pages_name',
            'idx_perf_pages_active_sort',
            'idx_perf_features_name',
            'idx_perf_rpf_role_page_feature',
            'idx_perf_rpf_page_feature_role',
            'idx_perf_announcements_status_created',
            'idx_perf_announcement_reads_user_announcement',
            'idx_perf_forms_active_created',
            'idx_perf_form_submissions_user_form',
            'idx_perf_form_submissions_user_release',
            'idx_perf_form_result_reads_user_submission',
            'idx_perf_permission_requests_status',
            'idx_perf_tasks_assigned_status',
            'idx_perf_expenses_status_approver1',
            'idx_perf_expenses_status_approver2',
            'idx_perf_users_pending',
        ];

        foreach ($indexNames as $indexName) {
            DB::statement("DROP INDEX IF EXISTS {$indexName}");
        }
    }
};
