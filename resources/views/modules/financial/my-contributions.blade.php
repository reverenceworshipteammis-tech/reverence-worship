@extends('layouts.app')

@section('title', 'My Contributions')
@section('page-title', 'Contribution Management')
@section('content')
<div class="max-w-7xl mx-auto space-y-6">

    <!-- Year Selector - Same style as Finance module -->
    @if(auth()->check() && auth()->user()->canAccess('financial', 'view'))
    <div class="bg-white rounded-xl shadow-md p-4">
        <div class="flex items-center gap-4">
            <label class="text-sm font-medium text-gray-700">Select Year:</label>
            <div class="relative">
                <div onclick="toggleYearPicker()" 
                    class="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 bg-white cursor-pointer hover:border-blue-400 transition-all min-w-[120px]">
                    <span id="yearDisplay" class="text-sm font-semibold text-gray-800">{{ $currentYear }}</span>
                    <svg class="w-4 h-4 text-gray-400 transition-transform duration-200 ml-2" id="yearArrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
                <input type="hidden" id="selectedYear" value="{{ $currentYear }}">
                
                <div id="yearPickerDropdown" class="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 min-w-[200px]">
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
                    <div class="grid grid-cols-3 gap-1" id="yearGrid"></div>
                </div>
            </div>
        </div>
    </div>
    @endif

    <!-- TOP GRID -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- LEFT CARD - Annual Contribution -->
        <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-bold text-gray-800">
                    Your {{ $currentYear }} Annual Contribution
                </h2>
                <!-- Edit Amount Button - Requires update permission -->
                @if(auth()->check() && auth()->user()->canAccess('financial', 'update'))
                <button onclick="openEditAmountModal()"
                    class="text-sm text-blue-600 hover:text-blue-800 border border-blue-300 px-3 py-1 rounded-lg transition">
                    <i class="fas fa-edit mr-1"></i> Edit Amount
                </button>
                @endif
            </div>

            <div class="bg-gray-50 rounded-lg p-4">
                <div class="flex justify-between items-center mb-3">
                    <span class="text-sm text-gray-600">Annual Amount:</span>
                    <span class="text-2xl font-bold text-blue-600">RWF {{ number_format($totalRequired, 0, ',', ',') }}</span>
                </div>

                <!-- Term Breakdown -->
                <div class="mt-4 space-y-2">
                    <p class="text-xs font-medium text-gray-500">Term Breakdown:</p>
                    @foreach($termTargets as $termNum => $target)
                        <div class="flex justify-between text-sm">
                            <span class="text-gray-600">Term {{ $termNum }} ({{ $termPercentages[$termNum] ?? round(100/$numberOfTerms, 1) }}%):</span>
                            <span class="font-medium">RWF {{ number_format($target, 0, ',', ',') }}</span>
                        </div>
                    @endforeach
                </div>

                <!-- Bible Verse -->
                <div class="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
                    <h4 class="font-bold text-blue-800 text-sm mb-2">2 Abakorinto 9:7</h4>
                    <p class="italic text-blue-700 text-xs leading-relaxed">
                        "Umuntu wese atange nk'uko abigambiriye mu mutima he, atinuba kandi adahatwa kuko Imana ikunda utanga anezerewe."
                    </p>
                </div>
            </div>
        </div>

        <!-- RIGHT CARD - Progress -->
        <div class="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 class="text-lg font-bold text-gray-800 mb-4">My Progress</h2>

            <div class="flex justify-between mb-2">
                <span class="text-sm text-gray-600">Overall Progress</span>
                <span class="text-sm font-medium">
                    RWF {{ number_format($totalPaid, 0, ',', ',') }} / RWF {{ number_format($totalRequired, 0, ',', ',') }}
                </span>
            </div>

            <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div class="h-full bg-blue-600 rounded-full" style="width: {{ min($progressPercent, 100) }}%"></div>
            </div>

            <p class="text-xs text-gray-500 mb-5">{{ number_format($progressPercent, 1) }}% complete</p>

            <!-- TERM CARDS -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                @for($termNum = 1; $termNum <= $numberOfTerms; $termNum++)
                @php
                    $target = $termTargets[$termNum] ?? 0;
                    $paid = $termPaidAmounts[$termNum] ?? 0;
                    $status = $termStatuses[$termNum] ?? 'pending';
                    $percentage = $termPercentages[$termNum] ?? round(100/$numberOfTerms, 2);
                    
                    if ($status == 'completed') {
                        $borderColor = 'border-green-200';
                        $bgColor = 'bg-green-50';
                        $statusColor = 'green';
                        $statusIcon = 'âœ“';
                        $statusText = 'completed';
                    } elseif ($status == 'partial') {
                        $borderColor = 'border-yellow-200';
                        $bgColor = 'bg-yellow-50';
                        $statusColor = 'yellow';
                        $statusIcon = '';
                        $statusText = 'partial';
                    } else {
                        $borderColor = 'border-gray-200';
                        $bgColor = 'bg-white';
                        $statusColor = 'gray';
                        $statusIcon = '';
                        $statusText = 'pending';
                    }
                    
                    $progressPercentTerm = $target > 0 ? ($paid / $target) * 100 : 0;
                    $remainingForTerm = $target - $paid;
                @endphp
                <div class="border-2 {{ $borderColor }} {{ $bgColor }} rounded-xl p-3 text-center transition hover:shadow-md">
                    <h3 class="text-sm font-semibold text-gray-700 mb-1">Term {{ $termNum }}</h3>
                    <p class="text-xs text-gray-500 mb-1">{{ $percentage }}% of annual</p>
                    <p class="text-xl font-bold text-gray-800">RWF {{ number_format($paid, 0, ',', ',') }}</p>
                    <p class="text-xs text-gray-500">of RWF {{ number_format($target, 0, ',', ',') }}</p>

                    <div class="w-full h-1.5 bg-gray-200 rounded-full mt-3">
                        <div class="h-1.5 rounded-full 
                            {{ $status == 'completed' ? 'bg-green-500' : ($status == 'partial' ? 'bg-yellow-500' : 'bg-gray-300') }}" 
                            style="width: {{ min($progressPercentTerm, 100) }}%"></div>
                    </div>

                    <div class="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                        {{ $status == 'completed' ? 'bg-green-100 text-green-700' : '' }}
                        {{ $status == 'partial' ? 'bg-yellow-100 text-yellow-700' : '' }}
                        {{ $status == 'pending' ? 'bg-gray-100 text-gray-600' : '' }}">
                        {{ $statusIcon }} {{ ucfirst($statusText) }}
                    </div>

                    @if($status == 'completed')
                        <p class="text-green-600 text-xs mt-2">âœ“ Fully Paid!</p>
                    @else
                        <!-- Pay Button - Requires create/pay permission -->
                        @if(auth()->check() && auth()->user()->canAccess('financial', 'pay'))
                        <button onclick='openPaymentModal({{ $termNum }}, {{ $target }}, {{ $remainingForTerm }})' 
                                class="block w-full mt-3 text-blue-600 text-xs font-medium hover:underline">
                            @if($paid > 0)
                                Pay Remaining (RWF {{ number_format($remainingForTerm, 0, ',', ',') }})
                            @else
                                Tap to submit
                            @endif
                        </button>
                        @endif
                    @endif
                </div>
                @endfor
            </div>
        </div>
    </div>
</div>

<!-- Payment Modal - Requires pay permission -->
<div id="paymentModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="paymentModalTitle" class="text-lg font-bold text-gray-800">Submit Payment</h3>
            <button onclick="closeModal('paymentModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <form method="POST" action="{{ route('financial.submit-payment') }}">
            @csrf
            <input type="hidden" name="term" id="paymentTerm">
            <input type="hidden" name="year" id="paymentYear" value="{{ $currentYear }}">
            <div class="mt-4 space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Amount (RWF)</label>
                    <input type="number" name="amount" id="paymentAmount" required 
                           max="10000000"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <p id="maxAmountHint" class="text-xs text-gray-500 mt-1"></p>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                    <select name="payment_method" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">Select Method</option>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="check">Check</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Transaction ID / Reference</label>
                    <input type="text" name="transaction_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <textarea name="notes" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"></textarea>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-5 pt-3 border-t">
                <button type="button" onclick="closeModal('paymentModal')" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Submit Payment</button>
            </div>
        </form>
    </div>
</div>

<!-- Edit Annual Amount Modal - Requires update permission -->
<div id="editAmountModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-lg font-bold text-gray-800">Edit Annual Contribution Amount</h3>
            <button onclick="closeModal('editAmountModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <form method="POST" action="{{ route('financial.update-annual-amount') }}">
            @csrf
            <div class="mt-4 space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Year</label>
                    <input type="number" name="year" value="{{ $currentYear }}" readonly
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Annual Amount (RWF)</label>
                    <input type="number" name="annual_amount" required value="{{ $totalRequired }}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <p class="text-xs text-gray-500 mt-1">
                        This will be distributed across {{ $numberOfTerms }} terms with the following percentages:
                        @foreach($termPercentages as $termNum => $pct)
                            Term {{ $termNum }}: {{ $pct }}% @if(!$loop->last) | @endif
                        @endforeach
                    </p>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-5 pt-3 border-t">
                <button type="button" onclick="closeModal('editAmountModal')" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Update</button>
            </div>
        </form>
    </div>
</div>

<!-- Payment History Modal - Requires view permission -->
<div id="paymentHistoryModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-lg font-bold text-gray-800">Payment History</h3>
            <button onclick="closeModal('paymentHistoryModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <div id="paymentHistoryContent" class="mt-4 max-h-96 overflow-y-auto">
            <!-- Payment history will be loaded here -->
        </div>
        <div class="flex justify-end mt-4 pt-3 border-t">
            <button onclick="closeModal('paymentHistoryModal')" class="px-4 py-2 bg-gray-100 rounded-lg text-sm">Close</button>
        </div>
    </div>
</div>

<script>
let currentTermTarget = 0;
let yearPageOffset = 0;

// ============================================
// YEAR PICKER FUNCTIONS
// ============================================

function toggleYearPicker() {
    const dropdown = document.getElementById('yearPickerDropdown');
    const arrow = document.getElementById('yearArrow');
    
    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        arrow.classList.add('rotate-180');
        renderYearGrid();
    } else {
        dropdown.classList.add('hidden');
        arrow.classList.remove('rotate-180');
    }
}

function closeYearPicker() {
    const dropdown = document.getElementById('yearPickerDropdown');
    const arrow = document.getElementById('yearArrow');
    
    if (dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
        arrow.classList.remove('rotate-180');
    }
}

function changeYearPage(direction) {
    yearPageOffset += direction;
    renderYearGrid();
}

function renderYearGrid() {
    const currentYear = new Date().getFullYear();
    const selectedYear = parseInt(document.getElementById('selectedYear').value) || currentYear;
    const startYear = currentYear + (yearPageOffset * 9) - 4;
    
    const grid = document.getElementById('yearGrid');
    const title = document.getElementById('yearPageTitle');
    
    if (!grid) return;
    
    const endYear = startYear + 8;
    title.textContent = `${startYear} - ${endYear}`;
    
    grid.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const year = startYear + i;
        const isSelected = year == selectedYear;
        const isCurrentYear = year == currentYear;
        const isDisabled = year < 2000 || year > 2100;
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = year;
        btn.className = 'py-1.5 px-2 rounded text-xs transition-all text-center';
        
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
        
        grid.appendChild(btn);
    }
}

function selectYear(year) {
    document.getElementById('selectedYear').value = year;
    document.getElementById('yearDisplay').textContent = year;
    
    closeYearPicker();
    renderYearGrid();
    
    // Redirect to the selected year
    window.location.href = '?year=' + year;
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openPaymentModal(term, targetAmount, remainingAmount) {
    // Check if user has pay permission
    @if(!(auth()->check() && auth()->user()->canAccess('financial', 'pay')))
        appAlert('You do not have permission to make payments.');
        return;
    @endif
    
    document.getElementById('paymentTerm').value = term;
    document.getElementById('paymentYear').value = document.getElementById('selectedYear').value;
    const maxAmount = remainingAmount > 0 ? remainingAmount : targetAmount;
    document.getElementById('paymentModalTitle').innerHTML = 'Submit Payment - Term ' + term;
    document.getElementById('maxAmountHint').innerHTML = 'Remaining: ' + numberFormat(maxAmount) + ' RWF';
    document.getElementById('paymentAmount').max = maxAmount;
    document.getElementById('paymentAmount').placeholder = 'Max ' + numberFormat(maxAmount);
    document.getElementById('paymentModal').classList.remove('hidden');
}

function openEditAmountModal() {
    // Check if user has update permission
    @if(!(auth()->check() && auth()->user()->canAccess('financial', 'update')))
        appAlert('You do not have permission to edit contribution amounts.');
        return;
    @endif
    
    document.getElementById('editAmountModal').classList.remove('hidden');
}

function openPaymentHistory() {
    // Check if user has view permission
    @if(!(auth()->check() && auth()->user()->canAccess('financial', 'view')))
        appAlert('You do not have permission to view payment history.');
        return;
    @endif
    
    const year = document.getElementById('selectedYear').value;
    
    fetch(`/financial/payments/history?year=${year}`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.payments.length > 0) {
            let html = '<div class="space-y-3">';
            data.payments.forEach(payment => {
                html += `
                    <div class="border rounded-lg p-3 hover:bg-gray-50">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="font-medium text-gray-800">Term ${payment.term}</p>
                                <p class="text-xs text-gray-500">${new Date(payment.payment_date).toLocaleDateString()}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-lg font-bold text-green-600">RWF ${numberFormat(payment.amount)}</p>
                                <p class="text-xs text-gray-500">${payment.payment_method || 'Cash'}</p>
                            </div>
                        </div>
                        ${payment.transaction_id ? `<p class="text-xs text-gray-400 mt-1">Ref: ${payment.transaction_id}</p>` : ''}
                        ${payment.notes ? `<p class="text-xs text-gray-400 mt-1">${payment.notes}</p>` : ''}
                    </div>
                `;
            });
            html += '</div>';
            document.getElementById('paymentHistoryContent').innerHTML = html;
        } else {
            document.getElementById('paymentHistoryContent').innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-receipt text-3xl mb-2 block"></i>
                    No payment history found for ${year}
                </div>
            `;
        }
        document.getElementById('paymentHistoryModal').classList.remove('hidden');
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Could not load payment history');
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function numberFormat(num) {
    return new Intl.NumberFormat().format(num);
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('paymentModal');
    if (event.target === modal) {
        closeModal('paymentModal');
    }
    const editModal = document.getElementById('editAmountModal');
    if (event.target === editModal) {
        closeModal('editAmountModal');
    }
    const historyModal = document.getElementById('paymentHistoryModal');
    if (event.target === historyModal) {
        closeModal('paymentHistoryModal');
    }
    
    // Close year picker when clicking outside
    const picker = document.getElementById('yearPickerDropdown');
    const display = document.getElementById('yearDisplay');
    if (picker && !picker.classList.contains('hidden') && display) {
        const parentDiv = display.closest('.relative');
        if (parentDiv && !parentDiv.contains(event.target)) {
            closeYearPicker();
        }
    }
});

// ESC key to close modals
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal('paymentModal');
        closeModal('editAmountModal');
        closeModal('paymentHistoryModal');
        closeYearPicker();
    }
});

// Initialize year picker
document.addEventListener('DOMContentLoaded', function() {
    renderYearGrid();
});
</script>

<style>
.modal { display: none; }
.modal:not(.hidden) { display: block !important; }
.rotate-180 { transform: rotate(180deg); }
</style>
@endsection
