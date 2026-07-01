<div>
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
            <i class="fas fa-tasks text-purple-600"></i>
            Family Tasks
        </h2>
        <button onclick="openAddTaskModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
            <i class="fas fa-plus"></i> Add Task
        </button>
    </div>

    <!-- Task Filters -->
    <div class="flex flex-wrap gap-3 mb-4">
        <select id="taskFilterStatus" onchange="filterTasks()" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
        </select>
        <input type="text" id="searchTasks" placeholder="Search tasks..." 
               class="px-3 py-2 border border-gray-300 rounded-lg text-sm flex-1 min-w-[200px]"
               onkeyup="filterTasks()">
    </div>

    <!-- Tasks List -->
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200" id="tasksTable">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TASK</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SUBTASKS</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PROGRESS</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">STATUS</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DUE DATE</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ACTIONS</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200" id="tasksTableBody">
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">Loading tasks...</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<script>
// ============================================
// TASK FUNCTIONS
// ============================================
function loadTasks() {
    const status = document.getElementById('taskFilterStatus').value;
    const search = document.getElementById('searchTasks').value;
    
    fetch(`/parent/tasks?status=${status}&search=${encodeURIComponent(search)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateTasksTable(data.tasks);
        } else {
            console.error('Error loading tasks:', data.message);
            const tbody = document.getElementById('tasksTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">Error loading tasks: ${data.message}</td></tr>`;
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        const tbody = document.getElementById('tasksTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">Error loading tasks</td></tr>`;
        }
    });
}

function updateTasksTable(tasks) {
    const tbody = document.getElementById('tasksTableBody');
    
    if (!tasks || tasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No tasks found</td></tr>`;
        return;
    }
    
    tbody.innerHTML = tasks.map(task => {
        const subtasks = task.subtasks || [];
        const totalSubtasks = subtasks.length;
        const completedSubtasks = subtasks.filter(s => s.is_completed).length;
        const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
        
        const statusText = progress === 100 ? 'Completed' : (progress > 0 ? 'In Progress' : 'Pending');
        const statusClass = progress === 100 ? 'bg-green-100 text-green-700' : (progress > 0 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700');
        
        // Check if task is overdue (only if not completed)
        let isOverdue = false;
        if (task.due_date && statusText !== 'Completed') {
            const dueDate = new Date(task.due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            isOverdue = dueDate < today;
        }
        
        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-4 py-3">
                    <div>
                        <p class="font-medium text-gray-800">${escapeHtml(task.title)}</p>
                        ${task.description ? `<p class="text-xs text-gray-500 mt-1">${escapeHtml(task.description.substring(0, 100))}${task.description.length > 100 ? '...' : ''}</p>` : ''}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="space-y-1">
                        ${subtasks.map(sub => `
                            <div class="flex items-center gap-2 text-sm">
                                <input type="checkbox" ${sub.is_completed ? 'checked' : ''} 
                                       onchange="toggleSubtask(${sub.id}, ${task.id})"
                                       class="rounded border-gray-300 text-purple-600 focus:ring-purple-500">
                                <span class="${sub.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}">${escapeHtml(sub.title)}</span>
                            </div>
                        `).join('')}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div>
                        <div class="flex items-center gap-2">
                            <div class="w-24 bg-gray-200 rounded-full h-2">
                                <div class="bg-purple-600 h-2 rounded-full" style="width: ${progress}%"></div>
                            </div>
                            <span class="text-xs font-medium text-gray-600">${progress}%</span>
                        </div>
                        <span class="text-xs text-gray-400">${completedSubtasks}/${totalSubtasks} subtasks done</span>
                    </div>
                </td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs rounded-full ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="px-4 py-3 text-sm ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-500'}">
                    ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                    ${isOverdue ? ' <span class="text-red-500">(Overdue)</span>' : ''}
                </td>
                <td class="px-4 py-3">
                    <div class="flex gap-2">
                        <button onclick="viewTaskDetails(${task.id})" class="text-gray-600 hover:text-gray-900 text-sm" title="View">
                            <i class="fas fa-file-lines"></i>
                        </button>
                        <button onclick="editTask(${task.id})" class="text-blue-600 hover:text-blue-800 text-sm" title="Edit Task">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ============================================
// VIEW TASK DETAILS
// ============================================
function viewTaskDetails(taskId) {
    fetch(`/parent/tasks/${taskId}/edit`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const task = data.task;
            const subtasks = task.subtasks || [];
            const totalSubtasks = subtasks.length;
            const completedSubtasks = subtasks.filter(s => s.is_completed).length;
            const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
            
            const statusText = progress === 100 ? 'Completed' : (progress > 0 ? 'In Progress' : 'Pending');
            const statusClass = progress === 100 ? 'bg-green-100 text-green-700' : (progress > 0 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700');
            
            let subtasksHtml = '';
            if (subtasks.length > 0) {
                subtasksHtml = `
                    <div class="bg-gray-50 rounded-lg p-3">
                        <h4 class="font-semibold text-gray-700 text-xs mb-2">Subtasks (${completedSubtasks}/${totalSubtasks} done)</h4>
                        <div class="space-y-1.5">
                            ${subtasks.map(sub => `
                                <div class="flex items-center gap-2 text-sm">
                                    ${sub.is_completed ? 
                                        '<i class="fas fa-check-circle text-green-500 text-xs"></i>' : 
                                        '<i class="far fa-circle text-gray-300 text-xs"></i>'
                                    }
                                    <span class="${sub.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}">${escapeHtml(sub.title)}</span>
                                    ${sub.is_completed && sub.completed_at ? 
                                        `<span class="text-[10px] text-gray-400">(Completed: ${new Date(sub.completed_at).toLocaleString()})</span>` : 
                                        ''
                                    }
                                </div>
                            `).join('')}
                        </div>
                        <div class="mt-2">
                            <div class="flex items-center gap-2">
                                <div class="w-full bg-gray-200 rounded-full h-1.5">
                                    <div class="bg-purple-600 h-1.5 rounded-full" style="width: ${progress}%"></div>
                                </div>
                                <span class="text-xs font-medium text-gray-600">${progress}%</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                subtasksHtml = `
                    <div class="bg-gray-50 rounded-lg p-3 text-center text-gray-500">
                        <p class="text-sm">No subtasks defined for this task</p>
                    </div>
                `;
            }
            
            const viewModalHtml = `
                <div class="space-y-3">
                    <div class="bg-gray-50 rounded-lg p-3">
                        <h3 class="font-bold text-gray-800">${escapeHtml(task.title)}</h3>
                        ${task.description ? `<p class="text-sm text-gray-600 mt-1">${escapeHtml(task.description)}</p>` : ''}
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        ${task.due_date ? `
                            <div class="bg-gray-50 rounded-lg p-2.5">
                                <label class="text-[10px] text-gray-500 block">Due Date</label>
                                <p class="text-sm text-gray-700 font-medium">${new Date(task.due_date).toLocaleDateString()}</p>
                            </div>
                        ` : ''}
                        <div class="bg-gray-50 rounded-lg p-2.5">
                            <label class="text-[10px] text-gray-500 block">Status</label>
                            <span class="px-2 py-0.5 text-xs rounded-full ${statusClass}">${statusText}</span>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-2.5">
                            <label class="text-[10px] text-gray-500 block">Progress</label>
                            <span class="text-sm font-medium text-gray-700">${progress}%</span>
                        </div>
                    </div>
                    
                    ${subtasksHtml}
                    
                    <div class="text-[10px] text-gray-400">
                        Created: ${new Date(task.created_at).toLocaleString()}
                    </div>
                </div>
            `;
            
            const modal = document.getElementById('viewTaskModal');
            const content = document.getElementById('viewTaskContent');
            const title = document.getElementById('viewTaskTitle');
            
            if (title) title.textContent = task.title;
            if (content) content.innerHTML = viewModalHtml;
            if (modal) modal.classList.remove('hidden');
        } else {
            appAlert('Error loading task details: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error loading task details');
    });
}

// ============================================
// EDIT TASK - Load existing subtasks
// ============================================
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
            
            const subtasks = task.subtasks || [];
            
            if (subtasks.length > 0) {
                subtasks.forEach(sub => {
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
        } else {
            appAlert('Error loading task for editing: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error loading task for editing');
    });
}

// ============================================
// UPDATE TASK - Fixed to use POST with _method PUT
// ============================================
function updateTask(event) {
    event.preventDefault();
    
    const taskId = document.getElementById('editTaskId').value;
    const formData = new FormData(document.getElementById('editTaskForm'));
    
    // Add _method field for PUT
    formData.append('_method', 'PUT');
    
    fetch(`/parent/tasks/${taskId}`, {
        method: 'POST',  // Always use POST with _method field for Laravel
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
            loadTasks();
        } else {
            appAlert('Error: ' + (data.message || 'Failed to update task'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Network error: ' + error.message);
    });
}

// ============================================
// SUBMIT TASK - Fixed for create
// ============================================
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
            loadTasks();
        } else {
            appAlert('Error: ' + (data.message || 'Failed to create task'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Network error: ' + error.message);
    });
}

function filterTasks() {
    loadTasks();
}

// ============================================
// SUBTASK TOGGLE
// ============================================
function toggleSubtask(subtaskId, taskId) {
    fetch(`/parent/subtasks/${subtaskId}/toggle`, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadTasks();
        }
    })
    .catch(error => console.error('Error:', error));
}

// ============================================
// SUBTASK FUNCTIONS FOR MODALS
// ============================================
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
// OPEN ADD TASK MODAL
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

// ============================================
// UTILITY FUNCTIONS
// ============================================
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize tasks if tab is active
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('panel-tasks') && !document.getElementById('panel-tasks').classList.contains('hidden')) {
        loadTasks();
    }
});
</script>


