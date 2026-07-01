@php
    $summary = $summary ?? [];
    $actionPlanBaseUrl = $actionPlanBaseUrl ?? '/discipline';
    $actionPlanRouteSegment = $actionPlanRouteSegment ?? 'action-plans';
    $actionPlanDepartmentLabel = $actionPlanDepartmentLabel ?? 'Discipline DPT';
    $actionPlanHeading = $actionPlanHeading ?? 'Action Plans';
    $canManageActionPlans = $canManageActionPlans ?? true;
    $summaryDefaults = [
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
    $summary = array_merge($summaryDefaults, is_array($summary) ? $summary : []);
@endphp

<div>
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div>
            <h3 class="text-lg font-semibold text-gray-800">{{ $actionPlanHeading }}</h3>
        </div>
        @if($canManageActionPlans)
        <button type="button" onclick="window.openActionPlanModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 w-fit">
            <i class="fas fa-plus"></i> Create New Action Plan
        </button>
        @endif
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div class="rounded-xl border border-rose-100 bg-gradient-to-br from-white via-rose-50 to-red-50/40 p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs uppercase tracking-wide text-gray-500">Overdue Tasks</p>
                    <p id="summaryOverdueTasks" class="mt-1 text-2xl font-bold text-rose-600">{{ $summary['overdue_tasks'] }}</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center ring-1 ring-rose-200">
                    <i class="fas fa-exclamation-triangle text-rose-700"></i>
                </div>
            </div>
        </div>
        <div class="rounded-xl border border-amber-100 bg-gradient-to-br from-white via-amber-50 to-yellow-50/50 p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs uppercase tracking-wide text-gray-500">To-Be-Overdue Within 7 Days</p>
                    <p id="summaryDueSoonTasks" class="mt-1 text-2xl font-bold text-amber-600">{{ $summary['due_soon_tasks'] }}</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center ring-1 ring-amber-200">
                    <i class="fas fa-hourglass-half text-amber-700"></i>
                </div>
            </div>
        </div>
        <div class="rounded-xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-blue-50/40 p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs uppercase tracking-wide text-gray-500">My TO DO</p>
                    <p id="summaryMyTodoTasks" class="mt-1 text-2xl font-bold text-sky-600">{{ $summary['my_todo_tasks'] }}</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center ring-1 ring-sky-200">
                    <i class="fas fa-user-check text-sky-700"></i>
                </div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-4" id="action-plans-list">
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Loading action plans...</p>
        </div>
    </div>
</div>
<div id="actionPlanTimelineModal" class="modal hidden fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-[1105]">
    <div class="relative top-6 mx-auto w-full max-w-6xl px-3 sm:px-6 pb-8">
        <div class="rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div class="flex items-start justify-between gap-4 px-5 sm:px-8 pt-8 pb-5 border-b border-gray-100">
                <div>
                    <div class="h-1 w-28 rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400 mb-5"></div>
                    <h3 class="text-xl sm:text-2xl font-bold tracking-tight leading-none">
                        <span class="text-gray-700">{{ $actionPlanDepartmentLabel }}</span>
                        <span class="text-purple-500"> ACTION PLAN</span>
                    </h3>
                    <p id="action_plan_timeline_subtitle" class="mt-4 text-sm sm:text-base text-gray-500"></p>
                </div>
                <div class="flex items-center gap-2">
            <button type="button" onclick="window.exportActionPlanTimeline(window.currentActionPlanTimelinePlanId)" class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
                        <i class="fas fa-file-excel"></i>
                        Export
                    </button>
                    <button type="button" data-modal-close="actionPlanTimelineModal" onclick="closeModal('actionPlanTimelineModal')" class="text-gray-400 hover:text-gray-600 mt-1">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
            </div>

            <div id="action_plan_timeline_body" class="p-4 sm:p-5">
                <div class="text-center py-10 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                    <p>Loading timeline...</p>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
window.currentActionPlansPage = window.currentActionPlansPage || 1;
window.currentActionPlansPagination = window.currentActionPlansPagination || {
    current_page: 1,
    total_pages: 1,
    has_prev: false,
    has_next: false,
    total: 0,
    per_page: 1
};
window.currentActionPlanTimelinePlanId = null;
window.initialActionPlans = window.initialActionPlans || @json($actionPlans ?? []);
window.initialActionPlansPagination = window.initialActionPlansPagination || @json($pagination ?? null);
const actionPlanBaseUrl = @json($actionPlanBaseUrl);
const actionPlanRouteSegment = @json($actionPlanRouteSegment);
const canManageActionPlans = @json($canManageActionPlans);
window.disciplineAlert = window.disciplineAlert || function(message) {
    appAlert(message);
};
window.disciplineConfirm = window.disciplineConfirm || async function(message) {
    return window.appConfirm(message);
};
window.disciplinePrompt = window.disciplinePrompt || async function(message, title = '', placeholder = '') {
    return prompt(message, placeholder);
};
window.closeModal = window.closeModal || function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
        document.body.style.overflow = '';
    }
};

function showActionPlanModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('hidden');
    modal.style.removeProperty('display');
    document.body.style.overflow = 'hidden';
}

function updateActionPlanSummary(summary = {}) {
    const defaults = {
        overdue_tasks: 0,
        due_soon_tasks: 0,
        my_todo_tasks: 0,
    };
    const values = { ...defaults, ...(summary || {}) };
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = String(value ?? 0);
        }
    };

    setText('summaryOverdueTasks', values.overdue_tasks);
    setText('summaryDueSoonTasks', values.due_soon_tasks);
    setText('summaryMyTodoTasks', values.my_todo_tasks);
}

function parseActionPlanDateValue(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    const normalized = String(value).trim();
    if (!normalized) {
        return null;
    }

    const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
        return new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]));
    }

    const dmyMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/);
    if (dmyMatch) {
        const parsed = new Date(
            Number(dmyMatch[3]),
            Number(dmyMatch[2]) - 1,
            Number(dmyMatch[1]),
            Number(dmyMatch[4] ?? 0),
            Number(dmyMatch[5] ?? 0)
        );
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function padActionPlanDatePart(value) {
    return String(value).padStart(2, '0');
}

function formatActionPlanDate(value) {
    const parsed = parseActionPlanDateValue(value);
    if (!parsed) {
        return '';
    }

    return [
        padActionPlanDatePart(parsed.getDate()),
        padActionPlanDatePart(parsed.getMonth() + 1),
        parsed.getFullYear()
    ].join('/');
}

function formatActionPlanDateTime(value) {
    const parsed = parseActionPlanDateValue(value);
    if (!parsed) {
        return '';
    }

    return `${formatActionPlanDate(parsed)} ${padActionPlanDatePart(parsed.getHours())}:${padActionPlanDatePart(parsed.getMinutes())}`;
}

window.openActionPlanModal = function(planId = null) {
    if (planId) {
        fetch(`${actionPlanBaseUrl}/${actionPlanRouteSegment}/${planId}/edit`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('action_plan_modal_title').textContent = 'Edit Action Plan';
                document.getElementById('action_plan_id').value = data.plan.id;
                document.getElementById('action_plan_title').value = data.plan.title;
                document.getElementById('action_plan_description').value = data.plan.description || '';
                document.getElementById('action_plan_start_date').value = data.plan.start_date || '';
                document.getElementById('action_plan_due_date').value = data.plan.due_date || '';
                showActionPlanModal('actionPlanModal');
            } else {
                disciplineAlert('Error loading action plan: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            disciplineAlert('Error loading action plan');
        });
    } else {
        document.getElementById('action_plan_modal_title').textContent = 'Create Action Plan';
        document.getElementById('action_plan_id').value = '';
        document.getElementById('action_plan_title').value = '';
        document.getElementById('action_plan_description').value = '';
        document.getElementById('action_plan_start_date').value = '';
        document.getElementById('action_plan_due_date').value = '';
        showActionPlanModal('actionPlanModal');
    }
};

function filterActionPlans(page = window.currentActionPlansPage || 1) {
    const perPage = 1;
    window.currentActionPlansPage = page;

    let url = `${actionPlanBaseUrl}/${actionPlanRouteSegment}`;
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('per_page', perPage);

    if (params.toString()) {
        url += '?' + params.toString();
    }

    fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.currentActionPlansPagination = data.pagination || window.currentActionPlansPagination;
            window.currentActionPlansPage = Number(data.pagination?.current_page ?? page);
            updateActionPlanSummary(data.summary || {});
            updateActionPlansList(data.action_plans, data.pagination || window.currentActionPlansPagination);
        } else {
            console.error('Error loading action plans:', data.message);
            document.getElementById('action-plans-list').innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                    <p>Error loading action plans: ${data.message}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('action-plans-list').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                <p>Error loading action plans. Please check the console for details.</p>
            </div>
        `;
    });
}

function renderActionPlansPagination(pagination) {
    const totalPages = Number(pagination?.total_pages ?? 1);
    const currentPage = Number(pagination?.current_page ?? 1);
    const total = Number(pagination?.total ?? 0);

    if (totalPages <= 1) {
        return '';
    }

    return `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-white">
            <p class="text-sm text-gray-500">
                Showing plan ${currentPage} of ${totalPages}${total ? ` (${total} total)` : ''}
            </p>
            <div class="flex items-center gap-2">
                <button type="button" onclick="filterActionPlans(${Math.max(1, currentPage - 1)})" ${currentPage <= 1 ? 'disabled' : ''} class="px-3 py-2 rounded-lg text-sm border ${currentPage <= 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}">
                    Previous
                </button>
                <span class="px-3 py-2 rounded-lg text-sm bg-gray-50 text-gray-700 border border-gray-200">
                    ${currentPage} / ${totalPages}
                </span>
                <button type="button" onclick="filterActionPlans(${Math.min(totalPages, currentPage + 1)})" ${currentPage >= totalPages ? 'disabled' : ''} class="px-3 py-2 rounded-lg text-sm border ${currentPage >= totalPages ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}">
                    Next
                </button>
            </div>
        </div>
    `;
}

function updateActionPlansList(plans, pagination = null) {
    const container = document.getElementById('action-plans-list');
    window.actionPlanTasksMap = {};
    window.actionPlanPlansMap = {};
    
    if (!plans || plans.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 bg-gray-50 rounded-lg">
                <i class="fas fa-tasks text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">No action plans found</p>
                <button type="button" onclick="window.openActionPlanModal()" class="mt-3 text-blue-600 hover:text-blue-700 text-sm">
                    <i class="fas fa-plus"></i> Create your first action plan
                </button>
            </div>
        `;
        return;
    }
    
    const plansHtml = plans.map(plan => {
        let statusColor = '';
        let statusIcon = '';
        const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
        const totalEstimatedAmount = tasks.reduce((total, task) => {
            const amount = Number(task?.estimated_budget || 0);
            return total + (Number.isFinite(amount) ? amount : 0);
        }, 0);

        window.actionPlanPlansMap[plan.id] = plan;

        tasks.forEach(task => {
            if (task && task.id !== undefined && task.id !== null) {
                window.actionPlanTasksMap[task.id] = task;
            }
        });
        
        switch(plan.status) {
            case 'pending':
                statusColor = 'bg-yellow-100 text-yellow-800';
                statusIcon = 'fa-clock';
                break;
            case 'in_progress':
                statusColor = 'bg-blue-100 text-blue-800';
                statusIcon = 'fa-spinner';
                break;
            case 'completed':
                statusColor = 'bg-green-100 text-green-800';
                statusIcon = 'fa-check-circle';
                break;
            case 'cancelled':
                statusColor = 'bg-red-100 text-red-800';
                statusIcon = 'fa-times-circle';
                break;
            default:
                statusColor = 'bg-gray-100 text-gray-800';
                statusIcon = 'fa-question-circle';
        }
        
        return `
            <div class="bg-white border rounded-lg p-4 hover:shadow-md transition">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <h4 class="font-semibold text-gray-800">${escapeHtml(plan.title)}</h4>
                            <span class="px-2 py-1 rounded-full text-xs ${statusColor}">
                                <i class="fas ${statusIcon} mr-1"></i> ${plan.status}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600">${escapeHtml(plan.description || 'No description')}</p>
                        <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span><i class="fas fa-user"></i> ${escapeHtml(plan.user_name)}</span>
                            ${plan.start_date ? `<span><i class="fas fa-calendar-alt"></i> Start: ${escapeHtml(plan.start_date_display || formatActionPlanDate(plan.start_date))}</span>` : ''}
                            ${plan.due_date ? `<span><i class="fas fa-hourglass-half"></i> Completion: ${escapeHtml(plan.due_date_display || formatActionPlanDate(plan.due_date))}</span>` : ''}
                            <span><i class="fas fa-calendar-plus"></i> Created: ${escapeHtml(plan.created_at_display || plan.formatted_date || formatActionPlanDateTime(plan.created_at))}</span>
                        </div>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button type="button" onclick="window.openActionPlanTimeline(${plan.id})" class="text-purple-600 hover:text-purple-700" title="View advanced plan">
                            <i class="fas fa-file-lines"></i>
                        </button>
                        ${canManageActionPlans ? `
                        <button type="button" onclick="window.openActionPlanTaskModal(${plan.id}, this.dataset.planTitle)" data-plan-title="${escapeHtml(plan.title)}" class="text-green-600 hover:text-green-700" title="Create task">
                            <i class="fas fa-plus-circle"></i>
                        </button>
                        <button type="button" onclick="window.exportActionPlanTasks(${plan.id})" class="text-indigo-600 hover:text-indigo-700" title="Export tasks">
                            <i class="fas fa-file-export"></i>
                        </button>
                        <button type="button" onclick="window.openActionPlanModal(${plan.id})" class="text-blue-500 hover:text-blue-700">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" onclick="window.deleteActionPlan(${plan.id})" class="text-red-500 hover:text-red-700">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
                <div class="mt-3">
                    <div class="flex items-center justify-between text-sm mb-1">
                        <span class="text-gray-600">Progress</span>
                        <span class="text-gray-800 font-medium">${plan.progress || 0}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-600 rounded-full h-2 transition-all duration-300" style="width: ${plan.progress || 0}%"></div>
                    </div>
                </div>

                <div class="mt-4 rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
                    <div class="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-semibold text-gray-600 bg-white border-b border-gray-100">
                        <div class="col-span-12 md:col-span-2">Activity</div>
                        <div class="col-span-12 md:col-span-2">Milestone</div>
                        <div class="col-span-6 md:col-span-2">Budget</div>
                        <div class="col-span-6 md:col-span-2">Deadline</div>
                        <div class="col-span-6 md:col-span-1">Priority</div>
                        <div class="col-span-6 md:col-span-1">Progress</div>
                        <div class="col-span-12 md:col-span-2 text-right">Actions</div>
                    </div>
                    ${tasks.length ? tasks.map(task => `
                        <div class="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 items-center">
                            <div class="col-span-12 md:col-span-2 font-medium text-gray-800">${escapeHtml(task.activity || '-')}</div>
                            <div class="col-span-12 md:col-span-2 text-gray-600">
                                <div>${escapeHtml(task.targeted_milestone || '-')}</div>
                            </div>
                            <div class="col-span-6 md:col-span-2 text-gray-600">${task.estimated_budget !== null && task.estimated_budget !== undefined && task.estimated_budget !== '' ? `RWF ${Number(task.estimated_budget).toLocaleString()}` : '-'}</div>
                            <div class="col-span-6 md:col-span-2 text-gray-600">${escapeHtml(formatActionPlanDate(task.deadline) || '-')}</div>
                            <div class="col-span-6 md:col-span-1">
                                <span class="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    ${escapeHtml(task.priority || 'medium')}
                                </span>
                            </div>
                            <div class="col-span-6 md:col-span-1">
                                <div class="flex items-center justify-between text-xs mb-1">
                                    <span class="text-gray-500">${task.progress || 0}%</span>
                                </div>
                                <div class="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                                    <div class="h-2 rounded-full bg-blue-600" style="width: ${task.progress || 0}%"></div>
                                </div>
                            </div>
                            <div class="col-span-12 md:col-span-2">
                                <div class="flex items-center justify-start md:justify-end gap-1 md:gap-2">
                                    <button type="button" onclick="window.openActionPlanTaskModal(${plan.id}, this.dataset.planTitle, ${task.id})" data-plan-title="${escapeHtml(plan.title)}" class="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full text-blue-600 hover:bg-blue-50" title="Edit task">
                                        <i class="fas fa-pen"></i>
                                    </button>
                                    <button type="button" onclick="window.deleteActionPlanTask(${task.id})" class="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full text-red-600 hover:bg-red-50" title="Delete task">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="px-4 py-6 text-center text-sm text-gray-500">
                            No tasks created yet. Use the green plus button to add one.
                        </div>
                    `}
                </div>

                <div class="mt-3 flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3">
                    <div>
                        <p class="text-xs uppercase tracking-wide text-gray-500">Total estimated amount</p>
                        <p class="text-sm text-gray-500">For this action plan only</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs uppercase tracking-wide text-gray-500">Budget</p>
                        <p class="text-lg font-bold text-gray-800">RWF ${totalEstimatedAmount.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = plansHtml + renderActionPlansPagination(pagination || window.currentActionPlansPagination);
}

window.deleteActionPlan = async function(id) {
    if (await disciplineConfirm('Are you sure you want to delete this action plan? All associated tasks will also be deleted.', 'Delete action plan', 'Delete', 'Cancel', 'danger')) {
        fetch(`${actionPlanBaseUrl}/${actionPlanRouteSegment}/${id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                filterActionPlans();
            } else {
                disciplineAlert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            disciplineAlert('Error deleting action plan');
        });
    }
};

window.openActionPlanTaskModal = function(planId, planTitle) {
    const taskId = arguments.length > 2 ? arguments[2] : null;
    const planIdInput = document.getElementById('action_plan_task_plan_id');
    const planTitleInput = document.getElementById('action_plan_task_plan_title');
    const modalTitle = document.getElementById('action_plan_task_modal_title');
    const taskIdInput = document.getElementById('action_plan_task_id');
    const submitBtn = document.getElementById('action_plan_task_submit');
    const task = taskId ? (window.actionPlanTasksMap?.[taskId] || null) : null;

    if (planIdInput) planIdInput.value = planId;
    if (planTitleInput) planTitleInput.value = planTitle || '';
    if (taskIdInput) taskIdInput.value = task?.id || '';

    if (task) {
        if (modalTitle) modalTitle.textContent = `Edit Task${planTitle ? ` for ${planTitle}` : ''}`;
        document.getElementById('action_plan_task_activity').value = task.activity || '';
        document.getElementById('action_plan_task_target').value = task.targeted_milestone || '';
        document.getElementById('action_plan_task_start_date').value = task.start_date || '';
        document.getElementById('action_plan_task_budget').value = task.estimated_budget ?? '';
        document.getElementById('action_plan_task_deadline').value = task.deadline || '';
        document.getElementById('action_plan_task_priority').value = task.priority || 'medium';
        document.getElementById('action_plan_task_progress').value = task.progress ?? 0;
        if (submitBtn) submitBtn.textContent = 'Update Task';
    } else {
        if (modalTitle) modalTitle.textContent = `Create Task${planTitle ? ` for ${planTitle}` : ''}`;
        document.getElementById('action_plan_task_activity').value = '';
        document.getElementById('action_plan_task_target').value = '';
        document.getElementById('action_plan_task_start_date').value = '';
        document.getElementById('action_plan_task_budget').value = '';
        document.getElementById('action_plan_task_deadline').value = '';
        document.getElementById('action_plan_task_priority').value = '';
        document.getElementById('action_plan_task_progress').value = 0;
        if (submitBtn) submitBtn.textContent = 'Save Task';
    }

    showActionPlanModal('actionPlanTaskModal');
    setTimeout(() => document.getElementById('action_plan_task_activity')?.focus(), 100);
}

window.deleteActionPlanTask = async function(taskId) {
    if (!taskId) {
        disciplineAlert('Missing task.');
        return;
    }

    if (!await disciplineConfirm('Are you sure you want to delete this task?', 'Delete task', 'Delete', 'Cancel', 'danger')) {
        return;
    }

    try {
        const response = await fetch(`${actionPlanBaseUrl}/${actionPlanRouteSegment}/task/${taskId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to delete task');
        }

        if (typeof loadActionPlans === 'function') {
            loadActionPlans();
        }
        disciplineAlert('Task deleted successfully');
    } catch (error) {
        console.error('Delete task error:', error);
        disciplineAlert('Error: ' + error.message);
    }
};

window.exportActionPlanTasks = function(planId) {
    const plan = window.actionPlanPlansMap?.[planId];
    if (!plan) {
        disciplineAlert('Unable to export tasks for this plan.');
        return;
    }

    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    const headers = ['No', 'Activity', 'Milestone', 'Budget', 'Deadline'];
    const rows = [headers];

    tasks.forEach((task, index) => {
        rows.push([
            index + 1,
            task.activity || '',
            task.targeted_milestone || '',
            task.estimated_budget !== null && task.estimated_budget !== undefined && task.estimated_budget !== ''
                ? `RWF ${Number(task.estimated_budget).toLocaleString()}`
                : '',
            task.deadline || ''
        ]);
    });

    const csv = '\uFEFF' + rows.map(row => row.map(cell => {
        const value = String(cell ?? '');
        return `"${value.replace(/"/g, '""')}"`;
    }).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(plan.title || 'action_plan').replace(/[^a-zA-Z0-9]+/g, '_')}_tasks.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

window.exportActionPlanTimeline = function(planId) {
    const plan = window.actionPlanPlansMap?.[planId];
    if (!plan) {
        disciplineAlert('Unable to export the advanced view.');
        return;
    }

    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    const planStart = parseActionPlanDate(plan.start_date);
    const planDue = parseActionPlanDate(plan.due_date);
    const taskDates = tasks.flatMap(task => {
        const dates = [];
        const taskStart = parseActionPlanDate(task.start_date);
        const taskDeadline = parseActionPlanDate(task.deadline);
        if (taskStart) dates.push(taskStart);
        if (taskDeadline) dates.push(taskDeadline);
        return dates;
    });

    const rangeStartCandidate = [planStart, ...taskDates].filter(Boolean).sort((a, b) => a - b)[0] || new Date();
    const rangeEndCandidate = [planDue, ...taskDates].filter(Boolean).sort((a, b) => b - a)[0] || rangeStartCandidate;
    const rangeStart = new Date(rangeStartCandidate.getFullYear(), rangeStartCandidate.getMonth(), 1);
    const rangeEnd = new Date(rangeEndCandidate.getFullYear(), rangeEndCandidate.getMonth(), 1);
    const timelineMonths = buildTimelineMonths(rangeStart, rangeEnd);

    const monthHeaderCells = timelineMonths.map(month => `
        <th style="border:1px solid #d1d5db;background:#ede9fe;padding:8px 6px;text-align:center;font-size:11px;font-weight:700;color:#374151;">
            ${month.month}<br><span style="font-size:10px;font-weight:600;color:#6b7280;">${month.year}</span>
        </th>
    `).join('');

    const rows = tasks.map((task, index) => {
        const taskStart = parseActionPlanDate(task.start_date) || planStart || rangeStart;
        const taskDeadline = parseActionPlanDate(task.deadline) || taskStart;
        const startIndex = getMonthOffset(rangeStart, new Date(taskStart.getFullYear(), taskStart.getMonth(), 1));
        const endIndex = getMonthOffset(rangeStart, new Date(taskDeadline.getFullYear(), taskDeadline.getMonth(), 1));
        const color = '#6b7280';
        let firstBarCell = true;

        const timelineCells = timelineMonths.map((_, monthIndex) => {
            if (monthIndex < startIndex || monthIndex > endIndex) {
                return '<td style="border:1px solid #e5e7eb;padding:8px 6px;background:#fff;">&nbsp;</td>';
            }

            const content = firstBarCell ? escapeHtml(task.activity || '-') : '&nbsp;';
            firstBarCell = false;
            return `<td style="border:1px solid #e5e7eb;padding:8px 6px;background:${color};color:#fff;font-weight:700;text-align:center;">${content}</td>`;
        }).join('');

        const remainingDays = taskDeadline ? Math.ceil((taskDeadline - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000) : null;
        const timeLabel = remainingDays === null
            ? '-'
            : remainingDays > 0
                ? `${remainingDays} Days Left`
                : remainingDays === 0
                    ? 'Due Today'
                    : `${Math.abs(remainingDays)} Days Overdue`;

        return `
            <tr>
                <td style="border:1px solid #e5e7eb;padding:8px 6px;text-align:center;font-weight:700;">${String(index + 1).padStart(2, '0')}</td>
                <td style="border:1px solid #e5e7eb;padding:8px 6px;"><div style="font-weight:700;">${escapeHtml(task.activity || '-')}</div></td>
                <td style="border:1px solid #e5e7eb;padding:8px 6px;">${escapeHtml(task.targeted_milestone || '-')}</td>
                <td style="border:1px solid #e5e7eb;padding:8px 6px;">${escapeHtml(timeLabel)}</td>
                ${timelineCells}
            </tr>
        `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body>
    <table>
        <tr><td colspan="${4 + timelineMonths.length}" style="font-size:16px;font-weight:700;">${escapeHtml(plan.title || 'Action Plan')}</td></tr>
        <tr><td colspan="${4 + timelineMonths.length}" style="color:#6b7280;">${escapeHtml(plan.description || '')}</td></tr>
        <tr><td colspan="${4 + timelineMonths.length}">&nbsp;</td></tr>
        <tr>
            <th style="border:1px solid #d1d5db;background:#1d4ed8;color:#fff;padding:8px 6px;">No</th>
            <th style="border:1px solid #d1d5db;background:#1d4ed8;color:#fff;padding:8px 6px;">Task</th>
            <th style="border:1px solid #d1d5db;background:#0ea5e9;color:#fff;padding:8px 6px;">Milestone</th>
            <th style="border:1px solid #d1d5db;background:#0ea5e9;color:#fff;padding:8px 6px;">Time</th>
            ${monthHeaderCells}
        </tr>
        ${rows || `<tr><td colspan="${4 + timelineMonths.length}" style="border:1px solid #e5e7eb;padding:10px;text-align:center;">No tasks available.</td></tr>`}
    </table>
</body>
</html>`;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(plan.title || 'action_plan').replace(/[^a-zA-Z0-9]+/g, '_')}_timeline.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

window.openActionPlanTimeline = function(planId) {
    const plan = window.actionPlanPlansMap?.[planId];
    const body = document.getElementById('action_plan_timeline_body');
    const subtitle = document.getElementById('action_plan_timeline_subtitle');

    if (!plan || !body) {
        disciplineAlert('Unable to load the advanced view for this plan.');
        return;
    }

    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    window.currentActionPlanTimelinePlanId = planId;
    const planStart = parseActionPlanDate(plan.start_date);
    const planDue = parseActionPlanDate(plan.due_date);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const taskDates = tasks.flatMap(task => {
        const dates = [];
        const taskStart = parseActionPlanDate(task.start_date);
        const taskDeadline = parseActionPlanDate(task.deadline);
        if (taskStart) dates.push(taskStart);
        if (taskDeadline) dates.push(taskDeadline);
        return dates;
    });

    const rangeStartCandidate = [planStart, ...taskDates].filter(Boolean).sort((a, b) => a - b)[0] || new Date();
    const rangeEndCandidate = [planDue, ...taskDates].filter(Boolean).sort((a, b) => b - a)[0] || rangeStartCandidate;
    const rangeStart = new Date(rangeStartCandidate.getFullYear(), rangeStartCandidate.getMonth(), 1);
    const rangeEnd = new Date(rangeEndCandidate.getFullYear(), rangeEndCandidate.getMonth(), 1);
    const timelineMonths = buildTimelineMonths(rangeStart, rangeEnd);
    const timelineMinWidth = Math.max(0, (timelineMonths.length * 52) + 250);

    if (subtitle) {
        subtitle.textContent = `${plan.title || 'Action Plan'}${planStart ? ` • Start ${formatActionPlanDate(plan.start_date)}` : ''}${planDue ? ` • Completion ${formatActionPlanDate(plan.due_date)}` : ''}`;
    }

    if (!tasks.length) {
        body.innerHTML = `
            <div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-gray-500">
                <i class="fas fa-layer-group text-3xl mb-3 text-gray-300"></i>
                <p>No tasks available for this action plan yet.</p>
            </div>
        `;
        showActionPlanModal('actionPlanTimelineModal');
        return;
    }

    const rows = tasks.map((task, index) => {
        const taskStart = parseActionPlanDate(task.start_date) || planStart || rangeStart;
        const taskDate = parseActionPlanDate(task.deadline);
        const taskBarStart = taskStart ? new Date(taskStart.getFullYear(), taskStart.getMonth(), 1) : rangeStart;
        const taskBarEnd = taskDate ? new Date(taskDate.getFullYear(), taskDate.getMonth(), 1) : taskBarStart;
        const startIndex = getMonthOffset(rangeStart, taskBarStart);
        const endIndex = getMonthOffset(rangeStart, taskBarEnd);
        const span = Math.max(1, endIndex - startIndex + 1);
        const left = Math.max(0, (startIndex / timelineMonths.length) * 100);
        const width = Math.min(100 - left, (span / timelineMonths.length) * 100);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const remainingDays = taskDate ? Math.ceil((taskDate - today) / 86400000) : null;
        const color = remainingDays !== null && remainingDays < 0
            ? 'bg-red-600'
            : 'bg-gray-600';
        let timeLabel = '-';

        if (remainingDays !== null) {
            if (remainingDays > 0) {
                timeLabel = `${remainingDays} Days Left`;
            } else if (remainingDays === 0) {
                timeLabel = 'Due Today';
            } else {
                timeLabel = `${Math.abs(remainingDays)} Days Overdue`;
            }
        }

        return `
            <div class="grid border-b border-gray-100 last:border-b-0" style="grid-template-columns: 140px 100px minmax(0, 1fr);">
                <div class="px-3 py-4 bg-white border-r border-gray-100 flex items-center gap-2">
                    <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center">${String(index + 1).padStart(2, '0')}</div>
                    <div>
                        <div class="font-medium text-gray-800 text-sm">${escapeHtml(task.activity || '-')}</div>
                    </div>
                </div>
                <div class="px-3 py-4 bg-white border-r border-gray-100 flex items-center text-gray-600 text-sm">${escapeHtml(timeLabel)}</div>
                <div class="px-3 py-4 bg-gray-50">
                    <div class="relative h-10 rounded-lg overflow-hidden bg-white border border-gray-100">
                        <div class="absolute inset-0 grid" style="grid-template-columns: repeat(${timelineMonths.length}, minmax(3.25rem, 1fr));">
                            ${timelineMonths.map(month => `
                                <div class="border-r border-gray-200 last:border-r-0 bg-purple-50/70 flex items-center justify-center text-[10px] font-semibold text-gray-700 leading-tight px-0.5">
                                    <span>${month.month}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="absolute top-1/2 -translate-y-1/2 h-8 rounded-md ${color} flex items-center px-2 text-[10px] font-semibold text-white shadow-sm" style="left: ${left}%; width: ${width}%">
                            <span class="truncate">${escapeHtml(task.activity || '-')}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    body.innerHTML = `
        <div>
            <div class="rounded-3xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.06)] overflow-hidden border border-gray-100" style="min-width: ${timelineMinWidth}px;">
                <div class="grid" style="grid-template-columns: 140px 100px minmax(0, 1fr);">
                    <div class="bg-blue-600 text-white px-4 py-4 flex items-center justify-center text-sm font-semibold border-r border-white/20">
                        Task
                    </div>
                    <div class="bg-sky-500 text-white px-4 py-4 flex items-center justify-center text-sm font-semibold border-r border-white/20">
                        Time
                    </div>
                    <div class="grid text-gray-700" style="grid-template-columns: repeat(${timelineMonths.length}, minmax(3.25rem, 1fr));">
                        ${timelineMonths.map(month => `
                            <div class="py-2 flex flex-col items-center justify-center border-r border-purple-200 last:border-r-0 font-semibold bg-purple-100 leading-tight px-0.5 text-[10px]">
                                <span>${month.month}</span>
                                <span class="text-[9px] text-gray-500">${month.year}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="relative">
                    ${rows}
                </div>
            </div>
        </div>
    `;

    showActionPlanModal('actionPlanTimelineModal');
};

function parseActionPlanDate(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value;
    }

    const normalized = String(value).trim();
    const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }

    const dmyMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmyMatch) {
        return new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildTimelineMonths(startDate, endDate) {
    const months = [];
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const limit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (cursor <= limit) {
        months.push({
            month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][cursor.getMonth()],
            year: cursor.getFullYear(),
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    return months;
}

function getMonthOffset(startDate, targetDate) {
    return (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
}

// Load initial data
if (Array.isArray(window.initialActionPlans) && window.initialActionPlans.length > 0) {
    window.currentActionPlansPagination = window.initialActionPlansPagination || window.currentActionPlansPagination;
    window.currentActionPlansPage = Number(window.currentActionPlansPagination?.current_page ?? 1);
    updateActionPlansList(window.initialActionPlans, window.currentActionPlansPagination);
} else {
    filterActionPlans(1);
}

// Expose the loader for saves, deletes, and pagination
window.loadActionPlans = filterActionPlans;
</script>


