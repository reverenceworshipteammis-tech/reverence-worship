<div class="bg-white rounded-lg shadow-lg p-6">
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-gray-800">Landing Page Content Manager</h3>
    </div>

    <nav class="flex flex-wrap gap-2 border-b border-gray-200 mb-5" aria-label="Public Board content">
        <button type="button" onclick="switchTab('youtube')" id="tabYoutube" class="board-tab px-4 py-2.5 text-sm font-semibold text-black border-b-2 border-black">
            <i class="fab fa-youtube mr-1.5"></i> Video
        </button>
        <button type="button" onclick="switchTab('featured')" id="tabFeatured" class="board-tab px-4 py-2.5 text-sm font-semibold text-gray-500 border-b-2 border-transparent">
            <i class="fas fa-image mr-1.5"></i> Image
        </button>
        <button type="button" onclick="switchTab('events')" id="tabEvents" class="board-tab px-4 py-2.5 text-sm font-semibold text-gray-500 border-b-2 border-transparent">
            <i class="fas fa-calendar-alt mr-1.5"></i> Events & Updates
        </button>
    </nav>
    
    <!-- YouTube Videos Tab -->
    <div id="youtubeTab" class="board-panel border rounded-xl p-4">
        <div class="flex justify-between items-center mb-3">
            <h4 class="font-semibold text-gray-700">YouTube Videos</h4>
            <button onclick="openYouTubeModal()" class="bg-[#365f7d] hover:bg-[#294b64] text-white px-3 py-1 rounded-lg text-xs">
                <i class="fab fa-youtube mr-1"></i> Add YouTube Video
            </button>
        </div>
        
        <div id="youtubeList" class="space-y-2 max-h-96 overflow-y-auto">
            @forelse($youtubeVideos ?? [] as $video)
            <div class="youtube-item border rounded-lg p-3 hover:bg-gray-50 transition cursor-move" data-id="{{ $video->id }}" data-order="{{ $video->sort_order }}">
                <div class="flex justify-between items-start">
                    <div class="flex flex-1 gap-3 min-w-0">
                        <a href="https://www.youtube.com/watch?v={{ urlencode($video->youtube_id) }}" target="_blank" rel="noopener" class="relative w-32 h-20 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 group" title="Preview on YouTube">
                            <img src="https://i.ytimg.com/vi/{{ urlencode($video->youtube_id) }}/mqdefault.jpg" alt="Preview of {{ $video->title }}" class="w-full h-full object-cover">
                            <span class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition"><i class="fas fa-play-circle text-white text-2xl"></i></span>
                        </a>
                        <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-grip-vertical text-gray-300 cursor-move"></i>
                            <h5 class="font-medium text-gray-800">{{ $video->title }}</h5>
                            @if($video->is_published)
                                <span class="text-xs bg-gray-100 text-black px-2 py-0.5 rounded-full">Published</span>
                            @else
                                <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>
                            @endif
                        </div>
                        <div class="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span><i class="fab fa-youtube"></i> YouTube ID: {{ $video->youtube_id }}</span>
                        </div>
                        <a href="https://www.youtube.com/watch?v={{ urlencode($video->youtube_id) }}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 mt-2 text-xs text-black hover:underline"><i class="fas fa-external-link-alt"></i> Open preview</a>
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="togglePublish({{ $video->id }}, 'youtube')" class="text-black hover:text-gray-600" title="{{ $video->is_published ? 'Hide from landing page' : 'Publish on landing page' }}" aria-label="{{ $video->is_published ? 'Hide video' : 'Publish video' }}">
                            <i class="fas {{ $video->is_published ? 'fa-eye-slash' : 'fa-eye' }}"></i>
                        </button>
                        <button onclick="editYouTube({{ $video->id }})" class="text-black hover:text-gray-600" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteItem({{ $video->id }}, 'youtube')" class="text-black hover:text-gray-600" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            @empty
            <div class="text-center text-gray-500 py-8">
                <i class="fab fa-youtube fa-3x mb-2 text-gray-300"></i>
                <p>No YouTube videos added yet</p>
                <button onclick="openYouTubeModal()" class="mt-2 text-black text-sm hover:underline">
                    Add your first video
                </button>
            </div>
            @endforelse
        </div>
    </div>
    
    <!-- Featured Images Tab -->
    <div id="featuredTab" class="board-panel hidden border rounded-xl p-4">
        <div class="flex justify-between items-center mb-3">
            <h4 class="font-semibold text-gray-700">Featured Images</h4>
            <button onclick="openFeaturedImageModal()" class="bg-[#365f7d] hover:bg-[#294b64] text-white px-3 py-1 rounded-lg text-xs">
                <i class="fas fa-upload mr-1"></i> Upload Image
            </button>
        </div>
        
        <div id="featuredList" class="space-y-2 max-h-96 overflow-y-auto">
            @forelse($featuredImages ?? [] as $image)
            <div class="featured-item border rounded-lg p-3 hover:bg-gray-50 transition cursor-move" data-id="{{ $image->id }}" data-order="{{ $image->sort_order }}">
                <div class="flex justify-between items-start">
                    <div class="flex-1 flex items-center gap-3">
                        <i class="fas fa-grip-vertical text-gray-300 cursor-move"></i>
                        <div class="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <img src="{{ asset($image->image_path) }}" alt="{{ $image->title }}" class="w-full h-full object-cover">
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                <h5 class="font-medium text-gray-800">{{ $image->title }}</h5>
                                @if($image->is_published)
                                    <span class="text-xs bg-gray-100 text-black px-2 py-0.5 rounded-full">Published</span>
                                @else
                                    <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>
                                @endif
                                @if($image->is_hero ?? false)
                                    <span class="text-xs bg-gray-100 text-black px-2 py-0.5 rounded-full"><i class="fas fa-star mr-1"></i>Hero</span>
                                @endif
                            </div>
                            @if($image->description)
                                <p class="text-xs text-gray-500 mt-1">{{ Str::limit($image->description, 60) }}</p>
                            @endif
                        </div>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="toggleHero({{ $image->id }})" class="text-black hover:text-gray-600" title="{{ ($image->is_hero ?? false) ? 'Remove from hero' : 'Add to hero' }}">
                            <i class="{{ ($image->is_hero ?? false) ? 'fas' : 'far' }} fa-star"></i>
                        </button>
                        <button onclick="togglePublish({{ $image->id }}, 'featured')" class="text-black hover:text-gray-600" title="{{ $image->is_published ? 'Hide from landing page' : 'Publish on landing page' }}">
                            <i class="fas {{ $image->is_published ? 'fa-eye-slash' : 'fa-eye' }}"></i>
                        </button>
                        <button onclick="editFeaturedImage({{ $image->id }})" class="text-black hover:text-gray-600" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteItem({{ $image->id }}, 'featured')" class="text-black hover:text-gray-600" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            @empty
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-image fa-3x mb-2 text-gray-300"></i>
                <p>No featured images added yet</p>
                <button onclick="openFeaturedImageModal()" class="mt-2 text-black text-sm hover:underline">
                    Upload your first image
                </button>
            </div>
            @endforelse
        </div>
    </div>

    <div id="eventsTab" class="board-panel hidden border rounded-xl p-4">
        <div class="flex justify-between items-center mb-3">
            <div>
                <h4 class="font-semibold text-gray-700">Events & Updates</h4>
                <p class="text-xs text-gray-500">Published items appear on the public landing page.</p>
            </div>
            <button onclick="openEventModal()" class="bg-[#365f7d] hover:bg-[#294b64] text-white px-3 py-1.5 rounded-lg text-xs">
                <i class="fas fa-plus mr-1"></i> Add Item
            </button>
        </div>
        <div class="space-y-3 max-h-[32rem] overflow-y-auto">
            @forelse($posts ?? [] as $post)
                <article class="border rounded-lg p-4 hover:bg-gray-50">
                    <div class="flex items-start justify-between gap-4">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2 mb-1">
                                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-black">{{ ucfirst($post->type ?? 'update') }}</span>
                                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-black">{{ ($post->is_published ?? false) ? 'Published' : 'Draft' }}</span>
                                @if($post->is_pinned)<span class="text-xs text-black"><i class="fas fa-thumbtack"></i> Pinned</span>@endif
                            </div>
                            <h5 class="font-semibold text-gray-800">{{ $post->title }}</h5>
                            @if($post->event_date)<p class="text-xs text-black mt-1"><i class="far fa-calendar mr-1"></i>{{ $post->event_date->format('d M Y, H:i') }}</p>@endif
                            <p class="text-sm text-gray-600 mt-2">{{ \Illuminate\Support\Str::limit($post->content, 150) }}</p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <button onclick="toggleBoardPublish({{ $post->id }})" class="text-black hover:text-gray-600" title="{{ ($post->is_published ?? false) ? 'Hide from landing page' : 'Publish on landing page' }}"><i class="fas {{ ($post->is_published ?? false) ? 'fa-eye-slash' : 'fa-eye' }}"></i></button>
                            <button onclick="toggleBoardPin({{ $post->id }})" class="text-black hover:text-gray-600" title="Pin/Unpin"><i class="fas fa-thumbtack"></i></button>
                            <button onclick="editBoardItem({{ $post->id }})" class="text-black hover:text-gray-600" title="Edit"><i class="fas fa-edit"></i></button>
                            <button onclick="deleteBoardItem({{ $post->id }})" class="text-black hover:text-gray-600" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </article>
            @empty
                <div class="text-center text-gray-500 py-10"><i class="far fa-calendar fa-3x mb-3 text-gray-300"></i><p>No events or updates yet.</p></div>
            @endforelse
        </div>
    </div>
</div>

<!-- Add/Edit YouTube Modal -->
<div id="youTubeModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="youTubeModalTitle" class="text-xl font-bold text-gray-800">Add YouTube Video</h3>
            <button onclick="closeModal('youTubeModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <form id="youTubeForm" method="POST">
            @csrf
            <input type="hidden" id="youtube_id" name="id">
            <div class="mt-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input type="text" id="youtube_title" name="title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">YouTube video link *</label>
                    <input type="url" id="youtube_video_id" name="youtube_id" required placeholder="https://www.youtube.com/watch?v=..." class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <p class="text-xs text-gray-500 mt-1">Paste the full YouTube, youtu.be, Shorts, Live, or Embed link.</p>
                </div>
                <div>
                    <label class="flex items-center space-x-2">
                        <input type="checkbox" id="youtube_published" name="is_published" value="1" class="rounded border-gray-300 text-black">
                        <span class="text-sm text-gray-700">Publish on landing page</span>
                    </label>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onclick="closeModal('youTubeModal')" class="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">Save Video</button>
            </div>
        </form>
    </div>
</div>

<div id="eventModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="eventModalTitle" class="text-xl font-bold text-gray-800">New Board Item</h3>
            <button onclick="closeModal('eventModal')" class="text-gray-400 hover:text-gray-600"><i class="fas fa-times text-xl"></i></button>
        </div>
        <form id="eventForm">
            @csrf
            <input type="hidden" id="board_id">
            <div class="mt-4 space-y-4">
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Type *</label><select id="board_type" required class="w-full px-3 py-2 border rounded-lg"><option value="event">Event</option><option value="update">Update</option></select></div>
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Title *</label><input id="board_title" required maxlength="255" class="w-full px-3 py-2 border rounded-lg"></div>
                <div id="eventDateWrap"><label class="block text-sm font-medium text-gray-700 mb-1">Event date and time *</label><input type="datetime-local" id="board_event_date" class="w-full px-3 py-2 border rounded-lg"></div>
                <div><label class="block text-sm font-medium text-gray-700 mb-1">Details *</label><textarea id="board_content" required rows="5" class="w-full px-3 py-2 border rounded-lg"></textarea></div>
                <div class="flex flex-wrap gap-5">
                    <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="board_published" class="rounded text-black"> Publish on landing page</label>
                    <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="board_pinned" class="rounded text-black"> Pin to top</label>
                </div>
            </div>
            <div class="flex justify-end gap-3 mt-6 pt-4 border-t"><button type="button" onclick="closeModal('eventModal')" class="px-4 py-2 border rounded-lg">Cancel</button><button type="submit" class="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">Save Item</button></div>
        </form>
    </div>
</div>

<!-- Add/Edit Featured Image Modal -->
<div id="featuredImageModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="featuredImageModalTitle" class="text-xl font-bold text-gray-800">Add Featured Image</h3>
            <button onclick="closeModal('featuredImageModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <form id="featuredImageForm" method="POST" enctype="multipart/form-data">
            @csrf
            <input type="hidden" id="featured_id" name="id">
            <div class="mt-4 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input type="text" id="featured_title" name="title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Image *</label>
                    <input type="file" id="featured_image" name="image" accept="image/*" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <div id="currentImagePreview" class="mt-2 hidden">
                        <img id="imagePreview" src="" class="w-32 h-32 object-cover rounded-lg">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea id="featured_description" name="description" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg"></textarea>
                </div>
                <div>
                    <label class="flex items-center space-x-2">
                        <input type="checkbox" id="featured_published" name="is_published" value="1" class="rounded border-gray-300 text-black">
                        <span class="text-sm text-gray-700">Publish on landing page</span>
                    </label>
                </div>
            </div>
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onclick="closeModal('featuredImageModal')" class="px-4 py-2 border rounded-lg">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">Save Image</button>
            </div>
        </form>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>

<script>
let currentTab = 'youtube';
let youtubeSortable, featuredSortable;

function switchTab(tab) {
    currentTab = tab;
    localStorage.setItem('public_board_tab', tab);

    const panels = { youtube: 'youtubeTab', featured: 'featuredTab', events: 'eventsTab' };
    const buttons = { youtube: 'tabYoutube', featured: 'tabFeatured', events: 'tabEvents' };

    Object.keys(panels).forEach(name => {
        const active = name === tab;
        document.getElementById(panels[name])?.classList.toggle('hidden', !active);
        const button = document.getElementById(buttons[name]);
        button?.classList.toggle('text-black', active);
        button?.classList.toggle('border-black', active);
        button?.classList.toggle('text-gray-500', !active);
        button?.classList.toggle('border-transparent', !active);
        button?.setAttribute('aria-selected', active ? 'true' : 'false');
    });
}

// Initialize drag and drop
function initDragDrop() {
    const youtubeList = document.getElementById('youtubeList');
    const featuredList = document.getElementById('featuredList');
    
    if (youtubeList) {
        youtubeSortable = new Sortable(youtubeList, {
            animation: 150,
            handle: '.cursor-move',
            onEnd: function() {
                updateOrder('youtube');
            }
        });
    }
    
    if (featuredList) {
        featuredSortable = new Sortable(featuredList, {
            animation: 150,
            handle: '.cursor-move',
            onEnd: function() {
                updateOrder('featured');
            }
        });
    }
}

// Update order after drag and drop
function updateOrder(type) {
    const items = document.querySelectorAll(`#${type}List .${type}-item`);
    const orders = [];
    
    items.forEach((item, index) => {
        const id = item.dataset.id;
        orders.push({
            id: id,
            sort_order: index + 1
        });
    });
    
    fetch(`/music/landing/update-order`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            type: type,
            orders: orders
        })
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            console.error('Error updating order:', data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}

// Toggle publish status
function togglePublish(id, type) {
    fetch(`/music/landing/${type}/${id}/toggle-publish`, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            appAlert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error updating publish status');
    });
}

// Delete item
async function deleteItem(id, type) {
    if (!(await appConfirm('Are you sure you want to delete this item?'))) {
        fetch(`/music/landing/${type}/${id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                appAlert('Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            appAlert('Error deleting item');
        });
    }
}

function toggleHero(id) {
    fetch(`/music/landing/featured/${id}/toggle-hero`, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Accept': 'application/json'
        }
    })
    .then(async response => ({ ok: response.ok, data: await response.json() }))
    .then(({ ok, data }) => {
        if (!ok || !data.success) {
            appAlert(data.message || 'Unable to change the hero image.');
            return;
        }
        location.reload();
    })
    .catch(() => appAlert('Unable to change the hero image.'));
}

// YouTube modal functions
function openYouTubeModal() {
    document.getElementById('youTubeModalTitle').textContent = 'Add YouTube Video';
    document.getElementById('youtube_id').value = '';
    document.getElementById('youtube_title').value = '';
    document.getElementById('youtube_video_id').value = '';
    document.getElementById('youtube_published').checked = true;
    document.getElementById('youTubeModal').classList.remove('hidden');
}

function editYouTube(id) {
    fetch(`/music/landing/youtube/${id}/edit`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('youTubeModalTitle').textContent = 'Edit YouTube Video';
                document.getElementById('youtube_id').value = data.video.id;
                document.getElementById('youtube_title').value = data.video.title;
                document.getElementById('youtube_video_id').value = `https://www.youtube.com/watch?v=${data.video.youtube_id}`;
                document.getElementById('youtube_published').checked = data.video.is_published == 1;
                document.getElementById('youTubeModal').classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            appAlert('Error loading video details');
        });
}

// Featured image modal functions
function openFeaturedImageModal() {
    document.getElementById('featuredImageModalTitle').textContent = 'Add Featured Image';
    document.getElementById('featured_id').value = '';
    document.getElementById('featured_title').value = '';
    document.getElementById('featured_description').value = '';
    document.getElementById('featured_published').checked = true;
    document.getElementById('featured_image').value = '';
    document.getElementById('currentImagePreview').classList.add('hidden');
    document.getElementById('featuredImageModal').classList.remove('hidden');
}

function editFeaturedImage(id) {
    fetch(`/music/landing/featured/${id}/edit`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('featuredImageModalTitle').textContent = 'Edit Featured Image';
                document.getElementById('featured_id').value = data.image.id;
                document.getElementById('featured_title').value = data.image.title;
                document.getElementById('featured_description').value = data.image.description || '';
                document.getElementById('featured_published').checked = data.image.is_published == 1;
                
                if (data.image.image_path) {
                    document.getElementById('imagePreview').src = '/' + data.image.image_path;
                    document.getElementById('currentImagePreview').classList.remove('hidden');
                }
                
                document.getElementById('featuredImageModal').classList.remove('hidden');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            appAlert('Error loading image details');
        });
}

// Form submissions
document.getElementById('youTubeForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const id = document.getElementById('youtube_id').value;
    const url = id ? `/music/landing/youtube/${id}` : '/music/landing/youtube';
    const method = id ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: formData.get('title'),
            youtube_id: formData.get('youtube_id'),
            is_published: formData.get('is_published') ? true : false
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('youTubeModal');
            location.reload();
        } else {
            appAlert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error saving video');
    });
});

document.getElementById('featuredImageForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const id = document.getElementById('featured_id').value;
    const url = id ? `/music/landing/featured/${id}` : '/music/landing/featured';
    
    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('featuredImageModal');
            location.reload();
        } else {
            appAlert('Error: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error saving image');
    });
});

function syncEventDate() {
    const isEvent = document.getElementById('board_type').value === 'event';
    document.getElementById('eventDateWrap').classList.toggle('hidden', !isEvent);
    document.getElementById('board_event_date').required = isEvent;
}

function openEventModal() {
    switchTab('events');
    document.getElementById('eventModalTitle').textContent = 'New Board Item';
    document.getElementById('board_id').value = '';
    document.getElementById('board_type').value = 'event';
    document.getElementById('board_title').value = '';
    document.getElementById('board_event_date').value = '';
    document.getElementById('board_content').value = '';
    document.getElementById('board_published').checked = true;
    document.getElementById('board_pinned').checked = false;
    syncEventDate();
    document.getElementById('eventModal').classList.remove('hidden');
}

async function editBoardItem(id) {
    const response = await fetch(`/music/board/${id}/edit`, { headers: { Accept: 'application/json' } });
    const data = await response.json();
    if (!response.ok || !data.success) return appAlert(data.message || 'Unable to load this item.');
    const item = data.item;
    document.getElementById('eventModalTitle').textContent = 'Edit Event or Update';
    document.getElementById('board_id').value = item.id;
    document.getElementById('board_type').value = item.type || 'update';
    document.getElementById('board_title').value = item.title;
    document.getElementById('board_content').value = item.content;
    document.getElementById('board_event_date').value = item.event_date ? item.event_date.substring(0, 16) : '';
    document.getElementById('board_published').checked = Boolean(item.is_published);
    document.getElementById('board_pinned').checked = Boolean(item.is_pinned);
    syncEventDate();
    document.getElementById('eventModal').classList.remove('hidden');
}

async function boardAction(url, method = 'POST', confirmText = null) {
    if (confirmText && !(await appConfirm(confirmText))) return;
    const response = await fetch(url, {
        method,
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            Accept: 'application/json'
        }
    });
    const data = await response.json();
    if (!response.ok || !data.success) return appAlert(data.message || 'The action could not be completed.');
    location.reload();
}

function toggleBoardPublish(id) { boardAction(`/music/board/${id}/toggle-publish`); }
function toggleBoardPin(id) { boardAction(`/music/board/${id}/toggle-pin`); }
function deleteBoardItem(id) { boardAction(`/music/board/${id}`, 'DELETE', 'Delete this event or update?'); }

document.getElementById('board_type')?.addEventListener('change', syncEventDate);
document.getElementById('eventForm')?.addEventListener('submit', async function (event) {
    event.preventDefault();
    const id = document.getElementById('board_id').value;
    const payload = {
        title: document.getElementById('board_title').value,
        content: document.getElementById('board_content').value,
        type: document.getElementById('board_type').value,
        event_date: document.getElementById('board_event_date').value || null,
        is_published: document.getElementById('board_published').checked,
        is_pinned: document.getElementById('board_pinned').checked
    };
    const response = await fetch(id ? `/music/board/${id}` : '/music/board/store', {
        method: id ? 'PUT' : 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        const message = data.errors ? Object.values(data.errors).flat()[0] : data.message;
        return appAlert(message || 'Unable to save this item.');
    }
    closeModal('eventModal');
    location.reload();
});

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    initDragDrop();
    const savedTab = localStorage.getItem('public_board_tab');
    switchTab(['youtube', 'featured', 'events'].includes(savedTab) ? savedTab : 'youtube');
});
</script>



