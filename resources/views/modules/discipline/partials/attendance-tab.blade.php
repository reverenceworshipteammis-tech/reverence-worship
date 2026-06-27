<div class="space-y-6">
    <!-- Header with Title Only -->
    <div class="flex justify-between items-center">
        <div>
            <h3 class="text-2xl font-bold text-gray-800">Attendance Management</h3>
                   </div>
           </div>

    <!-- Stats Cards - Clean and Minimal -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="rounded-xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-blue-50/40 p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl font-bold text-slate-900" id="total_sessions">0</p>
                    <p class="text-xs text-gray-500">Total Sessions</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center ring-1 ring-sky-200">
                    <i class="fas fa-calendar-alt text-sky-700"></i>
                </div>
            </div>
        </div>
        
        <div class="rounded-xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50/40 p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl font-bold text-emerald-600" id="present_count">0</p>
                    <p class="text-xs text-gray-500">Timeliness</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center ring-1 ring-emerald-200">
                    <i class="fas fa-check-circle text-emerald-700"></i>
                </div>
            </div>
        </div>
        
        <div class="rounded-xl border border-amber-100 bg-gradient-to-br from-white via-amber-50 to-yellow-50/50 p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl font-bold text-amber-600" id="late_count">0</p>
                    <p class="text-xs text-gray-500">Late Avg</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center ring-1 ring-amber-200">
                    <i class="fas fa-clock text-amber-700"></i>
                </div>
            </div>
        </div>
        
        <div class="rounded-xl border border-rose-100 bg-gradient-to-br from-white via-rose-50 to-red-50/40 p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl font-bold text-rose-600" id="absent_count">0</p>
                    <p class="text-xs text-gray-500">Absent Avg</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center ring-1 ring-rose-200">
                    <i class="fas fa-times-circle text-rose-700"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- Quick Session Start - Simplified -->
    <div class="rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-indigo-50/40 p-5 shadow-sm">
        <div class="flex flex-col md:flex-row gap-4 items-end">
            <div class="flex-1">
                <label class="block text-xs font-medium mb-1 text-slate-500">Session Date</label>
                <input type="date" id="quick_date" value="{{ date('Y-m-d') }}" class="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100">
            </div>
            <div class="flex-1">
                <label class="block text-xs font-medium mb-1 text-slate-500">Session Name</label>
                <input type="text" id="quick_session_type" placeholder="Sunday Service" class="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100">
            </div>
            <button onclick="quickMarkAttendance()" class="inline-flex items-center rounded-lg bg-sky-100 px-6 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-200">
                <i class="fas fa-play mr-2"></i> Start Session
            </button>
        </div>
    </div>

    <!-- Filters - Simple Row -->
    <div class="flex flex-wrap gap-3 items-end">
        <div>
            <label class="block text-xs text-gray-600 mb-1">From</label>
            <input type="date" id="attendance_start_date" value="{{ date('Y-m-01') }}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        <div>
            <label class="block text-xs text-gray-600 mb-1">To</label>
            <input type="date" id="attendance_end_date" value="{{ date('Y-m-t') }}" class="px-3 py-2 border border-gray-300 rounded-lg text-sm">
        </div>
        <div>
            <label class="block text-xs text-gray-600 mb-1">Session</label>
            <select id="attendance_session_filter" class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                <option value="">All Sessions</option>
            </select>
        </div>
        <button onclick="applyFilter()" class="rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-200">
            <i class="fas fa-search mr-1"></i> Filter
        </button>
        <button onclick="exportAttendanceReport()" class="rounded-lg bg-sky-100 px-4 py-2 text-sm text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-200">
            <i class="fas fa-file-export mr-1"></i> Export
        </button>
    </div>

    <!-- Sessions Table - Clean -->
    <div class="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table class="w-full">
            <thead class="bg-sky-50 border-b border-sky-100">
                <tr>
                    <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">DATE</th>
                    <th class="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">SESSION</th>
                    <th class="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">PRESENT</th>
                    <th class="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">ABSENT</th>
                    <th class="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">RATE</th>
                    <th class="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">ACTIONS</th>
                </tr>
            </thead>
            <tbody id="attendance-table-body">
                <tr>
                    <td colspan="6" class="text-center py-12 text-slate-400">
                        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                        <p>Loading sessions...</p>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <div id="attendance-pagination" class="flex items-center justify-between gap-3 rounded-xl border border-sky-100 bg-white px-4 py-3 shadow-sm"></div>
</div>

<script>
var currentAttendanceData = [];
var currentAttendancePage = 1;
var currentAttendancePagination = { current_page: 1, total_pages: 1, has_prev: false, has_next: false, total: 0, per_page: 10 };

document.addEventListener('DOMContentLoaded', function() {
    loadAttendanceData();
    loadTotalMembers();
});

function loadTotalMembers() {
    fetch('/users/list', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.users) {
            const totalMembersEl = document.getElementById('total_members');
            if (totalMembersEl) totalMembersEl.textContent = data.users.length;
        }
    })
    .catch(error => console.error('Error loading members:', error));
}

function loadAttendanceData() {
    currentAttendancePage = 1;
    const startDate = document.getElementById('attendance_start_date')?.value || '';
    const endDate = document.getElementById('attendance_end_date')?.value || '';
    const sessionType = document.getElementById('attendance_session_filter')?.value || '';
    
    const url = `/discipline/attendance?start_date=${startDate}&end_date=${endDate}&session_type=${sessionType}`;
    
    fetch(url, {
        headers: { 
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentAttendanceData = data.attendances || [];
            renderAttendanceTable(currentAttendanceData, currentAttendancePage);
            renderAttendanceStats(currentAttendanceData);
            renderSessionFilter(currentAttendanceData);
        }
    })
    .catch(error => {
        console.error('Error loading attendance:', error);
        const tbody = document.getElementById('attendance-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-red-400">Failed to load data</td></tr>`;
        }
    });
}

function exportAttendanceReport() {
    const startDate = document.getElementById('attendance_start_date')?.value || '';
    const endDate = document.getElementById('attendance_end_date')?.value || '';

    const params = new URLSearchParams({
        type: 'attendance',
        format: 'summary'
    });

    if (startDate) {
        params.set('start_at', `${startDate}T00:00`);
    }

    if (endDate) {
        params.set('end_at', `${endDate}T23:59`);
    }

    window.location.href = `/discipline/reports/export?${params.toString()}`;
}

function renderAttendanceTable(attendances, page = 1) {
    const tbody = document.getElementById('attendance-table-body');
    const paginationContainer = document.getElementById('attendance-pagination');
    if (!tbody) return;
    
    if (!attendances || attendances.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-gray-400">No attendance records found</td></tr>`;
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
        return;
    }
    
    const groupedSessions = {};
    attendances.forEach(att => {
        const key = `${att.session_date}_${att.session_type}`;
        if (!groupedSessions[key]) {
            groupedSessions[key] = {
                date: att.session_date,
                session: att.session_type,
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                total: 0
            };
        }
        if (att.status === 'present') groupedSessions[key].present++;
        else if (att.status === 'absent') groupedSessions[key].absent++;
        else if (att.status === 'late') groupedSessions[key].late++;
        else if (att.status === 'excused') groupedSessions[key].excused++;
        groupedSessions[key].total++;
    });
    
    const sessions = Object.values(groupedSessions);
    const perPage = 10;
    const total = sessions.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const pageNumber = Math.min(Math.max(1, page), totalPages);
    const start = (pageNumber - 1) * perPage;
    const pageSessions = sessions.slice(start, start + perPage);

    currentAttendancePage = pageNumber;
    currentAttendancePagination = {
        current_page: pageNumber,
        total_pages: totalPages,
        has_prev: pageNumber > 1,
        has_next: pageNumber < totalPages,
        total: total,
        per_page: perPage
    };

    tbody.innerHTML = pageSessions.map(session => {
        const totalPresent = session.present + session.late;
        const totalAbsent = session.absent + session.excused;
        const attendanceRate = session.total > 0 ? ((totalPresent / session.total) * 100).toFixed(0) : 0;
        const rateColor = attendanceRate >= 75 ? 'text-emerald-600' : (attendanceRate >= 50 ? 'text-amber-600' : 'text-rose-600');
        const formattedDate = session.date.split('-').reverse().join('/');
        
        return `
            <tr class="border-b border-gray-100 hover:bg-sky-50/50 transition">
                <td class="px-5 py-3 text-sm text-slate-600">${escapeHtml(formattedDate)}</td>
                <td class="px-5 py-3 text-sm font-medium text-slate-800">${escapeHtml(session.session)}</td>
                <td class="px-5 py-3 text-center text-sm font-semibold text-emerald-600">${totalPresent}</td>
                <td class="px-5 py-3 text-center text-sm text-rose-500">${totalAbsent}</td>
                <td class="px-5 py-3 text-center">
                    <span class="text-sm font-semibold ${rateColor}">${attendanceRate}%</span>
                </td>
                <td class="px-5 py-3 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="window.viewSession('${session.date}', '${escapeHtml(session.session)}')" class="text-sky-500 hover:text-sky-700 transition" title="View">
                            <i class="fas fa-arrow-up-right-from-square"></i>
                        </button>
                        <button onclick="window.deleteSessionRecord('${session.date}', '${escapeHtml(session.session)}')" class="text-rose-400 hover:text-rose-600 transition" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    renderAttendancePagination(currentAttendancePagination);
}

function renderAttendancePagination(pagination) {
    const container = document.getElementById('attendance-pagination');
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
        <p class="text-sm text-slate-500">Showing ${start}-${end} of ${total}</p>
        <div class="flex items-center gap-2">
            <button type="button" onclick="setAttendancePage(${Math.max(1, currentPage - 1)})" ${pagination?.has_prev ? '' : 'disabled'} class="rounded-lg border border-sky-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50">Prev</button>
            <span class="text-sm text-slate-500">Page ${currentPage} of ${totalPages}</span>
            <button type="button" onclick="setAttendancePage(${Math.min(totalPages, currentPage + 1)})" ${pagination?.has_next ? '' : 'disabled'} class="rounded-lg border border-sky-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
        </div>
    `;
}

function setAttendancePage(page) {
    currentAttendancePage = page;
    renderAttendanceTable(currentAttendanceData, page);
}

function renderAttendanceStats(attendances) {
    const total = attendances.length;
    const present = attendances.filter(a => a.status === 'present').length;
    const absent = attendances.filter(a => a.status === 'absent').length;
    const late = attendances.filter(a => a.status === 'late').length;
    
    const uniqueSessions = new Set(attendances.map(a => `${a.session_date}_${a.session_type}`));
    const totalSessions = uniqueSessions.size;
    const presentAvg = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
    const lateAvg = total > 0 ? ((late / total) * 100).toFixed(1) : '0.0';
    const absentAvg = total > 0 ? ((absent / total) * 100).toFixed(1) : '0.0';
    
    const totalSessionsEl = document.getElementById('total_sessions');
    const presentCountEl = document.getElementById('present_count');
    const absentCountEl = document.getElementById('absent_count');
    const lateCountEl = document.getElementById('late_count');
    
    if (totalSessionsEl) totalSessionsEl.textContent = totalSessions;
    if (presentCountEl) presentCountEl.textContent = `${presentAvg}%`;
    if (absentCountEl) absentCountEl.textContent = `${absentAvg}%`;
    if (lateCountEl) lateCountEl.textContent = `${lateAvg}%`;
}

function renderSessionFilter(attendances) {
    const sessionTypes = [...new Set(attendances.map(a => a.session_type))];
    const filterSelect = document.getElementById('attendance_session_filter');
    if (!filterSelect) return;
    
    const currentValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="">All Sessions</option>';
    sessionTypes.forEach(type => {
        filterSelect.innerHTML += `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`;
    });
    filterSelect.value = currentValue;
}

function quickMarkAttendance() {
    const sessionDate = document.getElementById('quick_date')?.value;
    const sessionType = document.getElementById('quick_session_type')?.value;
    
    if (!sessionDate || !sessionType) {
        disciplineAlert('Please enter session date and name');
        return;
    }
    
    if (typeof window.openSessionDetailsModal === 'function') {
        // Encode the session type for URL
        const encodedType = encodeURIComponent(sessionType);
        window.openSessionDetailsModal(sessionDate, encodedType);
    } else {
        disciplineAlert('Please use the "Mark Attendance" button');
    }
}

function openAttendanceModal(attendanceIdParam = null) {
    const modal = document.getElementById('attendanceModal');
    if (!modal) {
        disciplineAlert('Form not ready. Please refresh.');
        return;
    }
    
    const modalTitle = document.getElementById('attendance_modal_title');
    const attendanceIdField = document.getElementById('attendance_id');
    const userIdField = document.getElementById('attendance_user_id');
    const sessionDateField = document.getElementById('attendance_session_date');
    const sessionTypeField = document.getElementById('attendance_session_type');
    const statusField = document.getElementById('attendance_status');
    const checkInTime = document.getElementById('attendance_check_in_time');
    const lateMinutes = document.getElementById('attendance_late_minutes');
    const notes = document.getElementById('attendance_notes');
    
    if (attendanceIdParam) {
        fetch(`/discipline/attendance/${attendanceIdParam}/edit`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.attendance) {
                if (modalTitle) modalTitle.textContent = 'Edit Attendance';
                if (attendanceIdField) attendanceIdField.value = data.attendance.id;
                if (userIdField) userIdField.value = data.attendance.user_id;
                if (sessionDateField) sessionDateField.value = data.attendance.session_date;
                if (sessionTypeField) sessionTypeField.value = data.attendance.session_type;
                if (statusField) statusField.value = data.attendance.status;
                if (checkInTime) checkInTime.value = data.attendance.check_in_time || '';
                if (lateMinutes) lateMinutes.value = data.attendance.late_minutes || 0;
                if (notes) notes.value = data.attendance.notes || '';
                modal.classList.remove('hidden');
            }
        });
    } else {
        if (modalTitle) modalTitle.textContent = 'Mark Attendance';
        if (attendanceIdField) attendanceIdField.value = '';
        if (userIdField) userIdField.value = '';
        if (sessionDateField) sessionDateField.value = new Date().toISOString().split('T')[0];
        if (sessionTypeField) sessionTypeField.value = '';
        if (statusField) statusField.value = 'present';
        if (checkInTime) checkInTime.value = '';
        if (lateMinutes) lateMinutes.value = '0';
        if (notes) notes.value = '';
        modal.classList.remove('hidden');
    }
}

function viewSession(date, sessionType) {
    if (typeof window.openSessionDetailsModal === 'function') {
        // Encode the session type for URL
        const encodedType = encodeURIComponent(sessionType);
        window.openSessionDetailsModal(date, encodedType);
    } else {
        // Use the correct URL format with slashes
        const encodedType = encodeURIComponent(sessionType);
        fetch(`/discipline/attendance/session-summary?date=${date}&type=${encodedType}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                disciplineAlert(`Session: ${sessionType}\nDate: ${date}\nPresent: ${data.present}\nAbsent: ${data.absent}\nRate: ${data.rate}%`);
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

async function deleteSessionRecord(date, sessionType) {
    if (await disciplineConfirm(`Delete "${sessionType}" on ${date}?`, 'Delete session', 'Delete', 'Cancel', 'danger')) {
        const encodedType = encodeURIComponent(sessionType);
        fetch(`/discipline/attendance/session?date=${date}&type=${encodedType}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadAttendanceData();
                disciplineAlert('Session deleted');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

function applyFilter() {
    loadAttendanceData();
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Global exports
window.loadAttendanceData = loadAttendanceData;
window.applyFilter = applyFilter;
window.viewSession = viewSession;
window.deleteSessionRecord = deleteSessionRecord;
window.openAttendanceModal = openAttendanceModal;
window.quickMarkAttendance = quickMarkAttendance;
window.closeModal = closeModal;
window.setAttendancePage = setAttendancePage;
</script>
