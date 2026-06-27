<?php

namespace App\Http\Controllers\Discipline;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PermissionController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->get('status', 'all');
        $userId = $request->get('user_id');
        $search = $request->get('search');
        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $perPage = max(1, min((int) $request->get('per_page', 10), 50));
        $page = max(1, (int) $request->get('page', 1));
        $offset = ($page - 1) * $perPage;

        $where = " WHERE 1=1 ";
        $params = [];

        if ($status !== 'all') {
            $where .= " AND pr.status = ?";
            $params[] = $status;
        }

        if ($userId) {
            $where .= " AND pr.user_id = ?";
            $params[] = $userId;
        }

        if ($search) {
            $where .= " AND (u.name ILIKE ? OR u.email ILIKE ? OR pr.reason ILIKE ?)";
            $searchParam = "%{$search}%";
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

        $baseFrom = "
            FROM permission_requests pr
            JOIN users u ON u.id = pr.user_id
            LEFT JOIN users au ON au.id = pr.approved_by
        ";

        $countSql = "SELECT COUNT(*) as total" . $baseFrom . $where;
        $counts = DB::selectOne($countSql, $params);
        $total = (int) ($counts->total ?? 0);

        $statsSql = "SELECT
                COUNT(*) as total_requests,
                SUM(CASE WHEN pr.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN pr.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN pr.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
                COUNT(DISTINCT pr.user_id) as unique_users
            " . $baseFrom . $where;
        $stats = DB::selectOne($statsSql, $params) ?? (object)[
            'total_requests' => 0,
            'pending_count' => 0,
            'approved_count' => 0,
            'rejected_count' => 0,
            'unique_users' => 0,
        ];

        $listSql = "
            SELECT pr.*, u.name as user_name, u.email as user_email,
                   au.name as approved_by_name,
                   TO_CHAR(pr.created_at, 'YYYY-MM-DD') as created_at_formatted,
                   TO_CHAR(pr.approved_at, 'YYYY-MM-DD') as approved_at_formatted
        " . $baseFrom . $where . " ORDER BY pr.created_at DESC LIMIT ? OFFSET ?";

        $listParams = array_merge($params, [$perPage, $offset]);
        $permissions = DB::select($listSql, $listParams);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'permissions' => $permissions,
                'stats' => $stats,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'total_pages' => max(1, (int) ceil($total / $perPage)),
                    'has_prev' => $page > 1,
                    'has_next' => $page * $perPage < $total,
                ],
            ]);
        }

        $users = DB::select("SELECT id, name, email FROM users ORDER BY name");

        return view('modules.discipline.partials.permission-tab', compact('permissions', 'users', 'status', 'stats', 'page', 'perPage', 'total', 'fromDate', 'toDate', 'search'));
    }

    public function store(Request $request)

    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'type' => 'nullable|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string',
            'attachment_url' => 'nullable|url'
        ]);
        
        $permissionType = trim($validated['type'] ?? '') ?: 'General';
        
        DB::beginTransaction();
        try {
            DB::insert("
                INSERT INTO permission_requests (
                    user_id, type, start_date, end_date, reason, 
                    status, attachment_url, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
            ", [
                $validated['user_id'],
                $permissionType,
                $validated['start_date'],
                $validated['end_date'],
                $validated['reason'],
                $validated['attachment_url'] ?? null
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Permission request submitted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit permission request: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function edit($id)
    {
        $permission = DB::selectOne("
            SELECT * FROM permission_requests WHERE id = ?
        ", [$id]);
        
        if (!$permission) {
            return response()->json([
                'success' => false,
                'message' => 'Permission request not found'
            ], 404);
        }
        
        return response()->json([
            'success' => true,
            'permission' => $permission
        ]);
    }
    public function searchUsers(Request $request)
{
    try {
        $search = $request->get('q', '');
        
        if (strlen($search) < 2) {
            return response()->json(['success' => true, 'users' => []]);
        }
        
        $users = DB::select("
            SELECT id, name, email 
            FROM users 
            WHERE name ILIKE ? OR email ILIKE ?
            ORDER BY name
            LIMIT 10
        ", ["%{$search}%", "%{$search}%"]);
        
        return response()->json([
            'success' => true,
            'users' => $users
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage(),
            'users' => []
        ], 500);
    }
}
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:approved,rejected,cancelled',
            'rejection_reason' => 'required_if:status,rejected|nullable|string'
        ]);
        
        DB::beginTransaction();
        try {
            DB::update("
                UPDATE permission_requests 
                SET status = ?, approved_by = ?, approved_at = NOW(),
                    rejection_reason = ?, updated_at = NOW()
                WHERE id = ?
            ", [
                $validated['status'],
                auth()->id(),
                $validated['rejection_reason'] ?? null,
                $id
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Permission request ' . $validated['status'] . ' successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update permission request: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            DB::delete("DELETE FROM permission_requests WHERE id = ?", [$id]);
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Permission request deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete permission request: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function getStats()
    {
        $stats = DB::select("
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
                COUNT(DISTINCT user_id) as unique_users
            FROM permission_requests
            WHERE created_at >= date_trunc('month', CURRENT_DATE)
        ");
        
        return response()->json([
            'success' => true,
            'stats' => $stats[0] ?? (object)[
                'total_requests' => 0,
                'pending_count' => 0,
                'approved_count' => 0,
                'rejected_count' => 0,
                'unique_users' => 0
            ]
        ]);
    }
}
