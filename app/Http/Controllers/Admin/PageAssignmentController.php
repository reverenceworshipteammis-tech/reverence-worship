<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User\Role;
use App\Models\System\Page;
use App\Models\System\Feature;
use App\Models\User\RolePageFeature;
use App\Models\User\User;
use App\Models\System\ActivityLog;

class PageAssignmentController extends Controller
{
    // Show page assignment interface
    public function index()
    {
        $roles = Role::where('name', '!=', 'super-admin')->get();
        $pages = Page::where('is_active', true)->orderBy('sort_order')->get();
        $allFeatures = Feature::with('page')->get();
        
        // Get all existing assignments grouped by role
        $allAssignments = [];
        $assignments = RolePageFeature::all();
        foreach ($assignments as $assignment) {
            if (!isset($allAssignments[$assignment->role_id])) {
                $allAssignments[$assignment->role_id] = [];
            }
            $allAssignments[$assignment->role_id][] = [
                'page_id' => $assignment->page_id,
                'feature_id' => $assignment->feature_id
            ];
        }
        
        return view('super-admin.page-assignment', compact('roles', 'pages', 'allFeatures', 'allAssignments'));
    }
    
    // Save page assignments for a role
    public function saveAssignments(Request $request)
    {
        try {
            $request->validate([
                'role_id' => 'required|exists:roles,id',
                'assignments' => 'array'
            ]);
            
            $roleId = $request->role_id;
            
            // Delete existing assignments for this role
            RolePageFeature::where('role_id', $roleId)->delete();
            
            // Insert new assignments
            if ($request->has('assignments') && is_array($request->assignments)) {
                foreach ($request->assignments as $assignment) {
                    if (isset($assignment['page_id']) && isset($assignment['feature_id'])) {
                        RolePageFeature::create([
                            'role_id' => $roleId,
                            'page_id' => $assignment['page_id'],
                            'feature_id' => $assignment['feature_id']
                        ]);
                    }
                }
            }
            User::refreshPermissionCache();
            
            // Log activity
            $role = Role::find($roleId);
            ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'page_assignments_updated',
                'description' => 'Updated page assignments for role: ' . ($role ? $role->display_name : 'Unknown'),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent()
            ]);
            
            return response()->json(['success' => true, 'message' => 'Assignments saved successfully!']);
            
        } catch (\Exception $e) {
            \Log::error('Error saving assignments: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
