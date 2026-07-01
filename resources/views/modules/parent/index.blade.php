@extends('layouts.app')

@section('title', 'Parent Dashboard')
@section('page-title', 'Parent Dashboard')

@section('content')
<div class="max-w-7xl mx-auto py-6 space-y-6">

    @if(isset($error))
    <!-- Error Message for Non-Parents -->
    <div class="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 shadow-md">
        <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
            </div>
            <div>
                <h3 class="text-lg font-bold text-red-700">Access Denied</h3>
                <p class="text-red-600 text-sm">{{ $error }}</p>
                <a href="{{ url('/') }}" class="mt-2 inline-block text-sm text-red-700 hover:text-red-900 font-medium">
                    <i class="fas fa-arrow-left mr-1"></i> Return to Home
                </a>
            </div>
        </div>
    </div>
    @else

    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
        <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <i class="fas fa-user-friends text-3xl"></i>
            </div>
            <div>
                <h1 class="text-2xl font-bold">Parent, {{ auth()->user()->name }}</h1>
                @if(isset($familyName) && $familyName)
                <p class="text-blue-100 text-sm">
                    <i class="fas fa-users mr-1"></i> Family: {{ $familyName }}
                </p>
                @else
                <p class="text-blue-100 text-sm">Manage and track your children's progress</p>
                @endif
            </div>
        </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <div class="border-b border-gray-200">
            <nav class="flex -mb-px" id="tabNav">
                <button onclick="switchTab('children')" id="tab-children" class="tab-btn active px-6 py-3 text-sm font-medium border-b-2 border-blue-600 text-blue-600">
                    <i class="fas fa-child mr-2"></i> My Children
                </button>
                <button onclick="switchTab('tasks')" id="tab-tasks" class="tab-btn px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    <i class="fas fa-tasks mr-2"></i> Tasks
                </button>
                <button onclick="switchTab('contributions')" id="tab-contributions" class="tab-btn px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    <i class="fas fa-hand-holding-usd mr-2"></i> Contributions
                </button>
            </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
            <!-- Children Tab -->
            <div id="panel-children" class="tab-panel">
                @include('modules.parent.partials.children-tab')
            </div>

            <!-- Tasks Tab -->
            <div id="panel-tasks" class="tab-panel hidden">
                @include('modules.parent.partials.tasks-tab')
            </div>

            <!-- Contributions Tab -->
            <div id="panel-contributions" class="tab-panel hidden">
                @include('modules.parent.partials.contributions-tab')
            </div>
        </div>
    </div>
    @endif
</div>

<!-- Child Details Modal -->
<div id="childDetailsModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-2xl bg-white mb-10">
        <div class="flex justify-between items-center pb-4 border-b">
            <h3 id="childDetailsTitle" class="text-xl font-bold text-gray-800">
                <i class="fas fa-child text-blue-600"></i> Child Details
            </h3>
            <button onclick="closeModal('childDetailsModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <div id="childDetailsContent" class="mt-4 space-y-3">
            <div class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-blue-500 text-2xl"></i>
                <p class="text-gray-500 mt-2">Loading...</p>
            </div>
        </div>
        <div class="flex justify-end mt-6 pt-4 border-t">
            <button onclick="closeModal('childDetailsModal')" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Close</button>
        </div>
    </div>
</div>

<!-- Child Financial Modal -->
<div id="childFinancialModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-xl rounded-2xl bg-white mb-10">
        <div class="flex justify-between items-center pb-4 border-b">
            <h3 id="childFinancialTitle" class="text-xl font-bold text-gray-800">
                <i class="fas fa-chart-bar text-green-600"></i> Financial Report
            </h3>
            <button onclick="closeModal('childFinancialModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <div id="childFinancialContent" class="mt-4 space-y-3">
            <div class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-blue-500 text-2xl"></i>
                <p class="text-gray-500 mt-2">Loading...</p>
            </div>
        </div>
        <div class="flex justify-end mt-6 pt-4 border-t">
            <button onclick="closeModal('childFinancialModal')" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Close</button>
        </div>
    </div>
</div>

<!-- Add Task Modal -->
<div id="addTaskModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-2xl bg-white mb-10">
        <div class="flex justify-between items-center pb-4 border-b">
            <h3 class="text-xl font-bold text-gray-800">
                <i class="fas fa-plus-circle text-purple-600"></i> Add New Task
            </h3>
            <button onclick="closeModal('addTaskModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <form id="addTaskForm" onsubmit="submitTask(event)">
            @csrf
            <div class="mt-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                    <input type="text" name="title" id="taskTitle" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" id="taskDescription" rows="3" 
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input type="date" name="due_date" id="taskDueDate" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Subtasks</label>
                    <div id="subtasksContainer">
                        <div class="subtask-item flex gap-2 mb-2">
                            <input type="text" name="subtasks[]" placeholder="Enter subtask..." 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                            <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" onclick="addSubtaskField()" class="text-sm text-purple-600 hover:text-purple-700 mt-1">
                        <i class="fas fa-plus"></i> Add Another Subtask
                    </button>
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onclick="closeModal('addTaskModal')" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition">Create Task</button>
            </div>
        </form>
    </div>
</div>

<!-- Edit Task Modal -->
<div id="editTaskModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-2xl bg-white mb-10">
        <div class="flex justify-between items-center pb-4 border-b">
            <h3 class="text-xl font-bold text-gray-800">
                <i class="fas fa-edit text-purple-600"></i> Edit Task
            </h3>
            <button onclick="closeModal('editTaskModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <form id="editTaskForm" onsubmit="updateTask(event)">
            @csrf
           
            <input type="hidden" id="editTaskId" name="task_id">
            <div class="mt-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                    <input type="text" name="title" id="editTaskTitle" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" id="editTaskDescription" rows="3" 
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input type="date" name="due_date" id="editTaskDueDate" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Subtasks</label>
                    <div id="editSubtasksContainer">
                        <!-- Subtasks will be loaded here -->
                    </div>
                    <button type="button" onclick="addEditSubtaskField()" class="text-sm text-purple-600 hover:text-purple-700 mt-1">
                        <i class="fas fa-plus"></i> Add Another Subtask
                    </button>
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onclick="closeModal('editTaskModal')" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition">Update Task</button>
            </div>
        </form>
    </div>
</div>

<!-- View Task Modal -->
<div id="viewTaskModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-2xl bg-white mb-10">
        <div class="flex justify-between items-center pb-4 border-b">
            <h3 id="viewTaskTitle" class="text-xl font-bold text-gray-800">Task Details</h3>
            <button onclick="closeModal('viewTaskModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <div id="viewTaskContent" class="mt-4 space-y-3 max-h-[400px] overflow-y-auto"></div>
        <div class="flex justify-end mt-6 pt-4 border-t">
            <button onclick="closeModal('viewTaskModal')" class="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">Close</button>
        </div>
    </div>
</div>

<!-- View Details Modal (Contributions) -->
<div id="viewDetailsModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-6 border w-full max-w-4xl shadow-xl rounded-2xl bg-white">
        <div class="flex justify-between items-center pb-4 border-b">
            <h3 id="viewDetailsTitle" class="text-xl font-bold text-gray-800">Contribution Details</h3>
            <button onclick="closeModal('viewDetailsModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <div id="viewDetailsContent" class="mt-4 max-h-[500px] overflow-y-auto"></div>
        <div class="flex justify-end mt-6 pt-4 border-t">
            <button onclick="closeModal('viewDetailsModal')" class="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
                Close
            </button>
        </div>
    </div>
</div>

<script>
// ============================================
// TAB SWITCHING
// ============================================
function switchTab(tab) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active', 'border-blue-600', 'text-blue-600');
        b.classList.add('text-gray-500', 'border-transparent');
    });
    
    document.getElementById('panel-' + tab).classList.remove('hidden');
    const btn = document.getElementById('tab-' + tab);
    btn.classList.add('active', 'border-blue-600', 'text-blue-600');
    btn.classList.remove('text-gray-500', 'border-transparent');
    
    // Trigger load functions for each tab
    if (tab === 'tasks') {
        if (typeof loadTasks === 'function') loadTasks();
    }
    if (tab === 'contributions') {
        if (typeof populateYearSelector === 'function') populateYearSelector();
        if (typeof loadContributions === 'function') loadContributions();
    }
}

// ============================================
// SUBTASK FUNCTIONS
// ============================================
let subtaskCounter = 0;

function addSubtaskField() {
    const container = document.getElementById('subtasksContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'subtask-item flex gap-2 mb-2';
    div.innerHTML = `
        <input type="text" name="subtasks[]" placeholder="Enter subtask..." 
               class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
        <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
}

function addEditSubtaskField() {
    const container = document.getElementById('editSubtasksContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'subtask-item flex gap-2 mb-2';
    div.innerHTML = `
        <input type="text" name="subtasks[]" placeholder="Enter subtask..." 
               class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
        <input type="hidden" name="subtask_ids[]" value="new">
        <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
}

function removeSubtask(button) {
    const item = button.closest('.subtask-item');
    if (item && document.querySelectorAll('.subtask-item').length > 1) {
        item.remove();
    } else {
        appAlert('You need at least one subtask');
    }
}

// ============================================
// CHILD DETAILS
// ============================================
function viewChildDetails(childId) {
    const modal = document.getElementById('childDetailsModal');
    const content = document.getElementById('childDetailsContent');
    const title = document.getElementById('childDetailsTitle');
    
    modal.classList.remove('hidden');
    content.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin"></i><p class="text-gray-500 mt-2">Loading...</p></div>';
    
    fetch(`/parent/child/${childId}/details`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const c = data.child;
            title.innerHTML = `<i class="fas fa-child text-blue-600"></i> ${c.name} - Details`;
            content.innerHTML = `
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div><p class="text-xs text-gray-500">Name</p><p class="font-medium">${c.name}</p></div>
                        <div><p class="text-xs text-gray-500">Email</p><p class="font-medium">${c.email || 'N/A'}</p></div>
                        <div><p class="text-xs text-gray-500">Phone</p><p class="font-medium">${c.phone || 'N/A'}</p></div>
                        <div><p class="text-xs text-gray-500">Location</p><p class="font-medium">${c.location || 'N/A'}</p></div>
                        <div><p class="text-xs text-gray-500">Member Since</p><p class="font-medium">${c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</p></div>
                        <div><p class="text-xs text-gray-500">Payments</p><p class="font-medium">${c.payment_count || 0}</p></div>
                    </div>
                </div>
                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <div class="grid grid-cols-3 gap-4">
                        <div class="text-center"><p class="text-xs text-gray-500">Total Paid</p><p class="text-lg font-bold text-green-600">RWF ${numberFormat(c.total_contributions || 0)}</p></div>
                        <div class="text-center"><p class="text-xs text-gray-500">Required</p><p class="text-lg font-bold text-blue-600">RWF ${numberFormat(c.total_required || 0)}</p></div>
                        <div class="text-center"><p class="text-xs text-gray-500">Progress</p><p class="text-lg font-bold text-purple-600">${c.progress || 0}%</p></div>
                    </div>
                    <div class="mt-2 w-full bg-gray-200 rounded-full h-2"><div class="bg-blue-600 h-2 rounded-full" style="width: ${c.progress || 0}%"></div></div>
                </div>
                ${c.recent_payments && c.recent_payments.length > 0 ? `
                <div class="bg-white border rounded-lg p-4">
                    <h4 class="font-semibold text-gray-700 text-sm mb-3">Recent Payments</h4>
                    ${c.recent_payments.map(p => `
                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <div><p class="text-xs text-gray-500">Term ${p.term}</p><p class="text-xs text-gray-400">${p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A'}</p></div>
                            <span class="font-medium text-green-600">RWF ${numberFormat(p.amount)}</span>
                        </div>
                    `).join('')}
                </div>` : ''}
            `;
        } else {
            content.innerHTML = `<div class="text-center py-8 text-red-500"><i class="fas fa-exclamation-circle text-3xl"></i><p>${data.message || 'Error loading details'}</p></div>`;
        }
    })
    .catch(() => {
        content.innerHTML = `<div class="text-center py-8 text-red-500"><i class="fas fa-exclamation-circle text-3xl"></i><p>Error loading details</p></div>`;
    });
}

function viewChildFinancial(childId, childName) {
    const modal = document.getElementById('childFinancialModal');
    const content = document.getElementById('childFinancialContent');
    const title = document.getElementById('childFinancialTitle');
    
    modal.classList.remove('hidden');
    content.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin"></i><p class="text-gray-500 mt-2">Loading...</p></div>';
    title.innerHTML = `<i class="fas fa-chart-bar text-green-600"></i> ${childName} - Financial Report`;
    
    fetch(`/parent/child/${childId}/financial`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let monthlyHtml = '';
            if (data.monthly_data && data.monthly_data.length > 0) {
                monthlyHtml = `
                <div class="bg-white border rounded-lg p-4">
                    <h4 class="font-semibold text-gray-700 text-sm mb-3">Monthly Breakdown</h4>
                    ${data.monthly_data.map(m => `
                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span class="text-sm text-gray-600">${getMonthName(parseInt(m.month))} ${m.year}</span>
                            <span class="font-medium text-green-600">RWF ${numberFormat(parseFloat(m.total) || 0)}</span>
                        </div>
                    `).join('')}
                </div>`;
            }

            let paymentsHtml = '';
            if (data.payments && data.payments.length > 0) {
                paymentsHtml = `
                <div class="bg-white border rounded-lg p-4 max-h-48 overflow-y-auto">
                    <h4 class="font-semibold text-gray-700 text-sm mb-3">All Payments (${data.payments.length})</h4>
                    ${data.payments.map(p => `
                        <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <div><p class="text-sm font-medium text-gray-800">Term ${p.term || 'N/A'}</p><p class="text-xs text-gray-400">${p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A'}</p></div>
                            <span class="font-bold text-green-600">RWF ${numberFormat(parseFloat(p.amount) || 0)}</span>
                        </div>
                    `).join('')}
                </div>`;
            }

            content.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="bg-blue-50 rounded-lg p-3 text-center">
                        <p class="text-xs text-gray-500">Total Paid</p>
                        <p class="text-lg font-bold text-green-600">RWF ${numberFormat(data.total_paid || 0)}</p>
                    </div>
                    <div class="bg-purple-50 rounded-lg p-3 text-center">
                        <p class="text-xs text-gray-500">Annual Target</p>
                        <p class="text-lg font-bold text-purple-600">RWF ${numberFormat(data.annual_target || 0)}</p>
                    </div>
                    <div class="bg-yellow-50 rounded-lg p-3 text-center">
                        <p class="text-xs text-gray-500">Progress</p>
                        <p class="text-lg font-bold text-yellow-600">${data.progress || 0}%</p>
                    </div>
                    <div class="bg-green-50 rounded-lg p-3 text-center">
                        <p class="text-xs text-gray-500">Payments</p>
                        <p class="text-lg font-bold text-green-600">${data.payment_count || 0}</p>
                    </div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                    <div class="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Annual Progress</span>
                        <span>${data.progress || 0}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${data.progress || 0}%"></div>
                    </div>
                </div>
                <div class="bg-white border rounded-lg p-4">
                    <h4 class="font-semibold text-gray-700 text-sm mb-3">Term Totals</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        ${[1,2,3,4].map(term => `
                            <div class="text-center p-3 bg-gray-50 rounded-lg border">
                                <p class="text-xs text-gray-500">Term ${term}</p>
                                <p class="font-bold text-blue-600">RWF ${numberFormat(data.term_totals && data.term_totals[term] ? data.term_totals[term] : 0)}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ${monthlyHtml}
                ${paymentsHtml}
            `;
        } else {
            content.innerHTML = `<div class="text-center py-8 text-red-500"><i class="fas fa-exclamation-circle text-3xl"></i><p>${data.message || 'Error loading report'}</p></div>`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        content.innerHTML = `<div class="text-center py-8 text-red-500"><i class="fas fa-exclamation-circle text-3xl"></i><p>Error loading report</p></div>`;
    });
}

// ============================================
// TASK MODAL FUNCTIONS
// ============================================
function openAddTaskModal() {
    document.getElementById('addTaskModal').classList.remove('hidden');
    document.getElementById('addTaskForm').reset();
    const container = document.getElementById('subtasksContainer');
    if (container) {
        container.innerHTML = `
            <div class="subtask-item flex gap-2 mb-2">
                <input type="text" name="subtasks[]" placeholder="Enter subtask..." 
                       class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
}

function addTaskForChild(childId, childName) {
    openAddTaskModal();
    document.getElementById('taskTitle').focus();
}

function submitTask(event) {
    event.preventDefault();
    
    const formData = new FormData(document.getElementById('addTaskForm'));
    
    fetch('/parent/tasks', {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('addTaskModal');
            document.getElementById('addTaskForm').reset();
            showNotification('Task created successfully!', 'success');
            if (typeof loadTasks === 'function') loadTasks();
        } else {
            appAlert('Error: ' + (data.message || 'Failed to create task'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Network error: ' + error.message);
    });
}

function editTask(taskId) {
    fetch(`/parent/tasks/${taskId}/edit`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const task = data.task;
            document.getElementById('editTaskId').value = task.id;
            document.getElementById('editTaskTitle').value = task.title;
            document.getElementById('editTaskDescription').value = task.description || '';
            document.getElementById('editTaskDueDate').value = task.due_date || '';
            
            const container = document.getElementById('editSubtasksContainer');
            container.innerHTML = '';
            if (task.subtasks && task.subtasks.length > 0) {
                task.subtasks.forEach(sub => {
                    const div = document.createElement('div');
                    div.className = 'subtask-item flex gap-2 mb-2';
                    div.innerHTML = `
                        <input type="text" name="subtasks[]" value="${escapeHtml(sub.title)}" 
                               class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                        <input type="hidden" name="subtask_ids[]" value="${sub.id}">
                        <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    container.appendChild(div);
                });
            } else {
                const div = document.createElement('div');
                div.className = 'subtask-item flex gap-2 mb-2';
                div.innerHTML = `
                    <input type="text" name="subtasks[]" placeholder="Enter subtask..." 
                           class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                    <input type="hidden" name="subtask_ids[]" value="new">
                    <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                container.appendChild(div);
            }
            
            document.getElementById('editTaskModal').classList.remove('hidden');
        }
    })
    .catch(error => console.error('Error:', error));
}

function updateTask(event) {
    event.preventDefault();
    
    const taskId = document.getElementById('editTaskId').value;
    const formData = new FormData(document.getElementById('editTaskForm'));
    
    fetch(`/parent/tasks/${taskId}`, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('editTaskModal');
            showNotification('Task updated successfully!', 'success');
            if (typeof loadTasks === 'function') loadTasks();
        } else {
            appAlert('Error: ' + (data.message || 'Failed to update task'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Network error: ' + error.message);
    });
}

async function deleteTask(taskId) {
    if (await appConfirm('Are you sure you want to delete this task?')) {
        fetch(`/parent/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Task deleted successfully!', 'success');
                if (typeof loadTasks === 'function') loadTasks();
            } else {
                appAlert('Error: ' + (data.message || 'Failed to delete task'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            appAlert('Network error: ' + error.message);
        });
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

function numberFormat(num) {
    return new Intl.NumberFormat().format(num);
}

function getMonthName(month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || month;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type) {
    return window.appNotify(...arguments);
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-all ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Close modals on background click
document.addEventListener('click', function(e) {
    ['childDetailsModal', 'childFinancialModal', 'addTaskModal', 'editTaskModal', 'viewTaskModal', 'viewDetailsModal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal && e.target === modal) closeModal(id);
    });
});

// Close on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        ['childDetailsModal', 'childFinancialModal', 'addTaskModal', 'editTaskModal', 'viewTaskModal', 'viewDetailsModal'].forEach(id => {
            closeModal(id);
        });
    }
});

// Initialize - set default active tab
document.addEventListener('DOMContentLoaded', function() {
    // Children tab is active by default
    if (document.getElementById('panel-tasks') && !document.getElementById('panel-tasks').classList.contains('hidden')) {
        if (typeof loadTasks === 'function') loadTasks();
    }
    if (document.getElementById('panel-contributions') && !document.getElementById('panel-contributions').classList.contains('hidden')) {
        if (typeof populateYearSelector === 'function') populateYearSelector();
        if (typeof loadContributions === 'function') loadContributions();
    }
});
</script>

<style>
.modal { display: none; }
.modal:not(.hidden) { display: block !important; }

.tab-btn.active {
    border-bottom-color: #2563eb;
    color: #2563eb;
}

.tab-panel.hidden {
    display: none !important;
}

.subtask-item input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
}
</style>
@endsection

