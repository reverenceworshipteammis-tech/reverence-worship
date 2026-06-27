<?php

namespace App\Http\Controllers\Discipline;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DisciplineRecordController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->get('type', 'all');
        $fromDate = $request->get('from_date');
        $toDate = $request->get('to_date');
        $perPage = max(1, min((int) $request->get('per_page', 10), 50));
        $page = max(1, (int) $request->get('page', 1));
        $offset = ($page - 1) * $perPage;
        
        $baseFrom = " FROM discipline_records dr WHERE 1=1 ";
        $params = [];
        
        if ($type !== 'all') {
            $baseFrom .= " AND dr.type = ?";
            $params[] = $type;
        }
        
        if ($fromDate) {
            $baseFrom .= " AND DATE(dr.created_at) >= ?";
            $params[] = $fromDate;
        }

        if ($toDate) {
            $baseFrom .= " AND DATE(dr.created_at) <= ?";
            $params[] = $toDate;
        }
        
        $countSql = "
            SELECT COUNT(*) as total
            FROM (
                SELECT DATE(dr.created_at) as session_date, dr.title as session_title
            " . $baseFrom . "
                GROUP BY DATE(dr.created_at), dr.title
            ) as grouped_records
        ";
        $counts = DB::selectOne($countSql, $params);
        $total = (int) ($counts->total ?? 0);
        $totalPages = max(1, (int) ceil($total / $perPage));
        $page = min($page, $totalPages);
        $offset = ($page - 1) * $perPage;

        $query = "
            SELECT
                DATE(dr.created_at) as session_date,
                dr.title as session_title,
                COUNT(*) FILTER (WHERE dr.type = 'positive') as good_behavior,
                COUNT(*) FILTER (WHERE dr.type <> 'positive') as bad_behavior,
                MAX(dr.status) as status
            " . $baseFrom . "
            GROUP BY DATE(dr.created_at), dr.title
            ORDER BY session_date DESC, session_title DESC
            LIMIT ? OFFSET ?
        ";
        
        $records = DB::select($query, array_merge($params, [$perPage, $offset]));
        
        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'records' => $records,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'total_pages' => $totalPages,
                    'has_prev' => $page > 1,
                    'has_next' => $page < $totalPages,
                ],
            ]);
        }
        
        $users = DB::select("SELECT id, name, email FROM users ORDER BY name");
        $sections = DB::select("SELECT id, name FROM discipline_sections ORDER BY sort_order, name");
        
        return view('modules.discipline.partials.discipline-records-tab', compact('records', 'users', 'sections', 'type'));
    }
    
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'section_id' => 'nullable|exists:discipline_sections,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'points' => 'nullable|integer',
            'type' => 'required|in:positive,warning,penalty,suspension',
            'status' => 'required|in:active,resolved,appealed'
        ]);
        
        DB::beginTransaction();
        try {
            DB::insert("
                INSERT INTO discipline_records (
                    user_id, section_id, title, description, points, 
                    type, status, recorded_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ", [
                $validated['user_id'],
                $validated['section_id'] ?? null,
                $validated['title'],
                $validated['description'] ?? null,
                $validated['points'] ?? 0,
                $validated['type'],
                $validated['status'],
                auth()->id()
            ]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Discipline record created successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to create discipline record: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function edit($id)
    {
        $record = DB::selectOne("
            SELECT * FROM discipline_records WHERE id = ?
        ", [$id]);
        
        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Discipline record not found'
            ], 404);
        }
        
        return response()->json([
            'success' => true,
            'record' => $record
        ]);
    }
    
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'section_id' => 'nullable|exists:discipline_sections,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'points' => 'nullable|integer',
            'type' => 'required|in:positive,warning,penalty,suspension',
            'status' => 'required|in:active,resolved,appealed',
            'resolved_notes' => 'nullable|string'
        ]);
        
        DB::beginTransaction();
        try {
            $params = [
                $validated['user_id'],
                $validated['section_id'] ?? null,
                $validated['title'],
                $validated['description'] ?? null,
                $validated['points'] ?? 0,
                $validated['type'],
                $validated['status'],
                $id
            ];
            
            $query = "
                UPDATE discipline_records 
                SET user_id = ?, section_id = ?, title = ?, description = ?, 
                    points = ?, type = ?, status = ?, updated_at = NOW()
            ";
            
            if ($validated['status'] === 'resolved' && !DB::selectOne("SELECT resolved_at FROM discipline_records WHERE id = ?", [$id])->resolved_at ?? null) {
                $query .= ", resolved_by = ?, resolved_at = NOW()";
                $params[] = auth()->id();
                
                if (!empty($validated['resolved_notes'])) {
                    $query .= ", resolved_notes = ?";
                    $params[] = $validated['resolved_notes'];
                }
            }
            
            $query .= " WHERE id = ?";
            $params[] = $id;
            
            DB::update($query, $params);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Discipline record updated successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update discipline record: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function destroy($id)
    {
        DB::beginTransaction();
        try {
            DB::delete("DELETE FROM discipline_records WHERE id = ?", [$id]);
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Discipline record deleted successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete discipline record: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function resolve(Request $request, $id)
    {
        $validated = $request->validate([
            'resolved_notes' => 'required|string'
        ]);
        
        DB::beginTransaction();
        try {
            DB::update("
                UPDATE discipline_records 
                SET status = 'resolved', resolved_by = ?, resolved_at = NOW(),
                    resolved_notes = ?, updated_at = NOW()
                WHERE id = ?
            ", [auth()->id(), $validated['resolved_notes'], $id]);
            
            DB::commit();
            
            return response()->json([
                'success' => true,
                'message' => 'Discipline record resolved successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to resolve discipline record: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function bulkStore(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'title' => 'required|string|max:255',
            'records' => 'required|array',
            'records.*.user_id' => 'required|exists:users,id',
            'records.*.behaviour' => 'required|in:good,bad',
            'records.*.description' => 'nullable|string',
            'records.*.points' => 'nullable|integer'
        ]);

        DB::beginTransaction();
        try {
            $userId = auth()->id();
            $date = $validated['date'];
            $title = $validated['title'];

            foreach ($validated['records'] as $record) {
                $type = $record['behaviour'] === 'good' ? 'positive' : 'warning';
                $description = $record['description'] ?? ($record['behaviour'] === 'good' ? 'Good' : '');
                $points = $record['points'] ?? ($record['behaviour'] === 'good' ? 1 : 0);

                DB::insert("
                    INSERT INTO discipline_records (
                        user_id, title, description, points, 
                        type, status, recorded_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())
                ", [
                    $record['user_id'],
                    $title,
                    $description,
                    $points,
                    $type,
                    $userId
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Discipline records saved successfully'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to save discipline records: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStats()
    {
        $stats = DB::select("
            SELECT 
                COUNT(*) as total_records,
                SUM(CASE WHEN type = 'positive' THEN 1 ELSE 0 END) as positive_count,
                SUM(CASE WHEN type = 'warning' THEN 1 ELSE 0 END) as warning_count,
                SUM(CASE WHEN type = 'penalty' THEN 1 ELSE 0 END) as penalty_count,
                SUM(CASE WHEN type = 'suspension' THEN 1 ELSE 0 END) as suspension_count,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
                COALESCE(AVG(points), 0) as avg_points
            FROM discipline_records
            WHERE created_at >= date_trunc('month', CURRENT_DATE)
        ");
        
        return response()->json([
            'success' => true,
            'stats' => $stats[0] ?? (object)[
                'total_records' => 0,
                'positive_count' => 0,
                'warning_count' => 0,
                'penalty_count' => 0,
                'suspension_count' => 0,
                'active_count' => 0,
                'resolved_count' => 0,
                'avg_points' => 0
            ]
        ]);
    }
    public function viewSession(Request $request)
    {
        $date = $request->get('date');
        $title = $request->get('title');
        
        if (!$date || !$title) {
            return response()->json([
                'success' => false,
                'message' => 'Date and title are required'
            ], 400);
        }

        try {
            $normalizedDate = Carbon::parse($date)->toDateString();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid session date'
            ], 422);
        }
        
        $records = DB::select("
            SELECT dr.*, u.name as user_name, u.email as user_email, ru.name as recorded_by_name
            FROM discipline_records dr
            JOIN users u ON u.id = dr.user_id
            LEFT JOIN users ru ON ru.id = dr.recorded_by
            WHERE DATE(dr.created_at) = ? AND dr.title = ?
            ORDER BY u.name
        ", [$normalizedDate, $title]);

        if ($request->ajax()) {
            return response()->json([
                'success' => true,
                'date' => $normalizedDate,
                'title' => $title,
                'records' => $records
            ]);
        }
        
        return view('modules.discipline.records-session', [
            'date' => $normalizedDate,
            'title' => $title,
            'records' => $records
        ]);
    }

    public function deleteSession(Request $request)
    {
        $date = $request->get('date');
        $title = $request->get('title');

        if (!$date || !$title) {
            return response()->json([
                'success' => false,
                'message' => 'Date and title are required'
            ], 400);
        }

        try {
            $normalizedDate = Carbon::parse($date)->toDateString();
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid session date'
            ], 422);
        }
        
        DB::beginTransaction();
        try {
            DB::delete("
                DELETE FROM discipline_records 
                WHERE DATE(created_at) = ? AND title = ?
            ", [$normalizedDate, $title]);
            
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
}
