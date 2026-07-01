@extends('layouts.app')

@section('title', 'Permission Management')
@section('page-title', 'Permission Management')
@section('content')
<div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h1 class="text-3xl font-bold text-gray-800">Permission Management</h1>
            <p class="text-gray-600 mt-1">Manage system permissions and access control</p>
        </div>
        <a href="{{ route('permissions.create') }}" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md transition flex items-center">
            <i class="fas fa-plus-circle mr-2"></i>
            Create Permission
        </a>
    </div>
    
    <!-- Module Filter -->
    <div class="bg-white rounded-lg shadow-md p-4 mb-6">
        <div class="flex flex-wrap gap-2">
            <a href="{{ route('permissions.index') }}" class="px-3 py-1 rounded-full text-sm {{ !request()->module ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' }}">
                All Modules
            </a>
            @foreach($modules as $module)
                <a href="{{ route('permissions.by-module', $module->module) }}" 
                   class="px-3 py-1 rounded-full text-sm {{ request()->segment(3) == $module->module ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' }}">
                    {{ ucfirst($module->module) }}
                </a>
            @endforeach
        </div>
    </div>
    
    <!-- Permissions Table -->
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permission</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles Using</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    @forelse($permissions as $permission)
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ $permission->id }}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                                    <i class="fas fa-key text-white text-xs"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm font-mono text-gray-900">{{ $permission->name }}</p>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ $permission->display_name }}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                                {{ ucfirst($permission->module) }}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                <i class="fas fa-tags mr-1"></i> {{ $permission->roles->count() }} roles
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ $permission->created_at ? $permission->created_at->format('M d, Y') : 'N/A' }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div class="flex space-x-2">
                                <a href="{{ route('permissions.edit', $permission->id) }}" class="text-blue-600 hover:text-blue-900" title="Edit Permission">
                                    <i class="fas fa-edit"></i>
                                </a>
                                
                                @if($permission->roles->count() == 0)
                                    <form action="{{ route('permissions.destroy', $permission->id) }}" method="POST" class="inline" 
                                          onsubmit="return confirmSubmit(event, 'Delete permission {{ $permission->display_name }}? This action cannot be undone.')">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="text-red-600 hover:text-red-900" title="Delete Permission">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </form>
                                @else
                                    <span class="text-gray-400 cursor-not-allowed" title="Cannot delete - assigned to roles">
                                        <i class="fas fa-trash"></i>
                                    </span>
                                @endif
                            </div>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="7" class="px-6 py-8 text-center text-gray-500">
                            <i class="fas fa-key fa-3x mb-3 text-gray-300"></i>
                            <p>No permissions found</p>
                            <a href="{{ route('permissions.create') }}" class="inline-block mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg">
                                Create first permission
                            </a>
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        
        @if($permissions->hasPages())
            <div class="px-6 py-4 bg-gray-50 border-t">
                {{ $permissions->links() }}
            </div>
        @endif
    </div>
    
    <!-- Quick Assign Section -->
    <div class="mt-8">
        <div class="bg-gradient-to-r from-blue-900 to-black rounded-lg shadow-lg p-6 text-white">
            <h3 class="text-xl font-bold mb-4">
                <i class="fas fa-link mr-2"></i>
                Quick Assign Permissions to Role
            </h3>
            <p class="mb-4 text-gray-300">Assign permissions to roles to control access levels</p>
            <a href="{{ route('permissions.assign') }}" class="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition">
                <i class="fas fa-arrow-right mr-2"></i>
                Go to Permission Assignment
            </a>
        </div>
    </div>
</div>
@endsection
