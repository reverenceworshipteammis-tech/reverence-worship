@include('modules.discipline.partials.action-plans-tab', [
    'actionPlanBaseUrl' => '/music',
    'actionPlanRouteSegment' => 'action-plan',
    'actionPlanHeading' => 'Music Action Plans',
    'actionPlanDepartmentLabel' => 'Music Ministry DPT',
    'canManageActionPlans' => true,
])
@include('modules.discipline.modals.action-plan-modal', [
    'actionPlanBaseUrl' => '/music',
    'actionPlanRouteSegment' => 'action-plan',
])
@include('modules.discipline.modals.action-plan-task-modal', [
    'actionPlanBaseUrl' => '/music',
    'actionPlanRouteSegment' => 'action-plan',
])
