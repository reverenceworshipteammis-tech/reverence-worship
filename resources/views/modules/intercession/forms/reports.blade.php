<div class="reports-container">
    
    
    <!-- Filters -->
    <div class="bg-gray-50 rounded-xl p-4 mb-6 border">
        
                    
                    <!-- Form Selection -->
                    <div class="mt-4 pt-4 border-t">
                        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                            <label class="block text-xs font-medium text-gray-700">
                                <i class="fas fa-check-double mr-1"></i> Select Forms to Track:
                                <span class="text-gray-400 font-normal ml-1" id="selectedFormsCount">({{ isset($selectedFormIds) ? count($selectedFormIds) : 0 }} selected)</span>
                            </label>
                            <div class="flex items-center gap-2">
                                <button onclick="selectAllForms(true)" class="text-xs text-blue-600 hover:text-blue-800 transition">
                                    <i class="fas fa-check-double mr-1"></i> Select All
                    </button>
                    <span class="text-xs text-gray-300">|</span>
                    <button onclick="selectAllForms(false)" class="text-xs text-blue-600 hover:text-blue-800 transition">
                        <i class="fas fa-times mr-1"></i> Deselect All
                    </button>
                </div>
            </div>
            
            <!-- Search Forms -->
            <div class="relative mb-3">
                <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                <input type="text" id="reportFormSearch" placeholder="Search forms by title..." 
                class="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onkeyup="filterForms()">
            </div>
            
            <!-- Forms Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg bg-white" id="formsGrid">
                @php
    // Sort forms by created_at descending (latest first)
    $sortedForms = isset($allForms) ? $allForms->sortByDesc('created_at') : collect();
    // Get only first 8 forms for display
    $displayForms = $sortedForms->take(8);
    // Count total forms
    $totalFormsCount = $sortedForms->count();
@endphp

@if(isset($allForms) && count($allForms) > 0)
    @foreach($displayForms as $form)        
                <label class="form-item flex items-center gap-1.5 text-xs cursor-pointer hover:bg-blue-50 px-2 py-1.5 rounded transition border border-transparent hover:border-blue-200"
                data-title="{{ strtolower($form->title) }}">
                <input type="checkbox" class="form-checkbox report-form-checkbox w-3.5 h-3.5" value="{{ $form->id }}" 
                {{ isset($selectedFormIds) && is_array($selectedFormIds) && in_array($form->id, $selectedFormIds) ? 'checked' : '' }}
                onchange="applyReportFilters(); updateSelectedCount();">
                <div class="truncate">
                    <span class="block text-xs font-medium truncate" title="{{ $form->title }}">{{ Str::limit($form->title, 18) }}</span>
                    <span class="block text-[10px] text-gray-400">
                        <i class="fas fa-calendar-alt mr-0.5"></i> 
                        {{ isset($form->created_at) ? \Carbon\Carbon::parse($form->created_at)->format('M d, Y') : 'N/A' }}
                    </span>
                </div>
            </label>
            @endforeach
                
    
    @if($totalFormsCount > 8)
    <div class="col-span-full text-center mt-1">
        <button onclick="showAllForms()" class="text-xs text-blue-600 hover:text-blue-800 transition font-medium">
            <i class="fas fa-chevron-down mr-1"></i> Show All {{ $totalFormsCount }} Forms
        </button>
    </div>
    @endif
            @else
    <p class="col-span-full text-sm text-gray-500 text-center py-4">No forms available. Please create a form first.</p>
@endif
        </div>
        
        <!-- Show/Hide All Forms Toggle -->
        @if(isset($allForms) && count($allForms) > 10)
        <div class="mt-2 text-center">
            <button onclick="toggleAllForms()" id="toggleFormsBtn" class="text-xs text-blue-600 hover:text-blue-800 transition">
                <i class="fas fa-chevron-down mr-1"></i> Show All Forms
            </button>
        </div>
        @endif
    </div>
</div>
<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select id="reportStatusFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" onchange="applyReportFilters()">
                    <option value="all">All Status</option>
                    <option value="Complete">Complete</option>
                    <option value="Partial">Partial</option>
                    <option value="Not Started">Not Started</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Search User</label>
                <input type="text" id="reportSearchInput" placeholder="Search by name or email..." 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                onkeyup="applyReportFilters()">
            </div>
            <div class="flex items-end gap-2">
                <button onclick="resetReportFilters()" class="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm transition">
                    <i class="fas fa-undo mr-1"></i> Reset
                </button>
            </div>
            <!-- Summary Card - Only Total Users -->
<div class="grid grid-cols-1 gap-4 mb-6">
    <div class="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
        <p class="text-3xl font-bold text-blue-600" id="totalUsersCount">{{ $summary['total_users'] ?? 0 }}</p>
        <p class="text-xs text-gray-600">TOTAL USERS (based on filter)</p>
    </div>
</div>
        </div>

<!-- Report Table - Simplified -->
<div class="overflow-x-auto border rounded-xl">
    <table class="min-w-full divide-y divide-gray-200" id="reportTable">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">User</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Submitted</th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody id="reportTableBody">
                @if(isset($reportData) && is_array($reportData) && count($reportData) > 0)
                    @foreach($reportData as $data)
                    <tr class="border-t hover:bg-gray-50 transition">
                        <td class="px-4 py-3 sticky left-0 bg-white">
                            <div>
                                <p class="font-medium text-gray-800 text-sm">{{ $data['user']->name ?? 'Unknown' }}</p>
                                <p class="text-xs text-gray-400">{{ $data['user']->email ?? '' }}</p>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-center">
                            <span class="font-medium {{ ($data['total_submitted'] ?? 0) == ($data['total_forms'] ?? 0) ? 'text-green-600' : (($data['total_submitted'] ?? 0) > 0 ? 'text-yellow-600' : 'text-red-600') }}">
                                {{ $data['total_submitted'] ?? 0 }}/{{ $data['total_forms'] ?? 0 }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-center">
                            @php
                                $status = $data['status'] ?? 'Not Started';
                            @endphp
                            @if($status === 'Complete')
                                <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                                    <i class="fas fa-check-circle mr-1"></i> Complete
                                </span>
                            @elseif($status === 'Partial')
                                <span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                                    <i class="fas fa-clock mr-1"></i> Partial
                                </span>
                            @else
                                <span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                                    <i class="fas fa-times-circle mr-1"></i> Not Started
                                </span>
                            @endif
                        </td>
                        <td class="px-4 py-3 text-center">
                            <button onclick="viewUserProgress({{ $data['user']->id }}, '{{ $data['user']->name }}')" 
                                    class="text-blue-600 hover:text-blue-800 transition text-sm flex items-center gap-1 mx-auto">
                                <i class="fas fa-file-lines"></i> View
                            </button>
                        </td>
                    </tr>
                    @endforeach
                @else
                    <tr>
                        <td colspan="4" class="px-4 py-12 text-center">
                            <i class="fas fa-chart-bar text-4xl text-gray-300 mb-3"></i>
                            <p class="text-gray-500">No data available</p>
                            <p class="text-xs text-gray-400 mt-1">Select forms to view reports</p>
                        </td>
                    </tr>
                @endif
            </tbody>
        </table>
    </div>

    <!-- Footer Actions -->
    <div class="flex justify-between items-center mt-4">
        <div class="text-sm text-gray-500">
            Showing <span id="reportRowCount">{{ isset($reportData) && is_array($reportData) ? count($reportData) : 0 }}</span> users
        </div>
        <div class="flex gap-2">
            <button onclick="exportReport()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2">
                <i class="fas fa-file-csv"></i> Export CSV
            </button>
            <button onclick="window.print()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2">
                <i class="fas fa-print"></i> Print
            </button>
        </div>
    </div>
</div>

<!-- User Progress Popup Modal -->
<div id="userProgressModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50" style="display: none;">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-lg font-bold text-gray-800" id="userProgressTitle">
                <i class="fas fa-user text-blue-600 mr-2"></i> User Progress
            </h3>
            <button onclick="closeUserProgressModal()" class="text-gray-400 hover:text-gray-600 text-xl transition">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div id="userProgressContent" class="mt-4">
            <div class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-blue-500 text-2xl"></i>
                <p class="text-gray-500 mt-2">Loading...</p>
            </div>
        </div>
        
        <div class="mt-4 pt-3 border-t flex justify-end">
            <button onclick="closeUserProgressModal()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition">
                Close
            </button>
        </div>
    </div>
</div>

<script>
let showingAllForms = false;
let currentUserId = null;

// ==================== FORM SEARCH ====================
function filterForms() {
    const search = document.getElementById('reportFormSearch').value.toLowerCase();
    const items = document.querySelectorAll('.form-item');
    const btn = document.getElementById('showAllFormsBtn');
    let visibleCount = 0;
    
    // Check if we're showing all forms
    const showingAll = btn && btn.innerHTML.includes('Show Less');
    
    items.forEach((item, index) => {
        const title = item.dataset.title || '';
        const match = title.includes(search) || !search;
        
        // If showing all, show all matches; otherwise only show first 8 matches
        if (match) {
            if (showingAll || index < 8) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        } else {
            item.style.display = 'none';
        }
    });
    
    // Update "Show All" button visibility
    if (btn) {
        const totalVisible = document.querySelectorAll('.form-item[style*="display: none"]').length === 0;
        if (visibleCount <= 8 && !showingAll) {
            btn.style.display = 'none';
        } else {
            btn.style.display = '';
        }
    }
}

// ==================== TOGGLE ALL FORMS ====================
function toggleAllForms() {
    const grid = document.getElementById('formsGrid');
    const btn = document.getElementById('toggleFormsBtn');
    
    if (showingAllForms) {
        grid.style.maxHeight = '48px';
        btn.innerHTML = '<i class="fas fa-chevron-down mr-1"></i> Show All Forms';
        showingAllForms = false;
    } else {
        grid.style.maxHeight = 'none';
        btn.innerHTML = '<i class="fas fa-chevron-up mr-1"></i> Show Less';
        showingAllForms = true;
    }
}

// ==================== UPDATE SELECTED COUNT ====================
function updateSelectedCount() {
    const checked = document.querySelectorAll('.report-form-checkbox:checked').length;
    const total = document.querySelectorAll('.report-form-checkbox').length;
    document.getElementById('selectedFormsCount').textContent = `(${checked} selected)`;
}

// ==================== VIEW USER PROGRESS ====================
function viewUserProgress(userId, userName) {
    currentUserId = userId;
    document.getElementById('userProgressTitle').innerHTML = `<i class="fas fa-user text-blue-600 mr-2"></i> ${escapeHtml(userName)} - Form Progress`;
    document.getElementById('userProgressModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    const content = document.getElementById('userProgressContent');
    content.innerHTML = `
        <div class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-blue-500 text-2xl"></i>
            <p class="text-gray-500 mt-2">Loading...</p>
        </div>
    `;
    
    // Get current selected form IDs
    const formCheckboxes = document.querySelectorAll('.report-form-checkbox:checked');
    const formIds = Array.from(formCheckboxes).map(cb => parseInt(cb.value));
    
    if (formIds.length === 0) {
        content.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-circle text-yellow-500 text-3xl mb-3"></i>
                <p class="text-gray-500">No forms selected. Please select forms to track.</p>
            </div>
        `;
        return;
    }
    
    // Fetch user progress data
    fetch('/reports/user-progress?user_id=' + userId + '&form_ids[]=' + formIds.join('&form_ids[]='), {
        method: 'GET',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderUserProgress(data);
        } else {
            content.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-circle text-red-500 text-3xl mb-3"></i>
                    <p class="text-gray-500">Error loading user progress</p>
                    <p class="text-xs text-gray-400">${data.message || 'Unknown error'}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        content.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-circle text-red-500 text-3xl mb-3"></i>
                <p class="text-gray-500">Error loading user progress</p>
            </div>
        `;
    });
}

// ==================== RENDER USER PROGRESS ====================
function renderUserProgress(data) {
    const content = document.getElementById('userProgressContent');
    
    let html = `
        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between">
                <div>
                    <span class="text-sm text-gray-600">Progress:</span>
                    <span class="font-bold text-blue-600">${data.submitted}/${data.total}</span>
                    <span class="text-xs text-gray-400 ml-1">(${data.percentage}%)</span>
                </div>
                <div>
                    <span class="px-2 py-1 text-xs rounded-full ${data.status === 'Complete' ? 'bg-green-100 text-green-700' : data.status === 'Partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}">
                        ${data.status}
                    </span>
                </div>
            </div>
            <div class="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div class="h-2 rounded-full ${data.percentage >= 80 ? 'bg-green-500' : data.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}" 
                     style="width: ${data.percentage}%"></div>
            </div>
        </div>
        <div class="space-y-2">
    `;
    
    data.forms.forEach(form => {
        const isSubmitted = form.submitted;
        const statusIcon = isSubmitted ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-400';
        const statusText = isSubmitted ? 'Submitted' : 'Not Submitted';
        const statusBg = isSubmitted ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
        const dateText = isSubmitted && form.submitted_at ? `Submitted on ${form.submitted_at}` : '';
        
        html += `
            <div class="flex items-center justify-between p-3 border rounded-lg ${statusBg} transition hover:shadow-sm">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <i class="fas ${statusIcon} text-lg"></i>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-800 truncate" title="${escapeHtml(form.title)}">
                            ${escapeHtml(form.title)}
                        </p>
                        ${dateText ? `<p class="text-xs text-gray-400">${dateText}</p>` : ''}
                    </div>
                </div>
                <div>
                    <span class="px-2 py-1 text-xs rounded-full ${isSubmitted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${statusText}
                    </span>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    content.innerHTML = html;
}

// ==================== CLOSE USER PROGRESS MODAL ====================
function closeUserProgressModal() {
    document.getElementById('userProgressModal').style.display = 'none';
    document.body.style.overflow = '';
    currentUserId = null;
}

// ==================== APPLY REPORT FILTERS ====================
function applyReportFilters() {
    const status = document.getElementById('reportStatusFilter').value;
    const search = document.getElementById('reportSearchInput').value;
    
    const formCheckboxes = document.querySelectorAll('.report-form-checkbox:checked');
    const formIds = Array.from(formCheckboxes).map(cb => parseInt(cb.value));
    
    if (formIds.length === 0) {
        const tbody = document.getElementById('reportTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-12 text-center">
                    <i class="fas fa-chart-bar text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">Please select at least one form</p>
                </td>
            </tr>
        `;
        document.getElementById('totalUsersCount').textContent = '0';
        document.getElementById('reportRowCount').textContent = '0';
        return;
    }
    
    const btn = document.querySelector('[onclick="applyReportFilters()"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    let url = '/reports/filter?status=' + encodeURIComponent(status) + 
              '&search=' + encodeURIComponent(search);
    formIds.forEach(id => {
        url += '&form_ids[]=' + id;
    });
    
    fetch(url, {
        method: 'GET',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const filteredUsers = data.reportData.filter(item => {
                const user = item.user;
                if ((user.membership_type || '') !== 'Permanent') {
                    return false;
                }
                let isActive = true;
                if (user.is_active !== undefined) {
                    isActive = (user.is_active == true || user.is_active == 1);
                }
                if (user.status !== undefined && isActive) {
                    isActive = (user.status === 'active' || user.status === 'Active');
                }
                return isActive;
            });
            
            data.reportData = filteredUsers;
            data.summary.total_users = filteredUsers.length;
            data.summary.complete = filteredUsers.filter(item => item.status === 'Complete').length;
            data.summary.partial = filteredUsers.filter(item => item.status === 'Partial').length;
            data.summary.not_started = filteredUsers.filter(item => item.status === 'Not Started').length;
            
            updateReportTable(data);
        } else {
            showNotification(data.message || 'Error loading report data', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error loading report data', 'error');
    })
    .finally(() => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search mr-1"></i> Apply';
        }
    });
}

// ==================== UPDATE REPORT TABLE ====================
function updateReportTable(data) {
    document.getElementById('totalUsersCount').textContent = data.summary.total_users || 0;
    
    const tbody = document.getElementById('reportTableBody');
    
    if (!data.reportData || data.reportData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-12 text-center">
                    <i class="fas fa-chart-bar text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No Permanent users found</p>
                    <p class="text-xs text-gray-400 mt-1">No users match the selected filters</p>
                </td>
            </tr>
        `;
        document.getElementById('reportRowCount').textContent = '0';
        return;
    }
    
    let html = '';
    data.reportData.forEach(item => {
        const user = item.user || {};
        const status = item.status || 'Not Started';
        const statusClass = status === 'Complete' ? 'bg-green-100 text-green-700' 
            : (status === 'Partial' ? 'bg-yellow-100 text-yellow-700' 
            : 'bg-red-100 text-red-700');
        const statusIcon = status === 'Complete' ? 'fa-check-circle' 
            : (status === 'Partial' ? 'fa-clock' 
            : 'fa-times-circle');
        
        const submittedClass = (item.total_submitted || 0) == (item.total_forms || 0) ? 'text-green-600' 
            : ((item.total_submitted || 0) > 0 ? 'text-yellow-600' : 'text-red-600');
        
        html += `
            <tr class="border-t hover:bg-gray-50 transition">
                <td class="px-4 py-3 sticky left-0 bg-white">
                    <div>
                        <p class="font-medium text-gray-800 text-sm">${escapeHtml(user.name || 'Unknown')}</p>
                        <p class="text-xs text-gray-400">${escapeHtml(user.email || '')}</p>
                    </div>
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="font-medium ${submittedClass}">
                        ${item.total_submitted || 0}/${item.total_forms || 0}
                    </span>
                </td>
                <td class="px-4 py-3 text-center">
                    <span class="px-2 py-1 text-xs rounded-full ${statusClass}">
                        <i class="fas ${statusIcon} mr-1"></i> ${status}
                    </span>
                </td>
                <td class="px-4 py-3 text-center">
                    <button onclick="viewUserProgress(${user.id || 0}, '${escapeHtml(user.name || 'Unknown')}')" 
                            class="text-blue-600 hover:text-blue-800 transition text-sm flex items-center gap-1 mx-auto">
                        <i class="fas fa-file-lines"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    document.getElementById('reportRowCount').textContent = data.reportData.length;
}

// ==================== RESET FILTERS ====================
function resetReportFilters() {
    document.getElementById('reportStatusFilter').value = 'all';
    document.getElementById('reportSearchInput').value = '';
    document.getElementById('reportFormSearch').value = '';
    
    document.querySelectorAll('.report-form-checkbox').forEach(cb => {
        cb.checked = true;
    });
    
    filterForms();
    updateSelectedCount();
    applyReportFilters();
}

// ==================== SELECT ALL FORMS ====================
function selectAllForms(select) {
    document.querySelectorAll('.report-form-checkbox').forEach(cb => {
        cb.checked = select;
    });
    updateSelectedCount();
    applyReportFilters();
}

// ==================== EXPORT REPORT ====================
function exportReport() {
    const formCheckboxes = document.querySelectorAll('.report-form-checkbox:checked');
    const formIds = Array.from(formCheckboxes).map(cb => parseInt(cb.value));
    
    if (formIds.length === 0) {
        showNotification('Please select at least one form', 'warning');
        return;
    }
    
    const btn = document.querySelector('[onclick="exportReport()"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    }
    
    let url = '/reports/export?';
    formIds.forEach(id => {
        url += 'form_ids[]=' + id + '&';
    });
    
    window.location.href = url;
    
    if (btn) {
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }, 2000);
    }
}

// ==================== NOTIFICATIONS ====================
function showNotification(message, type) {
    return window.appNotify(...arguments);
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white z-50 ${bgColor} transition-all duration-300`;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'} mr-2"></i>${message}`;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
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

// ==================== DOM READY ====================
document.addEventListener('DOMContentLoaded', function() {
    updateSelectedCount();
    setTimeout(applyReportFilters, 300);
});

// Close modal on background click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('userProgressModal');
    if (e.target === modal) {
        closeUserProgressModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeUserProgressModal();
    }
});
// ==================== SHOW ALL FORMS ====================
// ==================== SHOW ALL FORMS ====================
function showAllForms() {
    const grid = document.getElementById('formsGrid');
    const btn = document.getElementById('showAllFormsBtn');
    
    // Show all forms
    document.querySelectorAll('.form-item').forEach(item => {
        item.style.display = '';
    });
    
    if (btn) {
        btn.innerHTML = '<i class="fas fa-chevron-up mr-1"></i> Show Less';
        btn.onclick = function() {
            hideExcessForms();
        };
    }
}

function hideExcessForms() {
    const items = document.querySelectorAll('.form-item');
    const btn = document.getElementById('showAllFormsBtn');
    
    items.forEach((item, index) => {
        if (index >= 8) {
            item.style.display = 'none';
        }
    });
    
    if (btn) {
        btn.innerHTML = '<i class="fas fa-chevron-down mr-1"></i> Show All {{ $totalFormsCount ?? 0 }} Forms';
        btn.onclick = function() {
            showAllForms();
        };
    }
}

</script>

<style>
.reports-container .bg-white.rounded-lg:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

#reportTable th {
    position: sticky;
    top: 0;
    background: #f9fafb;
    z-index: 10;
}

#reportTable td.sticky {
    z-index: 5;
}

.report-form-checkbox {
    width: 14px;
    height: 14px;
    cursor: pointer;
}

#formsGrid {
    transition: max-height 0.3s ease;
    scrollbar-width: thin;
}

#formsGrid::-webkit-scrollbar {
    width: 4px;
}

#formsGrid::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
}

#formsGrid::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
}

#formsGrid::-webkit-scrollbar-thumb:hover {
    background: #a1a1a1;
}

.form-item:hover {
    background-color: #eff6ff !important;
}

.form-item input:checked + div span {
    color: #2563eb;
    font-weight: 500;
}

#userProgressModal .bg-white {
    animation: modalPop 0.3s ease-out;
}

@keyframes modalPop {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}

@media print {
    .reports-container .bg-gray-50.rounded-xl,
    .reports-container .flex.justify-between.items-center.mt-4 {
        display: none !important;
    }
    #reportTable th {
        background: #e5e7eb !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .bg-green-100, .bg-yellow-100, .bg-red-100, .bg-blue-100 {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
}
</style>

