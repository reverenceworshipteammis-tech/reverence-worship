<div class="bg-white rounded-xl shadow-md p-6">
    
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2 class="text-xl font-bold text-gray-800">Family Tasks</h2>
            <p class="text-gray-500 text-sm mt-1">Manage tasks with subtasks and track progress</p>
        </div>
        <button onclick="openTaskModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition">
            <i class="fas fa-plus text-xs"></i> New Task
        </button>
    </div>
    
    <!-- Filter Bar -->
    <div class="mb-6 flex flex-wrap gap-3 items-end">
        <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <select id="filterDueDate" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500">
                <option value="all">All Tasks</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">This Week</option>
                <option value="overdue">Overdue</option>
            </select>
        </div>
        <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select id="filterStatus" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
            </select>
        </div>
        <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Family</label>
            <select id="filterFamily" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500">
                <option value="all">All Families</option>
                @foreach($families ?? [] as $family)
                    <option value="{{ $family->id }}">{{ $family->name }}</option>
                @endforeach
            </select>
        </div>
        <button onclick="applyFilters()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm transition">
            <i class="fas fa-filter mr-1"></i> Filter
        </button>
        <button onclick="resetFilters()" class="text-gray-500 hover:text-gray-700 text-sm px-2">
        
        </button>
    </div>
    
    <!-- Tasks List -->
    <div id="tasksList" class="space-y-3">
        @forelse($tasks ?? [] as $task)
        @php
            $subtasks = $task->subtasks ?? collect();
            $totalSubtasks = $subtasks->count();
            $completedSubtasks = $subtasks->where('is_completed', true)->count();
            $progress = $totalSubtasks > 0 ? round(($completedSubtasks / $totalSubtasks) * 100) : 0;
            $statusText = $progress === 100 ? 'Completed' : ($progress > 0 ? 'In Progress' : 'Pending');
            $statusClass = $progress === 100 ? 'bg-green-100 text-green-700' : ($progress > 0 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700');
            $isCompleted = $statusText === 'Completed';
        @endphp
        <div class="task-item border rounded-lg p-4 hover:shadow-md transition" 
             data-task-id="{{ $task->id }}"
             data-family-id="{{ $task->family_id }}"
             data-status="{{ $task->status }}"
             data-due-date="{{ $task->due_date }}">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 class="font-semibold text-gray-800">{{ $task->title }}</h4>
                        <span class="px-2 py-0.5 text-xs rounded-full {{ $statusClass }}">
                            {{ $statusText }}
                        </span>
                        @if($task->due_date && !$isCompleted)
                            @php
                                $dueDate = \Carbon\Carbon::parse($task->due_date);
                                $isOverdue = $dueDate->isPast();
                            @endphp
                            <span class="flex items-center gap-1 text-xs {{ $isOverdue ? 'text-black-500 font-medium' : 'text-gray-500' }}">
                                <i class="fas fa-calendar"></i> 
                                Due: {{ $dueDate->format('d M Y') }}
                                @if($isOverdue)
                                    <span class="text-black-500">(Overdue)</span>
                                @endif
                            </span>
                        @elseif($task->due_date && $isCompleted)
                            <span class="flex items-center gap-1 text-xs text-gray-400">
                                <i class="fas fa-calendar-check"></i> 
                                Completed: {{ \Carbon\Carbon::parse($task->due_date)->format('d M Y') }}
                            </span>
                        @endif
                    </div>
                    
                    @if($task->description)
                    <p class="text-sm text-gray-600 mt-1">{{ $task->description }}</p>
                    @endif
                    
                    <!-- Subtasks - Read only view -->
                    @if($subtasks->count() > 0)
                    <div class="mt-2 space-y-1">
                        @foreach($subtasks as $subtask)
                        <div class="flex items-center gap-2 text-sm">
                            @if($subtask->is_completed)
                                <i class="fas fa-check-circle text-green-500 text-xs"></i>
                            @else
                                <i class="far fa-circle text-gray-300 text-xs"></i>
                            @endif
                            <span class="{{ $subtask->is_completed ? 'line-through text-gray-400' : 'text-gray-700' }}">
                                {{ $subtask->title }}
                            </span>
                            @if($subtask->is_completed && $subtask->completed_at)
                                <span class="text-[10px] text-gray-400 ml-1">
                                    ({{ \Carbon\Carbon::parse($subtask->completed_at)->format('d M Y H:i') }})
                                </span>
                            @endif
                        </div>
                        @endforeach
                    </div>
                    @endif
                    
                    <!-- Progress Bar -->
                    <div class="mt-3">
                        <div class="flex items-center gap-2">
                            <div class="w-full max-w-xs bg-gray-200 rounded-full h-2">
                                <div class="bg-green-600 h-2 rounded-full" style="width: {{ $progress }}%"></div>
                            </div>
                            <span class="text-xs text-gray-500">{{ $progress }}%</span>
                            @if($totalSubtasks > 0)
                            <span class="text-xs text-gray-400">{{ $completedSubtasks }}/{{ $totalSubtasks }} subtasks done</span>
                            @endif
                        </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        <span><i class="fas fa-users"></i> {{ $task->family_name ?? 'No Family' }}</span>
                    </div>
                </div>
                <div class="flex gap-2 ml-4">
                    <button onclick="viewTask({{ $task->id }})" class="text-gray-600 hover:text-gray-900" title="View">
                        <i class="fas fa-file-lines"></i>
                    </button>
                    <button onclick="editTask({{ $task->id }})" class="text-gray-400 hover:text-purple-600" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteTask({{ $task->id }})" class="text-gray-400 hover:text-red-600" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
        @empty
        <div id="noTasksMessage" class="text-center py-12">
            <i class="fas fa-tasks text-5xl text-gray-300 mb-3"></i>
            <p class="text-gray-500">No tasks yet</p>
            <button onclick="openTaskModal()" class="mt-3 text-purple-600 hover:text-purple-700 text-sm">
                <i class="fas fa-plus"></i> Create your first task
            </button>
        </div>
        @endforelse
    </div>
</div>

<!-- Task Modal (Create) -->
<div id="taskModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-xl bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="taskModalTitle" class="text-base font-bold text-gray-800">
                <i class="fas fa-plus-circle text-blue-600"></i> New Task
            </h3>
            <button onclick="closeModal('taskModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-lg"></i>
            </button>
        </div>
        
        <form id="taskForm" method="POST">
            @csrf
            <input type="hidden" id="task_id" name="task_id">
            <input type="hidden" id="form_method" name="_method" value="POST">
            
            <div class="mt-4 space-y-3">
                <!-- Task Name -->
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                        Task Name <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="task_title" name="title" required 
                           class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                           placeholder="Enter task name">
                </div>
                
                <!-- Description -->
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea id="task_description" name="description" rows="2" 
                              class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 resize-none"
                              placeholder="Enter task description"></textarea>
                </div>
                
                <!-- Family -->
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                        Family <span class="text-red-500">*</span>
                    </label>
                    <select id="task_family_id" name="family_id" required 
                            class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 bg-white">
                        <option value="">Select a family...</option>
                        @foreach($families ?? [] as $family)
                            <option value="{{ $family->id }}">{{ $family->name }}</option>
                        @endforeach
                    </select>
                </div>
                
                <!-- Due Date -->
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                        Due Date
                    </label>
                    <input type="date" id="task_due_date" name="due_date" 
                           class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500">
                </div>
                
                <!-- Subtasks -->
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                        Subtasks <span class="text-red-500">*</span>
                    </label>
                    <div id="subtasksContainer">
                        <div class="subtask-item flex gap-2 mb-1.5">
                            <input type="text" name="subtasks[]" placeholder="Enter subtask..." 
                                   class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                            <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700 text-sm">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" onclick="addSubtaskField()" class="text-xs text-black-600 hover:text-black-700 mt-0.5">
                        <i class="fas fa-plus"></i> Add Another Subtask
                    </button>
                </div>
            </div>
            
            <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
                <button type="button" onclick="closeModal('taskModal')" 
                        class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                    Cancel
                </button>
                <button type="submit" 
                        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">
                    Create Task
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Edit Task Modal -->
<div id="editTaskModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-xl bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-base font-bold text-gray-800">
                <i class="fas fa-edit text-purple-600"></i> Edit Task
            </h3>
            <button onclick="closeModal('editTaskModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-lg"></i>
            </button>
        </div>
        
        <form id="editTaskForm" onsubmit="updateTask(event)">
            @csrf
            @method('PUT')
            <input type="hidden" id="editTaskId" name="task_id">
            
            <div class="mt-4 space-y-3">
                <!-- Task Name -->
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                        Task Name <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="editTaskTitle" name="title" required 
                           class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500">
                </div>
                
                <!-- Description -->
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea id="editTaskDescription" name="description" rows="2" 
                              class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 resize-none"></textarea>
                </div>
                
                <!-- Family -->
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                        Family <span class="text-red-500">*</span>
                    </label>
                    <select id="editTaskFamilyId" name="family_id" required 
                            class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 bg-white">
                        @foreach($families ?? [] as $family)
                            <option value="{{ $family->id }}">{{ $family->name }}</option>
                        @endforeach
                    </select>
                </div>
                
                <!-- Due Date -->
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                        Due Date
                    </label>
                    <input type="date" id="editTaskDueDate" name="due_date" 
                           class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500">
                </div>
                
                <!-- Subtasks -->
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">
                        Subtasks
                    </label>
                    <div id="editSubtasksContainer">
                        <!-- Subtasks will be loaded here -->
                    </div>
                    <button type="button" onclick="addEditSubtaskField()" class="text-xs text-black-600 hover:text-black-700 mt-0.5">
                        <i class="fas fa-plus"></i> Add Another Subtask
                    </button>
                </div>
            </div>
            
            <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
                <button type="button" onclick="closeModal('editTaskModal')" 
                        class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">
                    Cancel
                </button>
                <button type="submit" 
                        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">
                    Update Task
                </button>
            </div>
        </form>
    </div>
</div>

<!-- View Task Modal -->
<div id="viewTaskModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-xl bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="viewTaskTitle" class="text-base font-bold text-gray-800">Task Details</h3>
            <button onclick="closeModal('viewTaskModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-lg"></i>
            </button>
        </div>
        <div id="viewTaskContent" class="mt-4 space-y-3 max-h-[400px] overflow-y-auto"></div>
        <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
            <button onclick="closeModal('viewTaskModal')" class="px-3 py-1.5 border rounded-lg text-sm">Close</button>
        </div>
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
    div.className = 'subtask-item flex gap-2 mb-1.5';
    div.innerHTML = `
        <input type="text" name="subtasks[]" placeholder="Enter subtask..." 
               class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
        <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700 text-sm">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(div);
}

function addEditSubtaskField() {
    const container = document.getElementById('editSubtasksContainer');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'subtask-item flex gap-2 mb-1.5';
    div.innerHTML = `
        <input type="text" name="subtasks[]" placeholder="Enter subtask..." 
               class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
        <input type="hidden" name="subtask_ids[]" value="new">
        <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700 text-sm">
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
let currentFilter = {
    dueDate: 'all',
    family: 'all',
    status: 'all'
};

// Apply filters
function applyFilters() {
    currentFilter.dueDate = document.getElementById('filterDueDate')?.value || 'all';
    currentFilter.family = document.getElementById('filterFamily')?.value || 'all';
    currentFilter.status = document.getElementById('filterStatus')?.value || 'all';
    
    const tasks = document.querySelectorAll('.task-item');
    let visibleCount = 0;
    
    tasks.forEach(task => {
        let show = true;
        const familyId = task.dataset.familyId;
        const status = task.dataset.status;
        const dueDate = task.dataset.dueDate;
        
        // Filter by family
        if (currentFilter.family !== 'all' && familyId != currentFilter.family) {
            show = false;
        }
        
        // Filter by status
        if (currentFilter.status !== 'all' && status !== currentFilter.status) {
            show = false;
        }
        
        // Filter by due date
        if (currentFilter.dueDate !== 'all' && dueDate) {
            const taskDueDate = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const weekEnd = new Date(today);
            weekEnd.setDate(weekEnd.getDate() + 7);
            
            switch(currentFilter.dueDate) {
                case 'today':
                    if (taskDueDate.toDateString() !== today.toDateString()) show = false;
                    break;
                case 'tomorrow':
                    if (taskDueDate.toDateString() !== tomorrow.toDateString()) show = false;
                    break;
                case 'week':
                    if (taskDueDate < today || taskDueDate > weekEnd) show = false;
                    break;
                case 'overdue':
                    if (status === 'completed' || taskDueDate >= today) show = false;
                    break;
            }
        }
        
        if (show) {
            task.style.display = '';
            visibleCount++;
        } else {
            task.style.display = 'none';
        }
    });
    
    const noResultsMsg = document.getElementById('noResultsMsg');
    if (visibleCount === 0) {
        if (!noResultsMsg) {
            const msg = document.createElement('div');
            msg.id = 'noResultsMsg';
            msg.className = 'text-center py-12 text-gray-500';
            msg.innerHTML = '<i class="fas fa-search fa-3x mb-3 text-gray-300"></i><p>No tasks match your filters</p>';
            document.getElementById('tasksList')?.appendChild(msg);
        }
    } else if (noResultsMsg) {
        noResultsMsg.remove();
    }
}

// Reset filters
function resetFilters() {
    const dueDateFilter = document.getElementById('filterDueDate');
    const familyFilter = document.getElementById('filterFamily');
    const statusFilter = document.getElementById('filterStatus');
    
    if (dueDateFilter) dueDateFilter.value = 'all';
    if (familyFilter) familyFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';
    applyFilters();
}

// Open create task modal
function openTaskModal() {
    const modal = document.getElementById('taskModal');
    if (!modal) return;
    
    document.getElementById('taskForm').reset();
    document.getElementById('task_id').value = '';
    document.getElementById('form_method').value = 'POST';
    
    const container = document.getElementById('subtasksContainer');
    if (container) {
        container.innerHTML = `
            <div class="subtask-item flex gap-2 mb-1.5">
                <input type="text" name="subtasks[]" placeholder="Enter subtask..." 
                       class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700 text-sm">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }
    
    modal.classList.remove('hidden');
}

// View task details
function viewTask(id) {
    fetch(`/social-fellowship/tasks/${id}`, {
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
            
            const viewTitle = document.getElementById('viewTaskTitle');
            const viewContent = document.getElementById('viewTaskContent');
            
            if (viewTitle) viewTitle.textContent = task.title;
            
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
                                        `<span class="text-[10px] text-gray-400 ml-1">(Completed: ${new Date(sub.completed_at).toLocaleString()})</span>` : 
                                        ''
                                    }
                                </div>
                            `).join('')}
                        </div>
                        <div class="mt-2">
                            <div class="flex items-center gap-2">
                                <div class="w-full bg-gray-200 rounded-full h-1.5">
                                    <div class="bg-green-600 h-1.5 rounded-full" style="width: ${progress}%"></div>
                                </div>
                                <span class="text-xs font-medium text-gray-600">${progress}%</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            const statusText = progress === 100 ? 'Completed' : (progress > 0 ? 'In Progress' : 'Pending');
            const statusClass = progress === 100 ? 'bg-green-100 text-green-700' : (progress > 0 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700');
            
            if (viewContent) {
                viewContent.innerHTML = `
                    <div class="space-y-3">
                        ${task.description ? `
                            <div class="bg-gray-50 rounded-lg p-3">
                                <label class="text-[10px] text-gray-500 block mb-0.5">Description</label>
                                <p class="text-sm text-gray-700">${escapeHtml(task.description)}</p>
                            </div>
                        ` : ''}
                        
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-gray-50 rounded-lg p-2.5">
                                <label class="text-[10px] text-gray-500 block">Family</label>
                                <p class="text-sm text-gray-700 font-medium">${escapeHtml(task.family_name || 'N/A')}</p>
                            </div>
                            ${task.due_date ? `
                            <div class="bg-gray-50 rounded-lg p-2.5">
                                <label class="text-[10px] text-gray-500 block">Due Date</label>
                                <p class="text-sm text-gray-700 font-medium">${new Date(task.due_date).toLocaleDateString()}</p>
                            </div>
                            ` : ''}
                            <div class="bg-gray-50 rounded-lg p-2.5">
                                <label class="text-[10px] text-gray-500 block">Status</label>
                                <span class="px-2 py-0.5 text-xs rounded-full ${statusClass}">
                                    ${statusText}
                                </span>
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
            }
            
            const viewModal = document.getElementById('viewTaskModal');
            if (viewModal) viewModal.classList.remove('hidden');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error loading task details');
    });
}

// Edit task
function editTask(id) {
    fetch(`/social-fellowship/tasks/${id}/edit`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const task = data.task;
            const modal = document.getElementById('editTaskModal');
            
            document.getElementById('editTaskId').value = task.id;
            document.getElementById('editTaskTitle').value = task.title;
            document.getElementById('editTaskDescription').value = task.description || '';
            document.getElementById('editTaskFamilyId').value = task.family_id || '';
            document.getElementById('editTaskDueDate').value = task.due_date || '';
            
            // Load subtasks
            const container = document.getElementById('editSubtasksContainer');
            container.innerHTML = '';
            if (task.subtasks && task.subtasks.length > 0) {
                task.subtasks.forEach(sub => {
                    const div = document.createElement('div');
                    div.className = 'subtask-item flex gap-2 mb-1.5';
                    div.innerHTML = `
                        <input type="text" name="subtasks[]" value="${escapeHtml(sub.title)}" 
                               class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                        <input type="hidden" name="subtask_ids[]" value="${sub.id}">
                        <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700 text-sm">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    container.appendChild(div);
                });
            } else {
                const div = document.createElement('div');
                div.className = 'subtask-item flex gap-2 mb-1.5';
                div.innerHTML = `
                    <input type="text" name="subtasks[]" placeholder="Enter subtask..." 
                           class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500">
                    <input type="hidden" name="subtask_ids[]" value="new">
                    <button type="button" onclick="removeSubtask(this)" class="text-red-500 hover:text-red-700 text-sm">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                container.appendChild(div);
            }
            
            if (modal) modal.classList.remove('hidden');
        }
    })
    .catch(error => console.error('Error:', error));
}

// Delete task
async function deleteTask(id) {
    if (await appConfirm('Are you sure you want to delete this task and all its subtasks?')) {
        fetch(`/social-fellowship/tasks/${id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Task deleted successfully!', 'success');
                setTimeout(() => location.reload(), 1000);
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

// Task form submission (Create)
document.getElementById('taskForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('task_id')?.value;
    const method = document.getElementById('form_method')?.value;
    
    let url = '{{ route("social-fellowship.tasks.store") }}';
    if (method === 'PUT' && taskId) {
        url = `/social-fellowship/tasks/${taskId}`;
    }
    
    const formData = new FormData(this);
    
    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('taskModal');
            showNotification('Task saved successfully!', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            appAlert('Error: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error saving task');
    });
});

// Edit Task Form Submission
document.getElementById('editTaskForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('editTaskId').value;
    const formData = new FormData(this);
    
    fetch(`/social-fellowship/tasks/${taskId}`, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
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
            setTimeout(() => location.reload(), 1000);
        } else {
            appAlert('Error: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error updating task');
    });
});

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

// Initialize event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const filterDueDate = document.getElementById('filterDueDate');
    const filterFamily = document.getElementById('filterFamily');
    const filterStatus = document.getElementById('filterStatus');
    
    if (filterDueDate) filterDueDate.addEventListener('change', applyFilters);
    if (filterFamily) filterFamily.addEventListener('change', applyFilters);
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
});
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


