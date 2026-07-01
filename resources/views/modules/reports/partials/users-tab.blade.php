<div>
    <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-800">Users Report</h3>
        <p class="text-sm text-gray-500 mt-0.5">Analytics and statistics for all users</p>
    </div>
    
    <!-- Filters - All on one line -->
    <div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div class="flex flex-wrap items-end gap-3">
            <!-- Report Type -->
            <div class="flex-1 min-w-[140px]">
                <label class="block text-xs font-medium text-gray-600 mb-1">Report Type</label>
                <select id="reportType" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500">
                    <option value="full">Full Report</option>
                    <option value="summary">Summary Only</option>
                    <option value="users">Users List Only</option>
                    <option value="stats">Statistics Only</option>
                </select>
            </div>
            
            <!-- Time Period -->
            <div class="flex-1 min-w-[140px]">
                <label class="block text-xs font-medium text-gray-600 mb-1">Time Period</label>
                <select id="timePeriod" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500">
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="quarter">Last 3 Months</option>
                    <option value="year">Last 12 Months</option>
                    <option value="custom">Custom Range</option>
                </select>
            </div>
            
            <!-- Start Date -->
            <div id="startDateContainer" class="flex-1 min-w-[140px]" style="display: none;">
                <label class="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input type="date" id="startDate" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500">
            </div>
            
            <!-- End Date -->
            <div id="endDateContainer" class="flex-1 min-w-[140px]" style="display: none;">
                <label class="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                <input type="date" id="endDate" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500">
            </div>
            
            <!-- Status Filter -->
            <div class="flex-1 min-w-[120px]">
                <label class="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select id="statusFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500">
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                </select>
            </div>
            
            <!-- Role Filter -->
            <div class="flex-1 min-w-[140px]">
                <label class="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select id="roleFilter" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500">
                    <option value="all">All Roles</option>
                </select>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex gap-2">
                <button onclick="loadReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2">
                    <i class="fas fa-chart-line text-xs"></i> Generate
                </button>
                <div class="relative group">
                    <button class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm transition flex items-center gap-2">
                        <i class="fas fa-download text-xs"></i> Export
                        <i class="fas fa-chevron-down text-xs"></i>
                    </button>
                    <div class="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:block z-10">
                        <button onclick="exportCSV()" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg flex items-center gap-2">
                            <i class="fas fa-file-csv text-green-600 text-xs"></i> CSV
                        </button>
                        <button onclick="exportPDF()" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg flex items-center gap-2">
                            <i class="fas fa-file-pdf text-red-600 text-xs"></i> PDF
                        </button>
                    </div>
                </div>
                <button onclick="resetFilters()" class="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg text-sm transition">
                    <i class="fas fa-undo-alt"></i>
                </button>
            </div>
        </div>
    </div>
    
    <!-- Loading State -->
    <div id="loadingState" class="text-center py-12">
        <div class="inline-flex items-center gap-3 text-gray-500">
            <svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading report data...</span>
        </div>
    </div>
    
    <!-- Report Content -->
    <div id="reportContent" style="display: none;">
        <!-- Summary Statistics Cards -->
        <div id="statsSection" class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Total Users</p>
                        <p class="text-2xl font-semibold text-gray-800 mt-1" id="statTotal">0</p>
                    </div>
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-users text-gray-500 text-sm"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Active</p>
                        <p class="text-2xl font-semibold text-gray-800 mt-1" id="statActive">0</p>
                    </div>
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-check-circle text-gray-500 text-sm"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Inactive</p>
                        <p class="text-2xl font-semibold text-gray-800 mt-1" id="statInactive">0</p>
                    </div>
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-user-slash text-gray-500 text-sm"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Pending</p>
                        <p class="text-2xl font-semibold text-gray-800 mt-1" id="statPending">0</p>
                    </div>
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-clock text-gray-500 text-sm"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">New This Period</p>
                        <p class="text-2xl font-semibold text-gray-800 mt-1" id="statNewPeriod">0</p>
                    </div>
                    <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-user-plus text-gray-500 text-sm"></i>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Gender Distribution - Male/Female Only -->
        <div id="statsOnlySection" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="bg-white rounded-lg border border-gray-200 p-5">
                <h4 class="font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-venus-mars text-gray-400 text-sm"></i> Gender Distribution
                </h4>
                <div class="grid grid-cols-2 gap-4 text-center">
                    <div class="p-4 bg-gray-50 rounded-lg">
                        <p class="text-3xl font-bold text-blue-600" id="genderMale">0</p>
                        <p class="text-sm text-gray-600 mt-1">Male</p>
                        <p class="text-sm text-gray-400" id="genderMalePercent">0%</p>
                    </div>
                    <div class="p-4 bg-gray-50 rounded-lg">
                        <p class="text-3xl font-bold text-pink-500" id="genderFemale">0</p>
                        <p class="text-sm text-gray-600 mt-1">Female</p>
                        <p class="text-sm text-gray-400" id="genderFemalePercent">0%</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white rounded-lg border border-gray-200 p-5">
                <h4 class="font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-tags text-gray-400 text-sm"></i> Role Distribution
                </h4>
                <div id="roleDistribution" class="space-y-3 max-h-64 overflow-y-auto">
                    <div class="text-center py-4 text-gray-400 text-sm">Loading roles...</div>
                </div>
            </div>
        </div>
        
        <!-- Users Table -->
        <div id="usersSection" class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-200 bg-gray-50">
                <h4 class="font-medium text-gray-800">Users List</h4>
                <p class="text-xs text-gray-500 mt-0.5" id="usersCount">Showing 0 users</p>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody" class="divide-y divide-gray-100">
                        <tr><td colspan="5" class="px-4 py-8 text-center text-gray-400 text-sm">Loading users...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

<script>
let currentReportType = 'full';
let currentReportData = null;
let allRoles = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setDefaultDates();
    loadRoles();
    loadReport();
});

function setDefaultDates() {
    const today = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
    
    document.getElementById('startDate').value = formatDateForInput(startDate);
    document.getElementById('endDate').value = formatDateForInput(today);
}

async function loadRoles() {
    try {
        const response = await fetch('/reports/users/roles', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const data = await response.json();
        
        if (data.success) {
            allRoles = data.roles;
            const roleSelect = document.getElementById('roleFilter');
            roleSelect.innerHTML = '<option value="all">All Roles</option>';
            allRoles.forEach(role => {
                roleSelect.innerHTML += `<option value="${role.id}">${role.display_name || role.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading roles:', error);
    }
}

// Time period change handler
document.getElementById('timePeriod').addEventListener('change', function() {
    const period = this.value;
    const startDateContainer = document.getElementById('startDateContainer');
    const endDateContainer = document.getElementById('endDateContainer');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const today = new Date();
    
    if (period === 'custom') {
        startDateContainer.style.display = 'block';
        endDateContainer.style.display = 'block';
        return;
    } else {
        startDateContainer.style.display = 'none';
        endDateContainer.style.display = 'none';
    }
    
    let start = new Date();
    let end = new Date();
    
    switch(period) {
        case 'today':
            start = new Date(today);
            end = new Date(today);
            break;
        case 'yesterday':
            start = new Date(today);
            start.setDate(start.getDate() - 1);
            end = new Date(start);
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
        case 'lastMonth':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
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
    
    startDateInput.value = formatDateForInput(start);
    endDateInput.value = formatDateForInput(end);
});

document.getElementById('reportType').addEventListener('change', function() {
    currentReportType = this.value;
    toggleReportSections(currentReportType);
});

function toggleReportSections(type) {
    const statsSection = document.getElementById('statsSection');
    const statsOnlySection = document.getElementById('statsOnlySection');
    const usersSection = document.getElementById('usersSection');
    
    switch(type) {
        case 'summary':
            if (statsSection) statsSection.style.display = 'grid';
            if (statsOnlySection) statsOnlySection.style.display = 'none';
            if (usersSection) usersSection.style.display = 'none';
            break;
        case 'users':
            if (statsSection) statsSection.style.display = 'none';
            if (statsOnlySection) statsOnlySection.style.display = 'none';
            if (usersSection) usersSection.style.display = 'block';
            break;
        case 'stats':
            if (statsSection) statsSection.style.display = 'grid';
            if (statsOnlySection) statsOnlySection.style.display = 'grid';
            if (usersSection) usersSection.style.display = 'none';
            break;
        default:
            if (statsSection) statsSection.style.display = 'grid';
            if (statsOnlySection) statsOnlySection.style.display = 'grid';
            if (usersSection) usersSection.style.display = 'block';
    }
}

async function loadReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const status = document.getElementById('statusFilter').value;
    const role = document.getElementById('roleFilter').value;
    
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('reportContent').style.display = 'none';
    
    try {
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            status: status,
            role: role
        });
        
        const response = await fetch(`/reports/users/data?${params.toString()}`, {
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
            currentReportData = data;
            
            // Update stats cards
            document.getElementById('statTotal').textContent = data.stats.total || 0;
            document.getElementById('statActive').textContent = data.stats.active || 0;
            document.getElementById('statInactive').textContent = data.stats.inactive || 0;
            document.getElementById('statPending').textContent = data.stats.pending || 0;
            document.getElementById('statNewPeriod').textContent = data.stats.newThisMonth || data.stats.newThisPeriod || 0;
            
            // Update gender stats (Male/Female only)
            const maleCount = data.stats.male || 0;
            const femaleCount = data.stats.female || 0;
            const totalMaleFemale = maleCount + femaleCount;
            const malePercent = totalMaleFemale > 0 ? Math.round((maleCount / totalMaleFemale) * 100) : 0;
            const femalePercent = totalMaleFemale > 0 ? Math.round((femaleCount / totalMaleFemale) * 100) : 0;
            
            document.getElementById('genderMale').textContent = maleCount;
            document.getElementById('genderMalePercent').textContent = malePercent + '%';
            document.getElementById('genderFemale').textContent = femaleCount;
            document.getElementById('genderFemalePercent').textContent = femalePercent + '%';
            
            // Update role distribution
            const total = data.stats.total || 0;
            if (data.topRoles && data.topRoles.length > 0) {
                const roleHtml = data.topRoles.map(role => `
                    <div>
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-gray-600">${escapeHtml(role.display_name || role.name)}</span>
                            <span class="font-medium text-gray-800">${role.count} users</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-1.5">
                            <div class="bg-purple-500 h-1.5 rounded-full" style="width: ${(role.count / total) * 100}%"></div>
                        </div>
                    </div>
                `).join('');
                document.getElementById('roleDistribution').innerHTML = roleHtml;
            } else {
                document.getElementById('roleDistribution').innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">No role data available</div>';
            }
            
            // Update users table - FIXED: Use recentUsers instead of users
            const usersList = data.recentUsers || [];
            if (usersList.length > 0) {
                const usersHtml = usersList.map(user => `
                    <tr class="hover:bg-gray-50 transition">
                        <td class="px-4 py-3 text-sm font-medium text-gray-800">${escapeHtml(user.name)}</td>
                        <td class="px-4 py-3 text-sm text-gray-500">${escapeHtml(user.email)}</td>
                        <td class="px-4 py-3">
                            <span class="inline-flex px-2 py-0.5 text-xs rounded-full ${user.role !== 'No Role' ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-400'}">
                                ${escapeHtml(user.role)}
                            </span>
                        </td>
                        <td class="px-4 py-3">
                            ${user.is_active ? 
                                '<span class="inline-flex px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700">Active</span>' : 
                                '<span class="inline-flex px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-700">Inactive</span>'}
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500">${formatDate(user.created_at)}</td>
                    </tr>
                `).join('');
                document.getElementById('usersTableBody').innerHTML = usersHtml;
                document.getElementById('usersCount').textContent = `Showing ${usersList.length} users`;
            } else {
                document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-400 text-sm">No users found</td></tr>';
                document.getElementById('usersCount').textContent = 'Showing 0 users';
            }
            
            toggleReportSections(currentReportType);
            
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('reportContent').style.display = 'block';
        } else {
            throw new Error(data.message || 'Failed to load report');
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loadingState').innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                <div class="flex items-center gap-3">
                    <i class="fas fa-exclamation-triangle text-red-500 text-lg"></i>
                    <div class="flex-1">
                        <p class="text-red-700 font-medium text-sm">Error loading report</p>
                        <p class="text-red-600 text-xs mt-0.5">${error.message}</p>
                    </div>
                    <button onclick="location.reload()" class="text-red-600 hover:text-red-700 text-sm underline">Retry</button>
                </div>
            </div>
        `;
    }
}

function resetFilters() {
    document.getElementById('timePeriod').value = 'all';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('roleFilter').value = 'all';
    document.getElementById('reportType').value = 'full';
    
    const today = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
    
    document.getElementById('startDate').value = formatDateForInput(startDate);
    document.getElementById('endDate').value = formatDateForInput(today);
    document.getElementById('startDateContainer').style.display = 'none';
    document.getElementById('endDateContainer').style.display = 'none';
    
    loadReport();
}

function exportCSV() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const status = document.getElementById('statusFilter').value;
    const role = document.getElementById('roleFilter').value;
    const reportType = document.getElementById('reportType').value;
    window.location.href = `/reports/users/export?start_date=${startDate}&end_date=${endDate}&status=${status}&role=${role}&format=csv&type=${reportType}`;
}

async function exportPDF() {
    if (!currentReportData) {
        appAlert('Please generate the report first');
        return;
    }
    
    const exportBtn = event.target.closest('button');
    const originalHtml = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
    exportBtn.disabled = true;
    
    try {
        const pdfContent = document.createElement('div');
        pdfContent.style.padding = '20px';
        pdfContent.style.fontFamily = 'Arial, sans-serif';
        pdfContent.style.backgroundColor = 'white';
        
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const reportType = document.getElementById('reportType').value;
        
        pdfContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6;">
                <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Users Report</h1>
                <p style="color: #6b7280; margin: 5px 0 0;">Generated on: ${new Date().toLocaleString()}</p>
                <p style="color: #6b7280; margin: 0;">Period: ${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}</p>
            </div>
        `;
        
        if (reportType !== 'users') {
            pdfContent.innerHTML += `
                <div style="margin-bottom: 30px;">
                    <h2 style="color: #374151; font-size: 18px; margin-bottom: 15px;">Statistics Summary</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Metric</th>
                            <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Count</th>
                        </tr>
                        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Total Users</td><td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${currentReportData.stats.total}</td></tr>
                        <tr style="background-color: #f9fafb;"><td style="padding: 8px; border: 1px solid #e5e7eb;">Active Users</td><td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${currentReportData.stats.active}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Inactive Users</td><td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${currentReportData.stats.inactive}</td></tr>
                        <tr style="background-color: #f9fafb;"><td style="padding: 8px; border: 1px solid #e5e7eb;">Pending Users</td><td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${currentReportData.stats.pending}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #e5e7eb;">Male</td><td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${currentReportData.stats.male || 0}</td></tr>
                        <tr style="background-color: #f9fafb;"><td style="padding: 8px; border: 1px solid #e5e7eb;">Female</td><td style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">${currentReportData.stats.female || 0}</td></tr>
                    </table>
                </div>
            `;
        }
        
        if (reportType !== 'stats' && currentReportData.users && currentReportData.users.length > 0) {
            pdfContent.innerHTML += `
                <div>
                    <h2 style="color: #374151; font-size: 18px; margin-bottom: 15px;">Users List</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="background-color: #f3f4f6;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Name</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Email</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Role</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Status</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Registered</th>
                        </tr>
                        ${currentReportData.users.map(user => `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(user.name)}</td>
                                <td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(user.email)}</td>
                                <td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(user.role)}</td>
                                <td style="padding: 8px; border: 1px solid #e5e7eb;">${user.is_active ? 'Active' : 'Inactive'}</td>
                                <td style="padding: 8px; border: 1px solid #e5e7eb;">${formatDate(user.created_at)}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            `;
        }
        
        pdfContent.innerHTML += `
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
                <p>${document.querySelector('meta[name="app-name"]')?.content || 'Reverence Worship'} - System Generated Report</p>
            </div>
        `;
        
        const opt = {
            margin: [0.5, 0.5, 0.5, 0.5],
            filename: `users_report_${new Date().toISOString().slice(0, 19)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, letterRendering: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
        };
        
        await html2pdf().set(opt).from(pdfContent).save();
        
    } catch (error) {
        console.error('PDF generation error:', error);
        appAlert('Error generating PDF. Please try again.');
    } finally {
        exportBtn.innerHTML = originalHtml;
        exportBtn.disabled = false;
    }
}

function formatDateForDisplay(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
