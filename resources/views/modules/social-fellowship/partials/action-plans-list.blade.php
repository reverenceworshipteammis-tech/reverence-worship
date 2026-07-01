@include('modules.discipline.partials.action-plans-tab', [
    'actionPlanBaseUrl' => '/social-fellowship',
    'actionPlanHeading' => 'Social Fellowship Action Plans',
    'actionPlanDepartmentLabel' => 'Social Fellowship DPT',
    'canManageActionPlans' => true,
])
@include('modules.discipline.modals.action-plan-modal', [
    'actionPlanBaseUrl' => '/social-fellowship',
    'actionPlanRouteSegment' => 'action-plans',
])
@include('modules.discipline.modals.action-plan-task-modal', [
    'actionPlanBaseUrl' => '/social-fellowship',
    'actionPlanRouteSegment' => 'action-plans',
])
