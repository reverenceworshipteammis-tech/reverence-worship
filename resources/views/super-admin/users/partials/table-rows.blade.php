@forelse($users as $user)
<tr class="hover:bg-gray-50 transition">
    <!-- Combined USER / EMAIL column -->
    <td class="px-4 py-4">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                <span class="text-white text-sm font-bold">{{ substr($user->name, 0, 2) }}</span>
            </div>
            <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ $user->name }}</p>
                <p class="text-xs text-gray-500 truncate">{{ $user->email }}</p>
            </div>
        </div>
    </td>
    
    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {{ $user->phone ?? '-' }}
    </td>
    
    <td class="px-4 py-4">
        <div class="flex flex-wrap gap-1">
            @foreach($user->roles as $role)
                <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {{ $role->display_name }}
                </span>
            @endforeach
            @if($user->roles->isEmpty())
                <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">No role</span>
            @endif
        </div>
    </td>
    
    <td class="px-4 py-4 whitespace-nowrap">
        @if($user->is_active)
            <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                <i class="fas fa-circle text-xs mr-1"></i> Active
            </span>
        @else
            @if($user->created_by === null && $user->email_verified_at === null)
                <span class="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                    <i class="fas fa-clock text-xs mr-1"></i> Pending
                </span>
            @else
                <span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                    <i class="fas fa-circle text-xs mr-1"></i> Inactive
                </span>
            @endif
        @endif
    </td>
    
    <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {{ $user->created_at ? date('M d, Y', strtotime($user->created_at)) : 'N/A' }}
    </td>
    
    <td class="px-4 py-4 whitespace-nowrap">
        <div class="relative">
            <button onclick="toggleDropdown({{ $user->id }})" 
                    class="text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50 transition flex items-center gap-1">
                Actions <i class="fas fa-chevron-down text-xs"></i>
            </button>
            
            <div id="dropdown-{{ $user->id }}" class="dropdown-menu hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div class="py-1">
                    <button onclick="openViewModal({{ $user->id }})" 
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                        <i class="fas fa-file-lines text-gray-500 w-4"></i> View Details
                    </button>
                    <button onclick="openEditModal({{ $user->id }})" 
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                        <i class="fas fa-edit text-gray-500 w-4"></i> Edit User
                    </button>
                    <button onclick="openEditRolesModal({{ $user->id }})" 
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                        <i class="fas fa-tags text-gray-500 w-4"></i> Edit Roles
                    </button>
                    
                    @if(!$user->is_active && $user->created_by === null && $user->email_verified_at === null)
                        <div class="border-t my-1"></div>
                        <button onclick="openApproveModal({{ $user->id }}, '{{ addslashes($user->name) }}')" 
                                class="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2">
                            <i class="fas fa-check-circle text-green-500 w-4"></i> Approve User
                        </button>
                    @endif
                    
                    @if(auth()->id() !== $user->id && $user->is_active)
                        <div class="border-t my-1"></div>
                        <button onclick="openDeactivateModal({{ $user->id }}, '{{ addslashes($user->name) }}')" 
                                class="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2">
                            <i class="fas fa-ban text-orange-500 w-4"></i> Deactivate User
                        </button>
                    @endif
                    
                    @if(auth()->id() !== $user->id && !$user->is_active && $user->created_by !== null)
                        <div class="border-t my-1"></div>
                        <button onclick="openActivateModal({{ $user->id }}, '{{ addslashes($user->name) }}')" 
                                class="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2">
                            <i class="fas fa-check-circle text-green-500 w-4"></i> Activate User
                        </button>
                    @endif
                    
                    @if(auth()->id() !== $user->id)
                        <div class="border-t my-1"></div>
                        <button onclick="openDeleteModal({{ $user->id }}, '{{ addslashes($user->name) }}')" 
                                class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <i class="fas fa-trash-alt text-red-500 w-4"></i> Delete User
                        </button>
                    @endif
                </div>
            </div>
        </div>
    </td>
</tr>
@empty
<tr>
    <td colspan="6" class="px-6 py-12 text-center text-gray-500">
        <i class="fas fa-users fa-3x mb-3 text-gray-300"></i>
        <p>No users found</p>
    </td>
</tr>
@endforelse
