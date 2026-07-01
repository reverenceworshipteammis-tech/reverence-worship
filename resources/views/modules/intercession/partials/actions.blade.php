@include('modules.discipline.partials.action-plans-tab', [
    'actionPlanBaseUrl' => '/intercession',
    'actionPlanHeading' => 'Intercession Action Plans',
    'actionPlanDepartmentLabel' => 'Intercession DPT',
    'canManageActionPlans' => true,
])
@include('modules.discipline.modals.action-plan-modal', [
    'actionPlanBaseUrl' => '/intercession',
    'actionPlanRouteSegment' => 'action-plans',
])
@include('modules.discipline.modals.action-plan-task-modal', [
    'actionPlanBaseUrl' => '/intercession',
    'actionPlanRouteSegment' => 'action-plans',
])
