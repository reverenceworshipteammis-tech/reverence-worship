@extends('layouts.app')

@section('title', 'Manage Features - ' . $page->display_name)
@section('page-title', 'Page Management')
@section('content')
<div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h1 class="text-3xl font-bold text-gray-800">Manage Features</h1>
            <p class="text-gray-600 mt-1">Page: <strong>{{ $page->display_name }}</strong> <i class="fas {{ $page->icon }} ml-2"></i></p>
        </div>
        <div class="flex space-x-3">
            <a href="{{ route('pages.index') }}" class="text-gray-600 hover:text-gray-900">
                <i class="fas fa-arrow-left mr-2"></i> Back to Pages
            </a>
        </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Add New Feature Form -->
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Add New Feature</h3>
            <form method="POST" action="{{ route('pages.features.store', $page->id) }}">
                @csrf
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Feature Name (slug)</label>
                        <input type="text" name="name" required 
                               placeholder="view-songs"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <p class="text-xs text-gray-500 mt-1">Use lowercase with hyphens (e.g., view-songs, manage-events)</p>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                        <input type="text" name="display_name" required 
                               placeholder="View Songs"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea name="description" rows="2" 
                                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="What this feature allows the user to do..."></textarea>
                    </div>
                </div>
                
                <div class="flex justify-end mt-6">
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                        <i class="fas fa-plus-circle mr-2"></i> Add Feature
                    </button>
                </div>
            </form>
        </div>
        
        <!-- Existing Features List -->
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">Existing Features</h3>
            
            @if($features->count() > 0)
                <div class="space-y-3">
                    @foreach($features as $feature)
                        <div class="border rounded-lg p-3 hover:bg-gray-50">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="flex items-center">
                                        <i class="fas fa-check-circle text-green-500 mr-2"></i>
                                        <span class="font-medium text-gray-800">{{ $feature->display_name }}</span>
                                        <span class="ml-2 text-xs text-gray-400 font-mono">{{ $feature->name }}</span>
                                    </div>
                                    @if($feature->description)
                                        <p class="text-sm text-gray-500 mt-1 ml-6">{{ $feature->description }}</p>
                                    @endif
                                </div>
                                <div class="flex space-x-2">
                                    <a href="{{ route('pages.features.edit', [$page->id, $feature->id]) }}" 
                                       class="text-blue-600 hover:text-blue-800" title="Edit">
                                        <i class="fas fa-edit"></i>
                                    </a>
                                    <form action="{{ route('pages.features.destroy', [$page->id, $feature->id]) }}" 
                                          method="POST" class="inline" 
                                          onsubmit="return confirmSubmit(event, 'Delete this feature?')">
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="text-red-600 hover:text-red-800" title="Delete">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    @endforeach
                </div>
            @else
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-info-circle fa-2x mb-2"></i>
                    <p>No features added yet.</p>
                    <p class="text-sm">Use the form to add features like "View", "Create", "Edit", "Delete" etc.</p>
                </div>
            @endif
        </div>
    </div>
</div>
@endsection
