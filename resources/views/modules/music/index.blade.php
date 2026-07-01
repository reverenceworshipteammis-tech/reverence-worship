@extends('layouts.app')

@section('title', 'Music & Evangelism')
@section('page-title', 'Music & Evangelism')

@section('content')
<div class="max-w-7xl mx-auto">
    @if(!auth()->user()->canAccess('music-ministry', 'access'))
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md">
            <div class="flex items-center">
                <i class="fas fa-lock text-red-500 text-2xl mr-3"></i>
                <div>
                    <h3 class="font-bold">Access Denied</h3>
                    <p>You do not have permission to access the Music & Evangelism module.</p>
                </div>
            </div>
        </div>
    @else
       

        <!-- Tab Navigation - Show only tabs user has permission to VIEW -->
        <div class="mb-6">
            <div class="border-b border-gray-200">
                <nav class="flex space-x-8 overflow-x-auto">
                    @if(auth()->user()->canAccess('music-ministry', 'view-playlist-tab'))
                    <button onclick="showTab('playlist')" id="tab-playlist" 
                            class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition whitespace-nowrap">
                        <i class="fas fa-list mr-2"></i>Playlist
                    </button>
                    @endif
                    
                    @if(auth()->user()->canAccess('music-ministry', 'view-gallery-tab'))
                    <button onclick="showTab('gallery')" id="tab-gallery" 
                            class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition whitespace-nowrap">
                        <i class="fas fa-images mr-2"></i>Photo Gallery
                    </button>
                    @endif
                    
                    @if(auth()->user()->canAccess('music-ministry', 'view-groups-tab'))
                    <button onclick="showTab('groups')" id="tab-groups" 
                            class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition whitespace-nowrap">
                        <i class="fas fa-users mr-2"></i>Groups
                    </button>
                    @endif
                    
                    @if(auth()->user()->canAccess('music-ministry', 'view-board-tab'))
                    <button onclick="showTab('board')" id="tab-board" 
                            class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition whitespace-nowrap">
                        <i class="fas fa-bullhorn mr-2"></i>Public Board
                    </button>
                    @endif

                    @if(auth()->user()->canAccess('music-ministry', 'view-actionplan'))
                    <button onclick="showTab('actionPlan')" id="tab-actionPlan" 
                            class="tab-btn py-2 px-1 border-b-2 font-medium text-sm transition whitespace-nowrap">
                        <i class="fas fa-tasks mr-2"></i>Action Plans
                    </button>
                    @endif
                </nav>
            </div>
        </div>

        <!-- Tab Contents -->
        @if(auth()->user()->canAccess('music-ministry', 'view-playlist-tab'))
        <div id="playlist-tab" class="tab-content">
            @include('modules.music.playlist', [
                'canViewSongs' => auth()->user()->canAccess('music-ministry', 'view-songs'),
                'canAddSongs' => auth()->user()->canAccess('music-ministry', 'add-songs'),
                'canEditSongs' => auth()->user()->canAccess('music-ministry', 'edit-songs'),
                'canDeleteSongs' => auth()->user()->canAccess('music-ministry', 'delete-songs'),
                'canViewPlaylists' => auth()->user()->canAccess('music-ministry', 'view-playlists'),
                'canAddPlaylists' => auth()->user()->canAccess('music-ministry', 'add-playlists'),
                'canEditPlaylists' => auth()->user()->canAccess('music-ministry', 'edit-playlists'),
                'canDeletePlaylists' => auth()->user()->canAccess('music-ministry', 'delete-playlists')
            ])
        </div>
        @endif

        @if(auth()->user()->canAccess('music-ministry', 'view-gallery-tab'))
        <div id="gallery-tab" class="tab-content hidden">
            @include('modules.music.gallery', [
                'canView' => auth()->user()->canAccess('music-ministry', 'view-gallery'),
                'canAdd' => auth()->user()->canAccess('music-ministry', 'add-gallery'),
                'canEdit' => auth()->user()->canAccess('music-ministry', 'edit-gallery'),
                'canDelete' => auth()->user()->canAccess('music-ministry', 'delete-gallery')
            ])
        </div>
        @endif

        @if(auth()->user()->canAccess('music-ministry', 'view-groups-tab'))
        <div id="groups-tab" class="tab-content hidden">
            @include('modules.music.groups', [
                'canView' => auth()->user()->canAccess('music-ministry', 'view-groups'),
                'canAdd' => auth()->user()->canAccess('music-ministry', 'add-groups'),
                'canEdit' => auth()->user()->canAccess('music-ministry', 'edit-groups'),
                'canDelete' => auth()->user()->canAccess('music-ministry', 'delete-groups')
            ])
        </div>
        @endif

        @if(auth()->user()->canAccess('music-ministry', 'view-board-tab'))
        <div id="board-tab" class="tab-content hidden">
            @include('modules.music.board', [
                'canView' => auth()->user()->canAccess('music-ministry', 'view-board'),
                'canAdd' => auth()->user()->canAccess('music-ministry', 'add-board'),
                'canEdit' => auth()->user()->canAccess('music-ministry', 'edit-board'),
                'canDelete' => auth()->user()->canAccess('music-ministry', 'delete-board')
            ])
        </div>
        @endif

        @if(auth()->user()->canAccess('music-ministry', 'view-actionplan'))
        <div id="actionPlan-tab" class="tab-content hidden">
            @include('modules.music.actionplan')
        </div>
        @endif
    @endif
</div>

<script>
// Function to show tab with persistence
function showTab(tabName) {
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
    const activeBtn = document.getElementById(`tab-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('border-transparent', 'text-gray-500');
        activeBtn.classList.add('border-blue-600', 'text-blue-600');
    }
    
    // Save current tab to localStorage
    localStorage.setItem('activeMusicTab', tabName);
}

// On page load, restore the last active tab
document.addEventListener('DOMContentLoaded', function() {
    const savedTab = localStorage.getItem('activeMusicTab');
    const validTabs = ['playlist', 'gallery', 'groups', 'board', 'actionPlan'];
    
    // Check if saved tab exists and user has permission
    if (savedTab && validTabs.includes(savedTab)) {
        // Check if the tab button exists (user has permission)
        const tabButton = document.getElementById(`tab-${savedTab}`);
        if (tabButton) {
            showTab(savedTab);
        } else {
            // Default to first available tab
            const firstTab = document.querySelector('.tab-btn');
            if (firstTab) {
                const firstTabId = firstTab.id.replace('tab-', '');
                showTab(firstTabId);
            }
        }
    } else {
        // Default to first available tab
        const firstTab = document.querySelector('.tab-btn');
        if (firstTab) {
            const firstTabId = firstTab.id.replace('tab-', '');
            showTab(firstTabId);
        }
    }
});
</script>

<style>
.tab-btn {
    transition: all 0.3s ease;
}
.tab-btn:hover {
    color: #2563eb;
}
.modal { display: none; }
.modal:not(.hidden) { display: block !important; }
</style>
@endsection
