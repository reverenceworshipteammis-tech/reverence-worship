<?php

namespace App\Http\Controllers\SocialFellowship;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\ManagesActionPlans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Models\User\User;

class SocialFellowshipController extends Controller
{
    use ManagesActionPlans;

    protected ?string $actionPlanDepartment = 'social-fellowship';

    protected function actionPlanView(): string
    {
        return 'modules.social-fellowship.partials.action-plans-list';
    }

    public function index(Request $request)
{
    // Get the selected year from request, default to current year
    $selectedYear = $request->get('year', date('Y'));
    
    // ============================================
    // FAMILIES - Filter by year
    // ============================================
    $families = DB::table('families')
        ->leftJoin('family_members', 'families.id', '=', 'family_members.family_id')
        ->select('families.*', DB::raw('COUNT(DISTINCT family_members.id) as members_count'))
        ->groupBy('families.id')
        ->orderBy('families.created_at', 'desc');
    
    // ALWAYS filter by year - use the selected year
    $families = $families->where('families.year', $selectedYear);
    
    $families = $families->get();
    // ============================================
    // ALL USERS - Get users with their year-specific assignment
    // Using a subquery to check if user is assigned in the selected year
    // ============================================
    $allUsers = DB::table('users')
        ->leftJoin('family_members', function($join) use ($selectedYear) {
            $join->on('users.id', '=', 'family_members.user_id')
                 ->whereRaw('EXTRACT(YEAR FROM family_members.created_at) = ?', [$selectedYear]);
        })
        ->leftJoin('families', 'family_members.family_id', '=', 'families.id')
        ->select(
            'users.id',
            'users.name',
            'users.email',
            'users.phone',
            'users.province',
            'users.district',
            'users.sector',
            'users.village',
            'family_members.family_id',
            'family_members.role',
            'families.name as family_name',
            'families.year as family_year',
            DB::raw("CONCAT(COALESCE(users.province, ''), ', ', COALESCE(users.district, ''), ', ', COALESCE(users.sector, '')) as residence"),
            DB::raw("CASE WHEN family_members.id IS NOT NULL THEN true ELSE false END as is_assigned_in_year")
        )
        ->orderBy('users.name')
        ->paginate(15);
    
    // ============================================
    // Get previous/any family assignments for each user
    // ============================================
    foreach ($allUsers as $user) {
        // Get ALL family assignments for this user (not filtered by year)
        $allFamilies = DB::table('family_members')
            ->join('families', 'family_members.family_id', '=', 'families.id')
            ->where('family_members.user_id', $user->id)
            ->select('families.name', 'families.year', 'family_members.created_at', 'family_members.role')
            ->orderBy('family_members.created_at', 'desc')
            ->get();
        
        // Check if user has ANY family assignment
        $user->has_any_family = $allFamilies->isNotEmpty();
        $user->all_families = $allFamilies;
        
        // Find the most recent family assignment that is NOT the selected year
        $previousFamily = $allFamilies->first(function($family) use ($selectedYear) {
            return $family->year != $selectedYear;
        });
        
        if ($previousFamily) {
            $user->any_family_name = $previousFamily->name;
            $user->any_family_year = $previousFamily->year;
        } else {
            $user->any_family_name = null;
            $user->any_family_year = null;
        }
        
        // If user is NOT assigned in selected year, clear the family data
        if (!$user->is_assigned_in_year) {
            $user->family_name = null;
            $user->family_id = null;
            $user->family_year = null;
            $user->role = null;
        }
    }
    
    // ============================================
    // REGULAR USERS LIST FOR DROPDOWNS
    // ============================================
    $users = DB::table('users')->select('id', 'name', 'email')->get();
    
    // ============================================
    // AVAILABLE USERS (not in any family)
    // ============================================
    $availableUsers = DB::table('users')
        ->whereNotIn('id', function($query) {
            $query->select('user_id')->from('family_members');
        })
        ->get();
    
    // ============================================
    // REST OF THE CODE
    // ============================================
    $archiveSections = DB::table('archive_sections')
        ->where('module', 'social-fellowship')
        ->leftJoin('archive_pages', 'archive_sections.id', '=', 'archive_pages.section_id')
        ->select('archive_sections.*', DB::raw('COUNT(archive_pages.id) as pages_count'))
        ->groupBy('archive_sections.id')
        ->orderBy('archive_sections.created_at', 'desc')
        ->get();
    
    $tasks = DB::table('family_tasks')
        ->join('families', 'family_tasks.family_id', '=', 'families.id')
        ->select('family_tasks.*', 'families.name as family_name')
        ->orderBy('family_tasks.created_at', 'desc')
        ->get();
    
    foreach ($tasks as $task) {
        $subtasks = DB::table('task_subtasks')
            ->where('task_id', $task->id)
            ->get();
        
        $task->subtasks = $subtasks;
        $task->subtask_count = $subtasks->count();
        $task->completed_subtasks = $subtasks->where('is_completed', true)->count();
        $task->progress = $task->subtask_count > 0 
            ? round(($task->completed_subtasks / $task->subtask_count) * 100) 
            : 0;
        
        if ($task->progress === 100) {
            $task->status = 'completed';
        } elseif ($task->progress > 0) {
            $task->status = 'in-progress';
        } else {
            $task->status = 'pending';
        }
    }
    
    $totalFamilies = $families->count();
    $totalMembers = DB::table('family_members')->count();
    $activeTasks = DB::table('family_tasks')
        ->where('status', 'pending')
        ->orWhere('status', 'in-progress')
        ->count();
    
    return view('modules.social-fellowship.index', compact(
        'families', 
        'tasks',
        'archiveSections',
        'availableUsers',
        'allUsers',
        'users',
        'totalFamilies', 
        'totalMembers', 
        'activeTasks',
        'selectedYear'
    ));
}
    
    /**
     * Get available users to assign as parent for a family
     * Only shows users who are already members of the family
     */
    public function getAvailableParents($familyId)
    {
        try {
            // Get the family
            $family = DB::table('families')->where('id', $familyId)->first();
            
            if (!$family) {
                return response()->json([
                    'success' => false,
                    'message' => 'Family not found'
                ], 404);
            }
            
            // Get users who are members of this family
            $familyMembers = DB::table('family_members')
                ->join('users', 'family_members.user_id', '=', 'users.id')
                ->where('family_members.family_id', $familyId)
                ->select('users.id', 'users.name', 'users.email')
                ->get();
            
            return response()->json([
                'success' => true,
                'users' => $familyMembers
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Change family parent - only from existing family members
     */
    public function changeParent(Request $request, $familyId)
    {
        try {
            $request->validate([
                'parent_id' => 'required|exists:users,id',
                'parent_name' => 'nullable|string'
            ]);
            
            // Get the family
            $family = DB::table('families')->where('id', $familyId)->first();
            
            if (!$family) {
                return response()->json([
                    'success' => false,
                    'message' => 'Family not found'
                ], 404);
            }
            
            // Check if the selected user is a member of this family
            $isMember = DB::table('family_members')
                ->where('family_id', $familyId)
                ->where('user_id', $request->parent_id)
                ->exists();
            
            if (!$isMember) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected user is not a member of this family.'
                ], 422);
            }
            
            // Get the parent name from users table
            $parentUser = DB::table('users')->where('id', $request->parent_id)->first();
            $parentName = $parentUser ? $parentUser->name : $request->parent_name;
            
            // Update the family
            DB::table('families')
                ->where('id', $familyId)
                ->update([
                    'parent_id' => $request->parent_id,
                    'parent_name' => $parentName,
                    'updated_at' => now()
                ]);
            
            // If there was a previous parent, update their role in family_members back to member
            if ($family->parent_id) {
                DB::table('family_members')
                    ->where('family_id', $familyId)
                    ->where('user_id', $family->parent_id)
                    ->update(['role' => 'member']);
            }
            
            // Update the new parent's role to parent
            DB::table('family_members')
                ->where('family_id', $familyId)
                ->where('user_id', $request->parent_id)
                ->update(['role' => 'parent']);
            
            return response()->json([
                'success' => true,
                'message' => 'Parent updated successfully'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    // Add a debug route to check data
    public function debugData()
    {
        $data = [];
        
        // Check families table
        $data['families_count'] = DB::table('families')->count();
        $data['families'] = DB::table('families')->get();
        
        // Check family_tasks table
        $data['family_tasks_count'] = DB::table('family_tasks')->count();
        $data['family_tasks'] = DB::table('family_tasks')->get();
        
        // Check task_subtasks table
        $data['task_subtasks_count'] = DB::table('task_subtasks')->count();
        $data['task_subtasks'] = DB::table('task_subtasks')->get();
        
        // Check family_action_plans table
        $data['family_action_plans_count'] = DB::table('family_action_plans')->count();
        $data['family_action_plans'] = DB::table('family_action_plans')->get();
        
        // Check archive_sections table
        $data['archive_sections_count'] = DB::table('archive_sections')->count();
        $data['archive_sections'] = DB::table('archive_sections')->get();
        
        // Check archive_pages table
        $data['archive_pages_count'] = DB::table('archive_pages')->count();
        
        // Check family_members table
        $data['family_members_count'] = DB::table('family_members')->count();
        
        return response()->json($data);
    }
    
    // ==================== FAMILY METHODS ====================
    
    public function getFamily($id)
    {
        try {
            $family = DB::table('families')->where('id', $id)->first();
            return response()->json(['success' => true, 'family' => $family]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
    
    public function deleteFamily($id)
    {
        try {
            DB::table('family_members')->where('family_id', $id)->delete();
            DB::table('family_tasks')->where('family_id', $id)->delete();
            DB::table('task_subtasks')->whereIn('task_id', function($query) use ($id) {
                $query->select('id')->from('family_tasks')->where('family_id', $id);
            })->delete();
            DB::table('family_action_plans')->where('family_id', $id)->delete();
            DB::table('families')->where('id', $id)->delete();
            
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
    
    public function getFamilyDetails($id)
    {
        try {
            $family = DB::table('families')->where('id', $id)->first();
            
            $members = DB::table('family_members')
                ->join('users', 'family_members.user_id', '=', 'users.id')
                ->where('family_members.family_id', $id)
                ->select(
                    'family_members.id',
                    'family_members.user_id',
                    'family_members.family_id',
                    'family_members.role',
                    'users.name',
                    'users.email',
                    'users.phone',
                    'users.province',
                    'users.district',
                    'users.sector',
                    'users.village'
                )
                ->get();
            
            foreach ($members as $member) {
                $locationParts = array_filter([
                    $member->province ?? '',
                    $member->district ?? '',
                    $member->sector ?? '',
                    $member->village ?? ''
                ]);
                $member->location = !empty($locationParts) ? implode(', ', $locationParts) : 'Not specified';
            }
            
            return response()->json([
                'success' => true,
                'family' => $family,
                'members' => $members
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
    
    public function storeFamily(Request $request)
{
    try {
        $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:users,id',
            'parent_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'motto' => 'nullable|string'
        ]);
        
        // Check if the selected parent is already a parent of another family
        if ($request->parent_id) {
            $existingParent = DB::table('families')
                ->where('parent_id', $request->parent_id)
                ->first();
            
            if ($existingParent) {
                return response()->json([
                    'success' => false, 
                    'message' => 'This user is already a parent of another family. A parent cannot be in multiple families.'
                ], 400);
            }
            
            // Check if the selected parent is already a member of another family
            $existingMember = DB::table('family_members')
                ->where('user_id', $request->parent_id)
                ->first();
            
            if ($existingMember) {
                return response()->json([
                    'success' => false, 
                    'message' => 'This user is already a member of another family. A person cannot be in multiple families.'
                ], 400);
            }
        }
        
        $parentName = $request->parent_name;
        if ($request->parent_id) {
            $parentUser = DB::table('users')->where('id', $request->parent_id)->first();
            if ($parentUser) {
                $parentName = $parentUser->name;
            }
        }
        
        // Get the year from request or use current year
        $year = $request->get('year', date('Y'));
        
        $id = DB::table('families')->insertGetId([
            'name' => $request->name,
            'parent_name' => $parentName,
            'parent_id' => $request->parent_id,
            'description' => $request->description,
            'motto' => $request->motto,
            'created_by' => auth()->id(),
            'created_at' => now(),
            'updated_at' => now(),
            'year' => $year
        ]);
        
        // Add the parent as a member of the family with the family's year
        if ($request->parent_id) {
            // Create date with the family's year (January 1st of that year)
            $createdAt = \Carbon\Carbon::create($year, 1, 1, 0, 0, 0);
            
            DB::table('family_members')->insert([
                'family_id' => $id,
                'user_id' => $request->parent_id,
                'role' => 'parent',
                'joined_at' => now(),
                'created_at' => $createdAt,
                'updated_at' => now()
            ]);
        }
        
        return response()->json(['success' => true, 'message' => 'Family created successfully', 'family_id' => $id]);
    } catch (\Illuminate\Database\QueryException $e) {
        if (str_contains($e->getMessage(), 'unique_user_per_family')) {
            return response()->json([
                'success' => false, 
                'message' => 'This user is already a member of another family. A person cannot be in multiple families.'
            ], 400);
        }
        if (str_contains($e->getMessage(), 'unique_parent_per_family')) {
            return response()->json([
                'success' => false, 
                'message' => 'This user is already a parent of another family. A parent cannot be in multiple families.'
            ], 400);
        }
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
    
    public function addMember(Request $request, $familyId)
{
    try {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'required|string'
        ]);
        
        // Check if user is already a member of ANY family
        $existingMember = DB::table('family_members')
            ->where('user_id', $request->user_id)
            ->first();
        
        if ($existingMember) {
            return response()->json([
                'success' => false, 
                'message' => 'This user is already a member of another family. A person cannot be in multiple families.'
            ], 400);
        }
        
        // Check if user is already a parent of another family
        $existingParent = DB::table('families')
            ->where('parent_id', $request->user_id)
            ->first();
        
        if ($existingParent) {
            return response()->json([
                'success' => false, 
                'message' => 'This user is already a parent of another family. A parent cannot be in multiple families.'
            ], 400);
        }
        
        // Get the family to get its year
        $family = DB::table('families')->where('id', $familyId)->first();
        $familyYear = $family->year ?? date('Y');
        
        // Create date with the family's year (January 1st of that year)
        $createdAt = \Carbon\Carbon::create($familyYear, 1, 1, 0, 0, 0);
        
        DB::table('family_members')->insert([
            'family_id' => $familyId,
            'user_id' => $request->user_id,
            'role' => $request->role,
            'joined_at' => now(),
            'created_at' => $createdAt,
            'updated_at' => now()
        ]);
        
        return response()->json(['success' => true, 'message' => 'Member added successfully']);
    } catch (\Illuminate\Database\QueryException $e) {
        if (str_contains($e->getMessage(), 'unique_user_per_family')) {
            return response()->json([
                'success' => false, 
                'message' => 'This user is already a member of another family. A person cannot be in multiple families.'
            ], 400);
        }
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
    
    public function removeMember($familyId, $userId)
    {
        try {
            DB::table('family_members')
                ->where('family_id', $familyId)
                ->where('user_id', $userId)
                ->delete();
            
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
    
    // ==================== TASK METHODS WITH SUBTASKS ====================
    
    public function storeTask(Request $request)
    {
        try {
            $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'family_id' => 'required|exists:families,id',
                'due_date' => 'nullable|date',
                'subtasks' => 'required|array|min:1',
                'subtasks.*' => 'required|string|max:255'
            ]);
            
            $taskId = DB::table('family_tasks')->insertGetId([
                'title' => $request->title,
                'description' => $request->description,
                'family_id' => $request->family_id,
                'due_date' => $request->due_date,
                'status' => 'pending',
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            // Create subtasks
            foreach ($request->subtasks as $subtaskTitle) {
                if (!empty(trim($subtaskTitle))) {
                    DB::table('task_subtasks')->insert([
                        'task_id' => $taskId,
                        'title' => trim($subtaskTitle),
                        'is_completed' => false,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }
            
            // Update task progress
            $this->updateTaskProgress($taskId);
            
            if ($request->ajax()) {
                return response()->json(['success' => true, 'task_id' => $taskId]);
            }
            
            return redirect()->back()->with('success', 'Task created successfully');
        } catch (\Exception $e) {
            if ($request->ajax()) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
            }
            return redirect()->back()->with('error', 'Error creating task: ' . $e->getMessage());
        }
    }
    
    public function getTask($id)
    {
        try {
            $task = DB::table('family_tasks')
                ->join('families', 'family_tasks.family_id', '=', 'families.id')
                ->where('family_tasks.id', $id)
                ->select('family_tasks.*', 'families.name as family_name')
                ->first();
            
            // Get subtasks
            if ($task) {
                $task->subtasks = DB::table('task_subtasks')
                    ->where('task_id', $task->id)
                    ->get();
            }
            
            return response()->json(['success' => true, 'task' => $task]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
    
    public function editTask($id)
    {
        try {
            $task = DB::table('family_tasks')->where('id', $id)->first();
            
            if ($task) {
                $task->subtasks = DB::table('task_subtasks')
                    ->where('task_id', $task->id)
                    ->get();
            }
            
            return response()->json(['success' => true, 'task' => $task]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
    
    public function updateTask(Request $request, $id)
    {
        try {
            $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'family_id' => 'required|exists:families,id',
                'due_date' => 'nullable|date',
                'subtasks' => 'required|array|min:1',
                'subtasks.*' => 'required|string|max:255'
            ]);
            
            // Update the task
            DB::table('family_tasks')
                ->where('id', $id)
                ->update([
                    'title' => $request->title,
                    'description' => $request->description,
                    'family_id' => $request->family_id,
                    'due_date' => $request->due_date,
                    'updated_at' => now()
                ]);
            
            // Get existing subtask IDs
            $existingSubtaskIds = DB::table('task_subtasks')
                ->where('task_id', $id)
                ->pluck('id')
                ->toArray();
            
            $subtaskIds = $request->input('subtask_ids', []);
            $subtaskTitles = $request->input('subtasks', []);
            
            // Update or create subtasks
            foreach ($subtaskTitles as $index => $title) {
                if (empty(trim($title))) continue;
                
                $subtaskId = isset($subtaskIds[$index]) && $subtaskIds[$index] !== 'new' 
                    ? $subtaskIds[$index] 
                    : null;
                
                if ($subtaskId && in_array($subtaskId, $existingSubtaskIds)) {
                    // Update existing subtask
                    DB::table('task_subtasks')
                        ->where('id', $subtaskId)
                        ->update([
                            'title' => trim($title),
                            'updated_at' => now()
                        ]);
                    // Remove from list to keep
                    $existingSubtaskIds = array_diff($existingSubtaskIds, [$subtaskId]);
                } else {
                    // Create new subtask
                    DB::table('task_subtasks')->insert([
                        'task_id' => $id,
                        'title' => trim($title),
                        'is_completed' => false,
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }
            
            // Delete removed subtasks
            if (!empty($existingSubtaskIds)) {
                DB::table('task_subtasks')
                    ->whereIn('id', $existingSubtaskIds)
                    ->delete();
            }
            
            // Update task progress
            $this->updateTaskProgress($id);
            
            if ($request->ajax()) {
                return response()->json(['success' => true]);
            }
            
            return redirect()->back()->with('success', 'Task updated successfully');
        } catch (\Exception $e) {
            if ($request->ajax()) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
            }
            return redirect()->back()->with('error', 'Error updating task: ' . $e->getMessage());
        }
    }
    
    public function deleteTask($id)
    {
        try {
            // Delete subtasks first
            DB::table('task_subtasks')->where('task_id', $id)->delete();
            // Delete the task
            DB::table('family_tasks')->where('id', $id)->delete();
            
            if (request()->ajax()) {
                return response()->json(['success' => true]);
            }
            
            return redirect()->back()->with('success', 'Task deleted successfully');
        } catch (\Exception $e) {
            if (request()->ajax()) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
            }
            return redirect()->back()->with('error', 'Error deleting task: ' . $e->getMessage());
        }
    }
    
    /**
     * Toggle subtask completion status
     */
    public function toggleSubtask($id)
    {
        try {
            $subtask = DB::table('task_subtasks')->where('id', $id)->first();
            
            if (!$subtask) {
                return response()->json(['success' => false, 'message' => 'Subtask not found'], 404);
            }
            
            $newStatus = !$subtask->is_completed;
            
            DB::table('task_subtasks')
                ->where('id', $id)
                ->update([
                    'is_completed' => $newStatus,
                    'completed_at' => $newStatus ? now() : null,
                    'updated_at' => now()
                ]);
            
            // Update task progress
            $this->updateTaskProgress($subtask->task_id);
            
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Update task progress based on subtasks
     */
    private function updateTaskProgress($taskId)
    {
        $subtasks = DB::table('task_subtasks')
            ->where('task_id', $taskId)
            ->get();
        
        $total = $subtasks->count();
        $completed = $subtasks->where('is_completed', true)->count();
        $progress = $total > 0 ? round(($completed / $total) * 100) : 0;
        
        $status = 'pending';
        if ($progress === 100) {
            $status = 'completed';
        } elseif ($progress > 0) {
            $status = 'in-progress';
        }
        
        DB::table('family_tasks')
            ->where('id', $taskId)
            ->update([
                'progress' => $progress,
                'status' => $status,
                'updated_at' => now()
            ]);
    }
    
    // ==================== ACTION PLAN METHODS ====================
    
    public function storeActionPlan(Request $request)
    {
        return $this->actionPlanStore($request);
    }

    public function actionPlans(Request $request)
    {
        return $this->actionPlanIndex($request);
    }

    public function editActionPlan($id)
    {
        return $this->actionPlanEdit($id);
    }

    public function updateActionPlan(Request $request, $id)
    {
        return $this->actionPlanUpdate($request, $id);
    }

    public function deleteActionPlan($id)
    {
        return $this->actionPlanDestroy($id);
    }

    public function addActionPlanTask(Request $request, $planId)
    {
        return $this->actionPlanAddTask($request, $planId);
    }

    public function updateActionPlanTask(Request $request, $taskId)
    {
        return $this->actionPlanUpdateTask($request, $taskId);
    }

    public function deleteActionPlanTask($taskId)
    {
        return $this->actionPlanDeleteTask($taskId);
    }
    
    // ==================== ARCHIVES METHODS ====================
    
    public function storeArchiveSection(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255'
            ]);
            
            $id = DB::table('archive_sections')->insertGetId([
                'name' => $request->name,
                'module' => 'social-fellowship',
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Section created successfully',
                'section_id' => $id
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    public function updateArchiveSection(Request $request, $id)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255'
            ]);
            
            DB::table('archive_sections')
                ->where('id', $id)
                ->where('module', 'social-fellowship')
                ->update([
                    'name' => $request->name,
                    'updated_at' => now()
                ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Section updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    public function deleteArchiveSection($id)
    {
        try {
            // Delete pages first
            DB::table('archive_pages')->where('section_id', $id)->delete();
            DB::table('archive_sections')
                ->where('id', $id)
                ->where('module', 'social-fellowship')
                ->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Section deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    public function getSectionPages($id)
    {
        try {
            $section = DB::table('archive_sections')
                ->where('id', $id)
                ->where('module', 'social-fellowship')
                ->first();
            
            if (!$section) {
                return response()->json([
                    'success' => false,
                    'message' => 'Section not found'
                ], 404);
            }
            
            $pages = DB::table('archive_pages')
                ->where('section_id', $id)
                ->orderBy('created_at', 'desc')
                ->get();
            
            foreach ($pages as $page) {
                $page->excerpt = Str::limit(strip_tags($page->content), 100);
                $page->formatted_date = date('F j, Y', strtotime($page->created_at));
            }
            
            return response()->json([
                'success' => true,
                'section_name' => $section->name,
                'pages' => $pages
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    public function storeArchivePage(Request $request)
    {
        try {
            $validated = $request->validate([
                'section_id' => 'required|integer|exists:archive_sections,id',
                'title' => 'required|string|max:255',
                'content' => 'required|string'
            ]);
            
            // Verify section exists and belongs to social-fellowship
            $section = DB::table('archive_sections')
                ->where('id', $validated['section_id'])
                ->where('module', 'social-fellowship')
                ->first();
            
            if (!$section) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid section'
                ], 400);
            }
            
            $id = DB::table('archive_pages')->insertGetId([
                'section_id' => $validated['section_id'],
                'title' => $validated['title'],
                'content' => $validated['content'],
                'is_published' => $request->has('is_published'),
                'created_by' => auth()->id(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Page created successfully',
                'page_id' => $id
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    public function updateArchivePage(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'content' => 'required|string'
            ]);
            
            DB::table('archive_pages')->where('id', $id)->update([
                'title' => $validated['title'],
                'content' => $validated['content'],
                'is_published' => $request->has('is_published'),
                'updated_at' => now()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Page updated successfully'
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    public function deleteArchivePage($id)
    {
        try {
            DB::table('archive_pages')->where('id', $id)->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Page deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    public function editArchivePage($id)
    {
        try {
            $page = DB::table('archive_pages')->where('id', $id)->first();
            
            return response()->json([
                'success' => true,
                'page' => $page
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    public function showArchivePage($id)
    {
        $page = DB::table('archive_pages')
            ->join('archive_sections', 'archive_pages.section_id', '=', 'archive_sections.id')
            ->where('archive_pages.id', $id)
            ->where('archive_sections.module', 'social-fellowship')
            ->select('archive_pages.*', 'archive_sections.name as section_name')
            ->first();
        
        if (!$page) {
            abort(404, 'Page not found');
        }
        
        return view('modules.social-fellowship.partials.archive-page-show', compact('page'));
    }
}
