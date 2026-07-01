<div class="max-w-4xl mx-auto py-3 px-2 sm:px-4">
    <!-- Header Section -->
    <div class="mb-4">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-xl font-bold text-gray-900">Contribution allocation per Term</h1>
            </div>
            <div class="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
            </div>
        </div>
    </div>

    <!-- Main Card -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <form id="financeSettingsForm" method="POST">
            @csrf
            
            <div class="p-4 space-y-4">
                <!-- Configuration Row -->
                <div class="flex flex-wrap items-end gap-5">
                    <!-- Year Selection - Compact -->
                    <div class="space-y-1">
                        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Select Year
                        </label>
                        
                        <div class="relative" id="yearPickerContainer">
                            <div onclick="toggleYearPicker()" 
                                class="h-8 flex items-center justify-between border border-gray-300 rounded-lg px-3 bg-white cursor-pointer hover:border-blue-400 transition-all w-[130px]">
                                <span id="selectedYearDisplay" class="text-sm font-semibold text-gray-800">{{ date('Y') }}</span>
                                <svg class="w-4 h-4 text-gray-400 transition-transform duration-200 ml-2" id="yearPickerArrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                            <input type="hidden" id="selectedYear" name="selected_year" value="{{ date('Y') }}">
                            
                            <!-- Year Picker Dropdown -->
                            <div id="yearPickerDropdown" class="hidden absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 min-w-[180px]">
                                <div class="flex items-center justify-between mb-2">
                                    <button type="button" onclick="changeYearPage(-1)" 
                                        class="p-1 hover:bg-gray-100 rounded transition text-gray-500 hover:text-gray-700">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                        </svg>
                                    </button>
                                    <span id="yearPageTitle" class="text-xs font-medium text-gray-600">2018 - 2024</span>
                                    <button type="button" onclick="changeYearPage(1)" 
                                        class="p-1 hover:bg-gray-100 rounded transition text-gray-500 hover:text-gray-700">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                        </svg>
                                    </button>
                                </div>
                                <div class="grid grid-cols-3 gap-1" id="yearGrid">
                                    <!-- Years populated by JavaScript -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Number of Terms -->
                    <div class="space-y-1">
                        <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Number of Terms
                        </label>
                        <div class="h-8 inline-flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
                            <button type="button" onclick="adjustTermsCount(-1)"
                                class="h-full w-8 text-gray-500 hover:bg-gray-100 transition"
                                title="Remove a term" aria-label="Remove a term">
                                <i class="fas fa-minus text-xs" aria-hidden="true"></i>
                            </button>
                            <input type="number" id="numberOfTerms" min="1" max="12" step="1"
                                onchange="updateTermsCount()"
                                class="h-full w-12 border-x border-y-0 border-gray-300 p-0 text-center text-sm focus:ring-0 focus:border-gray-300">
                            <button type="button" onclick="adjustTermsCount(1)"
                                class="h-full w-8 text-gray-500 hover:bg-gray-100 transition"
                                title="Add a term" aria-label="Add a term">
                                <i class="fas fa-plus text-xs" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Status Badges -->
                <div id="yearInfoBadge" class="hidden bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2 border border-blue-100">
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span id="yearInfoText">Viewing settings for year</span>
                </div>

                <div id="historicalNote" class="hidden bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-2 border border-amber-100">
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Historical data. Changes saved separately.</span>
                </div>

                <!-- Terms Section Header -->
                <div class="border-t border-gray-100 pt-3">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-sm font-semibold text-gray-700">Term Distribution</h3>
                          
                        </div>
                        <button type="button" onclick="distributeEvenly()" 
                            class="h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs text-blue-700 font-medium flex items-center gap-1.5 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                            </svg>
                            Distribute Evenly
                        </button>
                    </div>
                </div>

                <!-- Terms Container -->
                <div id="termsContainer" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <!-- Terms injected via JS -->
                </div>

                <!-- Allocation Summary -->
                <div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-gray-700">Total Allocation</span>
                        <span id="totalPercentage" class="text-xl font-bold text-amber-600">0%</span>
                    </div>
                    <div class="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div id="progressBar" class="h-full bg-amber-500 rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                    <p id="percentageWarning" class="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
                        <span id="percentageWarningText">Total must equal 100%.</span>
                    </p>
                </div>

                <!-- Message Containers -->
                <div id="successMessage" class="hidden bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span class="text-emerald-700 text-sm">Settings saved!</span>
                    </div>
                </div>
                
                <div id="errorMessage" class="hidden bg-red-50 rounded-lg p-3 border border-red-100">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span id="errorText" class="text-red-700 text-sm"></span>
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button type="submit" id="saveButton" 
                    class="h-8 bg-blue-600 hover:bg-blue-700 text-white px-4 py-0 rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                    </svg>
                    Save Settings
                </button>
            </div>
        </form>
    </div>
</div>

<script>
let currentTermsCount = 3;
let isUpdating = false;
let isManualEdit = false;
let currentSelectedYear = null;
let yearPageOffset = 0;
let isPickerOpen = false;
let savedSettings = null;

// Toggle Year Picker
function toggleYearPicker() {
    const dropdown = document.getElementById('yearPickerDropdown');
    const arrow = document.getElementById('yearPickerArrow');
    
    if (!dropdown) return;
    
    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        if (arrow) arrow.classList.add('rotate-180');
        isPickerOpen = true;
        renderYearGrid();
    } else {
        dropdown.classList.add('hidden');
        if (arrow) arrow.classList.remove('rotate-180');
        isPickerOpen = false;
    }
}

// Close year picker
function closeYearPicker() {
    const dropdown = document.getElementById('yearPickerDropdown');
    const arrow = document.getElementById('yearPickerArrow');
    
    if (dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
        if (arrow) arrow.classList.remove('rotate-180');
        isPickerOpen = false;
    }
}

// Change year page
function changeYearPage(direction) {
    yearPageOffset += direction;
    renderYearGrid();
}

// Render 3x3 Year Grid
function renderYearGrid() {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear + (yearPageOffset * 9) - 4;
    
    const grid = document.getElementById('yearGrid');
    const title = document.getElementById('yearPageTitle');
    
    if (!grid) return;
    
    const endYear = startYear + 8;
    if (title) title.textContent = `${startYear} - ${endYear}`;
    
    grid.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const year = startYear + i;
        const isSelected = year == currentSelectedYear;
        const isCurrentYear = year == currentYear;
        const isDisabled = year < 2000 || year > 2100;
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = year;
        btn.className = 'year-grid-btn py-2 px-2 rounded text-sm transition-all text-center';
        
        if (isSelected) {
            btn.classList.add('bg-blue-600', 'text-white', 'font-semibold', 'shadow-sm');
        } else if (isCurrentYear) {
            btn.classList.add('bg-blue-50', 'text-blue-600', 'font-medium', 'border', 'border-blue-200');
        } else {
            btn.classList.add('text-gray-700', 'hover:bg-gray-100');
        }
        
        if (isDisabled) {
            btn.classList.add('text-gray-300', 'cursor-not-allowed');
            btn.disabled = true;
        } else {
            btn.onclick = function() {
                selectYear(year);
            };
        }
        
        if (isCurrentYear && !isSelected) {
            const dot = document.createElement('span');
            dot.className = 'ml-1 text-xs text-blue-500';
            dot.textContent = '*';
            btn.appendChild(dot);
        }
        
        grid.appendChild(btn);
    }
}

// Select a year
function selectYear(year) {
    currentSelectedYear = year;
    document.getElementById('selectedYear').value = year;
    document.getElementById('selectedYearDisplay').textContent = year;
    
    closeYearPicker();
    renderYearGrid();
    loadYearSettings();
}

// Load settings for the selected year
function loadYearSettings() {
    const selectedYear = document.getElementById('selectedYear').value;
    
    if (!selectedYear) {
        showMessage('error', 'Please select a valid year');
        return;
    }
    
    currentSelectedYear = selectedYear;
    
    const saveBtn = document.getElementById('saveButton');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';
    saveBtn.disabled = true;
    
    fetch(`/finance/settings/get?year=${selectedYear}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        const currentYear = new Date().getFullYear();
        const isHistorical = parseInt(selectedYear) < currentYear;
        
        const historicalNote = document.getElementById('historicalNote');
        if (historicalNote) {
            historicalNote.classList.toggle('hidden', !isHistorical);
        }
        
        const yearInfoBadge = document.getElementById('yearInfoBadge');
        const yearInfoText = document.getElementById('yearInfoText');
        if (yearInfoBadge && yearInfoText) {
            yearInfoBadge.classList.remove('hidden');
            yearInfoText.textContent = isHistorical
                ? `Viewing historical settings for ${selectedYear}`
                : `Viewing settings for ${selectedYear}`;
        }
        
        if (data.success && data.settings) {
            savedSettings = data.settings;
            
            const numberOfTerms = data.settings.number_of_terms || 3;
            document.getElementById('numberOfTerms').value = numberOfTerms;
            currentTermsCount = numberOfTerms;
            
            if (data.settings.term_percentages && typeof data.settings.term_percentages === 'object') {
                window.savedPercentages = {};
                for (let key in data.settings.term_percentages) {
                    window.savedPercentages[key] = parseFloat(data.settings.term_percentages[key]).toFixed(2);
                }
                isManualEdit = true;
                renderTerms(window.savedPercentages);
            } else {
                window.savedPercentages = {};
                isManualEdit = false;
                renderTerms();
                distributeEvenly();
            }
        } else {
            savedSettings = null;
            document.getElementById('numberOfTerms').value = 3;
            currentTermsCount = 3;
            window.savedPercentages = {};
            isManualEdit = false;
            renderTerms();
            distributeEvenly();
            showMessage('info', `No existing settings for ${selectedYear}. Using defaults.`);
        }
    })
    .catch(error => {
        console.error('Error loading settings:', error);
        showMessage('error', 'Failed to load settings');
    })
    .finally(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
        updateTotalPercentage();
    });
}

function distributeEvenly() {
    if (isUpdating) return;
    isUpdating = true;
    isManualEdit = false;
    
    const numTerms = currentTermsCount;
    const equalPercent = 100 / numTerms;
    let total = 0;
    let percentages = [];
    
    for (let i = 1; i <= numTerms; i++) {
        let percent = Math.round(equalPercent * 100) / 100;
        percentages.push(percent);
        total += percent;
    }
    
    if (Math.abs(total - 100) > 0.01) {
        percentages[percentages.length - 1] = +(percentages[percentages.length - 1] + (100 - total)).toFixed(2);
    }
    
    for (let i = 1; i <= numTerms; i++) {
        const input = document.getElementById(`term${i}Percentage`);
        if (input) {
            input.value = percentages[i - 1].toFixed(2);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
    
    updateTotalPercentage();
    setTimeout(() => { isUpdating = false; }, 100);
}

function adjustTermsCount(change) {
    const input = document.getElementById('numberOfTerms');
    const currentValue = parseInt(input.value) || currentTermsCount;
    input.value = Math.min(12, Math.max(1, currentValue + change));
    updateTermsCount();
}

function updateTermsCount() {
    if (isUpdating) return;
    isUpdating = true;
    
    let newCount = parseInt(document.getElementById('numberOfTerms').value);
    if (isNaN(newCount) || newCount < 1) newCount = 1;
    if (newCount > 12) {
        newCount = 12;
        document.getElementById('numberOfTerms').value = 12;
    }
    
    const oldCount = currentTermsCount;
    currentTermsCount = newCount;
    
    const existingPercentages = {};
    for (let i = 1; i <= oldCount; i++) {
        const input = document.getElementById(`term${i}Percentage`);
        if (input && input.value) {
            existingPercentages[i] = parseFloat(input.value);
        }
    }
    
    renderTerms(existingPercentages);

    isUpdating = false;
    if (!isManualEdit || Object.keys(existingPercentages).length === 0) {
        distributeEvenly();
    }
}

function renderTerms(savedPercentages = null) {
    const container = document.getElementById('termsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    const percentages = savedPercentages || window.savedPercentages || {};
    
    for (let i = 1; i <= currentTermsCount; i++) {
        let defaultValue = percentages[i];
        if (!defaultValue || isNaN(defaultValue)) defaultValue = '';
        
        const termDiv = document.createElement('div');
        termDiv.className = 'group border border-gray-200 hover:border-blue-300 rounded-lg p-3 bg-white transition-colors';
        termDiv.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-7 h-7 bg-gray-100 group-hover:bg-blue-50 rounded-md flex items-center justify-center flex-shrink-0 transition-colors">
                    <span class="text-gray-700 font-semibold text-xs">${i}</span>
                </div>
                <div class="flex-1">
                    <label class="block text-xs font-medium text-gray-500 mb-1">Term ${i} (%)</label>
                    <input type="number" id="term${i}Percentage" name="term_percentages[]" 
                           value="${defaultValue}" step="0.01" min="0" max="100"
                           class="term-percentage h-8 w-full px-2 py-0 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                           data-term="${i}"
                           oninput="onPercentageChange(this)">
                    <input type="hidden" name="term_numbers[]" value="${i}">
                </div>
            </div>
        `;
        container.appendChild(termDiv);
    }
    
    updateTotalPercentage();
}

function onPercentageChange(input) {
    isManualEdit = true;
    
    let value = parseFloat(input.value);
    if (isNaN(value)) value = 0;
    if (value < 0) input.value = 0;
    if (value > 100) input.value = 100;
    
    updateTotalPercentage();
}

function updateTotalPercentage() {
    const termInputs = document.querySelectorAll('.term-percentage');
    let total = 0;
    
    termInputs.forEach(input => {
        let val = parseFloat(input.value);
        if (isNaN(val)) val = 0;
        total += val;
    });
    
    const totalPercentNum = total;
    const totalPercent = totalPercentNum.toFixed(2);
    const difference = 100 - totalPercentNum;
    const isBalanced = Math.abs(difference) <= 0.01;
    const isOver = difference < -0.01;
    
    const totalEl = document.getElementById('totalPercentage');
    if (totalEl) {
        totalEl.textContent = totalPercent + '%';
        totalEl.className = isBalanced
            ? 'text-xl font-bold text-emerald-600'
            : isOver
                ? 'text-xl font-bold text-red-600'
                : 'text-xl font-bold text-amber-600';
    }

    const status = document.getElementById('allocationStatus');
    if (status) {
        status.textContent = isBalanced ? 'Balanced' : isOver ? 'Over allocated' : 'Incomplete';
        status.className = isBalanced
            ? 'px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700'
            : isOver
                ? 'px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700'
                : 'px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700';
    }

    const differenceLabel = document.getElementById('allocationDifferenceLabel');
    const differenceEl = document.getElementById('allocationDifference');
    if (differenceLabel && differenceEl) {
        differenceLabel.textContent = isOver ? 'Excess' : 'Remaining';
        differenceEl.textContent = Math.abs(difference).toFixed(2) + '%';
        differenceEl.className = isBalanced
            ? 'text-xl font-bold text-emerald-600'
            : isOver
                ? 'text-xl font-bold text-red-600'
                : 'text-xl font-bold text-amber-600';
    }

    const termsEl = document.getElementById('allocationTerms');
    if (termsEl) termsEl.textContent = termInputs.length;
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        let width = Math.min(Math.max(totalPercentNum, 0), 100);
        progressBar.style.width = width + '%';
        progressBar.className = isBalanced
            ? 'h-full bg-emerald-500 rounded-full transition-all duration-300'
            : isOver
                ? 'h-full bg-red-500 rounded-full transition-all duration-300'
                : 'h-full bg-amber-500 rounded-full transition-all duration-300';
    }
    
    const warning = document.getElementById('percentageWarning');
    const warningText = document.getElementById('percentageWarningText');
    const saveButton = document.getElementById('saveButton');
    
    if (warning && saveButton) {
        warning.classList.toggle('hidden', isBalanced);
        warning.className = isBalanced
            ? 'hidden'
            : isOver
                ? 'text-xs text-red-600 mt-2 flex items-center gap-1'
                : 'text-xs text-amber-600 mt-2 flex items-center gap-1';
        if (warningText) {
            warningText.textContent = isOver
                ? `Reduce allocations by ${Math.abs(difference).toFixed(2)}% before saving.`
                : `Allocate the remaining ${difference.toFixed(2)}% before saving.`;
        }
        saveButton.disabled = !isBalanced;
    }
}

function showMessage(type, message) {
    ['successMessage', 'errorMessage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    
    if (type === 'success') {
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.classList.remove('hidden');
            setTimeout(() => successDiv.classList.add('hidden'), 4000);
        }
    } else if (type === 'error') {
        const errorDiv = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.remove('hidden');
            setTimeout(() => errorDiv.classList.add('hidden'), 5000);
        }
    } else if (type === 'info') {
        const infoToast = document.createElement('div');
        infoToast.className = 'fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2.5 rounded-lg shadow-lg z-50 text-sm flex items-center gap-2 animate-fade-in';
        infoToast.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>${message}`;
        document.body.appendChild(infoToast);
        setTimeout(() => infoToast.remove(), 3000);
    }
}

// Close picker when clicking outside
document.addEventListener('click', function(event) {
    const picker = document.getElementById('yearPickerDropdown');
    const container = document.getElementById('yearPickerContainer');
    
    if (picker && !picker.classList.contains('hidden') && container) {
        if (!container.contains(event.target)) {
            closeYearPicker();
        }
    }
});

// Form submission
document.getElementById('financeSettingsForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!currentSelectedYear) {
        showMessage('error', 'Please select a fiscal year first');
        return;
    }
    
    const termInputs = document.querySelectorAll('.term-percentage');
    let total = 0;
    const termPercentages = [];
    const termNumbers = [];
    
    termInputs.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
        termPercentages.push(value);
        termNumbers.push(parseInt(input.dataset.term));
    });
    
    if (Math.abs(total - 100) > 0.01) {
        showMessage('error', 'Total allocation must equal 100%');
        return;
    }
    
    const formData = new FormData();
    formData.append('current_year', currentSelectedYear);
    formData.append('number_of_terms', currentTermsCount);
    formData.append('term_percentages', JSON.stringify(termPercentages));
    formData.append('term_numbers', JSON.stringify(termNumbers));
    
    const saveBtn = document.getElementById('saveButton');
    const originalHtml = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';
    saveBtn.disabled = true;
    
    fetch('/finance/settings/update', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage('success', `Settings for ${currentSelectedYear} saved!`);
            if (data.settings && data.settings.term_percentages) {
                window.savedPercentages = {};
                for (let key in data.settings.term_percentages) {
                    window.savedPercentages[key] = data.settings.term_percentages[key];
                }
            }
        } else {
            showMessage('error', data.message || 'Failed to save settings');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('error', 'Network error');
    })
    .finally(() => {
        saveBtn.innerHTML = originalHtml;
        saveBtn.disabled = false;
        updateTotalPercentage();
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const currentYear = new Date().getFullYear();
    document.getElementById('selectedYear').value = currentYear;
    document.getElementById('selectedYearDisplay').textContent = currentYear;
    currentSelectedYear = currentYear;
    yearPageOffset = 0;
    renderYearGrid();
    loadYearSettings();
});
</script>

<style>
@keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
    animation: fade-in 0.2s ease-out;
}

.year-grid-btn {
    transition: all 0.2s ease;
    cursor: pointer;
    min-height: 36px;
}

.year-grid-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.year-grid-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

#yearPickerDropdown {
    animation: fade-in 0.15s ease-out;
}

.rotate-180 {
    transform: rotate(180deg);
}
</style>
