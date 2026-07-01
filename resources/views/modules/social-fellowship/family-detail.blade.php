@extends('layouts.app')

@section('title', $family->name)

@section('content')
<div class="max-w-6xl mx-auto space-y-6">
    
    <div class="flex justify-between items-center">
        <div>
            <a href="{{ route('social-fellowship.index') }}" class="text-blue-600 hover:text-blue-800 mb-4 inline-block">
                <i class="fas fa-arrow-left"></i> Back to Families
            </a>
            <h1 class="text-3xl font-bold text-gray-800">{{ $family->name }}</h1>
            @if($family->motto)
            <p class="text-gray-500 italic mt-1">"{{ $family->motto }}"</p>
            @endif
            @if($family->parent_name)
            <p class="text-sm text-gray-500 mt-1">
                <i class="fas fa-user-check mr-1"></i> Parent: {{ $family->parent_name }}
            </p>
            @endif
        </div>
        <div class="flex gap-2">
            <button onclick="addMember()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                <i class="fas fa-user-plus"></i> Add Member
            </button>
            <button onclick="openAddTaskModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm">
                <i class="fas fa-plus"></i> Add Task
            </button>
        </div>
    </div>
    
    <!-- Family Info Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 rounded-xl p-4 text-center">
            <i class="fas fa-users text-2xl text-blue-600 mb-2"></i>
            <p class="text-2xl font-bold text-blue-600">{{ count($members) }}</p>
            <p class="text-xs text-gray-600">Total Members</p>
        </div>
        <div class="bg-green-50 rounded-xl p-4 text-center">
            <i class="fas fa-tasks text-2xl text-green-600 mb-2"></i>
            <p class="text-2xl font-bold text-green-600">{{ $tasks->count() }}</p>
            <p class="text-xs text-gray-600">Total Tasks</p>
        </div>
        <div class="bg-purple-50 rounded-xl p-4 text-center">
            <i class="fas fa-clipboard-list text-2xl text-purple-600 mb-2"></i>
            <p class="text-2xl font-bold text-purple-600">{{ count($actionPlans) }}</p>
            <p class="text-xs text-gray-600">Action Plans</p>
        </div>
    </div>
    
    <!-- Members List -->
    <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Members</h2>
        <div class="space-y-3">
            @foreach($members as $member)
            <div class="flex justify-between items-center p-3 border rounded-lg">
                <div>
                    <p class="font-medium text-gray-800">{{ $member->name }}</p>
                    <p class="text-sm text-gray-500">{{ $member->email }}</p>
                </div>
                <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">{{ ucfirst($member->role) }}</span>
            </div>
            @endforeach
        </div>
    </div>
    
    <!-- Tasks List -->
    <div class="bg-white rounded-xl shadow-md p-6">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-gray-800">Tasks</h2>
            <button onclick="openAddTaskModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm">
                <i class="fas fa-plus"></i> Add Task
            </button>
        </div>
        
        @if($tasks->count() > 0)
        <div class="space-y-3">
            @foreach($tasks as $task)
            @php
                $subtasks = $task->subtasks ?? collect();
                $totalSubtasks = $subtasks->count();
                $completedSubtasks = $subtasks->where('is_completed', true)->count();
                $progress = $totalSubtasks > 0 ? round(($completedSubtasks / $totalSubtasks) * 100) : 0;
                $statusText = $progress === 100 ? 'Completed' : ($progress > 0 ? 'In Progress' : 'Pending');
                $statusClass = $progress === 100 ? 'bg-green-100 text-green-700' : ($progress > 0 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700');
            @endphp
            <div class="border rounded-lg p-4 hover:shadow-md transition">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 class="font-semibold text-gray-800">{{ $task->title }}</h4>
                            <span class="px-2 py-0.5 text-xs rounded-full {{ $statusClass }}">
                                {{ $statusText }}
                            </span>
                            @if($task->due_date)
                            <span class="text-xs text-gray-500">
                                <i class="fas fa-calendar mr-1"></i> Due: {{ \Carbon\Carbon::parse($task->due_date)->format('d M Y') }}
                            </span>
                            @endif
                        </div>
                        @if($task->description)
                        <p class="text-sm text-gray-600 mt-1">{{ $task->description }}</p>
                        @endif
                        
                        <!-- Subtasks -->
                        @if($subtasks->count() > 0)
                        <div class="mt-2 space-y-1">
                            @foreach($subtasks as $subtask)
                            <div class="flex items-center gap-2 text-sm">
                                <input type="checkbox" {{ $subtask->is_completed ? 'checked' : '' }} 
                                       onchange="toggleSubtask({{ $subtask->id }}, {{ $task->id }})"
                                       class="rounded border-gray-300 text-purple-600 focus:ring-purple-500">
                                <span class="{{ $subtask->is_completed ? 'line-through text-gray-400' : 'text-gray-700' }}">
                                    {{ $subtask->title }}
                                </span>
                            </div>
                            @endforeach
                        </div>
                        @endif
                        
                        <!-- Progress Bar -->
                        <div class="mt-3">
                            <div class="flex items-center gap-2">
                                <div class="w-full max-w-xs bg-gray-200 rounded-full h-2">
                                    <div class="bg-purple-600 h-2 rounded-full" style="width: {{ $progress }}%"></div>
                                </div>
                                <span class="text-xs text-gray-500">{{ $progress }}%</span>
                                <span class="text-xs text-gray-400 ml-1">{{ $completedSubtasks }}/{{ $totalSubtasks }} subtasks done</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button onclick="editTask({{ $task->id }})" class="text-gray-400 hover:text-purple-600 text-sm" title="Edit Task">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteTask({{ $task->id }})" class="text-gray-400 hover:text-red-600 text-sm" title="Delete Task">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            @endforeach
        </div>
        @else
        <div class="text-center py-8">
            <i class="fas fa-tasks text-3xl text-gray-300 mb-2"></i>
            <p class="text-gray-500">No tasks yet</p>
            <button onclick="openAddTaskModal()" class="mt-2 text-purple-600 hover:text-purple-700 text-sm">
                <i class="fas fa-plus"></i> Create a task
            </button>
        </div>
        @endif
    </div>
    
    <!-- Description -->
    @if($family->description)
    <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="text-xl font-bold text-gray-800 mb-2">About</h2>
        <p class="text-gray-600">{{ $family->description }}</p>
    </div>
    @endif
</div>

<!-- Add Task Modal -->
<div id="addTaskModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
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
            <input type="hidden" name="family_id" value="{{ $family->id }}">
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
                    <label class="block text-sm font-medium text-gray-700 mb-1">Subtasks *</label>
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
<div id="editTaskModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
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
            @method('PUT')
            <input type="hidden" id="editTaskId" name="task_id">
            <input type="hidden" name="family_id" value="{{ $family->id }}">
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

<script>
// ============================================
// SUBTASK FUNCTIONS
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
// TASK FUNCTIONS
// ============================================
function openAddTaskModal() {
    const modal = document.getElementById('addTaskModal');
    if (!modal) return;
    
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
    modal.classList.remove('hidden');
}

function editTask(taskId) {
    fetch(`/social-fellowship/tasks/${taskId}/edit`, {
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
            
            // Load subtasks
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
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error loading task for editing');
    });
}

function toggleSubtask(subtaskId, taskId) {
    fetch(`/social-fellowship/subtasks/${subtaskId}/toggle`, {
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
            location.reload();
        }
    })
    .catch(error => console.error('Error:', error));
}

async function deleteTask(taskId) {
    if (await appConfirm('Are you sure you want to delete this task and all its subtasks?')) {
        fetch(`/social-fellowship/tasks/${taskId}`, {
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
                location.reload();
            } else {
                appAlert('Error deleting task: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            appAlert('Error deleting task');
        });
    }
}

// ============================================
// FORM SUBMISSION
// ============================================
function submitTask(event) {
    event.preventDefault();
    
    const formData = new FormData(document.getElementById('addTaskForm'));
    
    fetch('{{ route("social-fellowship.tasks.store") }}', {
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
            showNotification('Task created successfully!', 'success');
            location.reload();
        } else {
            appAlert('Error: ' + (data.message || 'Failed to create task'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Network error: ' + error.message);
    });
}

function updateTask(event) {
    event.preventDefault();
    
    const taskId = document.getElementById('editTaskId').value;
    const formData = new FormData(document.getElementById('editTaskForm'));
    
    fetch(`/social-fellowship/tasks/${taskId}`, {
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
            location.reload();
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
// MEMBER FUNCTIONS
// ============================================
function addMember() {
    appAlert('Add member feature coming soon');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
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
</script>

<style>
.modal { display: none; }
.modal:not(.hidden) { display: block !important; }

.subtask-item input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
}

.task-item {
    transition: all 0.2s ease;
}
</style>
@endsection

