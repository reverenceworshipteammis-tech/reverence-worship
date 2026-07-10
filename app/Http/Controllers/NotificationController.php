<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    private static array $tableExistsCache = [];

    /**
     * Check if a table exists in the database
     */
    private function tableExists($tableName)
    {
        if (array_key_exists($tableName, self::$tableExistsCache)) {
            return self::$tableExistsCache[$tableName];
        }

        try {
            $table = str_replace("'", "''", $tableName);
            $result = DB::select("SELECT to_regclass('{$table}')");
            return self::$tableExistsCache[$tableName] = ($result[0]->to_regclass ?? null) !== null;
        } catch (\Exception $e) {
            return self::$tableExistsCache[$tableName] = false;
        }
    }

    /**
     * Get all notifications for the current user
     */
    public function getNotifications(Request $request)
    {
        try {
            $userId = auth()->id();
            $user = auth()->user();
            $isSuperAdmin = $user->isSuperAdmin();
            
            $notifications = [];
            
            // 1. Announcements (unread) - Show to all users (if table exists)
            if ($this->tableExists('announcements')) {
                $announcements = DB::select("
                    SELECT 
                        'announcement' as type,
                        a.id as source_id,
                        a.title,
                        a.content as message,
                        a.created_at,
                        ar.read_at,
                        '/announcements' as link
                    FROM announcements a
                    LEFT JOIN announcement_user_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
                    WHERE a.status = 'active'
                    AND (ar.read_at IS NULL)
                    ORDER BY a.created_at DESC
                    LIMIT 10
                ", [$userId]);
                $notifications = array_merge($notifications, $announcements);
            }

            // 2. Published forms the user has not submitted yet.
            if ($this->tableExists('forms') && $this->tableExists('form_submissions')) {
                $forms = DB::select("
                    SELECT
                        'form' as type,
                        f.id as source_id,
                        'Form to Complete' as title,
                        f.title as message,
                        f.created_at,
                        NULL as read_at,
                        CONCAT('/forms/', f.id, '/take') as link
                    FROM forms f
                    WHERE f.is_active = true
                    AND f.settings LIKE '%\"is_published\":true%'
                    AND NOT EXISTS (
                        SELECT 1
                        FROM form_submissions fs
                        WHERE fs.form_id = f.id
                        AND fs.user_id = ?
                    )
                    ORDER BY f.created_at DESC
                    LIMIT 10
                ", [$userId]);
                $notifications = array_merge($notifications, $forms);
            }

            // 3. Reviewed form results released to this user.
            if ($this->tableExists('form_result_notification_reads')
                && $this->tableExists('forms')
                && $this->tableExists('form_submissions')) {
                $releasedResults = DB::select("
                    SELECT
                        'form_result' as type,
                        fs.id as source_id,
                        'Form Result Available' as title,
                        CONCAT(f.title, ' has been reviewed. Your result is now available.') as message,
                        COALESCE(fs.released_at, fs.updated_at) as created_at,
                        reads.read_at,
                        CONCAT('/forms/', fs.form_id, '/results?submission_id=', fs.id) as link
                    FROM form_submissions fs
                    JOIN forms f ON f.id = fs.form_id
                    LEFT JOIN form_result_notification_reads reads
                        ON reads.submission_id = fs.id
                        AND reads.user_id = fs.user_id
                    WHERE fs.user_id = ?
                    AND (fs.is_released = true OR fs.released_at IS NOT NULL)
                    AND reads.read_at IS NULL
                    ORDER BY COALESCE(fs.released_at, fs.updated_at) DESC
                    LIMIT 10
                ", [$userId]);
                $notifications = array_merge($notifications, $releasedResults);
            }
            
            // 4. Pending Users - Only Super Admin can see
            if ($isSuperAdmin && $this->tableExists('users')) {
                $pendingUsers = DB::select("
                    SELECT 
                        'pending_user' as type,
                        u.id as source_id,
                        'New User Registration' as title,
                        CONCAT(u.name, ' (', u.email, ') needs approval') as message,
                        u.created_at,
                        NULL as read_at,
                        '/users?status=pending' as link
                    FROM users u
                    WHERE u.is_active = false 
                    AND u.created_by IS NULL 
                    AND u.email_verified_at IS NULL
                    ORDER BY u.created_at DESC
                    LIMIT 10
                ");
                $notifications = array_merge($notifications, $pendingUsers);
            }
            
            // 4. Tasks (unread/overdue) - Only if tasks table exists
            if ($this->tableExists('tasks')) {
                try {
                    $tasks = DB::select("
                        SELECT 
                            'task' as type,
                            t.id as source_id,
                            'Pending Task' as title,
                            t.title as message,
                            t.created_at,
                            NULL as read_at,
                            '/tasks' as link
                        FROM tasks t
                        WHERE t.status != 'completed'
                        AND t.assigned_to = ?
                        ORDER BY t.created_at DESC
                        LIMIT 10
                    ", [$userId]);
                    $notifications = array_merge($notifications, $tasks);
                } catch (\Exception $e) {
                    // Tasks table exists but might have different structure
                    \Log::warning('Tasks table query error: ' . $e->getMessage());
                }
            }
            
            // 5. Permission Requests - Show to users who can approve (if table exists)
            if (($user->canAccess('discipline', 'approve-permission') || $isSuperAdmin) && $this->tableExists('permission_requests')) {
                $permissions = DB::select("
                    SELECT 
                        'permission' as type,
                        p.id as source_id,
                        'Permission Request' as title,
                        CONCAT(u.name, ' requested permission (', p.type, ')') as message,
                        p.created_at,
                        NULL as read_at,
                        '/discipline/permission?status=pending' as link
                    FROM permission_requests p
                    JOIN users u ON u.id = p.user_id
                    WHERE p.status = 'pending'
                    ORDER BY p.created_at DESC
                    LIMIT 10
                ");
                $notifications = array_merge($notifications, $permissions);
            }

            // 6. Expenses awaiting this user's approval
            if ($this->tableExists('expenses')) {
                $expenses = DB::select("
                    SELECT
                        'expense_approval' as type,
                        e.id as source_id,
                        'Expense Approval Required' as title,
                        CONCAT(
                            COALESCE(creator.name, 'A member'),
                            ' submitted an expense of RWF ',
                            e.amount
                        ) as message,
                        e.created_at,
                        NULL as read_at,
                        '/finance?tab=expenses' as link
                    FROM expenses e
                    LEFT JOIN users creator ON creator.id = e.created_by
                    WHERE e.status = 'pending'
                    AND (e.approver_id_1 = ? OR e.approver_id_2 = ?)
                    ORDER BY e.created_at DESC
                    LIMIT 10
                ", [$userId, $userId]);
                $notifications = array_merge($notifications, $expenses);
            }
            
            // Sort by created_at
            usort($notifications, function($a, $b) {
                return strtotime($b->created_at) - strtotime($a->created_at);
            });
            
            // Limit to 20
            $notifications = array_slice($notifications, 0, 20);
            
            // Count unread
            $unreadCount = count(array_filter($notifications, function($n) {
                return !isset($n->read_at) || $n->read_at === null;
            }));
            
            return response()->json([
                'success' => true,
                'notifications' => $notifications,
                'unread_count' => $unreadCount,
                'is_super_admin' => $isSuperAdmin
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Notification error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Get unread notification count
     */
    public function getUnreadCount(Request $request)
    {
        try {
            $userId = auth()->id();
            $user = auth()->user();
            $isSuperAdmin = $user->isSuperAdmin();

            $cacheKey = "notifications:unread_count:{$userId}";

            $total = Cache::remember($cacheKey, now()->addSeconds(30), function () use ($userId, $user, $isSuperAdmin) {
                $total = 0;
            
            // Announcements unread count (all users)
            if ($this->tableExists('announcements')) {
                $announcements = DB::select("
                    SELECT COUNT(*) as count
                    FROM announcements a
                    LEFT JOIN announcement_user_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?
                    WHERE a.status = 'active'
                    AND (ar.read_at IS NULL)
                ", [$userId]);
                $total += $announcements[0]->count ?? 0;
            }

            if ($this->tableExists('forms') && $this->tableExists('form_submissions')) {
                $forms = DB::select("
                    SELECT COUNT(*) as count
                    FROM forms f
                    WHERE f.is_active = true
                    AND f.settings LIKE '%\"is_published\":true%'
                    AND NOT EXISTS (
                        SELECT 1
                        FROM form_submissions fs
                        WHERE fs.form_id = f.id
                        AND fs.user_id = ?
                    )
                ", [$userId]);
                $total += $forms[0]->count ?? 0;
            }

            if ($this->tableExists('form_result_notification_reads')
                && $this->tableExists('form_submissions')) {
                $releasedResults = DB::select("
                    SELECT COUNT(*) as count
                    FROM form_submissions fs
                    LEFT JOIN form_result_notification_reads reads
                        ON reads.submission_id = fs.id
                        AND reads.user_id = fs.user_id
                    WHERE fs.user_id = ?
                    AND (fs.is_released = true OR fs.released_at IS NOT NULL)
                    AND reads.read_at IS NULL
                ", [$userId]);
                $total += $releasedResults[0]->count ?? 0;
            }
            
            // Pending Users - Only Super Admin
            if ($isSuperAdmin && $this->tableExists('users')) {
                $pendingUsers = DB::select("
                    SELECT COUNT(*) as count
                    FROM users u
                    WHERE u.is_active = false 
                    AND u.created_by IS NULL 
                    AND u.email_verified_at IS NULL
                ");
                $total += $pendingUsers[0]->count ?? 0;
            }
            
            // Tasks - Only if tasks table exists
            if ($this->tableExists('tasks')) {
                try {
                    $tasks = DB::select("
                        SELECT COUNT(*) as count
                        FROM tasks t
                        WHERE t.status != 'completed'
                        AND t.assigned_to = ?
                    ", [$userId]);
                    $total += $tasks[0]->count ?? 0;
                } catch (\Exception $e) {
                    \Log::warning('Tasks count query error: ' . $e->getMessage());
                }
            }
            
            // Permission Requests - Users who can approve
            if (($user->canAccess('discipline', 'approve-permission') || $isSuperAdmin) && $this->tableExists('permission_requests')) {
                $permissions = DB::select("
                    SELECT COUNT(*) as count
                    FROM permission_requests p
                    WHERE p.status = 'pending'
                ");
                $total += $permissions[0]->count ?? 0;
            }

            if ($this->tableExists('expenses')) {
                $expenses = DB::select("
                    SELECT COUNT(*) as count
                    FROM expenses e
                    WHERE e.status = 'pending'
                    AND (e.approver_id_1 = ? OR e.approver_id_2 = ?)
                ", [$userId, $userId]);
                $total += $expenses[0]->count ?? 0;
            }

                return $total;
            });
            
            return response()->json([
                'success' => true,
                'unread_count' => $total
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Unread count error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        try {
            $userId = auth()->id();
            $type = $request->get('type', 'announcement');
            
            if ($type === 'announcement' && $this->tableExists('announcement_user_reads')) {
                // Check if record exists
                $exists = DB::select("
                    SELECT id FROM announcement_user_reads 
                    WHERE announcement_id = ? AND user_id = ?
                ", [$id, $userId]);
                
                if (empty($exists)) {
                    DB::insert("
                        INSERT INTO announcement_user_reads (announcement_id, user_id, read_at)
                        VALUES (?, ?, NOW())
                    ", [$id, $userId]);
                } else {
                    DB::update("
                        UPDATE announcement_user_reads 
                        SET read_at = NOW()
                        WHERE announcement_id = ? AND user_id = ?
                    ", [$id, $userId]);
                }
            }

            if ($type === 'form_result' && $this->tableExists('form_result_notification_reads')) {
                DB::statement("
                    INSERT INTO form_result_notification_reads (submission_id, user_id, read_at)
                    VALUES (?, ?, NOW())
                    ON CONFLICT (submission_id, user_id)
                    DO UPDATE SET read_at = EXCLUDED.read_at
                ", [$id, $userId]);
            }

            Cache::forget("notifications:unread_count:{$userId}");
            
            return response()->json([
                'success' => true,
                'message' => 'Marked as read'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Mark as read error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Mark all notifications as read
     */
    public function markAllRead(Request $request)
    {
        try {
            $userId = auth()->id();
            
            if ($this->tableExists('announcement_user_reads')) {
                // Mark all announcements as read
                DB::insert("
                    INSERT INTO announcement_user_reads (announcement_id, user_id, read_at)
                    SELECT id, ?, NOW()
                    FROM announcements
                    WHERE status = 'active'
                    ON CONFLICT (announcement_id, user_id) DO UPDATE
                    SET read_at = NOW()
                ", [$userId]);
            }

            if ($this->tableExists('form_result_notification_reads')
                && $this->tableExists('form_submissions')) {
                DB::statement("
                    INSERT INTO form_result_notification_reads (submission_id, user_id, read_at)
                    SELECT fs.id, fs.user_id, NOW()
                    FROM form_submissions fs
                    WHERE fs.user_id = ?
                    AND (fs.is_released = true OR fs.released_at IS NOT NULL)
                    ON CONFLICT (submission_id, user_id)
                    DO UPDATE SET read_at = EXCLUDED.read_at
                ", [$userId]);
            }

            Cache::forget("notifications:unread_count:{$userId}");
            
            return response()->json([
                'success' => true,
                'message' => 'All marked as read'
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Mark all read error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
