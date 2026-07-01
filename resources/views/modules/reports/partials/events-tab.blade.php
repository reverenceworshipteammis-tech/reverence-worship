<div>
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-800">Event Reports</h3>
        <button onclick="openEventModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
            <i class="fas fa-plus mr-2"></i> Add Event
        </button>
    </div>
    
    <!-- Filters -->
    <div class="bg-gray-50 rounded-lg p-4 mb-4">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <select id="eventReportType" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="all">All Types</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" id="eventStartDate" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" id="eventEndDate" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="eventStatus" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="all">All Statuses</option>
                    <option value="planned">Planned</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select id="eventCategory" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="all">All Categories</option>
                    <option value="worship">Worship</option>
                    <option value="conference">Conference</option>
                    <option value="training">Training</option>
                    <option value="fellowship">Fellowship</option>
                    <option value="outreach">Outreach</option>
                </select>
            </div>
        </div>
        <div class="flex justify-end gap-3 mt-4">
            <button onclick="exportReport('events', 'csv')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm">
                <i class="fas fa-file-excel mr-2"></i> Export Excel
            </button>
            <button onclick="exportReport('events', 'pdf')" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm">
                <i class="fas fa-file-pdf mr-2"></i> Export PDF
            </button>
            <button onclick="filterEventsReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm">
                <i class="fas fa-search mr-2"></i> Apply Filters
            </button>
        </div>
    </div>
    
    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-blue-50 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-blue-600" id="eventTotalCount">0</p>
            <p class="text-xs text-gray-600">Total Events</p>
        </div>
        <div class="bg-green-50 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-green-600" id="eventCompletedCount">0</p>
            <p class="text-xs text-gray-600">Completed</p>
        </div>
        <div class="bg-yellow-50 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-yellow-600" id="eventOngoingCount">0</p>
            <p class="text-xs text-gray-600">Ongoing</p>
        </div>
        <div class="bg-purple-50 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-purple-600" id="eventParticipantsCount">0</p>
            <p class="text-xs text-gray-600">Total Participants</p>
        </div>
    </div>
    
    <!-- Events Table -->
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participants</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody id="eventsTableBody">
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">Loading events...</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<script>
function loadEventsReport() {
    filterEventsReport();
}

function filterEventsReport() {
    const reportType = document.getElementById('eventReportType')?.value || 'all';
    const startDate = document.getElementById('eventStartDate')?.value || '';
    const endDate = document.getElementById('eventEndDate')?.value || '';
    const status = document.getElementById('eventStatus')?.value || 'all';
    const category = document.getElementById('eventCategory')?.value || 'all';
    
    fetch(`/reports/events?type=${reportType}&start_date=${startDate}&end_date=${endDate}&status=${status}&category=${category}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateEventsTable(data.reports);
            updateEventSummary(data.summary);
        }
    })
    .catch(error => console.error('Error:', error));
}

function updateEventsTable(events) {
    const tbody = document.getElementById('eventsTableBody');
    
    if (!events || events.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">No events found</td></tr>';
        return;
    }
    
    tbody.innerHTML = events.map(event => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-4 py-3 text-sm font-medium text-gray-800">${escapeHtml(event.title)}</td>
            <td class="px-4 py-3 text-sm">${formatDate(event.event_date)}</td>
            <td class="px-4 py-3 text-sm capitalize">${event.category || '-'}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 rounded-full text-xs ${getEventStatusClass(event.status)}">
                    ${event.status || 'Planned'}
                </span>
            </td>
            <td class="px-4 py-3 text-sm">${event.participants_count || 0}</td>
            <td class="px-4 py-3">
                <button onclick="viewEventDetails(${event.id})" class="text-blue-500 hover:text-blue-700 mr-2">
                    <i class="fas fa-file-lines"></i>
                </button>
                <button onclick="editEvent(${event.id})" class="text-green-500 hover:text-green-700 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteEvent(${event.id})" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function updateEventSummary(summary) {
    document.getElementById('eventTotalCount').textContent = summary.total || 0;
    document.getElementById('eventCompletedCount').textContent = summary.completed || 0;
    document.getElementById('eventOngoingCount').textContent = summary.ongoing || 0;
    document.getElementById('eventParticipantsCount').textContent = summary.total_participants || 0;
}

function getEventStatusClass(status) {
    switch(status) {
        case 'completed': return 'bg-green-100 text-green-700';
        case 'ongoing': return 'bg-yellow-100 text-yellow-700';
        case 'cancelled': return 'bg-red-100 text-red-700';
        default: return 'bg-blue-100 text-blue-700';
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

function openEventModal() {
    // Implement modal opening
    appAlert('Add event modal - coming soon');
}

function viewEventDetails(id) {
    window.location.href = `/reports/events/${id}`;
}

function editEvent(id) {
    window.location.href = `/reports/events/${id}/edit`;
}

async function deleteEvent(id) {
    if (!(await appConfirm('Are you sure you want to delete this event?'))) {
        fetch(`/reports/events/${id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                filterEventsReport();
                appAlert('Event deleted successfully');
            } else {
                appAlert('Error: ' + data.message);
            }
        });
    }
}

function exportReport(type, format) {
    appAlert(`Export ${type} report as ${format}`);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
</script>


