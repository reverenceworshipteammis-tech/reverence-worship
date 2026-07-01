@extends('layouts.app')

@section('title', 'Intercession & Spiritual Growth')
@section('page-title', 'Intercession & Spiritual Growth')

@section('content')
<div class="max-w-7xl mx-auto space-y-6">

   

    {{-- TABS --}}
    @php
        $hasForms = auth()->check() && auth()->user()->canAccess('intercession', 'view-forms');
        $hasDevotions = auth()->check() && auth()->user()->canAccess('intercession', 'view-devotions');
        $hasActions = auth()->check() && auth()->user()->canAccess('intercession', 'view-actions');
        $hasArchives = auth()->check() && auth()->user()->canAccess('intercession', 'view-archives');
    @endphp

    @if($hasForms || $hasDevotions || $hasActions || $hasArchives)
    <div class="border-b border-gray-200">
        <nav class="flex space-x-8 overflow-x-auto">
            @if($hasForms)
            <button type="button" onclick="showTab('forms')" id="tab-forms" class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition">
                <i class="fas fa-file-alt mr-2"></i>Forms
            </button>
            @endif
            
            @if($hasDevotions)
            <button type="button" onclick="showTab('devotions')" id="tab-devotions" class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition">
                <i class="fas fa-praying-hands mr-2"></i>Devotions
            </button>
            @endif
            
            @if($hasActions)
            <button type="button" onclick="showTab('actions')" id="tab-actions" class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition">
                <i class="fas fa-tasks mr-2"></i>Action Plans
            </button>
            @endif
            
            @if($hasArchives)
            <button type="button" onclick="showTab('archives')" id="tab-archives" class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition">
                <i class="fas fa-archive mr-2"></i>Archives
            </button>
            @endif
        </nav>
    </div>
    @endif

    {{-- FORMS TAB --}}
    @if($hasForms)
    <div id="forms-tab" class="tab-content">
        @include('modules.intercession.partials.forms')
    </div>
    @endif

    {{-- DEVOTIONS TAB --}}
    @if($hasDevotions)
    <div id="devotions-tab" class="tab-content hidden">
        @include('modules.intercession.partials.devotions')
    </div>
    @endif

    {{-- ACTION PLANS TAB --}}
    @if($hasActions)
    <div id="actions-tab" class="tab-content hidden">
        @include('modules.intercession.partials.actions')
    </div>
    @endif

    {{-- ARCHIVES TAB --}}
    @if($hasArchives)
    <div id="archives-tab" class="tab-content hidden">
        @include('modules.intercession.partials.archives-tab')
    </div>
    @endif

    {{-- NO PERMISSION MESSAGE --}}
    @if(!$hasForms && !$hasDevotions && !$hasActions && !$hasArchives)
    <div class="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-lock text-gray-400 text-3xl"></i>
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">No Access</h3>
        <p class="text-gray-500 text-sm">You don't have permission to view this page.</p>
        <p class="text-gray-400 text-xs mt-2">Contact your administrator to grant access.</p>
    </div>
    @endif

</div>

{{-- MODALS - Include at the bottom of the page --}}
<script>
    // Function to switch tabs with persistence
    window.showTab = function(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });

        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-blue-600', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });

        // Show selected tab
        const selectedTab = document.getElementById(`${tabName}-tab`);
        if (selectedTab) {
            selectedTab.classList.remove('hidden');
        }

        // Activate selected button
        const selectedBtn = document.getElementById(`tab-${tabName}`);
        if (selectedBtn) {
            selectedBtn.classList.remove('border-transparent', 'text-gray-500');
            selectedBtn.classList.add('border-blue-600', 'text-blue-600');
        }

        // Save current tab to localStorage
        localStorage.setItem('activeIntercessionTab', tabName);
    }

    // On page load, restore the last active tab
    document.addEventListener('DOMContentLoaded', function() {
        const savedTab = localStorage.getItem('activeIntercessionTab');
        const validTabs = [];
        
        @if($hasForms) validTabs.push('forms'); @endif
        @if($hasDevotions) validTabs.push('devotions'); @endif
        @if($hasActions) validTabs.push('actions'); @endif
        @if($hasArchives) validTabs.push('archives'); @endif

        if (savedTab && validTabs.includes(savedTab)) {
            showTab(savedTab);
        } else if (validTabs.length > 0) {
            // Default to first available tab
            showTab(validTabs[0]);
        }
    });
</script>

<style>
    .tab-btn {
        transition: all 0.3s ease;
    }
    .tab-btn:hover {
        opacity: 0.8;
    }
</style>
@endsection
