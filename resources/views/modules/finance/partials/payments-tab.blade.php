<div>
    <!-- Payment Filters -->
    <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-3 mb-4">
        <div class="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-wrap sm:items-end sm:gap-3">
           
            
           
            <!-- Filters -->
            <div class="min-w-0">
                <label for="paymentFromDate" class="block text-xs font-medium text-gray-600 mb-1">From</label>
                <input type="date" id="paymentFromDate" value="{{ date('Y-01-01') }}"
                    class="h-9 sm:h-8 w-full min-w-0 px-2 py-0 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="min-w-0">
                <label for="paymentToDate" class="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input type="date" id="paymentToDate" value="{{ date('Y-12-31') }}"
                    class="h-9 sm:h-8 w-full min-w-0 px-2 py-0 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div class="col-span-2 sm:col-auto">
                <label for="paymentSearchInput" class="block text-xs font-medium text-gray-600 mb-1">Search Member</label>
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" aria-hidden="true"></i>
                    <input type="text" id="paymentSearchInput" placeholder="Search by member name or email..." 
                           class="h-9 sm:h-8 w-full sm:w-72 pl-9 pr-3 py-0 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           aria-label="Search payments by member">
                </div>
            </div>
            <button type="button" onclick="window.paymentsManager.exportPayments()"
                class="col-span-2 h-9 w-full sm:h-8 sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-0 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition"
                title="Export filtered payments for Excel">
                <i class="fas fa-file-excel" aria-hidden="true"></i>
                <span>Export Excel</span>
            </button>
            
        </div>
    </div>
    
    <!-- Stats Summary Cards -->
    <div class="grid grid-cols-2 gap-2 sm:gap-3 mb-4 max-w-2xl">
        <div class="bg-white rounded-lg shadow-sm p-2.5 sm:p-3 border border-gray-200 min-w-0">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-500 text-xs">Total Payments</p>
                    <p class="text-sm sm:text-lg font-bold text-gray-800" id="totalPayments" role="status">RWF 0</p>
                </div>
                <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center" aria-hidden="true">
                    <i class="fas fa-chart-line text-blue-600 text-sm"></i>
                </div>
            </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-2.5 sm:p-3 border border-gray-200 min-w-0">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-500 text-xs">Total Transactions</p>
                    <p class="text-sm sm:text-lg font-bold text-gray-800" id="paymentCount" role="status">0</p>
                </div>
                <div class="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center" aria-hidden="true">
                    <i class="fas fa-receipt text-green-600 text-sm"></i>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Payments Table -->
    <div class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div class="payments-responsive-table overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200" id="paymentsTable" aria-label="Payments table">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">DATE</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">MEMBER</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">TERM</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">AMOUNT</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">METHOD</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">NOTES</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ACTIONS</th>
                    </tr>
                </thead>
                <tbody id="payments-table-body">
                    <tr>
                        <td colspan="8" class="px-3 py-8 text-center text-gray-500">
                            <i class="fas fa-spinner fa-spin text-lg mb-2" aria-hidden="true"></i>
                            <p>Loading payments...</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>


<script>
// ============================================
// PAYMENTS MANAGER - Complete Module
// ============================================

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION & CONSTANTS
    // ============================================
    
    const CONFIG = {
        SUBMIT_COOLDOWN: 3000,
        SEARCH_DEBOUNCE: 400,
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        API: {
            FILTER: '/finance/payments/filter',
            DETAILS: '/finance/payments',
            UPDATE: '/finance/payments/update'
        }
    };

    // ============================================
    // STATE
    // ============================================
    
    const state = {
        isLoading: false,
        lastSubmitTime: 0,
        searchTimeout: null,
        initialized: false,
        initialLoadDone: false,
        currentYear: new Date().getFullYear(),
        numberOfTerms: {{ $numberOfTerms ?? 3 }}
    };

    // ============================================
    // DOM CACHE
    // ============================================
    
    const DOM = {
        get: (id) => document.getElementById(id),
        qs: (selector, context = document) => context.querySelector(selector)
    };

    const elements = {
        tableBody: DOM.get('payments-table-body'),
        searchInput: DOM.get('paymentSearchInput'),
        fromDate: DOM.get('paymentFromDate'),
        toDate: DOM.get('paymentToDate'),
        totalPayments: DOM.get('totalPayments'),
        paymentCount: DOM.get('paymentCount')
    };

    // ============================================
    // FORCE LOAD PAYMENTS
    // ============================================
    
    function forceLoadPayments() {
        state.isLoading = false;
        console.log('Forcing payments load...');
        filterPayments();
    }

    // ============================================
    // PAYMENT FUNCTIONS
    // ============================================
    
    async function filterPayments() {
        if (state.isLoading && state.initialLoadDone) {
            console.log('Already loading payments, skipping...');
            return;
        }
        
        const search = elements.searchInput?.value || '';
        const fromDate = elements.fromDate?.value || '';
        const toDate = elements.toDate?.value || '';
        
        const params = new URLSearchParams({
            search: search,
            from_date: fromDate,
            to_date: toDate
        });
        const url = `${CONFIG.API.FILTER}?${params.toString()}`;
        
        state.isLoading = true;
        
        // Show loading state
        if (elements.tableBody) {
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-3 py-8 text-center text-gray-500">
                        <i class="fas fa-spinner fa-spin text-lg mb-2" aria-hidden="true"></i>
                        <p>Loading payments...</p>
                    </td>
                </tr>
            `;
        }
        
        try {
            const data = await fetchWithRetry(url, { headers: getHeaders() });
            
            if (data.success) {
                updatePaymentsTable(data.payments || []);
                updatePaymentStats(data.payments || []);
                state.initialLoadDone = true;
            } else {
                console.error('Error loading payments:', data.message);
                showNotification('Error loading payments: ' + (data.message || 'Unknown error'), 'error');
                updatePaymentsTable([]);
                updatePaymentStats([]);
            }
        } catch (error) {
            console.error('Error loading payments:', error);
            showNotification('Error loading payments. Please try again.', 'error');
            updatePaymentsTable([]);
            updatePaymentStats([]);
        } finally {
            state.isLoading = false;
        }
    }

    function exportPayments() {
        if (elements.fromDate.value > elements.toDate.value) {
            elements.toDate.setCustomValidity('To date must be on or after from date.');
            elements.toDate.reportValidity();
            return;
        }

        const params = new URLSearchParams({
            search: elements.searchInput?.value || '',
            from_date: elements.fromDate?.value || '',
            to_date: elements.toDate?.value || ''
        });

        window.location.href = `/finance/payments/export?${params.toString()}`;
    }

    function updatePaymentsTable(payments) {
        if (!elements.tableBody) return;
        
        if (!payments || payments.length === 0) {
            elements.tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-3 py-8 text-center text-gray-500">
                        <i class="fas fa-inbox text-4xl mb-2 text-gray-300" aria-hidden="true"></i>
                        <p>No payment records found for this date range</p>
                        <p class="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        elements.tableBody.innerHTML = payments.map((payment, index) => `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="px-3 py-2 text-xs text-gray-400" data-label="#">${index + 1}</td>
                <td class="px-3 py-2 text-xs text-gray-600 whitespace-nowrap" data-label="Date">${formatDate(payment.payment_date)}</td>
                <td class="px-3 py-2" data-label="Member">
                    <div>
                        <p class="text-sm font-medium text-gray-800">${escapeHtml(payment.member_name)}</p>
                        <p class="text-xs text-gray-500">${escapeHtml(payment.member_email || '')}</p>
                    </div>
                </td>
                <td class="px-3 py-2 text-xs text-gray-600 whitespace-nowrap" data-label="Term">Term ${payment.term}</td>
                <td class="px-3 py-2" data-label="Amount">
                    <span class="text-sm font-semibold text-green-600 whitespace-nowrap">${formatCurrency(payment.amount)}</span>
                </td>
                <td class="px-3 py-2" data-label="Method">
                    <span class="px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${getMethodBadge(payment.payment_method)}">
                        ${getMethodName(payment.payment_method)}
                    </span>
                </td>
                <td class="px-3 py-2 text-xs text-gray-500 max-w-[180px] truncate" data-label="Notes">
                    ${payment.notes ? escapeHtml(payment.notes) : '-'}
                </td>
                <td class="px-3 py-2" data-label="Actions">
                    <div class="flex items-center gap-1">
                        <button onclick="window.paymentsManager.viewPaymentDetails(${payment.id})" 
                                class="h-7 w-7 inline-flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 transition" 
                                title="View Details"
                                aria-label="View payment details for ${escapeHtml(payment.member_name)}">
                            <i class="fas fa-file-lines text-sm" aria-hidden="true"></i>
                        </button>
                        <button onclick="window.paymentsManager.openEditModal(${payment.id})" 
                                class="h-7 w-7 inline-flex items-center justify-center rounded-md text-green-600 hover:bg-green-50 transition" 
                                title="Edit Payment"
                                aria-label="Edit payment for ${escapeHtml(payment.member_name)}">
                            <i class="fas fa-edit text-sm" aria-hidden="true"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function updatePaymentStats(payments) {
        const total = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const count = payments.length;
        
        if (elements.totalPayments) {
            elements.totalPayments.textContent = formatCurrency(total);
        }
        if (elements.paymentCount) {
            elements.paymentCount.textContent = count;
        }
    }

    // ============================================
    // PAYMENT DETAILS
    // ============================================
    
    async function viewPaymentDetails(id) {
        try {
            const data = await fetchWithRetry(
                `${CONFIG.API.DETAILS}/${id}/details`,
                { headers: getHeaders() }
            );
            
            if (data.success) {
                const p = data.payment;
                const content = DOM.get('viewPaymentContent');
                
                if (content) {
                    content.innerHTML = `
                        <div class="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center justify-between gap-3">
                            <div>
                                <p class="text-xs text-green-700">Payment Amount</p>
                                <p class="text-xl font-bold text-green-700">${formatCurrency(p.amount)}</p>
                            </div>
                            <div class="h-9 w-9 rounded-lg bg-white text-green-600 flex items-center justify-center">
                                <i class="fas fa-receipt" aria-hidden="true"></i>
                            </div>
                        </div>
                        <div class="border-b border-gray-100 pb-3">
                            <p class="text-xs text-gray-500">Member</p>
                            <p class="text-sm font-semibold text-gray-800">${escapeHtml(p.member_name)}</p>
                            <p class="text-xs text-gray-500">${escapeHtml(p.member_email || '')}</p>
                        </div>
                        <div class="grid grid-cols-2 gap-x-4 gap-y-3">
                            <div>
                                <p class="text-xs text-gray-500">Term</p>
                                <p class="text-sm font-medium text-gray-800">Term ${p.term}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Year</p>
                                <p class="text-sm font-medium text-gray-800">${p.year || state.currentYear}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Payment Date</p>
                                <p class="text-sm font-medium text-gray-800">${formatDate(p.payment_date)}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500">Payment Method</p>
                                <p class="text-sm font-medium text-gray-800 capitalize">${getMethodName(p.payment_method)}</p>
                            </div>
                        </div>
                        <div class="bg-gray-50 rounded-lg px-3 py-2">
                            <p class="text-xs text-gray-500">Notes</p>
                            <p class="text-sm text-gray-700">${escapeHtml(p.notes || 'No notes')}</p>
                        </div>
                        <div class="border-t border-gray-100 pt-3">
                            <p class="text-xs text-gray-500">Recorded By</p>
                            <p class="text-sm font-medium text-gray-800">${escapeHtml(p.recorded_by_name || 'System')}</p>
                            <p class="text-xs text-gray-400">${formatDateTime(p.created_at)}</p>
                        </div>
                    `;
                }
                
                openModal('viewPaymentModal');
            } else {
                showNotification(data.message || 'Error loading payment details', 'error');
            }
        } catch (error) {
            console.error('Error loading payment details:', error);
            showNotification('Payment not found or error loading details', 'error');
        }
    }

    // ============================================
    // EDIT PAYMENT
    // ============================================
    
    async function openEditModal(id) {
        try {
            const data = await fetchWithRetry(
                `${CONFIG.API.DETAILS}/${id}/details`,
                { headers: getHeaders() }
            );
            
            if (data.success) {
                const p = data.payment;
                
                // Populate form fields
                const idInput = DOM.get('editPaymentId');
                const userIdInput = DOM.get('editPaymentUserId');
                const memberName = DOM.get('editPaymentMemberName');
                const yearDisplay = DOM.get('editPaymentYearDisplay');
                const yearInput = DOM.get('editPaymentYear');
                const amountInput = DOM.get('editPaymentAmount');
                const methodSelect = DOM.get('editPaymentMethod');
                const dateInput = DOM.get('editPaymentDate');
                const termSelect = DOM.get('editPaymentTerm');
                const notesInput = DOM.get('editPaymentNotes');
                
                if (idInput) idInput.value = p.id;
                if (userIdInput) userIdInput.value = p.user_id;
                if (memberName) memberName.textContent = p.member_name;
                if (yearDisplay) yearDisplay.textContent = p.year || state.currentYear;
                if (yearInput) yearInput.value = p.year || state.currentYear;
                if (amountInput) amountInput.value = p.amount;
                if (methodSelect) methodSelect.value = p.payment_method || 'cash';
                if (dateInput) dateInput.value = p.payment_date || '';
                if (termSelect) termSelect.value = p.term;
                if (notesInput) notesInput.value = '';
                
                // Update current details display
                const currentAmount = DOM.get('currentPaymentAmount');
                const currentTerm = DOM.get('currentPaymentTerm');
                const currentMethod = DOM.get('currentPaymentMethod');
                const currentDate = DOM.get('currentPaymentDate');
                
                if (currentAmount) currentAmount.textContent = formatCurrency(p.amount);
                if (currentTerm) currentTerm.textContent = 'Term ' + p.term;
                if (currentMethod) currentMethod.textContent = getMethodName(p.payment_method);
                if (currentDate) currentDate.textContent = formatDate(p.payment_date);
                
                // Populate term options
                updateTermSelectors();
                
                openModal('editPaymentModal');
            } else {
                showNotification(data.message || 'Error loading payment details', 'error');
            }
        } catch (error) {
            console.error('Error loading payment details:', error);
            showNotification('Payment not found or error loading details', 'error');
        }
    }

    function updateTermSelectors() {
        const selectors = ['editPaymentTerm'];
        
        selectors.forEach(selectorId => {
            const select = DOM.get(selectorId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '';
                for (let i = 1; i <= state.numberOfTerms; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `Term ${i}`;
                    select.appendChild(option);
                }
                if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
                    select.value = currentValue;
                }
            }
        });
    }

    // ============================================
    // SUBMIT EDIT PAYMENT
    // ============================================
    
    async function submitEditPayment(event) {
        event.preventDefault();
        
        if (isWithinCooldown()) return;
        
        const paymentId = DOM.get('editPaymentId')?.value;
        const userId = DOM.get('editPaymentUserId')?.value;
        const term = DOM.get('editPaymentTerm')?.value;
        const amount = DOM.get('editPaymentAmount')?.value;
        const year = DOM.get('editPaymentYear')?.value || state.currentYear;
        const paymentMethod = DOM.get('editPaymentMethod')?.value;
        const paymentDate = DOM.get('editPaymentDate')?.value;
        const notes = DOM.get('editPaymentNotes')?.value;
        
        if (!paymentId) {
            showNotification('Payment ID is missing', 'error');
            return;
        }
        
        if (!validateAmount(amount)) return;
        
        const submitBtn = DOM.get('submitEditPaymentBtn');
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Saving...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('payment_id', paymentId);
            formData.append('user_id', userId);
            formData.append('term', term);
            formData.append('amount', amount);
            formData.append('year', year);
            formData.append('payment_method', paymentMethod || 'cash');
            formData.append('payment_date', paymentDate || '');
            formData.append('notes', notes || '');
            
            const data = await fetchWithRetry(CONFIG.API.UPDATE, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (data.success) {
                closeModal('editPaymentModal');
                forceLoadPayments();
                showNotification('Payment updated successfully!', 'success');
            } else {
                showNotification('Error: ' + (data.message || 'Failed to update payment'), 'error');
            }
        } catch (error) {
            console.error('Error updating payment:', error);
            showNotification('Network error: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalHtml;
            submitBtn.disabled = false;
        }
    }

    // ============================================
    // MODAL FUNCTIONS
    // ============================================
    
    function openModal(modalId) {
        const modal = DOM.get(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            const focusable = modal.querySelector('button, input, select, textarea');
            if (focusable) setTimeout(() => focusable.focus(), 100);
        }
    }

    function closeModal(modalId) {
        const modal = DOM.get(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
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

    function formatCurrency(amount) {
        return 'RWF ' + (parseFloat(amount) || 0).toLocaleString();
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
        } catch {
            return '-';
        }
    }

    function formatDateTime(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleString('en-GB', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '';
        }
    }

    function getMethodBadge(method) {
        const map = {
            'cash': 'bg-green-100 text-green-700',
            'bank_transfer': 'bg-blue-100 text-blue-700',
            'mobile_money': 'bg-purple-100 text-purple-700',
            'cheque': 'bg-yellow-100 text-yellow-700',
            'other': 'bg-gray-100 text-gray-700'
        };
        return map[method] || 'bg-gray-100 text-gray-700';
    }

    function getMethodName(method) {
        const map = {
            'cash': 'Cash',
            'bank_transfer': 'Bank Transfer',
            'mobile_money': 'Mobile Money',
            'cheque': 'Cheque',
            'other': 'Other'
        };
        return map[method] || method || '-';
    }

    function getCsrfToken() {
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (!meta) {
            console.error('CSRF token meta tag not found');
            return null;
        }
        return meta.content;
    }

    function getHeaders() {
        return {
            'X-CSRF-TOKEN': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        };
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async function fetchWithRetry(url, options, retries = CONFIG.MAX_RETRIES) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) {
                    return await response.json();
                }
                if (response.status === 429 && i < retries - 1) {
                    await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY * (i + 1)));
                    continue;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY * (i + 1)));
            }
        }
    }

    function validateAmount(amount) {
        const num = parseFloat(amount);
        if (isNaN(num) || num <= 0) {
            showNotification('Please enter a valid positive amount', 'error');
            return false;
        }
        return true;
    }

    function isWithinCooldown() {
        const now = Date.now();
        if (now - state.lastSubmitTime < CONFIG.SUBMIT_COOLDOWN) {
            showNotification('Please wait before submitting again', 'warning');
            return true;
        }
        state.lastSubmitTime = now;
        return false;
    }

    function showNotification(message, type = 'success') {
    return window.appNotify(...arguments);
        const notification = document.createElement('div');
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle';
        const bgColor = type === 'success' ? 'bg-green-500' : 
                       type === 'warning' ? 'bg-yellow-500' : 'bg-red-500';
        
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 transition-all transform ${bgColor}`;
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <i class="fas ${icon} mr-2" aria-hidden="true"></i>
            <span>${escapeHtml(message)}</span>
            <button onclick="this.parentElement.remove()" class="ml-3 text-white/70 hover:text-white transition" aria-label="Dismiss notification">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (notification.parentNode) notification.remove();
            }, 300);
        }, 4000);
    }

    function createModalOverlay(html, onClose) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (onClose) onClose();
                overlay.remove();
            }
        });
        
        return overlay;
    }

    // ============================================
    // EVENT LISTENERS & INITIALIZATION
    // ============================================
    
    function init() {
        if (state.initialized) return;
        state.initialized = true;
        
        console.log('Payments Manager initializing...');
        
        // Search input with debounce
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', debounce(() => {
                if (!state.isLoading) {
                    forceLoadPayments();
                }
            }, CONFIG.SEARCH_DEBOUNCE));
        }
        
        [elements.fromDate, elements.toDate].forEach(input => {
            input?.addEventListener('change', () => {
                elements.toDate.setCustomValidity('');
                if (elements.fromDate.value > elements.toDate.value) {
                    elements.toDate.setCustomValidity('To date must be on or after from date.');
                    elements.toDate.reportValidity();
                    return;
                }
                forceLoadPayments();
            });
        });
        
        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.fixed:not(.hidden)');
                openModals.forEach(modal => {
                    if (modal.id && modal.id.endsWith('Modal')) {
                        closeModal(modal.id);
                    }
                });
            }
        });
        
        // Update term selectors when number of terms changes
        updateTermSelectors();
        
        // Force initial load of payments
        setTimeout(function() {
            console.log('Initial payments load triggered');
            forceLoadPayments();
        }, 100);
        
        console.log('Payments Manager initialized');
    }

    // ============================================
    // EXPOSE PUBLIC API
    // ============================================
    
    window.paymentsManager = {
        // State
        state: state,
        
        // Payment functions
        filterPayments: filterPayments,
        forceLoadPayments: forceLoadPayments,
        updatePaymentsTable: updatePaymentsTable,
        updatePaymentStats: updatePaymentStats,
        exportPayments: exportPayments,
        
        // Details & Edit
        viewPaymentDetails: viewPaymentDetails,
        openEditModal: openEditModal,
        submitEditPayment: submitEditPayment,
        
        // Modal functions
        openModal: openModal,
        closeModal: closeModal,
        
        // Utility
        updateTermSelectors: updateTermSelectors,
        showNotification: showNotification,
        formatDate: formatDate,
        formatCurrency: formatCurrency,
        getMethodName: getMethodName,
        getMethodBadge: getMethodBadge,
        
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
    @media (max-width: 639px) {
        .payments-responsive-table {
            overflow: visible;
        }

        .payments-responsive-table table,
        .payments-responsive-table tbody {
            display: block;
            width: 100%;
        }

        .payments-responsive-table thead {
            display: none;
        }

        .payments-responsive-table tbody {
            display: grid;
            gap: 12px;
        }

        .payments-responsive-table tbody tr {
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
        }

        .payments-responsive-table tbody td {
            display: grid;
            grid-template-columns: 76px minmax(0, 1fr);
            align-items: center;
            gap: 8px;
            width: 100%;
            max-width: none !important;
            padding: 8px 12px;
            border-bottom: 1px solid #f3f4f6;
            white-space: normal;
        }

        .payments-responsive-table tbody td::before {
            content: attr(data-label);
            color: #6b7280;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .payments-responsive-table tbody td[data-label="#"] {
            display: none;
        }

        .payments-responsive-table tbody td[data-label="Member"] {
            order: -1;
            display: block;
            padding: 12px;
            background: #f9fafb;
        }

        .payments-responsive-table tbody td[data-label="Member"]::before {
            display: none;
        }

        .payments-responsive-table tbody td[data-label="Notes"] {
            overflow: visible;
            text-overflow: clip;
        }

        .payments-responsive-table tbody td[data-label="Actions"] {
            border-bottom: 0;
        }

        .payments-responsive-table tbody td[data-label="Actions"] button {
            width: 36px;
            height: 36px;
        }

        .payments-responsive-table tbody tr > td[colspan] {
            display: block;
            text-align: center;
        }

        .payments-responsive-table tbody tr > td[colspan]::before {
            display: none;
        }
    }

    /* Modal overlay blur effect */
    .modal-overlay {
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
    }

    /* Table hover effect */
    tbody tr {
        transition: background-color 0.2s ease;
    }

    /* Card hover effect */
    .bg-white.rounded-xl {
        transition: all 0.2s ease;
    }
    .bg-white.rounded-xl:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1);
    }

    /* Notification slide animation */
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .fixed.top-4.right-4 {
        animation: slideIn 0.3s ease-out;
    }

    /* Year picker rotation */
    .rotate-180 {
        transform: rotate(180deg);
    }
</style>


