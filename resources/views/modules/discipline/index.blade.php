@extends('layouts.app')

@section('title', 'Discipline Management')
@section('page-title', 'Discipline Management')

@section('content')
<div class="container mx-auto px-4 py-8">

    @php
        $canViewOverview = auth()->check() && auth()->user()->canAccess('discipline', 'view-overview');
        $canViewAttendance = auth()->check() && auth()->user()->canAccess('discipline', 'view-attendance');
        $canViewPermissions = auth()->check() && auth()->user()->canAccess('discipline', 'view-permissions');
        $canViewDisciplineRecords = auth()->check() && auth()->user()->canAccess('discipline', 'view-records');
        $canViewActionPlans = auth()->check() && auth()->user()->canAccess('discipline', 'view-action-plans');
        $canManage = auth()->check() && (auth()->user()->canAccess('discipline', 'manage') || auth()->user()->isSuperAdmin());
    @endphp

   
   
   
    
    <!-- Tabs Navigation - Only show tabs user has permission for -->
    @if($canViewOverview || $canViewAttendance || $canViewPermissions || $canViewDisciplineRecords || $canViewActionPlans)
    <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <div class="border-b border-gray-200">
            <nav class="flex flex-wrap -mb-px">
                @if($canViewOverview)
                <button class="tab-btn active px-6 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600" data-tab="overview">
                    <i class="fas fa-chart-line mr-2"></i> Overview
                </button>
                @endif
                
                @if($canViewAttendance)
                <button class="tab-btn px-6 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300" data-tab="attendance">
                    <i class="fas fa-calendar-alt mr-2"></i> Attendance
                </button>
                @endif
                
                @if($canViewPermissions)
                <button class="tab-btn px-6 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300" data-tab="permission">
                    <i class="fas fa-envelope-open-text mr-2"></i> Permission Requests
                </button>
                @endif
                
                @if($canViewDisciplineRecords)
                <button class="tab-btn px-6 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300" data-tab="discipline-records">
                    <i class="fas fa-book mr-2"></i> Discipline Records
                </button>
                @endif
                
                @if($canViewActionPlans)
                <button class="tab-btn px-6 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300" data-tab="action-plans">
                    <i class="fas fa-tasks mr-2"></i> Action Plans
                </button>
                @endif
            </nav>
        </div>
        
        <!-- Tab Content -->
        <div class="p-6">
            @if($canViewOverview)
            <div id="overview-tab" class="tab-content" style="display: block;">
                @include('modules.discipline.partials.overview-tab')
            </div>
            @endif
            
            @if($canViewAttendance)
            <div id="attendance-tab" class="tab-content" style="display: none;">
                @include('modules.discipline.partials.attendance-tab')
            </div>
            @endif
            
            @if($canViewPermissions)
            <div id="permission-tab" class="tab-content" style="display: none;">
                @include('modules.discipline.partials.permission-tab')
            </div>
            @endif
            
            @if($canViewDisciplineRecords)
            <div id="discipline-records-tab" class="tab-content" style="display: none;">
                @include('modules.discipline.partials.discipline-records-tab')
            </div>
            @endif
            
            @if($canViewActionPlans)
            <div id="action-plans-tab" class="tab-content" style="display: none;">
                @include('modules.discipline.partials.action-plans-tab')
            </div>
            @endif
            
        </div>
    </div>
    @endif

    <!-- No Permission Message -->
    @if(!$canViewOverview && !$canViewAttendance && !$canViewPermissions && !$canViewDisciplineRecords && !$canViewActionPlans)
    <div class="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-lock text-gray-400 text-3xl"></i>
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">No Access</h3>
        <p class="text-gray-500 text-sm">You don't have permission to view this page.</p>
        <p class="text-gray-400 text-xs mt-2">Contact your administrator to grant access.</p>
    </div>
    @endif
</div>

<!-- Include all modals -->
@include('modules.discipline.modals.discipline-modal')
@include('modules.discipline.modals.permission-modal')
@include('modules.discipline.modals.action-plan-modal')
@include('modules.discipline.modals.session-details-modal')
@include('modules.discipline.modals.discipline-dialog')

<script>
// Tab Management with localStorage persistence
const STORAGE_KEY = 'discipline_active_tab';

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing tabs...');
    
    // Get saved tab from localStorage
    const savedTab = localStorage.getItem(STORAGE_KEY);
    const validTabs = [];
    
    @if($canViewOverview) validTabs.push('overview'); @endif
    @if($canViewAttendance) validTabs.push('attendance'); @endif
    @if($canViewPermissions) validTabs.push('permission'); @endif
    @if($canViewDisciplineRecords) validTabs.push('discipline-records'); @endif
    @if($canViewActionPlans) validTabs.push('action-plans'); @endif
    
    const defaultTab = validTabs.length > 0 ? validTabs[0] : 'overview';
    const activeTab = savedTab && validTabs.includes(savedTab) ? savedTab : defaultTab;
    
    // Activate the saved or default tab
    activateTab(activeTab);
    
    // Set up tab click handlers
    setupTabClickHandlers();
});

function isValidTab(tabName) {
    const validTabs = ['overview', 'attendance', 'permission', 'discipline-records', 'action-plans'];
    return validTabs.includes(tabName);
}

function setupTabClickHandlers() {
    const tabs = document.querySelectorAll('.tab-btn');
    console.log('Found tabs:', tabs.length);
    
    tabs.forEach(tab => {
        tab.removeEventListener('click', handleTabClick);
        tab.addEventListener('click', handleTabClick);
    });
}

function handleTabClick(event) {
    const tab = event.currentTarget;
    const tabName = tab.getAttribute('data-tab');
    
    console.log('Tab clicked:', tabName);
    
    localStorage.setItem(STORAGE_KEY, tabName);
    activateTab(tabName);
}

function activateTab(tabName) {
    console.log('Activating tab:', tabName);
    
    // Update tab buttons styles
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        const tabBtnName = tab.getAttribute('data-tab');
        tab.classList.remove('text-blue-600', 'border-blue-600');
        tab.classList.add('text-gray-500', 'border-transparent');
        
        if (tabBtnName === tabName) {
            tab.classList.remove('text-gray-500', 'border-transparent');
            tab.classList.add('text-blue-600', 'border-blue-600');
        }
    });
    
    // Update tab content visibility
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabContents.forEach(content => {
        content.style.display = 'none';
    });
    
    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
        activeContent.style.display = 'block';
        
        // Load tab-specific data when tab is activated
        setTimeout(() => {
            loadTabData(tabName);
        }, 100);
    }
}

function loadTabData(tabName) {
    console.log('Loading data for tab:', tabName);
    
    switch(tabName) {
        case 'attendance':
            if (typeof window.loadAttendanceData === 'function') {
                window.loadAttendanceData();
            }
            break;
        case 'permission':
            if (typeof window.loadPermissions === 'function') {
                window.loadPermissions();
            }
            break;
        case 'discipline-records':
            if (typeof window.loadDisciplineRecords === 'function') {
                window.loadDisciplineRecords();
            }
            break;
        case 'action-plans':
            if (typeof window.loadActionPlans === 'function') {
                window.loadActionPlans();
            }
            break;
        default:
            console.log('Overview tab - no data to load');
            break;
    }
}

function openDisciplineOverviewModal() {
    @if(!$canManage)
        disciplineAlert('You do not have permission to create discipline records.', 'Permission required');
        return;
    @endif
    
    const modal = document.getElementById('disciplineModal');
    if (modal) {
        modal.classList.remove('hidden');
    } else {
        disciplineAlert('Discipline modal not available.', 'Unavailable');
    }
}

// Generic helper functions
window.getStatusBadge = function(status) {
    const badges = {
        'present': 'bg-green-100 text-green-700',
        'absent': 'bg-red-100 text-red-700',
        'late': 'bg-yellow-100 text-yellow-700',
        'excused': 'bg-blue-100 text-blue-700',
        'pending': 'bg-yellow-100 text-yellow-700',
        'approved': 'bg-green-100 text-green-700',
        'rejected': 'bg-red-100 text-red-700',
        'active': 'bg-red-100 text-red-700',
        'resolved': 'bg-green-100 text-green-700',
        'in_progress': 'bg-blue-100 text-blue-700',
        'completed': 'bg-green-100 text-green-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.escapeHtml = function(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList && event.target.classList.contains('modal')) {
        event.target.classList.add('hidden');
    }
};

// Permission functions
window.loadPermissions = function() {
    console.log('Loading permissions data...');
    const status = document.getElementById('permission_status_filter')?.value || 'all';
    const userId = document.getElementById('permission_user_filter')?.value || '';
    
    let url = '/discipline/permission';
    const params = new URLSearchParams();
    if (status !== 'all') params.append('status', status);
    if (userId) params.append('user_id', userId);
    
    if (params.toString()) url += '?' + params.toString();
    
    fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(response => response.json())
        .then(data => {
            if (data.success && typeof window.updatePermissionTable === 'function') {
                window.updatePermissionTable(data.permissions);
            }
        })
        .catch(error => console.error('Error loading permissions:', error));
};

// Discipline records functions
window.loadDisciplineRecords = function() {
    console.log('Loading discipline records...');
    const type = document.getElementById('discipline_type_filter')?.value || 'all';
    const userId = document.getElementById('discipline_user_filter')?.value || '';
    const status = document.getElementById('discipline_status_filter')?.value || 'all';
    
    let url = '/discipline/records';
    const params = new URLSearchParams();
    if (type !== 'all') params.append('type', type);
    if (userId) params.append('user_id', userId);
    if (status !== 'all') params.append('status', status);
    
    if (params.toString()) url += '?' + params.toString();
    
    fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(response => response.json())
        .then(data => {
            if (data.success && typeof window.updateDisciplineTable === 'function') {
                window.updateDisciplineTable(data.records);
            }
        })
        .catch(error => console.error('Error loading discipline records:', error));
};

// Action plans functions
window.loadActionPlans = function() {
    console.log('Loading action plans...');
    const status = document.getElementById('action_plan_status_filter')?.value || 'all';
    const userId = document.getElementById('action_plan_user_filter')?.value || '';
    
    let url = '/discipline/action-plans';
    const params = new URLSearchParams();
    if (status !== 'all') params.append('status', status);
    if (userId) params.append('user_id', userId);
    
    if (params.toString()) url += '?' + params.toString();
    
    fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(response => response.json())
        .then(data => {
            if (data.success && typeof window.updateActionPlansList === 'function') {
                window.updateActionPlansList(data.action_plans);
            }
        })
        .catch(error => console.error('Error loading action plans:', error));
};

function showSessionSummary(date, sessionType) {
    fetch(`/discipline/attendance/session-summary?date=${date}&type=${encodeURIComponent(sessionType)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let message = `Session: ${sessionType}\nDate: ${date}\n\n`;
            message += `Present: ${data.present}\n`;
            message += `Absent: ${data.absent}\n`;
            message += `Late: ${data.late}\n`;
            message += `Excused: ${data.excused}\n`;
            message += `Total: ${data.total}\n`;
            message += `Attendance Rate: ${data.rate}%`;
            disciplineAlert(message, 'Session summary');
        }
    })
    .catch(error => console.error('Error:', error));
}
</script>
@endsection

