<div>
    <!-- Discipline Session Modal -->
    <div id="disciplineSessionModal" class="fixed inset-0 z-[100] overflow-y-auto hidden">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="fixed inset-0 bg-gray-900 bg-opacity-50" onclick="closeDisciplineSessionModal()"></div>
            <div class="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
                <div class="flex justify-between items-center px-6 py-4 border-b">
                    <h3 id="disciplineSessionModalTitle" class="text-lg font-semibold text-gray-800">Record Discipline</h3>
                    <button onclick="closeDisciplineSessionModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <!-- Session Info -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Session Date *</label>
                            <input type="date" id="ds_session_date" value="{{ date('Y-m-d') }}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Session Title *</label>
                            <input type="text" id="ds_session_title" placeholder="e.g., Sunday Service, Bible Study" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>

                    <!-- Members Table -->
                    <div class="border rounded-lg overflow-hidden">
                        <div class="bg-gray-50 px-4 py-2 border-b">
                            <div class="flex justify-between items-center">
                                <span class="text-sm font-medium text-gray-700">Members Discipline</span>
                                <div class="flex gap-2">
                                    <button type="button" onclick="setAllDisciplineBehaviour('good')" class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">All Good</button>
                                    <button type="button" onclick="setAllDisciplineBehaviour('bad')" class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">All Bad</button>
                                </div>
                            </div>
                            <!-- Search Box -->
                            <div class="mt-2">
                                <div class="relative">
                                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                                    <input type="text" id="ds_search" placeholder="Search member by name or email..." class="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" onkeyup="filterDisciplineMembers()">
                                </div>
                            </div>
                        </div>
                        <div class="max-h-96 overflow-y-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-white border-b sticky top-0">
                                    <tr>
                                        <th class="px-4 py-2 text-left">Member</th>
                                        <th class="px-4 py-2 text-center w-28">Behaviour</th>
                                        <th class="px-4 py-2 text-left">Description</th>
                                        <th class="px-4 py-2 text-center w-16">Points</th>
                                    </tr>
                                </thead>
                                <tbody id="ds_members_table">
                                    <tr>
                                        <td colspan="4" class="text-center py-8 text-gray-400">
                                            <i class="fas fa-spinner fa-spin text-xl"></i>
                                            <p class="mt-1">Loading members...</p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button onclick="closeDisciplineSessionModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancel</button>
                    <button onclick="saveDisciplineSession()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fas fa-save mr-1"></i> Save Records
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// ==================== DISCIPLINE SESSION STATE ====================
var __dsMembers = [];
var __dsRecords = {};

// ==================== OPEN / CLOSE ====================
function openDisciplineSessionModal(presetDate) {
    document.getElementById('ds_session_date').value = presetDate || new Date().toISOString().split('T')[0];
    document.getElementById('ds_session_title').value = presetDate ? 'Discipline Session - ' + presetDate : '';
    document.getElementById('ds_search').value = '';
    document.getElementById('disciplineSessionModalTitle').textContent = 'Record Discipline';
    loadDisciplineMembers();
    document.getElementById('disciplineSessionModal').classList.remove('hidden');
}

function closeDisciplineSessionModal() {
    document.getElementById('disciplineSessionModal').classList.add('hidden');
}

// Expose globally for buttons to call
window.openDisciplineSession = openDisciplineSessionModal;
window.openDisciplineRecordModal = function(recordId, presetDate) {
    if (recordId) {
        fetch('/discipline/records/' + recordId + '/edit', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                document.getElementById('ds_session_date').value = data.record.created_at ? data.record.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
                document.getElementById('ds_session_title').value = data.record.title;
                document.getElementById('ds_search').value = '';
                document.getElementById('disciplineSessionModalTitle').textContent = 'Edit Discipline Record';
                loadDisciplineMembers(function() {
                    if (__dsRecords[data.record.user_id]) {
                        __dsRecords[data.record.user_id].behaviour = data.record.type === 'positive' ? 'good' : 'bad';
                        __dsRecords[data.record.user_id].description = data.record.description || '';
                        __dsRecords[data.record.user_id].points = data.record.points || 0;
                    }
                    renderDisciplineMembers();
                });
                document.getElementById('disciplineSessionModal').classList.remove('hidden');
            }
        });
    } else {
        openDisciplineSessionModal(presetDate);
    }
};

// ==================== LOAD MEMBERS ====================
function loadDisciplineMembers(callback) {
    fetch('/users/list', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success && data.users) {
            __dsMembers = data.users;
            __dsRecords = {};
            __dsMembers.forEach(function(m) {
                __dsRecords[m.id] = { behaviour: 'good', description: 'Good', points: 1 };
            });
            renderDisciplineMembers();
            if (callback) callback();
        }
    })
    .catch(function(err) {
        console.error('Error loading members:', err);
        document.getElementById('ds_members_table').innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">Failed to load members</td></tr>';
    });
}

// ==================== RENDER TABLE ====================
function renderDisciplineMembers() {
    var query = (document.getElementById('ds_search').value || '').toLowerCase().trim();
    var filtered = query ? __dsMembers.filter(function(m) {
        return (m.name || '').toLowerCase().includes(query) || (m.email || '').toLowerCase().includes(query);
    }) : __dsMembers;
    
    var html = '';
    filtered.forEach(function(member) {
        var rec = __dsRecords[member.id] || { behaviour: 'good', description: 'Good', points: 1 };
        var isGood = rec.behaviour === 'good';
        html += '<tr class="border-b hover:bg-gray-50">';
        html += '<td class="px-4 py-2 font-medium text-gray-800">' + escapeHtml(member.name) + '</td>';
        html += '<td class="px-4 py-2 text-center">';
        html += '<select onchange="onDisciplineBehaviourChange(' + member.id + ', this.value)" class="w-full px-2 py-1 border border-gray-300 rounded text-sm">';
        html += '<option value="good"' + (isGood ? ' selected' : '') + '>Good</option>';
        html += '<option value="bad"' + (!isGood ? ' selected' : '') + '>Bad</option>';
        html += '</select>';
        html += '</td>';
        html += '<td class="px-4 py-2">';
        html += '<input type="text" value="' + escapeHtml(rec.description) + '" ' + (isGood ? 'readonly' : '') + ' onchange="__dsRecords[' + member.id + '].description = this.value" placeholder="' + (isGood ? 'Good' : 'Enter description...') + '" class="w-full px-2 py-1 border border-gray-300 rounded text-sm' + (isGood ? ' bg-gray-100' : '') + '">';
        html += '</td>';
        html += '<td class="px-4 py-2 text-center">';
        html += '<span class="font-semibold ' + (isGood ? 'text-green-600' : 'text-red-600') + '">' + rec.points + '</span>';
        html += '</td>';
        html += '</tr>';
    });
    
    if (filtered.length === 0) {
        html = '<tr><td colspan="4" class="text-center py-8 text-gray-400">No members found matching your search</td></tr>';
    }
    
    document.getElementById('ds_members_table').innerHTML = html;
}

// ==================== FILTER ====================
function filterDisciplineMembers() {
    renderDisciplineMembers();
}

// ==================== BEHAVIOUR CHANGE ====================
function onDisciplineBehaviourChange(memberId, behaviour) {
    var rec = __dsRecords[memberId];
    if (!rec) return;
    rec.behaviour = behaviour;
    if (behaviour === 'good') {
        rec.description = 'Good';
        rec.points = 1;
    } else {
        rec.description = '';
        rec.points = 0;
    }
    renderDisciplineMembers();
}

// ==================== SET ALL ====================
function setAllDisciplineBehaviour(behaviour) {
    for (var id in __dsRecords) {
        __dsRecords[id].behaviour = behaviour;
        if (behaviour === 'good') {
            __dsRecords[id].description = 'Good';
            __dsRecords[id].points = 1;
        } else {
            __dsRecords[id].description = '';
            __dsRecords[id].points = 0;
        }
    }
    renderDisciplineMembers();
}

// ==================== SAVE ====================
function saveDisciplineSession() {
    var title = document.getElementById('ds_session_title').value;
    var date = document.getElementById('ds_session_date').value;
    
    if (!title) {
        disciplineAlert('Please enter a session title');
        return;
    }
    
    var records = [];
    for (var userId in __dsRecords) {
        records.push({
            user_id: parseInt(userId),
            behaviour: __dsRecords[userId].behaviour,
            description: __dsRecords[userId].description,
            points: __dsRecords[userId].points
        });
    }
    
    fetch('/discipline/records/bulk', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ date: date, title: title, records: records })
    })
    .then(function(r) { return r.json(); })
    .then(function(result) {
        if (result.success) {
            closeDisciplineSessionModal();
            if (typeof window.filterDisciplineRecords === 'function') {
                window.filterDisciplineRecords();
            }
            disciplineAlert('Discipline records saved successfully');
        } else {
            disciplineAlert(result.message || 'Failed to save records');
        }
    })
    .catch(function(err) {
        console.error('Error saving:', err);
        disciplineAlert('An error occurred while saving');
    });
}

// ==================== HELPER ====================
function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
</script>
