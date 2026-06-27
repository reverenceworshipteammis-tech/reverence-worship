<?php

namespace App\Http\Controllers\Discipline;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DisciplineController extends Controller
{
    public function index(Request $request)
    {
        $startDate = $request->get('start_date', date('Y-m-01'));
        $endDate = $request->get('end_date', date('Y-m-t'));

        // Get statistics for the selected time range
        $stats = DB::selectOne("
            SELECT
                (SELECT COUNT(*)
                 FROM (
                     SELECT DISTINCT DATE(created_at) as session_date, title
                     FROM discipline_records
                     WHERE created_at::date BETWEEN ?::date AND ?::date
                 ) discipline_sessions) as total_discipline_sessions,
                (SELECT COALESCE(ROUND(AVG(CASE WHEN type = 'positive' THEN 100 ELSE 0 END), 0), 0)
                 FROM discipline_records
                 WHERE created_at::date BETWEEN ?::date AND ?::date) as avg_good_behavior,
                (SELECT COUNT(*)
                 FROM (
                     SELECT DISTINCT session_date, session_type
                     FROM attendance_records
                     WHERE session_date BETWEEN ?::date AND ?::date
                 ) attendance_sessions) as attendance_sessions,
                (SELECT COUNT(*)
                 FROM permission_requests
                 WHERE created_at::date BETWEEN ?::date AND ?::date) as permission_requests
        ", [
            $startDate, $endDate,
            $startDate, $endDate,
            $startDate, $endDate,
            $startDate, $endDate,
        ]) ?? (object)[
            'total_discipline_sessions' => 0,
            'avg_good_behavior' => 0,
            'attendance_sessions' => 0,
            'permission_requests' => 0
        ];

        // Get recent attendance sessions
        $recentAttendanceSessions = DB::select("
            SELECT DISTINCT ON (ar.session_date, ar.session_type)
                   ar.session_date,
                   ar.session_type,
                   TO_CHAR(ar.session_date, 'DD/MM/YYYY') as formatted_date
            FROM attendance_records ar
            WHERE ar.session_date BETWEEN ?::date AND ?::date
            ORDER BY ar.session_date DESC, ar.session_type ASC, ar.created_at DESC
            LIMIT 5
        ", [$startDate, $endDate]);

        // Get recent permission requests
        $recentPermissions = DB::select("
            SELECT pr.*, u.name as user_name, u.email as user_email,
                   TO_CHAR(pr.created_at, 'DD/MM/YYYY') as formatted_date
            FROM permission_requests pr
            JOIN users u ON u.id = pr.user_id
            WHERE pr.created_at::date BETWEEN ?::date AND ?::date
            ORDER BY pr.created_at DESC
            LIMIT 5
        ", [$startDate, $endDate]);

        // Get all users and discipline sections for filter dropdowns and modals
        $users = DB::select("SELECT id, name, email FROM users ORDER BY name");
        $sections = DB::select("SELECT id, name FROM discipline_sections ORDER BY sort_order, name");

        return view('modules.discipline.index', compact('stats', 'recentAttendanceSessions', 'recentPermissions', 'users', 'sections', 'startDate', 'endDate'));
    }

    public function getOverview()
    {
        $startDate = request()->get('start_date', date('Y-m-01'));
        $endDate = request()->get('end_date', date('Y-m-t'));

        $stats = DB::selectOne("
            SELECT
                (SELECT COUNT(*)
                 FROM (
                     SELECT DISTINCT DATE(created_at) as session_date, title
                     FROM discipline_records
                     WHERE created_at::date BETWEEN ?::date AND ?::date
                 ) discipline_sessions) as total_sessions,
                (SELECT COALESCE(ROUND(AVG(CASE WHEN type = 'positive' THEN 100 ELSE 0 END), 0), 0)
                 FROM discipline_records
                 WHERE created_at::date BETWEEN ?::date AND ?::date) as good_behavior_percentage,
                (SELECT COUNT(*)
                 FROM (
                     SELECT DISTINCT session_date, session_type
                     FROM attendance_records
                     WHERE session_date BETWEEN ?::date AND ?::date
                 ) attendance_sessions) as total_attendance,
                (SELECT COUNT(*)
                 FROM permission_requests
                 WHERE created_at::date BETWEEN ?::date AND ?::date) as total_permissions
        ", [
            $startDate, $endDate,
            $startDate, $endDate,
            $startDate, $endDate,
            $startDate, $endDate,
        ]) ?? [];

        $recentActivities = DB::select("
            (SELECT 'discipline' as type, dr.title, dr.created_at, u.name as user_name,
                    TO_CHAR(dr.created_at, 'DD/MM/YYYY') as formatted_date
             FROM discipline_records dr
             JOIN users u ON u.id = dr.user_id
             WHERE dr.created_at::date BETWEEN ?::date AND ?::date
             ORDER BY dr.created_at DESC
             LIMIT 5)
            UNION ALL
            (SELECT 'attendance' as type, ar.session_type as title, ar.created_at, u.name as user_name,
                    TO_CHAR(ar.created_at, 'DD/MM/YYYY') as formatted_date
             FROM attendance_records ar
             JOIN users u ON u.id = ar.user_id
             WHERE ar.session_date BETWEEN ?::date AND ?::date
             ORDER BY ar.created_at DESC
             LIMIT 5)
            UNION ALL
            (SELECT 'permission' as type, pr.type as title, pr.created_at, u.name as user_name,
                    TO_CHAR(pr.created_at, 'DD/MM/YYYY') as formatted_date
             FROM permission_requests pr
             JOIN users u ON u.id = pr.user_id
             WHERE pr.created_at::date BETWEEN ?::date AND ?::date
             ORDER BY pr.created_at DESC
             LIMIT 5)
            ORDER BY created_at DESC
            LIMIT 10
        ", [
            $startDate, $endDate,
            $startDate, $endDate,
            $startDate, $endDate,
        ]);

        return response()->json([
            'success' => true,
            'stats' => $stats,
            'recent_activities' => $recentActivities
        ]);
    }
}