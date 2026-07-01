@extends('layouts.app')

@section('title', 'Error Logs')

@section('content')
<div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h1 class="text-3xl font-bold text-gray-800">Error Logs</h1>
            <p class="text-gray-600 mt-1">Track system errors and exceptions</p>
        </div>
        <button onclick="confirmClear()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition flex items-center">
            <i class="fas fa-trash-alt mr-2"></i>
            Clear All
        </button>
    </div>
    
    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-md p-4 mb-6">
        <form method="GET" action="{{ route('logs.errors') }}" class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Error Type</label>
                <select name="error_type" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">All Types</option>
                    @foreach($errorTypes as $type)
                        <option value="{{ $type }}" {{ request('error_type') == $type ? 'selected' : '' }}>
                            {{ $type }}
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
                    <input type="text" name="search" placeholder="Search message or file..." 
                           value="{{ request('search') }}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                </div>
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-search"></i>
                </button>
                <a href="{{ route('logs.errors') }}" class="bg-gray-500 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-sync-alt"></i>
                </a>
            </div>
        </form>
    </div>
    
    <!-- Stats Summary -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg shadow-md p-4">
            <p class="text-xs text-gray-500">Total Errors</p>
            <p class="text-2xl font-bold text-red-600">{{ $logs->total() }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-4">
            <p class="text-xs text-gray-500">Error Types</p>
            <p class="text-2xl font-bold text-purple-600">{{ $errorTypes->count() }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-4">
            <p class="text-xs text-gray-500">Today</p>
            <p class="text-2xl font-bold text-orange-600">{{ $logs->where('created_at', '>=', today())->count() }}</p>
        </div>
        <div class="bg-white rounded-lg shadow-md p-4">
            <p class="text-xs text-gray-500">Unique Files</p>
            <p class="text-2xl font-bold text-blue-600">{{ $logs->pluck('file_path')->unique()->count() }}</p>
        </div>
    </div>
    
    <!-- Error Logs Table -->
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Line</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    @forelse($logs as $log)
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm text-gray-900">{{ $log->id }}</td>
                        <td class="px-4 py-3">
                            <span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                {{ $log->error_type }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-600 max-w-md truncate">{{ $log->message }}</td>
                        <td class="px-4 py-3 text-sm font-mono text-gray-500 max-w-xs truncate">{{ basename($log->file_path ?? 'N/A') }}</td>
                        <td class="px-4 py-3 text-sm text-gray-500">{{ $log->line_number ?? 'N/A' }}</td>
                        <td class="px-4 py-3 text-sm">{{ $log->user ? $log->user->name : 'System' }}</td>
                        <td class="px-4 py-3 text-sm text-gray-500">
                            {{ $log->created_at ? $log->created_at->format('M d, Y H:i:s') : 'N/A' }}
                        </td>
                        <td class="px-4 py-3">
                            <a href="{{ route('logs.view-error', $log->id) }}" class="text-blue-600 hover:text-blue-900">
                                <i class="fas fa-file-lines"></i>
                            </a>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                            <i class="fas fa-bug fa-3x mb-3 text-gray-300"></i>
                            <p>No error logs found</p>
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
    if (await appConfirm('⚠️ WARNING: This will permanently delete ALL error logs. This action cannot be undone. Are you sure?')) {
        window.location.href = "{{ route('logs.clear.errors') }}";
    }
}
</script>
@endsection
