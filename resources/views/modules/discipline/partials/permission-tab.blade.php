<div class="space-y-6">
    @php
        $canCreate = auth()->check() && auth()->user()->canAccess('discipline', 'create');
        $canApprove = auth()->check() && auth()->user()->canAccess('discipline', 'approve-permission');
        $canReject = auth()->check() && auth()->user()->canAccess('discipline', 'reject-permission');
        $canDelete = auth()->check() && auth()->user()->canAccess('discipline', 'delete');
        $canView = auth()->check() && auth()->user()->canAccess('discipline', 'view-permissions');
    @endphp

    <!-- Header -->
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
            <h3 class="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Permission Management</h3>
        </div>
        @if($canCreate)
        <button onclick="openPermissionModal()" class="inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-200 transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg">
            <i class="fas fa-plus-circle"></i> New Request
        </button>
        @endif
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="rounded-xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-blue-50/40 p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight" id="total_requests">0</p>
                    <p class="text-xs text-gray-500">Total Requests</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center ring-1 ring-sky-200">
                    <i class="fas fa-envelope text-sky-700"></i>
                </div>
            </div>
        </div>
        
        <div class="rounded-xl border border-amber-100 bg-gradient-to-br from-white via-amber-50 to-yellow-50/50 p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl font-bold text-amber-600" id="pending_requests">0</p>
                    <p class="text-xs text-gray-500">Pending</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center ring-1 ring-amber-200">
                    <i class="fas fa-clock text-amber-700"></i>
                </div>
            </div>
        </div>
        
        <div class="rounded-xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50/40 p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl font-bold text-emerald-600" id="approved_requests">0</p>
                    <p class="text-xs text-gray-500">Approved</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center ring-1 ring-emerald-200">
                    <i class="fas fa-check-circle text-emerald-700"></i>
                </div>
            </div>
        </div>
        
        <div class="rounded-xl border border-rose-100 bg-gradient-to-br from-white via-rose-50 to-red-50/40 p-4 shadow-sm">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl font-bold text-rose-600" id="rejected_requests">0</p>
                    <p class="text-xs text-gray-500">Rejected</p>
                </div>
                <div class="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center ring-1 ring-rose-200">
                    <i class="fas fa-times-circle text-rose-700"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- Filters - Only show if user can view -->
    @if($canView)
    <div class="flex flex-wrap gap-3 items-end rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div class="flex-1 min-w-[220px]">
            <label class="block text-xs text-gray-600 mb-1">Search</label>
            <div class="relative">
                <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm"></i>
                <input type="text" id="permission_search" placeholder="Search by name or reason..." 
                       class="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
            </div>
        </div>
        <div class="w-40">
            <label class="block text-xs text-gray-600 mb-1">Status</label>
            <select id="permission_status_filter" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
            </select>
        </div>
        <div class="w-40">
            <label class="block text-xs text-gray-600 mb-1">From</label>
            <input type="date" id="permission_from_date" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
        </div>
        <div class="w-40">
            <label class="block text-xs text-gray-600 mb-1">To</label>
            <input type="date" id="permission_to_date" class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
        </div>
        <button onclick="filterPermissions()" class="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200">
            <i class="fas fa-search mr-1"></i> Filter
        </button>
        <button onclick="exportPermissions()" class="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
            <i class="fas fa-file-export mr-1"></i> Export
        </button>
    </div>
    @endif

    <!-- Permissions List -->
    <div id="permissions-list" class="space-y-3">
        <div class="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white py-12 text-center">
            <i class="fas fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
            <p class="text-gray-500">Loading requests...</p>
        </div>
    </div>
    <div id="permissions-pagination" class="mt-5 flex items-center justify-between gap-3"></div>
</div>

<script>
// Make functions available globally
window.openPermissionModal = openPermissionModal;
window.filterPermissions = filterPermissions;
window.exportPermissions = exportPermissions;
window.approvePermission = approvePermission;
window.rejectPermission = rejectPermission;
window.deletePermission = deletePermission;

let currentPermissions = [];
let currentPermissionPage = 1;
let currentPermissionPagination = { current_page: 1, total_pages: 1, has_prev: false, has_next: false, total: 0, per_page: 10 };

@php
    $canCreate = auth()->check() && auth()->user()->canAccess('discipline', 'create');
    $canApprove = auth()->check() && auth()->user()->canAccess('discipline', 'approve-permission');
    $canReject = auth()->check() && auth()->user()->canAccess('discipline', 'reject-permission');
    $canDelete = auth()->check() && auth()->user()->canAccess('discipline', 'delete');
    $canView = auth()->check() && auth()->user()->canAccess('discipline', 'view-permissions');
@endphp

function openPermissionModal(permissionId = null) {
    @if(!$canCreate)
        disciplineAlert('You do not have permission to create permission requests.');
        return;
    @endif
    
    const modal = document.getElementById('permissionModal');
    if (!modal) {
        disciplineAlert('Form not ready. Please refresh.');
        return;
    }
    
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
                document.getElementById('permission_start_date').value = data.permission.start_date;
                document.getElementById('permission_end_date').value = data.permission.end_date;
                document.getElementById('permission_reason').value = data.permission.reason;
                modal.classList.remove('hidden');
            }
        });
    } else {
        document.getElementById('permission_modal_title').textContent = 'New Permission Request';
        document.getElementById('permission_id').value = '';
        document.getElementById('permission_user_id').value = '';
        document.getElementById('permission_start_date').value = new Date().toISOString().split('T')[0];
        document.getElementById('permission_end_date').value = new Date().toISOString().split('T')[0];
        document.getElementById('permission_reason').value = '';
        modal.classList.remove('hidden');
    }
}

function filterPermissions(page = 1) {
    @if(!$canView)
        disciplineAlert('You do not have permission to view permission requests.');
        return;
    @endif
    
    currentPermissionPage = page;
    const status = document.getElementById('permission_status_filter')?.value || 'all';
    const search = document.getElementById('permission_search')?.value || '';
    const fromDate = document.getElementById('permission_from_date')?.value || '';
    const toDate = document.getElementById('permission_to_date')?.value || '';
    const perPage = 10;
    
    let url = `/discipline/permission?status=${encodeURIComponent(status)}&page=${page}&per_page=${perPage}`;
    if (search) {
        url += `&search=${encodeURIComponent(search)}`;
    }
    if (fromDate) {
        url += `&from_date=${encodeURIComponent(fromDate)}`;
    }
    if (toDate) {
        url += `&to_date=${encodeURIComponent(toDate)}`;
    }
    
    fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentPermissions = data.permissions || [];
            currentPermissionPagination = data.pagination || currentPermissionPagination;
            renderPermissionsList(currentPermissions);
            updateStats(data.stats || currentPermissions);
            renderPagination(currentPermissionPagination);
        }
    })
    .catch(error => console.error('Error loading permissions:', error));
}

function exportPermissions() {
    @if(!$canView)
        disciplineAlert('You do not have permission to export permission requests.');
        return;
    @endif

    const status = document.getElementById('permission_status_filter')?.value || 'all';
    const search = document.getElementById('permission_search')?.value || '';
    const fromDate = document.getElementById('permission_from_date')?.value || '';
    const toDate = document.getElementById('permission_to_date')?.value || '';

    const params = new URLSearchParams({
        type: 'permission'
    });

    if (status && status !== 'all') {
        params.set('status', status);
    }
    if (search) {
        params.set('search', search);
    }
    if (fromDate) {
        params.set('from_date', fromDate);
    }
    if (toDate) {
        params.set('to_date', toDate);
    }

    window.location.href = `/discipline/reports/export?${params.toString()}`;
}

function updateStats(stats) {
    const total = Number(stats.total_requests ?? stats.length ?? 0);
    const pending = Number(stats.pending_count ?? 0);
    const approved = Number(stats.approved_count ?? 0);
    const rejected = Number(stats.rejected_count ?? 0);
    
    document.getElementById('total_requests').textContent = total;
    document.getElementById('pending_requests').textContent = pending;
    document.getElementById('approved_requests').textContent = approved;
    document.getElementById('rejected_requests').textContent = rejected;
}

function renderPermissionsList(permissions) {
    const container = document.getElementById('permissions-list');

    if (!permissions || permissions.length === 0) {
        container.innerHTML = `
            <div class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 text-sm">
                        <thead class="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th class="px-4 py-3 text-left font-semibold">Name</th>
                                <th class="px-4 py-3 text-left font-semibold">Reason</th>
                                <th class="px-4 py-3 text-left font-semibold">From</th>
                                <th class="px-4 py-3 text-left font-semibold">To</th>
                                <th class="px-4 py-3 text-center font-semibold">Count of days</th>
                                <th class="px-4 py-3 text-left font-semibold">Status</th>
                                <th class="px-4 py-3 text-left font-semibold">Comment</th>
                        </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 bg-white">
                            <tr>
                                <td colspan="7" class="px-4 py-10 text-center text-gray-500">
                                    No permission requests found
                                    @if($canCreate)
                                    <div class="mt-3">
                                        <button onclick="openPermissionModal()" class="text-sm font-medium text-blue-600 hover:text-blue-700">
                                            <i class="fas fa-plus"></i> Create request
                                        </button>
                                    </div>
                                    @endif
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('permissions-pagination').innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th class="px-4 py-3 text-left font-semibold">Name</th>
                            <th class="px-4 py-3 text-left font-semibold">Reason</th>
                            <th class="px-4 py-3 text-left font-semibold">From</th>
                            <th class="px-4 py-3 text-left font-semibold">To</th>
                            <th class="px-4 py-3 text-center font-semibold">Count of days</th>
                            <th class="px-4 py-3 text-left font-semibold">Status</th>
                            <th class="px-4 py-3 text-left font-semibold">Comment</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 bg-white">
                        ${permissions.map(perm => {
                            const startDate = perm.start_date ? new Date(perm.start_date) : null;
                            const endDate = perm.end_date ? new Date(perm.end_date) : null;
                            const validDates = startDate && endDate && !Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime());
                            const totalDays = validDates ? Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1) : 0;
                            const approverName = perm.approved_by_name || 'N/A';
                            const rejectionReason = perm.rejection_reason || 'No rejection reason provided';
                            const commentLines = perm.status === 'approved'
                                ? [
                                    `Approver: ${approverName}`,
                                    'Comment: Approved'
                                ]
                                : perm.status === 'rejected'
                                    ? [
                                        `Approver: ${approverName}`,
                                        `Comment: ${rejectionReason}`
                                    ]
                                    : ['Pending'];

                            let statusConfig = {
                                class: '',
                                icon: '',
                                text: ''
                            };

                            switch (perm.status) {
                                case 'approved':
                                    statusConfig = { class: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200', icon: 'fa-check-circle', text: 'Approved' };
                                    break;
                                case 'rejected':
                                    statusConfig = { class: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200', icon: 'fa-times-circle', text: 'Rejected' };
                                    break;
                                default:
                                    statusConfig = { class: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200', icon: 'fa-clock', text: 'Pending' };
                            }

                            return `
                                <tr class="hover:bg-gray-50/80">
                                    <td class="px-4 py-4 align-top">
                                        <div class="font-medium text-gray-900">${escapeHtml(perm.user_name || 'N/A')}</div>
                                    </td>
                                    <td class="px-4 py-4 align-top">
                                        <div class="max-w-xl whitespace-normal break-words text-gray-700">${escapeHtml(perm.reason || '-')}</div>
                                    </td>
                                    <td class="px-4 py-4 align-top text-gray-700">${formatDate(perm.start_date)}</td>
                                    <td class="px-4 py-4 align-top text-gray-700">${formatDate(perm.end_date)}</td>
                                    <td class="px-4 py-4 align-top text-center font-semibold text-gray-900">${totalDays}</td>
                                    <td class="px-4 py-4 align-top">
                                        <div class="flex flex-col gap-2">
                                            <span class="inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.class}">
                                                <i class="fas ${statusConfig.icon}"></i>
                                                ${statusConfig.text}
                                            </span>
                                            <div class="flex flex-wrap items-center gap-1">
                                                ${perm.status === 'pending' ? `
                                                    @if($canApprove)
                                                    <button onclick="approvePermission(${perm.id})" class="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition hover:bg-green-100" title="Approve">
                                                        <i class="fas fa-check mr-1"></i> Approve
                                                    </button>
                                                    @endif
                                                    @if($canReject)
                                                    <button onclick="rejectPermission(${perm.id})" class="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100" title="Reject">
                                                        <i class="fas fa-times mr-1"></i> Reject
                                                    </button>
                                                    @endif
                                                ` : ''}
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-4 py-4 align-top">
                                        <div class="max-w-xl space-y-1 whitespace-normal break-words text-gray-700">
                                            ${commentLines.map(line => `<div>${escapeHtml(line)}</div>`).join('')}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
function renderPagination(pagination) {
    const container = document.getElementById('permissions-pagination');
    if (!container) return;

    const totalPages = Number(pagination?.total_pages ?? 1);
    const currentPage = Number(pagination?.current_page ?? 1);
    const total = Number(pagination?.total ?? 0);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="flex items-center justify-between gap-3 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <p class="text-sm text-gray-500">Showing ${Math.min((currentPage - 1) * 5 + 1, total)}-${Math.min(currentPage * 5, total)} of ${total}</p>
            <div class="flex items-center gap-2">
                <button type="button" onclick="filterPermissions(${Math.max(1, currentPage - 1)})" ${pagination?.has_prev ? '' : 'disabled'} class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Prev</button>
                <span class="text-sm text-gray-500">Page ${currentPage} of ${totalPages}</span>
                <button type="button" onclick="filterPermissions(${Math.min(totalPages, currentPage + 1)})" ${pagination?.has_next ? '' : 'disabled'} class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
            </div>
        </div>
    `;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

async function approvePermission(id) {
    @if(!$canApprove)
        disciplineAlert('You do not have permission to approve requests.');
        return;
    @endif
    
    if (await disciplineConfirm('Approve this permission request?')) {
        fetch(`/discipline/permission/${id}`, {
            method: 'PUT',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ status: 'approved' })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                filterPermissions();
            } else {
                disciplineAlert('Error: ' + (data.message || 'Failed to approve'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            disciplineAlert('Error approving request');
        });
    }
}

async function rejectPermission(id) {
    @if(!$canReject)
        disciplineAlert('You do not have permission to reject requests.');
        return;
    @endif
    
    const reason = await disciplinePrompt('Enter rejection reason:', 'Reject request', 'Rejection reason');
    if (reason !== null) {
        if (reason.trim() === '') {
            disciplineAlert('Please provide a reason for rejection');
            return;
        }
        fetch(`/discipline/permission/${id}`, {
            method: 'PUT',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ status: 'rejected', rejection_reason: reason })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                filterPermissions();
            } else {
                disciplineAlert('Error: ' + (data.message || 'Failed to reject'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            disciplineAlert('Error rejecting request');
        });
    }
}

async function deletePermission(id) {
    @if(!$canDelete)
        disciplineAlert('You do not have permission to delete requests.');
        return;
    @endif
    
    if (await disciplineConfirm('Are you sure you want to delete this permission request?', 'Delete request', 'Delete', 'Cancel', 'danger')) {
        fetch(`/discipline/permission/${id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                filterPermissions();
            } else {
                disciplineAlert('Error: ' + (data.message || 'Failed to delete'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            disciplineAlert('Error deleting request');
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load initial data - only if user has view permission
@if($canView)
document.addEventListener('DOMContentLoaded', function() {
    filterPermissions(1);
});
@endif

// Event listeners - only if user has view permission
@if($canView)
document.getElementById('permission_search')?.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') filterPermissions(1);
});
document.getElementById('permission_status_filter')?.addEventListener('change', () => filterPermissions(1));
document.getElementById('permission_from_date')?.addEventListener('change', () => filterPermissions(1));
document.getElementById('permission_to_date')?.addEventListener('change', () => filterPermissions(1));
@endif
</script>
