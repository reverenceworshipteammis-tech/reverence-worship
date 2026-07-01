@php
    $actionPlanBaseUrl = $actionPlanBaseUrl ?? '/discipline';
    $actionPlanRouteSegment = $actionPlanRouteSegment ?? 'action-plans';
@endphp

<div id="actionPlanModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="action_plan_modal_title" class="text-lg font-bold text-gray-800">Action Plan</h3>
            <button type="button" data-modal-close="actionPlanModal" onclick="closeModal('actionPlanModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <form id="action-plan-form">
            @csrf
            <input type="hidden" id="action_plan_id" name="action_plan_id">

            <div class="mt-4 space-y-5">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Action Plan Name *</label>
                        <input type="text" id="action_plan_title" name="title" required placeholder="Enter action plan name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                        <input type="date" id="action_plan_start_date" name="start_date" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Completion Date *</label>
                        <input type="date" id="action_plan_due_date" name="due_date" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea id="action_plan_description" name="description" rows="3" placeholder="Optional description" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"></textarea>
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-5 pt-3 border-t">
                <button type="button" data-modal-close="actionPlanModal" onclick="closeModal('actionPlanModal')" class="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save Plan</button>
            </div>
        </form>
    </div>
</div>

<script>
document.getElementById('action-plan-form')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const planId = document.getElementById('action_plan_id').value;
    const submitBtn = this.querySelector('button[type="submit"]');
    const baseUrl = @json($actionPlanBaseUrl);
    const routeSegment = @json($actionPlanRouteSegment);
    let url = `${baseUrl}/${routeSegment}/store`;

    if (planId) {
        url = `${baseUrl}/${routeSegment}/${planId}`;
        formData.append('_method', 'PUT');
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saving...';
    }

    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
    })
    .then(async response => {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'Unable to save action plan');
        }

        return data;
    })
    .then(data => {
        if (data.success) {
            closeModal('actionPlanModal');
            loadActionPlans();
        } else {
            disciplineAlert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Action plan save error:', error);
        disciplineAlert('Error: ' + error.message);
    })
    .finally(() => {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.dataset.originalText || 'Save Plan';
        }
    });
});
</script>
