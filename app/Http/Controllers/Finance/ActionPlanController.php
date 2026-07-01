<?php

namespace App\Http\Controllers\Finance;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\ManagesActionPlans;
use Illuminate\Http\Request;

class ActionPlanController extends Controller
{
    use ManagesActionPlans;

    protected ?string $actionPlanDepartment = 'finance';

    protected function actionPlanView(): string
    {
        return 'modules.finance.partials.action-plans-tab';
    }

    public function filterActionPlans(Request $request)
    {
        $request->merge(['per_page' => $request->get('per_page', 1)]);
        return $this->actionPlanIndex($request);
    }

    public function storeActionPlan(Request $request)
    {
        return $this->actionPlanStore($request);
    }

    public function updateActionPlan(Request $request, $id)
    {
        return $this->actionPlanUpdate($request, $id);
    }

    public function deleteActionPlan($id)
    {
        return $this->actionPlanDestroy($id);
    }

    public function editActionPlan($id)
    {
        return $this->actionPlanEdit($id);
    }

    public function showActionPlan($id)
    {
        return $this->editActionPlan($id);
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
}
