<div class="reports-container">
    
    
    @php
        $dateFrom = $dateFrom ?? now()->startOfMonth()->toDateString();
        $dateTo = $dateTo ?? now()->endOfMonth()->toDateString();
        $formsInRangeCount = collect($allForms ?? [])->count();
    @endphp

    <!-- Filters -->
    <div class="bg-gray-50 rounded-xl p-4 mb-6 border">
        
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <div>
                <label class="mb-1 block text-xs font-medium text-gray-700">From</label>
                <input type="date" id="reportDateFrom" value="{{ $dateFrom }}"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
                <label class="mb-1 block text-xs font-medium text-gray-700">To</label>
                <input type="date" id="reportDateTo" value="{{ $dateTo }}"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="flex items-end gap-2">
                <button type="button" onclick="applyReportFilters()" class="w-full sm:w-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                    <i class="fas fa-search mr-1"></i> Apply
                </button>
                <button type="button" onclick="resetReportFilters()" class="w-full sm:w-auto rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200">
                    <i class="fas fa-undo mr-1"></i> Reset
                </button>
                @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('intercession', 'export-reports'))
                <button type="button" onclick="exportReport()" class="w-full sm:w-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
                    <i class="fas fa-file-csv mr-1"></i> Export
                </button>
                @endif
            </div>
        </div>
        <p class="mt-3 text-xs text-gray-500">
            Forms submitted between <span class="font-medium">{{ $dateFrom }}</span> and <span class="font-medium">{{ $dateTo }}</span>.
            <span class="ml-1">Forms found: <strong id="formsInRangeCount">{{ $formsInRangeCount }}</strong></span>
        </p>
    </div>
</div>
<div class="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-[180px_1fr_auto]">
    <div>
        <label class="mb-1 block text-xs font-medium text-gray-700">Completion status</label>
        <select id="reportStatusFilter" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" onchange="applyReportFilters()">
            <option value="all">All statuses</option>
            <option value="Complete">Complete</option>
            <option value="Partial">Partial</option>
            <option value="Not Started">Not Started</option>
        </select>
    </div>
    <div>
        <label class="mb-1 block text-xs font-medium text-gray-700">Search user</label>
        <input type="search" id="reportSearchInput" placeholder="Search by name or email..."
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            oninput="debouncedReportFilter()">
    </div>
    <div class="flex items-end">
        <button type="button" onclick="resetReportFilters()" class="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200">
            <i class="fas fa-undo mr-1"></i> Reset
        </button>
    </div>
</div>

<div class="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
    <div class="rounded-xl border border-blue-200 bg-blue-50 p-3">
        <p class="text-2xl font-bold text-blue-600" id="totalUsersCount">{{ $summary['total_users'] ?? 0 }}</p>
        <p class="text-xs text-gray-600">All Members</p>
    </div>
    <div class="rounded-xl border border-green-200 bg-green-50 p-3">
        <p class="text-2xl font-bold text-green-600" id="completeUsersCount">{{ $summary['complete'] ?? 0 }}</p>
        <p class="text-xs text-gray-600">100% Participation</p>
    </div>
    <div class="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p class="text-2xl font-bold text-amber-600" id="partialUsersCount">{{ $summary['partial'] ?? 0 }}</p>
        <p class="text-xs text-gray-600">Partial Participation</p>
    </div>
    <div class="rounded-xl border border-red-200 bg-red-50 p-3">
        <p class="text-2xl font-bold text-red-600" id="notStartedUsersCount">{{ $summary['not_started'] ?? 0 }}</p>
        <p class="text-xs text-gray-600">0% Participation</p>
    </div>
</div>

<!-- Report Table - Simplified -->
<div class="report-responsive-table overflow-x-auto border rounded-xl">
    <table class="min-w-full divide-y divide-gray-200" id="reportTable">
        <thead class="bg-gray-50">
            <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">
                    <button type="button" class="inline-flex items-center gap-1" onclick="setReportSort('name')">
                        <span>User</span>
                        <i id="sort-icon-name" class="fas fa-sort text-[10px] text-gray-300"></i>
                    </button>
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    <button type="button" class="inline-flex items-center gap-1" onclick="setReportSort('submitted')">
                        <span>Submitted</span>
                        <i id="sort-icon-submitted" class="fas fa-sort text-[10px] text-gray-300"></i>
                    </button>
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    <button type="button" class="inline-flex items-center gap-1" onclick="setReportSort('participation')">
                        <span>Participation %</span>
                        <i id="sort-icon-participation" class="fas fa-sort text-[10px] text-gray-300"></i>
                    </button>
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    <button type="button" class="inline-flex items-center gap-1" onclick="setReportSort('points')">
                        <span>Points %</span>
                        <i id="sort-icon-points" class="fas fa-sort text-[10px] text-gray-300"></i>
                    </button>
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    <button type="button" class="inline-flex items-center gap-1" onclick="setReportSort('status')">
                        <span>Status</span>
                        <i id="sort-icon-status" class="fas fa-sort text-[10px] text-gray-300"></i>
                    </button>
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
        </thead>
            <tbody id="reportTableBody">
                @php
                    $initialReportData = collect($reportData ?? [])->sortBy(function ($item) {
                        return strtolower($item['user']->name ?? '');
                    })->values();
                @endphp
                @if($initialReportData->isNotEmpty())
                    @foreach($initialReportData as $data)
                    <tr class="border-t hover:bg-gray-50 transition" data-sort-row="1" data-name="{{ strtolower($data['user']->name ?? '') }}" data-submitted="{{ (int) ($data['total_submitted'] ?? 0) }}" data-participation="{{ (float) ($data['participation_percentage'] ?? $data['percentage'] ?? 0) }}" data-points="{{ (float) ($data['points_percentage'] ?? 0) }}" data-status="{{ strtolower($data['status'] ?? 'Not Started') }}">
                        <td class="px-4 py-3 sticky left-0 bg-white" data-label="User">
                            <div>
                                <p class="font-medium text-gray-800 text-sm">{{ $data['user']->name ?? 'Unknown' }}</p>
                                <p class="text-xs text-gray-400">{{ $data['user']->email ?? '' }}</p>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-center" data-label="Submitted">
                            <span class="font-medium {{ ($data['total_submitted'] ?? 0) == ($data['total_forms'] ?? 0) ? 'text-green-600' : (($data['total_submitted'] ?? 0) > 0 ? 'text-yellow-600' : 'text-red-600') }}">
                                {{ $data['total_submitted'] ?? 0 }}/{{ $data['total_forms'] ?? 0 }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-center" data-label="Participation %">
                            <span class="font-medium text-blue-600">
                                {{ number_format($data['participation_percentage'] ?? $data['percentage'] ?? 0, 1) }}%
                            </span>
                        </td>
                        <td class="px-4 py-3 text-center" data-label="Points %">
                            <span class="font-medium text-purple-600">
                                {{ number_format($data['points_percentage'] ?? 0, 1) }}%
                            </span>
                        </td>
                        <td class="px-4 py-3 text-center" data-label="Status">
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
                        <td class="px-4 py-3 text-center" data-label="Actions">
                            <button onclick="viewUserProgress({{ $data['user']->id }}, '{{ $data['user']->name }}')" 
                                    class="text-blue-600 hover:text-blue-800 transition text-sm flex items-center gap-1 mx-auto">
                                <i class="fas fa-file-lines"></i> View
                            </button>
                        </td>
                    </tr>
                    @endforeach
                @else
                    <tr>
                        <td colspan="6" class="px-4 py-12 text-center">
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
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-4">
        <div class="text-sm text-gray-500">
            Showing <span id="reportRowCount">{{ isset($reportData) && is_array($reportData) ? count($reportData) : 0 }}</span> users
        </div>
    </div>
</div>

<!-- User Progress Popup Modal -->
<div id="userProgressModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50" style="display: none;">
    <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-2 sm:mx-4 p-4 sm:p-6 max-h-[calc(100vh-1rem)] sm:max-h-[90vh] overflow-y-auto">
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
let currentUserId = null;
let reportFilterTimer = null;
let reportSortKey = 'name';
let reportSortDirection = 'asc';

function debouncedReportFilter() {
    clearTimeout(reportFilterTimer);
    reportFilterTimer = setTimeout(applyReportFilters, 300);
}

function setReportSort(key) {
    if (reportSortKey === key) {
        reportSortDirection = reportSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        reportSortKey = key;
        reportSortDirection = key === 'name' ? 'asc' : 'desc';
    }

    updateSortIndicators();
    sortReportTableRows();
}

function updateSortIndicators() {
    const icons = ['name', 'submitted', 'participation', 'points', 'status'];
    icons.forEach(key => {
        const icon = document.getElementById(`sort-icon-${key}`);
        if (!icon) return;

        if (reportSortKey !== key) {
            icon.className = 'fas fa-sort text-[10px] text-gray-300';
            return;
        }

        icon.className = `fas ${reportSortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} text-[10px] text-blue-600`;
    });
}

function getReportSortValue(row, key) {
    if (!row) return '';
    const value = row.dataset ? row.dataset[key] : '';
    if (key === 'name' || key === 'status') {
        return String(value || '').toLowerCase();
    }
    return Number(value || 0);
}

function sortReportTableRows() {
    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr[data-sort-row="1"]'));
    if (rows.length === 0) return;

    rows.sort((a, b) => {
        const aValue = getReportSortValue(a, reportSortKey);
        const bValue = getReportSortValue(b, reportSortKey);

        let result = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            result = aValue - bValue;
        } else {
            result = String(aValue).localeCompare(String(bValue));
        }

        if (reportSortKey === 'status') {
            const statusOrder = { complete: 3, partial: 2, 'not started': 1 };
            result = (statusOrder[String(aValue).trim()] || 0) - (statusOrder[String(bValue).trim()] || 0);
        }

        return reportSortDirection === 'asc' ? result : -result;
    });

    rows.forEach(row => tbody.appendChild(row));
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
    
    const from = encodeURIComponent(document.getElementById('reportDateFrom')?.value || '');
    const to = encodeURIComponent(document.getElementById('reportDateTo')?.value || '');

    // Fetch user progress data
    fetch('/reports/user-progress?user_id=' + userId + '&from=' + from + '&to=' + to, {
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
    const from = document.getElementById('reportDateFrom')?.value || '';
    const to = document.getElementById('reportDateTo')?.value || '';
    
    const btn = document.querySelector('[onclick="applyReportFilters()"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    let url = '/reports/filter?status=' + encodeURIComponent(status) + 
              '&search=' + encodeURIComponent(search) +
              '&from=' + encodeURIComponent(from) +
              '&to=' + encodeURIComponent(to);
    
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
    document.getElementById('completeUsersCount').textContent = data.summary.complete || 0;
    document.getElementById('partialUsersCount').textContent = data.summary.partial || 0;
    document.getElementById('notStartedUsersCount').textContent = data.summary.not_started || 0;
    const formsInRangeCount = document.getElementById('formsInRangeCount');
    if (formsInRangeCount) {
        formsInRangeCount.textContent = (data.forms && data.forms.length) ? data.forms.length : 0;
    }
    
    const tbody = document.getElementById('reportTableBody');
    
    if (!data.reportData || data.reportData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-4 py-12 text-center">
                    <i class="fas fa-chart-bar text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500">No users found</p>
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
        const participation = Number(item.participation_percentage ?? item.percentage ?? 0).toFixed(1);
        const points = Number(item.points_percentage ?? 0).toFixed(1);
        const userName = String(user.name || 'Unknown').toLowerCase();
        const submittedValue = Number(item.total_submitted || 0);
        const participationValue = Number(item.participation_percentage ?? item.percentage ?? 0);
        const pointsValue = Number(item.points_percentage ?? 0);
        
        html += `
            <tr class="border-t hover:bg-gray-50 transition" data-sort-row="1" data-name="${escapeHtml(userName)}" data-submitted="${submittedValue}" data-participation="${participationValue}" data-points="${pointsValue}" data-status="${escapeHtml(status.toLowerCase())}">
                <td class="px-4 py-3 sticky left-0 bg-white" data-label="User">
                    <div>
                        <p class="font-medium text-gray-800 text-sm">${escapeHtml(user.name || 'Unknown')}</p>
                        <p class="text-xs text-gray-400">${escapeHtml(user.email || '')}</p>
                    </div>
                </td>
                <td class="px-4 py-3 text-center" data-label="Submitted">
                    <span class="font-medium ${submittedClass}">
                        ${item.total_submitted || 0}/${item.total_forms || 0}
                    </span>
                </td>
                <td class="px-4 py-3 text-center" data-label="Participation %">
                    <span class="font-medium text-blue-600">
                        ${participation}%
                    </span>
                </td>
                <td class="px-4 py-3 text-center" data-label="Points %">
                    <span class="font-medium text-purple-600">
                        ${points}%
                    </span>
                </td>
                <td class="px-4 py-3 text-center" data-label="Status">
                    <span class="px-2 py-1 text-xs rounded-full ${statusClass}">
                        <i class="fas ${statusIcon} mr-1"></i> ${status}
                    </span>
                </td>
                <td class="px-4 py-3 text-center" data-label="Actions">
                    <button onclick="viewUserProgress(${user.id || 0}, '${escapeHtml(user.name || 'Unknown')}')" 
                            class="text-blue-600 hover:text-blue-800 transition text-sm flex items-center gap-1 mx-auto">
                        <i class="fas fa-file-lines"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    sortReportTableRows();
    document.getElementById('reportRowCount').textContent = data.reportData.length;
}

// ==================== RESET FILTERS ====================
function resetReportFilters() {
    document.getElementById('reportStatusFilter').value = 'all';
    document.getElementById('reportSearchInput').value = '';
    document.getElementById('reportDateFrom').value = '{{ $dateFrom }}';
    document.getElementById('reportDateTo').value = '{{ $dateTo }}';
    applyReportFilters();
}

// ==================== EXPORT REPORT ====================
function exportReport() {
    const btn = document.querySelector('[onclick="exportReport()"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    }
    
    let url = '/reports/export?from=' + encodeURIComponent(document.getElementById('reportDateFrom')?.value || '') +
              '&to=' + encodeURIComponent(document.getElementById('reportDateTo')?.value || '');
    
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
    updateSortIndicators();
    sortReportTableRows();
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

@media(max-width:639px) {
    .report-responsive-table { overflow:visible; border:0; }
    .report-responsive-table table,
    .report-responsive-table tbody { display:block; width:100%; }
    .report-responsive-table thead { display:none; }
    .report-responsive-table tbody { display:grid; gap:.75rem; }
    .report-responsive-table tbody tr {
        display:block;
        overflow:hidden;
        border:1px solid #e2e8f0;
        border-radius:.75rem;
        background:#fff;
    }
    .report-responsive-table tbody td {
        position:static !important;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:1rem;
        width:100%;
        padding:.65rem .8rem;
        border:0;
        border-bottom:1px solid #f1f5f9;
        text-align:right;
    }
    .report-responsive-table tbody td:last-child { border-bottom:0; }
    .report-responsive-table tbody td::before {
        content:attr(data-label);
        flex:0 0 34%;
        color:#64748b;
        font-size:.7rem;
        font-weight:600;
        text-align:left;
        text-transform:uppercase;
    }
    .report-responsive-table tbody td[data-label="User"] { display:block; text-align:left; }
    .report-responsive-table tbody td[data-label="User"]::before { display:none; }
    .report-responsive-table tbody td[colspan] { display:block; text-align:center; }
    .report-responsive-table tbody td[colspan]::before { display:none; }
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
