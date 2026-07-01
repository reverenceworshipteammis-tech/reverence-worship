@php
    $actionPlanBaseUrl = $actionPlanBaseUrl ?? '/discipline';
    $actionPlanRouteSegment = $actionPlanRouteSegment ?? 'action-plans';
@endphp

<div id="actionPlanTaskModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="action_plan_task_modal_title" class="text-lg font-bold text-gray-800">Create Task</h3>
            <button type="button" data-modal-close="actionPlanTaskModal" onclick="closeModal('actionPlanTaskModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <form id="action-plan-task-form" class="mt-4">
            @csrf
            <input type="hidden" id="action_plan_task_plan_id" name="plan_id">
            <input type="hidden" id="action_plan_task_id" name="task_id">

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Action Plan</label>
                    <input type="text" id="action_plan_task_plan_title" readonly class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Activity *</label>
                    <input type="text" id="action_plan_task_activity" name="activity" required placeholder="Enter activity" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Targeted Milestone *</label>
                    <input type="text" id="action_plan_task_target" name="targeted_milestone" required placeholder="Enter targeted milestone" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input type="date" id="action_plan_task_start_date" name="start_date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Estimated Budget *</label>
                        <input type="number" step="0.01" min="0" id="action_plan_task_budget" name="estimated_budget" required placeholder="0.00" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
                        <input type="date" id="action_plan_task_deadline" name="deadline" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                        <select id="action_plan_task_priority" name="priority" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                            <option value="">Select priority</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>

                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Progress *</label>
                        <input type="number" id="action_plan_task_progress" name="progress" min="0" max="100" value="0" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-5 pt-3 border-t">
                <button type="button" data-modal-close="actionPlanTaskModal" onclick="closeModal('actionPlanTaskModal')" class="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button id="action_plan_task_submit" type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save Task</button>
            </div>
        </form>
    </div>
</div>

<script>
function getActionPlanTaskCsrfToken() {
    const formToken = document.querySelector('#action-plan-task-form input[name="_token"]')?.value;
    if (formToken) {
        return formToken;
    }

    return document.querySelector('meta[name="csrf-token"]')?.content || '';
}

document.getElementById('action-plan-task-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = this;
    const planId = document.getElementById('action_plan_task_plan_id').value;
    const taskId = document.getElementById('action_plan_task_id').value;
    const submitBtn = document.getElementById('action_plan_task_submit') || form.querySelector('button[type="submit"]');
    const isEditing = !!taskId;
    const baseUrl = @json($actionPlanBaseUrl);
    const routeSegment = @json($actionPlanRouteSegment);
    const url = isEditing ? `${baseUrl}/${routeSegment}/task/${taskId}` : `${baseUrl}/${routeSegment}/${planId}/task`;
    const method = isEditing ? 'PUT' : 'POST';

    if (!planId) {
        disciplineAlert('Missing action plan.');
        return;
    }

    if (isEditing) {
        const confirmed = await disciplineConfirm(
            'Save these changes to the task?',
            'Confirm task update',
            'Update',
            'Cancel',
            'warning'
        );

        if (!confirmed) {
            return;
        }
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saving...';
    }

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getActionPlanTaskCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                _token: getActionPlanTaskCsrfToken(),
                activity: document.getElementById('action_plan_task_activity').value.trim(),
                targeted_milestone: document.getElementById('action_plan_task_target').value.trim(),
                estimated_budget: document.getElementById('action_plan_task_budget').value,
                start_date: document.getElementById('action_plan_task_start_date').value,
                deadline: document.getElementById('action_plan_task_deadline').value,
                priority: document.getElementById('action_plan_task_priority').value,
                progress: document.getElementById('action_plan_task_progress').value
            })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to create task');
        }

        closeModal('actionPlanTaskModal');
        form.reset();
        document.getElementById('action_plan_task_id').value = '';
        document.getElementById('action_plan_task_plan_id').value = '';
        document.getElementById('action_plan_task_plan_title').value = '';
        document.getElementById('action_plan_task_start_date').value = '';
        if (submitBtn) {
            submitBtn.dataset.originalText = 'Save Task';
            submitBtn.textContent = 'Save Task';
        }
        document.getElementById('action_plan_task_progress').value = 0;
        if (typeof loadActionPlans === 'function') {
            loadActionPlans();
        }
        disciplineAlert(isEditing ? 'Task updated successfully' : 'Task created successfully');
    } catch (error) {
        console.error('Task save error:', error);
        disciplineAlert('Error: ' + error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.dataset.originalText || 'Save Task';
        }
    }
});
</script>
