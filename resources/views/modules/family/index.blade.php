@extends('layouts.app')

@section('title', $userFamily->name ?? 'My Family')
@section('page-title', $userFamily->name ?? 'My Family')

@section('content')
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

    @if($userFamily)
    <!-- Compact Family Header -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-4 sm:mb-6">
        <div class="px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <i class="fas fa-home text-white text-lg"></i>
                </div>
                <div>
                    <h1 class="text-lg sm:text-xl font-bold text-gray-800">{{ $userFamily->name }}</h1>
                    <div class="flex items-center gap-2 text-xs text-gray-500">
                        <span><i class="fas fa-users mr-1"></i> {{ $familyMembers->count() }} members</span>
                        @if(isset($userFamily->parent_name) && $userFamily->parent_name)
                        <span>â€¢</span>
                        <span><i class="fas fa-user-check mr-1"></i> {{ $userFamily->parent_name }}</span>
                        @endif
                    </div>
                </div>
            </div>
            <!-- Export Button -->
            @if(auth()->check() && auth()->user()->canAccess('family', 'export'))
            <button onclick="exportMembersToCSV()" class="bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-1.5 border border-gray-200 self-start sm:self-center">
                <i class="fas fa-download text-xs"></i> Export
            </button>
            @endif
        </div>
    </div>

    <!-- Mobile: Toggle between Members and Tasks -->
    <div class="sm:hidden mb-4">
        <div class="bg-gray-100 rounded-lg p-1 flex gap-1">
            <button id="showMembersBtn" class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all bg-white text-blue-600 shadow-sm">
                <i class="fas fa-users mr-1"></i> Members ({{ $familyMembers->count() }})
            </button>
            <button id="showTasksBtn" class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all text-gray-600">
                <i class="fas fa-tasks mr-1"></i> Tasks ({{ ($taskStats['completed'] ?? 0) + ($taskStats['in_progress'] ?? 0) + ($taskStats['pending'] ?? 0) }})
            </button>
        </div>
    </div>

    <!-- Two Column Layout - Desktop -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        <!-- LEFT: Members List -->
        <div id="membersPanel" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                <div class="flex justify-between items-center">
                    <h2 class="text-base font-semibold text-gray-800">
                        <i class="fas fa-users text-blue-500 mr-2"></i> Family Members
                        <span class="text-sm font-normal text-gray-500 ml-1">({{ $familyMembers->count() }})</span>
                    </h2>
                    
                </div>
            </div>
            
            <div class="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                @forelse($familyMembers as $member)
                @php
                $isParent = strtolower($member->role ?? '') === 'parent';
                $isChild = strtolower($member->role ?? '') === 'child';
                @endphp
                
                <div class="p-3 hover:bg-gray-50 transition" id="member-{{ $member->id }}">
                    <div class="flex items-start gap-3">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm
                                {{ $isParent ? 'bg-purple-500' : ($isChild ? 'bg-green-500' : 'bg-blue-500') }}">
                                {{ strtoupper(substr($member->name, 0, 2)) }}
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-medium text-gray-900 text-sm">{{ $member->name }}</span>
                                @if($isParent)
                                <span class="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">Parent</span>
                                @elseif($isChild)
                                <span class="text-xs px-1.5 py-0.5 bg-green-100 text-green-600 rounded">Child</span>
                                @endif
                            </div>
                            <div class="mt-1 space-y-0.5">
                                @if($member->phone)
                                <div class="flex items-center gap-1.5 text-xs text-gray-500">
                                    <i class="fas fa-phone text-gray-400 text-xs w-3"></i>
                                    <span>{{ $member->phone }}</span>
                                </div>
                                @endif
                                @if($member->email)
                                <div class="flex items-center gap-1.5 text-xs text-gray-500">
                                    <i class="fas fa-envelope text-gray-400 text-xs w-3"></i>
                                    <span class="truncate">{{ $member->email }}</span>
                                </div>
                                @endif
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            @if(auth()->check() && auth()->user()->canAccess('family', 'edit'))
                            <!-- You can add edit button here -->
                            @endif
                        </div>
                    </div>
                </div>
                @empty
                <div class="p-8 text-center text-gray-400 text-sm">
                    <i class="fas fa-users text-3xl mb-2 block"></i>
                    No members found
                </div>
                @endforelse
            </div>
        </div>

        <!-- RIGHT: Tasks List -->
        <div id="tasksPanel" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <h2 class="text-base font-semibold text-gray-800">
                            <i class="fas fa-tasks text-green-500 mr-2"></i> Tasks
                        </h2>
                        <div class="flex gap-1.5">
                            <span class="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded-full">
                                âœ“ {{ $taskStats['completed'] ?? 0 }}
                            </span>
                            <span class="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-600 rounded-full">
                                â³ {{ ($taskStats['in_progress'] ?? 0) + ($taskStats['pending'] ?? 0) }}
                            </span>
                        </div>
                    </div>
                   
                </div>
            </div>

            <!-- Task Filters -->
            <div class="px-4 pt-2 pb-1 border-b border-gray-100 bg-white">
                <div class="flex gap-1.5 overflow-x-auto">
                    <button class="task-filter active px-2.5 py-1 text-xs rounded-md bg-blue-600 text-white whitespace-nowrap" data-filter="all">
                        All
                    </button>
                    <button class="task-filter px-2.5 py-1 text-xs rounded-md bg-gray-100 text-gray-600 whitespace-nowrap" data-filter="pending">
                        Pending
                    </button>
                    <button class="task-filter px-2.5 py-1 text-xs rounded-md bg-gray-100 text-gray-600 whitespace-nowrap" data-filter="in-progress">
                        In Progress
                    </button>
                    <button class="task-filter px-2.5 py-1 text-xs rounded-md bg-gray-100 text-gray-600 whitespace-nowrap" data-filter="completed">
                        Completed
                    </button>
                </div>
            </div>

            <!-- Tasks List -->
            <div class="divide-y divide-gray-100 max-h-[500px] overflow-y-auto" id="tasksList">
                @forelse($familyTasks as $task)
                @php($isTaskCompleted = $task->status === 'completed')
                <div class="task-item p-3 transition {{ $isTaskCompleted ? 'bg-green-50/60' : 'hover:bg-gray-50' }}" data-status="{{ $task->status }}" id="task-{{ $task->id }}">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 flex-wrap mb-1">
                                <span class="font-medium text-sm {{ $isTaskCompleted ? 'text-gray-500 line-through' : 'text-gray-800' }}">{{ $task->title }}</span>
                                <span class="text-xs px-1.5 py-0.5 rounded-full font-medium
                                    {{ $task->status == 'completed' ? 'bg-green-100 text-green-600' : 
                                       ($task->status == 'in-progress' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500') }}">
                                    @if($task->status == 'in-progress')
                                        <i class="fas fa-spinner fa-pulse text-xs mr-0.5"></i> 
                                    @elseif($task->status == 'completed')
                                        <i class="fas fa-check-circle text-xs mr-0.5"></i> 
                                    @else
                                        <i class="fas fa-clock text-xs mr-0.5"></i> 
                                    @endif
                                    {{ $task->status == 'completed' ? 'Done' : ($task->status == 'in-progress' ? 'In Progress' : 'Pending') }}
                                </span>
                            </div>
                            
                            @if(isset($task->description) && $task->description)
                            <p class="text-xs text-gray-500 mt-1">{{ Str::limit($task->description, 100) }}</p>
                            @endif
                            
                            @if(isset($task->due_date) && $task->due_date)
                            <div class="flex items-center gap-1 mt-1 text-xs {{ \Carbon\Carbon::parse($task->due_date)->isPast() && $task->status != 'completed' ? 'text-red-500' : 'text-gray-400' }}">
                                <i class="fas fa-calendar-alt text-xs"></i>
                                <span>{{ \Carbon\Carbon::parse($task->due_date)->format('d M Y') }}</span>
                            </div>
                            @endif
                        </div>
                        
                        <!-- Task action buttons -->
                        @if(auth()->check() && auth()->user()->canAccess('family', 'edit'))
                        <div class="flex items-center gap-1.5">
                            @if($task->status != 'completed')
                            <button onclick="updateTaskStatus({{ $task->id }}, 'completed', this)" 
                                    class="px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-600 rounded transition" title="Mark Complete">
                                <i class="fas fa-check"></i>
                            </button>
                            @endif
                            @if($task->status == 'pending')
                            <button onclick="updateTaskStatus({{ $task->id }}, 'in-progress', this)" 
                                    class="px-2 py-1 text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded transition" title="Start Progress">
                                <i class="fas fa-play"></i>
                            </button>
                            @endif
                           
                        </div>
                        @endif
                    </div>
                </div>
                @empty
                <div class="p-8 text-center text-gray-400 text-sm">
                    <i class="fas fa-check-circle text-3xl mb-2 block"></i>
                    No tasks assigned
                </div>
                @endforelse
            </div>
        </div>
    </div>

    @else
    <!-- Empty State -->
    <div class="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="fas fa-home text-gray-400 text-2xl"></i>
        </div>
        <h2 class="text-lg font-semibold text-gray-800 mb-1">No Family Assigned</h2>
        <p class="text-gray-500 text-sm mb-4">You are not yet assigned to any family.</p>
    </div>
    @endif

</div>

<script>
    // Mobile toggle between members and tasks
    const membersPanel = document.getElementById('membersPanel');
    const tasksPanel = document.getElementById('tasksPanel');
    const showMembersBtn = document.getElementById('showMembersBtn');
    const showTasksBtn = document.getElementById('showTasksBtn');
    
    function showMembers() {
        if (membersPanel) membersPanel.style.display = 'block';
        if (tasksPanel) tasksPanel.style.display = 'none';
        if (showMembersBtn) {
            showMembersBtn.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
            showMembersBtn.classList.remove('text-gray-600');
        }
        if (showTasksBtn) {
            showTasksBtn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
            showTasksBtn.classList.add('text-gray-600');
        }
    }
    
    function showTasks() {
        if (membersPanel) membersPanel.style.display = 'none';
        if (tasksPanel) tasksPanel.style.display = 'block';
        if (showTasksBtn) {
            showTasksBtn.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
            showTasksBtn.classList.remove('text-gray-600');
        }
        if (showMembersBtn) {
            showMembersBtn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
            showMembersBtn.classList.add('text-gray-600');
        }
    }
    
    if (window.innerWidth < 768) {
        showMembers();
        if (showMembersBtn) showMembersBtn.addEventListener('click', showMembers);
        if (showTasksBtn) showTasksBtn.addEventListener('click', showTasks);
    } else {
        if (membersPanel) membersPanel.style.display = 'block';
        if (tasksPanel) tasksPanel.style.display = 'block';
    }
    
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768) {
            if (membersPanel) membersPanel.style.display = 'block';
            if (tasksPanel) tasksPanel.style.display = 'block';
        } else {
            if (membersPanel.style.display !== 'none' && tasksPanel.style.display !== 'none') {
                showMembers();
            }
        }
    });

    

    function showNotification(type, message) {
    return window.appNotify(...arguments);
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in`;
        notification.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-white"></i>
            <span class="text-white text-sm">${message}</span>
            <button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200"><i class="fas fa-times"></i></button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

   
    function exportMembersToCSV() {
        var members = @json($familyMembers);
        var csv = [];
        csv.push(['Name', 'Role', 'Phone', 'Email'].join(','));
        
        members.forEach(function(member) {
            var row = [];
            row.push('"' + (member.name || '').replace(/"/g, '""') + '"');
            row.push('"' + (member.role || 'Member').replace(/"/g, '""') + '"');
            row.push('"' + (member.phone || '').replace(/"/g, '""') + '"');
            row.push('"' + (member.email || '').replace(/"/g, '""') + '"');
            csv.push(row.join(','));
        });
        
        var blob = new Blob(["\uFEFF" + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        var url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'family_members_{{ $userFamily->name ?? 'family' }}.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showNotification('success', 'Export completed!');
    }
 

    @if(auth()->check() && auth()->user()->canAccess('family', 'create'))
    function openAddMemberModal() {
        document.getElementById('addMemberModal').classList.remove('hidden');
    }
    @endif


    @if(auth()->check() && auth()->user()->canAccess('family', 'edit'))
    function updateTaskStatus(taskId, status, button) {
        if (button) button.disabled = true;

        fetch(`/family/task/${taskId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify({ status: status })
        })
        .then(async response => {
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update task');
            }

            showNotification('success', data.message || 'Task status updated.');
            window.setTimeout(() => window.location.reload(), 500);
        })
        .catch(error => {
            showNotification('error', error.message || 'Failed to update task');
            if (button) button.disabled = false;
        });
    }

    function editMember(memberId) {
        fetch(`/my-family/member/${memberId}/json`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('editMemberId').value = data.id;
                document.getElementById('editMemberName').value = data.name;
                document.getElementById('editMemberRole').value = data.role || 'member';
                document.getElementById('editMemberPhone').value = data.phone || '';
                document.getElementById('editMemberEmail').value = data.email || '';
                document.getElementById('editMemberModal').classList.remove('hidden');
            });
    }

    function submitEditMember(event) {
        event.preventDefault();
        const memberId = document.getElementById('editMemberId').value;
        const formData = new FormData();
        formData.append('name', document.getElementById('editMemberName').value);
        formData.append('role', document.getElementById('editMemberRole').value);
        formData.append('phone', document.getElementById('editMemberPhone').value);
        formData.append('email', document.getElementById('editMemberEmail').value);
        formData.append('_method', 'PUT');
        formData.append('_token', document.querySelector('meta[name="csrf-token"]').content);

        fetch(`/my-family/member/${memberId}`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeModal('editMemberModal');
                showNotification('success', 'Member updated successfully!');
                setTimeout(() => location.reload(), 1500);
            } else {
                showNotification('error', data.message || 'Failed to update member');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('error', 'Network error');
        });
    }
    @endif

    @if(auth()->check() && auth()->user()->canAccess('family', 'delete'))
    async function deleteMember(memberId, memberName) {
        if (await appConfirm(`Are you sure you want to delete "${memberName}" from the family?`)) {
            fetch(`/my-family/member/${memberId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'Accept': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('success', 'Member deleted successfully!');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showNotification('error', data.message || 'Failed to delete member');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('error', 'Network error');
            });
        }
    }
    @endif

    // Task filter functionality
    document.addEventListener('DOMContentLoaded', function() {
        var filterBtns = document.querySelectorAll('.task-filter');
        if (filterBtns.length > 0) {
            filterBtns.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var filterValue = this.getAttribute('data-filter');
                    var tasks = document.querySelectorAll('.task-item');
                    
                    filterBtns.forEach(function(b) {
                        b.classList.remove('bg-blue-600', 'text-white');
                        b.classList.add('bg-gray-100', 'text-gray-600');
                    });
                    this.classList.remove('bg-gray-100', 'text-gray-600');
                    this.classList.add('bg-blue-600', 'text-white');
                    
                    tasks.forEach(function(task) {
                        var taskStatus = task.getAttribute('data-status');
                        if (filterValue === 'all' || taskStatus === filterValue) {
                            task.style.display = '';
                        } else {
                            task.style.display = 'none';
                        }
                    });
                });
            });
        }
    });
</script>

<style>
    .modal { display: none; }
    .modal:not(.hidden) { display: block !important; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .animate-slide-in { animation: slideIn 0.3s ease-out; }
</style>
@endsection

