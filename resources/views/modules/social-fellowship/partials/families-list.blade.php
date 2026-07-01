<div class="bg-white rounded-xl shadow-md p-6">
    
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2 class="text-xl font-bold text-gray-800">Families</h2>
           
            @if(request()->get('year'))
                <p class="text-xs text-gray-400 mt-0.5">Showing families for year: <span class="font-medium">{{ request()->get('year') }}</span></p>
            @endif
        </div>
        <div class="flex items-center gap-3">
            <!-- Year Selector -->
            <div class="flex items-center gap-2">
                <label class="text-sm text-gray-600">Year:</label>
                <div class="relative">
                    <div onclick="toggleFamilyYearPicker()" 
                        class="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 bg-white cursor-pointer hover:border-gray-400 transition-all min-w-[120px]">
                        <span id="familyYearDisplay" class="text-sm font-semibold text-gray-800">{{ request()->get('year', date('Y')) }}</span>
                        <svg class="w-4 h-4 text-gray-400 transition-transform duration-200 ml-2" id="familyYearArrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                    <input type="hidden" id="familySelectedYear" value="{{ request()->get('year', date('Y')) }}">
                    
                    <div id="familyYearPickerDropdown" class="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 min-w-[200px]">
                        <div class="flex items-center justify-between mb-2">
                            <button type="button" onclick="changeFamilyYearPage(-1)" 
                                class="p-1 hover:bg-gray-100 rounded transition text-gray-500 hover:text-gray-700">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                            </button>
                            <span id="familyYearPageTitle" class="text-xs font-medium text-gray-600">2018 - 2024</span>
                            <button type="button" onclick="changeFamilyYearPage(1)" 
                                class="p-1 hover:bg-gray-100 rounded transition text-gray-500 hover:text-gray-700">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="grid grid-cols-3 gap-1" id="familyYearGrid"></div>
                    </div>
                </div>
                <span id="familyYearBadge" class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hidden">
                    <i class="fas fa-history mr-1"></i> <span id="familyYearStatus">Current</span>
                </span>
            </div>
            <button onclick="openFamilyModal()" class="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
                <i class="fas fa-plus"></i> Add Family
            </button>
        </div>
    </div>
    
    <!-- Search Bar -->
    <div class="mb-6">
        <div class="relative">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="text" id="searchFamilies" placeholder="Search families..." 
                   class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500">
        </div>
    </div>
    
    <!-- Families Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="familiesGrid">
        @forelse($families as $family)
        <div class="border rounded-xl p-4 hover:shadow-lg transition-all duration-300 family-card" data-name="{{ strtolower($family->name) }}" data-family-id="{{ $family->id }}">
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-gray-800 text-lg">{{ $family->name }}</h3>
                <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{{ $family->members_count ?? 0 }} members</span>
            </div>
            @if($family->parent_name)
            <p class="text-sm text-gray-500 mb-1">
                <i class="fas fa-user-check mr-1"></i> Parent: {{ $family->parent_name }}
            </p>
            @endif
            @if($family->description)
            <p class="text-sm text-gray-600 mt-2 line-clamp-2">{{ $family->description }}</p>
            @endif
            <div class="flex justify-between items-center mt-3 pt-3 border-t">
                <span class="text-xs text-gray-400">
                    <i class="fas fa-calendar mr-1"></i> {{ \Carbon\Carbon::parse($family->created_at)->format('d M Y') }}
                </span>
                <div class="flex gap-2">
                    <button onclick="viewFamilyMembers({{ $family->id }})" class="text-gray-700 hover:text-gray-900 text-sm font-medium">
                        View Members <i class="fas fa-arrow-right ml-1"></i>
                    </button>
                    <button onclick="openChangeParentModal({{ $family->id }}, '{{ $family->name }}', {{ $family->parent_id ?? 'null' }})" class="text-blue-500 hover:text-blue-700 text-sm" title="Change Parent">
                        <i class="fas fa-user-edit"></i>
                    </button>
                    <button onclick="deleteFamily({{ $family->id }})" class="text-red-500 hover:text-red-700 text-sm" title="Delete Family">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
        @empty
        <div class="col-span-full text-center py-8">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i class="fas fa-users text-2xl text-gray-400"></i>
            </div>
            <p class="text-gray-500">No families found</p>
            <p class="text-sm text-gray-400 mt-1">Click "Add Family" to create your first family</p>
        </div>
        @endforelse
    </div>
</div>

<!-- Add Family Modal -->
<div id="familyModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-lg font-bold text-gray-800">Add New Family</h3>
            <button onclick="closeModal('familyModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form id="familyForm" method="POST">
            @csrf
            <div class="mt-4 space-y-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Family Name *</label>
                    <input type="text" name="name" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500">
                </div>
                
                <!-- Year Display -->
                <div class="bg-gray-50 rounded-lg p-3">
                    <p class="text-sm text-gray-600">
                        <i class="fas fa-calendar mr-2 text-gray-400"></i>
                        Year: <strong id="familyModalYear">{{ request()->get('year', date('Y')) }}</strong>
                    </p>
                    <input type="hidden" name="year" value="{{ request()->get('year', date('Y')) }}">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Search Parent</label>
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="searchParentInput" placeholder="Search for a parent by name or email..." 
                               class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Select Parent</label>
                    <div id="parentListContainer" class="border border-gray-300 rounded-lg overflow-y-auto bg-white" style="max-height: 200px;">
                        <div id="parentListItems">
                            @foreach($availableUsers ?? [] as $user)
                                <div class="parent-select-item px-4 py-2 border-b hover:bg-gray-100 cursor-pointer transition"
                                     data-user-id="{{ $user->id }}"
                                     data-user-name="{{ $user->name }}"
                                     data-user-email="{{ $user->email }}">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                            <i class="fas fa-user text-gray-500 text-xs"></i>
                                        </div>
                                        <div>
                                            <p class="text-sm font-medium text-gray-800">{{ $user->name }}</p>
                                            <p class="text-xs text-gray-500">{{ $user->email }}</p>
                                        </div>
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    </div>
                    <input type="hidden" name="parent_id" id="selectedParentId">
                    <input type="hidden" name="parent_name" id="selectedParentName">
                    <p class="text-xs text-gray-400 mt-1">Click on a user to select them as parent (only users not already in a family are shown)</p>
                </div>
                
                <div id="selectedParentDisplay" class="hidden bg-gray-100 rounded-lg p-3">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-check-circle text-green-500"></i>
                        <span class="text-sm text-gray-700">Selected parent: <strong id="selectedParentDisplayName"></strong></span>
                        <button type="button" onclick="clearSelectedParent()" class="ml-auto text-red-500 hover:text-red-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" rows="3" 
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Motto</label>
                    <input type="text" name="motto" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500">
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-5 pt-3 border-t">
                <button type="button" onclick="closeModal('familyModal')" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" id="submitFamilyBtn" class="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-sm transition">Save Family</button>
            </div>
        </form>
    </div>
</div>

<!-- Change Parent Modal -->
<div id="changeParentModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-lg font-bold text-gray-800">Change Family Parent</h3>
            <button onclick="closeModal('changeParentModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form id="changeParentForm" method="POST">
            @csrf
            @method('PUT')
            <input type="hidden" id="changeParentFamilyId" name="family_id">
            <div class="mt-4 space-y-3">
                <div>
                    <p class="text-sm text-gray-600 mb-2">
                        <strong>Family:</strong> <span id="changeParentFamilyName"></span>
                    </p>
                </div>
                
                <!-- Year Display -->
                <div class="bg-gray-50 rounded-lg p-3">
                    <p class="text-sm text-gray-600">
                        <i class="fas fa-calendar mr-2 text-gray-400"></i>
                        Year: <strong id="changeParentModalYear">{{ request()->get('year', date('Y')) }}</strong>
                    </p>
                    <input type="hidden" name="year" value="{{ request()->get('year', date('Y')) }}">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Current Parent</label>
                    <p id="changeParentCurrentParent" class="text-sm text-gray-500 bg-gray-100 p-2 rounded-lg">
                        <i class="fas fa-user mr-1"></i> <span id="changeParentCurrentParentName">None</span>
                    </p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Search Family Members</label>
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="changeParentSearchInput" placeholder="Search members by name or email..." 
                               class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Select New Parent</label>
                    <div id="changeParentListContainer" class="border border-gray-300 rounded-lg overflow-y-auto bg-white" style="max-height: 200px;">
                        <div id="changeParentListItems">
                            <!-- Dynamically populated -->
                            <div class="text-center py-4 text-gray-500">
                                <i class="fas fa-spinner fa-spin mr-2"></i> Loading family members...
                            </div>
                        </div>
                    </div>
                    <input type="hidden" name="parent_id" id="changeSelectedParentId">
                    <input type="hidden" name="parent_name" id="changeSelectedParentName">
                    <p class="text-xs text-gray-400 mt-1">Click on a family member to assign them as the new parent</p>
                </div>
                
                <div id="changeSelectedParentDisplay" class="hidden bg-gray-100 rounded-lg p-3">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-check-circle text-green-500"></i>
                        <span class="text-sm text-gray-700">New parent: <strong id="changeSelectedParentDisplayName"></strong></span>
                        <button type="button" onclick="clearChangeSelectedParent()" class="ml-auto text-red-500 hover:text-red-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-5 pt-3 border-t">
                <button type="button" onclick="closeModal('changeParentModal')" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">Update Parent</button>
            </div>
        </form>
    </div>
</div>

<!-- View Members Modal -->
<div id="viewMembersModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-xl bg-white">
        <div class="flex justify-between items-center pb-4 border-b">
            <div>
                <h3 id="modalFamilyName" class="text-xl font-bold text-gray-800">Family Name</h3>
                <p id="modalFamilyInfo" class="text-sm text-gray-500 mt-1"></p>
            </div>
            <button onclick="closeModal('viewMembersModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <!-- Add Member Button -->
        <div class="flex justify-end mt-4">
            <button onclick="openAddMemberModal()" class="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
                <i class="fas fa-user-plus"></i> Add Member
            </button>
        </div>
        
        <!-- Members List -->
        <div id="membersList" class="mt-4 max-h-96 overflow-y-auto">
            <div class="text-center py-8">
                <i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                <p class="text-gray-500 mt-2">Loading members...</p>
            </div>
        </div>
        
        <div class="flex justify-end mt-6 pt-4 border-t">
            <button onclick="closeModal('viewMembersModal')" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition">
                Close
            </button>
        </div>
    </div>
</div>

<!-- Add Member Modal -->
<div id="addMemberModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-lg font-bold text-gray-800">Add Member to Family</h3>
            <button onclick="closeModal('addMemberModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form id="addMemberForm" method="POST">
            @csrf
            <input type="hidden" id="addMemberFamilyId" name="family_id">
            <div class="mt-4 space-y-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Select User *</label>
                    <select name="user_id" id="memberUserId" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500">
                        <option value="">Select a user</option>
                        @foreach($users ?? [] as $user)
                            <option value="{{ $user->id }}">{{ $user->name }} ({{ $user->email }})</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select name="role" id="memberRole" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500">
                        <option value="member">Member</option>
                        <option value="leader">Leader</option>
                        <option value="elder">Elder</option>
                    </select>
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-5 pt-3 border-t">
                <button type="button" onclick="closeModal('addMemberModal')" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm transition">Add Member</button>
            </div>
        </form>
    </div>
</div>

<script>
// ============================================
// YEAR PICKER FUNCTIONS
// ============================================
let currentFamilyYear = parseInt(document.getElementById('familySelectedYear')?.value) || new Date().getFullYear();
let familyYearPageOffset = 0;

function toggleFamilyYearPicker() {
    const dropdown = document.getElementById('familyYearPickerDropdown');
    const arrow = document.getElementById('familyYearArrow');
    
    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        arrow.classList.add('rotate-180');
        renderFamilyYearGrid();
    } else {
        dropdown.classList.add('hidden');
        arrow.classList.remove('rotate-180');
    }
}

function closeFamilyYearPicker() {
    const dropdown = document.getElementById('familyYearPickerDropdown');
    const arrow = document.getElementById('familyYearArrow');
    
    if (dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
        arrow.classList.remove('rotate-180');
    }
}

function changeFamilyYearPage(direction) {
    familyYearPageOffset += direction;
    renderFamilyYearGrid();
}

function renderFamilyYearGrid() {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear + (familyYearPageOffset * 9) - 4;
    
    const grid = document.getElementById('familyYearGrid');
    const title = document.getElementById('familyYearPageTitle');
    
    if (!grid) return;
    
    const endYear = startYear + 8;
    title.textContent = `${startYear} - ${endYear}`;
    
    grid.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const year = startYear + i;
        const isSelected = year == currentFamilyYear;
        const isCurrentYear = year == currentYear;
        const isDisabled = year < 2000 || year > 2100;
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = year;
        btn.className = 'py-1.5 px-2 rounded text-xs transition-all text-center';
        
        if (isSelected) {
            btn.classList.add('bg-gray-800', 'text-white', 'font-semibold', 'shadow-sm');
        } else if (isCurrentYear) {
            btn.classList.add('bg-gray-100', 'text-gray-700', 'font-medium', 'border', 'border-gray-300');
        } else {
            btn.classList.add('text-gray-700', 'hover:bg-gray-100');
        }
        
        if (isDisabled) {
            btn.classList.add('text-gray-300', 'cursor-not-allowed');
            btn.disabled = true;
        } else {
            btn.onclick = function() {
                selectFamilyYear(year);
            };
        }
        
        grid.appendChild(btn);
    }
}

function selectFamilyYear(year) {
    currentFamilyYear = year;
    document.getElementById('familySelectedYear').value = year;
    document.getElementById('familyYearDisplay').textContent = year;
    
    closeFamilyYearPicker();
    renderFamilyYearGrid();
    updateFamilyYearBadge();
    
    // Reload page with year parameter
    window.location.href = '?year=' + year;
}

function updateFamilyYearBadge() {
    const currentYearNow = new Date().getFullYear();
    const yearBadge = document.getElementById('familyYearBadge');
    const yearStatus = document.getElementById('familyYearStatus');
    
    if (!yearBadge) return;
    
    if (currentFamilyYear === currentYearNow) {
        yearBadge.classList.add('hidden');
    } else if (currentFamilyYear < currentYearNow) {
        yearBadge.classList.remove('hidden');
        yearStatus.innerHTML = 'Archived Year';
        yearBadge.className = 'px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700';
    } else {
        yearBadge.classList.remove('hidden');
        yearStatus.innerHTML = 'Future Year';
        yearBadge.className = 'px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700';
    }
}

// ============================================
// EXISTING FUNCTIONS (keeping all your existing code)
// ============================================

let currentFamilyId = null;
let changeParentFamilyId = null;

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Search functionality
document.getElementById('searchFamilies')?.addEventListener('keyup', function() {
    const searchTerm = this.value.toLowerCase();
    const cards = document.querySelectorAll('.family-card');
    
    cards.forEach(card => {
        const name = card.dataset.name;
        if (name.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// Delete Family
async function deleteFamily(familyId) {
    if (await appConfirm('Are you sure you want to delete this family? All members and tasks will also be deleted. This action cannot be undone.')) {
        fetch(`/social-fellowship/family/${familyId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Family deleted successfully!', 'success');
                setTimeout(() => location.reload(), 1000);
            } else {
                appAlert('Error deleting family: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            appAlert('Error deleting family');
        });
    }
}

// View Family Members
function viewFamilyMembers(familyId) {
    currentFamilyId = familyId;
    
    document.getElementById('membersList').innerHTML = `
        <div class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
            <p class="text-gray-500 mt-2">Loading members...</p>
        </div>
    `;
    document.getElementById('viewMembersModal').classList.remove('hidden');
    
    fetch(`/social-fellowship/family/${familyId}/details`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('modalFamilyName').textContent = data.family.name;
            document.getElementById('modalFamilyInfo').innerHTML = `
                ${data.family.motto ? `<i class="fas fa-quote-left mr-1"></i> "${data.family.motto}"` : ''}
                ${data.family.parent_name ? ` â€¢ Parent: ${data.family.parent_name}` : ''}
                <span class="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">${data.members.length} members</span>
            `;
            
            if (data.members.length > 0) {
                let membersHtml = `
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MEMBER</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CONTACT</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">LOCATION</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ROLE</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">STATUS</th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ACTION</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                `;
                
                for (let i = 0; i < data.members.length; i++) {
                    const member = data.members[i];
                    const memberFamilyId = member.family_id || currentFamilyId;
                    const memberName = member.name || 'Unknown';
                    const memberEmail = member.email || '';
                    const memberPhone = member.phone || 'N/A';
                    const memberLocation = member.location || 'Not specified';
                    const memberRole = member.role || 'member';
                    
                    membersHtml += `
                        <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3">
                                <div>
                                    <p class="font-medium text-gray-800">${escapeHtml(memberName)}</p>
                                    ${memberEmail ? `<p class="text-xs text-gray-500">${escapeHtml(memberEmail)}</p>` : ''}
                                </div>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(memberPhone)}</td>
                            <td class="px-4 py-3 text-sm text-gray-600">${escapeHtml(memberLocation)}</td>
                            <td class="px-4 py-3">
                                <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                    ${memberRole === 'parent' ? 'Parent' : (memberRole === 'leader' ? 'Leader' : memberRole.charAt(0).toUpperCase() + memberRole.slice(1))}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                                    <i class="fas fa-circle text-xs mr-1"></i> Active
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <button onclick="removeMember(${member.user_id}, ${memberFamilyId})" class="text-red-600 hover:text-red-800 text-sm">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                            </td>
                        </tr>
                    `;
                }
                
                membersHtml += `
                        </tbody>
                    </table>
                `;
                document.getElementById('membersList').innerHTML = membersHtml;
            } else {
                document.getElementById('membersList').innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-users fa-3x text-gray-300 mb-3"></i>
                        <p class="text-gray-500">No members in this family yet</p>
                        <button onclick="openAddMemberModal()" class="mt-3 text-gray-700 hover:text-gray-900 text-sm">
                            <i class="fas fa-user-plus"></i> Add first member
                        </button>
                    </div>
                `;
            }
        } else {
            document.getElementById('membersList').innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                    <p>Error loading members: ${data.message}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('membersList').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                <p>Error loading members. Please try again.</p>
            </div>
        `;
    });
}

// Open Add Member Modal
function openAddMemberModal() {
    if (!currentFamilyId) {
        appAlert('No family selected');
        return;
    }
    document.getElementById('addMemberFamilyId').value = currentFamilyId;
    document.getElementById('addMemberModal').classList.remove('hidden');
}

// Remove Member
async function removeMember(userId, familyId) {
    if (await appConfirm('Are you sure you want to remove this member from the family?')) {
        fetch(`/social-fellowship/family/${familyId}/member/${userId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Member removed successfully!', 'success');
                viewFamilyMembers(currentFamilyId);
            } else {
                appAlert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            appAlert('Error removing member');
        });
    }
}

// ============================================
// CHANGE PARENT FUNCTIONALITY
// ============================================

function openChangeParentModal(familyId, familyName, currentParentId) {
    changeParentFamilyId = familyId;
    
    document.getElementById('changeParentFamilyName').textContent = familyName;
    document.getElementById('changeParentFamilyId').value = familyId;
    
    const currentParentName = document.querySelector(`.family-card[data-family-id="${familyId}"]`) 
        ?.querySelector('p.text-gray-500') 
        ?.textContent 
        ?.replace('Parent: ', '') || 'None';
    
    document.getElementById('changeParentCurrentParentName').textContent = currentParentName || 'None';
    
    document.getElementById('changeParentForm').reset();
    document.getElementById('changeParentSearchInput').value = '';
    document.getElementById('changeSelectedParentId').value = '';
    document.getElementById('changeSelectedParentName').value = '';
    document.getElementById('changeSelectedParentDisplay').classList.add('hidden');
    
    loadAvailableParents(familyId, currentParentId);
    
    document.getElementById('changeParentModal').classList.remove('hidden');
}

function loadAvailableParents(familyId, currentParentId) {
    const container = document.getElementById('changeParentListItems');
    container.innerHTML = `
        <div class="text-center py-4 text-gray-500">
            <i class="fas fa-spinner fa-spin mr-2"></i> Loading family members...
        </div>
    `;
    
    fetch(`/social-fellowship/family/${familyId}/available-parents`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.users.length > 0) {
            let html = '';
            data.users.forEach(user => {
                const isCurrentParent = user.id == currentParentId;
                html += `
                    <div class="parent-select-item px-4 py-2 border-b hover:bg-gray-100 cursor-pointer transition ${isCurrentParent ? 'bg-gray-200 border-gray-500' : ''}"
                         data-user-id="${user.id}"
                         data-user-name="${user.name}"
                         data-user-email="${user.email}"
                         onclick="selectChangeParent(${user.id}, '${user.name.replace(/'/g, "\\'")}', '${user.email.replace(/'/g, "\\'")}')">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-gray-500 text-xs"></i>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-800">${escapeHtml(user.name)} ${isCurrentParent ? '<span class="text-xs text-blue-500 ml-2">(Current Parent)</span>' : ''}</p>
                                <p class="text-xs text-gray-500">${escapeHtml(user.email)}</p>
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-users text-2xl mb-2"></i>
                    <p>No members found in this family</p>
                    <p class="text-xs mt-1">Add members to the family first before assigning a parent</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="text-center py-4 text-red-500">
                <i class="fas fa-exclamation-circle mr-2"></i>
                Error loading family members
            </div>
        `;
    });
}

function selectChangeParent(userId, userName, userEmail) {
    document.querySelectorAll('#changeParentListItems .parent-select-item').forEach(item => {
        item.classList.remove('bg-gray-200', 'border-gray-500');
    });
    
    const selectedItem = document.querySelector(`#changeParentListItems .parent-select-item[data-user-id="${userId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('bg-gray-200', 'border-gray-500');
    }
    
    document.getElementById('changeSelectedParentId').value = userId;
    document.getElementById('changeSelectedParentName').value = userName;
    
    document.getElementById('changeSelectedParentDisplay').classList.remove('hidden');
    document.getElementById('changeSelectedParentDisplayName').innerHTML = `${escapeHtml(userName)} (${escapeHtml(userEmail)})`;
}

function clearChangeSelectedParent() {
    document.getElementById('changeSelectedParentId').value = '';
    document.getElementById('changeSelectedParentName').value = '';
    document.getElementById('changeSelectedParentDisplay').classList.add('hidden');
    
    document.querySelectorAll('#changeParentListItems .parent-select-item').forEach(item => {
        item.classList.remove('bg-gray-200', 'border-gray-500');
    });
}

document.getElementById('changeParentSearchInput')?.addEventListener('keyup', function() {
    const searchTerm = this.value.toLowerCase();
    const parentItems = document.querySelectorAll('#changeParentListItems .parent-select-item');
    
    parentItems.forEach(item => {
        const name = item.dataset.userName?.toLowerCase() || '';
        const email = item.dataset.userEmail?.toLowerCase() || '';
        
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
});

document.getElementById('changeParentForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const familyId = document.getElementById('changeParentFamilyId').value;
    const formData = new FormData(this);
    
    fetch(`/social-fellowship/family/${familyId}/change-parent`, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('changeParentModal');
            showNotification('Family parent updated successfully!', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            appAlert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error updating family parent');
    });
});

// ============================================
// FAMILY FORM (Create)
// ============================================

document.getElementById('familyForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    fetch('{{ route("social-fellowship.families.store") }}', {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('familyModal');
            showNotification('Family created successfully!', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            appAlert('Error: ' + data.message);
        }
    });
});

document.getElementById('searchParentInput')?.addEventListener('keyup', function() {
    const searchTerm = this.value.toLowerCase();
    const parentItems = document.querySelectorAll('.parent-select-item');
    
    parentItems.forEach(item => {
        const name = item.dataset.userName?.toLowerCase() || '';
        const email = item.dataset.userEmail?.toLowerCase() || '';
        
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
});

function selectParent(userId, userName, userEmail) {
    document.querySelectorAll('.parent-select-item').forEach(item => {
        item.classList.remove('bg-gray-200', 'border-gray-500');
    });
    
    const selectedItem = document.querySelector(`.parent-select-item[data-user-id="${userId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('bg-gray-200', 'border-gray-500');
    }
    
    document.getElementById('selectedParentId').value = userId;
    document.getElementById('selectedParentName').value = userName;
    
    document.getElementById('selectedParentDisplay').classList.remove('hidden');
    document.getElementById('selectedParentDisplayName').innerHTML = `${userName} (${userEmail})`;
}

function clearSelectedParent() {
    document.getElementById('selectedParentId').value = '';
    document.getElementById('selectedParentName').value = '';
    document.getElementById('selectedParentDisplay').classList.add('hidden');
    
    document.querySelectorAll('.parent-select-item').forEach(item => {
        item.classList.remove('bg-gray-200', 'border-gray-500');
    });
}

document.querySelectorAll('.parent-select-item').forEach(item => {
    item.addEventListener('click', function() {
        const userId = this.dataset.userId;
        const userName = this.dataset.userName;
        const userEmail = this.dataset.userEmail;
        selectParent(userId, userName, userEmail);
    });
});

function openFamilyModal() {
    document.getElementById('familyModal').classList.remove('hidden');
    document.getElementById('familyForm').reset();
    document.getElementById('searchParentInput').value = '';
    document.getElementById('selectedParentId').value = '';
    document.getElementById('selectedParentName').value = '';
    document.getElementById('selectedParentDisplay').classList.add('hidden');
    
    // Set the year in the modal
    const year = document.getElementById('familySelectedYear').value || new Date().getFullYear();
    document.getElementById('familyModalYear').textContent = year;
    document.querySelector('input[name="year"]').value = year;
    
    document.querySelectorAll('.parent-select-item').forEach(item => {
        item.style.display = '';
        item.classList.remove('bg-gray-200', 'border-gray-500');
    });
}

document.getElementById('addMemberForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const familyId = document.getElementById('addMemberFamilyId').value;
    
    fetch(`/social-fellowship/family/${familyId}/member`, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('addMemberModal');
            showNotification('Member added successfully!', 'success');
            viewFamilyMembers(currentFamilyId);
            document.getElementById('addMemberForm').reset();
        } else {
            appAlert('Error: ' + data.message);
        }
    });
});

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function showNotification(message, type) {
    return window.appNotify(...arguments);
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// ============================================
// CLOSE YEAR PICKER WHEN CLICKING OUTSIDE
// ============================================
document.addEventListener('click', function(event) {
    const picker = document.getElementById('familyYearPickerDropdown');
    const display = document.querySelector('#familyYearDisplay');
    
    if (picker && !picker.classList.contains('hidden') && display) {
        const parentDiv = display.closest('.relative');
        if (parentDiv && !parentDiv.contains(event.target)) {
            closeFamilyYearPicker();
        }
    }
});

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const currentYear = new Date().getFullYear();
    const selectedYear = parseInt(document.getElementById('familySelectedYear')?.value) || currentYear;
    currentFamilyYear = selectedYear;
    document.getElementById('familySelectedYear').value = selectedYear;
    document.getElementById('familyYearDisplay').textContent = selectedYear;
    renderFamilyYearGrid();
    updateFamilyYearBadge();
});
</script>

<style>
.rotate-180 {
    transform: rotate(180deg);
}
</style>

