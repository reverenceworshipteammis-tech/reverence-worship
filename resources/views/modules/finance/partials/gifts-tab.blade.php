<div>
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-800">Gifts & Donations</h3>
        <button onclick="openGiftModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm">
            <i class="fas fa-plus mr-2"></i> Add Gift
        </button>
    </div>
    
    <!-- Filters -->
    <div class="bg-gray-50 rounded-lg p-4 mb-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Search Donor</label>
                <input type="text" id="searchGift" placeholder="Search by donor name..." 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select id="giftStatus" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="all">All</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                <button onclick="filterGifts()" class="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">
                    <i class="fas fa-search mr-2"></i> Filter
                </button>
            </div>
        </div>
    </div>
    
    <!-- Gifts Table -->
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Donor</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody id="gifts-table-body">
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500">No gifts found</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<script>
function filterGifts() {
    const search = document.getElementById('searchGift')?.value || '';
    const status = document.getElementById('giftStatus')?.value || 'all';
    
    fetch(`/finance/gifts/filter?search=${search}&status=${status}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateGiftsTable(data.gifts);
            }
        });
}

function updateGiftsTable(gifts) {
    const tbody = document.getElementById('gifts-table-body');
    if (!gifts || gifts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-gray-500">No gifts found</td></tr>';
        return;
    }
    
    tbody.innerHTML = gifts.map(gift => `
        <tr class="border-b hover:bg-gray-50">
            <td class="px-6 py-4 text-sm">${escapeHtml(gift.donor_name)}</td>
            <td class="px-6 py-4 text-sm font-semibold text-green-600">$${parseFloat(gift.amount).toLocaleString()}</td>
            <td class="px-6 py-4 text-sm">${gift.date}</td>
            <td class="px-6 py-4 text-sm capitalize">${gift.gift_type || '-'}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-xs ${gift.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                    ${gift.status || 'Pending'}
                </span>
            </td>
            <td class="px-6 py-4">
                <button onclick="editGift(${gift.id})" class="text-blue-500 hover:text-blue-700 mr-2">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteGift(${gift.id})" class="text-red-500 hover:text-red-700">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function editGift(id) {
    // Implement edit functionality
    window.location.href = `/finance/gifts/${id}/edit`;
}

async function deleteGift(id) {
    if (await appConfirm('Are you sure you want to delete this gift?')) {
        fetch(`/finance/gifts/${id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                filterGifts();
            } else {
                appAlert('Error deleting gift');
            }
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
</script>
