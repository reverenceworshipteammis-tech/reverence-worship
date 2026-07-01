{{-- Create Action Plan Modal --}}
<div id="createActionPlanModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white mb-10">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-xl font-bold text-gray-800">Create New Action Plan</h3>
            <button type="button" data-modal-close="createActionPlanModal" onclick="closeModal('createActionPlanModal')" class="text-gray-400 hover:text-gray-600 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form id="create-action-plan-form" method="POST" action="{{ route('intercession.action-plans.store') }}">
            @csrf
            
            <div class="mt-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Plan Title <span class="text-red-500">*</span></label>
                    <input type="text" name="title" required 
                           placeholder="Enter action plan title"
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" rows="2" 
                              placeholder="Describe the action plan..."
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"></textarea>
                </div>
                
                <div class="border-t pt-4">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">Tasks</h4>
                    <div id="tasks-container">
                        <div class="task-item grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div class="sm:col-span-2">
                                <input type="text" name="tasks[0][title]" placeholder="Task title" 
                                       class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                            <div>
                                <input type="date" name="tasks[0][target_date]" 
                                       class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                        </div>
                    </div>
                    <button type="button" onclick="addTask()" class="text-sm text-blue-600 hover:text-blue-800 transition flex items-center gap-1 mt-1">
                        <i class="fas fa-plus-circle"></i> Add Task
                    </button>
                </div>
            </div>
            
            <div class="flex flex-wrap justify-end gap-3 mt-5 pt-3 border-t">
                <button type="button" data-modal-close="createActionPlanModal" onclick="closeModal('createActionPlanModal')" class="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition">
                    Cancel
                </button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-2">
                    <i class="fas fa-plus"></i> Create Action Plan
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Edit Action Plan Modal -->
<div id="editActionPlanModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white mb-10">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-xl font-bold text-gray-800">Edit Action Plan</h3>
            <button type="button" data-modal-close="editActionPlanModal" onclick="closeModal('editActionPlanModal')" class="text-gray-400 hover:text-gray-600 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form id="edit-action-plan-form" method="POST" action="{{ route('intercession.action-plans.update', ['id' => '__PLAN_ID__']) }}">
            @csrf
            @method('PUT')
            <input type="hidden" id="edit_plan_id" name="plan_id">
            
            <div class="mt-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Plan Title <span class="text-red-500">*</span></label>
                    <input type="text" id="edit_plan_title" name="title" required 
                           placeholder="Enter action plan title"
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea id="edit_plan_description" name="description" rows="2" 
                              placeholder="Describe the action plan..."
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"></textarea>
                </div>
                
                <div class="border-t pt-4">
                    <h4 class="text-sm font-medium text-gray-700 mb-3">Tasks</h4>
                    <div id="edit-tasks-container">
                        <!-- Tasks will be loaded here -->
                    </div>
                    <button type="button" onclick="addEditTask()" class="text-sm text-blue-600 hover:text-blue-800 transition flex items-center gap-1 mt-1">
                        <i class="fas fa-plus-circle"></i> Add Task
                    </button>
                </div>
            </div>
            
            <div class="flex flex-wrap justify-end gap-3 mt-5 pt-3 border-t">
                <button type="button" data-modal-close="editActionPlanModal" onclick="closeModal('editActionPlanModal')" class="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition">
                    Cancel
                </button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex items-center gap-2">
                    <i class="fas fa-save"></i> Update Plan
                </button>
            </div>
        </form>
    </div>
</div>

<!-- View Plan Modal -->
<div id="viewPlanModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white mb-10">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="viewPlanTitle" class="text-xl font-bold text-gray-800">Plan Details</h3>
            <button type="button" data-modal-close="viewPlanModal" onclick="closeModal('viewPlanModal')" class="text-gray-400 hover:text-gray-600 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <div id="viewPlanContent" class="mt-4">
            <!-- Content loaded via JavaScript -->
        </div>
        
        <div class="flex flex-wrap justify-end gap-3 mt-5 pt-3 border-t">
            <button type="button" data-modal-close="viewPlanModal" onclick="closeModal('viewPlanModal')" class="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition">
                Close
            </button>
        </div>
    </div>
</div>

<script>
// Use different variable names to avoid conflicts
(function() {
    let modalTaskCounter = 1;
    let modalEditTaskCounter = 0;

    // ==================== ADD TASK ====================
    window.addTask = function() {
        const container = document.getElementById('tasks-container');
        if (!container) return;
        
        const taskHtml = `
            <div class="task-item grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div class="sm:col-span-2 flex gap-2">
                    <input type="text" name="tasks[${modalTaskCounter}][title]" placeholder="Task title" 
                           class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <button type="button" onclick="removeTask(this)" class="text-red-400 hover:text-red-600 transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div>
                    <input type="date" name="tasks[${modalTaskCounter}][target_date]" 
                           class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', taskHtml);
        modalTaskCounter++;
    }

    // ==================== REMOVE TASK ====================
    window.removeTask = function(btn) {
        const taskItem = btn.closest('.task-item');
        const container = taskItem.closest('#tasks-container') || taskItem.closest('#edit-tasks-container');
        if (container && container.querySelectorAll('.task-item').length > 1) {
            taskItem.remove();
        } else {
            showNotification('You need at least one task', 'warning');
        }
    }

    // ==================== ADD EDIT TASK ====================
    window.addEditTask = function() {
        const container = document.getElementById('edit-tasks-container');
        if (!container) return;
        
        const taskHtml = `
            <div class="task-item grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div class="sm:col-span-2 flex gap-2">
                    <input type="text" name="edit_tasks[${modalEditTaskCounter}][title]" placeholder="Task title" 
                           class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <button type="button" onclick="removeTask(this)" class="text-red-400 hover:text-red-600 transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div>
                    <input type="date" name="edit_tasks[${modalEditTaskCounter}][target_date]" 
                           class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', taskHtml);
        modalEditTaskCounter++;
    }

    // ==================== OPEN CREATE MODAL ====================
    window.openCreateActionPlanModal = function() {
        const modal = document.getElementById('createActionPlanModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            // Reset tasks
            const container = document.getElementById('tasks-container');
            if (container) {
                container.innerHTML = `
                    <div class="task-item grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div class="sm:col-span-2">
                            <input type="text" name="tasks[0][title]" placeholder="Task title" 
                                   class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                        <div>
                            <input type="date" name="tasks[0][target_date]" 
                                   class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        </div>
                    </div>
                `;
            }
            modalTaskCounter = 1;
            setTimeout(() => {
                const firstInput = modal.querySelector('input[name="title"]');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }

    // ==================== OPEN EDIT MODAL ====================
    window.editPlan = function(planId) {
        const modal = document.getElementById('editActionPlanModal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        document.getElementById('edit_plan_id').value = planId;
        
        // Fetch plan data
        fetch(`/intercession/action-plans/${planId}/edit`, {
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('edit_plan_title').value = data.plan.title || '';
                document.getElementById('edit_plan_description').value = data.plan.description || '';
                
                // Load tasks
                const container = document.getElementById('edit-tasks-container');
                if (!container) return;
                
                container.innerHTML = '';
                modalEditTaskCounter = 0;
                
                if (data.tasks && data.tasks.length > 0) {
                    data.tasks.forEach((task, index) => {
                        const taskHtml = `
                            <div class="task-item grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                <div class="sm:col-span-2 flex gap-2">
                                    <input type="text" name="edit_tasks[${index}][title]" value="${escapeHtml(task.title)}" 
                                           placeholder="Task title" 
                                           class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <input type="hidden" name="edit_tasks[${index}][id]" value="${task.id}">
                                    <button type="button" onclick="removeTask(this)" class="text-red-400 hover:text-red-600 transition">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div>
                                    <input type="date" name="edit_tasks[${index}][target_date]" value="${task.target_date || ''}" 
                                           class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                </div>
                            </div>
                        `;
                        container.insertAdjacentHTML('beforeend', taskHtml);
                        modalEditTaskCounter = index + 1;
                    });
                } else {
                    // Add empty task if no tasks exist
                    const taskHtml = `
                        <div class="task-item grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div class="sm:col-span-2 flex gap-2">
                                <input type="text" name="edit_tasks[0][title]" placeholder="Task title" 
                                       class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <button type="button" onclick="removeTask(this)" class="text-red-400 hover:text-red-600 transition">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                            <div>
                                <input type="date" name="edit_tasks[0][target_date]" 
                                       class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            </div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', taskHtml);
                    modalEditTaskCounter = 1;
                }
            } else {
                showNotification('Error loading plan data', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error loading plan data', 'error');
        });
    }

    // ==================== VIEW PLAN ====================
    window.viewPlan = function(planId) {
        const modal = document.getElementById('viewPlanModal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        document.getElementById('viewPlanTitle').textContent = 'Plan Details';
        
        const content = document.getElementById('viewPlanContent');
        if (!content) return;
        
        content.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-blue-500"></i> Loading...</div>';
        
        fetch(`/intercession/action-plans/${planId}/edit`, {
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                let tasksHtml = '';
                if (data.tasks && data.tasks.length > 0) {
                    data.tasks.forEach((task) => {
                        const statusClass = task.status === 'completed' ? 'bg-green-100 text-green-700' 
                            : task.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-gray-100 text-gray-500';
                        const statusIcon = task.status === 'completed' ? 'fa-check-circle' 
                            : task.status === 'in-progress' ? 'fa-spinner' 
                            : 'fa-clock';
                        
                        tasksHtml += `
                            <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition">
                                <div class="flex-1">
                                    <p class="font-medium text-sm text-gray-800">${escapeHtml(task.title)}</p>
                                    ${task.target_date ? `<p class="text-xs text-gray-400">Target: ${task.target_date}</p>` : ''}
                                    ${task.started_at ? `<p class="text-xs text-gray-400">Started: ${task.started_at}</p>` : ''}
                                    ${task.completed_at ? `<p class="text-xs text-gray-400">Completed: ${task.completed_at}</p>` : ''}
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="px-2 py-0.5 text-xs rounded-full ${statusClass}">
                                        <i class="fas ${statusIcon} mr-0.5"></i>
                                        ${task.status === 'completed' ? 'Done' : task.status === 'in-progress' ? 'In Progress' : 'Pending'}
                                    </span>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    tasksHtml = '<p class="text-gray-500 text-sm">No tasks added yet.</p>';
                }
                
                content.innerHTML = `
                    <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                        <h4 class="font-semibold text-gray-800">${escapeHtml(data.plan.title)}</h4>
                        ${data.plan.description ? `<p class="text-sm text-gray-600 mt-1">${escapeHtml(data.plan.description)}</p>` : ''}
                        <p class="text-xs text-gray-400 mt-2">Created: ${data.plan.created_at ? new Date(data.plan.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <h5 class="font-medium text-gray-700 mb-3">Tasks (${data.tasks ? data.tasks.length : 0})</h5>
                    <div class="space-y-2">${tasksHtml}</div>
                `;
            } else {
                content.innerHTML = `<p class="text-red-500">Error loading plan details</p>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            content.innerHTML = `<p class="text-red-500">Error loading plan details</p>`;
        });
    }

    // ==================== CLOSE MODAL ====================
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.style.setProperty('display', 'none', 'important');
            modal.style.removeProperty('visibility');
            modal.style.removeProperty('pointer-events');
            document.body.style.overflow = '';
        }
    }

    // ==================== CLOSE MODALS ON BACKGROUND CLICK ====================
    document.addEventListener('click', function(e) {
        const modals = ['createActionPlanModal', 'editActionPlanModal', 'viewPlanModal'];
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (e.target === modal && !modal.classList.contains('hidden')) {
                closeModal(id);
            }
        });
    });

    // ==================== CLOSE MODALS ON ESCAPE KEY ====================
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modals = ['createActionPlanModal', 'editActionPlanModal', 'viewPlanModal'];
            modals.forEach(id => {
                const modal = document.getElementById(id);
                if (modal && !modal.classList.contains('hidden')) {
                    closeModal(id);
                }
            });
        }
    });

    // ==================== CREATE FORM SUBMISSION ====================
    document.getElementById('create-action-plan-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const formData = new FormData(this);
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        }
        
        fetch(this.action, {
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
                closeModal('createActionPlanModal');
                this.reset();
                showNotification('Action plan created successfully!', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                showNotification('Error: ' + (data.message || 'Failed to create action plan'), 'error');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Create Action Plan';
                }
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error creating action plan', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Create Action Plan';
            }
        });
    });

    // ==================== EDIT FORM SUBMISSION ====================
document.getElementById('edit-action-plan-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const planId = document.getElementById('edit_plan_id').value;
    const submitBtn = this.querySelector('button[type="submit"]');
    const formData = new FormData(this);
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    }
    
    // Use PUT method with proper route
    fetch(`/intercession/action-plans/${planId}`, {
        method: 'PUT',
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
            closeModal('editActionPlanModal');
            showNotification('Action plan updated successfully!', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showNotification('Error: ' + (data.message || 'Failed to update action plan'), 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Plan';
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error updating action plan', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Plan';
        }
    });
});

    // ==================== TOAST NOTIFICATION ====================
    window.showNotification = function(message, type = 'info') {
    return window.appNotify(...arguments);
        const types = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-4 py-2.5 rounded-lg shadow-lg text-white z-50 ${types[type] || 'bg-gray-700'} flex items-center gap-3 animate-slide-in max-w-md`;
        notification.innerHTML = `
            <i class="fas ${icons[type] || 'fa-bell'}"></i>
            <span class="text-sm">${message}</span>
            <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white ml-2">
                <i class="fas fa-times"></i>
            </button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // ==================== ESCAPE HTML ====================
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== ADD STYLES IF NOT EXISTS ====================
    if (!document.getElementById('modal-styles')) {
        const modalStyles = document.createElement('style');
        modalStyles.id = 'modal-styles';
        modalStyles.textContent = `
            .modal {
                display: none;
            }
            .modal:not(.hidden) {
                display: block !important;
            }
            .animate-slide-in {
                animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(modalStyles);
    }
})();
</script>

