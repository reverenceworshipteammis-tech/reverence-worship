@extends('layouts.app')

@section('title', 'Role Management')
@section('page-title', 'Role Management')

@section('content')
<div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
        
        <a href="{{ route('roles.create') }}" class="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-lg shadow-md transition flex items-center">
            <i class="fas fa-plus-circle mr-2"></i>
            Create New Role
        </a>
    </div>
    
    <!-- Roles Table -->
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Display Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    @forelse($roles as $role)
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ $role->id }}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center {{ $role->name == 'super-admin' ? 'bg-gray-800' : 'bg-gray-600' }}">
                                    <i class="fas {{ $role->name == 'super-admin' ? 'fa-crown' : 'fa-tag' }} text-white text-xs"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm font-medium text-gray-900">{{ $role->name }}</p>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{{ $role->display_name }}</td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                <i class="fas fa-users mr-1"></i> {{ $role->users->count() }} users
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {{ $role->created_at ? $role->created_at->format('M d, Y') : 'N/A' }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div class="flex space-x-3">
                                <a href="{{ route('roles.show', $role->id) }}" class="text-gray-600 hover:text-gray-900" title="View Details">
                                    <i class="fas fa-file-lines"></i>
                                </a>
                                <a href="{{ route('roles.edit', $role->id) }}" class="text-gray-600 hover:text-gray-900" title="Edit Role">
                                    <i class="fas fa-edit"></i>
                                </a>
                                
                                @if($role->name !== 'super-admin')
                                    <form action="{{ route('roles.destroy', $role->id) }}" method="POST" class="inline" 
                                          onsubmit="return confirmSubmit(event, 'Delete role {{ $role->display_name }}?')">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="text-red-600 hover:text-red-800" title="Delete Role">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </form>
                                @endif
                            </div>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="6" class="px-6 py-8 text-center text-gray-500">No roles found</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        
        @if($roles->hasPages())
            <div class="px-6 py-4 bg-gray-50 border-t">
                {{ $roles->links() }}
            </div>
        @endif
    </div>
</div>
@endsection

