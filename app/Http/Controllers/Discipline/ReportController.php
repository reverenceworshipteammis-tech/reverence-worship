<?php

namespace App\Http\Controllers\Discipline;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index()
    {
        return view('modules.discipline.partials.reports-tab');
    }

    public function generate(Request $request)
    {
        try {
            $type = $request->get('type', 'attendance');

            switch ($type) {
                case 'attendance':
                    $report = $this->buildAttendanceReport($request);
                    return response()->json(array_merge(['success' => true], $report));

                case 'discipline':
                    return response()->json([
                        'success' => true,
                        'discipline_summary' => $this->buildDisciplineSummary(),
                    ]);

                case 'combined':
                    return response()->json([
                        'success' => true,
                        'attendance_summary' => $this->buildMonthAttendanceSummary(),
                        'discipline_summary' => $this->buildDisciplineSummary(),
                        'permission_summary' => $this->buildPermissionSummary(),
                        'top_performers' => $this->buildTopPerformers(),
                    ]);

                case 'permission':
                    return response()->json([
                        'success' => true,
                        'permission_summary' => $this->buildPermissionSummary(),
                    ]);

                default:
                    $report = $this->buildAttendanceReport($request);
                    return response()->json(array_merge(['success' => true], $report));
            }
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function export(Request $request)
    {
        try {
            $type = $request->get('type', 'attendance');
            $format = $request->get('format', 'detailed');

            if ($type === 'attendance') {
                $report = $this->buildAttendanceReport($request);

                if ($format === 'summary') {
                    $rows = $this->formatAttendanceSummaryForExport($report['attendance_user_summary'] ?? []);
                    return $this->exportToCsv($rows, 'attendance_summary_' . $this->rangeSuffix($report['report_range']) . '.csv');
                }

                return $this->exportToCsv($report['attendance_records'] ?? [], 'attendance_records_' . $this->rangeSuffix($report['report_range']) . '.csv');
            }

            if ($type === 'discipline') {
                if ($format === 'summary') {
                    $fromDate = $request->get('from_date');
                    $toDate = $request->get('to_date');

                    $where = " WHERE 1=1 ";
                    $params = [];

                    if ($fromDate) {
                        $where .= " AND DATE(dr.created_at) >= ?";
                        $params[] = $fromDate;
                    }

                    if ($toDate) {
                        $where .= " AND DATE(dr.created_at) <= ?";
                        $params[] = $toDate;
                    }

                    $rows = DB::select("\n                        SELECT\n                            u.name as user_name,\n                            COUNT(DISTINCT CONCAT(DATE(dr.created_at), '|', COALESCE(dr.title, ''))) as number_sessions,\n                            COALESCE(SUM(dr.points), 0) as total_points,\n                            ROUND(
                                COALESCE(SUM(dr.points), 0)::numeric
                                / NULLIF(COUNT(DISTINCT CONCAT(DATE(dr.created_at), '|', COALESCE(dr.title, ''))), 0)
                                * 100,
                                1
                            ) as average_percentage\n                        FROM discipline_records dr\n                        JOIN users u ON u.id = dr.user_id\n                    " . $where . "\n                        GROUP BY u.id, u.name\n                        ORDER BY total_points DESC, number_sessions DESC, u.name ASC\n                    ", $params);

                    return $this->exportToCsv($this->formatDisciplineReportForExport($rows), 'discipline_report_' . date('Y-m') . '.csv');
                }

                $rows = DB::select("\n                    SELECT\n                        u.name as user_name,\n                        dr.title,\n                        dr.type,\n                        dr.points,\n                        dr.status,\n                        dr.created_at,\n                        dr.resolved_at,\n                        dr.resolved_notes\n                    FROM discipline_records dr\n                    JOIN users u ON u.id = dr.user_id\n                    WHERE dr.created_at >= date_trunc('month', CURRENT_DATE)\n                    ORDER BY dr.created_at DESC, u.name\n                ");

                return $this->exportToCsv($rows, 'discipline_report_' . date('Y-m') . '.csv');
            }

            if ($type === 'permission') {
                $status = $request->get('status');
                $search = $request->get('search');
                $fromDate = $request->get('from_date');
                $toDate = $request->get('to_date');
                $userId = $request->get('user_id');

                $where = " WHERE 1=1 ";
                $params = [];

                if ($status && $status !== 'all') {
                    $where .= " AND pr.status = ?";
                    $params[] = $status;
                }

                if ($userId) {
                    $where .= " AND pr.user_id = ?";
                    $params[] = $userId;
                }

                if ($search) {
                    $where .= " AND (u.name ILIKE ? OR u.email ILIKE ? OR pr.reason ILIKE ? OR pr.rejection_reason ILIKE ?)";
                    $searchParam = "%{$search}%";
                    $params[] = $searchParam;
                    $params[] = $searchParam;
                    $params[] = $searchParam;
                    $params[] = $searchParam;
                }

                if ($fromDate) {
                    $where .= " AND DATE(pr.created_at) >= ?";
                    $params[] = $fromDate;
                }

                if ($toDate) {
                    $where .= " AND DATE(pr.created_at) <= ?";
                    $params[] = $toDate;
                }

                $rows = DB::select("\n                    SELECT\n                        u.name as user_name,\n                        au.name as approved_by_name,\n                        pr.type,\n                        pr.start_date,\n                        pr.end_date,\n                        pr.status,\n                        pr.reason,\n                        pr.rejection_reason,\n                        pr.approved_at,\n                        pr.created_at\n                    FROM permission_requests pr\n                    JOIN users u ON u.id = pr.user_id\n                    LEFT JOIN users au ON au.id = pr.approved_by\n                " . $where . "\n                    ORDER BY pr.created_at DESC, u.name\n                ", $params);

                return $this->exportToCsv($this->formatPermissionReportForExport($rows), 'permission_report_' . date('Y-m') . '.csv');
            }

            if ($type === 'combined') {
                $report = [
                    ['metric' => 'attendance_total_records', 'value' => $this->buildMonthAttendanceSummary()->total_records ?? 0],
                    ['metric' => 'attendance_present_count', 'value' => $this->buildMonthAttendanceSummary()->present_count ?? 0],
                    ['metric' => 'attendance_late_count', 'value' => $this->buildMonthAttendanceSummary()->late_count ?? 0],
                    ['metric' => 'discipline_total_records', 'value' => $this->buildDisciplineSummary()->total_records ?? 0],
                    ['metric' => 'discipline_positive_count', 'value' => $this->buildDisciplineSummary()->positive_count ?? 0],
                    ['metric' => 'permission_total_requests', 'value' => $this->buildPermissionSummary()->total_requests ?? 0],
                ];

                $performers = $this->buildTopPerformers();
                foreach ($performers as $index => $performer) {
                    $report[] = [
                        'metric' => 'top_performer_' . ($index + 1),
                        'value' => $performer->user_name . ' (+'.($performer->positive_points ?? 0).')',
                    ];
                }

                return $this->exportToCsv($report, 'combined_report_' . date('Y-m') . '.csv');
            }

            return response()->json([
                'success' => false,
                'message' => 'Invalid export type',
            ], 400);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function buildAttendanceReport(Request $request): array
    {
        [$startAt, $endAt] = $this->resolveDateTimeRange($request);
        $rangeLabel = $startAt->format('M d, Y H:i') . ' to ' . $endAt->format('M d, Y H:i');

        $summary = DB::selectOne("\n            SELECT\n                COUNT(*) as total_records,\n                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,\n                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,\n                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,\n                SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count,\n                COALESCE(SUM(discipline_points), 0) as total_points,\n                ROUND(COALESCE(AVG(discipline_points), 0), 1) as avg_points,\n                COUNT(DISTINCT user_id) as unique_users,\n                COALESCE(\n                    (\n                        (\n                            COALESCE(SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END), 0)\n                            + COALESCE(SUM(CASE WHEN COALESCE(on_time, false) = TRUE THEN 1 ELSE 0 END), 0)\n                            + COALESCE(SUM(CASE WHEN COALESCE(communicated, false) = TRUE THEN 1 ELSE 0 END), 0)\n                            + COALESCE(SUM(discipline_points), 0)\n                        )::numeric\n                        / NULLIF(COUNT(*) * 4, 0)\n                    ) * 100,\n                    0\n                ) as average_percentage,\n                ROUND(COALESCE((SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 0), 1) as attendance_rate\n            FROM attendance_records\n            WHERE created_at BETWEEN ? AND ?\n        ", [$startAt->format('Y-m-d H:i:s'), $endAt->format('Y-m-d H:i:s')]);

        $records = DB::select("\n            SELECT\n                ar.*,\n                u.name as user_name,\n                u.email as user_email,\n                mu.name as marked_by_name,\n                TO_CHAR(ar.created_at, 'YYYY-MM-DD HH24:MI') as created_at_formatted\n            FROM attendance_records ar\n            JOIN users u ON u.id = ar.user_id\n            LEFT JOIN users mu ON mu.id = ar.marked_by\n            WHERE ar.created_at BETWEEN ? AND ?\n            ORDER BY ar.created_at DESC, u.name ASC\n        ", [$startAt->format('Y-m-d H:i:s'), $endAt->format('Y-m-d H:i:s')]);

        $userSummary = DB::select("\n            SELECT\n                u.name as user_name,\n                COUNT(*) as number_sessions,\n                SUM(CASE WHEN COALESCE(ar.status, '') IN ('present', 'late') THEN 1 ELSE 0 END) as presence_count,\n                SUM(CASE WHEN COALESCE(ar.on_time, false) = TRUE THEN 1 ELSE 0 END) as timeliness_count,\n                SUM(CASE WHEN COALESCE(ar.communicated, false) = TRUE THEN 1 ELSE 0 END) as communication_count,\n                COALESCE(SUM(ar.discipline_points), 0) as discipline_points,\n                COALESCE(\n                    (\n                        (\n                            SUM(CASE WHEN COALESCE(ar.status, '') IN ('present', 'late') THEN 1 ELSE 0 END)\n                            + SUM(CASE WHEN COALESCE(ar.on_time, false) = TRUE THEN 1 ELSE 0 END)\n                            + SUM(CASE WHEN COALESCE(ar.communicated, false) = TRUE THEN 1 ELSE 0 END)\n                            + COALESCE(SUM(ar.discipline_points), 0)\n                        )::numeric\n                        / NULLIF(COUNT(*) * 4, 0)\n                    ) * 100,\n                    0\n                ) as average_percentage,\n                COALESCE(\n                    SUM(CASE WHEN COALESCE(ar.status, '') IN ('present', 'late') THEN 1 ELSE 0 END)\n                    + SUM(CASE WHEN COALESCE(ar.on_time, false) = TRUE THEN 1 ELSE 0 END)\n                    + SUM(CASE WHEN COALESCE(ar.communicated, false) = TRUE THEN 1 ELSE 0 END)\n                    + COALESCE(SUM(ar.discipline_points), 0),\n                    0\n                ) as total_marks\n            FROM attendance_records ar\n            JOIN users u ON u.id = ar.user_id\n            WHERE ar.created_at BETWEEN ? AND ?\n            GROUP BY u.id, u.name\n            ORDER BY total_marks DESC, discipline_points DESC, communication_count DESC, timeliness_count DESC, presence_count DESC, u.name ASC\n        ", [$startAt->format('Y-m-d H:i:s'), $endAt->format('Y-m-d H:i:s')]);

        $userSummary = array_map(function ($row, $index) {
            $row->no = $index + 1;
            $row->names = $row->user_name ?? 'N/A';
            return $row;
        }, $userSummary, array_keys($userSummary));

        $summaryObject = $summary ?: (object) [
            'total_records' => 0,
            'present_count' => 0,
            'absent_count' => 0,
            'late_count' => 0,
            'excused_count' => 0,
            'total_points' => 0,
            'avg_points' => 0,
            'unique_users' => 0,
            'average_percentage' => 0,
            'attendance_rate' => 0,
        ];

        // Keep old keys alive for other report components.
        $summaryObject->total_sessions = $summaryObject->total_records ?? 0;

        return [
            'attendance_summary' => $summaryObject,
            'attendance_records' => $records,
            'attendance_user_summary' => $userSummary,
            'report_range' => [
                'start' => $startAt->format('Y-m-d\\TH:i'),
                'end' => $endAt->format('Y-m-d\\TH:i'),
                'label' => $rangeLabel,
            ],
        ];
    }

    private function buildMonthAttendanceSummary()
    {
        $summary = DB::selectOne("\n            SELECT\n                COUNT(*) as total_records,\n                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,\n                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,\n                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,\n                SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count,\n                COALESCE(SUM(discipline_points), 0) as total_points,\n                ROUND(COALESCE(AVG(discipline_points), 0), 1) as avg_points,\n                COUNT(DISTINCT user_id) as unique_users,\n                ROUND(COALESCE((SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0)) * 100, 0), 1) as attendance_rate\n            FROM attendance_records\n            WHERE created_at >= date_trunc('month', CURRENT_DATE)\n        ");

        $summaryObject = $summary ?: (object) [
            'total_records' => 0,
            'present_count' => 0,
            'absent_count' => 0,
            'late_count' => 0,
            'excused_count' => 0,
            'total_points' => 0,
            'avg_points' => 0,
            'unique_users' => 0,
            'average_percentage' => 0,
            'attendance_rate' => 0,
        ];

        $summaryObject->total_sessions = $summaryObject->total_records ?? 0;

        return $summaryObject;
    }

    private function buildDisciplineSummary()
    {
        $summary = DB::selectOne("\n            SELECT\n                COUNT(*) as total_records,\n                SUM(CASE WHEN type = 'positive' THEN 1 ELSE 0 END) as positive_count,\n                SUM(CASE WHEN type = 'warning' THEN 1 ELSE 0 END) as warning_count,\n                SUM(CASE WHEN type = 'penalty' THEN 1 ELSE 0 END) as penalty_count,\n                SUM(CASE WHEN type = 'suspension' THEN 1 ELSE 0 END) as suspension_count,\n                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,\n                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,\n                COALESCE(AVG(points), 0) as avg_points\n            FROM discipline_records\n            WHERE created_at >= date_trunc('month', CURRENT_DATE)\n        ");

        return $summary ?: (object) [
            'total_records' => 0,
            'positive_count' => 0,
            'warning_count' => 0,
            'penalty_count' => 0,
            'suspension_count' => 0,
            'active_count' => 0,
            'resolved_count' => 0,
            'avg_points' => 0,
        ];
    }

    private function buildPermissionSummary()
    {
        $summary = DB::selectOne("\n            SELECT\n                COUNT(*) as total_requests,\n                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,\n                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,\n                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,\n                ROUND(COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) * 100, 0), 1) as approval_rate\n            FROM permission_requests\n            WHERE created_at >= date_trunc('month', CURRENT_DATE)\n        ");

        return $summary ?: (object) [
            'total_requests' => 0,
            'pending_count' => 0,
            'approved_count' => 0,
            'rejected_count' => 0,
            'approval_rate' => 0,
        ];
    }

    private function buildTopPerformers()
    {
        return DB::select("\n            SELECT\n                u.id,\n                u.name as user_name,\n                COUNT(CASE WHEN dr.type = 'positive' THEN 1 END) as positive_points,\n                COUNT(CASE WHEN dr.type IN ('warning', 'penalty', 'suspension') THEN 1 END) as negative_points\n            FROM users u\n            LEFT JOIN discipline_records dr ON dr.user_id = u.id\n            WHERE dr.created_at >= date_trunc('month', CURRENT_DATE) OR dr.created_at IS NULL\n            GROUP BY u.id, u.name\n            ORDER BY positive_points DESC, negative_points ASC, u.name ASC\n            LIMIT 5\n        ");
    }

    private function resolveDateTimeRange(Request $request): array
    {
        $startRaw = $request->get('start_at', now()->startOfMonth()->format('Y-m-d\\TH:i'));
        $endRaw = $request->get('end_at', now()->format('Y-m-d\\TH:i'));

        try {
            $startAt = Carbon::parse($startRaw);
        } catch (\Throwable $e) {
            $startAt = now()->startOfMonth()->startOfDay();
        }

        try {
            $endAt = Carbon::parse($endRaw);
        } catch (\Throwable $e) {
            $endAt = now();
        }

        if ($endAt->lt($startAt)) {
            [$startAt, $endAt] = [$endAt->copy()->startOfDay(), $startAt->copy()->endOfDay()];
        }

        return [$startAt, $endAt];
    }

    private function rangeSuffix(?array $range): string
    {
        if (!$range) {
            return date('Y-m-d');
        }

        return str_replace([' ', ':', 'T'], ['_', '-', '_'], ($range['start'] ?? date('Y-m-d')) . '_to_' . ($range['end'] ?? date('Y-m-d')));
    }

    private function formatAttendanceSummaryForExport(array $rows): array
    {
        return array_values(array_map(function ($row, $index) {
            return [
                'No' => $index + 1,
                'Names' => $row->user_name ?? 'N/A',
                'Number of Sessions' => (int) ($row->number_sessions ?? 0),
                'Presence' => (int) ($row->presence_count ?? 0),
                'Timeliness' => (int) ($row->timeliness_count ?? 0),
                'Communication' => (int) ($row->communication_count ?? 0),
                'Discipline' => (int) ($row->discipline_points ?? 0),
                'Total Marks' => (int) ($row->total_marks ?? 0),
                'Average (%)' => rtrim(rtrim(number_format((float) ($row->average_percentage ?? 0), 1, '.', ''), '0'), '.') . '%',
            ];
        }, $rows, array_keys($rows)));
    }

    private function formatPermissionReportForExport(array $rows): array
    {
        return array_values(array_map(function ($row, $index) {
            $startDate = $row->start_date ?? null;
            $endDate = $row->end_date ?? null;
            $countOfDays = 0;

            if ($startDate && $endDate) {
                try {
                    $start = Carbon::parse($startDate);
                    $end = Carbon::parse($endDate);
                    $countOfDays = max(1, $start->diffInDays($end) + 1);
                } catch (\Throwable $e) {
                    $countOfDays = 0;
                }
            }

            $approver = $row->approved_by_name ?? 'N/A';
            $comment = 'Pending';

            if (($row->status ?? '') === 'approved') {
                $comment = 'Approved';
            } elseif (($row->status ?? '') === 'rejected') {
                $comment = $row->rejection_reason ?? 'No rejection reason provided';
            }

            return [
                'No' => $index + 1,
                'Names' => $row->user_name ?? 'N/A',
                'Reason' => $row->reason ?? '-',
                'From' => $startDate ? Carbon::parse($startDate)->format('Y-m-d') : '-',
                'To' => $endDate ? Carbon::parse($endDate)->format('Y-m-d') : '-',
                'Count of days' => $countOfDays,
                'Status' => $row->status ?? 'pending',
                'Comment' => $comment,
                'Approver' => $approver,
            ];
        }, $rows, array_keys($rows)));
    }

    private function formatDisciplineReportForExport(array $rows): array
    {
        return array_values(array_map(function ($row, $index) {
            $averagePercentage = $row->average_percentage ?? $row->average_points ?? 0;

            return [
                'No' => $index + 1,
                'Names' => $row->user_name ?? 'N/A',
                'Number of Sessions' => (int) ($row->number_sessions ?? 0),
                'Total Points' => (int) ($row->total_points ?? 0),
                'Average (%)' => rtrim(rtrim(number_format((float) $averagePercentage, 1, '.', ''), '0'), '.') . '%',
            ];
        }, $rows, array_keys($rows)));
    }

    private function exportToCsv($data, $filename)
    {
        if (empty($data)) {
            return response()->json([
                'success' => false,
                'message' => 'No data to export',
            ], 404);
        }

        $headers = array_keys((array) $data[0]);

        $callback = function () use ($data, $headers) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);

            foreach ($data as $row) {
                fputcsv($file, (array) $row);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename=' . $filename,
        ]);
    }
}
















