@extends('layouts.app')

@section('title', 'Pages Management')
@section('page-title', 'Page Management')
@section('content')
<div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h1 class="text-3xl font-bold text-gray-800">Pages Management</h1>
            <p class="text-gray-600 mt-1">Manage system pages and their features</p>
        </div>
        <a href="{{ route('pages.create') }}" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition flex items-center">
            <i class="fas fa-plus-circle mr-2"></i>
            Add New Page
        </a>
    </div>
    
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Icon</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Display Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Features</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sort Order</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    @forelse($pages as $page)
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4">
                            <i class="fas {{ $page->icon }} text-xl text-blue-600"></i>
                        </td>
                        <td class="px-6 py-4">
                            <span class="font-mono text-sm">{{ $page->name }}</span>
                        </td>
                        <td class="px-6 py-4 font-medium">{{ $page->display_name }}</td>
                        <td class="px-6 py-4 text-sm text-gray-500">{{ $page->route ?? '-' }}</td>
                        <td class="px-6 py-4">
                            <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                {{ $page->features->count() }} features
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm">{{ $page->sort_order }}</td>
                        <td class="px-6 py-4">
                            @if($page->is_active)
                                <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
                            @else
                                <span class="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Inactive</span>
                            @endif
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex space-x-2">
                                <a href="{{ route('pages.features', $page->id) }}" class="text-purple-600 hover:text-purple-800" title="Manage Features">
                                    <i class="fas fa-list"></i>
                                </a>
                                <a href="{{ route('pages.edit', $page->id) }}" class="text-blue-600 hover:text-blue-800" title="Edit Page">
                                    <i class="fas fa-edit"></i>
                                </a>
                                <form action="{{ route('pages.destroy', $page->id) }}" method="POST" class="inline" onsubmit="return confirmSubmit(event, 'Delete this page?')">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="text-red-600 hover:text-red-800" title="Delete Page">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </form>
                            </div>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="8" class="px-6 py-8 text-center text-gray-500">No pages found</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
