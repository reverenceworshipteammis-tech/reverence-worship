<div id="permissionModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="permission_modal_title" class="text-lg font-bold text-gray-800">Permission Request</h3>
            <button onclick="closeModal('permissionModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form id="permission-form">
            @csrf
            <input type="hidden" id="permission_id" name="permission_id">
            <!-- Use hidden input instead of hidden select -->
            <input type="hidden" id="permission_user_id" name="user_id" value="">
            <input type="hidden" id="permission_type" name="type" value="General">
                
            <div class="mt-4 space-y-4">
                <!-- Searchable User Selection -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">User *</label>
                    <div class="relative">
                        <div class="relative">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input type="text" id="user_search_input" 
                                   placeholder="Search by name or email..." 
                                   class="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                   autocomplete="off"
                                   required>
                            <button type="button" id="clear_user_search" class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hidden">
                                <i class="fas fa-times-circle text-sm"></i>
                            </button>
                        </div>
                        <div id="user_search_results" class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto hidden">
                            <!-- Search results will appear here -->
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Type at least 2 characters to search</p>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input type="date" id="permission_start_date" name="start_date" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                    <input type="date" id="permission_end_date" name="end_date" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                    <textarea id="permission_reason" name="reason" required rows="4" 
                              placeholder="Provide detailed reason for the request..." 
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"></textarea>
                </div>
            </div>
            
            <div class="flex justify-end gap-2 mt-5 pt-3 border-t">
                <button type="button" onclick="closeModal('permissionModal')" class="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">Submit Request</button>
            </div>
        </form>
    </div>
</div>

<script>
// Debounce function to limit API calls
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

// Search users function using your PermissionController
function searchUsers(searchTerm) {
    if (!searchTerm || searchTerm.length < 2) {
        document.getElementById('user_search_results').classList.add('hidden');
        return;
    }
    
    fetch(`/discipline/permission/search-users?q=${encodeURIComponent(searchTerm)}`, {
        headers: { 
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.users && data.users.length > 0) {
            displaySearchResults(data.users);
        } else {
            displayNoResults();
        }
    })
    .catch(error => {
        console.error('Error searching users:', error);
        displayNoResults();
    });
}

function displaySearchResults(users) {
    const resultsContainer = document.getElementById('user_search_results');
    resultsContainer.innerHTML = users.map(user => `
        <div class="user-search-item px-3 py-2 hover:bg-blue-50 cursor-pointer transition border-b border-gray-100 last:border-0" 
             data-user-id="${user.id}"
             data-user-name="${escapeHtml(user.name)}"
             data-user-email="${escapeHtml(user.email)}">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-user text-gray-500 text-sm"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-800">${escapeHtml(user.name)}</p>
                    <p class="text-xs text-gray-500">${escapeHtml(user.email)}</p>
                </div>
                <i class="fas fa-chevron-right text-gray-300 text-xs"></i>
            </div>
        </div>
    `).join('');
    
    resultsContainer.querySelectorAll('.user-search-item').forEach(item => {
        item.addEventListener('click', () => {
            const userId = item.dataset.userId;
            const userName = item.dataset.userName;
            selectUser(userId, userName);
        });
    });
    
    resultsContainer.classList.remove('hidden');
}

function displayNoResults() {
    const resultsContainer = document.getElementById('user_search_results');
    resultsContainer.innerHTML = `
        <div class="px-3 py-4 text-center text-gray-500 text-sm">
            <i class="fas fa-user-slash text-gray-300 mb-1"></i>
            <p>No users found</p>
            <p class="text-xs mt-1">Try a different name or email</p>
        </div>
    `;
    resultsContainer.classList.remove('hidden');
}

function selectUser(userId, userName) {
    // Set the hidden input value
    const userHiddenInput = document.getElementById('permission_user_id');
    userHiddenInput.value = userId;
    
    // Update the search input with selected user name
    const searchInput = document.getElementById('user_search_input');
    searchInput.value = userName;
    searchInput.dataset.selectedUserId = userId;
    
    // Remove required attribute from search input since user is selected
    searchInput.removeAttribute('required');
    
    // Hide results
    document.getElementById('user_search_results').classList.add('hidden');
    
    // Show clear button
    const clearBtn = document.getElementById('clear_user_search');
    clearBtn.classList.remove('hidden');
    
    // Remove red border if exists
    searchInput.classList.remove('border-red-500');
}

function clearUserSelection() {
    const searchInput = document.getElementById('user_search_input');
    const userHiddenInput = document.getElementById('permission_user_id');
    const clearBtn = document.getElementById('clear_user_search');
    
    searchInput.value = '';
    searchInput.dataset.selectedUserId = '';
    searchInput.setAttribute('required', 'required');
    userHiddenInput.value = '';
    clearBtn.classList.add('hidden');
    searchInput.focus();
}

function resetPermissionForm() {
    document.getElementById('permission_id').value = '';
    document.getElementById('user_search_input').value = '';
    document.getElementById('user_search_input').dataset.selectedUserId = '';
    document.getElementById('user_search_input').setAttribute('required', 'required');
    document.getElementById('permission_user_id').value = '';
    document.getElementById('permission_type').value = 'General';
    document.getElementById('permission_start_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('permission_end_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('permission_reason').value = '';
    document.getElementById('clear_user_search').classList.add('hidden');
    document.getElementById('user_search_results').classList.add('hidden');
}

function initPermissionModal() {
    const searchInput = document.getElementById('user_search_input');
    const debouncedSearch = debounce((e) => {
        searchUsers(e.target.value);
    }, 300);
    
    searchInput.removeEventListener('input', debouncedSearch);
    searchInput.addEventListener('input', debouncedSearch);
    
    document.getElementById('clear_user_search').onclick = clearUserSelection;
    
    document.addEventListener('click', function(e) {
        const resultsContainer = document.getElementById('user_search_results');
        const searchContainer = searchInput.closest('.relative');
        if (resultsContainer && !searchContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = this.value;
            if (searchTerm && searchTerm.length >= 2) {
                searchUsers(searchTerm);
            }
        }
    });
}

// Form submission
document.getElementById('permission-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const userId = document.getElementById('permission_user_id').value;
    const searchInput = document.getElementById('user_search_input');
    
    if (!userId) {
        searchInput.classList.add('border-red-500');
        searchInput.focus();
        disciplineAlert('Please select a valid user from the search results');
        return;
    }
    
    const formData = new FormData(this);
    const permissionId = document.getElementById('permission_id').value;
    
    let url = '/discipline/permission/store';
    
    if (permissionId) {
        url = `/discipline/permission/${permissionId}`;
        formData.append('_method', 'PUT');
    }
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';
    submitBtn.disabled = true;
    
    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('permissionModal');
            if (typeof filterPermissions === 'function') {
                filterPermissions();
            }
            resetPermissionForm();
        } else {
            disciplineAlert('Error: ' + (data.message || 'Failed to submit request'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        disciplineAlert('Error submitting request');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
});

window.openPermissionModal = function(permissionId = null) {
    initPermissionModal();
    
    if (permissionId) {
        fetch(`/discipline/permission/${permissionId}/edit`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('permission_modal_title').textContent = 'Edit Permission Request';
                document.getElementById('permission_id').value = data.permission.id;
                
                document.getElementById('permission_user_id').value = data.permission.user_id;
                document.getElementById('user_search_input').value = data.permission.user_name;
                document.getElementById('user_search_input').removeAttribute('required');
                document.getElementById('clear_user_search').classList.remove('hidden');
                
                document.getElementById('permission_type').value = data.permission.type || 'General';
                document.getElementById('permission_start_date').value = data.permission.start_date;
                document.getElementById('permission_end_date').value = data.permission.end_date;
                document.getElementById('permission_reason').value = data.permission.reason;
                document.getElementById('permissionModal').classList.remove('hidden');
            }
        });
    } else {
        document.getElementById('permission_modal_title').textContent = 'New Permission Request';
        resetPermissionForm();
        document.getElementById('permissionModal').classList.remove('hidden');
    }
};

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
</script>

