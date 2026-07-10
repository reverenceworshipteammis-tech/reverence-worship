<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ModuleAssignmentController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\User\UserDashboardController;
use App\Http\Controllers\LandingPageController;

Route::get('/', [LandingPageController::class, 'index'])->name('home');

// Google Login Routes
Route::get('/auth/google/redirect', [GoogleController::class, 'redirectToGoogle'])->name('google.login');
Route::get('/auth/google/callback', [GoogleController::class, 'handleGoogleCallback'])->name('google.callback');

// ==================== TEST ROUTES ====================
Route::get('/ping', function () {
    return 'Laravel is working! Time: ' . date('Y-m-d H:i:s');
});

Route::get('/wasmer-laravel-check', function () {
    $db = [
        'attempted' => false,
        'ok' => false,
        'error' => null,
    ];

    try {
        $db['attempted'] = true;
        $db['ok'] = \Illuminate\Support\Facades\DB::selectOne('select 1 as ok')->ok == 1;
    } catch (\Throwable $e) {
        $db['error'] = $e->getMessage();
    }

    return response()->json([
        'laravel' => app()->version(),
        'env' => app()->environment(),
        'debug' => config('app.debug'),
        'app_key_present' => (bool) config('app.key'),
        'cache_driver' => config('cache.default'),
        'session_driver' => config('session.driver'),
        'queue_driver' => config('queue.default'),
        'db_connection' => config('database.default'),
        'db_host_present' => (bool) config('database.connections.pgsql.host'),
        'db_password_present' => (bool) config('database.connections.pgsql.password'),
        'database' => $db,
    ]);
});

Route::get('/debug-music', function () {
    $user = auth()->user();
    $page = \App\Models\System\Page::where('name', 'music-ministry')->first();
    $feature = \App\Models\System\Feature::where('name', 'access')->whereHas('page', function ($q) {
        $q->where('name', 'music-ministry');
    })->first();
    $hasAccess = $user->canAccess('music-ministry', 'access');
    $permissions = [];
    foreach ($user->roles as $role) {
        $rolePermissions = \App\Models\System\RolePageFeature::where('role_id', $role->id)->with(['page', 'feature'])->get();
        foreach ($rolePermissions as $p) {
            if ($p->page && $p->feature) {
                $permissions[] = $p->page->name . ' - ' . $p->feature->name;
            }
        }
    }
    return [
        'user' => $user->name,
        'user_email' => $user->email,
        'user_roles' => $user->roles->pluck('name'),
        'page_exists' => $page ? true : false,
        'page_id' => $page ? $page->id : null,
        'feature_exists' => $feature ? true : false,
        'feature_id' => $feature ? $feature->id : null,
        'user_has_access' => $hasAccess,
        'all_user_permissions' => $permissions
    ];
})->middleware('auth');

Route::get('/debug-permissions', function () {
    $user = auth()->user();
    return [
        'user' => $user->name,
        'email' => $user->email,
        'is_admin' => !$user->isSuperAdmin(),
        'roles' => $user->roles->pluck('display_name'),
    ];
})->middleware('auth');

Route::get('/test-generate', function () {
    $singers = App\Models\User\User::where('is_singer', true)->whereNotNull('voice_part')->whereNotNull('singer_level')->get();
    return [
        'total_singers' => App\Models\User\User::where('is_singer', true)->count(),
        'singers_with_voice_and_level' => $singers->count(),
        'singers_list' => $singers->map(function ($s) {
            return ['name' => $s->name, 'voice_part' => $s->voice_part, 'level' => $s->singer_level];
        })
    ];
})->middleware('auth');

// ==================== GUEST ROUTES ====================
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
});

// ==================== AUTHENTICATED ROUTES ====================
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

    // Super Admin Routes
    Route::get('/super-admin/dashboard', [DashboardController::class, 'superAdminDashboard'])->name('super-admin.dashboard');

    // Admin Dashboard (for regular admins)
    Route::get('/admin/dashboard', [DashboardController::class, 'adminDashboard'])->name('admin.dashboard');

    // User Dashboard (for regular users)
    Route::get('/user/dashboard', [UserDashboardController::class, 'index'])->name('user.dashboard');
    Route::get('/user/performance', [UserDashboardController::class, 'performanceIndex'])
        ->name('user.performance.index');
    Route::get('/user/performance/{type}', [UserDashboardController::class, 'performanceDetails'])
        ->where('type', 'discipline|attendance|communication|contribution')
        ->name('user.performance.show');

    // User Management Routes
    Route::post('/users/{id}/approve', [UserController::class, 'approve'])->name('users.approve');
    Route::post('/users/{id}/activate', [UserController::class, 'activate'])->name('users.activate');
    Route::post('/users/{id}/deactivate', [UserController::class, 'deactivate'])->name('users.deactivate');

    // Test PDF Route
    Route::get('/test-pdf', function () {
        $pdf = Barryvdh\DomPDF\Facade\Pdf::loadHTML('<h1>Test PDF</h1><p>This is a test PDF.</p>');
        return $pdf->download('test.pdf');
    });

    // Users List API
    Route::get('/users/list', function () {
        try {
            $users = DB::table('users')->select('id', 'name', 'email')->orderBy('name')->get();
            return response()->json(['success' => true, 'users' => $users]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    });

    // Simple PDF Test
    Route::get('/test-pdf-simple', function () {
        try {
            $pdf = Barryvdh\DomPDF\Facade\PDF::loadHTML('<h1>Test</h1><p>This is a test PDF.</p>');
            return $pdf->download('test.pdf');
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    });

    // Finance Debug Route
    Route::get('/finance/debug/sponsor-payments', function () {
        try {
            $rows = DB::table('sponsor_payments')
                ->join('sponsors', 'sponsor_payments.sponsor_id', '=', 'sponsors.id')
                ->select('sponsor_payments.*', 'sponsors.name as sponsor_name')
                ->orderBy('sponsor_payments.created_at', 'desc')
                ->get();

            return response()->json(['success' => true, 'data' => $rows]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    });

    // Finance Data Debug
    Route::get('/debug-finance-data', function () {
        $data = [];

        $tables = ['payments', 'contributions', 'gifts', 'sponsors', 'sponsor_payments', 'expenses'];

        foreach ($tables as $table) {
            try {
                $firstRow = DB::table($table)->first();
                $data[$table] = [
                    'exists' => true,
                    'count' => DB::table($table)->count(),
                    'has_data' => $firstRow ? true : false,
                    'sample' => $firstRow,
                    'columns' => $firstRow ? array_keys((array)$firstRow) : []
                ];
            } catch (\Exception $e) {
                $data[$table] = [
                    'exists' => false,
                    'error' => $e->getMessage()
                ];
            }
        }

        return response()->json($data);
    });
});
Route::get('/debug/attendance-session', function () {
    $date = '2026-06-15';
    $sessionType = 'su';

    $permissions = DB::select("
        SELECT 
            p.*,
            u.name as user_name
        FROM permission_requests p
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.start_date <= ? AND p.end_date >= ?
    ", [$date, $date]);

    return response()->json([
        'date' => $date,
        'session_type' => $sessionType,
        'permissions_found' => $permissions
    ]);
})->middleware('auth');

// Add to web.php for testing
Route::get('/test-email', function() {
    try {
        \Mail::raw('Test email from Reverence Worship', function($message) {
            $message->to('your-test-email@gmail.com')
                    ->subject('Test Email');
        });
        return 'Email sent successfully! Check your inbox.';
    } catch (\Exception $e) {
        return 'Error: ' . $e->getMessage();
    }
})->middleware('auth');
// Notification Routes
Route::middleware(['auth'])->prefix('notifications')->group(function () {
    Route::get('/', [App\Http\Controllers\NotificationController::class, 'getNotifications'])->name('notifications.index');
    Route::get('/unread-count', [App\Http\Controllers\NotificationController::class, 'getUnreadCount'])->name('notifications.unread-count');
    Route::post('/{id}/read', [App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
    Route::post('/mark-all-read', [App\Http\Controllers\NotificationController::class, 'markAllRead'])->name('notifications.mark-all-read');
});
Route::get('/debug/membership-types', function() {
    $users = \App\Models\User\User::whereNotNull('membership_type')
        ->select('id', 'name', 'email', 'membership_type')
        ->get();
    
    return response()->json([
        'total_users_with_membership' => $users->count(),
        'membership_types' => $users->groupBy('membership_type')->map(function($group) {
            return [
                'count' => $group->count(),
                'sample_names' => $group->pluck('name')->take(3)->toArray()
            ];
        }),
        'all_users' => $users->map(function($user) {
            return [
                'name' => $user->name,
                'membership_type' => $user->membership_type
            ];
        })->take(20)->toArray()
    ]);
})->middleware('auth');
Route::get('/debug/singer-fields', function() {
    $user = \App\Models\User\User::where('membership_type', 'Permanent')
        ->where('is_active', true)
        ->first();
    
    if (!$user) {
        return response()->json([
            'message' => 'No permanent members found',
            'all_users' => \App\Models\User\User::where('membership_type', 'Permanent')->get(['id', 'name', 'membership_type'])
        ]);
    }
    
    // Get column names from the users table
    $columns = DB::select("
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
    ");
    
    $columnNames = array_column($columns, 'column_name');
    
    return response()->json([
        'user_sample' => $user->toArray(),
        'all_columns' => $columnNames,
        'voice_part_exists' => in_array('voice_part', $columnNames),
        'singer_level_exists' => in_array('singer_level', $columnNames),
        'voice_part_value' => $user->voice_part ?? 'NULL',
        'singer_level_value' => $user->singer_level ?? 'NULL',
        'membership_type_value' => $user->membership_type,
        'total_permanent_users' => \App\Models\User\User::where('membership_type', 'Permanent')->count()
    ]);
})->middleware('auth');
// ==================== INCLUDE ALL MODULE ROUTES ====================
require __DIR__ . '/admin.php';
require __DIR__ . '/users.php';
require __DIR__ . '/music.php';
require __DIR__ . '/intercession.php';
require __DIR__ . '/social-fellowship.php';
require __DIR__ . '/discipline.php';
require __DIR__ . '/finance.php';
require __DIR__ . '/family.php';
require __DIR__ . '/profile.php';
require __DIR__ . '/announcements.php';
require __DIR__ . '/reports.php';
require __DIR__ . '/permission.php';
require __DIR__ . '/parent.php';
