@extends('layouts.app')

@section('title', 'User Management')
@section('page-title', 'User Management')

@section('content')
<div class="max-w-7xl mx-auto px-2 sm:px-4">

    <!-- Statistics Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div class="bg-white rounded-lg shadow-sm p-2 sm:p-3 hover:shadow-md transition flex items-center gap-1 sm:gap-2">
            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-users text-blue-600 text-xs sm:text-sm"></i>
            </div>
            <div>
                <p class="text-[8px] sm:text-[10px] text-gray-500 uppercase">Total Users</p>
                <p class="text-base sm:text-lg font-bold text-gray-800">{{ $stats['total'] ?? 0 }}</p>
            </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-2 sm:p-3 hover:shadow-md transition flex items-center gap-1 sm:gap-2">
            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-user-check text-green-600 text-xs sm:text-sm"></i>
            </div>
            <div>
                <p class="text-[8px] sm:text-[10px] text-gray-500 uppercase">Active</p>
                <p class="text-base sm:text-lg font-bold text-green-600">{{ $stats['active'] ?? 0 }}</p>
            </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-2 sm:p-3 hover:shadow-md transition flex items-center gap-1 sm:gap-2">
            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-user-slash text-red-600 text-xs sm:text-sm"></i>
            </div>
            <div>
                <p class="text-[8px] sm:text-[10px] text-gray-500 uppercase">Inactive</p>
                <p class="text-base sm:text-lg font-bold text-red-600">{{ $stats['inactive'] ?? 0 }}</p>
            </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-2 sm:p-3 hover:shadow-md transition flex items-center gap-1 sm:gap-2">
            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-clock text-yellow-600 text-xs sm:text-sm"></i>
            </div>
            <div>
                <p class="text-[8px] sm:text-[10px] text-gray-500 uppercase">Pending</p>
                <p class="text-base sm:text-lg font-bold text-yellow-600">{{ $stats['pending'] ?? 0 }}</p>
            </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-2 sm:p-3 hover:shadow-md transition flex items-center gap-1 sm:gap-2">
            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-mars text-blue-600 text-xs sm:text-sm"></i>
            </div>
            <div>
                <p class="text-[8px] sm:text-[10px] text-gray-500 uppercase">Male</p>
                <p class="text-base sm:text-lg font-bold text-blue-600">{{ $stats['male'] ?? 0 }}</p>
            </div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-2 sm:p-3 hover:shadow-md transition flex items-center gap-1 sm:gap-2">
            <div class="w-6 h-6 sm:w-8 sm:h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-venus text-pink-600 text-xs sm:text-sm"></i>
            </div>
            <div>
                <p class="text-[8px] sm:text-[10px] text-gray-500 uppercase">Female</p>
                <p class="text-base sm:text-lg font-bold text-pink-600">{{ $stats['female'] ?? 0 }}</p>
            </div>
        </div>
    </div>

    <!-- Filters Bar - Requires filter permission -->
    @if(auth()->check() && auth()->user()->canAccess('users', 'filter-users'))
    <div class="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-4">
        <div class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
            <div class="flex-1 min-w-[150px]">
                <label class="block text-xs font-medium text-gray-700 mb-1">Search name or email</label>
                <div class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input type="text" id="searchInput" placeholder="Search..."
                        value="{{ request('search') }}"
                        class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
            </div>
            <div class="flex gap-2">
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Role</label>
                    <select id="roleFilter" class="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Roles</option>
                        @foreach($roles as $role)
                        <option value="{{ $role->id }}" {{ request('role') == $role->id ? 'selected' : '' }}>
                            {{ $role->display_name }}
                        </option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select id="statusFilter" class="w-full sm:w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All</option>
                        <option value="active" {{ request('status') == 'active' ? 'selected' : '' }}>Active</option>
                        <option value="inactive" {{ request('status') == 'inactive' ? 'selected' : '' }}>Inactive</option>
                        <option value="pending" {{ request('status') == 'pending' ? 'selected' : '' }}>Pending</option>
                    </select>
                </div>
                <div class="flex gap-2">
                    @if(auth()->check() && auth()->user()->canAccess('users', 'view-users'))
                    <a href="{{ route('users.index') }}" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm transition flex items-center gap-1">
                        <i class="fas fa-sync-alt text-xs"></i>
                        <span class="hidden sm:inline">Reset</span>
                    </a>
                    @endif
                </div>
            </div>
            <div class="flex flex-wrap gap-2 sm:ml-auto">
                @if(auth()->check() && auth()->user()->canAccess('users', 'create-user'))
                <button type="button" onclick="openCreateModal()" class="bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-2 rounded-lg text-sm transition flex items-center gap-1">
                    <i class="fas fa-user-plus"></i>
                    <span class="hidden sm:inline">Add User</span>
                </button>
                @endif
                
                @if(auth()->check() && auth()->user()->canAccess('users', 'export-users-csv'))
                <button type="button" id="exportCsvBtn" class="bg-gray-600 hover:bg-gray-700 text-white px-2 sm:px-3 py-2 rounded-lg text-sm transition flex items-center gap-1">
                    <i class="fas fa-download"></i>
                    <span class="hidden sm:inline">CSV</span>
                </button>
                @endif
                
                @if(auth()->check() && auth()->user()->canAccess('users', 'export-users-pdf'))
                <button type="button" id="exportPdfBtn" class="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-2 rounded-lg text-sm transition flex items-center gap-1">
                    <i class="fas fa-file-pdf"></i>
                    <span class="hidden sm:inline">PDF</span>
                </button>
                @endif
            </div>
        </div>
    </div>
    @endif

    <!-- Users Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <!-- Desktop Table View -->
        <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">USER / EMAIL</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PHONE</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROLE</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">REGISTERED</th>
                        @if(auth()->check() && (auth()->user()->canAccess('users', 'view-users') || auth()->user()->canAccess('users', 'edit-user') || auth()->user()->canAccess('users', 'delete-user')))
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
                        @endif
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200" id="usersTableBody">
                    @foreach($users as $user)
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3">
                            <div class="flex items-center">
                                <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center">
                                    <span class="text-white text-xs font-bold">{{ substr($user->name, 0, 2) }}</span>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm font-medium text-gray-900">{{ $user->name }}</p>
                                    <p class="text-xs text-gray-500">{{ $user->email }}</p>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500">{{ $user->phone ?? '-' }}</td>
                        <td class="px-4 py-3">
                            <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                                {{ $user->roles->first()->display_name ?? 'No Role' }}
                            </span>
                        </td>
                        <td class="px-4 py-3">
                            @if($user->is_active)
                                <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Active</span>
                            @else
                                @if($user->created_by === null && $user->email_verified_at === null)
                                    <span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Pending</span>
                                @else
                                    <span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Inactive</span>
                                @endif
                            @endif
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500">{{ $user->created_at ? $user->created_at->format('M d, Y') : '-' }}</td>
                        @if(auth()->check() && (auth()->user()->canAccess('users', 'view-users') || auth()->user()->canAccess('users', 'edit-user') || auth()->user()->canAccess('users', 'delete-user')))
                        <td class="px-4 py-3 text-sm">
                            <select onchange="handleUserAction(this, {{ $user->id }}, @js($user->name))"
                                class="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Action</option>
                                @if(auth()->check() && auth()->user()->canAccess('users', 'view-user-details'))
                                    <option value="view">ðŸ‘ View Details</option>
                                @endif
                                @if(auth()->check() && auth()->user()->canAccess('users', 'edit-user'))
                                    <option value="edit">âœŽ Edit User</option>
                                @endif
                                @if(!$user->is_active && $user->created_by === null && $user->email_verified_at === null)
                                    @if(auth()->check() && auth()->user()->canAccess('users', 'approve-user'))
                                        <option value="approve">âœ“ Approve User</option>
                                        <option value="reject">âœ• Reject User</option>
                                    @endif
                                @endif
                                @if(auth()->id() !== $user->id && $user->is_active)
                                    @if(auth()->check() && auth()->user()->canAccess('users', 'deactivate-user'))
                                        <option value="deactivate">âŠ˜ Deactivate User</option>
                                    @endif
                                @endif
                                @if(auth()->id() !== $user->id && !$user->is_active && $user->created_by !== null)
                                    @if(auth()->check() && auth()->user()->canAccess('users', 'activate-user'))
                                        <option value="activate">âœ“ Activate User</option>
                                    @endif
                                @endif
                                @if(auth()->check() && auth()->user()->canAccess('users', 'edit-user-roles'))
                                    <option value="roles">âš™ Manage Roles</option>
                                @endif
                                @if(auth()->id() !== $user->id)
                                    @if(auth()->check() && auth()->user()->canAccess('users', 'delete-user'))
                                        <option value="delete">ðŸ—‘ Delete User</option>
                                    @endif
                                @endif
                            </select>
                        </td>
                        @endif
                    </tr>
                    @endforeach
                    @if($users->isEmpty())
                    <tr>
                        <td colspan="6" class="px-4 py-8 text-center text-gray-500">No users found</td>
                    </tr>
                    @endif
                </tbody>
            </table>
        </div>
        
        <!-- Mobile Card View -->
        <div class="block md:hidden divide-y divide-gray-200" id="mobileUsersContainer">
            @foreach($users as $user)
            <div class="p-4 hover:bg-gray-50 transition">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                                <span class="text-white text-xs font-bold">{{ substr($user->name, 0, 2) }}</span>
                            </div>
                            <div>
                                <p class="font-semibold text-gray-800 text-sm">{{ $user->name }}</p>
                                <p class="text-xs text-gray-500">{{ $user->email }}</p>
                            </div>
                        </div>
                    </div>
                    @if(auth()->check() && (auth()->user()->canAccess('users', 'view-users') || auth()->user()->canAccess('users', 'edit-user') || auth()->user()->canAccess('users', 'delete-user')))
                    <div class="shrink-0 ml-2">
                        <select onchange="handleUserAction(this, {{ $user->id }}, @js($user->name))"
                            class="w-24 px-2 py-1 border border-gray-300 rounded-md text-[11px] font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Action</option>
                            @if(auth()->check() && auth()->user()->canAccess('users', 'view-user-details'))
                                <option value="view">ðŸ‘ View Details</option>
                            @endif
                            @if(auth()->check() && auth()->user()->canAccess('users', 'edit-user'))
                                <option value="edit">âœŽ Edit User</option>
                            @endif
                            @if(!$user->is_active && $user->created_by === null && $user->email_verified_at === null)
                                @if(auth()->check() && auth()->user()->canAccess('users', 'approve-user'))
                                    <option value="approve">âœ“ Approve User</option>
                                    <option value="reject">âœ• Reject User</option>
                                @endif
                            @endif
                            @if(auth()->id() !== $user->id && $user->is_active)
                                @if(auth()->check() && auth()->user()->canAccess('users', 'deactivate-user'))
                                    <option value="deactivate">âŠ˜ Deactivate User</option>
                                @endif
                            @endif
                            @if(auth()->id() !== $user->id && !$user->is_active && $user->created_by !== null)
                                @if(auth()->check() && auth()->user()->canAccess('users', 'activate-user'))
                                    <option value="activate">âœ“ Activate User</option>
                                @endif
                            @endif
                            @if(auth()->check() && auth()->user()->canAccess('users', 'edit-user-roles'))
                                <option value="roles">âš™ Manage Roles</option>
                            @endif
                            @if(auth()->id() !== $user->id)
                                @if(auth()->check() && auth()->user()->canAccess('users', 'delete-user'))
                                    <option value="delete">ðŸ—‘ Delete User</option>
                                @endif
                            @endif
                        </select>
                    </div>
                    @endif
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span class="text-gray-500">Phone:</span> <span class="text-gray-700">{{ $user->phone ?? '-' }}</span></div>
                    <div><span class="text-gray-500">Role:</span> <span class="text-gray-700">{{ $user->roles->first()->display_name ?? '-' }}</span></div>
                    <div>
                        <span class="text-gray-500">Status:</span>
                        @if($user->is_active)
                        <span class="inline-block px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">Active</span>
                        @else
                            @if($user->created_by === null && $user->email_verified_at === null)
                            <span class="inline-block px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                            @else
                            <span class="inline-block px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">Inactive</span>
                            @endif
                        @endif
                    </div>
                    <div><span class="text-gray-500">Registered:</span> <span class="text-gray-700">{{ $user->created_at ? $user->created_at->format('M d, Y') : '-' }}</span></div>
                </div>
            </div>
            @endforeach
            @if($users->isEmpty())
            <div class="p-8 text-center text-gray-500">No users found</div>
            @endif
        </div>

        <div class="px-4 sm:px-6 py-4 bg-gray-50 border-t" id="paginationLinks">
            {{ $users->appends(request()->query())->links() }}
        </div>
    </div>
</div>

<!-- Modals -->
<div id="viewModal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 hidden">
    <div class="relative top-10 mx-auto p-4 sm:p-5 border w-[95%] sm:w-full max-w-2xl shadow-xl rounded-xl bg-white">
        <!-- Modal Header -->
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <div class="flex items-center gap-2">
                <i class="fas fa-user-circle text-blue-600 text-xl"></i>
                <h3 class="text-lg sm:text-xl font-semibold text-gray-900">User Details</h3>
            </div>
            <button onclick="closeModal('viewModal')" class="text-gray-400 hover:text-gray-600 transition p-1 rounded-full hover:bg-gray-100">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <!-- Content -->
        <div id="viewUserContent" class="max-h-[70vh] overflow-y-auto">
            <div class="flex items-center justify-center py-12">
                <div class="inline-flex items-center gap-3 text-gray-500">
                    <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading user details...</span>
                </div>
            </div>
        </div>
    </div>
</div>

<div id="editModal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 hidden">
    <div class="relative top-10 mx-auto p-4 sm:p-5 border w-[95%] sm:w-full max-w-4xl shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900">Edit User</h3>
            <button onclick="closeModal('editModal')" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        </div>
        <div id="editUserContent">Loading...</div>
    </div>
</div>

<div id="editRolesModal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 hidden">
    <div class="relative top-10 mx-auto p-4 sm:p-5 border w-[95%] sm:w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900">Edit User Roles</h3>
            <button onclick="closeModal('editRolesModal')" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times"></i></button>
        </div>
        <div id="editRolesContent">Loading...</div>
    </div>
</div>

<div id="createModal" class="modal fixed inset-0 bg-gray-900 bg-opacity-60 overflow-y-auto h-full w-full z-[9999] hidden">
    <div class="relative top-6 sm:top-10 mx-auto p-4 border w-[94%] sm:w-full max-w-2xl shadow-xl rounded-lg bg-white">
        <div class="flex justify-between items-center border-b pb-3 mb-4">
            <h3 class="text-base sm:text-lg font-semibold text-gray-900">Create New User</h3>
            <button onclick="closeModal('createModal')" class="h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><i class="fas fa-times"></i></button>
        </div>
        <div id="createUserContent">Loading...</div>
    </div>
</div>

<div id="approveModal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 hidden">
    <div class="relative top-20 mx-auto p-5 border w-[90%] sm:w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="text-center">
            <i class="fas fa-check-circle text-green-500 text-4xl mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Approve User</h3>
            <p class="text-sm text-gray-500 mb-6">Are you sure you want to approve <span id="approveUserName" class="font-semibold"></span>?</p>
            <div class="flex justify-center gap-3">
                <button onclick="closeModal('approveModal')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                <button id="confirmApproveBtn" class="px-4 py-2 bg-green-600 text-white rounded-lg">Approve</button>
            </div>
        </div>
    </div>
</div>

<div id="rejectModal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 hidden">
    <div class="relative top-20 mx-auto p-5 border w-[90%] sm:w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="text-center">
            <i class="fas fa-user-times text-red-500 text-4xl mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Reject User</h3>
            <p class="text-sm text-gray-500 mb-6">Are you sure you want to reject <span id="rejectUserName" class="font-semibold"></span>? This pending registration will be removed.</p>
            <div class="flex justify-center gap-3">
                <button onclick="closeModal('rejectModal')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                <button id="confirmRejectBtn" class="px-4 py-2 bg-red-600 text-white rounded-lg">Reject</button>
            </div>
        </div>
    </div>
</div>

<div id="activateModal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 hidden">
    <div class="relative top-20 mx-auto p-5 border w-[90%] sm:w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="text-center">
            <i class="fas fa-user-check text-blue-500 text-4xl mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Activate User</h3>
            <p class="text-sm text-gray-500 mb-6">Are you sure you want to activate <span id="activateUserName" class="font-semibold"></span>?</p>
            <div class="flex justify-center gap-3">
                <button onclick="closeModal('activateModal')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                <button id="confirmActivateBtn" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Activate</button>
            </div>
        </div>
    </div>
</div>

<div id="deactivateModal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 hidden">
    <div class="relative top-20 mx-auto p-5 border w-[90%] sm:w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="text-center">
            <i class="fas fa-user-slash text-yellow-500 text-4xl mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Deactivate User</h3>
            <p class="text-sm text-gray-500 mb-6">Are you sure you want to deactivate <span id="deactivateUserName" class="font-semibold"></span>?</p>
            <div class="flex justify-center gap-3">
                <button onclick="closeModal('deactivateModal')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                <button id="confirmDeactivateBtn" class="px-4 py-2 bg-yellow-600 text-white rounded-lg">Deactivate</button>
            </div>
        </div>
    </div>
</div>

<div id="deleteModal" class="modal fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 hidden">
    <div class="relative top-20 mx-auto p-5 border w-[90%] sm:w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="text-center">
            <i class="fas fa-trash text-red-500 text-4xl mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Delete User</h3>
            <p class="text-sm text-gray-500 mb-6">Are you sure you want to delete <span id="deleteUserName" class="font-semibold"></span>? This action cannot be undone.</p>
            <div class="flex justify-center gap-3">
                <button onclick="closeModal('deleteModal')" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg">Cancel</button>
                <button id="confirmDeleteBtn" class="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
            </div>
        </div>
    </div>
</div>

<script>
    let searchTimeout;

    function applyFilters() {
        const search = document.getElementById('searchInput')?.value || '';
        const role = document.getElementById('roleFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const url = new URL(window.location.href);
        url.searchParams.set('search', search);
        url.searchParams.set('role', role);
        url.searchParams.set('status', status);
        window.history.pushState({}, '', url);
        window.location.href = url.toString();
    }

    function debouncedSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => applyFilters(), 500);
    }

    document.getElementById('searchInput')?.addEventListener('input', debouncedSearch);
    document.getElementById('roleFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);

    function handleUserAction(select, userId, userName) {
        const action = select.value;
        select.value = '';

        if (!action) return;

        const actions = {
            view: () => openViewModal(userId),
            edit: () => openEditModal(userId),
            approve: () => openApproveModal(userId, userName),
            reject: () => openRejectModal(userId, userName),
            deactivate: () => openDeactivateModal(userId, userName),
            activate: () => openActivateModal(userId, userName),
            roles: () => openEditRolesModal(userId),
            delete: () => openDeleteModal(userId, userName)
        };

        if (actions[action]) {
            actions[action]();
        }
    }

    function closeModal(modalId) {
        document.getElementById(modalId)?.classList.add('hidden');
    }

    function showNotification(type, message) {
    return window.appNotify(...arguments);
        const existingNotification = document.querySelector('.notification-toast');
        if (existingNotification) existingNotification.remove();
        const notification = document.createElement('div');
        notification.className = `notification-toast fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in`;
        notification.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-white"></i>
            <span class="text-white text-sm">${message}</span>
            <button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200"><i class="fas fa-times"></i></button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    // Modal open functions
    function openApproveModal(userId, userName) {
        document.getElementById('approveUserName').innerHTML = userName;
        document.getElementById('confirmApproveBtn').setAttribute('data-user-id', userId);
        document.getElementById('approveModal').classList.remove('hidden');
    }

    function openRejectModal(userId, userName) {
        document.getElementById('rejectUserName').innerHTML = userName;
        document.getElementById('confirmRejectBtn').setAttribute('data-user-id', userId);
        document.getElementById('rejectModal').classList.remove('hidden');
    }

    function openActivateModal(userId, userName) {
        document.getElementById('activateUserName').innerHTML = userName;
        document.getElementById('confirmActivateBtn').setAttribute('data-user-id', userId);
        document.getElementById('activateModal').classList.remove('hidden');
    }

    function openDeactivateModal(userId, userName) {
        document.getElementById('deactivateUserName').innerHTML = userName;
        document.getElementById('confirmDeactivateBtn').setAttribute('data-user-id', userId);
        document.getElementById('deactivateModal').classList.remove('hidden');
    }

    function openDeleteModal(userId, userName) {
        document.getElementById('deleteUserName').innerHTML = userName;
        document.getElementById('confirmDeleteBtn').setAttribute('data-user-id', userId);
        document.getElementById('deleteModal').classList.remove('hidden');
    }

    function openViewModal(userId) {
    // Show loading state
    document.getElementById('viewUserContent').innerHTML = `
        <div class="flex items-center justify-center py-12">
            <div class="inline-flex items-center gap-3 text-gray-500">
                <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading user details...</span>
            </div>
        </div>
    `;
    document.getElementById('viewModal').classList.remove('hidden');
    
    fetch(`/users/${userId}/json`)
        .then(response => response.json())
        .then(data => {
            // Get initials for avatar
            const initials = data.name ? data.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
            
            const content = `
                <div class="space-y-5">
                    <!-- Header Section - User Profile -->
                    <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4 border-b pb-4">
                        <div class="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                            <span class="text-white text-2xl font-bold">${initials}</span>
                        </div>
                        <div class="flex-1 text-center sm:text-left">
                            <h4 class="text-xl font-bold text-gray-900">${escapeHtml(data.name || 'N/A')}</h4>
                            <p class="text-gray-600 text-sm">${escapeHtml(data.email || 'N/A')}</p>
                            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                                <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full ${data.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    <span class="w-1.5 h-1.5 rounded-full ${data.is_active ? 'bg-green-500' : 'bg-red-500'}"></span>
                                    ${data.is_active ? 'Active' : 'Inactive'}
                                </span>
                               
                                
                                ${data.is_singer ? `
                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                                        <i class="fas fa-microphone text-xs"></i> Singer
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quick Info Cards -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        
                       
                    </div>
                    
                    <!-- Personal Information -->
                    <div>
                        <h5 class="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm">
                            <i class="fas fa-user text-blue-500"></i> Personal Information
                        </h5>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">Full Name</label>
                                <p class="font-medium text-gray-800 text-sm truncate">${escapeHtml(data.name || '-')}</p>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">Email Address</label>
                                <p class="font-medium text-gray-800 text-sm truncate">${escapeHtml(data.email || '-')}</p>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">Phone Number</label>
                                <p class="font-medium text-gray-800 text-sm">${escapeHtml(data.phone || '-')}</p>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">Gender</label>
                                <p class="font-medium text-gray-800 text-sm capitalize">${escapeHtml(data.gender || '-')}</p>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">Date of Birth</label>
                                <p class="font-medium text-gray-800 text-sm">${escapeHtml(data.date_of_birth || '-')}</p>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">Marital Status</label>
                                <p class="font-medium text-gray-800 text-sm capitalize">${escapeHtml(data.marital_status || '-')}</p>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">Membership Type</label>
                                <p class="font-medium text-gray-800 text-sm capitalize">${escapeHtml(data.membership_type || '-')}</p>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">Occupation</label>
                                <p class="font-medium text-gray-800 text-sm">${escapeHtml(data.occupation || '-')}</p>
                            </div>
                            
                        </div>
                    </div>
                    
                    <!-- Address Information -->
                    <div>
                        <h5 class="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm">
                            <i class="fas fa-map-marker-alt text-green-500"></i> Address Information
                        </h5>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">Province</label>
                                <p class="font-medium text-gray-800 text-sm">${escapeHtml(data.province || '-')}</p>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">District</label>
                                <p class="font-medium text-gray-800 text-sm">${escapeHtml(data.district || '-')}</p>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">Sector</label>
                                <p class="font-medium text-gray-800 text-sm">${escapeHtml(data.sector || '-')}</p>
                            </div>
                            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                <label class="text-xs text-gray-500">Village</label>
                                <p class="font-medium text-gray-800 text-sm">${escapeHtml(data.village || '-')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Roles -->
                    <div>
                        <h5 class="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm">
                            <i class="fas fa-tags text-yellow-500"></i> Roles & Permissions
                        </h5>
                        <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <div class="flex flex-wrap gap-2">
                                ${data.roles && data.roles.length > 0 ? 
                                    data.roles.map(r => `<span class="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                                        <i class="fas fa-user-tag text-xs"></i> ${escapeHtml(r.display_name || r.name)}
                                    </span>`).join('') : 
                                    '<span class="text-gray-500 text-sm">No roles assigned</span>'}
                            </div>
                            ${data.is_super_admin ? `
                                <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p class="text-yellow-700 text-sm flex items-center gap-2">
                                        <i class="fas fa-star"></i>
                                        <span>Super Administrator - Full system access</span>
                                    </p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    
                    
                    <!-- Footer Actions -->
                    <div class="flex flex-wrap justify-end gap-2 pt-4 border-t">
                        <button onclick="closeModal('viewModal')" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition flex items-center gap-2">
                            <i class="fas fa-times"></i> Close
                        </button>
                        ${data.id ? `
                        <button onclick="window.openEditModal && window.openEditModal(${data.id})" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition flex items-center gap-2">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="window.generateUserPDF && window.generateUserPDF(${data.id})" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition flex items-center gap-2">
                            <i class="fas fa-file-pdf"></i> Export PDF
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
            document.getElementById('viewUserContent').innerHTML = content;
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('viewUserContent').innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-3"></i>
                    <p class="text-red-500 font-medium">Error loading user details</p>
                    <p class="text-gray-500 text-sm mt-1">${error.message || 'Please try again'}</p>
                    <button onclick="closeModal('viewModal')" class="mt-4 px-4 py-2 bg-gray-200 rounded-lg text-sm">Close</button>
                </div>
            `;
            showNotification('error', 'Could not load user details');
        });
}
function generateUserPDF(userId) {
    if (!userId) {
        showNotification('error', 'Invalid user ID');
        return;
    }
    
    // Show loading state on the button
    const exportBtn = document.querySelector('#viewModal button[onclick*="generateUserPDF"]');
    if (exportBtn) {
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        exportBtn.disabled = true;
        
        // Open PDF in new window
        window.open(`/users/${userId}/export-pdf`, '_blank');
        
        // Reset button after delay
        setTimeout(() => {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }, 3000);
    } else {
        // Direct open
        window.open(`/users/${userId}/export-pdf`, '_blank');
    }
}
// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    } catch(e) {
        return dateString;
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to show notification
function showNotification(type, message) {
    return window.appNotify(...arguments);
    // You can implement your notification system here
    console.log(`${type}: ${message}`);
}

    function openEditModal(userId) {
        fetch(`/users/${userId}/edit-form`)
            .then(response => response.text())
            .then(html => {
                document.getElementById('editUserContent').innerHTML = html;
                document.getElementById('editModal').classList.remove('hidden');
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('error', 'Could not load edit form');
            });
    }

    function openEditRolesModal(userId) {
        fetch(`/users/${userId}/roles/edit`)
            .then(response => response.text())
            .then(html => {
                document.getElementById('editRolesContent').innerHTML = html;
                document.getElementById('editRolesModal').classList.remove('hidden');
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('error', 'Could not load roles form');
            });
    }

    function openCreateModal() {
        fetch('/users/create-form')
            .then(response => response.text())
            .then(html => {
                document.getElementById('createUserContent').innerHTML = html;
                document.getElementById('createModal').classList.remove('hidden');
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('error', 'Could not load create form');
            });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Confirmation button handlers
    document.getElementById('confirmApproveBtn')?.addEventListener('click', function() {
        const userId = this.getAttribute('data-user-id');
        const userName = document.getElementById('approveUserName')?.innerHTML || 'this user';
        processUserAction(userId, userName, 'approve', 'approved');
    });

    document.getElementById('confirmRejectBtn')?.addEventListener('click', function() {
        const userId = this.getAttribute('data-user-id');
        const userName = document.getElementById('rejectUserName')?.innerHTML || 'this user';
        processUserAction(userId, userName, 'reject', 'rejected');
    });

    document.getElementById('confirmActivateBtn')?.addEventListener('click', function() {
        const userId = this.getAttribute('data-user-id');
        const userName = document.getElementById('activateUserName')?.innerHTML || 'this user';
        processUserAction(userId, userName, 'activate', 'activated');
    });

    document.getElementById('confirmDeactivateBtn')?.addEventListener('click', function() {
        const userId = this.getAttribute('data-user-id');
        const userName = document.getElementById('deactivateUserName')?.innerHTML || 'this user';
        processUserAction(userId, userName, 'deactivate', 'deactivated');
    });

    document.getElementById('confirmDeleteBtn')?.addEventListener('click', function() {
        const userId = this.getAttribute('data-user-id');
        const userName = document.getElementById('deleteUserName')?.innerHTML || 'this user';
        processUserAction(userId, userName, 'delete', 'deleted');
    });

    function processUserAction(userId, userName, action, actionPastTense) {
    const btn = document.getElementById(`confirm${action.charAt(0).toUpperCase() + action.slice(1)}Btn`);
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Processing...';
    btn.disabled = true;
    
    let url = '';
    let method = 'POST';
    
    // Map actions to correct URLs and methods
    switch(action) {
        case 'delete':
            url = `/users/${userId}`;
            method = 'DELETE';
            break;
        case 'approve':
            url = `/users/${userId}/approve`;
            method = 'POST';
            break;
        case 'reject':
            url = `/users/${userId}/reject`;
            method = 'POST';
            break;
        case 'activate':
            url = `/users/${userId}/activate`;
            method = 'POST';
            break;
        case 'deactivate':
            url = `/users/${userId}/deactivate`;
            method = 'POST';
            break;
        default:
            url = `/users/${userId}/${action}`;
            method = 'POST';
    }
    
    fetch(url, {
        method: method,
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal(`${action}Modal`);
            showNotification('success', data.message || `User "${userName}" has been ${actionPastTense} successfully!`);
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification('error', data.message || `Failed to ${action} user`);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('error', error.message || `Error ${action}ing user`);
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

    // Export functions
    @if(auth()->check() && auth()->user()->canAccess('users', 'export-users-csv'))
    document.getElementById('exportCsvBtn')?.addEventListener('click', function() {
        const search = document.getElementById('searchInput')?.value || '';
        const role = document.getElementById('roleFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        window.location.href = `/users/export?search=${encodeURIComponent(search)}&role=${role}&status=${status}`;
    });
    @endif

    @if(auth()->check() && auth()->user()->canAccess('users', 'export-users-pdf'))
    document.getElementById('exportPdfBtn')?.addEventListener('click', function() {
        const btn = this;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PDF...</span>';
        btn.disabled = true;
        const search = document.getElementById('searchInput')?.value || '';
        const role = document.getElementById('roleFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (role) params.append('role', role);
        if (status) params.append('status', status);
        window.open(`/users/export-pdf${params.toString() ? '?' + params.toString() : ''}`, '_blank');
        setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
    });
    @endif

    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.add('hidden');
        }
    }
</script>

<style>
    .modal { display: none; }
    .modal:not(.hidden) { display: block !important; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .animate-slide-in { animation: slideIn 0.3s ease-out; }
</style>
@endsection

