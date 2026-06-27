<div>
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-800">Action Plans</h3>
        <button onclick="openActionPlanModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <i class="fas fa-plus"></i> Create Action Plan
        </button>
    </div>
    
    <!-- Filters -->
    <div class="bg-gray-50 rounded-lg p-4 mb-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="action_plan_status_filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select id="action_plan_user_filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    <option value="">All Users</option>
                    @foreach($users ?? [] as $user)
                    <option value="{{ $user->id }}">{{ $user->name }}</option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                <button onclick="filterActionPlans()" class="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">
                    <i class="fas fa-search"></i> Filter
                </button>
            </div>
        </div>
    </div>
    
    <!-- Action Plans List -->
    <div class="grid grid-cols-1 gap-4" id="action-plans-list">
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Loading action plans...</p>
        </div>
    </div>
</div>

<script>
function openActionPlanModal(planId = null) {
    if (planId) {
        fetch(`/discipline/action-plans/${planId}/edit`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('action_plan_modal_title').textContent = 'Edit Action Plan';
                document.getElementById('action_plan_id').value = data.plan.id;
                document.getElementById('action_plan_user_id').value = data.plan.user_id;
                document.getElementById('action_plan_title').value = data.plan.title;
                document.getElementById('action_plan_description').value = data.plan.description || '';
                document.getElementById('action_plan_due_date').value = data.plan.due_date || '';
                document.getElementById('actionPlanModal').classList.remove('hidden');
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
        document.getElementById('action_plan_user_id').value = '';
        document.getElementById('action_plan_title').value = '';
        document.getElementById('action_plan_description').value = '';
        document.getElementById('action_plan_due_date').value = '';
        document.getElementById('actionPlanModal').classList.remove('hidden');
    }
}

function filterActionPlans() {
    const status = document.getElementById('action_plan_status_filter').value;
    const userId = document.getElementById('action_plan_user_filter').value;
    
    let url = '/discipline/action-plans';
    const params = new URLSearchParams();
    if (status !== 'all') params.append('status', status);
    if (userId) params.append('user_id', userId);
    
    if (params.toString()) {
        url += '?' + params.toString();
    }
    
    fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateActionPlansList(data.action_plans);
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

function updateActionPlansList(plans) {
    const container = document.getElementById('action-plans-list');
    
    if (!plans || plans.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 bg-gray-50 rounded-lg">
                <i class="fas fa-tasks text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">No action plans found</p>
                <button onclick="openActionPlanModal()" class="mt-3 text-blue-600 hover:text-blue-700 text-sm">
                    <i class="fas fa-plus"></i> Create your first action plan
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = plans.map(plan => {
        let statusColor = '';
        let statusIcon = '';
        
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
                            <span><i class="fas fa-calendar"></i> Created: ${plan.formatted_date || ''}</span>
                            ${plan.due_date ? `<span><i class="fas fa-hourglass-half"></i> Due: ${plan.due_date}</span>` : ''}
                        </div>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button onclick="openActionPlanModal(${plan.id})" class="text-blue-500 hover:text-blue-700">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteActionPlan(${plan.id})" class="text-red-500 hover:text-red-700">
                            <i class="fas fa-trash"></i>
                        </button>
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
            </div>
        `;
    }).join('');
}

async function deleteActionPlan(id) {
    if (await disciplineConfirm('Are you sure you want to delete this action plan? All associated tasks will also be deleted.', 'Delete action plan', 'Delete', 'Cancel', 'danger')) {
        fetch(`/discipline/action-plans/${id}`, {
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
}

// Load initial data
setTimeout(() => {
    filterActionPlans();
}, 100);

// Add filter event listeners
document.getElementById('action_plan_status_filter')?.addEventListener('change', filterActionPlans);
document.getElementById('action_plan_user_filter')?.addEventListener('change', filterActionPlans);
</script>
