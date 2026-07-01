<div>
    <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-800">Attendance Report</h3>
        <p class="text-sm text-gray-500 mt-0.5">Analytics and statistics for attendance records</p>
    </div>
    
    <!-- Filters - All on one line -->
    <div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div class="flex flex-wrap items-end gap-3">
            <!-- Time Period -->
            <div class="flex-1 min-w-[140px]">
                <label class="block text-xs font-medium text-gray-600 mb-1">Time Period</label>
                <select id="attendanceTimePeriod" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500">
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">This Month</option>
                    <option value="quarter">Last 3 Months</option>
                    <option value="year">Last 12 Months</option>
                    <option value="custom">Custom Range</option>
                </select>
            </div>
            
            <!-- Start Date -->
            <div id="attendanceStartDateContainer" class="flex-1 min-w-[140px]" style="display: none;">
                <label class="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input type="date" id="attendanceStartDate" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500">
            </div>
            
            <!-- End Date -->
            <div id="attendanceEndDateContainer" class="flex-1 min-w-[140px]" style="display: none;">
                <label class="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                <input type="date" id="attendanceEndDate" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500">
            </div>
            
            <!-- Session Type -->
            <div class="flex-1 min-w-[140px]">
                <label class="block text-xs font-medium text-gray-600 mb-1">Session Type</label>
                <select id="attendanceSessionType" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500">
                    <option value="all">All Sessions</option>
                </select>
            </div>
            
            <!-- Status Filter -->
            <div class="flex-1 min-w-[120px]">
                <label class="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select id="attendanceStatusFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500">
                    <option value="all">All Statuses</option>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                    <option value="excused">Excused</option>
                </select>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex gap-2">
                <button onclick="loadAttendanceReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2">
                    <i class="fas fa-chart-line text-xs"></i> Generate
                </button>
                <button onclick="exportAttendanceCSV()" class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm transition flex items-center gap-2">
                    <i class="fas fa-file-csv text-xs"></i> Export
                </button>
                <button onclick="resetAttendanceFilters()" class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg text-sm transition">
                    <i class="fas fa-undo-alt"></i>
                </button>
            </div>
        </div>
    </div>
    
    <!-- Loading State -->
    <div id="attendanceLoadingState" class="text-center py-12">
        <div class="inline-flex items-center gap-3 text-gray-500">
            <svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading attendance data...</span>
        </div>
    </div>
    
    <!-- Report Content -->
    <div id="attendanceReportContent" style="display: none;">
        <!-- Summary Statistics Cards -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Total Sessions</p>
                        <p class="text-2xl font-semibold text-gray-800 mt-1" id="attStatTotalSessions">0</p>
                    </div>
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-calendar-alt text-gray-500 text-sm"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Present</p>
                        <p class="text-2xl font-semibold text-green-600 mt-1" id="attStatPresent">0</p>
                    </div>
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-check-circle text-green-500 text-sm"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Late</p>
                        <p class="text-2xl font-semibold text-yellow-600 mt-1" id="attStatLate">0</p>
                    </div>
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-clock text-yellow-500 text-sm"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Absent</p>
                        <p class="text-2xl font-semibold text-red-600 mt-1" id="attStatAbsent">0</p>
                    </div>
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-times-circle text-red-500 text-sm"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Avg. Attendance Rate</p>
                        <p class="text-2xl font-semibold text-blue-600 mt-1" id="attStatRate">0%</p>
                    </div>
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-percentage text-blue-500 text-sm"></i>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Attendance Breakdown -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <!-- Status Distribution -->
            <div class="bg-white rounded-lg border border-gray-200 p-5">
                <h4 class="font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-chart-pie text-gray-400 text-sm"></i> Attendance Status Distribution
                </h4>
                <div id="attStatusDistribution" class="space-y-3">
                    <div class="text-center py-4 text-gray-400 text-sm">Loading data...</div>
                </div>
            </div>
            
            <!-- Top Sessions -->
            <div class="bg-white rounded-lg border border-gray-200 p-5">
                <h4 class="font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-calendar-check text-gray-400 text-sm"></i> Top Sessions by Attendance
                </h4>
                <div id="attTopSessions" class="space-y-3 max-h-64 overflow-y-auto">
                    <div class="text-center py-4 text-gray-400 text-sm">Loading data...</div>
                </div>
            </div>
        </div>
        
        <!-- Attendance Trend -->
        <div class="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <h4 class="font-medium text-gray-800 mb-4 flex items-center gap-2">
                <i class="fas fa-chart-line text-gray-400 text-sm"></i> Attendance Trend
            </h4>
            <div class="relative h-64">
                <canvas id="attendanceChart"></canvas>
            </div>
        </div>
        
        <!-- Sessions Table -->
        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-200 bg-gray-50">
                <h4 class="font-medium text-gray-800">Sessions List</h4>
                <p class="text-xs text-gray-500 mt-0.5" id="attSessionsCount">Showing 0 sessions</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Late</th>
                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Excused</th>
                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                        </tr>
                    </thead>
                    <tbody id="attSessionsTableBody" class="divide-y divide-gray-100">
                        <tr><td colspan="7" class="px-4 py-8 text-center text-gray-400 text-sm">Loading sessions...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<script>
let attendanceChart = null;
let attendanceData = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setAttendanceDefaultDates();
    loadAttendanceSessionTypes();
    loadAttendanceReport();
});

function setAttendanceDefaultDates() {
    const today = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
    
    document.getElementById('attendanceStartDate').value = formatDateForInput(startDate);
    document.getElementById('attendanceEndDate').value = formatDateForInput(today);
}

// Time period change handler
document.getElementById('attendanceTimePeriod').addEventListener('change', function() {
    const period = this.value;
    const startContainer = document.getElementById('attendanceStartDateContainer');
    const endContainer = document.getElementById('attendanceEndDateContainer');
    const startInput = document.getElementById('attendanceStartDate');
    const endInput = document.getElementById('attendanceEndDate');
    const today = new Date();
    
    if (period === 'custom') {
        startContainer.style.display = 'block';
        endContainer.style.display = 'block';
        return;
    } else {
        startContainer.style.display = 'none';
        endContainer.style.display = 'none';
    }
    
    let start = new Date();
    let end = new Date();
    
    switch(period) {
        case 'today':
            start = new Date(today);
            end = new Date(today);
            break;
        case 'week':
            start = new Date(today);
            start.setDate(start.getDate() - 7);
            end = new Date(today);
            break;
        case 'month':
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today);
            break;
        case 'quarter':
            start = new Date(today);
            start.setMonth(start.getMonth() - 3);
            end = new Date(today);
            break;
        case 'year':
            start = new Date(today);
            start.setFullYear(start.getFullYear() - 1);
            end = new Date(today);
            break;
        default:
            start = new Date(today);
            start.setMonth(start.getMonth() - 11);
            start.setDate(1);
            end = new Date(today);
    }
    
    startInput.value = formatDateForInput(start);
    endInput.value = formatDateForInput(end);
});

async function loadAttendanceSessionTypes() {
    try {
        const response = await fetch('/discipline/attendance', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const data = await response.json();
        
        if (data.success && data.session_types) {
            const select = document.getElementById('attendanceSessionType');
            select.innerHTML = '<option value="all">All Sessions</option>';
            data.session_types.forEach(type => {
                select.innerHTML += `<option value="${type.session_type}">${type.session_type}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading session types:', error);
    }
}

async function loadAttendanceReport() {
    const startDate = document.getElementById('attendanceStartDate').value;
    const endDate = document.getElementById('attendanceEndDate').value;
    const sessionType = document.getElementById('attendanceSessionType').value;
    const status = document.getElementById('attendanceStatusFilter').value;
    
    document.getElementById('attendanceLoadingState').style.display = 'block';
    document.getElementById('attendanceReportContent').style.display = 'none';
    
    try {
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            session_type: sessionType !== 'all' ? sessionType : '',
            status: status !== 'all' ? status : ''
        });
        
        const response = await fetch(`/discipline/attendance?${params.toString()}`, {
            headers: { 
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            attendanceData = data.attendances || [];
            renderAttendanceReport(attendanceData);
            
            document.getElementById('attendanceLoadingState').style.display = 'none';
            document.getElementById('attendanceReportContent').style.display = 'block';
        } else {
            throw new Error(data.message || 'Failed to load attendance data');
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('attendanceLoadingState').innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                <div class="flex items-center gap-3">
                    <i class="fas fa-exclamation-triangle text-red-500 text-lg"></i>
                    <div class="flex-1">
                        <p class="text-red-700 font-medium text-sm">Error loading attendance</p>
                        <p class="text-red-600 text-xs mt-0.5">${error.message}</p>
                    </div>
                    <button onclick="location.reload()" class="text-red-600 hover:text-red-700 text-sm underline">Retry</button>
                </div>
            </div>
        `;
    }
}

function renderAttendanceReport(attendances) {
    // Group by session
    const sessions = {};
    let totalPresent = 0, totalLate = 0, totalAbsent = 0, totalExcused = 0;
    
    attendances.forEach(att => {
        const key = `${att.session_date}|${att.session_type}`;
        if (!sessions[key]) {
            sessions[key] = {
                date: att.session_date,
                session: att.session_type,
                present: 0,
                late: 0,
                absent: 0,
                excused: 0,
                total: 0
            };
        }
        sessions[key].total++;
        if (att.status === 'present') { sessions[key].present++; totalPresent++; }
        else if (att.status === 'late') { sessions[key].late++; totalLate++; }
        else if (att.status === 'absent') { sessions[key].absent++; totalAbsent++; }
        else if (att.status === 'excused') { sessions[key].excused++; totalExcused++; }
    });
    
    const sessionList = Object.values(sessions);
    const totalRecords = attendances.length;
    
    // Update stats
    document.getElementById('attStatTotalSessions').textContent = sessionList.length;
    document.getElementById('attStatPresent').textContent = totalPresent;
    document.getElementById('attStatLate').textContent = totalLate;
    document.getElementById('attStatAbsent').textContent = totalAbsent;
    const rate = totalRecords > 0 ? Math.round(((totalPresent + totalLate) / totalRecords) * 100) : 0;
    document.getElementById('attStatRate').textContent = rate + '%';
    
    // Update status distribution
    const total = totalPresent + totalLate + totalAbsent + totalExcused;
    if (total > 0) {
        const statusHtml = `
            <div>
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">Present</span>
                    <span class="font-medium text-gray-800">${totalPresent} (${Math.round((totalPresent/total)*100)}%)</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                    <div class="bg-green-500 h-1.5 rounded-full" style="width: ${(totalPresent/total)*100}%"></div>
                </div>
            </div>
            <div>
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">Late</span>
                    <span class="font-medium text-gray-800">${totalLate} (${Math.round((totalLate/total)*100)}%)</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                    <div class="bg-yellow-500 h-1.5 rounded-full" style="width: ${(totalLate/total)*100}%"></div>
                </div>
            </div>
            <div>
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">Absent</span>
                    <span class="font-medium text-gray-800">${totalAbsent} (${Math.round((totalAbsent/total)*100)}%)</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                    <div class="bg-red-500 h-1.5 rounded-full" style="width: ${(totalAbsent/total)*100}%"></div>
                </div>
            </div>
            <div>
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">Excused</span>
                    <span class="font-medium text-gray-800">${totalExcused} (${Math.round((totalExcused/total)*100)}%)</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                    <div class="bg-gray-500 h-1.5 rounded-full" style="width: ${(totalExcused/total)*100}%"></div>
                </div>
            </div>
        `;
        document.getElementById('attStatusDistribution').innerHTML = statusHtml;
    } else {
        document.getElementById('attStatusDistribution').innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">No data available</div>';
    }
    
    // Update top sessions
    const sortedSessions = sessionList.sort((a, b) => (b.present + b.late) - (a.present + a.late)).slice(0, 5);
    if (sortedSessions.length > 0) {
        const topHtml = sortedSessions.map(s => {
            const rate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
            return `
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-gray-600">${s.session} (${formatDate(s.date)})</span>
                        <span class="font-medium text-gray-800">${rate}%</span>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5">
                        <div class="bg-blue-500 h-1.5 rounded-full" style="width: ${rate}%"></div>
                    </div>
                </div>
            `;
        }).join('');
        document.getElementById('attTopSessions').innerHTML = topHtml;
    } else {
        document.getElementById('attTopSessions').innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">No sessions available</div>';
    }
    
    // Update table
    if (sessionList.length > 0) {
        const tableHtml = sessionList.map(s => {
            const rate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
            const rateColor = rate >= 75 ? 'text-green-600' : (rate >= 50 ? 'text-yellow-600' : 'text-red-600');
            return `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-4 py-3 text-sm text-gray-600">${formatDate(s.date)}</td>
                    <td class="px-4 py-3 text-sm font-medium text-gray-800">${escapeHtml(s.session)}</td>
                    <td class="px-4 py-3 text-center text-sm font-semibold text-green-600">${s.present}</td>
                    <td class="px-4 py-3 text-center text-sm font-semibold text-yellow-600">${s.late}</td>
                    <td class="px-4 py-3 text-center text-sm text-red-500">${s.absent}</td>
                    <td class="px-4 py-3 text-center text-sm text-gray-500">${s.excused}</td>
                    <td class="px-4 py-3 text-center">
                        <span class="text-sm font-semibold ${rateColor}">${rate}%</span>
                    </td>
                </tr>
            `;
        }).join('');
        document.getElementById('attSessionsTableBody').innerHTML = tableHtml;
        document.getElementById('attSessionsCount').textContent = `Showing ${sessionList.length} sessions`;
    } else {
        document.getElementById('attSessionsTableBody').innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400 text-sm">No sessions found</td></tr>';
        document.getElementById('attSessionsCount').textContent = 'Showing 0 sessions';
    }
    
    // Initialize chart
    initAttendanceChart(sessionList);
}

function initAttendanceChart(sessions) {
    const canvas = document.getElementById('attendanceChart');
    if (!canvas) return;
    
    if (attendanceChart) {
        attendanceChart.destroy();
    }
    
    const labels = sessions.map(s => s.session + ' (' + formatDate(s.date) + ')');
    const presentData = sessions.map(s => s.present);
    const lateData = sessions.map(s => s.late);
    const absentData = sessions.map(s => s.absent);
    
    const ctx = canvas.getContext('2d');
    attendanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Present',
                    data: presentData,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Late',
                    data: lateData,
                    backgroundColor: 'rgba(234, 179, 8, 0.7)',
                    borderColor: 'rgba(234, 179, 8, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Absent',
                    data: absentData,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + ' users';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f0f0f0', drawBorder: false },
                    ticks: { stepSize: 1, color: '#9ca3af', font: { size: 11 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { size: 10 }, maxRotation: 45, minRotation: 45 }
                }
            }
        }
    });
}

function exportAttendanceCSV() {
    if (!attendanceData || attendanceData.length === 0) {
        appAlert('No data to export. Please generate the report first.');
        return;
    }
    
    const startDate = document.getElementById('attendanceStartDate').value;
    const endDate = document.getElementById('attendanceEndDate').value;
    
    // Build CSV
    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    csv += 'Date,Session,User,Status\n';
    
    attendanceData.forEach(att => {
        csv += `${att.session_date},${att.session_type},${att.user_name || 'Unknown'},${att.status}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${startDate}_to_${endDate}.csv`;
    link.click();
}

function resetAttendanceFilters() {
    document.getElementById('attendanceTimePeriod').value = 'all';
    document.getElementById('attendanceSessionType').value = 'all';
    document.getElementById('attendanceStatusFilter').value = 'all';
    
    const today = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
    
    document.getElementById('attendanceStartDate').value = formatDateForInput(startDate);
    document.getElementById('attendanceEndDate').value = formatDateForInput(today);
    document.getElementById('attendanceStartDateContainer').style.display = 'none';
    document.getElementById('attendanceEndDateContainer').style.display = 'none';
    
    loadAttendanceReport();
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
</script>
