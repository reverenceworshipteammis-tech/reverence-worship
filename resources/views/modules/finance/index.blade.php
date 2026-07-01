@extends('layouts.app')

@section('title', 'Financial Management')
@section('page-title', 'Financial Management')

@section('content')
<div class="container mx-auto px-2 sm:px-4 py-3 sm:py-5">
    
    <!-- Tabs Navigation -->
    <div class="relative z-40 bg-white rounded-lg shadow-sm border border-gray-200 overflow-visible mb-4">
        <!-- Mobile section selector -->
        <div class="md:hidden p-2">
            <div class="relative w-full max-w-[280px]" id="financeMobileTabPicker">
                <button type="button" id="financeMobileTabButton"
                    onclick="toggleFinanceMobileTabs()"
                    class="h-10 w-full flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    aria-haspopup="true" aria-expanded="false">
                    <span class="flex items-center gap-2">
                        <i id="financeMobileTabIcon" class="fas fa-chart-line text-blue-600" aria-hidden="true"></i>
                        <span id="financeMobileTabLabel">Overview</span>
                    </span>
                    <i class="fas fa-chevron-down text-gray-400 text-[10px]" aria-hidden="true"></i>
                </button>
                <div id="financeMobileTabMenu"
                    class="hidden absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg">
                    <div class="grid grid-cols-2 gap-1">
                        <button type="button" onclick="selectFinanceMobileTab('overview')" class="finance-mobile-tab-option h-10 rounded-md px-3 text-left text-sm text-gray-700 hover:bg-gray-100" data-tab="overview" data-icon="chart-line">Overview</button>
                        <button type="button" onclick="selectFinanceMobileTab('settings')" class="finance-mobile-tab-option h-10 rounded-md px-3 text-left text-sm text-gray-700 hover:bg-gray-100" data-tab="settings" data-icon="cog">Settings</button>
                        <button type="button" onclick="selectFinanceMobileTab('contributions')" class="finance-mobile-tab-option h-10 rounded-md px-3 text-left text-sm text-gray-700 hover:bg-gray-100" data-tab="contributions" data-icon="hand-holding-usd">Contributions</button>
                        <button type="button" onclick="selectFinanceMobileTab('payments')" class="finance-mobile-tab-option h-10 rounded-md px-3 text-left text-sm text-gray-700 hover:bg-gray-100" data-tab="payments" data-icon="credit-card">Payments</button>
                        <button type="button" onclick="selectFinanceMobileTab('sponsors')" class="finance-mobile-tab-option h-10 rounded-md px-3 text-left text-sm text-gray-700 hover:bg-gray-100" data-tab="sponsors" data-icon="users">Sponsors</button>
                        <button type="button" onclick="selectFinanceMobileTab('expenses')" class="finance-mobile-tab-option h-10 rounded-md px-3 text-left text-sm text-gray-700 hover:bg-gray-100" data-tab="expenses" data-icon="receipt">Expenses</button>
                        <button type="button" onclick="selectFinanceMobileTab('action-plans')" class="finance-mobile-tab-option col-span-2 h-10 rounded-md px-3 text-left text-sm text-gray-700 hover:bg-gray-100" data-tab="action-plans" data-icon="tasks">Action Plans</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tablet and desktop tabs -->
        <div class="hidden md:block border-b border-gray-200">
            <nav class="flex flex-wrap">
                <button class="tab-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap" data-tab="overview">
                    <i class="fas fa-chart-line mr-1.5"></i> Overview
                </button>
                <button class="tab-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap" data-tab="settings">
                    <i class="fas fa-cog mr-1.5"></i> Settings
                </button>
                <button class="tab-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap" data-tab="contributions">
                    <i class="fas fa-hand-holding-usd mr-1.5"></i> Contributions
                </button>
                <button class="tab-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap" data-tab="payments">
                    <i class="fas fa-credit-card mr-1.5"></i> Payments
                </button>
                <button class="tab-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap" data-tab="sponsors">
                    <i class="fas fa-users mr-1.5"></i> Sponsors
                </button>
                <button class="tab-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap" data-tab="expenses">
                    <i class="fas fa-receipt mr-1.5"></i> Expenses
                </button>
                <button class="tab-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap" data-tab="action-plans">
                    <i class="fas fa-tasks mr-1.5"></i> Action Plans
                </button>
            </nav>
        </div>
    </div>
    
    <!-- Tab Content -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-3 sm:p-4">
            <!-- Overview Tab -->
            <div id="overview-tab" class="tab-content">
                @include('modules.finance.partials.overview-tab')
            </div>
            
            <!-- Settings Tab -->
            <div id="settings-tab" class="tab-content hidden">
                @include('modules.finance.partials.settings-tab')
            </div>
            
            <!-- Contributions Tab -->
            <div id="contributions-tab" class="tab-content hidden">
                @include('modules.finance.partials.contributions-tab')
            </div>
            
            <!-- Payments Tab -->
            <div id="payments-tab" class="tab-content hidden">
                @include('modules.finance.partials.payments-tab')
            </div>
            
            <!-- Sponsors Tab -->
            <div id="sponsors-tab" class="tab-content hidden">
                @include('modules.finance.partials.sponsors-tab')
            </div>
            
            <!-- Expenses Tab -->
            <div id="expenses-tab" class="tab-content hidden">
                @include('modules.finance.partials.expenses-tab')
            </div>
            
            <!-- Action Plans Tab -->
            <div id="action-plans-tab" class="tab-content hidden">
                @include('modules.finance.partials.action-plans-tab')
            </div>
        </div>
    </div>
</div>

<!-- ============================================ -->
<!-- MODALS - AT ROOT LEVEL FOR ALL TABS         -->
<!-- ============================================ -->

<!-- Payment Modals -->
@include('modules.finance.partials.modals.payment-modals')

<!-- Contribution Modals -->
@include('modules.finance.partials.modals.contribution-modals')
@include('modules.finance.partials.modals.sponsor-modals')
@include('modules.finance.partials.modals.expense-modals')
<script>
// ============================================
// TAB MANAGEMENT - ONLY Tab switching logic
// ============================================
const STORAGE_KEY = 'finance_active_tab';

document.addEventListener('DOMContentLoaded', function() {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    const savedTab = localStorage.getItem(STORAGE_KEY);
    const defaultTab = 'overview';
    const activeTab = requestedTab && isValidTab(requestedTab)
        ? requestedTab
        : (savedTab && isValidTab(savedTab) ? savedTab : defaultTab);
    
    initializeTabs();
    activateTab(activeTab);
    setupTabClickHandlers();
});

function isValidTab(tabName) {
    const validTabs = ['overview', 'settings', 'contributions', 'payments', 'sponsors', 'expenses', 'action-plans'];
    return validTabs.includes(tabName);
}

function initializeTabs() {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
}

function toggleFinanceMobileTabs() {
    const menu = document.getElementById('financeMobileTabMenu');
    const button = document.getElementById('financeMobileTabButton');
    if (!menu || !button) return;

    const isOpening = menu.classList.contains('hidden');
    menu.classList.toggle('hidden');
    button.setAttribute('aria-expanded', isOpening ? 'true' : 'false');
}

function selectFinanceMobileTab(tabName) {
    if (!isValidTab(tabName)) return;

    localStorage.setItem(STORAGE_KEY, tabName);
    activateTab(tabName);
    document.getElementById('financeMobileTabMenu')?.classList.add('hidden');
    document.getElementById('financeMobileTabButton')?.setAttribute('aria-expanded', 'false');
}

function setupTabClickHandlers() {
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        tab.removeEventListener('click', handleTabClick);
        tab.addEventListener('click', handleTabClick);
    });

    const mobileButton = document.getElementById('financeMobileTabButton');
    const mobileMenu = document.getElementById('financeMobileTabMenu');
    if (mobileButton && mobileMenu) {
        document.addEventListener('click', function(event) {
            const picker = document.getElementById('financeMobileTabPicker');
            if (picker && !picker.contains(event.target)) {
                mobileMenu.classList.add('hidden');
                mobileButton.setAttribute('aria-expanded', 'false');
            }
        });
    }
}

function handleTabClick(event) {
    const tab = event.currentTarget;
    const tabName = tab.getAttribute('data-tab');
    
    localStorage.setItem(STORAGE_KEY, tabName);
    activateTab(tabName);
}

function activateTab(tabName) {
    // Update tab button styles
    const tabs = document.querySelectorAll('.tab-btn');
    
    tabs.forEach(tab => {
        const tabBtnName = tab.getAttribute('data-tab');
        tab.classList.remove('text-blue-600', 'border-blue-600', 'text-gray-500', 'border-transparent');
        tab.classList.add('text-gray-500', 'border-transparent');
        
        if (tabBtnName === tabName) {
            tab.classList.remove('text-gray-500', 'border-transparent');
            tab.classList.add('text-blue-600', 'border-blue-600');
        }
    });

    const activeMobileOption = document.querySelector(`.finance-mobile-tab-option[data-tab="${tabName}"]`);
    const mobileLabel = document.getElementById('financeMobileTabLabel');
    const mobileIcon = document.getElementById('financeMobileTabIcon');
    if (activeMobileOption && mobileLabel && mobileIcon) {
        mobileLabel.textContent = activeMobileOption.textContent.trim();
        mobileIcon.className = `fas fa-${activeMobileOption.dataset.icon} text-blue-600`;
    }
    document.querySelectorAll('.finance-mobile-tab-option').forEach(option => {
        const isActive = option.dataset.tab === tabName;
        option.classList.toggle('bg-blue-50', isActive);
        option.classList.toggle('text-blue-700', isActive);
        option.classList.toggle('font-semibold', isActive);
    });
    
    // Show/hide content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.add('hidden');
    });
    
    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
    
    // Dispatch event for tabs to handle their own loading
    document.dispatchEvent(new CustomEvent('tabActivated', { 
        detail: { tab: tabName } 
    }));
}

// ============================================
// STUB FUNCTIONS - Simple placeholders
// These get overridden when tabs load
// ============================================
window.loadContributions = function() {
    console.log('âš ï¸ loadContributions called but contributions tab not loaded');
};

window.filterPayments = function() {
    console.log('âš ï¸ filterPayments called but payments tab not loaded');
};

window.loadSponsors = function() {
    console.log('âš ï¸ loadSponsors called but sponsors tab not loaded');
};

window.loadExpenses = function() {
    console.log('âš ï¸ loadExpenses called but expenses tab not loaded');
};

window.loadActionPlans = function() {
    console.log('âš ï¸ loadActionPlans called but action plans tab not loaded');
};

window.loadSettings = function() {
    console.log('âš ï¸ loadSettings called but settings tab not loaded');
};


// Loading flags
window.isPaymentLoading = false;
window.isContributionLoading = false;

// ============================================
// OVERVIEW FUNCTIONS
// ============================================
window.loadOverviewStats = function() {
    fetch('/finance/overview/stats', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateOverviewStats(data.stats);
        }
    })
    .catch(error => console.error('Error loading overview stats:', error));
};

function updateOverviewStats(stats) {
    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const totalExpectedEl = document.getElementById('totalExpected');
    const totalCollectedEl = document.getElementById('totalCollected');
    const collectionRateEl = document.getElementById('collectionRate');
    
    if (totalIncomeEl) totalIncomeEl.textContent = 'RWF ' + parseFloat(stats.total_income || 0).toLocaleString();
    if (totalExpensesEl) totalExpensesEl.textContent = 'RWF ' + parseFloat(stats.total_expenses || 0).toLocaleString();
    if (totalExpectedEl) totalExpectedEl.textContent = 'RWF ' + parseFloat(stats.total_expected || 0).toLocaleString();
    if (totalCollectedEl) totalCollectedEl.textContent = 'RWF ' + parseFloat(stats.total_collected || 0).toLocaleString();
    if (collectionRateEl) collectionRateEl.textContent = (stats.collection_rate || 0) + '%';
    
    const progressBar = document.getElementById('collectionProgressBar');
    if (progressBar) {
        progressBar.style.width = (stats.collection_rate || 0) + '%';
    }
}

// ============================================
// GLOBAL MODAL FUNCTIONS
// ============================================
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
        document.body.style.overflow = '';
    }
};

function closeFinanceModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function openFinanceModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

// ============================================
// PAYMENT FORM SUBMISSIONS - Global
// ============================================

function submitEditPayment(event) {
    event.preventDefault();
    
    const id = document.getElementById('editPaymentId').value;
    const userId = document.getElementById('editPaymentUserId').value;
    const formData = {
        amount: document.getElementById('editPaymentAmount').value,
        payment_method: document.getElementById('editPaymentMethod').value,
        payment_date: document.getElementById('editPaymentDate').value,
        term: document.getElementById('editPaymentTerm').value,
        notes: document.getElementById('editPaymentNotes').value,
        user_id: userId,
        year: document.getElementById('editPaymentYear').textContent
    };
    
    const submitBtn = document.getElementById('submitEditPaymentBtn');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    fetch(`/finance/payments/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showNotification('Payment updated successfully!', 'success');
            closeFinanceModal('editPaymentModal');
            if (typeof filterPayments === 'function') {
                filterPayments();
            }
        } else {
            showNotification('Error: ' + (data.message || 'Failed to update payment'), 'error');
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            submitBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Network error: ' + error.message, 'error');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        submitBtn.disabled = false;
    });
}

// ============================================
// CONTRIBUTION FORM SUBMISSIONS - Global
// ============================================

function submitEditContribution(event) {
    event.preventDefault();
    
    const id = document.getElementById('editContributionId').value;
    const userId = document.getElementById('editContributionUserId').value;
    const formData = {
        amount: document.getElementById('editAnnualAmount').value,
        notes: document.getElementById('editContributionNotes').value,
        user_id: userId,
        year: document.getElementById('editContributionYear').textContent,
        contribution_id: id
    };
    
    const submitBtn = document.getElementById('submitEditContributionBtn');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    fetch('/finance/contributions/update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Contribution updated successfully!', 'success');
            closeFinanceModal('editContributionModal');
            if (typeof loadContributions === 'function') {
                loadContributions();
            }
        } else {
            showNotification('Error: ' + (data.message || 'Failed to update contribution'), 'error');
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            submitBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Network error: ' + error.message, 'error');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        submitBtn.disabled = false;
    });
}

function submitSetAnnual(event) {
    event.preventDefault();
    
    const userId = document.getElementById('selectedUserId').value;
    const annualAmount = document.getElementById('annualAmount').value;
    const year = document.getElementById('setAnnualYear').textContent;
    const notes = document.querySelector('#setAnnualForm textarea[name="notes"]').value;
    
    if (!userId) {
        showNotification('Please search and select a member', 'error');
        return;
    }
    
    if (!annualAmount) {
        showNotification('Please enter annual amount', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('#setAnnualModal button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    const formData = {
        user_id: userId,
        annual_amount: annualAmount,
        year: year,
        notes: notes
    };
    
    fetch('/finance/contributions/set-annual', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Annual contribution set successfully!', 'success');
            closeFinanceModal('setAnnualModal');
            clearSelectedMember();
            document.getElementById('annualAmount').value = '';
            if (typeof loadContributions === 'function') {
                loadContributions();
            }
        } else {
            showNotification('Error: ' + (data.message || 'Failed to set contribution'), 'error');
            submitBtn.innerHTML = 'Set Contribution';
            submitBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Network error: ' + error.message, 'error');
        submitBtn.innerHTML = 'Set Contribution';
        submitBtn.disabled = false;
    });
}

function submitContribute(event) {
    event.preventDefault();
    
    const userId = document.getElementById('selectedContributeUserId').value;
    const term = document.getElementById('contributeTerm').value;
    const amount = document.getElementById('contributeAmount').value;
    const year = document.getElementById('contributeYear').textContent;
    const paymentMethod = document.querySelector('#contributeForm select[name="payment_method"]').value;
    const notes = document.querySelector('#contributeForm textarea[name="notes"]').value;
    
    if (!userId) {
        showNotification('Please select a member', 'error');
        return;
    }
    
    if (!amount) {
        showNotification('Please enter amount', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('#contributeModal button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    const formData = {
        user_id: userId,
        term: term,
        amount: amount,
        year: year,
        payment_method: paymentMethod,
        notes: notes
    };
    
    fetch('/finance/contributions/pay', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Payment recorded successfully!', 'success');
            closeFinanceModal('contributeModal');
            clearSelectedContributeMember();
            document.getElementById('contributeAmount').value = '';
            if (typeof loadContributions === 'function') {
                loadContributions();
            }
        } else {
            showNotification('Error: ' + (data.message || 'Failed to record payment'), 'error');
            submitBtn.innerHTML = 'Submit Payment';
            submitBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Network error: ' + error.message, 'error');
        submitBtn.innerHTML = 'Submit Payment';
        submitBtn.disabled = false;
    });
}

// ============================================
// NOTIFICATION FUNCTION - Global
// ============================================
function showNotification(message, type) {
    return window.appNotify(...arguments);
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in max-w-md`;
    notification.style.backgroundColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-white"></i>
        <span class="text-white text-sm">${message}</span>
        <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white transition">
            <i class="fas fa-times"></i>
        </button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}
</script>
@endsection

