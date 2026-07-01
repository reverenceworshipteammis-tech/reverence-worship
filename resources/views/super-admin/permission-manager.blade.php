@extends('layouts.app')

@section('title', 'Permission Manager')

@section('content')
<div class="permission-manager max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5">
        <div>
            <div class="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-2">
                <i class="fas fa-shield-alt"></i>
                Access control
            </div>
           
        </div>
        <button onclick="openRoleModal()" class="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition">
            <i class="fas fa-plus"></i>
            New Role
        </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-xs font-semibold text-gray-500 uppercase">Roles</p>
                    <p class="text-2xl font-bold text-gray-900 mt-1">{{ $roles->count() }}</p>
                </div>
                <span class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <i class="fas fa-user-tag"></i>
                </span>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 gap-5">
        <section class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div class="flex items-center justify-between gap-3">
                    <div>
                        <h2 class="font-bold text-gray-900">Roles</h2>
                        <p class="text-xs text-gray-500">Choose a role to edit permissions</p>
                    </div>
                    <span class="text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-1">{{ $roles->count() }} total</span>
                </div>
                <div class="relative mt-3">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input type="search" id="roleSearch" placeholder="Search roles..." class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
            </div>

            <div class="p-3">
                <div id="rolesList" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[65vh] overflow-y-auto pr-1">
                    @forelse($roles as $role)
                        @php
                            $assignedCount = collect($allAssignments[$role->id] ?? [])->count();
                        @endphp
                        <article class="role-card border border-gray-200 rounded-lg p-3 hover:border-blue-200 hover:bg-blue-50/30 transition" data-role-name="{{ strtolower($role->display_name . ' ' . $role->name . ' ' . $role->description) }}">
                            <div class="flex items-start gap-3">
                                <div class="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                                    <i class="fas fa-user-shield"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="min-w-0">
                                            <h3 class="font-semibold text-gray-900 truncate">{{ $role->display_name }}</h3>
                                            <p class="text-xs text-gray-500 truncate">{{ $role->name }}</p>
                                        </div>
                                        <div class="flex items-center gap-1 shrink-0">
                                            <button onclick="editRole({{ $role->id }})" class="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-100 transition" title="Edit role">
                                                <i class="fas fa-edit text-sm"></i>
                                            </button>
                                            @if($role->name !== 'super-admin')
                                                <button onclick="deleteRole({{ $role->id }}, @js($role->display_name))" class="w-8 h-8 rounded-lg text-red-600 hover:bg-red-100 transition" title="Delete role">
                                                    <i class="fas fa-trash text-sm"></i>
                                                </button>
                                            @endif
                                        </div>
                                    </div>
                                    @if($role->description)
                                        <p class="text-xs text-gray-500 mt-2 line-clamp-2">{{ $role->description }}</p>
                                    @endif
                                    <div class="flex flex-wrap items-center gap-2 mt-3">
                                        <span class="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                                            <i class="fas fa-users text-gray-400"></i>
                                            {{ $role->users_count }} users
                                        </span>
                                        <span class="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                                            <i class="fas fa-key text-gray-400"></i>
                                            {{ $assignedCount }} permissions
                                        </span>
                                    </div>
                                    <button onclick="assignPermissionsToRole({{ $role->id }}, @js($role->display_name))" class="mt-3 w-full inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-semibold transition">
                                        <i class="fas fa-sliders-h"></i>
                                        Manage Permissions
                                    </button>
                                </div>
                            </div>
                        </article>
                    @empty
                        <div class="text-center py-10 text-gray-400 text-sm">
                            <i class="fas fa-user-tag text-3xl mb-3 block"></i>
                            No roles created yet
                        </div>
                    @endforelse
                </div>
                <div id="emptyRoleSearch" class="hidden text-center py-10 text-gray-400 text-sm">
                    <i class="fas fa-search text-3xl mb-3 block"></i>
                    No matching roles found
                </div>
            </div>
        </section>

    </div>
</div>

<!-- Role Modal -->
<div id="roleModal" class="fixed inset-0 bg-gray-900/60 z-[9999] hidden items-center justify-center p-3 sm:p-4">
    <div class="bg-white rounded-lg w-full max-w-md shadow-xl">
        <div class="flex justify-between items-center px-5 py-4 border-b border-gray-200">
            <h3 id="roleModalTitle" class="text-base font-bold text-gray-900">Create New Role</h3>
            <button onclick="closeModal('roleModal')" class="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">&times;</button>
        </div>
        <form id="roleForm" class="p-5">
            @csrf
            <input type="hidden" name="_method" id="roleMethod" value="POST">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Role Name *</label>
                    <input type="text" name="name" id="roleName" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <p class="text-xs text-gray-400 mt-1">Use lowercase words, for example: finance-manager.</p>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Display Name *</label>
                    <input type="text" name="display_name" id="roleDisplayName" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                    <textarea name="description" id="roleDescription" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                </div>
            </div>
            <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
                <button type="button" onclick="closeModal('roleModal')" class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">Save Role</button>
            </div>
        </form>
    </div>
</div>

<!-- Assign Permissions Modal -->
<div id="assignPermissionsModal" class="fixed inset-0 bg-gray-900/60 z-[9999] hidden items-center justify-center p-3 sm:p-4">
    <div class="bg-white rounded-lg w-full max-w-3xl shadow-xl max-h-[84vh] flex flex-col">
        <div class="flex justify-between items-start gap-4 px-4 py-3 border-b border-gray-200">
            <div class="min-w-0">
                <h3 id="assignModalTitle" class="text-base sm:text-lg font-bold text-gray-900 truncate">Assign Permissions</h3>
                <p class="text-xs text-gray-500 mt-1">Select the pages and actions this role can use.</p>
            </div>
            <button onclick="closeModal('assignPermissionsModal')" class="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0">&times;</button>
        </div>
        <div class="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <div class="relative">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input type="search" id="permissionSearch" placeholder="Search pages or actions..." class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            </div>
        </div>
        <div id="assignPermissionsContent" class="p-3 sm:p-4 overflow-y-auto"></div>
        <div class="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2 px-4 py-3 border-t border-gray-200 bg-white">
            <p id="selectedPermissionCount" class="text-xs text-gray-500">0 permissions selected</p>
            <div class="flex flex-col sm:flex-row gap-2">
                <button onclick="closeModal('assignPermissionsModal')" class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button id="saveRolePermissionsBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">Save Permissions</button>
            </div>
        </div>
    </div>
</div>

<style>
    .permission-card-hidden {
        display: none;
    }

    @media (max-width: 640px) {
        .permission-manager {
            padding-top: 0.75rem;
        }

        #rolesList {
            max-height: none;
        }
    }
</style>

<script>
let currentEditingRoleId = null;
let currentEditingRoleName = null;
let pagesData = @json($pages);
let featuresData = @json($allFeatures);
let roleAssignments = @json($allAssignments);

const featureIconMap = {
    view: ['fa-file-lines', 'text-emerald-600', 'bg-emerald-50'],
    create: ['fa-plus-circle', 'text-blue-600', 'bg-blue-50'],
    edit: ['fa-edit', 'text-amber-600', 'bg-amber-50'],
    delete: ['fa-trash-alt', 'text-red-600', 'bg-red-50']
};

function openRoleModal() {
    document.getElementById('roleModalTitle').innerText = 'Create New Role';
    document.getElementById('roleForm').action = '/permission-manager/role/store';
    document.getElementById('roleMethod').value = 'POST';
    document.getElementById('roleName').value = '';
    document.getElementById('roleDisplayName').value = '';
    document.getElementById('roleDescription').value = '';
    openModal('roleModal');
}

function editRole(id) {
    fetch(`/permission-manager/role/${id}/edit`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('roleModalTitle').innerText = 'Edit Role';
            document.getElementById('roleForm').action = `/permission-manager/role/${id}`;
            document.getElementById('roleMethod').value = 'PUT';
            document.getElementById('roleName').value = data.name;
            document.getElementById('roleDisplayName').value = data.display_name;
            document.getElementById('roleDescription').value = data.description || '';
            openModal('roleModal');
        })
        .catch(error => console.error('Error:', error));
}

async function deleteRole(id, name) {
    if (await appConfirm(`Delete role "${name}"? This will remove all permissions for this role.`)) {
        fetch(`/permission-manager/role/${id}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            }
        }).then(() => location.reload());
    }
}

function assignPermissionsToRole(roleId, roleName) {
    currentEditingRoleId = roleId;
    currentEditingRoleName = roleName;

    document.getElementById('assignModalTitle').textContent = `Assign Permissions to ${roleName}`;
    document.getElementById('permissionSearch').value = '';

    const assignedFeatures = roleAssignments[roleId] || [];
    const assignedFeatureIds = assignedFeatures.map(a => parseInt(a.feature_id));
    const featureOrder = { view: 1, create: 2, edit: 3, delete: 4 };

    let html = '<div id="permissionCards" class="grid grid-cols-1 md:grid-cols-2 gap-2.5">';

    pagesData.forEach(page => {
        const pageFeatures = featuresData
            .filter(f => parseInt(f.page_id) === parseInt(page.id))
            .sort((a, b) => (featureOrder[a.name] || 5) - (featureOrder[b.name] || 5));

        if (pageFeatures.length === 0) return;

        const allAssigned = pageFeatures.every(f => assignedFeatureIds.includes(parseInt(f.id)));
        const searchText = `${page.display_name} ${page.name} ${pageFeatures.map(f => `${f.display_name} ${f.name}`).join(' ')}`.toLowerCase();

        html += `
            <section class="permission-page-card border border-gray-200 rounded-lg overflow-hidden" data-search="${escapeAttribute(searchText)}">
                <div class="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                    <span class="w-8 h-8 rounded-lg bg-white border border-gray-200 text-blue-600 flex items-center justify-center shrink-0">
                        <i class="fas ${page.icon || 'fa-layer-group'}"></i>
                    </span>
                    <div class="min-w-0 flex-1">
                        <h4 class="font-semibold text-sm text-gray-900 truncate">${escapeHtml(page.display_name)}</h4>
                        <p class="text-xs text-gray-500">${pageFeatures.length} actions</p>
                    </div>
                    <label class="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer shrink-0">
                        <input type="checkbox" class="select-all-page rounded border-gray-300" data-page-id="${page.id}" ${allAssigned ? 'checked' : ''}>
                        All
                    </label>
                </div>
                <div class="grid grid-cols-1 gap-1.5 p-2.5">
        `;

        pageFeatures.forEach(feature => {
            const isChecked = assignedFeatureIds.includes(parseInt(feature.id));
            const [icon, color, bg] = featureIconMap[feature.name] || ['fa-tag', 'text-gray-600', 'bg-gray-50'];

            html += `
                <label class="flex items-center gap-2 text-sm cursor-pointer px-2 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
                    <input type="checkbox" class="feature-checkbox rounded border-gray-300" data-feature-id="${feature.id}" data-page-id="${page.id}" ${isChecked ? 'checked' : ''}>
                    <span class="w-6 h-6 rounded-md ${bg} ${color} flex items-center justify-center shrink-0">
                        <i class="fas ${icon} text-xs"></i>
                    </span>
                    <span class="min-w-0 truncate">${escapeHtml(feature.display_name)}</span>
                </label>
            `;
        });

        html += `
                </div>
            </section>
        `;
    });

    html += '</div>';

    document.getElementById('assignPermissionsContent').innerHTML = html;
    bindPermissionControls();
    updateSelectedPermissionCount();
    openModal('assignPermissionsModal');
}

function bindPermissionControls() {
    document.querySelectorAll('.select-all-page').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const pageId = this.dataset.pageId;
            document.querySelectorAll(`.feature-checkbox[data-page-id="${pageId}"]`).forEach(cb => cb.checked = this.checked);
            updateSelectedPermissionCount();
        });
    });

    document.querySelectorAll('.feature-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const pageId = this.dataset.pageId;
            const pageCheckboxes = [...document.querySelectorAll(`.feature-checkbox[data-page-id="${pageId}"]`)];
            const selectAll = document.querySelector(`.select-all-page[data-page-id="${pageId}"]`);
            if (selectAll) selectAll.checked = pageCheckboxes.every(cb => cb.checked);
            updateSelectedPermissionCount();
        });
    });
}

function updateSelectedPermissionCount() {
    const count = document.querySelectorAll('.feature-checkbox:checked').length;
    document.getElementById('selectedPermissionCount').textContent = `${count} permission${count === 1 ? '' : 's'} selected`;
}

document.getElementById('saveRolePermissionsBtn').addEventListener('click', function() {
    if (!currentEditingRoleId) return;

    const assignments = [];
    document.querySelectorAll('.feature-checkbox:checked').forEach(cb => {
        assignments.push({
            page_id: parseInt(cb.dataset.pageId),
            feature_id: parseInt(cb.dataset.featureId)
        });
    });

    fetch('/permission-manager/save-assignments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({
            role_id: currentEditingRoleId,
            assignments: assignments
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            appAlert(`Permissions saved for "${currentEditingRoleName}" successfully!`);
            closeModal('assignPermissionsModal');
            location.reload();
        } else {
            appAlert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Network error. Please try again.');
    });
});

document.getElementById('roleForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            appAlert(data.message);
            location.reload();
        } else {
            appAlert('Error: ' + data.message);
        }
    })
    .catch(error => appAlert('Error: ' + error.message));
});

document.getElementById('roleSearch')?.addEventListener('input', function() {
    const term = this.value.trim().toLowerCase();
    let visible = 0;

    document.querySelectorAll('.role-card').forEach(card => {
        const match = !term || card.dataset.roleName.includes(term);
        card.classList.toggle('hidden', !match);
        if (match) visible++;
    });

    document.getElementById('emptyRoleSearch').classList.toggle('hidden', visible > 0);
});

document.getElementById('permissionSearch')?.addEventListener('input', function() {
    const term = this.value.trim().toLowerCase();
    document.querySelectorAll('.permission-page-card').forEach(card => {
        card.classList.toggle('permission-card-hidden', term && !card.dataset.search.includes(term));
    });
});

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        ['roleModal', 'assignPermissionsModal'].forEach(closeModal);
    }
});
</script>
@endsection

