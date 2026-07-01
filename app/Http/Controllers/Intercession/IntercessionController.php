<?php

namespace App\Http\Controllers\Intercession;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\ManagesActionPlans;
use App\Models\Intercession\SpiritualForm as Form;
use App\Models\Intercession\FormSubmission;
use App\Models\Intercession\ActionPlan;
use App\Models\Intercession\DailyDevotion;
use App\Models\User\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log; 

class IntercessionController extends Controller
{
    use ManagesActionPlans;

    protected ?string $actionPlanDepartment = 'intercession';

    protected function actionPlanView(): string
    {
        return 'modules.intercession.partials.actions';
    }

    public function index()
{
    // Forms data
    $stats = [
        'total_forms' => 0,
        'my_attempts' => 0,
        'best_avg' => 0,
    ];
    $availableForms = collect();
    $mySubmissions = collect();
    $allForms = collect();
    
    try {
        $stats['total_forms'] = Form::count() ?? 0;
        $stats['my_attempts'] = FormSubmission::where('user_id', auth()->id())->count() ?? 0;
        $stats['best_avg'] = FormSubmission::where('user_id', auth()->id())->avg('score') ?? 0;
        $availableForms = Form::where('is_active', true)->get();
        $mySubmissions = FormSubmission::where('user_id', auth()->id())->with('form')->get();
        $allForms = Form::all();
    } catch (\Exception $e) {
        // Table doesn't exist yet
    }
    
    $users = collect();
    try {
        $users = User::all();
    } catch (\Exception $e) {
        // Table doesn't exist yet
    }
    
    // Devotions data
    $todayDevotion = null;
    $hasCompletedToday = false;
    $allDevotions = collect(); // Initialize as empty collection
    
    try {
        $todayDevotion = DailyDevotion::getTodaysDevotion();
        
        if ($todayDevotion && auth()->check()) {
            $hasCompletedToday = $todayDevotion->isCompletedByUser(auth()->id());
        }
        
        $allDevotions = DailyDevotion::orderBy('date', 'desc')->get();
        
        if (auth()->check()) {
            foreach ($allDevotions as $devotion) {
                $devotion->completed_by_user = $devotion->isCompletedByUser(auth()->id());
            }
        }
    } catch (\Exception $e) {
        // Table doesn't exist yet
    }
    
    // ========== ARCHIVES SECTIONS ==========
    $archiveSections = collect(); // Initialize as empty collection
    
    try {
        $archiveSections = DB::table('archive_sections')
        ->where('module', 'intercession')  // Add this filter
        ->leftJoin('archive_pages', 'archive_sections.id', '=', 'archive_pages.section_id')
        ->select('archive_sections.*', DB::raw('COUNT(archive_pages.id) as pages_count'))
        ->groupBy('archive_sections.id')
        ->orderBy('archive_sections.created_at', 'desc')
        ->get();
    } catch (\Exception $e) {
        // Table doesn't exist yet
    }
    // ========== END ARCHIVES SECTIONS ==========
    
    return view('modules.intercession.index', compact(
        'stats', 
        'availableForms', 
        'mySubmissions', 
        'allForms',
        'todayDevotion', 
        'hasCompletedToday', 
        'allDevotions',
        'users', 
        'archiveSections'  // Add this
    ));
    // For reports - get membership types
    $membershipTypes = collect();
    try {
        $membershipTypes = DB::table('users')
            ->select('membership_type')
            ->distinct()
            ->whereNotNull('membership_type')
            ->pluck('membership_type')
            ->toArray();
    } catch (\Exception $e) {
        // Table doesn't exist yet
    }
    
    return view('modules.intercession.index', compact(
        // ... existing variables ...
        'membershipTypes'  // Add this
    ));
}
    
    public function actionPlans(Request $request)
    {
        return $this->actionPlanIndex($request);
    }

    public function storeActionPlan(Request $request)
    {
        return $this->actionPlanStore($request);
    }

    public function updateActionPlanStatus(Request $request, $id)
    {
        return $this->actionPlanUpdateStatus($request, $id);
    }

    public function deleteActionPlan($id)
    {
        return $this->actionPlanDestroy($id);
    }
    
    /**
 * Edit action plan - get plan data for editing
 */
/**
 * Edit action plan - get plan data for editing
 */
public function editActionPlan($id)
{
    return $this->actionPlanEdit($id);
}
    
    /**
 * Update action plan
 */
/**
 * Update action plan
 */
public function updateActionPlan(Request $request, $id)
{
    return $this->actionPlanUpdate($request, $id);
}

public function addTask(Request $request, $planId)
{
    return $this->actionPlanAddTask($request, $planId);
}

public function updateTask(Request $request, $taskId)
{
    return $this->actionPlanUpdateTask($request, $taskId);
}

public function deleteTask($taskId)
{
    return $this->actionPlanDeleteTask($taskId);
}
    
    public function completeDevotion(Request $request, $id)
    {
        try {
            $userId = auth()->id();
            
            if (!$userId) {
                return response()->json(['success' => false, 'message' => 'Please login first'], 401);
            }
            
            // Check if already completed
            $exists = DB::selectOne(
                "SELECT * FROM user_devotion_completions WHERE user_id = ? AND devotion_id = ?",
                [$userId, $id]
            );
            
            if (!$exists) {
                DB::insert(
                    "INSERT INTO user_devotion_completions (user_id, devotion_id, completed_at) VALUES (?, ?, NOW())",
                    [$userId, $id]
                );
            }
            
            if ($request->ajax() || $request->wantsJson()) {
                return response()->json(['success' => true, 'message' => 'Devotion completed successfully']);
            }
            
            return redirect()->back()->with('success', 'Devotion completed successfully');
            
        } catch (\Exception $e) {
            if ($request->ajax() || $request->wantsJson()) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
            }
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

  public function storeDevotion(Request $request)
{
    try {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'date' => 'required|date',
            'bible_verse' => 'nullable|string',
            'content_rw' => 'nullable|string'
        ]);
        
        $id = DB::table('devotions')->insertGetId([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'content_rw' => $validated['content_rw'] ?? null,
            'bible_verse' => $validated['bible_verse'] ?? null,
            'date' => $validated['date'],
            'is_active' => $request->has('is_active'),
            'created_by' => auth()->id(),
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        return response()->json(['success' => true, 'message' => 'Devotion created successfully', 'id' => $id]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
public function storePrayerRequest(Request $request)
{
    try {
        $request->validate([
            'devotion_id' => 'required|integer',
            'prayer_request' => 'required|string|min:3'
        ]);
        
        $id = DB::table('prayer_requests')->insertGetId([
            'devotion_id' => $request->devotion_id,
            'user_id' => auth()->id(),
            'request' => $request->prayer_request,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Prayer request submitted successfully',
            'request_id' => $id
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage()
        ], 500);
    }
}
public function updateDevotion(Request $request, $id)
{
    try {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'date' => 'required|date',
            'bible_verse' => 'nullable|string',
            'content_rw' => 'nullable|string'
        ]);
        
        DB::table('devotions')->where('id', $id)->update([
            'title' => $validated['title'],
            'content' => $validated['content'],
            'content_rw' => $validated['content_rw'] ?? null,
            'bible_verse' => $validated['bible_verse'] ?? null,
            'date' => $validated['date'],
            'is_active' => $request->has('is_active'),
            'updated_at' => now()
        ]);
        
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function editDevotion($id)
{
    $devotion = DB::table('devotions')->where('id', $id)->first();
    return response()->json(['success' => true, 'devotion' => $devotion]);
}

public function deleteDevotion($id)
{
    try {
        DB::table('user_devotion_completions')->where('devotion_id', $id)->delete();
        DB::table('devotions')->where('id', $id)->delete();
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function showDevotion($id)
{
    $devotion = DB::table('devotions')->where('id', $id)->first();
    $hasCompleted = false;
    
    if (auth()->check()) {
        $completed = DB::selectOne("SELECT * FROM user_devotion_completions WHERE user_id = ? AND devotion_id = ?", 
            [auth()->id(), $id]);
        $hasCompleted = !is_null($completed);
    }
    
    return view('modules.intercession.partials.devotion-show', compact('devotion', 'hasCompleted'));
}

// ==================== ARCHIVES METHODS ====================

// Store a new section
// ==================== ARCHIVES METHODS ====================

public function storeArchiveSection(Request $request)
{
    try {
        $request->validate([
            'name' => 'required|string|max:255'
        ]);
        
         $id = DB::table('archive_sections')->insertGetId([
            'name' => $request->name,
            'module' => 'intercession',  // Add this
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
        DB::table('archive_sections')->where('id', $id)->update([
            'name' => $request->name,
            'updated_at' => now()
        ]);
        
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function deleteArchiveSection($id)
{
    try {
        DB::table('archive_pages')->where('section_id', $id)->delete();
        DB::table('archive_sections')->where('id', $id)->delete();
        
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function getSectionPages($id)
{
    try {
        // Get section with module check
        $section = DB::table('archive_sections')
            ->where('id', $id)
            ->where('module', 'intercession')
            ->first();
        
        if (!$section) {
            return response()->json([
                'success' => false,
                'message' => 'Section not found or not accessible'
            ], 404);
        }
        
        // Get pages for this section
        $pages = DB::table('archive_pages')
            ->where('section_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();
        
        // Format each page
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
        \Log::error('Error loading section pages: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Error loading pages: ' . $e->getMessage()
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
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function editArchivePage($id)
{
    try {
        $page = DB::table('archive_pages')->where('id', $id)->first();
        return response()->json(['success' => true, 'page' => $page]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}

public function showArchivePage($id)
{
    $page = DB::table('archive_pages')
        ->join('archive_sections', 'archive_pages.section_id', '=', 'archive_sections.id')
        ->where('archive_pages.id', $id)
        ->where('archive_sections.module', 'intercession')  // Add this
        ->select('archive_pages.*')
        ->first();
    
    if (!$page) {
        abort(404, 'Page not found');
    }
    
    return view('modules.intercession.partials.archive-page-show', compact('page'));
}
/**
 * Update task status (started/in-progress/completed)
 */
public function updateTaskStatus(Request $request, $id)
{
    try {
        $status = $request->status;
        $updateData = ['status' => $status, 'updated_at' => now()];
        
        if ($status === 'in-progress' && !DB::table('action_plan_tasks')->where('id', $id)->value('started_at')) {
            $updateData['started_at'] = now();
        }
        if ($status === 'completed' && !DB::table('action_plan_tasks')->where('id', $id)->value('completed_at')) {
            $updateData['completed_at'] = now();
        }
        if ($status === 'pending') {
            $updateData['started_at'] = null;
            $updateData['completed_at'] = null;
        }
        
        DB::table('action_plan_tasks')->where('id', $id)->update($updateData);
        
        return response()->json(['success' => true]);
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
    }
}
}
