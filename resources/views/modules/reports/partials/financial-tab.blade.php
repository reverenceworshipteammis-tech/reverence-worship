<div>
    <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-800">Financial Report</h3>
        <p class="text-sm text-gray-500 mt-0.5">Comprehensive financial overview including contributions, expenses, and sponsors</p>
    </div>
    
    <!-- Filters -->
    <div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div class="flex flex-wrap items-end gap-3">
            <!-- Year Filter -->
            <div class="flex-1 min-w-[140px]">
                <label class="block text-xs font-medium text-gray-600 mb-1">Year</label>
                <select id="financialYear" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500">
                    <option value="">All Years</option>
                </select>
            </div>
            
            <!-- Period Filter -->
            <div class="flex-1 min-w-[140px]">
                <label class="block text-xs font-medium text-gray-600 mb-1">Period</label>
                <select id="financialPeriod" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500">
                    <option value="yearly">Yearly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex gap-2">
                <button onclick="loadFinancialReport()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition flex items-center gap-2">
                    <i class="fas fa-chart-line text-xs"></i> Generate
                </button>
                <button onclick="exportFinancialCSV()" class="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm transition flex items-center gap-2">
                    <i class="fas fa-file-csv text-xs"></i> Export
                </button>
            </div>
        </div>
    </div>
    
    <!-- Loading State -->
    <div id="financialLoadingState" class="text-center py-12">
        <div class="inline-flex items-center gap-3 text-gray-500">
            <svg class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading financial data...</span>
        </div>
    </div>
    
    <!-- Report Content -->
    <div id="financialReportContent" style="display: none;">
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Total Revenue</p>
                        <p class="text-2xl font-semibold text-green-600 mt-1" id="finTotalRevenue">RWF 0</p>
                    </div>
                    <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-arrow-up text-green-500 text-sm"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Total Expenses</p>
                        <p class="text-2xl font-semibold text-red-600 mt-1" id="finTotalExpenses">RWF 0</p>
                    </div>
                    <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-arrow-down text-red-500 text-sm"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Net Balance</p>
                        <p class="text-2xl font-semibold text-blue-600 mt-1" id="finNetBalance">RWF 0</p>
                    </div>
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-wallet text-blue-500 text-sm"></i>
                    </div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-xs text-gray-500 uppercase tracking-wide">Collection Rate</p>
                        <p class="text-2xl font-semibold text-purple-600 mt-1" id="finCollectionRate">0%</p>
                    </div>
                    <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-percentage text-purple-500 text-sm"></i>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Charts Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="bg-white rounded-lg border border-gray-200 p-5">
                <h4 class="font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-chart-pie text-gray-400 text-sm"></i> Revenue vs Expenses
                </h4>
                <div class="relative h-64">
                    <canvas id="revenueExpenseChart"></canvas>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-5">
                <h4 class="font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-chart-bar text-gray-400 text-sm"></i> Monthly Trend
                </h4>
                <div class="relative h-64">
                    <canvas id="monthlyTrendChart"></canvas>
                </div>
            </div>
        </div>
        
        <!-- Income Breakdown -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="bg-white rounded-lg border border-gray-200 p-5">
                <h4 class="font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-hand-holding-usd text-gray-400 text-sm"></i> Income Breakdown
                </h4>
                <div id="incomeBreakdown" class="space-y-3">
                    <div class="text-center py-4 text-gray-400 text-sm">Loading data...</div>
                </div>
            </div>
            <div class="bg-white rounded-lg border border-gray-200 p-5">
                <h4 class="font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <i class="fas fa-credit-card text-gray-400 text-sm"></i> Expense Breakdown
                </h4>
                <div id="expenseBreakdown" class="space-y-3 max-h-64 overflow-y-auto">
                    <div class="text-center py-4 text-gray-400 text-sm">Loading data...</div>
                </div>
            </div>
        </div>
        
        <!-- Detailed Table -->
        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-200 bg-gray-50">
                <h4 class="font-medium text-gray-800">Financial Summary</h4>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Contributions</th>
                            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sponsors</th>
                            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gifts</th>
                            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
                        </tr>
                    </thead>
                    <tbody id="financialTableBody" class="divide-y divide-gray-100">
                        <tr><td colspan="6" class="px-4 py-8 text-center text-gray-400 text-sm">Loading data...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<script>
let revenueExpenseChart = null;
let monthlyTrendChart = null;
let financialData = null;

// Populate years
function populateFinancialYears() {
    const select = document.getElementById('financialYear');
    const currentYear = new Date().getFullYear();
    
    select.innerHTML = '<option value="">All Years</option>';
    for (let year = currentYear + 5; year >= 2020; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + (year === currentYear ? ' (Current)' : '');
        select.appendChild(option);
    }
}

// Load financial report - UPDATED URL
function loadFinancialReport() {
    const year = document.getElementById('financialYear').value;
    const period = document.getElementById('financialPeriod').value;
    
    document.getElementById('financialLoadingState').style.display = 'block';
    document.getElementById('financialReportContent').style.display = 'none';
    
    // FIXED: Use the correct route from reports.php
    const url = `/reports/finance/data?year=${year}&period=${period}`;
    console.log('Fetching financial data from:', url);
    
    fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Financial data received:', data);
        if (data.success) {
            financialData = data;
            renderFinancialReport(data);
            document.getElementById('financialLoadingState').style.display = 'none';
            document.getElementById('financialReportContent').style.display = 'block';
        } else {
            throw new Error(data.message || 'Failed to load financial data');
        }
    })
    .catch(error => {
        console.error('Error loading financial data:', error);
        document.getElementById('financialLoadingState').innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                <div class="flex items-center gap-3">
                    <i class="fas fa-exclamation-triangle text-red-500 text-lg"></i>
                    <div class="flex-1">
                        <p class="text-red-700 font-medium text-sm">Error loading financial data</p>
                        <p class="text-red-600 text-xs mt-0.5">${error.message}</p>
                        <p class="text-red-500 text-xs mt-1">Please check that the report routes are properly configured.</p>
                    </div>
                    <button onclick="loadFinancialReport()" class="text-red-600 hover:text-red-700 text-sm underline">Retry</button>
                </div>
            </div>
        `;
    });
}

function renderFinancialReport(data) {
    // Update summary cards
    const totalRevenue = data.summary?.total_revenue || 0;
    const totalExpenses = data.summary?.total_expenses || 0;
    const netBalance = totalRevenue - totalExpenses;
    const collectionRate = data.summary?.collection_rate || 0;
    
    document.getElementById('finTotalRevenue').textContent = 'RWF ' + totalRevenue.toLocaleString();
    document.getElementById('finTotalExpenses').textContent = 'RWF ' + totalExpenses.toLocaleString();
    document.getElementById('finNetBalance').textContent = 'RWF ' + netBalance.toLocaleString();
    document.getElementById('finCollectionRate').textContent = collectionRate + '%';
    
    // Render charts
    initRevenueExpenseChart(data);
    initMonthlyTrendChart(data);
    
    // Render breakdowns
    renderIncomeBreakdown(data);
    renderExpenseBreakdown(data);
    
    // Render table
    renderFinancialTable(data);
}

function initRevenueExpenseChart(data) {
    const canvas = document.getElementById('revenueExpenseChart');
    if (!canvas) return;
    
    if (revenueExpenseChart) {
        revenueExpenseChart.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    revenueExpenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Contributions', 'Sponsors', 'Gifts', 'Expenses'],
            datasets: [{
                data: [
                    data.summary?.total_contributions || 0,
                    data.summary?.total_sponsors || 0,
                    data.summary?.total_gifts || 0,
                    data.summary?.total_expenses || 0
                ],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                            return context.label + ': RWF ' + context.parsed.toLocaleString() + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

function initMonthlyTrendChart(data) {
    const canvas = document.getElementById('monthlyTrendChart');
    if (!canvas) return;
    
    if (monthlyTrendChart) {
        monthlyTrendChart.destroy();
    }
    
    const months = data.monthly_data?.months || [];
    const revenues = data.monthly_data?.revenues || [];
    const expenses = data.monthly_data?.expenses || [];
    
    const ctx = canvas.getContext('2d');
    monthlyTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Revenue',
                    data: revenues,
                    backgroundColor: 'rgba(34, 197, 94, 0.7)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Expenses',
                    data: expenses,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                    borderRadius: 4
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
                            return context.dataset.label + ': RWF ' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f0f0f0', drawBorder: false },
                    ticks: { 
                        color: '#9ca3af', 
                        font: { size: 11 },
                        callback: function(value) { return 'RWF ' + value.toLocaleString(); }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { size: 10 } }
                }
            }
        }
    });
}

function renderIncomeBreakdown(data) {
    const container = document.getElementById('incomeBreakdown');
    const breakdown = data.income_breakdown || {};
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    
    if (total === 0) {
        container.innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">No income data available</div>';
        return;
    }
    
    const items = [
        { key: 'contributions', label: 'Contributions', color: 'bg-green-500' },
        { key: 'sponsors', label: 'Sponsors', color: 'bg-blue-500' },
        { key: 'gifts', label: 'Gifts', color: 'bg-purple-500' },
        { key: 'other', label: 'Other Income', color: 'bg-yellow-500' }
    ];
    
    container.innerHTML = items.map(item => {
        const value = breakdown[item.key] || 0;
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
        return `
            <div>
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600">${item.label}</span>
                    <span class="font-medium text-gray-800">RWF ${value.toLocaleString()} (${percentage}%)</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                    <div class="${item.color} h-1.5 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderExpenseBreakdown(data) {
    const container = document.getElementById('expenseBreakdown');
    const breakdown = data.expense_breakdown || {};
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    
    if (total === 0) {
        container.innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">No expense data available</div>';
        return;
    }
    
    const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-gray-500'];
    
    container.innerHTML = sorted.map(([category, amount], index) => {
        const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
        const color = colors[index % colors.length];
        return `
            <div>
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-600 capitalize">${category}</span>
                    <span class="font-medium text-gray-800">RWF ${amount.toLocaleString()} (${percentage}%)</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                    <div class="${color} h-1.5 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderFinancialTable(data) {
    const tbody = document.getElementById('financialTableBody');
    const tableData = data.table_data || [];
    
    if (!tableData.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400 text-sm">No financial data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = tableData.map(row => `
        <tr class="hover:bg-gray-50 transition">
            <td class="px-4 py-3 text-sm font-medium text-gray-800">${row.category}</td>
            <td class="px-4 py-3 text-right text-sm text-green-600">RWF ${(row.contributions || 0).toLocaleString()}</td>
            <td class="px-4 py-3 text-right text-sm text-blue-600">RWF ${(row.sponsors || 0).toLocaleString()}</td>
            <td class="px-4 py-3 text-right text-sm text-purple-600">RWF ${(row.gifts || 0).toLocaleString()}</td>
            <td class="px-4 py-3 text-right text-sm text-red-600">RWF ${(row.expenses || 0).toLocaleString()}</td>
            <td class="px-4 py-3 text-right text-sm font-semibold ${(row.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}">
                RWF ${(row.net || 0).toLocaleString()}
            </td>
        </tr>
    `).join('');
}

function exportFinancialCSV() {
    if (!financialData) {
        appAlert('Please generate the report first');
        return;
    }
    
    const year = document.getElementById('financialYear').value || 'all';
    const period = document.getElementById('financialPeriod').value;
    
    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    csv += 'Category,Contributions,Sponsors,Gifts,Expenses,Net\n';
    
    const tableData = financialData.table_data || [];
    tableData.forEach(row => {
        csv += `${row.category},${row.contributions || 0},${row.sponsors || 0},${row.gifts || 0},${row.expenses || 0},${row.net || 0}\n`;
    });
    
    // Add summary row
    csv += `\nSUMMARY,${financialData.summary?.total_contributions || 0},${financialData.summary?.total_sponsors || 0},${financialData.summary?.total_gifts || 0},${financialData.summary?.total_expenses || 0},${(financialData.summary?.total_revenue || 0) - (financialData.summary?.total_expenses || 0)}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financial_report_${year}_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

// Event listeners
document.getElementById('financialYear').addEventListener('change', loadFinancialReport);
document.getElementById('financialPeriod').addEventListener('change', loadFinancialReport);

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    populateFinancialYears();
    loadFinancialReport();
});
</script>
