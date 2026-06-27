<?php

namespace App\Http\Controllers\Discipline;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $startDate = $request->get('start_date', date('Y-m-01'));
        $endDate = $request->get('end_date', date('Y-m-t'));
        $sessionType = $request->get('session_type');
        $userId = $request->get('user_id');
        
        try {
            $query = "
                SELECT ar.*, u.name as user_name, u.email as user_email,
                       mu.name as marked_by_name
                FROM attendance_records ar
                JOIN users u ON u.id = ar.user_id
                LEFT JOIN users mu ON mu.id = ar.marked_by
                WHERE ar.session_date BETWEEN ? AND ?
            ";
            
            $params = [$startDate, $endDate];
            
            if ($sessionType) {
                $query .= " AND ar.session_type = ?";
                $params[] = $sessionType;
            }
            
            if ($userId) {
                $query .= " AND ar.user_id = ?";
                $params[] = $userId;
            }
            
            $query .= " ORDER BY ar.session_date DESC, ar.created_at DESC";
            
            $attendances = DB::select($query, $params);
            
            Log::info('Attendance query result', [
                'count' => count($attendances),
                'start_date' => $startDate,
                'end_date' => $endDate
            ]);
            
            if ($request->ajax()) {
                $sessionTypes = DB::select("
                    SELECT DISTINCT session_type FROM attendance_records ORDER BY session_type
                ");
                
                return response()->json([
                    'success' => true,
                    'attendances' => $attendances,
                    'session_types' => $sessionTypes,
                    'count' => count($attendances)
                ]);
            }
            
            $users = DB::select("SELECT id, name, email FROM users ORDER BY name");
            $sessionTypes = DB::select("SELECT DISTINCT session_type FROM attendance_records ORDER BY session_type");
            
            return view('modules.discipline.partials.attendance-tab', compact('attendances', 'users', 'sessionTypes', 'startDate', 'endDate'));
            
        } catch (\Exception $e) {
            Log::error('Attendance index error: ' . $e->getMessage());
            
            if ($request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                    'attendances' => []
                ], 500);
            }
            
            throw $e;
        }
    }
    
 // Add this method to AttendanceController.php
public function getSessionDetails($date, $sessionType)
{
    try {
        $sessionType = urldecode($sessionType);
        $this->ensureAttendanceSessionsTable();
        $this->ensureAttendanceOnTimeColumn();
        $session = DB::selectOne("
            SELECT is_completed
            FROM attendance_sessions
            WHERE session_date = ? AND session_type = ?
        ", [$date, $sessionType]);
        $isCompleted = $this->truthy($session->is_completed ?? false);
        
        // Get all active users
        $allUsers = DB::select("SELECT id, name, email FROM users WHERE is_active = true ORDER BY name");
        
        // Get attendance records for this session
        $attendances = DB::select("
            SELECT ar.*, u.name as user_name
            FROM attendance_records ar
            JOIN users u ON u.id = ar.user_id
            WHERE ar.session_date = ? AND ar.session_type = ?
        ", [$date, $sessionType]);
        
        $attendanceMap = [];
        foreach ($attendances as $att) {
            $attendanceMap[$att->user_id] = $att;
        }
        
        // Get ALL permissions that cover this date
        $permissionsForDate = DB::select("
            SELECT 
                p.id, p.user_id, p.status, p.start_date, p.end_date, 
                p.type, p.reason, p.rejection_reason, p.approved_by,
                u.name as user_name, u.email as user_email,
                au.name as approved_by_name,
                TO_CHAR(p.start_date, 'YYYY-MM-DD') as start_date_formatted,
                TO_CHAR(p.end_date, 'YYYY-MM-DD') as end_date_formatted
            FROM permission_requests p
            LEFT JOIN users u ON u.id = p.user_id
            LEFT JOIN users au ON au.id = p.approved_by
            WHERE p.start_date <= ?::date AND p.end_date >= ?::date
            ORDER BY p.user_id
        ", [$date, $date]);
        
        $permissionMap = [];
        $pendingList = [];
        $rejectedList = [];
        $approvedCount = 0;
        $pendingCount = 0;
        $rejectedCount = 0;
        
        foreach ($permissionsForDate as $perm) {
            $permissionMap[$perm->user_id] = [
                'id' => $perm->id,
                'status' => $perm->status,
                'type' => $perm->type ?? null,
                'reason' => $perm->reason ?? 'No reason provided',
                'rejection_reason' => $perm->rejection_reason ?? null,
                'start_date' => $perm->start_date_formatted,
                'end_date' => $perm->end_date_formatted,
                'user_name' => $perm->user_name,
                'user_email' => $perm->user_email
            ];
            
            if ($perm->status === 'approved') {
                $approvedCount++;
            } elseif ($perm->status === 'pending') {
                $pendingCount++;
                $pendingList[] = $permissionMap[$perm->user_id];
            } elseif ($perm->status === 'rejected') {
                $rejectedCount++;
                $rejectedList[] = $permissionMap[$perm->user_id];
            }
        }
        
        // Build members list
        $members = [];
        foreach ($allUsers as $user) {
            $attendance = $attendanceMap[$user->id] ?? null;
            $permissionInfo = $permissionMap[$user->id] ?? null;
            $permissionStatus = $permissionInfo['status'] ?? null;
            $hasAttendance = $attendance !== null;
            
            $present = $attendance ? ($attendance->status == 'present' || $attendance->status == 'late') : false;
            $onTime = $attendance ? $this->truthy($attendance->on_time ?? false) : false;
            $communicated = $attendance ? ($attendance->communicated ?? false) : false;
            $discipline = $attendance ? (($attendance->discipline_points ?? 0) > 0) : false;
            
            $presentDisabled = false;
            $onTimeDisabled = false;
            
            if ($permissionStatus === 'approved') {
                $presentDisabled = true;
                $present = false;
                $onTime = true;
                $onTimeDisabled = true;
                $communicated = true;
                $discipline = true;
            }
            
            $points = 0;
            if ($permissionStatus === 'approved') {
                $points = 3;
            } elseif (!$hasAttendance) {
                $points = 4;
            } else {
                if ($present) $points++;
                if ($onTime) $points++;
                if ($communicated) $points++;
                if ($discipline) $points++;
            }
            
            $members[] = [
                'id' => $user->id,
                'user_id' => $user->id,
                'name' => $user->name,
                'user_name' => $user->name,
                'email' => $user->email,
                'user_email' => $user->email,
                'present' => $present,
                'on_time' => $onTime,
                'communicated' => $communicated,
                'discipline' => $discipline,
                'total_points' => $points,
                'has_permission' => $permissionInfo !== null,
                'has_attendance' => $hasAttendance,
                'permission_reason' => $permissionInfo['reason'] ?? null,
                'present_disabled' => $presentDisabled,
                'on_time_disabled' => $onTimeDisabled,
                'permission' => $permissionInfo
            ];
        }
        
        return response()->json([
            'success' => true,
            'date' => $date,
            'session_type' => $sessionType,
            'total_users' => count($allUsers),
            'approved_permissions' => $approvedCount,
            'pending_permissions' => $pendingCount,
            'rejected_permissions' => $rejectedCount,
            'is_completed' => $isCompleted,
            'pending_permissions_list' => $pendingList,
            'rejected_permissions_list' => $rejectedList,
            'members' => $members
        ]);
        
    } catch (\Exception $e) {
        Log::error('getSessionDetails error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => $e->getMessage()
        ], 500);
    }
}

    
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'session_date' => 'required|date',
            'session_type' => 'required|string|max:100',
            'status' => 'required|in:present,absent,late,excused',
            'check_in_time' => 'nullable',
            'check_out_time' => 'nullable',
            'late_minutes' => 'nullable|integer',
            'communicated' => 'boolean',
            'discipline_points' => 'nullable|integer',
            'notes' => 'nullable|string'
        ]);
        
        DB::beginTransaction();
        try {
            // Check for duplicate
            $existing = DB::selectOne("
                SELECT id FROM attendance_records 
                WHERE user_id = ? AND session_date = ? AND session_type = ?
            ", [$validated['user_id'], $validated['session_date'], $validated['session_type']]);
            
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Attendance record already exists for this user, date, and session type'
                ], 422);
            }
            
            DB::insert("
                INSERT INTO attendance_records (
                    user_id, session_date, session_type, status, 
                    check_in_time, check_out_time, late_minutes, 
                    communicated, discipline_points, notes, 
                    marked_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ", [
                $validated['user_id'],
                $validated['session_date'],
                $validated['session_type'],
                $validated['status'],
                $validated['check_in_time'] ?? null,
                $validated['check_out_time'] ?? null,
                $validated['late_minutes'] ?? 0,
                $validated['communicated'] ?? false,
                $validated['discipline_points'] ?? 0,
                $validated['notes'] ?? null,
                auth()->id()
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Attendance record created successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create attendance record: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'session_date' => 'required|date',
            'session_type' => 'required|string',
            'records' => 'required|array',
            'records.*.user_id' => 'required|exists:users,id',
            'records.*.status' => 'required|in:present,absent,late,excused',
            'records.*.late_minutes' => 'nullable|integer',
            'records.*.on_time' => 'boolean',
            'records.*.communicated' => 'boolean',
            'records.*.discipline_points' => 'nullable|integer',
            'records.*.has_official_permission' => 'boolean'
        ]);
        
        DB::beginTransaction();
        try {
            $this->ensureAttendanceSessionsTable();
            $this->ensureAttendanceOnTimeColumn();
            $session = DB::selectOne("
                SELECT is_completed
                FROM attendance_sessions
                WHERE session_date = ? AND session_type = ?
            ", [$validated['session_date'], $validated['session_type']]);

            if ($this->truthy($session->is_completed ?? false)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'This session is completed and cannot be edited.'
                ], 423);
            }

            foreach ($validated['records'] as $record) {
                $existing = DB::selectOne("
                    SELECT id FROM attendance_records 
                    WHERE user_id = ? AND session_date = ? AND session_type = ?
                ", [$record['user_id'], $validated['session_date'], $validated['session_type']]);
                
                // If user has official permission, force specific values
                $isOfficialPermission = $record['has_official_permission'] ?? false;
                $status = $record['status'];
                $onTime = $record['on_time'] ?? false;
                $communicated = $record['communicated'] ?? false;
                $disciplinePoints = $record['discipline_points'] ?? 0;
                
                if ($isOfficialPermission) {
                    $onTime = true;
                    $communicated = true;
                    $disciplinePoints = 1;
                }
                
                if ($existing) {
                    DB::update("
                        UPDATE attendance_records 
                        SET status = ?, late_minutes = ?, on_time = ?, communicated = ?, 
                            discipline_points = ?, updated_at = NOW()
                        WHERE user_id = ? AND session_date = ? AND session_type = ?
                    ", [
                        $status,
                        $record['late_minutes'] ?? 0,
                        $onTime,
                        $communicated,
                        $disciplinePoints,
                        $record['user_id'],
                        $validated['session_date'],
                        $validated['session_type']
                    ]);
                } else {
                    DB::insert("
                        INSERT INTO attendance_records (
                            user_id, session_date, session_type, status, 
                            late_minutes, on_time, communicated, discipline_points,
                            marked_by, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    ", [
                        $record['user_id'],
                        $validated['session_date'],
                        $validated['session_type'],
                        $status,
                        $record['late_minutes'] ?? 0,
                        $onTime,
                        $communicated,
                        $disciplinePoints,
                        auth()->id()
                    ]);
                }
            }
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Attendance records updated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update attendance records: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function completeSession(Request $request)
    {
        $validated = $request->validate([
            'session_date' => 'required|date',
            'session_type' => 'required|string'
        ]);
        
        DB::beginTransaction();
        try {
            $this->ensureAttendanceSessionsTable();

            // Mark all records as completed
            DB::update("
                UPDATE attendance_records 
                SET status = CASE 
                    WHEN status = 'pending' THEN 'absent'
                    ELSE status
                END,
                updated_at = NOW()
                WHERE session_date = ? AND session_type = ?
            ", [$validated['session_date'], $validated['session_type']]);

            DB::statement("
                INSERT INTO attendance_sessions (
                    session_date, session_type, is_completed, completed_at, completed_by, created_at, updated_at
                ) VALUES (?, ?, TRUE, NOW(), ?, NOW(), NOW())
                ON CONFLICT (session_date, session_type)
                DO UPDATE SET
                    is_completed = TRUE,
                    completed_at = NOW(),
                    completed_by = EXCLUDED.completed_by,
                    updated_at = NOW()
            ", [$validated['session_date'], $validated['session_type'], auth()->id()]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Session completed successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete session: ' . $e->getMessage()
            ], 500);
        }
    }

    private function ensureAttendanceSessionsTable()
    {
        DB::statement("
            CREATE TABLE IF NOT EXISTS attendance_sessions (
                session_date DATE NOT NULL,
                session_type VARCHAR(100) NOT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP,
                completed_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (session_date, session_type)
            )
        ");
    }

    private function ensureAttendanceOnTimeColumn()
    {
        DB::statement("
            ALTER TABLE attendance_records
            ADD COLUMN IF NOT EXISTS on_time BOOLEAN DEFAULT FALSE
        ");

        DB::statement("
            UPDATE attendance_records
            SET on_time = TRUE
            WHERE status = 'present' AND on_time = FALSE
        ");
    }

    private function truthy($value)
    {
        return in_array($value, [true, 1, '1', 't', 'true'], true);
    }
    
    public function edit($id)
    {
        $attendance = DB::selectOne("
            SELECT * FROM attendance_records WHERE id = ?
        ", [$id]);
        
        if (!$attendance) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance record not found'
            ], 404);
        }
        
        return response()->json([
            'success' => true,
            'attendance' => $attendance
        ]);
    }
    
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'session_date' => 'required|date',
            'session_type' => 'required|string|max:100',
            'status' => 'required|in:present,absent,late,excused',
            'check_in_time' => 'nullable',
            'check_out_time' => 'nullable',
            'late_minutes' => 'nullable|integer',
            'communicated' => 'boolean',
            'discipline_points' => 'nullable|integer',
            'notes' => 'nullable|string'
        ]);
        
        DB::beginTransaction();
        try {
            DB::update("
                UPDATE attendance_records 
                SET user_id = ?, session_date = ?, session_type = ?, status = ?,
                    check_in_time = ?, check_out_time = ?, late_minutes = ?, 
                    communicated = ?, discipline_points = ?, notes = ?, updated_at = NOW()
                WHERE id = ?
            ", [
                $validated['user_id'],
                $validated['session_date'],
                $validated['session_type'],
                $validated['status'],
                $validated['check_in_time'] ?? null,
                $validated['check_out_time'] ?? null,
                $validated['late_minutes'] ?? 0,
                $validated['communicated'] ?? false,
                $validated['discipline_points'] ?? 0,
                $validated['notes'] ?? null,
                $id
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Attendance record updated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update attendance record: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            DB::delete("DELETE FROM attendance_records WHERE id = ?", [$id]);
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Attendance record deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete attendance record: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function checkSessionExists(Request $request)
    {
        $date = $request->get('date');
        $sessionType = $request->get('type');
        
        $exists = DB::selectOne("
            SELECT COUNT(*) as count FROM attendance_records 
            WHERE session_date = ? AND session_type = ?
        ", [$date, $sessionType]);
        
        return response()->json([
            'exists' => ($exists->count ?? 0) > 0
        ]);
    }
    
    public function deleteSession(Request $request)
    {
        $date = $request->get('date');
        $sessionType = $request->get('type');
        
        DB::beginTransaction();
        try {
            $this->ensureAttendanceSessionsTable();

            DB::delete("
                DELETE FROM attendance_records 
                WHERE session_date = ? AND session_type = ?
            ", [$date, $sessionType]);

            DB::delete("
                DELETE FROM attendance_sessions 
                WHERE session_date = ? AND session_type = ?
            ", [$date, $sessionType]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Session records deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete session: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function getStats()
    {
        $stats = DB::select("
            SELECT 
                COUNT(*) as total_sessions,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count,
                AVG(late_minutes) as avg_late_minutes,
                COUNT(DISTINCT user_id) as unique_users
            FROM attendance_records
            WHERE session_date >= date_trunc('month', CURRENT_DATE)
        ");
        
        return response()->json([
            'success' => true,
            'stats' => $stats[0] ?? (object)[
                'total_sessions' => 0,
                'present_count' => 0,
                'absent_count' => 0,
                'late_count' => 0,
                'excused_count' => 0,
                'avg_late_minutes' => 0,
                'unique_users' => 0
            ]
        ]);
    }
}
