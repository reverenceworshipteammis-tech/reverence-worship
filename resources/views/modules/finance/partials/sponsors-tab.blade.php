<div>
    <!-- Header with Date Range -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-4">
        <h3 class="text-base font-semibold text-gray-800">Sponsors</h3>
        <div class="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-end sm:gap-3">
            <div class="min-w-0">
                <label for="sponsorFromDate" class="block text-xs font-medium text-gray-600 mb-1">From</label>
                <input type="date" id="sponsorFromDate" value="{{ date('Y-01-01') }}"
                    class="h-9 sm:h-8 w-full min-w-0 px-2 py-0 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="min-w-0">
                <label for="sponsorToDate" class="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input type="date" id="sponsorToDate" value="{{ date('Y-12-31') }}"
                    class="h-9 sm:h-8 w-full min-w-0 px-2 py-0 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <button type="button" onclick="window.sponsorsManager.exportSponsors()"
                class="h-9 sm:h-8 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-3 py-0 rounded-lg text-xs flex items-center justify-center gap-1.5"
                title="Export filtered sponsors for Excel">
                <i class="fas fa-file-excel" aria-hidden="true"></i>
                <span>Export Excel</span>
            </button>
            <button onclick="window.sponsorsManager.openSponsorModal()" class="h-9 sm:h-8 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-0 rounded-lg text-xs flex items-center justify-center gap-1.5">
                <i class="fas fa-plus-circle"></i> Add Sponsor
            </button>
        </div>
    </div>
    
    <!-- Info Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 max-w-3xl">
        <div class="bg-blue-50 rounded-lg p-2.5 sm:p-3 min-w-0">
            <p class="text-xs text-gray-600">Total Sponsors</p>
            <p class="text-sm sm:text-lg font-bold text-blue-600" id="totalSponsors">0</p>
        </div>
        <div class="bg-green-50 rounded-lg p-2.5 sm:p-3 min-w-0">
            <p class="text-xs text-gray-600">Total Received</p>
            <p class="text-sm sm:text-lg font-bold text-green-600" id="totalReceived">RWF 0</p>
        </div>
        <div class="col-span-2 sm:col-span-1 bg-purple-50 rounded-lg px-2.5 py-2 sm:p-3 flex items-center justify-between sm:block">
            <p class="text-xs text-gray-600">Commitments</p>
            <p class="text-sm sm:text-lg font-bold text-purple-600" id="totalCommitments">RWF 0</p>
        </div>
    </div>
    
    <!-- Search -->
    <div class="mb-4 max-w-xl">
        <div class="relative">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="text" id="searchSponsor" placeholder="Search by sponsor name or email..." 
                   class="h-9 sm:h-8 w-full pl-9 pr-3 py-0 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
        </div>
        <p id="sponsorsCount" class="text-xs text-gray-500 mt-1">0 sponsors found</p>
    </div>
    
    <!-- Sponsors Table -->
    <div class="sponsors-responsive-table overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">SPONSOR</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">COMMITMENT</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">RECEIVED</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">REMAINING</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">STATUS</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">ACTIONS</th>
                </tr>
            </thead>
            <tbody id="sponsors-table-body">
                <tr>
                    <td colspan="6" class="text-center py-8 text-gray-500">Loading sponsors...</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<script>
// ============================================
// SPONSORS MANAGER - Complete Module
// ============================================

(function() {
    'use strict';

    // ============================================
    // STATE
    // ============================================
    
    const state = {
        currentYear: new Date().getFullYear(),
        isLoading: false,
        initialized: false
    };

    // ============================================
    // DOM CACHE
    // ============================================
    
    const DOM = {
        get: (id) => document.getElementById(id),
        qs: (selector, context = document) => context.querySelector(selector)
    };

    // ============================================
    // MODAL FUNCTIONS
    // ============================================
    
    function openFinanceModal(modalId) {
        const modal = DOM.get(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeFinanceModal(modalId) {
        const modal = DOM.get(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // ============================================
    // SPONSOR FUNCTIONS
    // ============================================

    function loadSponsors() {
        if (state.isLoading) return;
        state.isLoading = true;
        
        const search = DOM.get('searchSponsor')?.value || '';
        const fromDate = DOM.get('sponsorFromDate')?.value || '';
        const toDate = DOM.get('sponsorToDate')?.value || '';
        
        const params = new URLSearchParams({
            search: search,
            from_date: fromDate,
            to_date: toDate,
            status: 'all'
        });

        fetch(`/finance/sponsors/filter?${params.toString()}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displaySponsors(data.sponsors);
                updateStats(data.sponsors);
            }
            state.isLoading = false;
        })
        .catch(error => {
            console.error('Error loading sponsors:', error);
            const tbody = DOM.get('sponsors-table-body');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500">Error loading sponsors. Please try again.</td></tr>`;
            }
            state.isLoading = false;
        });
    }

    function exportSponsors() {
        const fromDate = DOM.get('sponsorFromDate');
        const toDate = DOM.get('sponsorToDate');

        if (fromDate.value > toDate.value) {
            toDate.setCustomValidity('To date must be on or after from date.');
            toDate.reportValidity();
            return;
        }

        const params = new URLSearchParams({
            search: DOM.get('searchSponsor')?.value || '',
            from_date: fromDate.value,
            to_date: toDate.value
        });

        window.location.href = `/finance/sponsors/export?${params.toString()}`;
    }

    function displaySponsors(sponsors) {
        const tbody = DOM.get('sponsors-table-body');
        
        if (!sponsors || sponsors.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No sponsors found for this date range</td></tr>`;
            return;
        }
        
        tbody.innerHTML = sponsors.map(s => {
            const commitment = parseFloat(s.commitment_amount || 0);
            const received = parseFloat(s.received_amount || 0);
            const remaining = commitment - received;
            
            // Determine status
            let status = 'Active';
            let statusClass = 'bg-blue-100 text-blue-700';
            
            if (commitment === 0 && received === 0) {
                status = 'No Commitment';
                statusClass = 'bg-gray-100 text-gray-600';
            } else if (commitment === 0 && received > 0) {
                status = 'Direct Gift';
                statusClass = 'bg-purple-100 text-purple-700';
            } else if (received >= commitment && commitment > 0) {
                status = 'Completed';
                statusClass = 'bg-green-100 text-green-700';
            } else if (received > commitment && commitment > 0) {
                status = 'Overpaid';
                statusClass = 'bg-orange-100 text-orange-700';
            } else if (received > 0 && received < commitment) {
                status = 'Active';
                statusClass = 'bg-blue-100 text-blue-700';
            }
            
            // Show year badge
            const yearBadge = s.year ? 
                `<span class="text-xs text-gray-400 ml-1">(${s.year})</span>` : 
                `<span class="text-xs text-gray-400 ml-1">(No year set)</span>`;
            
            return `
                <tr class="border-b hover:bg-gray-50 transition">
                    <td class="px-3 py-2" data-label="Sponsor">
                        <div>
                            <p class="font-medium text-gray-800">
                                ${escapeHtml(s.name)} 
                                ${yearBadge}
                            </p>
                            <p class="text-xs text-gray-500">${escapeHtml(s.email || 'No email')}</p>
                        </div>
                    </td>
                    <td class="px-3 py-2 text-sm font-medium text-gray-700" data-label="Commitment">
                        ${commitment > 0 ? 'RWF ' + commitment.toLocaleString() : '-'}
                    </td>
                    <td class="px-3 py-2 text-sm font-medium text-green-600" data-label="Received">
                        RWF ${received.toLocaleString()}
                    </td>
                    <td class="px-3 py-2 text-sm font-medium text-gray-600" data-label="Remaining">
                        ${commitment > 0 ? 'RWF ' + Math.max(remaining, 0).toLocaleString() : '-'}
                    </td>
                    <td class="px-3 py-2" data-label="Status">
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                            ${status}
                        </span>
                    </td>
                    <td class="px-3 py-2" data-label="Actions">
                        <div class="flex items-center gap-1">
                            <button onclick="window.sponsorsManager.openPaymentModal(${s.id}, '${escapeHtml(s.name)}')" 
                                    class="h-7 w-7 inline-flex items-center justify-center rounded-md text-green-600 hover:bg-green-50 transition" title="Record Payment">
                                <i class="fas fa-plus-circle text-sm"></i>
                            </button>
                            <button onclick="window.sponsorsManager.viewPayments(${s.id})" 
                                    class="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-50 transition" title="View History">
                                <i class="fas fa-history text-sm"></i>
                            </button>
                            <button onclick="window.sponsorsManager.editSponsor(${s.id})" 
                                    class="h-7 w-7 inline-flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 transition" title="Edit Sponsor">
                                <i class="fas fa-edit text-sm"></i>
                            </button>
                            <button onclick="window.sponsorsManager.deleteSponsor(${s.id}, '${escapeHtml(s.name)}')" 
                                    class="h-7 w-7 inline-flex items-center justify-center rounded-md text-red-600 hover:bg-red-50 transition" title="Delete Sponsor">
                                <i class="fas fa-trash text-sm"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function updateStats(sponsors) {
        const total = sponsors.length;
        const commitments = sponsors.reduce((s, p) => s + parseFloat(p.commitment_amount || 0), 0);
        const received = sponsors.reduce((s, p) => s + parseFloat(p.received_amount || 0), 0);
        
        const totalEl = DOM.get('totalSponsors');
        const commitmentsEl = DOM.get('totalCommitments');
        const receivedEl = DOM.get('totalReceived');
        const countEl = DOM.get('sponsorsCount');
        
        if (totalEl) totalEl.innerText = total;
        if (commitmentsEl) commitmentsEl.innerHTML = 'RWF ' + commitments.toLocaleString();
        if (receivedEl) receivedEl.innerHTML = 'RWF ' + received.toLocaleString();
        if (countEl) countEl.innerText = total + ' sponsors found';
    }

    // ============================================
    // SPONSOR CRUD OPERATIONS
    // ============================================

    function openSponsorModal() {
    const title = DOM.get('sponsorModalTitle');
    const submitBtn = DOM.get('sponsorSubmitBtnText');
    const idField = DOM.get('sponsorId');
    const nameField = DOM.get('name');
    const emailField = DOM.get('email');
    const phoneField = DOM.get('phone');
    const commitmentField = DOM.get('commitment_amount');
    const notesField = DOM.get('notes');
    const yearDisplay = DOM.get('sponsorYearDisplay');
    const yearInput = DOM.get('sponsorYear');
    
    // Get the current year from the filter - use the displayed year
    const yearDisplayElement = DOM.get('sponsorYearDisplay');
    const currentYear = yearDisplayElement ? parseInt(yearDisplayElement.textContent) : new Date().getFullYear();
    
    // Also update state.currentYear to match
    state.currentYear = currentYear;
    
    if (title) title.innerText = 'Add Sponsor';
    if (submitBtn) submitBtn.innerText = 'Add Sponsor';
    if (idField) idField.value = '';
    if (nameField) {
        nameField.value = '';
        nameField.required = true;
    }
    if (emailField) {
        emailField.value = '';
        emailField.required = false;
    }
    if (phoneField) {
        phoneField.value = '';
        phoneField.required = false;
    }
    if (commitmentField) {
        commitmentField.value = '';
        commitmentField.placeholder = 'Optional - Enter amount or leave empty';
        commitmentField.required = false;
    }
    if (notesField) {
        notesField.value = '';
        notesField.required = false;
    }
    if (yearDisplay) yearDisplay.textContent = currentYear;
    if (yearInput) yearInput.value = currentYear;
    
    openFinanceModal('sponsorModal');
}

function openPaymentModal(id, name) {
    const sponsorId = DOM.get('payment_sponsor_id');
    const sponsorName = DOM.get('payment_sponsor_name');
    const yearDisplay = DOM.get('payment_year_display');
    const yearInput = DOM.get('payment_year');
    const amountField = DOM.get('amount');
    const notesField = DOM.get('payment_notes');
    
    // Get the current year from the filter - use the displayed year
    const yearDisplayElement = DOM.get('sponsorYearDisplay');
    const currentYear = yearDisplayElement ? parseInt(yearDisplayElement.textContent) : new Date().getFullYear();
    
    // Also update state.currentYear to match
    state.currentYear = currentYear;
    
    if (sponsorId) sponsorId.value = id;
    if (sponsorName) sponsorName.innerText = name;
    if (yearDisplay) yearDisplay.innerText = currentYear;
    if (yearInput) yearInput.value = currentYear;
    if (amountField) amountField.value = '';
    if (notesField) notesField.value = '';
    
    openFinanceModal('paymentModal');
}

    function editSponsor(id) {
    showNotification('Loading sponsor details...', 'info');
    
    fetch(`/finance/sponsors/${id}/edit`)
        .then(res => {
            if (!res.ok) {
                throw new Error('Failed to load sponsor details');
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                const title = DOM.get('sponsorModalTitle');
                const submitBtn = DOM.get('sponsorSubmitBtnText');
                const idField = DOM.get('sponsorId');
                const nameField = DOM.get('name');
                const emailField = DOM.get('email');
                const phoneField = DOM.get('phone');
                const commitmentField = DOM.get('commitment_amount');
                const notesField = DOM.get('notes');
                const yearDisplay = DOM.get('sponsorYearDisplay');
                const yearInput = DOM.get('sponsorYear');
                
                // Get the current year from the filter
                const yearDisplayElement = DOM.get('sponsorYearDisplay');
                const filterYear = yearDisplayElement ? parseInt(yearDisplayElement.textContent) : new Date().getFullYear();
                
                // Use the sponsor's year or the current filter year
                const sponsorYear = data.sponsor.year || filterYear;
                
                if (title) title.innerText = 'Edit Sponsor';
                if (submitBtn) submitBtn.innerText = 'Update Sponsor';
                if (idField) idField.value = data.sponsor.id;
                if (nameField) {
                    nameField.value = data.sponsor.name || '';
                    nameField.required = true;
                }
                if (emailField) {
                    emailField.value = data.sponsor.email || '';
                    emailField.required = false;
                }
                if (phoneField) {
                    phoneField.value = data.sponsor.phone || '';
                    phoneField.required = false;
                }
                if (commitmentField) {
                    commitmentField.value = data.sponsor.commitment_amount || '';
                    commitmentField.placeholder = 'Optional - Enter amount or leave empty';
                    commitmentField.required = false;
                }
                if (notesField) {
                    notesField.value = data.sponsor.notes || '';
                    notesField.required = false;
                }
                if (yearDisplay) yearDisplay.textContent = sponsorYear;
                if (yearInput) yearInput.value = sponsorYear;
                
                openFinanceModal('sponsorModal');
            } else {
                showNotification(data.message || 'Failed to load sponsor details', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error loading sponsor details. Please try again.', 'error');
        });
}

    function saveSponsor(event) {
        event.preventDefault();
        
        const id = DOM.get('sponsorId').value;
        const name = DOM.get('name').value;
        const email = DOM.get('email').value;
        const phone = DOM.get('phone').value;
        const commitment_amount = DOM.get('commitment_amount').value;
        const notes = DOM.get('notes').value;
        const year = DOM.get('sponsorYear')?.value || state.currentYear || new Date().getFullYear();
        
        // Validate required fields
        if (!name || name.trim() === '') {
            showNotification('Please enter the sponsor name', 'error');
            return;
        }
        
        // Validate commitment amount if provided
        if (commitment_amount && commitment_amount.trim() !== '') {
            const amount = parseFloat(commitment_amount);
            if (isNaN(amount) || amount < 0) {
                showNotification('Please enter a valid commitment amount', 'error');
                return;
            }
        }
        
        // Prepare data
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('email', email ? email.trim() : '');
        formData.append('phone', phone ? phone.trim() : '');
        formData.append('commitment_amount', commitment_amount ? commitment_amount : 0);
        formData.append('notes', notes ? notes.trim() : '');
        formData.append('year', year);
        formData.append('_token', document.querySelector('meta[name="csrf-token"]').content);
        
        const url = id ? `/finance/sponsors/${id}` : '/finance/sponsors';
        if (id) formData.append('_method', 'PUT');
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        fetch(url, { 
            method: 'POST', 
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                closeFinanceModal('sponsorModal');
                loadSponsors();
                showNotification(id ? 'Sponsor updated successfully!' : 'Sponsor added successfully!', 'success');
            } else {
                showNotification('Error: ' + (data.message || 'Failed to save sponsor'), 'error');
            }
            submitBtn.innerHTML = originalHtml;
            submitBtn.disabled = false;
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Network error: ' + error.message, 'error');
            submitBtn.innerHTML = originalHtml;
            submitBtn.disabled = false;
        });
    }

    async function deleteSponsor(id, name) {
        if (await appConfirm(`Are you sure you want to delete "${name}"? This will also delete all associated payments.`)) {
            fetch(`/finance/sponsors/${id}`, {
                method: 'DELETE',
                headers: { 
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                }
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadSponsors();
                    showNotification('Sponsor deleted successfully', 'success');
                } else {
                    showNotification('Error: ' + (data.message || 'Failed to delete sponsor'), 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Network error: ' + error.message, 'error');
            });
        }
    }

    // ============================================
    // PAYMENT FUNCTIONS
    // ============================================

    function openPaymentModal(id, name) {
        const sponsorId = DOM.get('payment_sponsor_id');
        const sponsorName = DOM.get('payment_sponsor_name');
        const yearDisplay = DOM.get('payment_year_display');
        const yearInput = DOM.get('payment_year');
        const amountField = DOM.get('amount');
        const notesField = DOM.get('payment_notes');
        
        // Get the current year from the filter
        const currentYear = state.currentYear || new Date().getFullYear();
        
        if (sponsorId) sponsorId.value = id;
        if (sponsorName) sponsorName.innerText = name;
        if (yearDisplay) yearDisplay.innerText = currentYear;
        if (yearInput) yearInput.value = currentYear;
        if (amountField) amountField.value = '';
        if (notesField) notesField.value = '';
        
        openFinanceModal('paymentModal');
    }

    function savePayment(event) {
        event.preventDefault();
        
        const sponsorId = DOM.get('payment_sponsor_id').value;
        const amount = DOM.get('amount').value;
        const paymentMethod = DOM.get('payment_method').value;
        const notes = DOM.get('payment_notes').value;
        const year = DOM.get('payment_year')?.value || state.currentYear || new Date().getFullYear();
        
        if (!sponsorId || !amount) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('sponsor_id', sponsorId);
        formData.append('amount', amount);
        formData.append('year', year);
        formData.append('payment_method', paymentMethod);
        formData.append('notes', notes);
        formData.append('_token', document.querySelector('meta[name="csrf-token"]').content);
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;
        
        fetch('/finance/sponsors/payment', { 
            method: 'POST', 
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                closeFinanceModal('paymentModal');
                loadSponsors();
                showNotification('Payment recorded successfully!', 'success');
            } else {
                showNotification('Error: ' + (data.message || 'Failed to record payment'), 'error');
            }
            submitBtn.innerHTML = originalHtml;
            submitBtn.disabled = false;
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Network error: ' + error.message, 'error');
            submitBtn.innerHTML = originalHtml;
            submitBtn.disabled = false;
        });
    }

    function viewPayments(id) {
        const container = DOM.get('paymentHistoryList');
        const year = state.currentYear || new Date().getFullYear();
        
        fetch(`/finance/sponsors/${id}/payments?year=${year}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.payments && data.payments.length) {
                container.innerHTML = data.payments.map(p => `
                    <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-2 hover:shadow-sm transition">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-sm font-medium text-gray-800">RWF ${parseFloat(p.amount).toLocaleString()}</p>
                                <div class="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                                    <span><i class="far fa-calendar mr-1"></i> ${new Date(p.payment_date).toLocaleDateString()}</span>
                                    <span><i class="fas fa-credit-card mr-1"></i> ${p.payment_method || 'Cash'}</span>
                                </div>
                            </div>
                            <span class="text-xs text-gray-400">${p.recorded_by || 'System'}</span>
                        </div>
                        ${p.notes ? `<p class="text-xs text-gray-500 mt-2">${escapeHtml(p.notes)}</p>` : ''}
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-inbox text-3xl text-gray-300 mb-2"></i>
                        <p>No payments recorded for ${year}</p>
                    </div>
                `;
            }
            openFinanceModal('viewModal');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error loading payment history', 'error');
        });
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showNotification(message, type = 'success') {
    return window.appNotify(...arguments);
        const notification = document.createElement('div');
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 
                     type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle';
        const bgColor = type === 'success' ? 'bg-green-500' : 
                        type === 'error' ? 'bg-red-500' : 
                        type === 'info' ? 'bg-blue-500' : 'bg-red-500';
        
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-all transform ${bgColor}`;
        notification.innerHTML = `<i class="fas ${icon} mr-2"></i> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    function init() {
        if (state.initialized) return;
        state.initialized = true;
        
        const currentYear = new Date().getFullYear();
        state.currentYear = currentYear;
        
        // Search input
        const searchInput = DOM.get('searchSponsor');
        if (searchInput) {
            searchInput.addEventListener('keyup', function() {
                loadSponsors();
            });
        }

        [DOM.get('sponsorFromDate'), DOM.get('sponsorToDate')].forEach(input => {
            input?.addEventListener('change', function() {
                const fromDate = DOM.get('sponsorFromDate');
                const toDate = DOM.get('sponsorToDate');
                toDate.setCustomValidity('');
                if (fromDate.value > toDate.value) {
                    toDate.setCustomValidity('To date must be on or after from date.');
                    toDate.reportValidity();
                    return;
                }
                loadSponsors();
            });
        });
        
        // Close modals on escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                const openModals = document.querySelectorAll('.fixed:not(.hidden)');
                openModals.forEach(modal => {
                    if (modal.id && modal.id.endsWith('Modal')) {
                        closeFinanceModal(modal.id);
                    }
                });
            }
        });
        
        // Load initial data
        loadSponsors();
        
        console.log('Sponsors Manager initialized');
    }

    // ============================================
    // EXPOSE PUBLIC API
    // ============================================
    
    window.sponsorsManager = {
        // State
        state: state,
        
        // Modal functions
        openFinanceModal: openFinanceModal,
        closeFinanceModal: closeFinanceModal,
        
        // Sponsor functions
        loadSponsors: loadSponsors,
        exportSponsors: exportSponsors,
        displaySponsors: displaySponsors,
        updateStats: updateStats,
        openSponsorModal: openSponsorModal,
        editSponsor: editSponsor,
        saveSponsor: saveSponsor,
        deleteSponsor: deleteSponsor,
        
        // Payment functions
        openPaymentModal: openPaymentModal,
        savePayment: savePayment,
        viewPayments: viewPayments,
        
        // Utility
        showNotification: showNotification,
        escapeHtml: escapeHtml,
        
        // Init
        init: init
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
</script>

<style>
.rotate-180 {
    transform: rotate(180deg);
}

@media (max-width: 639px) {
    .sponsors-responsive-table {
        overflow: visible;
    }

    .sponsors-responsive-table table,
    .sponsors-responsive-table tbody {
        display: block;
        width: 100%;
    }

    .sponsors-responsive-table thead {
        display: none;
    }

    .sponsors-responsive-table tbody {
        display: grid;
        gap: 12px;
    }

    .sponsors-responsive-table tbody tr {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
    }

    .sponsors-responsive-table tbody td {
        display: grid;
        grid-template-columns: 88px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 8px 12px;
        border-bottom: 1px solid #f3f4f6;
        white-space: normal;
    }

    .sponsors-responsive-table tbody td::before {
        content: attr(data-label);
        color: #6b7280;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }

    .sponsors-responsive-table tbody td[data-label="Sponsor"] {
        order: -1;
        display: block;
        padding: 12px;
        background: #f9fafb;
    }

    .sponsors-responsive-table tbody td[data-label="Sponsor"]::before {
        display: none;
    }

    .sponsors-responsive-table tbody td[data-label="Actions"] {
        border-bottom: 0;
    }

    .sponsors-responsive-table tbody td[data-label="Actions"] button {
        width: 36px;
        height: 36px;
    }

    .sponsors-responsive-table tbody tr > td[colspan] {
        display: block;
        padding: 24px 12px;
        text-align: center;
        border-bottom: 0;
    }

    .sponsors-responsive-table tbody tr > td[colspan]::before {
        display: none;
    }
}
</style>


