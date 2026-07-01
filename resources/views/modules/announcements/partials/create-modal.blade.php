<div id="createAnnouncementModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-0 border w-full max-w-3xl shadow-2xl rounded-xl bg-white">
        <!-- Header -->
        <div class="flex justify-between items-center px-6 py-4 border-b bg-gray-50 rounded-t-xl">
            <div class="flex items-center gap-3">
                <i class="fas fa-pen text-blue-600 text-lg"></i>
                <h3 class="text-lg font-semibold text-gray-800">New Message</h3>
            </div>
            <button onclick="closeCreateModal()" class="text-gray-400 hover:text-gray-600 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form id="createAnnouncementForm" onsubmit="submitCreateAnnouncement(event)" class="p-6">
            @csrf
            
            <!-- To Field -->
            <div class="mb-2">
                <div class="flex items-start border-b border-gray-200 pb-2">
                    <span class="text-sm font-medium text-gray-600 w-12 pt-1.5">To</span>
                    <div class="flex-1">
                        <div class="flex flex-wrap items-center gap-1" id="recipientChips">
                            <select id="recipientSelect" class="border-0 bg-transparent text-sm focus:ring-0 py-1.5 px-1 text-gray-800 font-medium">
                                <option value="all">All Users</option>
                                <option value="roles">Select Roles...</option>
                                <option value="users">Select Users...</option>
                            </select>
                        </div>
                    </div>
                    <span class="text-xs text-gray-400" id="recipientCount"></span>
                </div>
            </div>
            
            <!-- Role Selection Chips -->
            <div id="roleSelector" class="hidden mb-3">
                <div class="ml-12">
                    <div class="flex flex-wrap gap-1.5 mb-2" id="selectedRolesBadges"></div>
                    <select id="roleDropdown" class="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500">
                        <option value="">+ Add roles...</option>
                    </select>
                </div>
            </div>
            
            <!-- User Selection -->
            <div id="userSelector" class="hidden mb-3">
                <div class="ml-12">
                    <div class="flex flex-wrap gap-1.5 mb-2" id="selectedUsersBadges"></div>
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input type="text" id="userSearchInput" 
                               placeholder="Search by name or email..." 
                               class="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div id="userResultsList" class="max-h-40 overflow-y-auto mt-2 hidden border rounded-lg bg-white divide-y divide-gray-100 shadow-lg"></div>
                    <p class="text-xs text-gray-500 mt-1.5" id="selectedUsersCount">0 user(s) selected</p>
                </div>
            </div>
            
            <!-- Subject -->
            <div class="mb-2">
                <div class="flex items-start border-b border-gray-200 pb-2">
                    <span class="text-sm font-medium text-gray-600 w-12 pt-1.5">Subject</span>
                    <input type="text" id="announcementTitle" name="title" required 
                           placeholder="Enter subject..." 
                           class="flex-1 border-0 focus:ring-0 text-sm py-1.5 px-1 text-gray-800 placeholder-gray-400">
                </div>
            </div>
            
            <!-- Message Body -->
            <div class="mb-3 mt-1">
                <div class="flex">
                    <span class="text-sm font-medium text-gray-600 w-12 pt-1"></span>
                    <div class="flex-1">
                        <textarea id="announcementContent" name="content" rows="8" required 
                                  placeholder="Write your message here..." 
                                  class="w-full px-1 py-2 border-0 focus:ring-0 text-sm text-gray-700 resize-none placeholder-gray-400"></textarea>
                    </div>
                </div>
            </div>
            
            <!-- Editor Toolbar (Simple) -->
            <div class="border-t border-gray-200 pt-3 flex items-center justify-between">
                <p class="text-xs text-gray-500">
                    <i class="fas fa-lock mr-1"></i> One-way announcement â€” replies are not monitored.
                </p>
                
                <div class="flex items-center gap-2">
                    <button type="button" onclick="closeCreateModal()" class="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">
                        Discard
                    </button>
                    <button type="submit" class="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-2 transition shadow-sm">
                        <i class="fas fa-paper-plane text-xs"></i> Send
                    </button>
                </div>
            </div>
            
        </form>
    </div>
</div>

<script>
// Global variables
let allRoles = [];
let allUsers = [];
let selectedRoles = new Set();
let selectedUsers = new Set();
let rolesLoaded = false;
let usersLoaded = false;

// Load roles from server
async function loadRoles() {
    if (rolesLoaded) return;
    
    try {
        const response = await fetch('/announcements/roles', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const data = await response.json();
        
        if (data.success) {
            allRoles = data.roles;
            const roleDropdown = document.getElementById('roleDropdown');
            if (roleDropdown) {
                roleDropdown.innerHTML = '<option value="">+ Add roles...</option>';
                allRoles.forEach(role => {
                    roleDropdown.innerHTML += `<option value="${role.id}">${escapeHtml(role.display_name)}</option>`;
                });
            }
            rolesLoaded = true;
        }
    } catch (error) {
        console.error('Error loading roles:', error);
    }
}

// Load users from server
async function loadUsers() {
    if (usersLoaded) return;
    
    try {
        const response = await fetch('/announcements/users', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const data = await response.json();
        
        if (data.success) {
            allUsers = data.users;
            usersLoaded = true;
            renderUserList([]);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Render user list
function renderUserList(users) {
    const resultsContainer = document.getElementById('userResultsList');
    if (!resultsContainer) return;
    
    if (users.length === 0) {
        resultsContainer.classList.add('hidden');
        return;
    }
    
    resultsContainer.classList.remove('hidden');
    resultsContainer.innerHTML = users.map(user => `
        <div class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer transition" onclick="toggleUserSelection(${user.id})">
            <div class="flex-1">
                <div class="text-sm font-medium text-gray-800">${escapeHtml(user.name)}</div>
                <div class="text-xs text-gray-500">${escapeHtml(user.email)}</div>
            </div>
            ${selectedUsers.has(user.id) ? '<i class="fas fa-check-circle text-blue-600"></i>' : '<i class="far fa-circle text-gray-300"></i>'}
        </div>
    `).join('');
}

// Filter users
function filterUsers(searchTerm) {
    if (!allUsers.length) return [];
    const term = searchTerm.toLowerCase();
    return allUsers.filter(user => 
        user.name.toLowerCase().includes(term) || 
        user.email.toLowerCase().includes(term)
    );
}

// User search
function onUserSearch() {
    const searchInput = document.getElementById('userSearchInput');
    if (!searchInput) return;
    const filteredUsers = filterUsers(searchInput.value);
    renderUserList(filteredUsers);
}

// Toggle user selection
function toggleUserSelection(userId) {
    if (selectedUsers.has(userId)) {
        selectedUsers.delete(userId);
    } else {
        selectedUsers.add(userId);
    }
    updateUserBadges();
    const searchTerm = document.getElementById('userSearchInput')?.value || '';
    renderUserList(filterUsers(searchTerm));
}

// Remove user
function removeUser(userId) {
    selectedUsers.delete(userId);
    updateUserBadges();
    const searchTerm = document.getElementById('userSearchInput')?.value || '';
    renderUserList(filterUsers(searchTerm));
}

// Update user badges
function updateUserBadges() {
    const container = document.getElementById('selectedUsersBadges');
    const countSpan = document.getElementById('selectedUsersCount');
    
    if (!container) return;
    
    if (selectedUsers.size === 0) {
        container.innerHTML = '';
        if (countSpan) countSpan.innerText = '0 user(s) selected';
        return;
    }
    
    const selectedUsersList = allUsers.filter(u => selectedUsers.has(u.id));
    container.innerHTML = selectedUsersList.map(user => `
        <span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs border border-blue-200">
            ${escapeHtml(user.name)} 
            <button type="button" onclick="removeUser(${user.id})" class="hover:text-red-600 ml-0.5">&times;</button>
        </span>
    `).join('');
    
    if (countSpan) countSpan.innerText = `${selectedUsers.size} user(s) selected`;
}

// Role selection
function onRoleSelect() {
    const roleDropdown = document.getElementById('roleDropdown');
    if (!roleDropdown) return;
    
    const roleId = parseInt(roleDropdown.value);
    if (roleId && !selectedRoles.has(roleId)) {
        const role = allRoles.find(r => r.id === roleId);
        if (role) {
            selectedRoles.add(roleId);
            updateRoleBadges();
            updateRecipientChips();
        }
    }
    roleDropdown.value = '';
}

// Remove role
function removeRole(roleId) {
    selectedRoles.delete(roleId);
    updateRoleBadges();
    updateRecipientChips();
}

// Update role badges
function updateRoleBadges() {
    const container = document.getElementById('selectedRolesBadges');
    if (!container) return;
    
    if (selectedRoles.size === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = Array.from(selectedRoles).map(id => {
        const role = allRoles.find(r => r.id === id);
        if (!role) return '';
        return `
            <span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs border border-blue-200">
                ${escapeHtml(role.display_name)} 
                <button type="button" onclick="removeRole(${id})" class="hover:text-red-600 ml-0.5">&times;</button>
            </span>
        `;
    }).join('');
}

// Update recipient chips in To field
function updateRecipientChips() {
    const container = document.getElementById('recipientChips');
    const countSpan = document.getElementById('recipientCount');
    const select = document.getElementById('recipientSelect');
    
    if (!container) return;
    
    // Clear existing chips
    container.querySelectorAll('.recipient-chip').forEach(el => el.remove());
    
    const targetType = select.value;
    let count = 0;
    
    if (targetType === 'roles') {
        count = selectedRoles.size;
        selectedRoles.forEach(id => {
            const role = allRoles.find(r => r.id === id);
            if (role) {
                const chip = document.createElement('span');
                chip.className = 'recipient-chip inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs border border-blue-200 ml-1';
                chip.innerHTML = `${escapeHtml(role.display_name)} <button type="button" onclick="removeRole(${id})" class="hover:text-red-600">&times;</button>`;
                container.insertBefore(chip, select);
            }
        });
        if (countSpan) countSpan.textContent = `(${count} role${count !== 1 ? 's' : ''})`;
    } else if (targetType === 'users') {
        count = selectedUsers.size;
        selectedUsers.forEach(id => {
            const user = allUsers.find(u => u.id === id);
            if (user) {
                const chip = document.createElement('span');
                chip.className = 'recipient-chip inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs border border-blue-200 ml-1';
                chip.innerHTML = `${escapeHtml(user.name)} <button type="button" onclick="removeUser(${id})" class="hover:text-red-600">&times;</button>`;
                container.insertBefore(chip, select);
            }
        });
        if (countSpan) countSpan.textContent = `(${count} user${count !== 1 ? 's' : ''})`;
    } else {
        if (countSpan) countSpan.textContent = '';
    }
}

// Recipient select change
function onRecipientChange() {
    const select = document.getElementById('recipientSelect');
    if (!select) return;
    
    const value = select.value;
    const roleSelector = document.getElementById('roleSelector');
    const userSelector = document.getElementById('userSelector');
    
    if (roleSelector) roleSelector.classList.add('hidden');
    if (userSelector) userSelector.classList.add('hidden');
    
    if (value === 'roles') {
        if (roleSelector) roleSelector.classList.remove('hidden');
        loadRoles();
    } else if (value === 'users') {
        if (userSelector) userSelector.classList.remove('hidden');
        loadUsers();
    }
    
    updateRecipientChips();
}

// Status change
function onStatusChange() {
    const statusSelect = document.getElementById('announcementStatus');
    const schedulePicker = document.getElementById('schedulePicker');
    
    if (statusSelect && schedulePicker) {
        schedulePicker.classList.toggle('hidden', statusSelect.value !== 'scheduled');
    }
}

// More options toggle
function toggleMoreOptions() {
    const container = document.getElementById('moreOptions');
    if (container) {
        container.classList.toggle('hidden');
    }
}

// Save as draft
function saveAsDraft() {
    document.getElementById('announcementStatus').value = 'draft';
    document.getElementById('createAnnouncementForm').dispatchEvent(new Event('submit'));
}

// Close modal
function closeCreateModal() {
    const modal = document.getElementById('createAnnouncementModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Reset form
function resetCreateForm() {
    selectedRoles.clear();
    selectedUsers.clear();
    
    const recipientSelect = document.getElementById('recipientSelect');
    if (recipientSelect) recipientSelect.value = 'all';
    
    const roleSelector = document.getElementById('roleSelector');
    const userSelector = document.getElementById('userSelector');
    if (roleSelector) roleSelector.classList.add('hidden');
    if (userSelector) userSelector.classList.add('hidden');
    
    const moreOptions = document.getElementById('moreOptions');
    if (moreOptions) moreOptions.classList.add('hidden');
    
    const schedulePicker = document.getElementById('schedulePicker');
    if (schedulePicker) schedulePicker.classList.add('hidden');
    
    const statusSelect = document.getElementById('announcementStatus');
    if (statusSelect) statusSelect.value = 'active';
    
    const sendEmail = document.getElementById('sendEmail');
    if (sendEmail) sendEmail.checked = true;
    
    const titleInput = document.getElementById('announcementTitle');
    if (titleInput) titleInput.value = '';
    
    const contentTextarea = document.getElementById('announcementContent');
    if (contentTextarea) contentTextarea.value = '';
    
    const scheduledDateTime = document.getElementById('scheduledDateTime');
    if (scheduledDateTime) scheduledDateTime.value = '';
    
    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) userSearchInput.value = '';
    
    updateRoleBadges();
    updateUserBadges();
    updateRecipientChips();
}

// Open modal
function openCreateModal() {
    resetCreateForm();
    const modal = document.getElementById('createAnnouncementModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    loadRoles();
    loadUsers();
}

// Submit form
async function submitCreateAnnouncement(event) {
    event.preventDefault();
    
    const title = document.getElementById('announcementTitle')?.value;
    const content = document.getElementById('announcementContent')?.value;
    
    if (!title || !content) {
        appAlert('Please fill in both subject and message');
        return;
    }
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    
    const targetType = document.getElementById('recipientSelect')?.value || 'all';
    formData.append('target_type', targetType);
    
    if (targetType === 'roles') {
        if (selectedRoles.size === 0) {
            appAlert('Please select at least one role');
            return;
        }
        formData.append('target_roles', JSON.stringify(Array.from(selectedRoles)));
    } else if (targetType === 'users') {
        if (selectedUsers.size === 0) {
            appAlert('Please select at least one user');
            return;
        }
        formData.append('target_users', JSON.stringify(Array.from(selectedUsers)));
    }
    
    
    const submitBtn = event.submitter;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/announcements/store', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeCreateModal();
            if (typeof window.refreshAnnouncementsList === 'function') {
                window.refreshAnnouncementsList();
            }
            if (typeof window.refreshOverviewStats === 'function') {
                window.refreshOverviewStats();
            }
            appAlert(data.message || 'Message sent successfully!');
            resetCreateForm();
        } else {
            appAlert('Error: ' + (data.message || 'Failed to send message'));
        }
    } catch (error) {
        console.error('Error:', error);
        appAlert('Network error. Please try again.');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    const recipientSelect = document.getElementById('recipientSelect');
    if (recipientSelect) {
        recipientSelect.addEventListener('change', onRecipientChange);
    }
    
    const roleDropdown = document.getElementById('roleDropdown');
    if (roleDropdown) {
        roleDropdown.addEventListener('change', onRoleSelect);
    }
    
    const statusSelect = document.getElementById('announcementStatus');
    if (statusSelect) {
        statusSelect.addEventListener('change', onStatusChange);
    }
    
    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', onUserSearch);
    }
});

// Make functions global
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.submitCreateAnnouncement = submitCreateAnnouncement;
window.toggleMoreOptions = toggleMoreOptions;
window.removeRole = removeRole;
window.removeUser = removeUser;
window.toggleUserSelection = toggleUserSelection;
window.saveAsDraft = saveAsDraft;
</script>

