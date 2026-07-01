@include('modules.discipline.partials.action-plans-tab', [
    'actionPlanBaseUrl' => '/finance',
    'actionPlanHeading' => 'Financial Management Action Plans',
    'actionPlanDepartmentLabel' => 'Finance DPT',
    'canManageActionPlans' => true,
])
@include('modules.discipline.modals.action-plan-modal', [
    'actionPlanBaseUrl' => '/finance',
    'actionPlanRouteSegment' => 'action-plans',
])
@include('modules.discipline.modals.action-plan-task-modal', [
    'actionPlanBaseUrl' => '/finance',
    'actionPlanRouteSegment' => 'action-plans',
])
