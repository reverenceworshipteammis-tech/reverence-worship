<div>
    <!-- Quick Actions Card -->
    <div class="rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-indigo-50/40 p-3 mb-4 shadow-sm">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
                              <input type="date" id="quick_discipline_date" value="{{ date('Y-m-d') }}" class="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-gray-800 shadow-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2 text-slate-500">&nbsp;</label>
                <button onclick="openDisciplineSessionModal()" type="button" class="w-full rounded-lg bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-200">
                    <i class="fas fa-play-circle mr-2"></i> Start Discipline Session
                </button>
            </div>
        </div>
    </div>
    
    <!-- Management Cards -->


    <!-- Filters -->
    <div class="bg-gray-50 rounded-lg p-4 mb-4">
        <div class="flex flex-wrap gap-3 items-end">
            <div class="min-w-[260px] flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <input type="date" id="discipline_from_date" value="{{ date('Y-m-01') }}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <div>
                        <input type="date" id="discipline_to_date" value="{{ date('Y-m-t') }}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
            </div>
            <div class="flex items-end gap-3">
                <button onclick="exportDisciplineReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition">
                    <i class="fas fa-file-export mr-1"></i> Export
                </button>
            </div>
        </div>
    </div>
    
    <!-- Discipline Sessions Table -->
    <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50 border-b">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DATE</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SESSION</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">GOOD BEHAVIOR</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">BAD BEHAVIOR</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">GOOD BEHAVIOR %</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">ACTIONS</th>
                    </tr>
                </thead>
                <tbody id="discipline-table-body">
                    <tr>
                        <td colspan="6" class="text-center py-12 text-gray-500">
                            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                            <p>Loading discipline sessions...</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
<div id="discipline-pagination" class="mt-5 flex items-center justify-between gap-3"></div>

<script>
// Make functions available globally
window.openDisciplineModal = openDisciplineModal;
window.filterDisciplineRecords = filterDisciplineRecords;
window.exportDisciplineReport = exportDisciplineReport;
window.resolveDiscipline = resolveDiscipline;
window.deleteDisciplineRecord = deleteDisciplineRecord;
window.quickStartDiscipline = quickStartDiscipline;

let currentDisciplinePage = 1;
let currentDisciplinePagination = { current_page: 1, total_pages: 1, has_prev: false, has_next: false, total: 0, per_page: 10 };

function openDisciplineSessionModal() {
    const sessionDate = document.getElementById('quick_discipline_date').value;
    if (!sessionDate) {
        disciplineAlert('Please select a date');
        return;
    }
    // Try to call the globally exposed function from Alpine
    try {
        if (typeof window.openDisciplineSession === 'function') {
            window.openDisciplineSession(sessionDate);
        } else {
            // Fallback: try direct DOM approach - find the Alpine component
            var root = document.querySelector('[x-data="disciplineManager()"]');
            if (root && root.__x) {
                root.__x.$data.session.date = sessionDate;
                root.__x.$data.session.title = 'Discipline Session - ' + sessionDate;
                root.__x.$data.searchQuery = '';
                root.__x.$data.initRecords();
                root.__x.$data.showModal = true;
            } else {
                disciplineAlert('Opening discipline modal... if nothing happens, please refresh the page.');
                // Set a retry
                setTimeout(function() {
                    var root2 = document.querySelector('[x-data="disciplineManager()"]');
                    if (root2 && root2.__x) {
                        root2.__x.$data.session.date = sessionDate;
                        root2.__x.$data.session.title = 'Discipline Session - ' + sessionDate;
                        root2.__x.$data.searchQuery = '';
                        root2.__x.$data.initRecords();
                        root2.__x.$data.showModal = true;
                    }
                }, 500);
            }
        }
    } catch(e) {
        console.error('Error opening discipline modal:', e);
        disciplineAlert('Error opening modal. Check console for details.');
    }
}

function quickStartDiscipline() {
    openDisciplineSessionModal();
}

function openDisciplineModal(recordId = null, presetDate = null) {
    try {
        if (typeof window.openDisciplineRecordModal === 'function') {
            window.openDisciplineRecordModal(recordId, presetDate);
        } else {
            // Fallback
            var root = document.querySelector('[x-data="disciplineManager()"]');
            if (root && root.__x) {
                if (recordId) {
                    fetch('/discipline/records/' + recordId + '/edit', {
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.success) {
                            root.__x.$data.session.date = data.record.created_at ? data.record.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
                            root.__x.$data.session.title = data.record.title;
                            root.__x.$data.initRecords();
                            if (root.__x.$data.memberRecords[data.record.user_id]) {
                                root.__x.$data.memberRecords[data.record.user_id].behaviour = data.record.type === 'positive' ? 'good' : 'bad';
                                root.__x.$data.memberRecords[data.record.user_id].description = data.record.description || '';
                                root.__x.$data.memberRecords[data.record.user_id].points = data.record.points || 0;
                            }
                            root.__x.$data.showModal = true;
                        }
                    });
                } else {
                    root.__x.$data.session.date = presetDate || new Date().toISOString().split('T')[0];
                    root.__x.$data.session.title = presetDate ? 'Discipline Session - ' + presetDate : '';
                    root.__x.$data.searchQuery = '';
                    root.__x.$data.initRecords();
                    root.__x.$data.showModal = true;
                }
            } else {
                disciplineAlert('Discipline modal not ready. Please refresh the page.');
            }
        }
    } catch(e) {
        console.error('Error opening discipline modal:', e);
        disciplineAlert('Error opening modal. Check console for details.');
    }
}

function filterDisciplineRecords(page = 1) {
    const fromDate = document.getElementById('discipline_from_date')?.value || '';
    const toDate = document.getElementById('discipline_to_date')?.value || '';
    const perPage = 10;
    
    currentDisciplinePage = page;

    let url = `/discipline/records?page=${page}&per_page=${perPage}`;
    if (fromDate) {
        url += `&from_date=${encodeURIComponent(fromDate)}`;
    }
    if (toDate) {
        url += `&to_date=${encodeURIComponent(toDate)}`;
    }
    
    fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateDisciplineTable(data.records);
            currentDisciplinePagination = data.pagination || currentDisciplinePagination;
            renderDisciplinePagination(currentDisciplinePagination);
        } else {
            console.error('Error loading discipline records:', data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

function exportDisciplineReport() {
    const fromDate = document.getElementById('discipline_from_date')?.value || '';
    const toDate = document.getElementById('discipline_to_date')?.value || '';

    const params = new URLSearchParams({
        type: 'discipline',
        format: 'summary'
    });

    if (fromDate) {
        params.set('from_date', fromDate);
    }
    if (toDate) {
        params.set('to_date', toDate);
    }

    window.location.href = `/discipline/reports/export?${params.toString()}`;
}

function updateDisciplineTable(records) {
    const tbody = document.getElementById('discipline-table-body');
    const paginationContainer = document.getElementById('discipline-pagination');

    if (!records || records.length === 0) {
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-12 text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2 opacity-50"></i>
                    <p>No discipline sessions found</p>
                    <button onclick="openDisciplineModal()" class="mt-3 text-blue-600 hover:text-blue-700 text-sm">
                        <i class="fas fa-plus"></i> Create your first session
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = records.map(session => {
        const total = Number(session.good_behavior || 0) + Number(session.bad_behavior || 0);
        const goodPercent = total > 0 ? ((Number(session.good_behavior || 0) / total) * 100).toFixed(1) : 100;
        const sessionDate = session.session_date || '';

        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-600">${formatDate(sessionDate)}</td>
                <td class="px-6 py-4 text-sm font-medium text-gray-800">${escapeHtml(session.session_title || '')}</td>
                <td class="px-6 py-4 text-center text-sm font-semibold text-green-600">${session.good_behavior || 0}</td>
                <td class="px-6 py-4 text-center text-sm text-red-600">${session.bad_behavior || 0}</td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <span class="text-sm font-semibold ${goodPercent >= 80 ? 'text-green-600' : (goodPercent >= 60 ? 'text-yellow-600' : 'text-red-600')}">
                            ${goodPercent}%
                        </span>
                        <div class="w-16 bg-gray-200 rounded-full h-1.5">
                            <div class="h-1.5 rounded-full ${goodPercent >= 80 ? 'bg-green-500' : (goodPercent >= 60 ? 'bg-yellow-500' : 'bg-red-500')}" style="width: ${goodPercent}%"></div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button type="button" onclick="viewSessionDetails('${sessionDate}', '${escapeHtml(session.session_title || '')}')" class="text-blue-500 hover:text-blue-700" title="View">
                            <i class="fas fa-arrow-up-right-from-square"></i>
                        </button>
                        <button type="button" onclick="deleteSessionRecords('${sessionDate}', '${escapeHtml(session.session_title || '')}')" class="text-red-500 hover:text-red-700" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderDisciplinePagination(pagination) {
    const container = document.getElementById('discipline-pagination');
    if (!container) return;

    const totalPages = Number(pagination?.total_pages ?? 1);
    const currentPage = Number(pagination?.current_page ?? 1);
    const total = Number(pagination?.total ?? 0);
    const perPage = Number(pagination?.per_page ?? 10);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const start = Math.min((currentPage - 1) * perPage + 1, total);
    const end = Math.min(currentPage * perPage, total);

    container.innerHTML = `
        <div class="flex items-center justify-between gap-3 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <p class="text-sm text-gray-500">Showing ${start}-${end} of ${total}</p>
            <div class="flex items-center gap-2">
                <button type="button" onclick="filterDisciplineRecords(${Math.max(1, currentPage - 1)})" ${pagination?.has_prev ? '' : 'disabled'} class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Prev</button>
                <span class="text-sm text-gray-500">Page ${currentPage} of ${totalPages}</span>
                <button type="button" onclick="filterDisciplineRecords(${Math.min(totalPages, currentPage + 1)})" ${pagination?.has_next ? '' : 'disabled'} class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
            </div>
        </div>
    `;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
    }).replace(/\//g, '/');
}

function viewSessionDetails(date, sessionTitle) {
    if (!date || !sessionTitle) return;
    window.location.href = '/discipline/records/session?date=' + encodeURIComponent(date) + '&title=' + encodeURIComponent(sessionTitle);
}

async function deleteSessionRecords(date, sessionTitle) {
    if (!date || !sessionTitle) return;
    if (await disciplineConfirm('Delete all records for "' + sessionTitle + '" on ' + date + '?', 'Delete session', 'Delete', 'Cancel', 'danger')) {
        fetch('/discipline/records/session?date=' + encodeURIComponent(date) + '&title=' + encodeURIComponent(sessionTitle), {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                filterDisciplineRecords();
            } else {
                disciplineAlert('Error deleting session records: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            disciplineAlert('Error deleting session records');
        });
    }
}

async function resolveDiscipline(id) {
    const notes = await disciplinePrompt('Enter resolution notes:', 'Resolve record', 'Resolution notes');
    if (notes) {
        fetch(`/discipline/records/${id}/resolve`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ resolved_notes: notes })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                filterDisciplineRecords();
            } else {
                disciplineAlert('Error resolving record: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            disciplineAlert('Error resolving record');
        });
    }
}

async function deleteDisciplineRecord(id) {
    if (await disciplineConfirm('Are you sure you want to delete this discipline record?', 'Delete record', 'Delete', 'Cancel', 'danger')) {
        fetch(`/discipline/records/${id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                filterDisciplineRecords();
            } else {
                disciplineAlert('Error deleting discipline record: ' + (data.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            disciplineAlert('Error deleting discipline record');
        });
    }
}

window.viewSessionDetails = viewSessionDetails;
window.deleteSessionRecords = deleteSessionRecords;

function getTypeBadge(type) {
    const badges = {
        'positive': 'bg-green-100 text-green-700',
        'warning': 'bg-yellow-100 text-yellow-700',
        'penalty': 'bg-red-100 text-red-700',
        'suspension': 'bg-purple-100 text-purple-700'
    };
    return badges[type] || 'bg-gray-100 text-gray-700';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load initial data
filterDisciplineRecords();

// Add filter event listeners
document.getElementById('discipline_from_date')?.addEventListener('change', () => filterDisciplineRecords(1));
document.getElementById('discipline_to_date')?.addEventListener('change', () => filterDisciplineRecords(1));
</script>
