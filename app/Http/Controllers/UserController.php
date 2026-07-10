<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User\User;
use App\Models\User\Role;
use App\Models\System\ActivityLog;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;

class UserController extends Controller
{
    // Display list of users with filters
    public function index(Request $request)
{
    // Get all users, not just administrators
    $query = User::query();
    
    // Apply search filter if present
    if ($request->has('search') && !empty($request->search)) {
        $search = $request->search;
        $query->where(function($q) use ($search) {
            $q->where('name', 'LIKE', "%{$search}%")
              ->orWhere('email', 'LIKE', "%{$search}%");
        });
    }
    
    // Apply role filter if present
    if ($request->has('role') && !empty($request->role)) {
        $query->whereHas('roles', function($q) use ($request) {
            $q->where('role_id', $request->role);
        });
    }
    
    // Apply status filter if present
    if ($request->has('status') && !empty($request->status)) {
        if ($request->status == 'active') {
            $query->where('is_active', true);
        } elseif ($request->status == 'inactive') {
            $query->where('is_active', false)->whereNotNull('created_by');
        } elseif ($request->status == 'pending') {
            $query->where('is_active', false)->whereNull('created_by')->whereNull('email_verified_at');
        }
    }
    
    $users = $query->with('roles')->orderBy('name')->paginate(15);
    
    // Get all roles for the filter dropdown
    $roles = Role::where('name', '!=', 'super-admin')->get();
    
    // Calculate stats for all users (FIXED: handle case sensitivity)
    $stats = [
        'total' => User::count(),
        'active' => User::where('is_active', true)->count(),
        'inactive' => User::where('is_active', false)->whereNotNull('created_by')->count(),
        'pending' => User::where('is_active', false)->whereNull('created_by')->whereNull('email_verified_at')->count(),
        // Fix: Use case-insensitive comparison for gender
        'male' => User::whereRaw('LOWER(gender) = ?', ['male'])->count(),
        'female' => User::whereRaw('LOWER(gender) = ?', ['female'])->count(),
    ];
    
    return view('super-admin.users.index', compact('users', 'roles', 'stats'));
}
    
    // Show single user
    public function show($id)
    {
        $user = User::with('roles')->findOrFail($id);
        return view('user.show', compact('user'));
    }
    
    // Show create user form
    public function create()
    {
        $roles = Role::all();
        return view('super-admin.users.create', compact('roles'));
    }
    
    /**
     * Approve a pending user (first time approval)
     */
    public function approve($id)
    {
        $user = User::findOrFail($id);
        
        if ($user->is_active) {
            return response()->json(['success' => false, 'message' => 'User is already active']);
        }
        
        $user->is_active = true;
        $user->created_by = auth()->id();
        $user->email_verified_at = now();
        $user->save();
        
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'user_approved',
            'description' => 'Approved user: ' . $user->email,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
        
        return response()->json(['success' => true, 'message' => 'User approved successfully!']);
    }

    /**
     * Reject a pending user registration.
     */
    public function reject(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($user->is_active || $user->created_by !== null || $user->email_verified_at !== null) {
            return response()->json(['success' => false, 'message' => 'Only pending users can be rejected.']);
        }

        $userEmail = $user->email;
        $userName = $user->name;

        $user->delete();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'user_rejected',
            'description' => 'Rejected pending user: ' . $userEmail . ' (' . $userName . ')',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);

        return response()->json(['success' => true, 'message' => 'Pending user rejected successfully!']);
    }
    
    /**
     * Activate a previously deactivated user
     */
    public function activate($id)
    {
        $user = User::findOrFail($id);
        
        if ($user->is_active) {
            return response()->json(['success' => false, 'message' => 'User is already active']);
        }
        
        $user->is_active = true;
        $user->save();
        
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'user_activated',
            'description' => 'Activated user: ' . $user->email,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
        
        return response()->json(['success' => true, 'message' => 'User activated successfully!']);
    }
    
    /**
     * Deactivate an active user
     */
    public function deactivate($id)
    {
        $user = User::findOrFail($id);
        
        if (!$user->is_active) {
            return response()->json(['success' => false, 'message' => 'User is already inactive']);
        }
        
        // Prevent deactivating yourself
        if ($user->id === auth()->id()) {
            return response()->json(['success' => false, 'message' => 'You cannot deactivate your own account!']);
        }
        
        $user->is_active = false;
        $user->save();
        
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'user_deactivated',
            'description' => 'Deactivated user: ' . $user->email,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent()
        ]);
        
        return response()->json(['success' => true, 'message' => 'User deactivated successfully!']);
    }
    public function exportSingleUserPdf($id)
{
    try {
        $user = User::with('roles')->findOrFail($id);
        
        $data = [
            'user' => $user,
            'generated_date' => now()->format('F j, Y H:i:s'),
        ];
        
        $pdf = Pdf::loadView('super-admin.users.single-user-pdf', $data);
        $pdf->setPaper('a4', 'portrait');
        
        return $pdf->download('user_' . $user->name . '_details.pdf');
        
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
    // Get create form for modal
    public function getCreateForm()
    {
        $roles = Role::all();
        return view('super-admin.users.modals.create-form', compact('roles'));
    }
    
    // Get edit form for modal
    public function getEditForm($id)
    {
        $user = User::findOrFail($id);
        $roles = Role::all();
        return view('super-admin.users.modals.edit-form', compact('user', 'roles'));
    }
    
    // Get user JSON for view modal
    public function getUserJson($id)
    {
        $user = User::with('roles')->findOrFail($id);
        
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone ?? '-',
            'gender' => $user->gender ?? '-',
            'address' => $user->address ?? '-',
            'date_of_birth' => $user->date_of_birth ? date('M d, Y', strtotime($user->date_of_birth)) : '-',
            'is_active' => $user->is_active,
            'created_at' => $user->created_at ? date('M d, Y', strtotime($user->created_at)) : 'N/A',
            'updated_at' => $user->updated_at ? date('M d, Y', strtotime($user->updated_at)) : 'N/A',
            'email_verified_at' => $user->email_verified_at ? date('M d, Y', strtotime($user->email_verified_at)) : 'Not verified',
            'province' => $user->province ?? '-',
            'district' => $user->district ?? '-',
            'sector' => $user->sector ?? '-',
            'village' => $user->village ?? '-',
            'marital_status' => $user->marital_status ?? '-',
            'membership_type' => $user->membership_type ?? '-',
            'occupation' => $user->occupation ?? '-',
            'ministry_role' => $user->ministry_role ?? '-',
            'emergency_contact' => $user->emergency_contact ?? '-',
            'emergency_name' => $user->emergency_name ?? '-',
            'skills' => $user->skills ?? '-',
            'notes' => $user->notes ?? '-',
            'is_singer' => $user->is_singer ?? false,
            'voice_part' => $user->voice_part ?? '-',
            'singer_level' => $user->singer_level ?? '-',
            'singer_notes' => $user->singer_notes ?? '-',
            'roles' => $user->roles->map(function($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'display_name' => $role->display_name
                ];
            }),
        ]);
    }
    
    // Get edit roles form for modal
    public function getEditRolesForm($id)
    {
        $user = User::with('roles')->findOrFail($id);
        $roles = Role::all();
        return view('super-admin.users.modals.edit-roles', compact('user', 'roles'));
    }
    
    // Store new user
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6|confirmed',
            'roles' => 'array',
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'province' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'sector' => 'nullable|string|max:100',
            'village' => 'nullable|string|max:100',
            'gender' => 'nullable|string|max:20',
            'marital_status' => 'nullable|string|max:50',
            'membership_type' => 'nullable|string|max:50',
            'occupation' => 'nullable|string|max:100',
            'ministry_role' => 'nullable|string|max:100',
            'emergency_contact' => 'nullable|string|max:20',
            'emergency_name' => 'nullable|string|max:100',
            'skills' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);
        
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'is_active' => true,
            'created_by' => auth()->id(),
            'phone' => $request->phone,
            'date_of_birth' => $request->date_of_birth,
            'province' => $request->province,
            'district' => $request->district,
            'sector' => $request->sector,
            'village' => $request->village,
            'gender' => $request->gender,
            'marital_status' => $request->marital_status,
            'membership_type' => $request->membership_type,
            'occupation' => $request->occupation,
            'ministry_role' => $request->ministry_role,
            'emergency_contact' => $request->emergency_contact,
            'emergency_name' => $request->emergency_name,
            'skills' => $request->skills,
            'notes' => $request->notes,
            'is_singer' => $request->has('is_singer'),
            'voice_part' => $request->voice_part,
            'singer_level' => $request->singer_level,
            'singer_notes' => $request->singer_notes
        ]);
        
        // Assign roles
        if ($request->has('roles')) {
            $user->roles()->attach($request->roles);
            User::refreshPermissionCache();
        }
        
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'user_created',
            'description' => 'Created user: ' . $user->email,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);
        
        if ($request->ajax()) {
            return response()->json(['success' => true, 'message' => 'User created successfully']);
        }
        
        return redirect()->route('users.index')->with('success', 'User created successfully!');
    }
    
    // Show edit user form
    public function edit($id)
    {
        $user = User::findOrFail($id);
        $roles = Role::all();
        return view('super-admin.users.edit', compact('user', 'roles'));
    }
    
    // Update user
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'password' => 'nullable|min:6|confirmed',
            'roles' => 'array',
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'province' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'sector' => 'nullable|string|max:100',
            'village' => 'nullable|string|max:100',
            'gender' => 'nullable|string|max:20',
            'marital_status' => 'nullable|string|max:50',
            'membership_type' => 'nullable|string|max:50',
            'occupation' => 'nullable|string|max:100',
            'ministry_role' => 'nullable|string|max:100',
            'emergency_contact' => 'nullable|string|max:20',
            'emergency_name' => 'nullable|string|max:100',
            'skills' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);
        
        $user->name = $request->name;
        $user->email = $request->email;
        $user->phone = $request->phone;
        $user->date_of_birth = $request->date_of_birth;
        $user->province = $request->province;
        $user->district = $request->district;
        $user->sector = $request->sector;
        $user->village = $request->village;
        $user->gender = $request->gender;
        $user->marital_status = $request->marital_status;
        $user->membership_type = $request->membership_type;
        $user->occupation = $request->occupation;
        $user->ministry_role = $request->ministry_role;
        $user->emergency_contact = $request->emergency_contact;
        $user->emergency_name = $request->emergency_name;
        $user->skills = $request->skills;
        $user->notes = $request->notes;
        $user->is_singer = $request->has('is_singer');
        $user->voice_part = $request->voice_part;
        $user->singer_level = $request->singer_level;
        $user->singer_notes = $request->singer_notes;
        
        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }
        
        $user->save();
        
        // Sync roles
        $user->roles()->sync($request->roles ?? []);
        User::refreshPermissionCache();
        
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'user_updated',
            'description' => 'Updated user: ' . $user->email,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);
        
        if ($request->ajax()) {
            return response()->json(['success' => true, 'message' => 'User updated successfully']);
        }
        
        return redirect()->route('users.index')->with('success', 'User updated successfully!');
    }
    
    // Update user roles
    public function updateRoles(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        $request->validate([
            'roles' => 'array'
        ]);
        
        $user->roles()->sync($request->roles ?? []);
        User::refreshPermissionCache();
        
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'user_roles_updated',
            'description' => 'Updated roles for user: ' . $user->email,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);
        
        if ($request->ajax()) {
            return response()->json(['success' => true, 'message' => 'Roles updated successfully']);
        }
        
        return redirect()->route('users.index')->with('success', 'User roles updated successfully!');
    }
    
    // Delete user
    public function destroy(Request $request, $id)
{
    $user = User::findOrFail($id);
    
    // Prevent deleting yourself
    if ($user->id === auth()->id()) {
        if ($request->ajax()) {
            return response()->json(['success' => false, 'message' => 'You cannot delete your own account!']);
        }
        return redirect()->back()->with('error', 'You cannot delete your own account!');
    }
    
    try {
        DB::beginTransaction();
        
        $userEmail = $user->email;
        $userName = $user->name;
        
        // Check if user has team_members records
        $teamMemberCount = DB::table('team_members')->where('user_id', $id)->count();
        
        if ($teamMemberCount > 0) {
            // Option 1: Delete related team_members first
            DB::table('team_members')->where('user_id', $id)->delete();
            
            // Option 2: Or update the team_members to set user_id to null if the column allows null
            // DB::table('team_members')->where('user_id', $id)->update(['user_id' => null]);
        }
        
        // Check other foreign key constraints
        // Add other tables that reference users here
        // Example: attendance_records
        $attendanceCount = DB::table('attendance_records')->where('user_id', $id)->count();
        if ($attendanceCount > 0) {
            DB::table('attendance_records')->where('user_id', $id)->delete();
        }
        
        // Check permission_requests
        $permissionCount = DB::table('permission_requests')->where('user_id', $id)->count();
        if ($permissionCount > 0) {
            DB::table('permission_requests')->where('user_id', $id)->delete();
        }
        
        // Check family_members
        $familyCount = DB::table('family_members')->where('user_id', $id)->count();
        if ($familyCount > 0) {
            DB::table('family_members')->where('user_id', $id)->delete();
        }
        
        // Now delete the user
        $user->delete();
        
        DB::commit();
        
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'user_deleted',
            'description' => 'Deleted user: ' . $userEmail . ' (' . $userName . ')',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);
        
        if ($request->ajax()) {
            return response()->json(['success' => true, 'message' => 'User deleted successfully']);
        }
        
        return redirect()->route('users.index')->with('success', 'User deleted successfully!');
        
    } catch (\Exception $e) {
        DB::rollBack();
        \Log::error('User deletion error: ' . $e->getMessage());
        
        if ($request->ajax()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete user: ' . $e->getMessage()
            ], 500);
        }
        
        return redirect()->back()->with('error', 'Error deleting user: ' . $e->getMessage());
    }
}
    
    // Toggle user status
    public function toggleStatus(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        // Prevent deactivating yourself
        if ($user->id === auth()->id()) {
            if ($request->ajax()) {
                return response()->json(['success' => false, 'message' => 'You cannot change your own status!']);
            }
            return redirect()->back()->with('error', 'You cannot change your own status!');
        }
        
        $user->is_active = !$user->is_active;
        $user->save();
        
        $status = $user->is_active ? 'activated' : 'deactivated';
        
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'user_status_changed',
            'description' => ucfirst($status) . ' user: ' . $user->email,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);
        
        if ($request->ajax()) {
            return response()->json(['success' => true, 'message' => 'User ' . $status . ' successfully']);
        }
        
        return redirect()->back()->with('success', 'User ' . $status . ' successfully!');
    }
    
    // Export users to CSV
    public function export(Request $request)
    {
        $query = User::with('roles');
        
        // Apply same filters
        if ($request->has('search') && $request->search) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }
        
        if ($request->has('role') && $request->role) {
            $query->whereHas('roles', function($q) use ($request) {
                $q->where('roles.id', $request->role);
            });
        }
        
        if ($request->has('status') && $request->status) {
            if ($request->status == 'active') {
                $query->where('is_active', true);
            } elseif ($request->status == 'inactive') {
                $query->where('is_active', false);
            }
        }
        
        $users = $query->orderBy('created_at', 'desc')->get();
        
        // Get family information for each user
        $userIds = $users->pluck('id')->toArray();
        
        if (!empty($userIds)) {
            $familyMemberships = DB::select("
                SELECT fm.user_id, f.name as family_name, fm.role
                FROM family_members fm
                JOIN families f ON f.id = fm.family_id
                WHERE fm.user_id IN (" . implode(',', array_fill(0, count($userIds), '?')) . ")
            ", $userIds);
            
            // Create a lookup array
            $familyLookup = [];
            foreach ($familyMemberships as $membership) {
                $familyLookup[$membership->user_id] = [
                    'family_name' => $membership->family_name,
                    'role' => $membership->role
                ];
            }
            
            // Assign family info to users
            foreach ($users as $user) {
                if (isset($familyLookup[$user->id])) {
                    $user->family_name = $familyLookup[$user->id]['family_name'];
                    $user->family_role = $familyLookup[$user->id]['role'];
                } else {
                    $user->family_name = '-';
                    $user->family_role = '-';
                }
            }
        } else {
            foreach ($users as $user) {
                $user->family_name = '-';
                $user->family_role = '-';
            }
        }
        
        $filename = 'users_export_' . date('Y-m-d_His') . '.csv';
        $handle = fopen('php://temp', 'w+');
        
        // Add UTF-8 BOM for Excel compatibility
        fwrite($handle, "\xEF\xBB\xBF");
        
        // Add headers - same columns as PDF
        fputcsv($handle, [
            '#', 
            'Name', 
            'Email', 
            'Phone', 
            'Role', 
            'Status', 
            'DOB', 
            'Gender', 
            'Marital Status', 
            'Residence', 
            'Family', 
            'Occupation'
        ]);
        
        // Add data
        $counter = 1;
        foreach ($users as $user) {
            // Build residence string
            $residence = [];
            if ($user->province) $residence[] = $user->province;
            if ($user->district) $residence[] = $user->district;
            if ($user->sector) $residence[] = $user->sector;
            if ($user->village) $residence[] = $user->village;
            $residenceStr = !empty($residence) ? implode(', ', $residence) : '-';
            
            // Build roles string
            $rolesStr = '';
            foreach ($user->roles as $role) {
                $rolesStr .= $role->display_name . ', ';
            }
            $rolesStr = rtrim($rolesStr, ', ');
            if (empty($rolesStr)) $rolesStr = '-';
            
            // Build family string
            $familyStr = '-';
            if (isset($user->family_name) && $user->family_name && $user->family_name != '-') {
                $familyStr = $user->family_name;
                if (isset($user->family_role) && $user->family_role && $user->family_role != '-') {
                    $familyStr .= ' (' . ucfirst($user->family_role) . ')';
                }
            }
            
            fputcsv($handle, [
                $counter++,
                $user->name,
                $user->email,
                $user->phone ?? '-',
                $rolesStr,
                $user->is_active ? 'Active' : 'Inactive',
                $user->date_of_birth ? date('d/m/y', strtotime($user->date_of_birth)) : '-',
                $user->gender ?? '-',
                $user->marital_status ?? '-',
                $residenceStr,
                $familyStr,
                $user->occupation ?? '-'
            ]);
        }
        
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);
        
        return response($csv, 200)
            ->header('Content-Type', 'text/csv; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }
    // Export users to PDF
public function exportPdf(Request $request)
{
    try {
        $query = User::with('roles');
        
        // Apply filters
        if ($request->has('search') && $request->search) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }
        
        if ($request->has('role') && $request->role) {
            $query->whereHas('roles', function($q) use ($request) {
                $q->where('roles.id', $request->role);
            });
        }
        
        if ($request->has('status') && $request->status) {
            if ($request->status == 'active') {
                $query->where('is_active', true);
            } elseif ($request->status == 'inactive') {
                $query->where('is_active', false)->whereNotNull('created_by');
            } elseif ($request->status == 'pending') {
                $query->where('is_active', false)->whereNull('created_by')->whereNull('email_verified_at');
            }
        }
        
        $users = $query->orderBy('created_at', 'desc')->get();
        
        $data = [
            'users' => $users,
            'generated_date' => now()->format('F j, Y H:i:s'),
            'total_users' => $users->count(),
            'active_users' => $users->where('is_active', true)->count(),
            'inactive_users' => $users->where('is_active', false)->whereNotNull('created_by')->count(),
            'pending_users' => $users->where('is_active', false)->whereNull('created_by')->count(),
        ];
        
        $pdf = Pdf::loadView('super-admin.users.export-pdf', $data);
        $pdf->setPaper('a4', 'landscape');
        
        return $pdf->download('users_report_' . date('Y-m-d_His') . '.pdf');
        
    } catch (\Exception $e) {
        \Log::error('PDF Export Error: ' . $e->getMessage());
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
}
