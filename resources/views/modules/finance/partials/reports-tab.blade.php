<div>
    
    <!-- Reports Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <!-- Member Contributions -->
        <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition">
            <div class="p-5">
                <div class="flex items-start justify-between">
                    <div>
                        <h4 class="font-semibold text-gray-800 text-lg">Member Contributions</h4>
                        <p class="text-sm text-gray-500 mt-1">Detailed contribution reports with term breakdown</p>
                    </div>
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-hand-holding-usd text-blue-600 text-lg"></i>
                    </div>
                </div>
                <div class="mt-4 flex justify-end">
                    <button onclick="generateReport('contributions')" class="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                        Generate <i class="fas fa-arrow-right text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Payment Records -->
        <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition">
            <div class="p-5">
                <div class="flex items-start justify-between">
                    <div>
                        <h4 class="font-semibold text-gray-800 text-lg">Payment Records</h4>
                        <p class="text-sm text-gray-500 mt-1">Complete payment transaction history</p>
                    </div>
                    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-credit-card text-green-600 text-lg"></i>
                    </div>
                </div>
                <div class="mt-4 flex justify-end">
                    <button onclick="generateReport('payments')" class="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1">
                        Generate <i class="fas fa-arrow-right text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Gift Reports -->
        <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition">
            <div class="p-5">
                <div class="flex items-start justify-between">
                    <div>
                        <h4 class="font-semibold text-gray-800 text-lg">Gift Reports</h4>
                        <p class="text-sm text-gray-500 mt-1">Detailed reports for gift contributions only</p>
                    </div>
                    <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-gift text-purple-600 text-lg"></i>
                    </div>
                </div>
                <div class="mt-4 flex justify-end">
                    <button onclick="generateReport('gifts')" class="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1">
                        Generate <i class="fas fa-arrow-right text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Sponsor Report -->
        <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition">
            <div class="p-5">
                <div class="flex items-start justify-between">
                    <div>
                        <h4 class="font-semibold text-gray-800 text-lg">Sponsor Report</h4>
                        <p class="text-sm text-gray-500 mt-1">Detailed reports for sponsor fund contributions</p>
                    </div>
                    <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-users text-yellow-600 text-lg"></i>
                    </div>
                </div>
                <div class="mt-4 flex justify-end">
                    <button onclick="generateReport('sponsors')" class="text-yellow-600 hover:text-yellow-800 text-sm font-medium flex items-center gap-1">
                        Generate <i class="fas fa-arrow-right text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Sponsor & Gift Report -->
        <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition">
            <div class="p-5">
                <div class="flex items-start justify-between">
                    <div>
                        <h4 class="font-semibold text-gray-800 text-lg">Sponsor & Gift Report</h4>
                        <p class="text-sm text-gray-500 mt-1">Comprehensive report combining both sponsor funds and gifts</p>
                    </div>
                    <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-chart-pie text-indigo-600 text-lg"></i>
                    </div>
                </div>
                <div class="mt-4 flex justify-end">
                    <button onclick="generateReport('sponsors-gifts')" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                        Generate <i class="fas fa-arrow-right text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Expenses Report -->
        <div class="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition">
            <div class="p-5">
                <div class="flex items-start justify-between">
                    <div>
                        <h4 class="font-semibold text-gray-800 text-lg">Expenses Report</h4>
                        <p class="text-sm text-gray-500 mt-1">Detailed report of all recorded expenses</p>
                    </div>
                    <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-receipt text-red-600 text-lg"></i>
                    </div>
                </div>
                <div class="mt-4 flex justify-end">
                    <button onclick="generateReport('expenses')" class="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1">
                        Generate <i class="fas fa-arrow-right text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    
    
    <!-- Report Preview Modal -->
    <div id="reportPreviewModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-xl rounded-2xl bg-white">
            <div class="flex justify-between items-center pb-4 border-b">
                <h3 id="reportPreviewTitle" class="text-xl font-bold text-gray-800">Report Preview</h3>
                <div class="flex gap-3">
                    <button onclick="exportReportToPDF()" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
                        <i class="fas fa-file-pdf"></i> Export PDF
                    </button>
                    <button onclick="exportReportToCSV()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
                        <i class="fas fa-file-excel"></i> Export CSV
                    </button>
                    <button onclick="closeModal('reportPreviewModal')" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
            </div>
            <div id="reportPreviewContent" class="mt-4 max-h-96 overflow-y-auto">
                <!-- Report content will be loaded here -->
            </div>
            <div class="flex justify-end mt-6 pt-4 border-t">
                <button onclick="closeModal('reportPreviewModal')" class="px-5 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition">
                    Close
                </button>
            </div>
        </div>
    </div>
</div>

<script>
let currentReportData = null;

function generateReport(type) {
    fetch(`/finance/reports/${type}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('reportPreviewTitle').innerHTML = data.title;
            document.getElementById('reportPreviewContent').innerHTML = data.html;
            currentReportData = data;
            document.getElementById('reportPreviewModal').classList.remove('hidden');
        } else {
            appAlert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error loading report: ' + error.message);
    });
}

function exportReportToPDF() {
    const title = document.getElementById('reportPreviewTitle').textContent;
    const content = document.getElementById('reportPreviewContent').innerHTML;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
                    th { background-color: #f3f4f6; }
                    .summary { background-color: #f8fafc; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
                </style>
            </head>
            <body>${content}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function exportReportToCSV() {
    if (!currentReportData || !currentReportData.csv) {
        appAlert('No data to export');
        return;
    }
    
    const blob = new Blob(["\uFEFF" + currentReportData.csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentReportData.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
</script>
