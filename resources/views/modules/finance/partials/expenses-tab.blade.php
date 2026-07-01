<div>
    <!-- Header with Date Range -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-4">
        <h3 class="text-base font-semibold text-gray-800">Expenses</h3>
        <div class="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-end">
            <div class="min-w-0">
                <label for="filterStartDate" class="block text-xs font-medium text-gray-600 mb-1">From</label>
                <input type="date" id="filterStartDate" value="{{ date('Y-01-01') }}"
                    class="h-9 sm:h-8 w-full min-w-0 px-2 py-0 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="min-w-0">
                <label for="filterEndDate" class="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input type="date" id="filterEndDate" value="{{ date('Y-12-31') }}"
                    class="h-9 sm:h-8 w-full min-w-0 px-2 py-0 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <button onclick="window.expensesManager.openExpenseModal()" class="col-span-2 h-9 sm:h-8 sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-0 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm transition">
                <i class="fas fa-plus-circle"></i> New Expense
            </button>
        </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 max-w-4xl">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</p>
                    <p class="text-lg font-bold text-gray-800" id="totalExpenses">RWF 0</p>
                </div>
                <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <i class="fas fa-chart-line text-blue-500 text-sm"></i>
                </div>
            </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</p>
                    <p class="text-lg font-bold text-yellow-600" id="pendingExpenses">RWF 0</p>
                </div>
                <div class="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <i class="fas fa-clock text-yellow-500 text-sm"></i>
                </div>
            </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</p>
                    <p class="text-lg font-bold text-green-600" id="approvedExpenses">RWF 0</p>
                </div>
                <div class="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <i class="fas fa-check-circle text-green-500 text-sm"></i>
                </div>
            </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-medium text-gray-500 uppercase tracking-wider">This Month</p>
                    <p class="text-lg font-bold text-purple-600" id="monthlyExpenses">RWF 0</p>
                </div>
                <div class="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                    <i class="fas fa-calendar-alt text-purple-500 text-sm"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4 max-w-xl">
        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</label>
                <select id="filterStatus" class="w-full h-8 px-2 py-0 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs">
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Approver</label>
                <select id="filterApprover" class="w-full h-8 px-2 py-0 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs">
                    <option value="all">All Approvers</option>
                </select>
            </div>
        </div>
        <div class="flex justify-end mt-2">
            <button onclick="window.expensesManager.resetFilters()" class="text-gray-500 hover:text-gray-700 text-xs transition flex items-center gap-1">
                <i class="fas fa-undo text-xs"></i> Reset
            </button>
        </div>
    </div>

    <!-- Expenses Table -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="expenses-responsive-table overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">DATE</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">REASON</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">AMOUNT</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">STATUS</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">APPROVER</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ACTIONS</th>
                    </tr>
                </thead>
                <tbody id="expenses-table-body">
                    <tr>
                        <td colspan="7" class="px-3 py-8 text-center text-gray-500">
                            <i class="fas fa-spinner fa-spin text-lg mb-2 block"></i>
                            <p>Loading expenses...</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>



<script>
// ============================================
// EXPENSES MANAGER
// ============================================

(function() {
    'use strict';

    const state = {
        currentYear: new Date().getFullYear(),
        isLoading: false,
        initialized: false,
        allUsers: @json($users ?? [])
    };

    const DOM = { get: (id) => document.getElementById(id) };

    // ============================================
    // APPROVER SEARCH
    // ============================================

   function searchApprovers(index) {
    const searchInput = DOM.get(`approverSearch${index}`);
    const resultsDiv = DOM.get(`approverSearchResults${index}`);
    
    // Return early if elements don't exist
    if (!searchInput || !resultsDiv) return;
    
    const term = searchInput.value?.toLowerCase() || '';
    
    if (term.length < 1) {
        resultsDiv.classList.add('hidden');
        return;
    }

    const filtered = state.allUsers.filter(u => 
        u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term)
    );

    resultsDiv.innerHTML = filtered.length ? filtered.map(u => `
        <div class="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0" 
             data-id="${u.id}" data-name="${escapeHtml(u.name)}" data-email="${escapeHtml(u.email)}">
            <div class="font-medium text-gray-800">${escapeHtml(u.name)}</div>
            <div class="text-xs text-gray-500">${escapeHtml(u.email)}</div>
        </div>
    `).join('') : '<div class="p-3 text-center text-gray-500">No users found</div>';
    
    resultsDiv.querySelectorAll('[data-id]').forEach(el => {
        el.addEventListener('click', () => {
            selectApprover(index, el.dataset.id, el.dataset.name);
        });
    });
    resultsDiv.classList.remove('hidden');
}

    function selectApprover(index, id, name) {
    const idField = DOM.get(`approverId${index}`);
    const nameDisplay = DOM.get(`selectedApproverName${index}`);
    const displayDiv = DOM.get(`selectedApproverDisplay${index}`);
    const searchInput = DOM.get(`approverSearch${index}`);
    const resultsDiv = DOM.get(`approverSearchResults${index}`);
    
    // Only proceed if elements exist
    if (idField) idField.value = id;
    if (nameDisplay) nameDisplay.innerHTML = name;
    if (displayDiv) displayDiv.classList.remove('hidden');
    if (searchInput) searchInput.value = '';
    if (resultsDiv) resultsDiv.classList.add('hidden');
}

    function clearApprover(index) {
    const idField = DOM.get(`approverId${index}`);
    const displayDiv = DOM.get(`selectedApproverDisplay${index}`);
    const searchInput = DOM.get(`approverSearch${index}`);
    
    // Only try to set if elements exist
    if (idField) idField.value = '';
    if (displayDiv) displayDiv.classList.add('hidden');
    if (searchInput) searchInput.value = '';
}
    // ============================================
    // MODALS
    // ============================================

    function openModal(id) {
        const m = DOM.get(id);
        if (m) { m.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
    }

    function closeModal(id) {
        const m = DOM.get(id);
        if (m) { m.classList.add('hidden'); document.body.style.overflow = ''; }
    }

    function openExpenseModal() {
    const form = DOM.get('expenseForm');
    
    if (form) form.reset();
    
    // Clear approvers
    clearApprover(1);
    clearApprover(2);
    
    openModal('expenseModal');
}

    // ============================================
    // EXPENSES CRUD
    // ============================================

  function submitExpense(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    btn.disabled = true;

    const fd = new FormData();
    fd.append('amount', DOM.get('expenseAmount').value);
    fd.append('description', DOM.get('expenseDescription').value);
    // Date is auto-assigned in the backend
    fd.append('year', state.currentYear);
    
    // Get approver IDs
    const approver1 = DOM.get('approverId1');
    const approver2 = DOM.get('approverId2');
    
    fd.append('approver_id_1', approver1 ? approver1.value : '');
    fd.append('approver_id_2', approver2 ? approver2.value : '');
    fd.append('_token', document.querySelector('meta[name="csrf-token"]').content);

    fetch('/finance/expenses', { 
        method: 'POST', 
        body: fd, 
        headers: { 'X-Requested-With': 'XMLHttpRequest' } 
    })
    .then(r => r.json())
    .then(d => {
        btn.innerHTML = orig;
        btn.disabled = false;
        if (d.success) {
            closeModal('expenseModal');
            // Clear approver selections
            clearApprover(1);
            clearApprover(2);
            filterExpenses();
            showNotification('Expense recorded!', 'success');
        } else {
            showNotification('Error: ' + (d.message || 'Failed'), 'error');
        }
    })
    .catch(() => { 
        btn.innerHTML = orig; 
        btn.disabled = false; 
        showNotification('Network error', 'error'); 
    });
}

    function filterExpenses() {
        const startDate = DOM.get('filterStartDate');
        const endDate = DOM.get('filterEndDate');
        endDate.setCustomValidity('');
        if (startDate.value && endDate.value && startDate.value > endDate.value) {
            endDate.setCustomValidity('To date must be on or after from date.');
            endDate.reportValidity();
            return;
        }

        if (state.isLoading) return;
        state.isLoading = true;
        const params = new URLSearchParams({
            status: DOM.get('filterStatus')?.value || 'all',
            start_date: DOM.get('filterStartDate')?.value || '',
            end_date: DOM.get('filterEndDate')?.value || '',
            approver_id: DOM.get('filterApprover')?.value || 'all'
        });
        const url = `/finance/expenses/filter?${params.toString()}`;
        fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(async response => {
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || `Request failed (${response.status})`);
                }
                return data;
            })
            .then(data => {
                const expenses = Array.isArray(data.expenses) ? data.expenses : [];
                updateTable(expenses);
                updateStats(expenses);
                updateApproverFilter(expenses);
            })
            .catch(error => {
                console.error('Failed to load expenses:', error);
                const tbody = DOM.get('expenses-table-body');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="px-3 py-8 text-center text-red-600">
                                <i class="fas fa-circle-exclamation mb-2 block"></i>
                                <p>Unable to load expenses</p>
                                <button type="button" onclick="window.expensesManager.filterExpenses()"
                                    class="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700">Try again</button>
                            </td>
                        </tr>
                    `;
                }
            })
            .finally(() => {
                state.isLoading = false;
            });
    }

    function resetFilters() {
        ['filterStatus', 'filterApprover'].forEach(id => { const el = DOM.get(id); if (el) el.value = 'all'; });
        const year = new Date().getFullYear();
        DOM.get('filterStartDate').value = `${year}-01-01`;
        DOM.get('filterEndDate').value = `${year}-12-31`;
        filterExpenses();
    }

    function updateApproverFilter(expenses) {
        const sel = DOM.get('filterApprover');
        if (!sel) return;
        const approvers = {};
        expenses.forEach(e => {
            if (e.approver_id_1 && e.approver_1_name) approvers[e.approver_id_1] = e.approver_1_name;
            if (e.approver_id_2 && e.approver_2_name) approvers[e.approver_id_2] = e.approver_2_name;
        });
        const val = sel.value;
        sel.innerHTML = '<option value="all">All Approvers</option>';
        Object.keys(approvers).forEach(id => {
            const o = document.createElement('option');
            o.value = id;
            o.textContent = approvers[id];
            sel.appendChild(o);
        });
        if (val && sel.querySelector(`option[value="${val}"]`)) sel.value = val;
    }

    function updateStats(expenses) {
        const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
        const pending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + parseFloat(e.amount), 0);
        const approved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + parseFloat(e.amount), 0);
        const now = new Date();
        const monthly = expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, e) => s + parseFloat(e.amount), 0);
        
        DOM.get('totalExpenses').textContent = 'RWF ' + total.toLocaleString();
        DOM.get('pendingExpenses').textContent = 'RWF ' + pending.toLocaleString();
        DOM.get('approvedExpenses').textContent = 'RWF ' + approved.toLocaleString();
        DOM.get('monthlyExpenses').textContent = 'RWF ' + monthly.toLocaleString();
    }

    function updateTable(expenses) {
        const tbody = DOM.get('expenses-table-body');
        if (!expenses || !expenses.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="px-3 py-8 text-center text-gray-500"><i class="fas fa-inbox text-xl mb-2 block text-gray-300"></i><p>No expenses for this date range</p></td></tr>`;
            return;
        }
        tbody.innerHTML = expenses.map((e, i) => {
            const approvers = [e.approver_1_name, e.approver_2_name].filter(Boolean).join(', ') || '-';
            return `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="px-3 py-2 text-xs text-gray-400" data-label="#">${i + 1}</td>
                <td class="px-3 py-2 text-xs text-gray-600 whitespace-nowrap" data-label="Date">${formatDate(e.date)}</td>
                <td class="px-3 py-2 text-sm text-gray-800 max-w-xs" data-label="Reason">${escapeHtml(e.description || '-')}</td>
                <td class="px-3 py-2 text-sm font-semibold text-blue-600 whitespace-nowrap" data-label="Amount">RWF ${parseFloat(e.amount).toLocaleString()}</td>
                <td class="px-3 py-2" data-label="Status"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(e.status)}">${e.status || 'Pending'}</span></td>
                <td class="px-3 py-2 text-xs text-gray-600" data-label="Approvers">${escapeHtml(approvers)}</td>
                <td class="px-3 py-2" data-label="Actions">
                    <div class="flex items-center gap-1">
                        <button onclick="window.expensesManager.viewExpense(${e.id})" class="h-7 w-7 inline-flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 transition" title="View"><i class="fas fa-file-lines text-sm"></i></button>
                        ${e.status === 'pending' ? `<button onclick="window.expensesManager.approveExpense(${e.id})" class="h-7 w-7 inline-flex items-center justify-center rounded-md text-green-600 hover:bg-green-50 transition" title="Approve"><i class="fas fa-check text-sm"></i></button>` : ''}
                        <button onclick="window.expensesManager.deleteExpense(${e.id})" class="h-7 w-7 inline-flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 transition" title="Delete"><i class="fas fa-trash-alt text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    }

    function viewExpense(id) {
        fetch(`/finance/expenses/${id}/details`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    const e = d.expense;
                    DOM.get('viewExpenseContent').innerHTML = `
                        <div class="bg-blue-50 rounded-lg p-4 text-center"><p class="text-xs text-gray-500">Amount</p><p class="text-2xl font-bold text-blue-600">RWF ${parseFloat(e.amount).toLocaleString()}</p></div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-500">Date</p><p class="font-medium">${formatDate(e.date)}</p></div>
                            <div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-500">Status</p><p class="font-medium capitalize">${e.status || 'Pending'}</p></div>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-3"><p class="text-xs text-gray-500">Description</p><p class="text-sm">${escapeHtml(e.description || '-')}</p></div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500"><p class="text-xs text-gray-500">Recorded By</p><p class="font-medium text-sm">${escapeHtml(e.created_by_name || 'System')}</p></div>
                            ${(e.approver_1_name || e.approver_2_name) ? `<div class="bg-gray-50 rounded-lg p-3 border-l-4 border-green-500"><p class="text-xs text-gray-500">Approvers</p><p class="font-medium text-sm">${escapeHtml([e.approver_1_name, e.approver_2_name].filter(Boolean).join(', '))}</p></div>` : ''}
                        </div>
                    `;
                    openModal('viewExpenseModal');
                }
            });
    }

    async function approveExpense(id) {
        if (!(await appConfirm('Approve this expense?'))) return;
        fetch(`/finance/expenses/${id}/approve`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content, 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(r => r.json())
        .then(d => { if (d.success) { filterExpenses(); showNotification('Approved!', 'success'); } else { showNotification('Error', 'error'); } });
    }

    async function deleteExpense(id) {
        if (!(await appConfirm('Delete this expense?'))) return;
        fetch(`/finance/expenses/${id}`, {
            method: 'DELETE',
            headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content, 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(r => r.json())
        .then(d => { if (d.success) { filterExpenses(); showNotification('Deleted!', 'success'); } else { showNotification('Error', 'error'); } });
    }

    // ============================================
    // UTILITY
    // ============================================

    function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function formatDate(s) { if (!s) return '-'; const d = new Date(s); return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    function statusBadge(s) { return s === 'approved' ? 'bg-green-100 text-green-700' : s === 'pending' ? 'bg-yellow-100 text-yellow-700' : s === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'; }

    function showNotification(msg, type) {
    return window.appNotify(...arguments);
        const n = document.createElement('div');
        n.className = `fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in max-w-md`;
        n.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
        n.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-white"></i><span class="text-white text-sm">${msg}</span><button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white">Ã—</button>`;
        document.body.appendChild(n);
        setTimeout(() => { if (n.parentElement) { n.style.opacity = '0'; n.style.transform = 'translateX(100px)'; setTimeout(() => n.remove(), 300); } }, 3000);
    }

    // ============================================
    // INIT
    // ============================================

    function init() {
    if (state.initialized) return;
    state.initialized = true;
    const year = new Date().getFullYear();
    state.currentYear = year;
    
    ['filterStatus', 'filterApprover'].forEach(id => {
        const el = DOM.get(id);
        if (el) el.addEventListener('change', () => filterExpenses());
    });
    ['filterStartDate', 'filterEndDate'].forEach(id => {
        const el = DOM.get(id);
        if (el) el.addEventListener('change', () => filterExpenses());
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach(m => { 
                if (m.id) closeModal(m.id); 
            });
        }
    });

    filterExpenses();
    console.log('Expenses Manager initialized');
}

    // ============================================
    // EXPOSE
    // ============================================

    window.expensesManager = {
        state,
        searchApprovers, selectApprover, clearApprover,
        openModal, closeModal, openExpenseModal,
        submitExpense, filterExpenses, resetFilters, updateStats, updateTable,
        viewExpense, approveExpense, deleteExpense,
        showNotification, escapeHtml, formatDate,
        init
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
</script>

<style>
    .rotate-180 { transform: rotate(180deg); }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .animate-slide-in { animation: slideIn 0.3s ease-out; }
    .modal { background-color: rgba(0,0,0,0.5); }
    .modal .relative { animation: modalIn 0.3s ease-out; }
    @keyframes modalIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .modal:not(.hidden) { display: flex !important; align-items: flex-start !important; }

    @media (max-width: 639px) {
        .expenses-responsive-table {
            overflow: visible;
        }

        .expenses-responsive-table table,
        .expenses-responsive-table tbody {
            display: block;
            width: 100%;
        }

        .expenses-responsive-table thead {
            display: none;
        }

        .expenses-responsive-table tbody {
            display: grid;
            gap: 12px;
            padding: 12px;
        }

        .expenses-responsive-table tbody tr {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
        }

        .expenses-responsive-table tbody td {
            display: grid;
            grid-template-columns: 82px minmax(0, 1fr);
            align-items: center;
            gap: 8px;
            width: 100%;
            max-width: none !important;
            padding: 8px 12px;
            border-bottom: 1px solid #f3f4f6;
            white-space: normal;
            overflow-wrap: anywhere;
        }

        .expenses-responsive-table tbody td::before {
            content: attr(data-label);
            color: #6b7280;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .expenses-responsive-table tbody td[data-label="#"] {
            display: none;
        }

        .expenses-responsive-table tbody td[data-label="Reason"] {
            order: -1;
            display: block;
            padding: 12px;
            background: #f9fafb;
            font-weight: 600;
        }

        .expenses-responsive-table tbody td[data-label="Reason"]::before {
            display: block;
            margin-bottom: 3px;
        }

        .expenses-responsive-table tbody td[data-label="Actions"] {
            border-bottom: 0;
        }

        .expenses-responsive-table tbody td[data-label="Actions"] button {
            width: 36px;
            height: 36px;
        }

        .expenses-responsive-table tbody tr > td[colspan] {
            display: block;
            padding: 24px 12px;
            text-align: center;
            border-bottom: 0;
        }

        .expenses-responsive-table tbody tr > td[colspan]::before {
            display: none;
        }
    }
</style>

