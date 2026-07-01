<div class="bg-white rounded-xl shadow-md p-6">
    
    <div class="flex justify-between items-center mb-6">
        <div>
            <h2 class="text-xl font-bold text-gray-800">Users</h2>
           
            @if(request()->get('year'))
                <p class="text-xs text-gray-400 mt-0.5">Showing users for year: <span class="font-medium">{{ request()->get('year') }}</span></p>
            @endif
        </div>
        <div class="flex items-center gap-3">
            <!-- Year Selector -->
            <div class="flex items-center gap-2">
                <label class="text-sm text-gray-600">Year:</label>
                <div class="relative">
                    <div onclick="toggleUserYearPicker()" 
                        class="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 bg-white cursor-pointer hover:border-gray-400 transition-all min-w-[120px]">
                        <span id="userYearDisplay" class="text-sm font-semibold text-blue800">{{ request()->get('year', date('Y')) }}</span>
                        <svg class="w-4 h-4 text-gray-400 transition-transform duration-200 ml-2" id="userYearArrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                    <input type="hidden" id="userSelectedYear" value="{{ request()->get('year', date('Y')) }}">
                    
                    <div id="userYearPickerDropdown" class="hidden absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 min-w-[200px]">
                        <div class="flex items-center justify-between mb-2">
                            <button type="button" onclick="changeUserYearPage(-1)" 
                                class="p-1 hover:bg-gray-100 rounded transition text-gray-500 hover:text-gray-700">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                </svg>
                            </button>
                            <span id="userYearPageTitle" class="text-xs font-medium text-gray-600">2018 - 2024</span>
                            <button type="button" onclick="changeUserYearPage(1)" 
                                class="p-1 hover:bg-gray-100 rounded transition text-gray-500 hover:text-gray-700">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="grid grid-cols-3 gap-1" id="userYearGrid"></div>
                    </div>
                </div>
                <span id="userYearBadge" class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hidden">
                    <i class="fas fa-history mr-1"></i> <span id="userYearStatus">Current</span>
                </span>
            </div>
            <button onclick="openAddUserModal()" class="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
                <i class="fas fa-user-plus"></i> Add User to Family
            </button>
        </div>
    </div>
    
    <!-- Search Bar -->
    <div class="mb-6">
        <div class="relative">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input type="text" id="searchUsers" placeholder="Search by name, email, or family..." 
                   class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500">
        </div>
    </div>
    
    <!-- Users Table -->
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USER</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FAMILY</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RESIDENCE</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200" id="usersTableBody">
                @forelse($allUsers ?? [] as $user)
                <tr class="hover:bg-gray-50 transition user-row" 
                    data-name="{{ strtolower($user->name) }}"
                    data-email="{{ strtolower($user->email) }}"
                    data-family="{{ strtolower($user->family_name ?? 'unassigned') }}">
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                                <span class="text-white text-sm font-bold">{{ substr($user->name, 0, 2) }}</span>
                            </div>
                            <div>
                                <p class="text-sm font-semibold text-gray-900">{{ $user->name }}</p>
                                <p class="text-xs text-gray-500">{{ $user->email }}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3">
    @if($user->is_assigned_in_year && $user->family_name)
        <div>
            <p class="text-sm font-medium text-gray-800">{{ $user->family_name }}</p>
            <p class="text-xs text-gray-500">Role: <span class="font-medium">{{ ucfirst($user->role ?? 'member') }}</span></p>
            <p class="text-xs text-gray-400">Year: {{ $user->family_year ?? $selectedYear }}</p>
        </div>
    @else
        <div>
            <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-500">
                <i class="fas fa-user-clock mr-1"></i> Unassigned in {{ $selectedYear }}
            </span>
            @if($user->has_any_family && $user->any_family_name)
                <p class="text-xs text-gray-400 mt-1">
                    
                </p>
            @endif
        </div>
    @endif
</td>
                    <td class="px-4 py-3 text-sm text-gray-600">
                        {{ $user->residence ?? 'Not specified' }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                            <i class="fas fa-circle text-xs mr-1"></i> Active
                        </span>
                    <td class="px-4 py-3 whitespace-nowrap">
    <div class="flex gap-2">
        <button onclick="viewUserDetails({{ $user->id }})" class="text-gray-600 hover:text-gray-900" title="View Details">
            <i class="fas fa-file-lines"></i>
        </button>
        @if($user->is_assigned_in_year && $user->family_name)
            <button onclick="removeFromFamily({{ $user->id }}, {{ $user->family_id }}, '{{ $user->name }}')" class="text-red-500 hover:text-red-700" title="Remove from Family in {{ $selectedYear }}">
                <i class="fas fa-user-minus"></i>
            </button>
        @else
            <button onclick="openAssignModal({{ $user->id }}, '{{ $user->name }}', '{{ $user->email }}')" class="text-blue-600 hover:text-blue-800" title="Assign to Family in {{ $selectedYear }}">
                <i class="fas fa-plus-circle"></i>
            </button>
        @endif
    </div>
</td>
                </tr>
                @empty
                <tr>
                    <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                        <i class="fas fa-users fa-3x mb-3 text-gray-300"></i>
                        <p>No users found</p>
                    </td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>
    
    <!-- Pagination -->
    @if(method_exists($allUsers, 'hasPages') && $allUsers->hasPages())
    <div class="mt-4">
        {{ $allUsers->links() }}
    </div>
    @endif
</div>

<!-- ==================== ADD USER TO FAMILY MODAL ==================== -->
<div id="addUserModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 hidden">
    <div class="relative top-20 mx-auto p-6 border w-full max-w-lg shadow-2xl rounded-2xl bg-white">
        <div class="flex justify-between items-center pb-4 border-b">
            <h3 class="text-xl font-bold text-gray-800">Add User to Family</h3>
            <button onclick="closeModal('addUserModal')" class="text-gray-400 hover:text-gray-600 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form id="addUserForm" method="POST" class="mt-4">
            @csrf
            <div class="space-y-4">
                <!-- Year Display -->
                <div class="bg-gray-50 rounded-lg p-3">
                    <p class="text-sm text-gray-600">
                        <i class="fas fa-calendar mr-2 text-gray-400"></i>
                        Year: <strong id="addUserModalYear">{{ request()->get('year', date('Y')) }}</strong>
                    </p>
                    <input type="hidden" name="year" value="{{ request()->get('year', date('Y')) }}">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Search User</label>
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="searchUserInput" placeholder="Search for a user by name or email..." 
                               class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Select User</label>
                    <div id="userListContainer" class="border border-gray-300 rounded-lg overflow-y-auto" style="max-height: 200px;">
                        <div id="userListItems">
                            @foreach($users ?? [] as $user)
                                <div class="user-select-item px-4 py-2 border-b hover:bg-gray-100 cursor-pointer transition"
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
                    <input type="hidden" name="user_id" id="selectedUserId">
                    <p class="text-xs text-gray-400 mt-1">Click on a user to select them</p>
                </div>
                
                <div id="selectedUserDisplay" class="hidden bg-green-50 border border-green-200 rounded-lg p-3">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-check-circle text-green-500"></i>
                            <span class="text-sm text-gray-700">Selected: <strong id="selectedUserName"></strong></span>
                        </div>
                        <button type="button" onclick="clearSelectedUser()" class="text-red-500 hover:text-red-700 transition">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Select Family</label>
                    <select name="family_id" id="selectFamilyId" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500">
                        <option value="">Select a family</option>
                        @foreach($families ?? [] as $family)
                            <option value="{{ $family->id }}">{{ $family->name }}</option>
                        @endforeach
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select name="role" id="selectRole" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500">
                        <option value="member">Member</option>
                        
                    </select>
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onclick="closeModal('addUserModal')" class="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition">
                    Cancel
                </button>
                <button type="submit" id="submitAddUserBtn" class="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg text-sm transition opacity-50 cursor-not-allowed" disabled>
                    Add to Family
                </button>
            </div>
        </form>
    </div>
</div>

<!-- ==================== ASSIGN TO FAMILY MODAL ==================== -->
<div id="assignModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 hidden">
    <div class="relative top-20 mx-auto p-6 border w-full max-w-lg shadow-2xl rounded-2xl bg-white">
        <div class="flex justify-between items-center pb-4 border-b">
            <h3 class="text-xl font-bold text-gray-800">Assign to Family</h3>
            <button onclick="closeModal('assignModal')" class="text-gray-400 hover:text-gray-600 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <div class="mt-4">
            <!-- User Info -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                        <span class="text-white text-lg font-bold" id="assignUserNameInitial">JD</span>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-800" id="assignUserName">User Name</p>
                        <p class="text-xs text-gray-500" id="assignUserEmail">user@email.com</p>
                    </div>
                </div>
            </div>
            
            <form id="assignForm" method="POST">
                @csrf
                <input type="hidden" name="user_id" id="assignUserId">
                <div class="space-y-4">
                    <!-- Year Display -->
                    <div class="bg-gray-50 rounded-lg p-3">
                        <p class="text-sm text-gray-600">
                            <i class="fas fa-calendar mr-2 text-gray-400"></i>
                            Year: <strong id="assignModalYear">{{ request()->get('year', date('Y')) }}</strong>
                        </p>
                        <input type="hidden" name="year" value="{{ request()->get('year', date('Y')) }}">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Select Family <span class="text-red-500">*</span></label>
                        <select name="family_id" id="assignFamilyId" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500">
                            <option value="">Select a family</option>
                            @foreach($families ?? [] as $family)
                                <option value="{{ $family->id }}">{{ $family->name }}</option>
                            @endforeach
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select name="role" id="assignRole" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500">
                            <option value="member">Member</option>
                            <option value="leader">Leader</option>
                            <option value="elder">Elder</option>
                        </select>
                    </div>
                </div>
                <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <button type="button" onclick="closeModal('assignModal')" class="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition">
                        Cancel
                    </button>
                    <button type="submit" class="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition flex items-center gap-2">
                        <i class="fas fa-check"></i> Assign to Family
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- ==================== REMOVE FROM FAMILY MODAL ==================== -->
<div id="removeModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 hidden">
    <div class="relative top-20 mx-auto p-6 border w-full max-w-md shadow-2xl rounded-2xl bg-white">
        <div class="flex justify-between items-center pb-4 border-b">
            <h3 class="text-xl font-bold text-gray-800">Remove from Family</h3>
            <button onclick="closeModal('removeModal')" class="text-gray-400 hover:text-gray-600 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <div id="removeModalContent" class="mt-4">
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                        <span class="text-white text-lg font-bold" id="removeUserNameInitial">JD</span>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-800" id="removeUserName">User Name</p>
                        <p class="text-xs text-gray-500" id="removeUserEmail">user@email.com</p>
                    </div>
                </div>
            </div>
            <p class="text-sm text-gray-600 mb-4">Are you sure you want to remove this member from the family for year <strong id="removeYearDisplay">{{ request()->get('year', date('Y')) }}</strong>?</p>
            <div class="flex justify-end gap-3">
                <button onclick="closeModal('removeModal')" class="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition">
                    Cancel
                </button>
                <button id="confirmRemoveBtn" class="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition flex items-center gap-2">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    </div>
</div>

<script>
// ============================================
// YEAR PICKER FUNCTIONS
// ============================================
let currentUserYear = parseInt(document.getElementById('userSelectedYear')?.value) || new Date().getFullYear();
let userYearPageOffset = 0;

function toggleUserYearPicker() {
    const dropdown = document.getElementById('userYearPickerDropdown');
    const arrow = document.getElementById('userYearArrow');
    
    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        arrow.classList.add('rotate-180');
        renderUserYearGrid();
    } else {
        dropdown.classList.add('hidden');
        arrow.classList.remove('rotate-180');
    }
}

function closeUserYearPicker() {
    const dropdown = document.getElementById('userYearPickerDropdown');
    const arrow = document.getElementById('userYearArrow');
    
    if (dropdown && !dropdown.classList.contains('hidden')) {
        dropdown.classList.add('hidden');
        arrow.classList.remove('rotate-180');
    }
}

function changeUserYearPage(direction) {
    userYearPageOffset += direction;
    renderUserYearGrid();
}

function renderUserYearGrid() {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear + (userYearPageOffset * 9) - 4;
    
    const grid = document.getElementById('userYearGrid');
    const title = document.getElementById('userYearPageTitle');
    
    if (!grid) return;
    
    const endYear = startYear + 8;
    title.textContent = `${startYear} - ${endYear}`;
    
    grid.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const year = startYear + i;
        const isSelected = year == currentUserYear;
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
                selectUserYear(year);
            };
        }
        
        grid.appendChild(btn);
    }
}

function selectUserYear(year) {
    currentUserYear = year;
    document.getElementById('userSelectedYear').value = year;
    document.getElementById('userYearDisplay').textContent = year;
    
    closeUserYearPicker();
    renderUserYearGrid();
    updateUserYearBadge();
    
    // Reload page with year parameter
    window.location.href = '?year=' + year;
}

function updateUserYearBadge() {
    const currentYearNow = new Date().getFullYear();
    const yearBadge = document.getElementById('userYearBadge');
    const yearStatus = document.getElementById('userYearStatus');
    
    if (!yearBadge) return;
    
    if (currentUserYear === currentYearNow) {
        yearBadge.classList.add('hidden');
    } else if (currentUserYear < currentYearNow) {
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
// MODAL FUNCTIONS
// ============================================

function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
    document.body.style.overflow = '';
}

// ============================================
// OPEN ASSIGN MODAL WITH USER DATA
// ============================================

function openAssignModal(userId, userName, userEmail) {
    // Set user info
    document.getElementById('assignUserId').value = userId;
    document.getElementById('assignUserName').textContent = userName;
    document.getElementById('assignUserEmail').textContent = userEmail || 'No email';
    document.getElementById('assignUserNameInitial').textContent = userName.substring(0, 2).toUpperCase();
    
    // Set year
    const year = document.getElementById('userSelectedYear').value || new Date().getFullYear();
    document.getElementById('assignModalYear').textContent = year;
    document.querySelector('#assignForm input[name="year"]').value = year;
    
    // Reset form
    document.getElementById('assignForm').reset();
    document.getElementById('assignFamilyId').value = '';
    
    openModal('assignModal');
}

// ============================================
// REMOVE FROM FAMILY
// ============================================

let removeUserId = null;
let removeFamilyId = null;

function removeFromFamily(userId, familyId, userName) {
    removeUserId = userId;
    removeFamilyId = familyId;
    
    // Set user info in remove modal
    document.getElementById('removeUserName').textContent = userName;
    document.getElementById('removeUserNameInitial').textContent = userName.substring(0, 2).toUpperCase();
    
    // Set year
    const year = document.getElementById('userSelectedYear').value || new Date().getFullYear();
    document.getElementById('removeYearDisplay').textContent = year;
    
    // Set confirm button
    document.getElementById('confirmRemoveBtn').onclick = function() {
        confirmRemove(removeUserId, removeFamilyId);
    };
    
    openModal('removeModal');
}

function confirmRemove(userId, familyId) {
    const btn = document.getElementById('confirmRemoveBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';
    btn.disabled = true;
    
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
            closeModal('removeModal');
            showNotification('Member removed successfully!', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            appAlert('Error: ' + data.message);
            btn.innerHTML = '<i class="fas fa-trash"></i> Remove';
            btn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error removing member');
        btn.innerHTML = '<i class="fas fa-trash"></i> Remove';
        btn.disabled = false;
    });
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

// Search functionality for main table
document.getElementById('searchUsers')?.addEventListener('keyup', function() {
    const searchTerm = this.value.toLowerCase();
    const rows = document.querySelectorAll('.user-row');
    
    rows.forEach(row => {
        const name = row.dataset.name || '';
        const email = row.dataset.email || '';
        const family = row.dataset.family || '';
        
        if (name.includes(searchTerm) || email.includes(searchTerm) || family.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

// Search users in the list
document.getElementById('searchUserInput')?.addEventListener('keyup', function() {
    const searchTerm = this.value.toLowerCase();
    const userItems = document.querySelectorAll('.user-select-item');
    
    userItems.forEach(item => {
        const name = item.dataset.userName?.toLowerCase() || '';
        const email = item.dataset.userEmail?.toLowerCase() || '';
        
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
});

// ============================================
// SELECT USER FROM LIST
// ============================================

function selectUser(userId, userName, userEmail) {
    // Remove selected class from all items
    document.querySelectorAll('.user-select-item').forEach(item => {
        item.classList.remove('bg-gray-200', 'border-gray-400');
    });
    
    // Add selected class to clicked item
    const selectedItem = document.querySelector(`.user-select-item[data-user-id="${userId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('bg-gray-200', 'border-gray-400');
    }
    
    // Set hidden input value
    document.getElementById('selectedUserId').value = userId;
    
    // Show selected user display
    document.getElementById('selectedUserDisplay').classList.remove('hidden');
    document.getElementById('selectedUserName').innerHTML = `${userName} (${userEmail})`;
    
    // Enable submit button
    const submitBtn = document.getElementById('submitAddUserBtn');
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    submitBtn.classList.add('opacity-100', 'cursor-pointer');
}

function clearSelectedUser() {
    document.getElementById('selectedUserId').value = '';
    document.getElementById('selectedUserDisplay').classList.add('hidden');
    
    document.querySelectorAll('.user-select-item').forEach(item => {
        item.classList.remove('bg-gray-200', 'border-gray-400');
    });
    
    const submitBtn = document.getElementById('submitAddUserBtn');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    submitBtn.classList.remove('opacity-100', 'cursor-pointer');
}

// ============================================
// OPEN ADD USER MODAL
// ============================================

function openAddUserModal() {
    document.getElementById('addUserForm').reset();
    document.getElementById('searchUserInput').value = '';
    document.getElementById('selectedUserId').value = '';
    document.getElementById('selectedUserDisplay').classList.add('hidden');
    
    const year = document.getElementById('userSelectedYear').value || new Date().getFullYear();
    document.getElementById('addUserModalYear').textContent = year;
    document.querySelector('#addUserForm input[name="year"]').value = year;
    
    const submitBtn = document.getElementById('submitAddUserBtn');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    submitBtn.classList.remove('opacity-100', 'cursor-pointer');
    
    document.querySelectorAll('.user-select-item').forEach(item => {
        item.style.display = '';
        item.classList.remove('bg-gray-200', 'border-gray-400');
    });
    
    openModal('addUserModal');
}

// ============================================
// ATTACH CLICK EVENTS
// ============================================

document.querySelectorAll('.user-select-item').forEach(item => {
    item.addEventListener('click', function() {
        const userId = this.dataset.userId;
        const userName = this.dataset.userName;
        const userEmail = this.dataset.userEmail;
        selectUser(userId, userName, userEmail);
    });
});

// ============================================
// FORM SUBMISSIONS
// ============================================

// Add User Form Submission
document.getElementById('addUserForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('selectedUserId').value;
    const familyId = document.getElementById('selectFamilyId').value;
    
    if (!userId) {
        appAlert('Please select a user');
        return;
    }
    
    if (!familyId) {
        appAlert('Please select a family');
        return;
    }
    
    const btn = document.getElementById('submitAddUserBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    btn.disabled = true;
    
    const formData = new FormData(this);
    
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
            closeModal('addUserModal');
            showNotification('User added to family successfully!', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            appAlert('Error: ' + data.message);
            btn.innerHTML = 'Add to Family';
            btn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error adding user to family');
        btn.innerHTML = 'Add to Family';
        btn.disabled = false;
    });
});

// Assign Form Submission
document.getElementById('assignForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('assignUserId').value;
    const familyId = document.getElementById('assignFamilyId').value;
    
    if (!familyId) {
        appAlert('Please select a family');
        return;
    }
    
    const btn = this.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning...';
    btn.disabled = true;
    
    const formData = new FormData(this);
    
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
            closeModal('assignModal');
            showNotification('User assigned to family successfully!', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            appAlert('Error: ' + data.message);
            btn.innerHTML = '<i class="fas fa-check"></i> Assign to Family';
            btn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error assigning user to family');
        btn.innerHTML = '<i class="fas fa-check"></i> Assign to Family';
        btn.disabled = false;
    });
});

// ============================================
// VIEW USER DETAILS
// ============================================

function viewUserDetails(userId) {
    window.location.href = `/users/${userId}`;
}

// ============================================
// NOTIFICATION
// ============================================

function showNotification(message, type) {
    return window.appNotify(...arguments);
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white z-50 flex items-center gap-2 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
        <button onclick="this.parentElement.remove()" class="ml-2 text-white/70 hover:text-white">Ã—</button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// CLOSE YEAR PICKER WHEN CLICKING OUTSIDE
// ============================================

document.addEventListener('click', function(event) {
    const picker = document.getElementById('userYearPickerDropdown');
    const display = document.querySelector('#userYearDisplay');
    
    if (picker && !picker.classList.contains('hidden') && display) {
        const parentDiv = display.closest('.relative');
        if (parentDiv && !parentDiv.contains(event.target)) {
            closeUserYearPicker();
        }
    }
});

// ============================================
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const currentYear = new Date().getFullYear();
    const selectedYear = parseInt(document.getElementById('userSelectedYear')?.value) || currentYear;
    currentUserYear = selectedYear;
    document.getElementById('userSelectedYear').value = selectedYear;
    document.getElementById('userYearDisplay').textContent = selectedYear;
    renderUserYearGrid();
    updateUserYearBadge();
});
</script>

<style>
.rotate-180 {
    transform: rotate(180deg);
}
</style>


