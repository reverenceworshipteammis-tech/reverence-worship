<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    public function superAdminDashboard()
    {
        if (!auth()->user()->isSuperAdmin()) {
            return redirect()->route('user.dashboard');
        }

        // User Statistics
        $totalUsers = DB::table('users')->count();
        $activeUsers = DB::table('users')->where('is_active', true)->count();
        $inactiveUsers = DB::table('users')->where('is_active', false)->whereNotNull('created_by')->count();
        $pendingUsers = DB::table('users')
            ->where('is_active', false)
            ->whereNull('created_by')
            ->whereNull('email_verified_at')
            ->count();
        $lastMonthUsers = DB::table('users')->whereMonth('created_at', now()->subMonth()->month)->count();
        $newUsersMonth = DB::table('users')->whereMonth('created_at', now()->month)->count();
        $growthRate = $lastMonthUsers > 0 ? round((($totalUsers - $lastMonthUsers) / $lastMonthUsers) * 100, 1) : 0;
        $pendingPermissionRequests = DB::table('permission_requests')->where('status', 'pending')->count();
        
        // Online users (sessions)
        $onlineUsers = DB::table('sessions')->where('last_activity', '>=', now()->subMinutes(15)->timestamp)->count();
        
        // Department statistics
        $stats = [
            'total_users' => $totalUsers,
            'active_users' => $activeUsers,
            'inactive_users' => $inactiveUsers,
            'pending_users' => $pendingUsers,
            'last_month_users' => $lastMonthUsers,
            'new_users_month' => $newUsersMonth,
            'growth_rate' => $growthRate,
            'online_users' => $onlineUsers,
            'total_roles' => $this->tableCount('roles'),
            'total_pages' => $this->tableCount('pages'),
            'total_families' => $this->tableCount('families'),
            'total_members' => $this->tableCount('family_members'),
            'system_version' => '2.0.0',
            
            // Department activity (based on data presence)
            'music_activity' => $this->calculateDepartmentActivity('music'),
            'intercession_activity' => $this->calculateDepartmentActivity('intercession'),
            'social_activity' => $this->calculateDepartmentActivity('social-fellowship'),
            'discipline_activity' => $this->calculateDepartmentActivity('discipline'),
            'finance_activity' => $this->calculateDepartmentActivity('finance'),
            
            // System-wide statistics
            'total_forms' => $this->tableCount('spiritual_forms'),
            'total_songs' => $this->tableCount('songs'),
            'total_playlists' => $this->tableCount('playlists'),
            'total_sponsors' => $this->tableCount('sponsors'),
            'total_announcements' => $this->tableCount('announcements'),
            'total_discipline' => $this->tableCount('discipline_records'),
            'total_permissions' => $this->tableCount('permission_requests'),
            'pending_permission_requests' => $pendingPermissionRequests,
            'total_payment_records' => $this->tableCount('payments'),
            'total_expense_records' => $this->tableCount('expenses'),
            
            // Financial statistics
            'total_expected' => $this->tableSum('contributions', 'annual_amount'),
            'total_collected' => $this->tableSum('payments', 'amount'),
            'total_expenses' => $this->tableSum('expenses', 'amount'),
        ];
        
        // Calculate collection rate
        if ($stats['total_expected'] > 0) {
            $stats['collection_rate'] = round(($stats['total_collected'] / $stats['total_expected']) * 100, 1);
        } else {
            $stats['collection_rate'] = 0;
        }
        
        // Recent activities
        $recentActivities = $this->getRecentActivities();
        
        return view('super-admin.dashboard', compact('stats', 'recentActivities'));
    }
    
    private function calculateDepartmentActivity($department)
    {
        // Calculate activity based on recent data in department tables
        $activity = 70; // Default baseline
        
        switch($department) {
            case 'music':
                $songCount = DB::table('songs')->whereMonth('created_at', now()->month)->count();
                $activity = min(100, 70 + ($songCount * 5));
                break;
            case 'intercession':
                $prayerCount = Schema::hasTable('prayer_requests')
                    ? DB::table('prayer_requests')->whereMonth('created_at', now()->month)->count()
                    : 0;
                $activity = min(100, 70 + ($prayerCount * 2));
                break;
            case 'social-fellowship':
                $familyCount = DB::table('families')->whereMonth('created_at', now()->month)->count();
                $activity = min(100, 70 + ($familyCount * 10));
                break;
            case 'discipline':
                $recordCount = DB::table('discipline_records')->whereMonth('created_at', now()->month)->count();
                $activity = min(100, 70 + ($recordCount * 5));
                break;
            case 'finance':
                $paymentCount = DB::table('payments')->whereMonth('created_at', now()->month)->count();
                $activity = min(100, 70 + ($paymentCount * 3));
                break;
        }
        
        return $activity;
    }
    
    private function getRecentActivities()
    {
        $activities = [];
        
        // Get recent user registrations
        $newUsers = DB::table('users')->orderBy('created_at', 'desc')->limit(3)->get();
        foreach ($newUsers as $user) {
            $activities[] = (object)[
                'description' => "New user registered: {$user->name}",
                'created_at' => $user->created_at,
                'icon' => 'fas fa-user-plus',
                'icon_bg' => 'bg-green-100',
                'icon_color' => 'text-green-600',
                'module' => 'Users'
            ];
        }
        
        // Get recent contributions
        $payments = DB::table('payments')->orderBy('created_at', 'desc')->limit(2)->get();
        foreach ($payments as $payment) {
            $user = DB::table('users')->where('id', $payment->user_id)->first();
            $activities[] = (object)[
                'description' => "Contribution recorded: " . ($user->name ?? 'Unknown') . " - " . number_format($payment->amount) . " RWF",
                'created_at' => $payment->created_at,
                'icon' => 'fas fa-hand-holding-usd',
                'icon_bg' => 'bg-blue-100',
                'icon_color' => 'text-blue-600',
                'module' => 'Finance'
            ];
        }
        
        // Sort by created_at descending
        usort($activities, function($a, $b) {
            return strtotime($b->created_at) - strtotime($a->created_at);
        });
        
        return array_slice($activities, 0, 10);
    }

    private function tableCount(string $table): int
    {
        return Schema::hasTable($table) ? DB::table($table)->count() : 0;
    }

    private function tableSum(string $table, string $column): float
    {
        return Schema::hasTable($table) ? (float) DB::table($table)->sum($column) : 0;
    }
    
    public function adminDashboard()
    {
        return redirect()->route(
            auth()->user()->isSuperAdmin() ? 'super-admin.dashboard' : 'user.dashboard'
        );
    }
}
