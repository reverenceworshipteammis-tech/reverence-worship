@extends('layouts.app')

@section('title', 'Activity Logs')

@section('content')
<div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h1 class="text-3xl font-bold text-gray-800">Activity Logs</h1>
            <p class="text-gray-600 mt-1">Track all user activities and system events</p>
        </div>
        <div class="flex space-x-3">
            <a href="{{ route('logs.export.activity', request()->query()) }}" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center">
                <i class="fas fa-download mr-2"></i>
                Export CSV
            </a>
            <button onclick="confirmClear()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition flex items-center">
                <i class="fas fa-trash-alt mr-2"></i>
                Clear All
            </button>
        </div>
    </div>
    
    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-md p-4 mb-6">
        <form method="GET" action="{{ route('logs.activity') }}" class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">User</label>
                <select name="user_id" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">All Users</option>
                    @foreach($users as $user)
                        <option value="{{ $user->id }}" {{ request('user_id') == $user->id ? 'selected' : '' }}>
                            {{ $user->name }}
                        </option>
                    @endforeach
                </select>
            </div>
            
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Action</label>
                <select name="action" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">All Actions</option>
                    @foreach($actions as $action)
                        <option value="{{ $action }}" {{ request('action') == $action ? 'selected' : '' }}>
                            {{ ucfirst($action) }}
                        </option>
                    @endforeach
                </select>
            </div>
            
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Date From</label>
                <input type="date" name="date_from" value="{{ request('date_from') }}" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            </div>
            
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Date To</label>
                <input type="date" name="date_to" value="{{ request('date_to') }}" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            </div>
            
            <div class="flex items-end space-x-2">
                <div class="flex-1">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Search</label>
                    <input type="text" name="search" placeholder="Search description..." 
                           value="{{ request('search') }}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                </div>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-search"></i>
                </button>
                <a href="{{ route('logs.activity') }}" class="bg-gray-500 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-sync-alt"></i>
                </a>
            </div>
        </form>
    </div>
    
    <!-- Stats Summary -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow-md p-4">
            <p class="text-xs text-gray-500">Total Logs</p>
            <p class="text-2xl font-bold text-blue-600">{{ $logs->total() }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-4">
            <p class="text-xs text-gray-500">Unique Users</p>
            <p class="text-2xl font-bold text-green-600">{{ $logs->pluck('user_id')->unique()->count() }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-4">
            <p class="text-xs text-gray-500">Unique Actions</p>
            <p class="text-2xl font-bold text-purple-600">{{ $actions->count() }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-4">
            <p class="text-xs text-gray-500">Today</p>
            <p class="text-2xl font-bold text-orange-600">{{ $logs->where('created_at', '>=', today())->count() }}</p>
        </div>
    </div>
    
    <!-- Logs Table -->
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    @forelse($logs as $log)
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm text-gray-900">{{ $log->id }}</td>
                        <td class="px-4 py-3">
                            <div class="flex items-center">
                                <div class="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                    <i class="fas fa-user text-white text-xs"></i>
                                </div>
                                <span class="ml-2 text-sm text-gray-700">{{ $log->user ? $log->user->name : 'System' }}</span>
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            <span class="px-2 py-1 text-xs rounded-full 
                                {{ $log->action == 'login' ? 'bg-green-100 text-green-800' : '' }}
                                {{ $log->action == 'logout' ? 'bg-yellow-100 text-yellow-800' : '' }}
                                {{ str_contains($log->action, 'create') ? 'bg-blue-100 text-blue-800' : '' }}
                                {{ str_contains($log->action, 'update') ? 'bg-purple-100 text-purple-800' : '' }}
                                {{ str_contains($log->action, 'delete') ? 'bg-red-100 text-red-800' : '' }}">
                                {{ ucfirst(str_replace('_', ' ', $log->action)) }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{{ $log->description }}</td>
                        <td class="px-4 py-3 text-sm font-mono text-gray-500">{{ $log->ip_address ?? 'N/A' }}</td>
                        <td class="px-4 py-3 text-sm text-gray-500">
                            {{ $log->created_at ? date('M d, Y H:i:s', strtotime($log->created_at)) : 'N/A' }}
                        </td>
                        <td class="px-4 py-3">
                            <a href="{{ route('logs.view-activity', $log->id) }}" class="text-blue-600 hover:text-blue-900">
                                <i class="fas fa-file-lines"></i>
                            </a>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                            <i class="fas fa-history fa-3x mb-3 text-gray-300"></i>
                            <p>No activity logs found</p>
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        
        @if($logs->hasPages())
            <div class="px-4 py-3 bg-gray-50 border-t">
                {{ $logs->appends(request()->query())->links() }}
            </div>
        @endif
    </div>
</div>

<script>
async function confirmClear() {
    if (await appConfirm('⚠️ WARNING: This will permanently delete ALL activity logs. This action cannot be undone. Are you sure?')) {
        window.location.href = "{{ route('logs.clear.activity') }}";
    }
}
</script>
@endsection
