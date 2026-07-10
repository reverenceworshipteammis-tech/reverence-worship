<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User\Role;
use App\Models\System\Page;
use App\Models\System\Feature;
use App\Models\System\RolePageFeature;
use App\Models\System\ActivityLog;
use App\Models\User\User;

class RoleController extends Controller
{
    // Display list of roles
    // Display list of roles
public function index()
{
    $roles = Role::paginate(10);
    return view('super-admin.roles.index', compact('roles'));
}
    
    // Show create role form
    public function create()
    {
        $pages = Page::where('is_active', true)->orderBy('sort_order')->get();
        $features = Feature::with('page')->get();
        return view('super-admin.roles.create', compact('pages', 'features'));
    }
    
    // Store new role
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles',
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
        
        $role = Role::create([
            'name' => strtolower(str_replace(' ', '-', $request->name)),
            'display_name' => $request->display_name,
            'description' => $request->description
        ]);
        
        // Assign page features if any
        if ($request->has('features')) {
            foreach ($request->features as $featureId) {
                $feature = Feature::find($featureId);
                if ($feature) {
                    RolePageFeature::create([
                        'role_id' => $role->id,
                        'page_id' => $feature->page_id,
                        'feature_id' => $featureId
                    ]);
                }
            }
        }
        User::refreshPermissionCache();
        
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'role_created',
            'description' => 'Created role: ' . $role->display_name,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);
        
        return redirect()->route('roles.index')->with('success', 'Role created successfully!');
    }
    
    // Show edit role form
    public function edit($id)
    {
        $role = Role::findOrFail($id);
        $pages = Page::where('is_active', true)->orderBy('sort_order')->get();
        $features = Feature::with('page')->get();
        $assignedFeatureIds = RolePageFeature::where('role_id', $id)->pluck('feature_id')->toArray();
        
        return view('super-admin.roles.edit', compact('role', 'pages', 'features', 'assignedFeatureIds'));
    }
    
    // Update role
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);
        
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $id,
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);
        
        // Prevent modifying super-admin name
        if ($role->name !== 'super-admin') {
            $role->name = strtolower(str_replace(' ', '-', $request->name));
        }
        $role->display_name = $request->display_name;
        $role->description = $request->description;
        $role->save();
        
        // Update page features (only for non super-admin)
        if ($role->name !== 'super-admin') {
            // Delete existing
            RolePageFeature::where('role_id', $id)->delete();
            
            // Add new
            if ($request->has('features')) {
                foreach ($request->features as $featureId) {
                    $feature = Feature::find($featureId);
                    if ($feature) {
                        RolePageFeature::create([
                            'role_id' => $id,
                            'page_id' => $feature->page_id,
                            'feature_id' => $featureId
                        ]);
                    }
                }
            }
        }
        User::refreshPermissionCache();
        
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'role_updated',
            'description' => 'Updated role: ' . $role->display_name,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);
        
        return redirect()->route('roles.index')->with('success', 'Role updated successfully!');
    }
    
    // Delete role
    public function destroy(Request $request, $id)
    {
        $role = Role::findOrFail($id);
        
        // Prevent deleting super-admin role
        if ($role->name === 'super-admin') {
            return back()->with('error', 'Cannot delete Super Admin role!');
        }
        
        // Delete associated page features
        RolePageFeature::where('role_id', $id)->delete();
        
        $roleName = $role->display_name;
        $role->delete();
        User::refreshPermissionCache();
        
        // Log activity
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => 'role_deleted',
            'description' => 'Deleted role: ' . $roleName,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent()
        ]);
        
        return redirect()->route('roles.index')->with('success', 'Role deleted successfully!');
    }
    
    // View role details
    // View role details
public function show($id)
{
    $role = Role::findOrFail($id);
    $assignedFeatures = RolePageFeature::where('role_id', $id)
        ->with(['page', 'feature'])
        ->get();
    
    $groupedFeatures = [];
    foreach ($assignedFeatures as $assigned) {
        if (!isset($groupedFeatures[$assigned->page->display_name])) {
            $groupedFeatures[$assigned->page->display_name] = [];
        }
        $groupedFeatures[$assigned->page->display_name][] = $assigned->feature;
    }
    
    return view('super-admin.roles.show', compact('role', 'groupedFeatures'));
}
}
