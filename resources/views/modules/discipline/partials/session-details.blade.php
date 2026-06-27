<div id="sessionDetailsModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-7xl shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <div>
                <h3 id="session_modal_title" class="text-lg font-bold text-gray-800">Session Details</h3>
                <p id="session_info" class="text-sm text-gray-500 mt-1"></p>
            </div>
            <button onclick="closeModal('sessionDetailsModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <div id="session_completed_warning" class="hidden mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-lg">
            <i class="fas fa-exclamation-triangle mr-2"></i> 
            This session is completed and cannot be edited.
        </div>
        
        <!-- Stats Summary -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 mt-4">
            <div class="bg-blue-50 rounded-lg p-4">
                <p class="text-sm text-gray-600">Total Users</p>
                <p id="total_users" class="text-2xl font-bold text-blue-600">0</p>
            </div>
            <div class="bg-green-50 rounded-lg p-4">
                <p class="text-sm text-gray-600">Approved Permissions for this session date</p>
                <p id="approved_permissions" class="text-2xl font-bold text-green-600">0</p>
            </div>
        </div>
        
        <!-- User Search -->
        <div class="mb-3">
            <label for="session_user_search" class="sr-only">Search users</label>
            <div class="relative max-w-sm">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input id="session_user_search" type="search" placeholder="Search user..."
                       oninput="filterSessionUsers()"
                       class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
            </div>
        </div>

        <!-- Members Table -->
        <div class="overflow-x-auto">
            <table class="w-full border">
                <thead class="bg-gray-50 border-b">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">USER</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PERMISSION</th>
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">PRESENT</th>
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">ON TIME</th>
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">COMMUNICATED</th>
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">DISCIPLINE</th>
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">TOTAL POINTS</th>
                    </tr>
                </thead>
                <tbody id="session_members_body">
                    <tr>
                        <td colspan="7" class="text-center py-12 text-gray-500">
                            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                            <p>Loading...</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button type="button" onclick="closeModal('sessionDetailsModal')" class="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Close
            </button>
            <button id="complete_session_btn" onclick="completeSession()" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 hidden">
                Complete Session
            </button>
            <button id="save_session_btn" onclick="saveSessionChanges()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Save Changes
            </button>
        </div>
    </div>
</div>

<script>
let currentSessionData = null;

function viewSessionDetails(date, sessionType) {
    document.getElementById('sessionDetailsModal').classList.remove('hidden');
    document.getElementById('session_modal_title').textContent = sessionType;
    document.getElementById('session_info').textContent = `Session for: ${date}`;
    document.getElementById('session_user_search').value = '';
    
    fetch(`/discipline/attendance/session/${date}/${encodeURIComponent(sessionType)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentSessionData = data;
            
            document.getElementById('total_users').textContent = data.total_users;
            document.getElementById('approved_permissions').textContent = data.approved_permissions;
            
            if (data.is_completed) {
                document.getElementById('session_completed_warning').classList.remove('hidden');
                document.getElementById('complete_session_btn').classList.add('hidden');
                document.getElementById('save_session_btn').classList.add('hidden');
            } else {
                document.getElementById('session_completed_warning').classList.add('hidden');
                document.getElementById('complete_session_btn').classList.remove('hidden');
                document.getElementById('save_session_btn').classList.remove('hidden');
                document.getElementById('save_session_btn').disabled = false;
            }
            
            renderMembersTable(data.members, data.is_completed);
        }
    });
}

function renderMembersTable(members, isCompleted) {
    const tbody = document.getElementById('session_members_body');
    
    if (!members || members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-12 text-gray-500">No members found</td></tr>';
        return;
    }
    
    tbody.innerHTML = members.map(member => {
        const permissionText = member.has_permission ? member.permission_reason : 'No approved permission';
        const permissionClass = member.has_permission ? 'text-yellow-600' : 'text-gray-400';
        const searchableName = String(member.user_name || '').toLowerCase();
        
        if (isCompleted) {
            // Read-only display for completed sessions
            return `
                <tr class="border-b hover:bg-gray-50" data-user-name="${escapeHtml(searchableName)}">
                    <td class="px-4 py-3 text-sm text-gray-800">${escapeHtml(member.user_name)}</td>
                    <td class="px-4 py-3 text-sm ${permissionClass}">${escapeHtml(permissionText)}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="${member.present ? 'text-green-600' : 'text-red-500'}">
                            ${member.present ? 'Yes' : 'No'}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="${member.on_time ? 'text-green-600' : 'text-red-500'}">
                            ${member.on_time ? 'Yes' : 'No'}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="${member.communicated ? 'text-green-600' : 'text-red-500'}">
                            ${member.communicated ? 'Yes' : 'No'}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="${member.discipline ? 'text-green-600' : 'text-red-500'}">
                            ${member.discipline ? 'Yes' : 'No'}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center font-bold ${member.total_points >= 3 ? 'text-green-600' : 'text-yellow-600'}">
                        ${member.total_points}
                    </td>
                </tr>
            `;
        } else {
            // Editable display for active sessions
            return `
                <tr class="border-b hover:bg-gray-50" data-user-id="${member.user_id}" data-user-name="${escapeHtml(searchableName)}">
                    <td class="px-4 py-3 text-sm text-gray-800">${escapeHtml(member.user_name)}</td>
                    <td class="px-4 py-3 text-sm ${permissionClass}">${escapeHtml(permissionText)}</td>
                    <td class="px-4 py-3 text-center">
                        ${renderYesNoToggle('present', member.user_id, member.permission?.status === 'approved' ? false : (member.has_attendance ? member.present : true))}
                    </td>
                    <td class="px-4 py-3 text-center">
                        ${renderYesNoToggle('ontime', member.user_id, member.has_attendance ? member.on_time : true)}
                    </td>
                    <td class="px-4 py-3 text-center">
                        ${renderYesNoToggle('communicated', member.user_id, member.has_attendance ? member.communicated : true)}
                    </td>
                    <td class="px-4 py-3 text-center">
                        ${renderYesNoToggle('discipline', member.user_id, member.has_attendance ? member.discipline : true)}
                    </td>
                    <td class="px-4 py-3 text-center font-bold points-display-${member.user_id} ${member.total_points >= 3 ? 'text-green-600' : 'text-yellow-600'}">
                        ${member.total_points}
                    </td>
                </tr>
            `;
        }
    }).join('') + `
        <tr id="session_user_search_empty" class="hidden">
            <td colspan="7" class="text-center py-8 text-sm text-gray-500">No users match your search.</td>
        </tr>
    `;
    
    if (!isCompleted) {
        document.querySelectorAll('#session_members_body .attendance-toggle').forEach(button => {
            button.addEventListener('click', function() {
                if (this.disabled) return;
                setToggleValue(this.closest('tr'), this.dataset.field, this.dataset.value === 'true');
                updatePoints(this.dataset.userId);
            });
        });
    }

    filterSessionUsers();
}

function renderYesNoToggle(field, userId, value, disabled = false) {
    const activeClass = value ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-700 text-white border-gray-700';
    const disabledAttrs = disabled ? 'disabled aria-disabled="true"' : '';
    const disabledClass = disabled ? ' opacity-50 cursor-not-allowed' : '';
    const label = value ? 'Yes' : 'No';

    return `
        <button type="button" class="attendance-toggle ${field}-toggle inline-flex items-center justify-center px-3 py-1 text-xs font-semibold border rounded-md ${activeClass}${disabledClass}" data-field="${field}" data-user-id="${userId}" data-value="${value ? 'true' : 'false'}" ${disabledAttrs}>${label}</button>
    `;
}

function setToggleValue(row, field, value) {
    const toggle = row.querySelector(`[data-field="${field}"][data-value]`);
    if (!toggle) return;

    toggle.dataset.value = value ? 'true' : 'false';
    toggle.textContent = value ? 'Yes' : 'No';
    toggle.className = [
        'attendance-toggle',
        `${field}-toggle`,
        'inline-flex items-center justify-center px-3 py-1 text-xs font-semibold border rounded-md',
        value ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-700 text-white border-gray-700',
        toggle.disabled ? 'opacity-50 cursor-not-allowed' : ''
    ].join(' ');
}

function getToggleValue(row, field) {
    return row.querySelector(`[data-field="${field}"][data-value]`)?.dataset.value === 'true';
}

function filterSessionUsers() {
    const searchInput = document.getElementById('session_user_search');
    const query = (searchInput?.value || '').trim().toLowerCase();
    const rows = document.querySelectorAll('#session_members_body tr[data-user-name]');
    let visibleCount = 0;

    rows.forEach(row => {
        const matches = !query || row.dataset.userName.includes(query);
        row.classList.toggle('hidden', !matches);
        if (matches) visibleCount++;
    });

    const noResultsRow = document.getElementById('session_user_search_empty');
    if (noResultsRow) {
        noResultsRow.classList.toggle('hidden', visibleCount > 0 || rows.length === 0);
    }
}

function updatePoints(userId) {
    const row = document.querySelector(`#session_members_body tr[data-user-id="${userId}"]`);
    if (!row) return;

    const present = getToggleValue(row, 'present');
    const onTime = getToggleValue(row, 'ontime');
    const communicated = getToggleValue(row, 'communicated');
    const discipline = getToggleValue(row, 'discipline');
    
    let points = 0;
    if (present) points++;
    if (onTime) points++;
    if (communicated) points++;
    if (discipline) points++;
    
    const pointsDisplay = document.querySelector(`.points-display-${userId}`);
    pointsDisplay.textContent = points;
    pointsDisplay.className = `px-4 py-3 text-center font-bold points-display-${userId} ${points >= 3 ? 'text-green-600' : 'text-yellow-600'}`;
}

function saveSessionChanges() {
    if (!currentSessionData) return;
    
    const records = [];
    const rows = document.querySelectorAll('#session_members_body tr[data-user-id]');
    
    rows.forEach(row => {
        const userId = row.dataset.userId;
        const present = getToggleValue(row, 'present');
        const onTime = getToggleValue(row, 'ontime');
        const communicated = getToggleValue(row, 'communicated');
        const discipline = getToggleValue(row, 'discipline');
        
        let status = 'absent';
        if (present) {
            status = onTime ? 'present' : 'late';
        }
        
        records.push({
            user_id: userId,
            status: status,
            late_minutes: (!onTime && present) ? 15 : 0,
            on_time: onTime,
            communicated: communicated,
            discipline_points: discipline ? 1 : 0
        });
    });
    
    fetch('/discipline/attendance/bulk-update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
            session_date: currentSessionData.date,
            session_type: currentSessionData.session_type,
            records: records
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            disciplineAlert('Changes saved successfully!');
            viewSessionDetails(currentSessionData.date, currentSessionData.session_type);
            filterAttendance();
        } else {
            disciplineAlert('Error: ' + data.message);
        }
    });
}

async function completeSession() {
    if (!currentSessionData) return;
    
    if (await disciplineConfirm('Are you sure you want to complete this session? This will lock all attendance records and prevent further edits.', 'Complete session', 'Complete', 'Cancel', 'danger')) {
        fetch('/discipline/attendance/complete-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                session_date: currentSessionData.date,
                session_type: currentSessionData.session_type
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                disciplineAlert('Session completed successfully!');
                viewSessionDetails(currentSessionData.date, currentSessionData.session_type);
                filterAttendance();
            } else {
                disciplineAlert('Error: ' + data.message);
            }
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
</script>

