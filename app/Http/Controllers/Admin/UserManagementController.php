<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User\User;
use App\Models\User\Role;
use App\Models\System\ActivityLog;
use Illuminate\Support\Facades\Hash;

class UserManagementController extends Controller
{
    public function index(Request $request)
    {
        // Check permission using new method
        if (!auth()->user()->canAccess('user-management', 'view')) {
            abort(403, 'You do not have permission to access this page.');
        }
        
        $query = User::with('roles');
        
        // Admin can see ALL users except super admins
        // Remove any role restrictions
        $query->whereDoesntHave('roles', function($q) {
            $q->where('name', 'super-admin');
        });
        
        // Search
        if ($request->has('search') && $request->search) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%');
            });
        }
        
        $users = $query->orderBy('created_at', 'desc')->paginate(10);
        $roles = Role::where('name', '!=', 'super-admin')->get();
        
        return view('admin.users.index', compact('users', 'roles'));
    }
    
    public function create()
    {
        // Check permission using new method
        if (!auth()->user()->canAccess('user-management', 'create')) {
            abort(403, 'You do not have permission to create users.');
        }
        
        $roles = Role::where('name', '!=', 'super-admin')->get();
        return view('admin.users.create', compact('roles'));
    }
    
    public function store(Request $request)
    {
        // Check permission using new method
        if (!auth()->user()->canAccess('user-management', 'create')) {
            abort(403, 'You do not have permission to create users.');
        }
        
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6|confirmed',
            'roles' => 'array'
        ]);
        
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'is_active' => true,
            'created_by' => auth()->id()
        ]);
        
        if ($request->has('roles')) {
            $user->roles()->attach($request->roles);
            User::refreshPermissionCache();
        }
        
        return redirect()->route('admin.users.index')->with('success', 'User created successfully!');
    }
    
    public function editRolesForm($id)
{
    $user = User::with('roles')->findOrFail($id);
    $roles = Role::where('name', '!=', 'super-admin')->get();
    return view('admin.users.modals.edit-roles', compact('user', 'roles'));
}
    public function edit($id)
    {
        // Check permission using new method
        if (!auth()->user()->canAccess('user-management', 'edit')) {
            abort(403, 'You do not have permission to edit users.');
        }
        
        $user = User::findOrFail($id);
        $roles = Role::where('name', '!=', 'super-admin')->get();
        return view('admin.users.edit', compact('user', 'roles'));
    }
    
    public function update(Request $request, $id)
{
    // Check permission using new method
    if (!auth()->user()->canAccess('user-management', 'edit')) {
        abort(403, 'You do not have permission to edit users.');
    }
    
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
        'notes' => 'nullable|string',
        'is_singer' => 'nullable|boolean',
        'voice_part' => 'nullable|string|max:50',
        'singer_level' => 'nullable|string|max:50',
        'singer_notes' => 'nullable|string'
    ]);
    
    // Update user data
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
    if ($request->has('roles')) {
        $user->roles()->sync($request->roles);
        User::refreshPermissionCache();
    }
    
    // Log activity
    ActivityLog::create([
        'user_id' => auth()->id(),
        'action' => 'user_updated',
        'description' => 'Updated user: ' . $user->email,
        'ip_address' => $request->ip(),
        'user_agent' => $request->userAgent()
    ]);
    
    // Return JSON response for AJAX request
    if ($request->ajax()) {
        return response()->json(['success' => true, 'message' => 'User updated successfully!']);
    }
    
    return redirect()->route('admin.users.index')->with('success', 'User updated successfully!');
}
    
    public function destroy($id)
    {
        // Check permission using new method
        if (!auth()->user()->canAccess('user-management', 'delete')) {
            abort(403, 'You do not have permission to delete users.');
        }
        
        $user = User::findOrFail($id);
        
        if ($user->id === auth()->id()) {
            return back()->with('error', 'You cannot delete yourself!');
        }
        
        $user->delete();
        return redirect()->route('admin.users.index')->with('success', 'User deleted successfully!');
    }
    
    public function toggleStatus($id)
    {
        // Check permission using new method
        if (!auth()->user()->canAccess('user-management', 'edit')) {
            abort(403, 'You do not have permission to change user status.');
        }
        
        $user = User::findOrFail($id);
        
        if ($user->id === auth()->id()) {
            return back()->with('error', 'You cannot change your own status!');
        }
        
        $user->is_active = !$user->is_active;
        $user->save();
        
        $status = $user->is_active ? 'activated' : 'deactivated';
        return back()->with('success', 'User ' . $status . ' successfully!');
    }

    // Get create form HTML for modal
public function createForm()
{
    $roles = Role::where('name', '!=', 'super-admin')->get();
    return view('admin.users.modals.create-form', compact('roles'));
}

// Get edit form HTML for modal
public function editForm($id)
{
    $user = User::findOrFail($id);
    $roles = Role::where('name', '!=', 'super-admin')->get();
    return view('admin.users.modals.edit-form', compact('user', 'roles'));
}


public function updateRoles(Request $request, $id)
{
    $user = User::findOrFail($id);
    
    $request->validate([
        'roles' => 'array'
    ]);
    
    $user->roles()->sync($request->roles);
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
        return response()->json(['success' => true, 'message' => 'Roles updated successfully!']);
    }
    
    return redirect()->route('admin.users.index')->with('success', 'User roles updated successfully!');
}
}
