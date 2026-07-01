<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

trait ManagesActionPlans
{
    protected function actionPlanCanManage(): bool
    {
        return true;
    }

    protected function actionPlanView(): string
    {
        return 'modules.discipline.partials.action-plans-tab';
    }

    protected function actionPlanBasePath(): string
    {
        return '';
    }

    public function actionPlanIndex(Request $request)
    {
        try {
            $page = max(1, (int) $request->get('page', 1));
            $perPage = max(1, (int) $request->get('per_page', 1));
            $users = DB::select("SELECT id, name, email FROM users ORDER BY name");
            $allActionPlans = $this->fetchActionPlans($request);
            $total = count($allActionPlans);
            $totalPages = max(1, (int) ceil($total / $perPage));
            $page = min($page, $totalPages);
            $offset = ($page - 1) * $perPage;
            $actionPlans = array_slice($allActionPlans, $offset, $perPage);
            $actionPlanIds = array_map(fn ($plan) => $plan->id, $actionPlans);
            $tasksByPlan = $this->getTasksByPlanIds($actionPlanIds);
            $summary = $this->buildActionPlanSummary($allActionPlans, auth()->id());
            $pagination = [
                'current_page' => $page,
                'total_pages' => $totalPages,
                'has_prev' => $page > 1,
                'has_next' => $page < $totalPages,
                'total' => $total,
                'per_page' => $perPage,
            ];

            foreach ($actionPlans as $plan) {
                $plan->tasks = $tasksByPlan[$plan->id] ?? [];
            }

            if ($request->ajax()) {
                return response()->json([
                    'success' => true,
                    'action_plans' => $actionPlans,
                    'pagination' => [
                        'current_page' => $page,
                        'total_pages' => $totalPages,
                        'has_prev' => $page > 1,
                        'has_next' => $page < $totalPages,
                        'total' => $total,
                        'per_page' => $perPage,
                    ],
                    'summary' => $summary,
                ]);
            }

            return view($this->actionPlanView(), compact('actionPlans', 'users', 'summary', 'pagination'));
        } catch (\Exception $e) {
            Log::error('Action plan index error: ' . $e->getMessage());

            if ($request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error loading action plans: ' . $e->getMessage(),
                ], 500);
            }

            $users = DB::select("SELECT id, name, email FROM users ORDER BY name");
            $actionPlans = [];
            $summary = $this->emptyActionPlanSummary();
            $pagination = [
                'current_page' => 1,
                'total_pages' => 1,
                'has_prev' => false,
                'has_next' => false,
                'total' => 0,
                'per_page' => 1,
            ];

            return view($this->actionPlanView(), compact('actionPlans', 'users', 'summary', 'pagination'));
        }
    }

    public function actionPlanStore(Request $request)
    {
        if (!$this->actionPlanCanManage()) {
            abort(403, 'You do not have permission to create action plans.');
        }

        try {
            $this->ensureStartDateColumnExists();

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'start_date' => 'nullable|date',
                'due_date' => 'nullable|date',
            ]);

            $startDate = $this->normalizeDateInput($request->input('start_date'));
            $dueDate = $this->normalizeDateInput($request->input('due_date'));

            DB::beginTransaction();

            $planData = [
                'user_id' => auth()->id(),
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'start_date' => $startDate,
                'due_date' => $dueDate,
                'status' => 'pending',
                'progress' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if (Schema::hasColumn('action_plans', 'created_by')) {
                $planData['created_by'] = auth()->id();
            }

            if (Schema::hasColumn('action_plans', 'assigned_by')) {
                $planData['assigned_by'] = auth()->id();
            }

            if ($this->actionPlanDepartment && Schema::hasColumn('action_plans', 'department')) {
                $planData['department'] = $this->actionPlanDepartment;
            }

            if (Schema::hasColumn('action_plans', 'year')) {
                $planData['year'] = $startDate ? (int) date('Y', strtotime($startDate)) : (int) date('Y');
            }

            $planId = DB::table('action_plans')->insertGetId($planData);
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Action plan created successfully',
                'plan_id' => $planId,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Action plan store error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create action plan: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function actionPlanEdit($id)
    {
        try {
            $plan = $this->fetchActionPlanById($id);

            if (!$plan) {
                return response()->json(['success' => false, 'message' => 'Action plan not found'], 404);
            }

            return response()->json(['success' => true, 'plan' => $plan]);
        } catch (\Exception $e) {
            Log::error('Action plan edit error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error loading action plan: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function actionPlanUpdate(Request $request, $id)
    {
        if (!$this->actionPlanCanManage()) {
            abort(403, 'You do not have permission to update action plans.');
        }

        try {
            $this->ensureStartDateColumnExists();

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'description' => 'nullable|string',
                'start_date' => 'nullable|date',
                'due_date' => 'nullable|date',
                'status' => 'sometimes|in:pending,in_progress,completed,cancelled',
                'progress' => 'sometimes|integer|min:0|max:100',
            ]);

            $startDate = $this->normalizeDateInput($request->input('start_date'));
            $dueDate = $this->normalizeDateInput($request->input('due_date'));

            DB::beginTransaction();

            $setClauses = [];
            $params = [];

            $setClauses[] = 'title = ?';
            $params[] = $validated['title'];

            $setClauses[] = 'description = ?';
            $params[] = $validated['description'] ?? null;

            $setClauses[] = 'start_date = ?';
            $params[] = $startDate;

            $setClauses[] = 'due_date = ?';
            $params[] = $dueDate;

            if (isset($validated['status'])) {
                $setClauses[] = 'status = ?';
                $params[] = $validated['status'];

                if ($validated['status'] === 'completed') {
                    $setClauses[] = 'completed_at = NOW()';
                    $setClauses[] = 'progress = 100';
                }
            }

            if (isset($validated['progress'])) {
                $setClauses[] = 'progress = ?';
                $params[] = $validated['progress'];
            }

            $setClauses[] = 'updated_at = NOW()';
            $params[] = $id;

            DB::update('UPDATE action_plans SET ' . implode(', ', $setClauses) . ' WHERE id = ?', $params);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Action plan updated successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Action plan update error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update action plan: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function actionPlanUpdateStatus(Request $request, $id)
    {
        if (!$this->actionPlanCanManage()) {
            abort(403, 'You do not have permission to update action plans.');
        }

        try {
            $validated = $request->validate([
                'status' => 'required|in:pending,in_progress,completed,cancelled',
            ]);

            $updates = [
                'status' => $validated['status'],
                'updated_at' => now(),
            ];

            if ($validated['status'] === 'completed') {
                $updates['completed_at'] = now();
                $updates['progress'] = 100;
            }

            DB::table('action_plans')->where('id', $id)->update($updates);

            return response()->json(['success' => true, 'message' => 'Action plan status updated successfully']);
        } catch (\Exception $e) {
            Log::error('Action plan status update error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update action plan status: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function actionPlanDestroy($id)
    {
        if (!$this->actionPlanCanManage()) {
            abort(403, 'You do not have permission to delete action plans.');
        }

        try {
            DB::beginTransaction();

            if (Schema::hasTable('action_plan_tasks')) {
                DB::delete('DELETE FROM action_plan_tasks WHERE action_plan_id = ?', [$id]);
            }

            $deleteSql = 'DELETE FROM action_plans WHERE id = ?';
            $params = [$id];

            if ($this->actionPlanDepartment && Schema::hasColumn('action_plans', 'department')) {
                $deleteSql .= ' AND department = ?';
                $params[] = $this->actionPlanDepartment;
            }

            DB::delete($deleteSql, $params);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Action plan deleted successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Action plan destroy error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete action plan: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function actionPlanAddTask(Request $request, $planId)
    {
        if (!$this->actionPlanCanManage()) {
            abort(403, 'You do not have permission to create tasks.');
        }

        try {
            $validated = $request->validate([
                'activity' => 'required|string|max:255',
                'targeted_milestone' => 'required|string|max:255',
                'estimated_budget' => 'required|numeric|min:0',
                'start_date' => 'nullable|date',
                'deadline' => 'required|date',
                'priority' => 'required|in:low,medium,high',
                'progress' => 'required|integer|min:0|max:100',
            ]);

            DB::beginTransaction();
            $this->ensureActionPlanTasksTableExists();
            $columns = $this->getTaskColumns();
            $startDate = $this->normalizeDateInput($validated['start_date'] ?? null);
            $deadline = $this->normalizeDateInput($validated['deadline']);

            $insertData = [
                'action_plan_id' => $planId,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            foreach ($columns['activity'] as $column) {
                $insertData[$column] = $validated['activity'];
            }
            foreach ($columns['targeted_milestone'] as $column) {
                $insertData[$column] = $validated['targeted_milestone'];
            }
            foreach ($columns['estimated_budget'] as $column) {
                $insertData[$column] = $validated['estimated_budget'];
            }
            foreach ($columns['start_date'] as $column) {
                $insertData[$column] = $startDate;
            }
            foreach ($columns['deadline'] as $column) {
                $insertData[$column] = $deadline;
            }
            foreach ($columns['priority'] as $column) {
                $insertData[$column] = $validated['priority'];
            }
            foreach ($columns['progress'] as $column) {
                $insertData[$column] = $validated['progress'];
            }
            DB::table('action_plan_tasks')->insert($insertData);
            $this->recalculateActionPlanProgress((int) $planId);
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Task created successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Action plan add task error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create task: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function actionPlanUpdateTask(Request $request, $taskId)
    {
        if (!$this->actionPlanCanManage()) {
            abort(403, 'You do not have permission to update tasks.');
        }

        try {
            $validated = $request->validate([
                'activity' => 'required|string|max:255',
                'targeted_milestone' => 'required|string|max:255',
                'estimated_budget' => 'required|numeric|min:0',
                'start_date' => 'nullable|date',
                'deadline' => 'required|date',
                'priority' => 'required|in:low,medium,high',
                'progress' => 'required|integer|min:0|max:100',
            ]);

            DB::beginTransaction();
            $this->ensureActionPlanTasksTableExists();
            $columns = $this->getTaskColumns();
            $startDate = $this->normalizeDateInput($validated['start_date'] ?? null);
            $deadline = $this->normalizeDateInput($validated['deadline']);

            $task = DB::selectOne('SELECT action_plan_id FROM action_plan_tasks WHERE id = ?', [$taskId]);
            if (!$task) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Task not found'], 404);
            }

            $updateData = ['updated_at' => now()];
            foreach ($columns['activity'] as $column) {
                $updateData[$column] = $validated['activity'];
            }
            foreach ($columns['targeted_milestone'] as $column) {
                $updateData[$column] = $validated['targeted_milestone'];
            }
            foreach ($columns['estimated_budget'] as $column) {
                $updateData[$column] = $validated['estimated_budget'];
            }
            foreach ($columns['start_date'] as $column) {
                $updateData[$column] = $startDate;
            }
            foreach ($columns['deadline'] as $column) {
                $updateData[$column] = $deadline;
            }
            foreach ($columns['priority'] as $column) {
                $updateData[$column] = $validated['priority'];
            }
            foreach ($columns['progress'] as $column) {
                $updateData[$column] = $validated['progress'];
            }
            DB::table('action_plan_tasks')->where('id', $taskId)->update($updateData);
            $this->recalculateActionPlanProgress((int) $task->action_plan_id);
            DB::commit();

            return response()->json(['success' => true, 'message' => 'Task updated successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Action plan update task error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update task: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function actionPlanDeleteTask($taskId)
    {
        if (!$this->actionPlanCanManage()) {
            abort(403, 'You do not have permission to delete tasks.');
        }

        try {
            DB::beginTransaction();
            $this->ensureActionPlanTasksTableExists();
            $task = DB::selectOne('SELECT action_plan_id FROM action_plan_tasks WHERE id = ?', [$taskId]);
            if (!$task) {
                DB::rollBack();
                return response()->json(['success' => false, 'message' => 'Task not found'], 404);
            }

            DB::delete('DELETE FROM action_plan_tasks WHERE id = ?', [$taskId]);
            $this->recalculateActionPlanProgress((int) $task->action_plan_id);
            DB::commit();

            return response()->json(['success' => true, 'message' => 'Task deleted successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Action plan delete task error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete task: ' . $e->getMessage(),
            ], 500);
        }
    }

    protected function fetchActionPlans(Request $request): array
    {
        [$query, $params] = $this->buildActionPlanQuery($request);
        return DB::select($query . ' ORDER BY ap.due_date ASC NULLS LAST, ap.created_at DESC', $params);
    }

    protected function fetchActionPlanById($id): ?object
    {
        $where = 'WHERE id = ?';
        $params = [$id];

        if ($this->actionPlanDepartment && Schema::hasColumn('action_plans', 'department')) {
            $where .= ' AND department = ?';
            $params[] = $this->actionPlanDepartment;
        }

        return DB::selectOne("SELECT * FROM action_plans {$where}", $params);
    }

    protected function emptyActionPlanSummary(): array
    {
        return [
            'total_plans' => 0,
            'completed_plans' => 0,
            'in_progress_plans' => 0,
            'pending_plans' => 0,
            'overdue_plans' => 0,
            'due_soon_plans' => 0,
            'total_tasks' => 0,
            'completed_tasks' => 0,
            'overdue_tasks' => 0,
            'due_soon_tasks' => 0,
            'my_todo_tasks' => 0,
        ];
    }

    protected function normalizeDateInput(?string $value): ?string
    {
        if (!$value) {
            return null;
        }

        $formats = ['Y-m-d', 'd/m/Y', 'd-m-Y', 'm/d/Y'];

        foreach ($formats as $format) {
            try {
                $date = \Carbon\Carbon::createFromFormat($format, $value);
                if ($date && $date->format($format) === $value) {
                    return $date->format('Y-m-d');
                }
            } catch (\Exception $e) {
                // Try the next format.
            }
        }

        try {
            return \Carbon\Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }

    protected function ensureStartDateColumnExists(): void
    {
        if (!Schema::hasColumn('action_plans', 'start_date')) {
            DB::statement('ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS start_date DATE');
        }
    }

    protected function ensureActionPlanTasksTableExists(): void
    {
        if (!Schema::hasTable('action_plan_tasks')) {
            DB::statement("
                CREATE TABLE IF NOT EXISTS action_plan_tasks (
                    id SERIAL PRIMARY KEY,
                    action_plan_id INTEGER NOT NULL,
                    activity VARCHAR(255),
                    task_name VARCHAR(255) NOT NULL DEFAULT '',
                    target_milestone VARCHAR(255),
                    estimated_budget DECIMAL(15,2) DEFAULT 0,
                    start_date DATE,
                    deadline DATE,
                    priority VARCHAR(20) DEFAULT 'medium',
                    progress INTEGER DEFAULT 0,
                    assigned_to INTEGER,
                    is_completed BOOLEAN DEFAULT FALSE,
                    completed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ");
        }

        $this->ensureTaskColumnsExist();
    }

    protected function ensureTaskColumnsExist(): void
    {
        DB::statement("ALTER TABLE action_plan_tasks ADD COLUMN IF NOT EXISTS task_name VARCHAR(255) NOT NULL DEFAULT ''");
        DB::statement("ALTER TABLE action_plan_tasks ADD COLUMN IF NOT EXISTS activity VARCHAR(255)");
        DB::statement("ALTER TABLE action_plan_tasks ADD COLUMN IF NOT EXISTS target_milestone VARCHAR(255)");
        DB::statement("ALTER TABLE action_plan_tasks ADD COLUMN IF NOT EXISTS estimated_budget DECIMAL(15,2) DEFAULT 0");
        DB::statement("ALTER TABLE action_plan_tasks ADD COLUMN IF NOT EXISTS start_date DATE");
        DB::statement("ALTER TABLE action_plan_tasks ADD COLUMN IF NOT EXISTS deadline DATE");
        DB::statement("ALTER TABLE action_plan_tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'");
        DB::statement("ALTER TABLE action_plan_tasks ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0");
        DB::statement("ALTER TABLE action_plan_tasks ADD COLUMN IF NOT EXISTS assigned_to INTEGER");
        DB::statement("CREATE INDEX IF NOT EXISTS idx_action_plan_tasks_assigned_to ON action_plan_tasks(assigned_to)");
    }

    protected function getTaskColumns(): array
    {
        $activityColumns = [];
        foreach (['title', 'task_name', 'name', 'activity'] as $column) {
            if (Schema::hasColumn('action_plan_tasks', $column)) {
                $activityColumns[] = $column;
            }
        }
        if (empty($activityColumns)) {
            $activityColumns[] = 'task_name';
        }

        $milestoneColumns = [];
        foreach (['target_milestone', 'targeted_milestone', 'target', 'description'] as $column) {
            if (Schema::hasColumn('action_plan_tasks', $column)) {
                $milestoneColumns[] = $column;
            }
        }
        if (empty($milestoneColumns)) {
            $milestoneColumns[] = 'target_milestone';
        }

        $budgetColumns = [];
        foreach (['estimated_budget', 'amount', 'budget'] as $column) {
            if (Schema::hasColumn('action_plan_tasks', $column)) {
                $budgetColumns[] = $column;
            }
        }
        if (empty($budgetColumns)) {
            $budgetColumns[] = 'estimated_budget';
        }

        $startDateColumns = [];
        foreach (['start_date', 'begin_date', 'from_date'] as $column) {
            if (Schema::hasColumn('action_plan_tasks', $column)) {
                $startDateColumns[] = $column;
            }
        }
        if (empty($startDateColumns)) {
            $startDateColumns[] = 'start_date';
        }

        $deadlineColumns = [];
        foreach (['deadline', 'due_date', 'timeline'] as $column) {
            if (Schema::hasColumn('action_plan_tasks', $column)) {
                $deadlineColumns[] = $column;
            }
        }
        if (empty($deadlineColumns)) {
            $deadlineColumns[] = 'deadline';
        }

        $priorityColumns = [];
        foreach (['priority', 'status'] as $column) {
            if (Schema::hasColumn('action_plan_tasks', $column)) {
                $priorityColumns[] = $column;
            }
        }
        if (empty($priorityColumns)) {
            $priorityColumns[] = 'priority';
        }

        $progressColumns = [];
        foreach (['progress', 'is_completed'] as $column) {
            if (Schema::hasColumn('action_plan_tasks', $column)) {
                $progressColumns[] = $column;
            }
        }
        if (empty($progressColumns)) {
            $progressColumns[] = 'progress';
        }

        $ownerColumns = [];
        foreach (['assigned_to', 'task_owner_id', 'owner_id'] as $column) {
            if (Schema::hasColumn('action_plan_tasks', $column)) {
                $ownerColumns[] = $column;
            }
        }

        return [
            'activity' => $activityColumns,
            'targeted_milestone' => $milestoneColumns,
            'estimated_budget' => $budgetColumns,
            'start_date' => $startDateColumns,
            'deadline' => $deadlineColumns,
            'priority' => $priorityColumns,
            'progress' => $progressColumns,
            'assigned_to' => $ownerColumns,
        ];
    }

    protected function getTasksByPlanIds(array $planIds): array
    {
        if (empty($planIds) || !Schema::hasTable('action_plan_tasks')) {
            return [];
        }

        $this->ensureActionPlanTasksTableExists();
        $placeholders = implode(',', array_fill(0, count($planIds), '?'));
        $ownerJoin = Schema::hasColumn('action_plan_tasks', 'assigned_to')
            ? ' LEFT JOIN users u ON u.id = apt.assigned_to'
            : '';
        $ownerSelect = Schema::hasColumn('action_plan_tasks', 'assigned_to')
            ? ', u.name as assigned_user_name, u.email as assigned_user_email'
            : '';
        $orderColumn = $this->getExistingTaskColumn(['deadline', 'due_date']);
        $orderExpression = $orderColumn ? "COALESCE(apt.{$orderColumn}, apt.created_at)" : 'apt.created_at';
        $rows = DB::select("SELECT apt.*{$ownerSelect} FROM action_plan_tasks apt{$ownerJoin} WHERE apt.action_plan_id IN ($placeholders) ORDER BY {$orderExpression} ASC, apt.created_at ASC", $planIds);

        $grouped = [];
        foreach ($rows as $row) {
            $grouped[$row->action_plan_id][] = $this->normalizeTaskRow($row);
        }

        return $grouped;
    }

    protected function recalculateActionPlanProgress(int $planId): void
    {
        if (!Schema::hasTable('action_plan_tasks')) {
            return;
        }

        $taskCount = DB::selectOne('SELECT COUNT(*) as count FROM action_plan_tasks WHERE action_plan_id = ?', [$planId]);
        $progressExpression = $this->buildTaskProgressExpression();

        if (!$taskCount || (int) $taskCount->count === 0) {
            DB::update("UPDATE action_plans SET progress = 0, status = 'pending', updated_at = NOW() WHERE id = ?", [$planId]);
            return;
        }

        DB::update("
            UPDATE action_plans
            SET progress = (
                SELECT COALESCE(ROUND(AVG($progressExpression)), 0)
                FROM action_plan_tasks
                WHERE action_plan_id = ?
            ),
            status = CASE
                WHEN (
                    SELECT COUNT(*) FROM action_plan_tasks
                    WHERE action_plan_id = ?
                    AND $progressExpression < 100
                ) = 0 THEN 'completed'
                WHEN (
                    SELECT COUNT(*) FROM action_plan_tasks
                    WHERE action_plan_id = ?
                    AND $progressExpression > 0
                ) > 0 THEN 'in_progress'
                ELSE status
            END,
            updated_at = NOW()
            WHERE id = ?
        ", [$planId, $planId, $planId, $planId]);
    }

    protected function buildTaskProgressExpression(): string
    {
        $hasProgress = Schema::hasColumn('action_plan_tasks', 'progress');
        $hasIsCompleted = Schema::hasColumn('action_plan_tasks', 'is_completed');

        if ($hasProgress && $hasIsCompleted) {
            return 'COALESCE(progress, CASE WHEN COALESCE(is_completed, FALSE) THEN 100 ELSE 0 END)';
        }

        if ($hasProgress) {
            return 'COALESCE(progress, 0)';
        }

        if ($hasIsCompleted) {
            return 'CASE WHEN COALESCE(is_completed, FALSE) THEN 100 ELSE 0 END';
        }

        return '0';
    }

    protected function normalizeTaskRow(object $row): array
    {
        $activity = $row->activity
            ?? $row->title
            ?? $row->task_name
            ?? $row->name
            ?? '';

        $milestone = $row->target_milestone
            ?? $row->targeted_milestone
            ?? $row->target
            ?? $row->description
            ?? '';

        $budget = $row->estimated_budget
            ?? $row->amount
            ?? $row->budget
            ?? 0;

        $startDate = $row->start_date
            ?? $row->begin_date
            ?? $row->from_date
            ?? null;

        $deadline = $row->deadline
            ?? $row->due_date
            ?? null;

        $priority = $row->priority
            ?? $row->status
            ?? 'medium';

        $progress = $row->progress
            ?? (isset($row->is_completed) ? ((bool) $row->is_completed ? 100 : 0) : 0);

        return [
            'id' => $row->id,
            'activity' => $activity,
            'targeted_milestone' => $milestone,
            'estimated_budget' => $budget,
            'start_date' => $startDate,
            'deadline' => $deadline,
            'priority' => $priority,
            'progress' => (int) $progress,
            'assigned_to' => $row->assigned_to ?? $row->task_owner_id ?? $row->owner_id ?? null,
            'assigned_user_name' => $row->assigned_user_name ?? null,
            'assigned_user_email' => $row->assigned_user_email ?? null,
            'updated_at' => $row->updated_at ?? null,
            'created_at' => $row->created_at ?? null,
        ];
    }

    protected function buildActionPlanQuery(Request $request): array
    {
        $status = $request->get('status', 'all');
        $search = trim((string) $request->get('q', ''));
        $priority = $request->get('priority', 'all');
        $assignee = $request->get('assignee', 'all');
        $dueStatus = $request->get('due_status', 'all');
        $userId = $request->get('user_id');

        $query = "
            SELECT ap.*, u.name as user_name, u.email as user_email,
                   TO_CHAR(ap.created_at, 'DD/MM/YYYY') as formatted_date,
                   TO_CHAR(ap.created_at, 'DD/MM/YYYY HH24:MI') as created_at_display,
                   TO_CHAR(ap.start_date, 'DD/MM/YYYY') as start_date_display,
                   TO_CHAR(ap.due_date, 'DD/MM/YYYY') as due_date_display
            FROM action_plans ap
            JOIN users u ON u.id = ap.user_id
            WHERE 1=1
        ";

        $params = [];

        if ($this->actionPlanDepartment && Schema::hasColumn('action_plans', 'department')) {
            $query .= ' AND ap.department = ?';
            $params[] = $this->actionPlanDepartment;
        }

        if ($userId) {
            $query .= ' AND ap.user_id = ?';
            $params[] = $userId;
        }

        if ($status !== 'all') {
            $query .= ' AND ap.status = ?';
            $params[] = $status;
        }

        if ($search !== '') {
            $query .= " AND (ap.title ILIKE ? OR COALESCE(ap.description, '') ILIKE ?";
            $like = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;

            if (Schema::hasTable('action_plan_tasks')) {
                [$activityClause, $activityParams] = $this->buildTaskLikeClause('apt', ['activity', 'task_name', 'name'], $like);
                [$milestoneClause, $milestoneParams] = $this->buildTaskLikeClause('apt', ['target_milestone', 'targeted_milestone', 'target', 'action_details', 'description'], $like);
                $taskClauses = array_values(array_filter([$activityClause, $milestoneClause]));

                if (!empty($taskClauses)) {
                    $query .= ' OR EXISTS (
                        SELECT 1 FROM action_plan_tasks apt
                        WHERE apt.action_plan_id = ap.id
                        AND (' . implode(' OR ', $taskClauses) . ')
                    )';
                    $params = array_merge($params, $activityParams, $milestoneParams);
                }
            }

            $query .= ')';
        }

        if ($priority !== 'all' && Schema::hasTable('action_plan_tasks') && Schema::hasColumn('action_plan_tasks', 'priority')) {
            $query .= ' AND EXISTS (
                SELECT 1 FROM action_plan_tasks apt
                WHERE apt.action_plan_id = ap.id
                AND COALESCE(apt.priority, \'medium\') = ?
            )';
            $params[] = $priority;
        }

        if ($assignee !== 'all' && Schema::hasTable('action_plan_tasks') && Schema::hasColumn('action_plan_tasks', 'assigned_to')) {
            if ($assignee === 'unassigned') {
                $query .= ' AND EXISTS (
                    SELECT 1 FROM action_plan_tasks apt
                    WHERE apt.action_plan_id = ap.id
                    AND apt.assigned_to IS NULL
                )';
            } else {
                $query .= ' AND EXISTS (
                    SELECT 1 FROM action_plan_tasks apt
                    WHERE apt.action_plan_id = ap.id
                    AND apt.assigned_to = ?
                )';
                $params[] = $assignee;
            }
        }

        if ($dueStatus !== 'all') {
            if ($dueStatus === 'overdue') {
                $query .= ' AND ap.due_date IS NOT NULL AND ap.due_date < CURRENT_DATE';
            } elseif ($dueStatus === 'due_soon') {
                $query .= ' AND ap.due_date IS NOT NULL AND ap.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL \'7 days\')';
            } elseif ($dueStatus === 'completed') {
                $query .= " AND ap.status = 'completed'";
            } elseif ($dueStatus === 'active') {
                $query .= " AND ap.status IN ('pending', 'in_progress')";
            }
        }

        return [$query, $params];
    }

    protected function buildTaskLikeClause(string $alias, array $candidateColumns, string $needle): array
    {
        $clauses = [];
        $params = [];

        foreach ($candidateColumns as $column) {
            if (!Schema::hasColumn('action_plan_tasks', $column)) {
                continue;
            }

            $clauses[] = "COALESCE({$alias}.{$column}, '') ILIKE ?";
            $params[] = $needle;
        }

        if (empty($clauses)) {
            return [null, []];
        }

        return ['(' . implode(' OR ', $clauses) . ')', $params];
    }

    protected function getExistingTaskColumn(array $candidates): ?string
    {
        foreach ($candidates as $column) {
            if (Schema::hasColumn('action_plan_tasks', $column)) {
                return $column;
            }
        }

        return null;
    }

    protected function buildActionPlanSummary(array $filteredPlans, ?int $currentUserId = null): array
    {
        $summary = $this->emptyActionPlanSummary();
        $summary['total_plans'] = count($filteredPlans);

        foreach ($filteredPlans as $plan) {
            $status = $plan->status ?? 'pending';
            if ($status === 'completed') {
                $summary['completed_plans']++;
            } elseif ($status === 'in_progress') {
                $summary['in_progress_plans']++;
            } elseif ($status === 'pending') {
                $summary['pending_plans']++;
            }

            if (!empty($plan->due_date)) {
                try {
                    $dueDate = \Carbon\Carbon::parse($plan->due_date)->startOfDay();
                    $today = now()->startOfDay();
                    if ($dueDate->lt($today)) {
                        $summary['overdue_plans']++;
                    } elseif ($dueDate->between($today, $today->copy()->addDays(7), true)) {
                        $summary['due_soon_plans']++;
                    }
                } catch (\Exception $e) {
                    // Ignore invalid dates.
                }
            }
        }

        $filteredPlanIds = array_map(fn ($plan) => $plan->id, $filteredPlans);
        $deadlineColumn = $this->getExistingTaskColumn(['deadline', 'due_date']);

        if (!empty($filteredPlanIds) && Schema::hasTable('action_plan_tasks')) {
            $placeholders = implode(',', array_fill(0, count($filteredPlanIds), '?'));
            $progressExpression = $this->buildTaskProgressExpression();

            $taskStatsSql = "
                SELECT
                    COUNT(*) as total_tasks,
                    COALESCE(SUM(CASE WHEN COALESCE($progressExpression, 0) >= 100 THEN 1 ELSE 0 END), 0) as completed_tasks
            ";

            if ($deadlineColumn) {
                $taskStatsSql .= ",
                    COALESCE(SUM(CASE WHEN {$deadlineColumn} IS NOT NULL AND {$deadlineColumn} < CURRENT_DATE AND COALESCE($progressExpression, 0) < 100 THEN 1 ELSE 0 END), 0) as overdue_tasks,
                    COALESCE(SUM(CASE WHEN {$deadlineColumn} IS NOT NULL AND {$deadlineColumn} BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days') AND COALESCE($progressExpression, 0) < 100 THEN 1 ELSE 0 END), 0) as due_soon_tasks
                ";
            } else {
                $taskStatsSql .= ',
                    0 as overdue_tasks,
                    0 as due_soon_tasks
                ';
            }

            $taskStatsSql .= "
                FROM action_plan_tasks
                WHERE action_plan_id IN ($placeholders)
            ";

            $taskStats = DB::selectOne($taskStatsSql, $filteredPlanIds);
            if ($taskStats) {
                $summary['total_tasks'] = (int) $taskStats->total_tasks;
                $summary['completed_tasks'] = (int) $taskStats->completed_tasks;
                $summary['overdue_tasks'] = (int) $taskStats->overdue_tasks;
                $summary['due_soon_tasks'] = (int) $taskStats->due_soon_tasks;
            }

            if ($currentUserId && Schema::hasColumn('action_plan_tasks', 'assigned_to')) {
                $myTodoSql = "
                    SELECT COUNT(*) as my_todo_tasks
                    FROM action_plan_tasks
                    WHERE action_plan_id IN ($placeholders)
                    AND assigned_to = ?
                    AND COALESCE($progressExpression, 0) < 100
                ";

                $myTodoParams = array_merge($filteredPlanIds, [$currentUserId]);
                $myTodoStats = DB::selectOne($myTodoSql, $myTodoParams);
                if ($myTodoStats) {
                    $summary['my_todo_tasks'] = (int) $myTodoStats->my_todo_tasks;
                }
            }
        }

        return $summary;
    }
}
