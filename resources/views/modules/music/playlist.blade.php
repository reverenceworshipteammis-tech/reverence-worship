@props([
    'canViewSongs' => false,
    'canAddSongs' => false,
    'canEditSongs' => false,
    'canDeleteSongs' => false,
    'canViewPlaylists' => false,
    'canAddPlaylists' => false,
    'canEditPlaylists' => false,
    'canDeletePlaylists' => false
])

<div class="bg-white rounded-lg shadow-lg p-6">
    <!-- Add to Playlist Section -->
    @if($canEditPlaylists && $canViewSongs)
    <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
            <i class="fas fa-plus-circle text-blue-600 mr-2"></i>
            Add Song to Playlist
        </h4>
        <div class="flex flex-col sm:flex-row gap-3">
            <select id="playlistSelect" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Playlist</option>
                @foreach($playlists ?? [] as $playlist)
                    <option value="{{ $playlist->id }}">{{ $playlist->title }} ({{ $playlist->songs->count() }} songs)</option>
                @endforeach
            </select>
            <select id="songSelect" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Song</option>
                @foreach($songs ?? [] as $song)
                    <option value="{{ $song->id }}">{{ $song->title }}</option>
                @endforeach
            </select>
            <button onclick="addToPlaylist()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
                <i class="fas fa-plus mr-2"></i> Add to Playlist
            </button>
        </div>
    </div>
    @endif

    <div class="flex flex-col lg:flex-row gap-6">
        <!-- PLAYLISTS COLUMN - Fixed height with scroll -->
        <div class="lg:w-1/2">
            <div class="flex justify-between items-center mb-3 pb-2 border-b">
                <h4 class="font-semibold text-gray-700">
                    <i class="fas fa-list text-blue-600 mr-2"></i>Playlists
                    <span class="text-xs text-gray-400 ml-2">({{ count($playlists ?? []) }} total)</span>
                </h4>
                @if($canAddPlaylists)
                <button onclick="openCreatePlaylistModal()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs transition">
                    <i class="fas fa-plus-circle mr-1"></i> New Playlist
                </button>
                @endif
            </div>
            
            <div class="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                @forelse($playlists ?? [] as $playlist)
                    <div class="border rounded-lg p-3 hover:bg-gray-50 transition">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h5 class="font-medium text-gray-800">{{ $playlist->title }}</h5>
                                <p class="text-xs text-gray-500">{{ $playlist->songs->count() }} songs</p>
                                @if($playlist->description)
                                    <p class="text-xs text-gray-400 mt-1">{{ Str::limit($playlist->description, 50) }}</p>
                                @endif
                            </div>
                            <div class="flex space-x-2">
                                @if($canViewPlaylists)
                                <button onclick="viewPlaylistSongs({{ $playlist->id }})" class="text-green-600 hover:text-green-800 transition" title="View Songs">
                                    <i class="fas fa-file-lines"></i>
                                </button>
                                @endif
                                @if($canEditPlaylists)
                                <a href="{{ route('music.playlist.edit', $playlist->id) }}" class="text-blue-600 hover:text-blue-800 transition" title="Edit Playlist">
                                    <i class="fas fa-edit"></i>
                                </a>
                                @endif
                                @if($canDeletePlaylists)
                                <form action="{{ route('music.playlist.delete', $playlist->id) }}" method="POST" class="inline" 
                                      onsubmit="return confirmSubmit(event, 'Delete playlist \"{{ $playlist->title }}\"?')">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="text-red-600 hover:text-red-800 transition" title="Delete Playlist">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </form>
                                @endif
                            </div>
                        </div>
                    </div>
                @empty
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-list fa-3x mb-2 text-gray-300"></i>
                        <p>No playlists yet</p>
                        @if($canAddPlaylists)
                        <button onclick="openCreatePlaylistModal()" class="mt-2 text-blue-600 text-sm hover:underline">
                            Create your first playlist
                        </button>
                        @endif
                    </div>
                @endforelse
            </div>
        </div>
        
        <!-- SONGS COLUMN - Fixed height with search and scroll -->
        <div class="lg:w-1/2">
            <div class="flex justify-between items-center mb-3 pb-2 border-b">
                <h4 class="font-semibold text-gray-700">
                    <i class="fas fa-music text-green-600 mr-2"></i>Songs
                    <span class="text-xs text-gray-400 ml-2">({{ count($songs ?? []) }} total)</span>
                </h4>
                @if($canAddSongs)
                <button onclick="openCreateSongModal()" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs transition">
                    <i class="fas fa-plus-circle mr-1"></i> Add Song
                </button>
                @endif
            </div>
            
            <!-- Song Search Bar -->
            <div class="relative mb-3">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input type="text" id="songsSearchInput" placeholder="Search songs by title or key..." 
                       class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            </div>
            
            <div id="songsListContainer" class="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                @forelse($songs ?? [] as $song)
                    <div class="song-item border rounded-lg p-3 hover:bg-gray-50 transition" 
                         data-title="{{ strtolower($song->title) }}" 
                         data-artist="{{ strtolower($song->artist ?? '') }}"
                         data-key="{{ strtolower($song->key_signature ?? '') }}"
                         data-singer="{{ strtolower($song->assigned_singer ?? '') }}">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <h5 class="font-medium text-gray-800">{{ $song->title }}</h5>
                                <div class="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                                    @if($song->key_signature)
                                        <span><i class="fas fa-music"></i> Key: {{ $song->key_signature }}</span>
                                    @endif
                                    @if($song->tempo)
                                        <span><i class="fas fa-tachometer-alt"></i> {{ $song->tempo }} BPM</span>
                                    @endif
                                </div>
                            </div>
                            <div class="flex space-x-2 ml-2">
                                @if($canViewSongs)
                                <button onclick="viewLyrics({{ $song->id }})" class="text-green-600 hover:text-green-800 transition" title="View Lyrics">
                                    <i class="fas fa-file-alt"></i>
                                </button>
                                @endif
                                @if($canEditSongs)
                                <a href="{{ route('music.song.edit', $song->id) }}" class="text-blue-600 hover:text-blue-800 transition" title="Edit Song">
                                    <i class="fas fa-edit"></i>
                                </a>
                                @endif
                                @if($canDeleteSongs)
                                <form action="{{ route('music.song.delete', $song->id) }}" method="POST" class="inline" 
                                      onsubmit="return confirmSubmit(event, 'Delete song \"{{ $song->title }}\"?')">
                                    @csrf
                                    @method('DELETE')
                                    <button type="submit" class="text-red-600 hover:text-red-800 transition" title="Delete Song">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </form>
                                @endif
                            </div>
                        </div>
                    </div>
                @empty
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-music fa-3x mb-2 text-gray-300"></i>
                        <p>No songs yet</p>
                        @if($canAddSongs)
                        <button onclick="openCreateSongModal()" class="mt-2 text-green-600 text-sm hover:underline">
                            Add your first song
                        </button>
                        @endif
                    </div>
                @endforelse
            </div>
            
            <!-- No results message -->
            <div id="noSongsResults" class="text-center text-gray-500 py-8 hidden">
                <i class="fas fa-search fa-3x mb-2 text-gray-300"></i>
                <p>No songs match your search</p>
            </div>
        </div>
    </div>
</div>

<!-- Create Playlist Modal -->
<div id="createPlaylistModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-xl font-bold text-gray-800">Create New Playlist</h3>
            <button onclick="closeModal('createPlaylistModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <form method="POST" action="{{ route('music.playlist.store') }}" id="createPlaylistForm">
            @csrf
            <div class="mt-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Playlist Title *</label>
                    <input type="text" name="title" id="playlistTitle" required 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" id="playlistDescription" rows="2" 
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
                </div>
                
                <!-- Add Songs Section with Search -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Add Songs to Playlist</label>
                    
                    <!-- Search Bar -->
                    <div class="relative mb-3">
                        <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                <input type="text" id="playlistSongSearchInput" placeholder="Search songs by title or key..." 
                       class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div class="border rounded-lg p-3 max-h-64 overflow-y-auto bg-gray-50">
                        <div class="mb-2 pb-2 border-b flex justify-between items-center">
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" id="selectAllSongs" class="rounded border-gray-300 text-blue-600">
                                <span class="text-sm font-medium text-gray-700">Select All Songs</span>
                            </label>
                            <span id="selectedCount" class="text-xs text-gray-500">0 selected</span>
                        </div>
                        <div id="playlistSongsListContainer" class="space-y-1">
                            @foreach($songs ?? [] as $song)
                            <label class="song-select-item flex items-center space-x-2 p-2 hover:bg-white rounded cursor-pointer transition" 
                                   data-title="{{ strtolower($song->title) }}" 
                                   data-artist="{{ strtolower($song->artist ?? '') }}"
                                   data-key="{{ strtolower($song->key_signature ?? '') }}">
                                <input type="checkbox" name="songs[]" value="{{ $song->id }}" 
                                       class="song-checkbox rounded border-gray-300 text-blue-600">
                                <div class="flex-1">
                                    <span class="text-sm font-medium text-gray-700">{{ $song->title }}</span>
                                    <div class="text-xs text-gray-400">
                                        @if($song->key_signature)
                                            <span class="mr-2">Key: {{ $song->key_signature }}</span>
                                        @endif
                                        @if($song->tempo)
                                            <span>Tempo: {{ $song->tempo }} BPM</span>
                                        @endif
                                    </div>
                                </div>
                            </label>
                            @endforeach
                        </div>
                        @if(($songs ?? [])->isEmpty())
                            <div class="text-center text-gray-500 py-4">
                                <i class="fas fa-music fa-2x mb-2 text-gray-300"></i>
                                <p>No songs available</p>
                                <button type="button" onclick="closeModal('createPlaylistModal'); openCreateSongModal();" 
                                        class="mt-2 text-blue-600 text-sm hover:underline">
                                    Create a song first
                                </button>
                            </div>
                        @endif
                    </div>
                </div>
            </div>
            
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onclick="closeModal('createPlaylistModal')" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                    Cancel
                </button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <i class="fas fa-save mr-2"></i> Create Playlist
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Create Song Modal -->
<div id="createSongModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-xl font-bold text-gray-800">Add New Song</h3>
            <button onclick="closeModal('createSongModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <form method="POST" action="{{ route('music.song.store') }}" id="createSongForm">
            @csrf
            <div class="mt-4 grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Song Title *</label>
                    <input type="text" name="title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Key Signature</label>
                    <input type="text" name="key_signature" placeholder="C, G, D, etc" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tempo (BPM)</label>
                    <input type="number" name="tempo" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Lyrics</label>
                    <textarea name="lyrics" rows="5" class="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"></textarea>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onclick="closeModal('createSongModal')" class="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-lg">Save Song</button>
            </div>
        </form>
    </div>
</div>

<!-- View Playlist Songs Modal -->
<div id="viewPlaylistModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="viewPlaylistTitle" class="text-xl font-bold text-gray-800">Playlist Songs</h3>
            <button type="button" onclick="closeModal('viewPlaylistModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <div id="viewPlaylistContent" class="mt-4 max-h-96 overflow-y-auto"></div>
        <div class="flex justify-end mt-4 pt-3 border-t">
            <button type="button" onclick="closeModal('viewPlaylistModal')" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Close</button>
        </div>
    </div>
</div>

<div id="lyricsModal" class="modal hidden fixed inset-0 z-[1100] bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
    <div class="min-h-full w-full flex items-start justify-center px-4 py-8 sm:py-12">
        <div class="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_120px_rgba(15,23,42,0.28)] ring-1 ring-slate-200">
            <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 sm:px-8 py-5">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">Song Lyrics</p>
                    <h3 id="lyricsModalTitle" class="mt-2 text-2xl font-bold tracking-tight text-slate-900">Lyrics</h3>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" id="copyLyricsBtn" onclick="copyCurrentLyrics()" class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                        <i class="fas fa-copy"></i>
                        Copy Lyrics
                    </button>
                    <button type="button" onclick="closeModal('lyricsModal')" class="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
            </div>

            <div class="px-6 sm:px-8 py-6">
                <div class="grid gap-4 sm:grid-cols-2">
                    <div class="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Key</p>
                        <p id="lyricsKey" class="mt-1 text-sm font-medium text-slate-900">-</p>
                    </div>
                    <div class="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tempo</p>
                        <p id="lyricsTempo" class="mt-1 text-sm font-medium text-slate-900">-</p>
                    </div>
                </div>

                <div class="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50/80">
                    <div class="border-b border-slate-200 px-5 py-4">
                        <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-700">Lyrics</h4>
                    </div>
                    <div class="max-h-[60vh] overflow-y-auto px-5 py-5">
                        <pre id="lyricsText" class="whitespace-pre-wrap text-[15px] leading-7 text-slate-700 font-sans">Select a song to view lyrics.</pre>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// Song search functionality for main songs list
function initializeSongSearch() {
    const searchInput = document.getElementById('songsSearchInput');
    const songsContainer = document.getElementById('songsListContainer');
    const noResultsDiv = document.getElementById('noSongsResults');
    
    if (!searchInput || !songsContainer) return;
    
    searchInput.addEventListener('keyup', function() {
        const searchTerm = this.value.toLowerCase();
        const songItems = songsContainer.querySelectorAll('.song-item');
        let visibleCount = 0;
        
        songItems.forEach(item => {
            const title = item.dataset.title || '';
            const artist = item.dataset.artist || '';
            const key = item.dataset.key || '';
            const singer = item.dataset.singer || '';
            
            if (title.includes(searchTerm) || artist.includes(searchTerm) || key.includes(searchTerm) || singer.includes(searchTerm)) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });
        
        if (noResultsDiv) {
            if (visibleCount === 0 && searchTerm !== '') {
                noResultsDiv.classList.remove('hidden');
                songsContainer.classList.add('hidden');
            } else {
                noResultsDiv.classList.add('hidden');
                songsContainer.classList.remove('hidden');
            }
        }
    });
}

// Search for songs in playlist modal
let playlistSearchInput, playlistSongItems, songCheckboxes, selectAllCheckbox, selectedCountSpan;

function initializePlaylistSearch() {
    playlistSearchInput = document.getElementById('playlistSongSearchInput');
    playlistSongItems = document.querySelectorAll('.song-select-item');
    songCheckboxes = document.querySelectorAll('.song-checkbox');
    selectAllCheckbox = document.getElementById('selectAllSongs');
    selectedCountSpan = document.getElementById('selectedCount');
    
    function updateSelectedCount() {
        const checked = document.querySelectorAll('#playlistSongsListContainer .song-checkbox:checked').length;
        if (selectedCountSpan) {
            selectedCountSpan.textContent = checked + ' selected';
        }
        if (selectAllCheckbox) {
            const total = document.querySelectorAll('#playlistSongsListContainer .song-checkbox').length;
            if (total > 0) {
                selectAllCheckbox.checked = checked === total;
                selectAllCheckbox.indeterminate = checked > 0 && checked < total;
            }
        }
    }
    
    if (playlistSearchInput) {
        playlistSearchInput.addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();
            let visibleCount = 0;
            
            playlistSongItems.forEach(item => {
                const title = item.dataset.title || '';
                const artist = item.dataset.artist || '';
                const key = item.dataset.key || '';
                
                if (title.includes(searchTerm) || artist.includes(searchTerm) || key.includes(searchTerm)) {
                    item.style.display = '';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });
            
            let noResultsMsg = document.getElementById('noPlaylistResults');
            if (visibleCount === 0 && searchTerm !== '') {
                if (!noResultsMsg) {
                    const container = document.getElementById('playlistSongsListContainer');
                    const msg = document.createElement('div');
                    msg.id = 'noPlaylistResults';
                    msg.className = 'text-center text-gray-500 py-4';
                    msg.innerHTML = '<i class="fas fa-search fa-2x mb-2 text-gray-300"></i><p>No songs match your search</p>';
                    container.appendChild(msg);
                }
            } else if (noResultsMsg) {
                noResultsMsg.remove();
            }
        });
    }
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const visibleCheckboxes = document.querySelectorAll('#playlistSongsListContainer .song-select-item:not([style*="display: none"]) .song-checkbox');
            visibleCheckboxes.forEach(cb => {
                cb.checked = selectAllCheckbox.checked;
            });
            updateSelectedCount();
        });
    }
    
    songCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateSelectedCount);
    });
    
    updateSelectedCount();
}

function openCreatePlaylistModal() {
    const titleInput = document.getElementById('playlistTitle');
    const descInput = document.getElementById('playlistDescription');
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    
    if (playlistSearchInput) playlistSearchInput.value = '';
    
    if (playlistSongItems) {
        playlistSongItems.forEach(item => {
            item.style.display = '';
        });
    }
    
    if (songCheckboxes) {
        songCheckboxes.forEach(cb => {
            cb.checked = false;
        });
    }
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
    
    if (selectedCountSpan) {
        selectedCountSpan.textContent = '0 selected';
    }
    
    const noResultsMsg = document.getElementById('noPlaylistResults');
    if (noResultsMsg) noResultsMsg.remove();
    
    const modal = document.getElementById('createPlaylistModal');
    if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.setProperty('display', 'none', 'important');
        document.body.style.overflow = '';
    }
}

function openCreateSongModal() {
    const modal = document.getElementById('createSongModal');
    if (modal) modal.classList.remove('hidden');
}

function viewLyrics(songId) {
    fetch(`/music/song/${songId}/lyrics`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to load lyrics');
        }

        return data.song;
    })
    .then(song => {
        document.getElementById('lyricsModalTitle').textContent = song.title || 'Lyrics';
        document.getElementById('lyricsKey').textContent = song.key_signature || '-';
        document.getElementById('lyricsTempo').textContent = song.tempo ? `${song.tempo} BPM` : '-';
        document.getElementById('lyricsText').textContent = song.lyrics || 'No lyrics available.';
        document.getElementById('lyricsModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    })
    .catch(error => {
        console.error('Error loading lyrics:', error);
        appAlert('Could not load lyrics: ' + error.message);
    });
}

function copyCurrentLyrics() {
    const lyricsText = document.getElementById('lyricsText')?.textContent || '';
    if (!lyricsText || lyricsText === 'No lyrics available.' || lyricsText === 'Select a song to view lyrics.') {
        appAlert('No lyrics to copy!');
        return;
    }

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(lyricsText)
            .then(() => appAlert('Lyrics copied to clipboard!'))
            .catch(() => fallbackCopyLyrics(lyricsText));
        return;
    }

    fallbackCopyLyrics(lyricsText);
}

function fallbackCopyLyrics(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        appAlert('Lyrics copied to clipboard!');
    } catch (error) {
        console.error('Copy lyrics failed:', error);
        appAlert('Unable to copy lyrics right now.');
    }
    document.body.removeChild(textarea);
}

function viewPlaylistSongs(playlistId) {
    fetch(`/music/playlist/${playlistId}/songs`)
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                appAlert(data.message || 'Error loading songs');
                return;
            }
            
            const titleElement = document.getElementById('viewPlaylistTitle');
            const contentElement = document.getElementById('viewPlaylistContent');
            
            if (titleElement) {
                titleElement.innerHTML = `<i class="fas fa-list mr-2"></i>${data.playlist_title} - Songs`;
            }
            
            if (!contentElement) return;
            
            if (data.songs.length === 0) {
                contentElement.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-music fa-3x mb-3 text-gray-300"></i>
                        <p>No songs in this playlist yet.</p>
                        @if($canEditPlaylists)
                        <a href="/music/playlist/${playlistId}/edit" class="inline-block mt-3 text-blue-600">Add songs</a>
                        @endif
                    </div>
                `;
            } else {
                let html = `<div class="space-y-2">`;
                data.songs.forEach((song, index) => {
                    html += `
                        <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div class="flex items-center space-x-3">
                                <span class="text-gray-400 text-sm w-6">${index + 1}</span>
                                <div>
                                    <p class="font-medium text-gray-800">${escapeHtml(song.title)}</p>
                                    <div class="flex flex-wrap gap-2 text-xs text-gray-500">
                                        ${song.key_signature ? `<span>Key: ${escapeHtml(song.key_signature)}</span>` : ''}
                                        ${song.tempo ? `<span>Tempo: ${escapeHtml(song.tempo)} BPM</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <button onclick="viewLyrics(${song.id})" class="text-green-600 hover:text-green-800" title="View Lyrics">
                                <i class="fas fa-file-alt"></i>
                            </button>
                        </div>
                    `;
                });
                html += `</div>`;
                contentElement.innerHTML = html;
            }
            
            const modal = document.getElementById('viewPlaylistModal');
            if (modal) modal.classList.remove('hidden');
        })
        .catch(error => {
            console.error('Error:', error);
            appAlert('Could not load playlist songs: ' + error.message);
        });
}

function addToPlaylist() {
    const playlistId = document.getElementById('playlistSelect')?.value;
    const songId = document.getElementById('songSelect')?.value;
    
    if (!playlistId || !songId) {
        appAlert('Please select both a playlist and a song');
        return;
    }
    
    fetch('/music/add-to-playlist', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({
            playlist_id: playlistId,
            song_id: songId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            appAlert('Song added to playlist!');
            location.reload();
        } else {
            appAlert('Error: ' + (data.message || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error adding song to playlist');
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeSongSearch();
    initializePlaylistSearch();
    
    const createPlaylistForm = document.getElementById('createPlaylistForm');
    if (createPlaylistForm) {
        createPlaylistForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    appAlert('Playlist created with ' + (data.songs_added || 0) + ' songs!');
                    closeModal('createPlaylistModal');
                    location.reload();
                } else {
                    appAlert(data.message || 'Error creating playlist');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                appAlert('Error creating playlist');
            });
        });
    }
    
    const createSongForm = document.getElementById('createSongForm');
    if (createSongForm) {
        createSongForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    appAlert('Song added successfully!');
                    closeModal('createSongModal');
                    location.reload();
                } else {
                    appAlert(data.message || 'Error creating song');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                appAlert('Error creating song');
            });
        });
    }
});
</script>


