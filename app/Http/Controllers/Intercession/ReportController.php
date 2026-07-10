<?php

namespace App\Http\Controllers\Intercession;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\User\User;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Resolve the report date range.
     */
    private function resolveReportDateRange(Request $request): array
    {
        $from = trim((string) $request->get('from', ''));
        $to = trim((string) $request->get('to', ''));

        if ($from === '' && $to === '') {
            $from = now()->startOfMonth()->toDateString();
            $to = now()->endOfMonth()->toDateString();
        } elseif ($from === '') {
            $from = $to;
        } elseif ($to === '') {
            $to = $from;
        }

        $fromDate = Carbon::parse($from)->startOfDay();
        $toDate = Carbon::parse($to)->endOfDay();

        if ($fromDate->gt($toDate)) {
            [$fromDate, $toDate] = [$toDate, $fromDate];
        }

        return [
            $fromDate,
            $toDate,
        ];
    }

    /**
     * Get form IDs that have submissions within a date range.
     */
    private function getFormIdsInRange(Collection $userIds, Carbon $fromDate, Carbon $toDate): array
    {
        if ($userIds->isEmpty()) {
            return [];
        }

        return DB::table('form_submissions')
            ->whereIn('user_id', $userIds)
            ->whereBetween('submitted_at', [$fromDate, $toDate])
            ->distinct()
            ->pluck('form_id')
            ->toArray();
    }

    /**
     * Build report rows for a date range.
     */
    private function buildReportRows($users, $forms, Carbon $fromDate, Carbon $toDate): array
    {
        $formIds = $forms->pluck('id')->toArray();
        $submissions = collect();

        if ($users->isNotEmpty() && !empty($formIds)) {
            $submissions = DB::table('form_submissions')
                ->whereIn('form_id', $formIds)
                ->whereIn('user_id', $users->pluck('id'))
                ->whereBetween('submitted_at', [$fromDate, $toDate])
                ->select('user_id', 'form_id', 'score', 'submitted_at')
                ->get()
                ->groupBy('user_id');
        }

        $reportData = [];
        foreach ($users as $user) {
            $userSubmissions = $submissions->get($user->id, collect());
            $userData = [
                'user' => $user,
                'submissions' => [],
                'total_submitted' => 0,
                'total_forms' => count($formIds),
                'percentage' => 0,
                'participation_percentage' => 0,
                'points_percentage' => 0,
                'total_points_score' => 0,
                'status' => 'Not Started',
            ];

            foreach ($forms as $form) {
                $submission = $userSubmissions->firstWhere('form_id', $form->id);
                $isSubmitted = !is_null($submission);

                $userData['submissions'][$form->id] = [
                    'submitted' => $isSubmitted,
                    'score' => $isSubmitted ? $submission->score : null,
                    'submitted_at' => $isSubmitted ? $submission->submitted_at : null,
                    'form_title' => $form->title,
                    'form_id' => $form->id
                ];

                if ($isSubmitted) {
                    $userData['total_submitted']++;
                    $userData['total_points_score'] += (float) ($submission->score ?? 0);
                }
            }

            if ($userData['total_forms'] > 0) {
                $userData['percentage'] = round(($userData['total_submitted'] / $userData['total_forms']) * 100);
                $userData['participation_percentage'] = $userData['percentage'];
                $userData['points_percentage'] = round(min(100, max(0, $userData['total_points_score'] / $userData['total_forms'])), 1);
            }

            if ($userData['total_submitted'] == 0) {
                $userData['status'] = 'Not Started';
            } elseif ($userData['total_submitted'] == $userData['total_forms']) {
                $userData['status'] = 'Complete';
            } else {
                $userData['status'] = 'Partial';
            }

            $reportData[] = $userData;
        }

        return [$reportData, $formIds];
    }

    /**
     * Display the reports dashboard
     */
    public function index(Request $request)
    {
        abort_unless(
            auth()->user()->isSuperAdmin() || auth()->user()->canAccess('intercession', 'view-reports'),
            403,
            'You do not have permission to view Intercession reports.'
        );

        try {
            // Get all users - dynamically select columns that exist
            $users = $this->getUsersWithStatus();
            [$fromDate, $toDate] = $this->resolveReportDateRange($request);
            $selectedFormIds = $this->getFormIdsInRange($users->pluck('id'), $fromDate, $toDate);
            $allForms = DB::table('forms')
                ->whereIn('id', $selectedFormIds)
                ->orderBy('created_at', 'desc')
                ->get();
            [$reportData, $selectedFormIds] = $this->buildReportRows($users, $allForms, $fromDate, $toDate);

            // Calculate summary stats
            $summary = [
                'total_users' => count($reportData),
                'complete' => collect($reportData)->filter(fn($d) => $d['status'] === 'Complete')->count(),
                'partial' => collect($reportData)->filter(fn($d) => $d['status'] === 'Partial')->count(),
                'not_started' => collect($reportData)->filter(fn($d) => $d['status'] === 'Not Started')->count(),
            ];

            return view('modules.intercession.forms.reports', [
                'reportData' => $reportData,
                'allForms' => $allForms,
                'selectedFormIds' => $selectedFormIds,
                'dateFrom' => $fromDate->toDateString(),
                'dateTo' => $toDate->toDateString(),
                'summary' => $summary,
            ]);
            
        } catch (\Exception $e) {
            Log::error('Report index error: ' . $e->getMessage());
            
            return view('modules.intercession.forms.reports', [
                'reportData' => [],
                'allForms' => collect(),
                'selectedFormIds' => [],
                'dateFrom' => now()->startOfMonth()->toDateString(),
                'dateTo' => now()->endOfMonth()->toDateString(),
                'summary' => [
                    'total_users' => 0,
                    'complete' => 0,
                    'partial' => 0,
                    'not_started' => 0,
                ],
            ]);
        }
    }

    /**
     * Get users with available status columns
     */
    private function getUsersWithStatus()
    {
        // Check which columns exist in the users table
        $table = 'users';
        $hasIsActive = Schema::hasColumn($table, 'is_active');
        $hasStatus = Schema::hasColumn($table, 'status');
        
        // Build select columns
        $columns = ['id', 'name', 'email', 'membership_type'];
        
        if ($hasIsActive) {
            $columns[] = 'is_active';
        }
        
        if ($hasStatus) {
            $columns[] = 'status';
        }
        
        // Get all users
        $allUsers = User::select($columns)->orderBy('name')->get();
        
        // Reports include every active user, regardless of membership type.
        return $allUsers->filter(function($user) use ($hasIsActive, $hasStatus) {
            $isActive = true;
            
            if ($hasIsActive && isset($user->is_active)) {
                $isActive = ($user->is_active == true || $user->is_active == 1);
            }
            
            if ($hasStatus && isset($user->status) && $isActive) {
                $isActive = ($user->status === 'active' || $user->status === 'Active');
            }
            
            return $isActive;
        })->values();
    }

    /**
     * Filter reports based on criteria
     */
    public function filter(Request $request)
    {
        abort_unless(
            auth()->user()->isSuperAdmin() || auth()->user()->canAccess('intercession', 'view-reports'),
            403,
            'You do not have permission to view Intercession reports.'
        );

        try {
            $status = $request->get('status', 'all');
            $search = $request->get('search', '');
            [$fromDate, $toDate] = $this->resolveReportDateRange($request);

            // Check which columns exist
            $table = 'users';
            $hasIsActive = Schema::hasColumn($table, 'is_active');
            $hasStatus = Schema::hasColumn($table, 'status');
            
            // Build select columns
            $columns = ['id', 'name', 'email', 'membership_type'];
            
            if ($hasIsActive) {
                $columns[] = 'is_active';
            }
            
            if ($hasStatus) {
                $columns[] = 'status';
            }
            
            // Get users with search filter
            $query = User::select($columns);
            
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }
            
            $allUsers = $query->orderBy('name')->get();
            
            // Include every active user, regardless of membership type.
            $users = $allUsers->filter(function($user) use ($hasIsActive, $hasStatus) {
                $isActive = true;
                
                if ($hasIsActive && isset($user->is_active)) {
                    $isActive = ($user->is_active == true || $user->is_active == 1);
                }
                
                if ($hasStatus && isset($user->status) && $isActive) {
                    $isActive = ($user->status === 'active' || $user->status === 'Active');
                }
                
                return $isActive;
            })->values();

            $selectedFormIds = $this->getFormIdsInRange($users->pluck('id'), $fromDate, $toDate);
            $allForms = DB::table('forms')
                ->whereIn('id', $selectedFormIds)
                ->orderBy('created_at', 'desc')
                ->get();
            [$reportData, $selectedFormIds] = $this->buildReportRows($users, $allForms, $fromDate, $toDate);
            $reportData = array_values(array_filter($reportData, function ($userData) use ($status) {
                return !($status && $status !== 'all' && $userData['status'] !== $status);
            }));

            // Calculate summary stats
            $summary = [
                'total_users' => count($reportData),
                'complete' => collect($reportData)->filter(fn($d) => $d['status'] === 'Complete')->count(),
                'partial' => collect($reportData)->filter(fn($d) => $d['status'] === 'Partial')->count(),
                'not_started' => collect($reportData)->filter(fn($d) => $d['status'] === 'Not Started')->count(),
            ];

            return response()->json([
                'success' => true,
                'reportData' => $reportData,
                'summary' => $summary,
                'forms' => $allForms,
                'form_ids' => $selectedFormIds,
                'date_from' => $fromDate->toDateString(),
                'date_to' => $toDate->toDateString(),
            ]);

        } catch (\Exception $e) {
            Log::error('Report filter error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Error loading report data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export report as CSV
     */
    public function export(Request $request)
    {
        abort_unless(
            auth()->user()->isSuperAdmin() || auth()->user()->canAccess('intercession', 'export-reports'),
            403,
            'You do not have permission to export Intercession reports.'
        );

        try {
            [$fromDate, $toDate] = $this->resolveReportDateRange($request);
            $users = $this->getUsersWithStatus();

            $formIds = $this->getFormIdsInRange($users->pluck('id'), $fromDate, $toDate);
            $allForms = DB::table('forms')
                ->whereIn('id', $formIds)
                ->orderBy('created_at', 'desc')
                ->get();

            $submissions = DB::table('form_submissions')
                ->whereIn('form_id', $formIds)
                ->whereIn('user_id', $users->pluck('id'))
                ->whereBetween('submitted_at', [$fromDate, $toDate])
                ->select('user_id', 'form_id', 'score', 'submitted_at')
                ->get()
                ->groupBy('user_id');

            $totalForms = count($formIds);

            // Build CSV headers
            $headers = ['No', 'Name', 'No of Submitted Forms', 'Participation %', 'Points %'];

            $callback = function() use ($users, $submissions, $headers, $formIds, $totalForms) {
                $handle = fopen('php://output', 'w');
                fwrite($handle, "\xEF\xBB\xBF");
                fputcsv($handle, $headers);

                foreach ($users->values() as $index => $user) {
                    $userSubmissions = $submissions->get($user->id, collect());

                    $totalSubmitted = 0;
                    $totalScore = 0;
                    foreach ($formIds as $formId) {
                        $submission = $userSubmissions->firstWhere('form_id', $formId);
                        if ($submission) {
                            $totalSubmitted++;
                            $totalScore += (float) ($submission->score ?? 0);
                        }
                    }

                    $participationPercentage = $totalForms > 0 ? round(($totalSubmitted / $totalForms) * 100, 1) : 0;
                    $pointsPercentage = $totalForms > 0 ? round(min(100, max(0, $totalScore / $totalForms)), 1) : 0;
                    $submittedForms = $totalSubmitted . ' out of ' . $totalForms;
                    $row = [
                        $index + 1,
                        $user->name,
                        $submittedForms,
                        $participationPercentage . '%',
                        $pointsPercentage . '%',
                    ];

                    fputcsv($handle, $row);
                }

                fclose($handle);
            };

            $fileName = 'reports_' . date('Y-m-d_H-i-s') . '.csv';

            return response()->stream($callback, 200, [
                'Content-Type' => 'text/csv; charset=utf-8',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            ]);

        } catch (\Exception $e) {
            Log::error('Export error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error exporting report: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
 * Get user progress for the popup
 */
public function userProgress(Request $request)
{
    abort_unless(
        auth()->user()->isSuperAdmin() || auth()->user()->canAccess('intercession', 'view-reports'),
        403,
        'You do not have permission to view Intercession reports.'
    );

    try {
        $userId = $request->get('user_id');
        [$fromDate, $toDate] = $this->resolveReportDateRange($request);
        
        if (empty($userId)) {
            return response()->json([
                'success' => false,
                'message' => 'Missing required parameters'
            ], 400);
        }
        
        // Get user
        $user = User::find($userId);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }
        
        // Get forms
        $formIds = DB::table('form_submissions')
            ->where('user_id', $userId)
            ->whereBetween('submitted_at', [$fromDate, $toDate])
            ->distinct()
            ->pluck('form_id')
            ->toArray();
        
        $allForms = DB::table('forms')
            ->whereIn('id', $formIds)
            ->orderBy('created_at', 'desc')
            ->get();
        
        // Get user submissions
        $submissions = DB::table('form_submissions')
            ->where('user_id', $userId)
            ->whereIn('form_id', $formIds)
            ->whereBetween('submitted_at', [$fromDate, $toDate])
            ->select('form_id', 'score', 'submitted_at')
            ->get()
            ->keyBy('form_id');
        
        $formData = [];
        $submittedCount = 0;
        
        foreach ($allForms as $form) {
            $submission = $submissions->get($form->id);
            $isSubmitted = !is_null($submission);
            
            if ($isSubmitted) {
                $submittedCount++;
            }
            
            $formData[] = [
                'id' => $form->id,
                'title' => $form->title,
                'submitted' => $isSubmitted,
                'submitted_at' => $isSubmitted ? \Carbon\Carbon::parse($submission->submitted_at)->format('M d, Y h:i A') : null,
                'score' => $isSubmitted ? $submission->score : null
            ];
        }
        
        $total = count($formIds);
        $percentage = $total > 0 ? round(($submittedCount / $total) * 100) : 0;
        
        if ($submittedCount == 0) {
            $status = 'Not Started';
        } elseif ($submittedCount == $total) {
            $status = 'Complete';
        } else {
            $status = 'Partial';
        }
        
        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email
            ],
            'forms' => $formData,
            'submitted' => $submittedCount,
            'total' => $total,
            'percentage' => $percentage,
            'status' => $status
        ]);
        
    } catch (\Exception $e) {
        Log::error('User progress error: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => $e->getMessage()
        ], 500);
    }
}
}


