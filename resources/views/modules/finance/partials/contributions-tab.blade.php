<div>
    <!-- Header with Year Selection -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-4">
        <h3 class="text-base font-semibold text-gray-800">Member Contributions</h3>
        <div class="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:items-end">
            <!-- Year Selector -->
            <div class="col-span-2 order-1 flex items-center gap-2 sm:order-none sm:col-auto">
                <label class="text-sm text-gray-600" for="contributionYearDisplay">Year:</label>
                <div class="relative">
                    <div id="contributionYearToggle"
                        class="h-8 flex items-center justify-between border border-gray-300 rounded-lg px-3 bg-white cursor-pointer hover:border-blue-400 transition-all min-w-[110px]"
                        role="button"
                        aria-haspopup="true"
                        aria-expanded="false"
                        tabindex="0">
                        <span id="contributionYearDisplay" class="text-sm font-semibold text-gray-800">{{ request()->get('year', date('Y')) }}</span>
                        <svg class="w-4 h-4 text-gray-400 transition-transform duration-200 ml-2" id="contributionYearArrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                    <input type="hidden" id="contributionSelectedYear" value="{{ request()->get('year', date('Y')) }}">

                    <div id="contributionYearPickerDropdown" class="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 min-w-[200px]" role="listbox">
                        <div class="flex items-center justify-between mb-2">
                            <button type="button" onclick="window.contributionsManager.changeYearPage(-1)"
                                class="p-1 hover:bg-gray-100 rounded transition text-gray-500 hover:text-gray-700"
                                aria-label="Previous years">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                            </button>
                            <span id="contributionYearPageTitle" class="text-xs font-medium text-gray-600">2018 - 2024</span>
                            <button type="button" onclick="window.contributionsManager.changeYearPage(1)"
                                class="p-1 hover:bg-gray-100 rounded transition text-gray-500 hover:text-gray-700"
                                aria-label="Next years">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="grid grid-cols-3 gap-1" id="contributionYearGrid" role="grid"></div>
                    </div>
                </div>
                <span id="yearBadge" class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hidden" role="status">
                    <i class="fas fa-history mr-1"></i> <span id="yearStatus">Current</span>
                </span>
            </div>
            <button onclick="window.contributionsManager.exportContributions()" class="order-2 h-9 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 sm:order-none sm:h-8 sm:w-auto">
                <i class="fas fa-file-excel" aria-hidden="true"></i> Export Excel
            </button>
            <button onclick="window.contributionsManager.openSetAnnualModal()" class="col-span-2 order-4 h-9 w-full bg-green-600 hover:bg-green-700 text-white px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 sm:order-none sm:col-auto sm:h-8 sm:w-auto">
                <i class="fas fa-plus-circle" aria-hidden="true"></i> Set Annual Contribution
            </button>
            <button onclick="window.contributionsManager.openContributeModal()" class="order-3 h-9 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 sm:order-none sm:h-8 sm:w-auto">
                <i class="fas fa-hand-holding-usd" aria-hidden="true"></i> Record Payment
            </button>
        </div>
    </div>

    <!-- Info Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 max-w-3xl">
        <div class="bg-blue-50 rounded-lg p-2.5 sm:p-3 min-w-0">
            <p class="text-xs text-gray-600">Total Expected</p>
            <p class="text-sm sm:text-lg font-bold text-blue-600" id="totalExpected">RWF 0</p>
        </div>
        <div class="bg-green-50 rounded-lg p-2.5 sm:p-3 min-w-0">
            <p class="text-xs text-gray-600">Total Collected</p>
            <p class="text-sm sm:text-lg font-bold text-green-600" id="totalCollected">RWF 0</p>
        </div>
        <div class="col-span-2 sm:col-span-1 bg-purple-50 rounded-lg px-2.5 py-2 sm:p-3 flex items-center justify-between sm:block">
            <p class="text-xs text-gray-600">Collection Rate</p>
            <p class="text-base sm:text-lg font-bold text-purple-600" id="collectionRate">0%</p>
        </div>
    </div>

    <!-- Filters -->
    <div class="mb-3 flex flex-col sm:flex-row gap-2 max-w-4xl">
        <div class="relative w-full sm:w-64">
            <i class="fas fa-users absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true"></i>
            <select id="filterFamily" aria-label="Filter by family"
                class="w-full h-8 pl-9 pr-3 py-0 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white">
                <option value="all">All Families</option>
                @foreach($familiesWithContributions ?? [] as $family)
                <option value="{{ $family->id }}">{{ $family->name }}</option>
                @endforeach
            </select>
        </div>
        <div class="relative flex-1">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true"></i>
            <input type="text" id="searchContributions" placeholder="Search by member name or email..."
                class="w-full h-8 pl-9 pr-3 py-0 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                aria-label="Search contributions">
        </div>
    </div>
    <p id="contributionsCount" class="text-xs text-gray-500 mb-2" role="status">0 contribution records found</p>

    <!-- Contributions Table -->
    <div class="contributions-table overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200" aria-label="Contributions table">
            <thead class="bg-gray-50">
                <tr id="tableHeaderRow">
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">MEMBER</th>
                    <!-- Term headers will be inserted here by JavaScript -->
                    <th id="totalProgressHeader" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">TOTAL PROGRESS</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">ACTIONS</th>
                </tr>
            </thead>
            <tbody id="contributions-table-body">
                <tr>
                    <td colspan="10" class="text-center py-8 text-gray-500">Loading contributions...</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>



<style>
    .rotate-180 {
        transform: rotate(180deg);
    }
    .modal-overlay {
        backdrop-filter: blur(4px);
    }

    @media (max-width: 639px) {
        .contributions-table {
            overflow: visible;
        }

        .contributions-table table,
        .contributions-table tbody {
            display: block;
            width: 100%;
        }

        .contributions-table thead {
            display: none;
        }

        .contributions-table tbody {
            display: grid;
            gap: 12px;
        }

        .contributions-table tbody tr {
            display: block;
            overflow: hidden;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
        }

        .contributions-table tbody td {
            display: grid;
            grid-template-columns: 88px minmax(0, 1fr);
            align-items: center;
            gap: 8px;
            width: 100%;
            min-width: 0 !important;
            padding: 8px 12px;
            border-bottom: 1px solid #f3f4f6;
        }

        .contributions-table tbody td::before {
            content: attr(data-label);
            color: #6b7280;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .contributions-table tbody td[data-label="Member"] {
            display: block;
            padding: 12px;
            background: #f9fafb;
        }

        .contributions-table tbody td[data-label="Member"]::before {
            display: none;
        }

        .contributions-table tbody td[data-label="Actions"] {
            border-bottom: 0;
        }

        .contributions-table tbody td[data-label="Actions"] > div {
            justify-content: flex-start;
        }

        .contributions-table tbody tr > td[colspan] {
            display: block;
            text-align: center;
        }

        .contributions-table tbody tr > td[colspan]::before {
            display: none;
        }
    }
</style>

<script>
// ============================================
// CONTRIBUTIONS MANAGER - Complete Module
// ============================================

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION & CONSTANTS
    // ============================================
    
   const CONFIG = {
    SUBMIT_COOLDOWN: 3000,
    SEARCH_DEBOUNCE: 300,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    DEFAULT_NUMBER_OF_TERMS: 3,
    API: {
        CONTRIBUTIONS: '/finance/contributions/filter',
        SETTINGS: '/finance/settings/get',
        UPDATE_CONTRIBUTION: '/finance/contributions/update',
        SET_ANNUAL: '/finance/contributions/set-annual',
        PAY: '/finance/contributions/pay',
        DETAILS: '/finance/contributions',
        PAYMENT_HISTORY: '/finance/payments',
        FAMILY_FILTER: '/finance/families/filter-options'  // This is now correct
    }
};

    // ============================================
    // STATE
    // ============================================
    
    // Get initial year from URL parameter or use current year
    const urlParams = new URLSearchParams(window.location.search);
    const initialYear = parseInt(urlParams.get('year')) || new Date().getFullYear();

    const state = {
        allUsers: @json($users ?? []),
        allFamilies: @json($families ?? []),
        currentYear: initialYear,
        yearPageOffset: 0,
        numberOfTerms: CONFIG.DEFAULT_NUMBER_OF_TERMS,
        yearSettings: null,
        currentContributeUserId: null,
        selectedContributionId: null,
        isLoading: false,
        lastSubmitTime: 0,
        searchTimeout: null,
        initialized: false,
        initialLoadDone: false
    };

    // ============================================
    // DOM CACHE
    // ============================================
    
    const DOM = {
        get: (id) => document.getElementById(id),
        qs: (selector, context = document) => context.querySelector(selector),
        qsa: (selector, context = document) => context.querySelectorAll(selector)
    };

    // Cache frequently accessed elements
    const elements = {
        yearDisplay: DOM.get('contributionYearDisplay'),
        yearPicker: DOM.get('contributionYearPickerDropdown'),
        yearArrow: DOM.get('contributionYearArrow'),
        yearGrid: DOM.get('contributionYearGrid'),
        yearPageTitle: DOM.get('contributionYearPageTitle'),
        selectedYear: DOM.get('contributionSelectedYear'),
        tableBody: DOM.get('contributions-table-body'),
        tableHeader: DOM.get('tableHeaderRow'),
        totalExpected: DOM.get('totalExpected'),
        totalCollected: DOM.get('totalCollected'),
        collectionRate: DOM.get('collectionRate'),
        contributionsCount: DOM.get('contributionsCount'),
        filterFamily: DOM.get('filterFamily'),
        searchContributions: DOM.get('searchContributions'),
        yearBadge: DOM.get('yearBadge'),
        yearStatus: DOM.get('yearStatus')
    };

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
        notification.innerHTML = `<i class="fas ${icon} mr-2" aria-hidden="true"></i> ${escapeHtml(message)}`;
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
    // YEAR PICKER FUNCTIONS
    // ============================================
    
    function toggleYearPicker() {
        const isHidden = elements.yearPicker.classList.contains('hidden');
        elements.yearPicker.classList.toggle('hidden');
        elements.yearArrow.classList.toggle('rotate-180');
        if (elements.yearPicker) {
            elements.yearPicker.setAttribute('aria-expanded', isHidden);
        }
        if (!isHidden) {
            renderYearGrid();
        }
    }

    function closeYearPicker() {
        if (elements.yearPicker && !elements.yearPicker.classList.contains('hidden')) {
            elements.yearPicker.classList.add('hidden');
            elements.yearArrow.classList.remove('rotate-180');
            if (elements.yearPicker) {
                elements.yearPicker.setAttribute('aria-expanded', 'false');
            }
        }
    }

    function changeYearPage(direction) {
        state.yearPageOffset += direction;
        renderYearGrid();
    }

    function renderYearGrid() {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear + (state.yearPageOffset * 9) - 4;
        
        if (!elements.yearGrid) return;
        
        const endYear = startYear + 8;
        if (elements.yearPageTitle) {
            elements.yearPageTitle.textContent = `${startYear} - ${endYear}`;
        }
        
        elements.yearGrid.innerHTML = '';
        
        for (let i = 0; i < 9; i++) {
            const year = startYear + i;
            const isSelected = year === state.currentYear;
            const isCurrentYear = year === currentYear;
            const isDisabled = year < 2000 || year > 2100;
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = year;
            btn.className = 'py-1.5 px-2 rounded text-xs transition-all text-center';
            btn.setAttribute('role', 'gridcell');
            
            if (isSelected) {
                btn.classList.add('bg-blue-600', 'text-white', 'font-semibold', 'shadow-sm');
                btn.setAttribute('aria-selected', 'true');
            } else if (isCurrentYear) {
                btn.classList.add('bg-blue-50', 'text-blue-600', 'font-medium', 'border', 'border-blue-200');
            } else {
                btn.classList.add('text-gray-700', 'hover:bg-gray-100');
            }
            
            if (isDisabled) {
                btn.classList.add('text-gray-300', 'cursor-not-allowed');
                btn.disabled = true;
            } else {
                btn.addEventListener('click', () => selectYear(year));
            }
            
            elements.yearGrid.appendChild(btn);
        }
    }

    function selectYear(year) {
        state.currentYear = year;
        if (elements.selectedYear) elements.selectedYear.value = year;
        if (elements.yearDisplay) elements.yearDisplay.textContent = year;
        
        closeYearPicker();
        renderYearGrid();
        updateYearBadge();
        loadTermSettingsForYear(year);
        
        // Update family filter options for the selected year
        updateFamilyFilterOptions().then(() => {
            loadContributions();
        });
        
        // Update URL with year parameter
        const url = new URL(window.location.href);
        url.searchParams.set('year', year);
        window.history.pushState({ year: year }, '', url);
    }

    function updateYearBadge() {
        const currentYearNow = new Date().getFullYear();
        
        if (!elements.yearBadge || !elements.yearStatus) return;
        
        if (state.currentYear === currentYearNow) {
            elements.yearBadge.classList.add('hidden');
        } else if (state.currentYear < currentYearNow) {
            elements.yearBadge.classList.remove('hidden');
            elements.yearStatus.innerHTML = 'Archived Year';
            elements.yearBadge.className = 'px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700';
        } else {
            elements.yearBadge.classList.remove('hidden');
            elements.yearStatus.innerHTML = 'Future Year';
            elements.yearBadge.className = 'px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700';
        }
    }

    // ============================================
    // FAMILY FILTER FUNCTIONS
    // ============================================
    
    /**
     * Update family filter options based on selected year
     */
    async function updateFamilyFilterOptions() {
        const year = state.currentYear;
        const filterSelect = elements.filterFamily;
        
        if (!filterSelect) return;
        
        try {
            const data = await fetchWithRetry(
                `${CONFIG.API.FAMILY_FILTER}?year=${year}`,
                { headers: getHeaders() }
            );
            
            if (data.success) {
                // Store current selected value
                const currentValue = filterSelect.value;
                
                // Clear existing options except "All Families"
                filterSelect.innerHTML = '<option value="all">All Families</option>';
                
                // Add families that have contributions in this year
                data.families.forEach(family => {
                    const option = document.createElement('option');
                    option.value = family.id;
                    option.textContent = family.name;
                    filterSelect.appendChild(option);
                });
                
                // Restore selected value if it still exists
                if (currentValue && filterSelect.querySelector(`option[value="${currentValue}"]`)) {
                    filterSelect.value = currentValue;
                } else {
                    filterSelect.value = 'all';
                }
                
                console.log('Family filter options updated for year:', year);
            }
        } catch (error) {
            console.error('Error updating family filter options:', error);
        }
    }

    // ============================================
    // TERM SETTINGS FUNCTIONS
    // ============================================
    
    async function loadTermSettingsForYear(year) {
        try {
            const data = await fetchWithRetry(
                `${CONFIG.API.SETTINGS}?year=${year}`,
                { headers: getHeaders() }
            );
            
            if (data.success && data.settings) {
                state.yearSettings = data.settings;
                state.numberOfTerms = parseInt(data.settings.number_of_terms) || CONFIG.DEFAULT_NUMBER_OF_TERMS;
            } else {
                state.yearSettings = null;
                state.numberOfTerms = CONFIG.DEFAULT_NUMBER_OF_TERMS;
            }
            
            updateTermsHeader();
            updateTermSelectors();
        } catch (error) {
            console.error('Error loading term settings:', error);
            state.numberOfTerms = CONFIG.DEFAULT_NUMBER_OF_TERMS;
            updateTermsHeader();
            updateTermSelectors();
        }
    }

    function updateTermsHeader() {
        if (!elements.tableHeader) return;
        
        const existingHeaders = elements.tableHeader.querySelectorAll('.term-header');
        existingHeaders.forEach(el => el.remove());
        
        const totalProgressHeader = document.getElementById('totalProgressHeader');
        
        for (let i = 1; i <= state.numberOfTerms; i++) {
            const th = document.createElement('th');
            th.className = 'term-header px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap min-w-[120px]';
            th.textContent = `TERM ${i}`;
            th.setAttribute('scope', 'col');
            elements.tableHeader.insertBefore(th, totalProgressHeader);
        }
    }

    function updateTermSelectors() {
        const selectors = ['editPaymentTerm', 'contributeTerm'];
        
        selectors.forEach(selectorId => {
            const select = DOM.get(selectorId);
            if (select) {
                select.innerHTML = '';
                for (let i = 1; i <= state.numberOfTerms; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `Term ${i}`;
                    select.appendChild(option);
                }
            }
        });
    }

    // ============================================
    // MODAL FUNCTIONS
    // ============================================
    
    function openFinanceModal(modalId) {
        const modal = DOM.get(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            const focusable = modal.querySelector('button, input, select, textarea');
            if (focusable) setTimeout(() => focusable.focus(), 100);
        }
    }

    function closeFinanceModal(modalId) {
        const modal = DOM.get(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            const content = modal.querySelector('.dynamic-content');
            if (content) content.innerHTML = '';
            const form = modal.querySelector('form');
            if (form) {
                const hiddenFields = form.querySelectorAll('input[type="hidden"]');
                hiddenFields.forEach(field => field.value = '');
            }
        }
    }

    function openSetAnnualModal() {
        const modal = DOM.get('setAnnualModal');
        if (modal) {
            const yearDisplay = DOM.get('setAnnualYearDisplay');
            const yearInput = DOM.get('setAnnualYear');
            if (yearDisplay) yearDisplay.textContent = state.currentYear;
            if (yearInput) yearInput.value = state.currentYear;
            clearSelectedMember();
            const amountInput = DOM.get('annualAmount');
            if (amountInput) amountInput.value = '';
            const notesInput = DOM.get('setAnnualNotes');
            if (notesInput) notesInput.value = '';
            openFinanceModal('setAnnualModal');
        }
    }

    function openContributeModal() {
        const modal = DOM.get('contributeModal');
        if (modal) {
            const yearDisplay = DOM.get('contributeYearDisplay');
            const yearInput = DOM.get('contributeYear');
            if (yearDisplay) yearDisplay.textContent = state.currentYear;
            if (yearInput) yearInput.value = state.currentYear;
            const userIdInput = DOM.get('selectedContributeUserId');
            if (userIdInput) userIdInput.value = '';
            const memberDisplay = DOM.get('selectedContributeMemberDisplay');
            if (memberDisplay) memberDisplay.classList.add('hidden');
            const searchInput = DOM.get('searchContributeMemberInput');
            if (searchInput) searchInput.value = '';
            const amountInput = DOM.get('contributeAmount');
            if (amountInput) amountInput.value = '';
            const notesInput = DOM.get('contributeNotes');
            if (notesInput) notesInput.value = '';
            state.currentContributeUserId = null;
            openFinanceModal('contributeModal');
            populateMemberList();
        }
    }

    function openContributeForUser(userId, userName) {
        state.currentContributeUserId = userId;
        const userIdInput = DOM.get('selectedContributeUserId');
        const memberName = DOM.get('selectedContributeMemberName');
        const memberDisplay = DOM.get('selectedContributeMemberDisplay');
        const searchInput = DOM.get('searchContributeMemberInput');
        const memberList = DOM.get('contributeMemberList');
        const yearDisplay = DOM.get('contributeYearDisplay');
        
        if (userIdInput) userIdInput.value = userId;
        if (memberName) memberName.innerHTML = escapeHtml(userName);
        if (memberDisplay) memberDisplay.classList.remove('hidden');
        if (searchInput) searchInput.value = '';
        if (memberList) memberList.classList.add('hidden');
        if (yearDisplay) yearDisplay.textContent = state.currentYear;
        
        const amountInput = DOM.get('contributeAmount');
        if (amountInput) amountInput.value = '';
        
        openFinanceModal('contributeModal');
    }

    // ============================================
    // MEMBER SEARCH FUNCTIONS
    // ============================================
    
    const searchMembers = debounce(function() {
        const searchTerm = DOM.get('searchMemberInput')?.value?.toLowerCase() || '';
        const resultsDiv = DOM.get('memberSearchResults');
        
        if (!resultsDiv) return;
        
        if (searchTerm.length < 1) {
            resultsDiv.classList.add('hidden');
            return;
        }
        
        const filteredUsers = state.allUsers.filter(user => 
            user.name?.toLowerCase().includes(searchTerm) || 
            user.email?.toLowerCase().includes(searchTerm)
        );
        
        if (filteredUsers.length === 0) {
            resultsDiv.innerHTML = '<div class="p-3 text-center text-gray-500">No members found</div>';
            resultsDiv.classList.remove('hidden');
            return;
        }
        
        resultsDiv.innerHTML = filteredUsers.map(user => `
            <div class="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0" 
                 data-user-id="${user.id}" data-user-name="${escapeHtml(user.name)}">
                <div class="font-medium text-gray-800">${escapeHtml(user.name)}</div>
                <div class="text-xs text-gray-500">${escapeHtml(user.email)}</div>
            </div>
        `).join('');
        
        resultsDiv.querySelectorAll('[data-user-id]').forEach(el => {
            el.addEventListener('click', () => {
                selectMemberForSetAnnual(
                    parseInt(el.dataset.userId),
                    el.dataset.userName
                );
            });
        });
        
        resultsDiv.classList.remove('hidden');
    }, CONFIG.SEARCH_DEBOUNCE);

    const searchContributeMembers = debounce(function() {
        const searchTerm = DOM.get('searchContributeMemberInput')?.value?.toLowerCase() || '';
        const list = DOM.get('contributeMemberList');
        
        if (!list) return;
        
        if (searchTerm.length < 1) {
            populateMemberList();
            return;
        }
        
        const filteredUsers = state.allUsers.filter(user => 
            user.name?.toLowerCase().includes(searchTerm) || 
            user.email?.toLowerCase().includes(searchTerm)
        );
        
        if (filteredUsers.length === 0) {
            list.innerHTML = '<div class="p-3 text-center text-gray-500">No members found</div>';
            list.classList.remove('hidden');
            return;
        }
        
        list.innerHTML = filteredUsers.map(user => `
            <div class="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                 data-user-id="${user.id}" data-user-name="${escapeHtml(user.name)}">
                <div class="font-medium text-gray-800">${escapeHtml(user.name)}</div>
                <div class="text-xs text-gray-500">${escapeHtml(user.email)}</div>
            </div>
        `).join('');
        
        list.querySelectorAll('[data-user-id]').forEach(el => {
            el.addEventListener('click', () => {
                selectContributeMember(
                    parseInt(el.dataset.userId),
                    el.dataset.userName
                );
            });
        });
        
        list.classList.remove('hidden');
    }, CONFIG.SEARCH_DEBOUNCE);

    function populateMemberList() {
        const list = DOM.get('contributeMemberList');
        if (!list) return;
        
        list.innerHTML = state.allUsers.map(user => `
            <div class="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0"
                 data-user-id="${user.id}" data-user-name="${escapeHtml(user.name)}">
                <div class="font-medium text-gray-800">${escapeHtml(user.name)}</div>
                <div class="text-xs text-gray-500">${escapeHtml(user.email)}</div>
            </div>
        `).join('');
        
        list.querySelectorAll('[data-user-id]').forEach(el => {
            el.addEventListener('click', () => {
                selectContributeMember(
                    parseInt(el.dataset.userId),
                    el.dataset.userName
                );
            });
        });
        
        list.classList.remove('hidden');
    }

    function selectContributeMember(userId, userName) {
        state.currentContributeUserId = userId;
        const userIdInput = DOM.get('selectedContributeUserId');
        const memberName = DOM.get('selectedContributeMemberName');
        const memberDisplay = DOM.get('selectedContributeMemberDisplay');
        const searchInput = DOM.get('searchContributeMemberInput');
        const memberList = DOM.get('contributeMemberList');
        
        if (userIdInput) userIdInput.value = userId;
        if (memberName) memberName.innerHTML = userName;
        if (memberDisplay) memberDisplay.classList.remove('hidden');
        if (searchInput) searchInput.value = '';
        if (memberList) memberList.classList.add('hidden');
    }

    function selectMemberForSetAnnual(userId, userName) {
        const userIdInput = DOM.get('selectedUserId');
        const memberName = DOM.get('selectedMemberName');
        const memberDisplay = DOM.get('selectedMemberDisplay');
        const searchInput = DOM.get('searchMemberInput');
        const resultsDiv = DOM.get('memberSearchResults');
        
        if (userIdInput) userIdInput.value = userId;
        if (memberName) memberName.innerHTML = userName;
        if (memberDisplay) memberDisplay.classList.remove('hidden');
        if (searchInput) searchInput.value = '';
        if (resultsDiv) resultsDiv.classList.add('hidden');
    }

    function clearSelectedMember() {
        const userIdInput = DOM.get('selectedUserId');
        const memberDisplay = DOM.get('selectedMemberDisplay');
        const searchInput = DOM.get('searchMemberInput');
        const resultsDiv = DOM.get('memberSearchResults');
        
        if (userIdInput) userIdInput.value = '';
        if (memberDisplay) memberDisplay.classList.add('hidden');
        if (searchInput) searchInput.value = '';
        if (resultsDiv) resultsDiv.classList.add('hidden');
    }

    function clearSelectedContributeMember() {
        state.currentContributeUserId = null;
        const userIdInput = DOM.get('selectedContributeUserId');
        const memberDisplay = DOM.get('selectedContributeMemberDisplay');
        const searchInput = DOM.get('searchContributeMemberInput');
        
        if (userIdInput) userIdInput.value = '';
        if (memberDisplay) memberDisplay.classList.add('hidden');
        if (searchInput) searchInput.value = '';
        populateMemberList();
    }

    // ============================================
    // EDIT FUNCTIONS
    // ============================================
    
    function editContribution(contributionId, userId, userName, year, annualAmount, notes) {
        const idInput = DOM.get('editContributionId');
        const userIdInput = DOM.get('editContributionUserId');
        const memberName = DOM.get('editContributionMemberName');
        const yearDisplay = DOM.get('editContributionYearDisplay');
        const yearInput = DOM.get('editContributionYear');
        const amountInput = DOM.get('editAnnualAmount');
        const notesInput = DOM.get('editContributionNotes');
        
        if (idInput) idInput.value = contributionId || '';
        if (userIdInput) userIdInput.value = userId;
        if (memberName) memberName.innerHTML = escapeHtml(userName);
        if (yearDisplay) yearDisplay.textContent = year;
        if (yearInput) yearInput.value = year;
        if (amountInput) amountInput.value = annualAmount || 0;
        if (notesInput) notesInput.value = notes || '';
        
        openFinanceModal('editContributionModal');
    }

    function editPayment(paymentId, userId, userName, year, term, amount, paymentMethod, paymentDate, notes) {
        const idInput = DOM.get('editPaymentId');
        const userIdInput = DOM.get('editPaymentUserId');
        const memberName = DOM.get('editPaymentMemberName');
        const yearDisplay = DOM.get('editPaymentYearDisplay');
        const yearInput = DOM.get('editPaymentYear');
        const termSelect = DOM.get('editPaymentTerm');
        const amountInput = DOM.get('editPaymentAmount');
        const methodSelect = DOM.get('editPaymentMethod');
        const dateInput = DOM.get('editPaymentDate');
        const notesInput = DOM.get('editPaymentNotes');
        
        if (idInput) idInput.value = paymentId;
        if (userIdInput) userIdInput.value = userId;
        if (memberName) memberName.innerHTML = escapeHtml(userName);
        if (yearDisplay) yearDisplay.textContent = year;
        if (yearInput) yearInput.value = year;
        if (termSelect) termSelect.value = term;
        if (amountInput) amountInput.value = amount;
        if (methodSelect) methodSelect.value = paymentMethod || 'cash';
        if (dateInput) dateInput.value = paymentDate || '';
        if (notesInput) notesInput.value = notes || '';
        
        openFinanceModal('editPaymentModal');
    }

    // ============================================
    // FORM SUBMISSIONS
    // ============================================
    
    async function submitEditContribution(event) {
        event.preventDefault();
        
        if (isWithinCooldown()) return;
        
        const contributionId = DOM.get('editContributionId')?.value;
        const userId = DOM.get('editContributionUserId')?.value;
        const annualAmount = DOM.get('editAnnualAmount')?.value;
        const notes = DOM.get('editContributionNotes')?.value;
        const year = state.currentYear;
        
        if (!userId) {
            showNotification('User ID is missing', 'error');
            return;
        }
        
        if (!validateAmount(annualAmount)) return;
        
        const submitBtn = DOM.get('submitEditContributionBtn');
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Saving...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('contribution_id', contributionId || '');
            formData.append('user_id', userId);
            formData.append('annual_amount', annualAmount);
            formData.append('notes', notes || '');
            formData.append('year', year);
            
            const data = await fetchWithRetry(CONFIG.API.UPDATE_CONTRIBUTION, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (data.success) {
                closeFinanceModal('editContributionModal');
                loadContributions();
                showNotification('Contribution updated successfully!', 'success');
            } else {
                showNotification('Error: ' + (data.message || 'Failed to update contribution'), 'error');
            }
        } catch (error) {
            console.error('Error updating contribution:', error);
            showNotification('Network error: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalHtml;
            submitBtn.disabled = false;
        }
    }

    async function submitSetAnnual(event) {
        event.preventDefault();
        
        if (isWithinCooldown()) return;
        
        const userId = DOM.get('selectedUserId')?.value;
        const annualAmount = DOM.get('annualAmount')?.value;
        const year = state.currentYear;
        const notes = DOM.get('setAnnualNotes')?.value;
        
        if (!userId) {
            showNotification('Please search and select a member', 'error');
            return;
        }
        
        if (!validateAmount(annualAmount)) return;
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Saving...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('user_id', userId);
            formData.append('annual_amount', annualAmount);
            formData.append('year', year);
            formData.append('notes', notes || '');
            
            const data = await fetchWithRetry(CONFIG.API.SET_ANNUAL, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (data.success) {
                closeFinanceModal('setAnnualModal');
                loadContributions();
                showNotification('Annual contribution set successfully!', 'success');
                clearSelectedMember();
                const amountInput = DOM.get('annualAmount');
                if (amountInput) amountInput.value = '';
            } else {
                showNotification('Error: ' + (data.message || 'Failed to set contribution'), 'error');
            }
        } catch (error) {
            console.error('Error setting annual contribution:', error);
            showNotification('Network error: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalHtml;
            submitBtn.disabled = false;
        }
    }

    async function submitContribute(event) {
        event.preventDefault();
        
        if (isWithinCooldown()) return;
        
        const userId = DOM.get('selectedContributeUserId')?.value;
        const term = DOM.get('contributeTerm')?.value;
        const amount = DOM.get('contributeAmount')?.value;
        const year = state.currentYear;
        const paymentMethod = DOM.get('contributePaymentMethod')?.value;
        const notes = DOM.get('contributeNotes')?.value;
        
        if (!userId) {
            showNotification('Please select a member', 'error');
            return;
        }
        
        if (!validateAmount(amount)) return;
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Submitting...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('user_id', userId);
            formData.append('term', term);
            formData.append('amount', amount);
            formData.append('year', year);
            formData.append('payment_method', paymentMethod || 'cash');
            formData.append('notes', notes || '');
            
            const data = await fetchWithRetry(CONFIG.API.PAY, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (data.success) {
                closeFinanceModal('contributeModal');
                loadContributions();
                showNotification('Payment recorded successfully!', 'success');
                clearSelectedContributeMember();
                const amountInput = DOM.get('contributeAmount');
                if (amountInput) amountInput.value = '';
            } else {
                showNotification('Error: ' + (data.message || 'Failed to record payment'), 'error');
            }
        } catch (error) {
            console.error('Error recording payment:', error);
            showNotification('Network error: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalHtml;
            submitBtn.disabled = false;
        }
    }

    async function submitEditPayment(event) {
        event.preventDefault();
        
        if (isWithinCooldown()) return;
        
        const paymentId = DOM.get('editPaymentId')?.value;
        const userId = DOM.get('editPaymentUserId')?.value;
        const term = DOM.get('editPaymentTerm')?.value;
        const amount = DOM.get('editPaymentAmount')?.value;
        const year = state.currentYear;
        const paymentMethod = DOM.get('editPaymentMethod')?.value;
        const paymentDate = DOM.get('editPaymentDate')?.value;
        const notes = DOM.get('editPaymentNotes')?.value;
        
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
            
            const data = await fetchWithRetry('/finance/payments/update', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (data.success) {
                closeFinanceModal('editPaymentModal');
                loadContributions();
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
    // CONTRIBUTION TABLE FUNCTIONS
    // ============================================
    
    async function loadContributions() {
        // Only block if we're already loading AND initial load is done
        if (state.isLoading && state.initialLoadDone) return;
        
        state.isLoading = true;
        
        const search = elements.searchContributions?.value || '';
        const year = state.currentYear;
        const familyId = elements.filterFamily?.value || 'all';
        
        console.log('Loading contributions with filters:', { search, year, familyId });
        
        try {
            const data = await fetchWithRetry(
                `${CONFIG.API.CONTRIBUTIONS}?search=${encodeURIComponent(search)}&year=${year}&family_id=${encodeURIComponent(familyId)}`,
                { headers: getHeaders() }
            );
            
            if (data.success) {
                updateContributionsTable(data.contributions || []);
                updateStats(data.contributions || []);
                state.initialLoadDone = true;
            } else {
                console.error('Error loading contributions:', data.message);
                showNotification('Error loading contributions: ' + (data.message || 'Unknown error'), 'error');
                updateContributionsTable([]);
                updateStats([]);
            }
        } catch (error) {
            console.error('Error loading contributions:', error);
            showNotification('Error loading contributions. Please try again.', 'error');
            updateContributionsTable([]);
            updateStats([]);
        } finally {
            state.isLoading = false;
        }
    }

    function exportContributions() {
        const params = new URLSearchParams({
            search: elements.searchContributions?.value || '',
            year: state.currentYear,
            family_id: elements.filterFamily?.value || 'all'
        });

        window.location.href = `/finance/contributions/export?${params.toString()}`;
    }

    function updateStats(contributions) {
        let totalExpected = 0;
        let totalCollected = 0;
        let count = 0;
        
        if (contributions && Array.isArray(contributions) && contributions.length > 0) {
            contributions.forEach(cont => {
                const annualAmount = parseFloat(cont.annual_amount) || 0;
                const totalPaid = parseFloat(cont.total_paid) || 0;
                
                totalExpected += annualAmount;
                totalCollected += totalPaid;
                count++;
            });
        }
        
        const collectionRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : 0;
        
        if (elements.totalExpected) elements.totalExpected.textContent = formatCurrency(totalExpected);
        if (elements.totalCollected) elements.totalCollected.textContent = formatCurrency(totalCollected);
        if (elements.collectionRate) elements.collectionRate.textContent = collectionRate + '%';
        if (elements.contributionsCount) {
            elements.contributionsCount.textContent = count + ' contribution record' + (count !== 1 ? 's' : '') + ' found';
        }
    }

    function updateContributionsTable(contributions) {
    if (!elements.tableBody) return;
    
    const numberOfTerms = state.numberOfTerms;
    const currentYear = state.currentYear;
    
    if (!contributions || contributions.length === 0) {
        elements.tableBody.innerHTML = `<tr><td colspan="${numberOfTerms + 3}" class="text-center py-8 text-gray-500">No contributions found for ${currentYear}</td></tr>`;
        return;
    }
    
    elements.tableBody.innerHTML = contributions.map(cont => {
        let termsHtml = '';
        const annualAmount = parseFloat(cont.annual_amount) || 0;
        
        for (let i = 1; i <= numberOfTerms; i++) {
            const termAmount = parseFloat(cont[`term${i}_paid`]) || 0;
            const termTarget = parseFloat(cont[`term${i}_target`]) || 0;
            
            let termProgress = 0;
            if (termTarget > 0) {
                termProgress = Math.min((termAmount / termTarget) * 100, 100);
            } else if (termAmount > 0) {
                termProgress = 100;
            }
            
            const progressColor = termProgress >= 100 ? 'bg-green-500' : (termProgress >= 50 ? 'bg-blue-500' : 'bg-yellow-500');
            const progressLabel = `${termProgress.toFixed(1)}% complete for Term ${i}`;
            
            termsHtml += `
                <td class="px-3 py-2 text-sm min-w-[120px]" data-label="Term ${i}">
                    <div class="flex flex-col gap-1">
                        <div class="flex justify-between items-center">
                            <span class="font-medium text-green-600">${formatCurrency(termAmount)}</span>
                            <span class="text-gray-400 text-xs">/ ${formatCurrency(termTarget)}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow="${termProgress}" aria-valuemin="0" aria-valuemax="100" aria-label="${progressLabel}">
                            <div class="${progressColor} h-1.5 rounded-full transition-all duration-300" style="width: ${termProgress}%"></div>
                        </div>
                    </div>
                </td>
            `;
        }
        
        const totalPaid = parseFloat(cont.total_paid) || 0;
        const overallProgress = annualAmount > 0 ? Math.min((totalPaid / annualAmount) * 100, 100) : 0;
        const progressColor = overallProgress >= 100 ? 'bg-green-600' : (overallProgress >= 50 ? 'bg-blue-600' : 'bg-purple-600');
        
        // Show family info or "No Family in [year]" if no family exists in this year
        let familyInfo = '';
        if (cont.family_name && cont.family_year == currentYear) {
            familyInfo = `<span class="text-xs text-gray-400"><i class="fas fa-house mr-1"></i>${escapeHtml(cont.family_name)}</span>`;
        } else {
            familyInfo = `<span class="text-xs text-gray-400 italic">No Family in ${currentYear}</span>`;
        }
        
        const overallProgressLabel = `${overallProgress.toFixed(1)}% overall progress`;
        
        return `
            <tr class="border-b hover:bg-gray-50 transition">
                <td class="px-3 py-2" data-label="Member">
                    <div class="flex flex-col">
                        <p class="font-medium text-gray-800">${escapeHtml(cont.user_name)}</p>
                        <p class="text-xs text-gray-500">${escapeHtml(cont.email)}</p>
                        ${familyInfo}
                    </div>
                </td>
                ${termsHtml}
                <td class="px-3 py-2 min-w-[150px]" data-label="Total Progress">
                    <div class="flex flex-col gap-1">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-purple-600">${overallProgress.toFixed(1)}%</span>
                            <span class="text-gray-400 text-xs">${formatCurrency(totalPaid)} / ${formatCurrency(annualAmount)}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow="${overallProgress}" aria-valuemin="0" aria-valuemax="100" aria-label="${overallProgressLabel}">
                            <div class="${progressColor} h-1.5 rounded-full transition-all duration-300" style="width: ${overallProgress}%"></div>
                        </div>
                    </div>
                </td>
                <td class="px-3 py-2" data-label="Actions">
                    <div class="flex items-center gap-1">
                        <button onclick="window.contributionsManager.editContribution(${cont.id || 'null'}, ${cont.user_id}, '${escapeHtml(cont.user_name)}', ${currentYear}, ${annualAmount}, '${escapeHtml(cont.contribution_notes || '')}')" 
                                class="h-7 w-7 inline-flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 transition" 
                                title="Edit Annual Amount"
                                aria-label="Edit annual amount for ${escapeHtml(cont.user_name)}">
                            <i class="fas fa-edit text-sm" aria-hidden="true"></i>
                        </button>
                        <button onclick="window.contributionsManager.openContributeForUser(${cont.user_id}, '${escapeHtml(cont.user_name)}')" 
                                class="h-7 w-7 inline-flex items-center justify-center rounded-md text-green-600 hover:bg-green-50 transition" 
                                title="Record Payment"
                                aria-label="Record payment for ${escapeHtml(cont.user_name)}">
                            <i class="fas fa-hand-holding-usd text-sm" aria-hidden="true"></i>
                        </button>
                        <button onclick="window.contributionsManager.viewContributionDetails(${cont.user_id})" 
                                class="h-7 w-7 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-50 transition" 
                                title="View Details & History"
                                aria-label="View details and history for ${escapeHtml(cont.user_name)}">
                            <i class="fas fa-file-lines text-sm" aria-hidden="true"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

    // ============================================
    // VIEW DETAILS
    // ============================================
    
    async function viewContributionDetails(userId) {
        const year = state.currentYear;
        
        try {
            const data = await fetchWithRetry(
                `${CONFIG.API.DETAILS}/${userId}/details?year=${year}`,
                { headers: getHeaders() }
            );
            
            if (data.success) {
                const title = DOM.get('viewDetailsModalTitle');
                if (title) {
                    title.textContent = `Contribution Details - ${data.user_name} (${year})`;
                }
                
                let contributionHistoryHtml = '';
                if (data.contribution_history && data.contribution_history.length > 0) {
                    contributionHistoryHtml = `
                        <div class="mb-6">
                            <h4 class="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                <i class="fas fa-chart-line text-blue-500" aria-hidden="true"></i> Annual Amount Edit History
                            </h4>
                            <div class="space-y-2">
                                ${data.contribution_history.map(history => `
                                    <div class="border-l-4 border-blue-400 bg-blue-50 rounded-r-lg p-3">
                                        <div class="flex justify-between items-start mb-2">
                                            <div>
                                                <span class="text-xs font-semibold text-blue-700">${escapeHtml(history.edited_by_name || 'Unknown')}</span>
                                                <span class="text-xs text-gray-500">(${escapeHtml(history.edited_by_email || 'No email')})</span>
                                            </div>
                                            <span class="text-xs text-gray-500">${new Date(history.created_at).toLocaleString()}</span>
                                        </div>
                                        <div class="text-sm">
                                            <div class="grid grid-cols-2 gap-2 mb-2">
                                                <div><span class="text-gray-500">Amount:</span> <span class="line-through text-red-500">${formatCurrency(history.old_amount || 0)}</span> â†’ <span class="text-green-600 font-medium">${formatCurrency(history.new_amount || 0)}</span></div>
                                            </div>
                                            ${history.notes ? `<div class="text-xs text-gray-500 mt-1"><span class="text-gray-400">Reason:</span> ${escapeHtml(history.notes)}</div>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
                
                let paymentsHtml = '';
                if (data.payments && data.payments.length > 0) {
                    paymentsHtml = `
                        <div>
                            <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <i class="fas fa-money-bill-wave text-green-500" aria-hidden="true"></i> Payment Records
                            </h4>
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-gray-200 border rounded-lg" aria-label="Payment records">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Term</th>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        ${data.payments.map(p => `
                                            <tr>
                                                <td class="px-3 py-2 text-xs">Term ${p.term}</td>
                                                <td class="px-3 py-2 text-xs font-semibold text-green-600">${formatCurrency(p.amount)}</td>
                                                <td class="px-3 py-2 text-xs">${p.payment_date || '-'}</td>
                                                <td class="px-3 py-2 text-xs capitalize">${p.payment_method || 'Cash'}</td>
                                                <td class="px-3 py-2 text-xs">
                                                    <div class="flex gap-1">
                                                        <button onclick="window.contributionsManager.editPayment(${p.id}, ${data.user_id}, '${escapeHtml(data.user_name)}', ${year}, ${p.term}, ${p.amount}, '${p.payment_method || 'cash'}', '${p.payment_date || ''}', '${escapeHtml(p.notes || '')}')" 
                                                                class="h-7 w-7 inline-flex items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 transition" 
                                                                title="Edit Payment"
                                                                aria-label="Edit payment for term ${p.term}">
                                                            <i class="fas fa-edit" aria-hidden="true"></i>
                                                        </button>
                                                        <button onclick="window.contributionsManager.viewPaymentHistory(${p.id}, ${data.user_id}, '${escapeHtml(data.user_name)}', ${year})" 
                                                                class="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 transition" 
                                                                title="View Payment History"
                                                                aria-label="View payment history for term ${p.term}">
                                                            <i class="fas fa-history" aria-hidden="true"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;
                } else {
                    paymentsHtml = '<p class="text-gray-500 text-center py-4">No payment records found</p>';
                }
                
                const content = DOM.get('viewDetailsContent');
                if (content) {
                    content.innerHTML = `
                        <div class="space-y-3">
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div class="bg-blue-50 rounded-lg p-3">
                                    <p class="text-xs text-gray-500">Annual Amount</p>
                                    <p class="text-lg font-bold text-blue-600">${formatCurrency(data.annual_amount)}</p>
                                </div>
                                <div class="bg-green-50 rounded-lg p-3">
                                    <p class="text-xs text-gray-500">Total Paid</p>
                                    <p class="text-lg font-bold text-green-600">${formatCurrency(data.total_paid)}</p>
                                </div>
                                <div class="bg-amber-50 rounded-lg p-3">
                                    <p class="text-xs text-gray-500">Outstanding</p>
                                    <p class="text-lg font-bold text-amber-600">${formatCurrency(Math.max((parseFloat(data.annual_amount) || 0) - (parseFloat(data.total_paid) || 0), 0))}</p>
                                </div>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3">
                                <div class="flex justify-between text-sm mb-1">
                                    <span>Overall Progress</span>
                                    <span class="font-semibold">${data.progress}%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow="${data.progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Overall progress">
                                    <div class="bg-purple-600 h-1.5 rounded-full" style="width: ${data.progress}%"></div>
                                </div>
                            </div>
                            ${contributionHistoryHtml}
                            ${paymentsHtml}
                        </div>
                    `;
                }
                openFinanceModal('viewDetailsModal');
            } else {
                showNotification('Error loading details: ' + (data.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error loading details:', error);
            showNotification('Error loading details. Please try again.', 'error');
        }
    }

    async function viewPaymentHistory(paymentId, userId, userName, year) {
        try {
            const data = await fetchWithRetry(
                `${CONFIG.API.PAYMENT_HISTORY}/${paymentId}/history`,
                { headers: getHeaders() }
            );
            
            if (data.success) {
                const modalHtml = `
                    <div class="relative mx-auto p-6 border w-full max-w-3xl shadow-2xl rounded-2xl bg-white">
                        <div class="flex justify-between items-center pb-4 border-b">
                            <h3 class="text-xl font-bold text-gray-800">Payment Edit History</h3>
                            <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 transition" aria-label="Close modal">
                                <i class="fas fa-times text-xl" aria-hidden="true"></i>
                            </button>
                        </div>
                        <div class="mt-4 max-h-96 overflow-y-auto">
                            <div class="bg-gray-50 rounded-lg p-4 mb-4">
                                <h4 class="font-semibold text-gray-800 mb-2">Current Payment Details</h4>
                                <div class="grid grid-cols-2 gap-3 text-sm">
                                    <div><span class="text-gray-500">Term:</span> <span class="font-medium">${data.payment.term}</span></div>
                                    <div><span class="text-gray-500">Amount:</span> <span class="font-medium text-green-600">${formatCurrency(data.payment.amount)}</span></div>
                                    <div><span class="text-gray-500">Method:</span> <span class="font-medium capitalize">${data.payment.payment_method || 'Cash'}</span></div>
                                    <div><span class="text-gray-500">Date:</span> <span class="font-medium">${data.payment.payment_date || '-'}</span></div>
                                </div>
                            </div>
                            ${data.history && data.history.length > 0 ? `
                                <div>
                                    <h4 class="font-semibold text-gray-800 mb-3">Edit History</h4>
                                    <div class="space-y-3">
                                        ${data.history.map(history => `
                                            <div class="border-l-4 border-blue-400 bg-blue-50 rounded-r-lg p-3">
                                                <div class="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span class="text-xs font-semibold text-blue-700">${escapeHtml(history.edited_by_name || 'Unknown')}</span>
                                                        <span class="text-xs text-gray-500">(${escapeHtml(history.edited_by_email || 'No email')})</span>
                                                    </div>
                                                    <span class="text-xs text-gray-500">${new Date(history.created_at).toLocaleString()}</span>
                                                </div>
                                                <div class="text-sm">
                                                    <div class="grid grid-cols-2 gap-2 mb-2">
                                                        <div><span class="text-gray-500">Term:</span> <span class="line-through text-red-500">${history.old_term || '-'}</span> â†’ <span class="text-green-600 font-medium">${history.new_term || '-'}</span></div>
                                                        <div><span class="text-gray-500">Amount:</span> <span class="line-through text-red-500">${formatCurrency(history.old_amount || 0)}</span> â†’ <span class="text-green-600 font-medium">${formatCurrency(history.new_amount || 0)}</span></div>
                                                        <div><span class="text-gray-500">Method:</span> <span class="line-through text-red-500 capitalize">${history.old_payment_method || '-'}</span> â†’ <span class="text-green-600 font-medium capitalize">${history.new_payment_method || '-'}</span></div>
                                                        <div><span class="text-gray-500">Date:</span> <span class="line-through text-red-500">${history.old_payment_date || '-'}</span> â†’ <span class="text-green-600 font-medium">${history.new_payment_date || '-'}</span></div>
                                                    </div>
                                                    ${history.notes ? `<div class="text-xs text-gray-500 mt-1"><span class="text-gray-400">Reason:</span> ${escapeHtml(history.notes)}</div>` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : '<div class="text-center py-8 text-gray-500">No edit history found for this payment</div>'}
                        </div>
                        <div class="flex justify-end mt-6 pt-4 border-t">
                            <button onclick="this.closest('.fixed').remove()" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">Close</button>
                        </div>
                    </div>
                `;
                
                const overlay = createModalOverlay(modalHtml);
                
                const handleEsc = (e) => {
                    if (e.key === 'Escape') {
                        overlay.remove();
                        document.removeEventListener('keydown', handleEsc);
                    }
                };
                document.addEventListener('keydown', handleEsc);
                
            } else {
                showNotification('Error loading payment history: ' + (data.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error loading payment history:', error);
            showNotification('Error loading payment history. Please try again.', 'error');
        }
    }

    // ============================================
    // FORCE LOAD CONTRIBUTIONS
    // ============================================
    
    function forceLoadContributions() {
        state.initialLoadDone = false;
        state.isLoading = false;
        console.log('Forcing contributions load...');
        loadContributions();
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    
    function init() {
        if (state.initialized) return;
        state.initialized = true;
        
        console.log('Contributions Manager initializing...');
        
        const currentYear = state.currentYear;
        
        if (elements.selectedYear) elements.selectedYear.value = currentYear;
        if (elements.yearDisplay) elements.yearDisplay.textContent = currentYear;
        
        // Year picker toggle
        const toggle = DOM.get('contributionYearToggle');
        if (toggle) {
            toggle.addEventListener('click', toggleYearPicker);
            toggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleYearPicker();
                }
            });
        }
        
        // Family filter change
        if (elements.filterFamily) {
            elements.filterFamily.addEventListener('change', function() {
                console.log('Family filter changed to:', this.value, 'for year:', state.currentYear);
                state.initialLoadDone = false;
                state.isLoading = false;
                loadContributions();
            });
        }
        
        // Search input
        if (elements.searchContributions) {
            elements.searchContributions.addEventListener('input', debounce(forceLoadContributions, CONFIG.SEARCH_DEBOUNCE));
        }
        
        // Handle browser back/forward with year parameter
        window.addEventListener('popstate', function(event) {
            if (event.state && event.state.year) {
                const year = event.state.year;
                state.currentYear = year;
                if (elements.selectedYear) elements.selectedYear.value = year;
                if (elements.yearDisplay) elements.yearDisplay.textContent = year;
                updateYearBadge();
                loadTermSettingsForYear(year);
                updateFamilyFilterOptions().then(() => {
                    loadContributions();
                });
            }
        });
        
        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.fixed:not(.hidden)');
                openModals.forEach(modal => {
                    if (modal.id && modal.id.endsWith('Modal')) {
                        closeFinanceModal(modal.id);
                    }
                });
            }
        });
        
        // Close dropdowns on outside click
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            if (elements.yearPicker && !elements.yearPicker.classList.contains('hidden')) {
                const parentDiv = elements.yearDisplay?.closest('.relative');
                if (parentDiv && !parentDiv.contains(target)) {
                    closeYearPicker();
                }
            }
            
            const searchResults = DOM.get('memberSearchResults');
            const searchInput = DOM.get('searchMemberInput');
            if (searchResults && !searchResults.contains(target) && target !== searchInput) {
                searchResults.classList.add('hidden');
            }
            
            const contributeList = DOM.get('contributeMemberList');
            const contributeInput = DOM.get('searchContributeMemberInput');
            if (contributeList && !contributeList.contains(target) && target !== contributeInput) {
                contributeList.classList.add('hidden');
            }
        });
        
        // Load term settings
        loadTermSettingsForYear(currentYear);
        
        // Update family filter options for current year
        updateFamilyFilterOptions().then(() => {
            // Force initial load of contributions
            setTimeout(function() {
                console.log('Initial contributions load triggered for year:', state.currentYear);
                forceLoadContributions();
            }, 100);
        });
        
        console.log('Contributions Manager initialized');
    }

    // ============================================
    // EXPOSE PUBLIC API
    // ============================================
    
    window.contributionsManager = {
        // State
        state: state,
        
        // Year functions
        toggleYearPicker,
        closeYearPicker,
        changeYearPage,
        selectYear,
        renderYearGrid,
        updateYearBadge,
        
        // Family filter
        updateFamilyFilterOptions,
        
        // Term functions
        loadTermSettingsForYear,
        updateTermsHeader,
        updateTermSelectors,
        
        // Modal functions
        openFinanceModal,
        closeFinanceModal,
        openSetAnnualModal,
        openContributeModal,
        openContributeForUser,
        
        // Member search
        searchMembers,
        searchContributeMembers,
        populateMemberList,
        selectContributeMember,
        selectMemberForSetAnnual,
        clearSelectedMember,
        clearSelectedContributeMember,
        
        // Edit functions
        editContribution,
        editPayment,
        
        // Form submissions
        submitEditContribution,
        submitSetAnnual,
        submitContribute,
        submitEditPayment,
        
        // Table functions
        loadContributions,
        exportContributions,
        forceLoadContributions,
        updateStats,
        updateContributionsTable,
        
        // View functions
        viewContributionDetails,
        viewPaymentHistory,
        
        // Utility
        init
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
</script>


