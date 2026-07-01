<div class="bg-white rounded-lg shadow-lg p-6">
    <div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <h3 class="text-lg font-bold text-gray-800">Photo Gallery</h3>
        
        <!-- Search and Sort Bar -->
        <div class="flex flex-wrap gap-3">
            <div class="relative">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input type="text" id="searchPhotos" placeholder="Search photos..." 
                       class="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:ring-blue-500 focus:border-blue-500">
            </div>
            <select id="sortBy" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">A-Z</option>
                <option value="za">Z-A</option>
            </select>
            
            @if(auth()->user()->canAccess('music-ministry', 'manage-gallery'))
            <button onclick="openUploadModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
                <i class="fas fa-upload mr-2"></i> Upload Photos
            </button>
            @endif
        </div>
    </div>
    
    <!-- Gallery Stats -->
    @php
        $totalPhotos = count($gallery ?? []);
    @endphp

    <div class="grid grid-cols-1 gap-3 mb-6">
        <div class="bg-blue-50 rounded-lg p-3 text-center">
            <p class="text-2xl font-bold text-blue-600">{{ $totalPhotos }}</p>
            <p class="text-xs text-gray-600">Total Photos</p>
        </div>
    </div>
    
    <!-- Gallery Grid -->
    <div id="galleryGrid" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        @forelse($gallery ?? [] as $photo)
        <div class="gallery-item border rounded-lg overflow-hidden hover:shadow-lg transition group relative" 
             data-id="{{ $photo->id }}"
             data-title="{{ strtolower($photo->title ?? '') }}"
             data-category="{{ $photo->category ?? '' }}"
             data-date="{{ $photo->created_at ?? '' }}">
            
            <div class="relative overflow-hidden">
                <img src="{{ asset($photo->image_path) }}" alt="{{ $photo->title ?? 'Gallery Image' }}" 
                     class="w-full h-48 object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                     onclick="openLightbox({{ $photo->id }})">
                
                <!-- Action Overlay -->
                <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                    @if(auth()->user()->canAccess('music-ministry', 'manage-gallery'))
                    <button onclick="editPhoto({{ $photo->id }})" class="bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100 mr-1">
                        <i class="fas fa-edit text-blue-600 text-xs"></i>
                    </button>
                    <button onclick="deletePhoto({{ $photo->id }})" class="bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100">
                        <i class="fas fa-trash text-red-600 text-xs"></i>
                    </button>
                    @endif
                </div>
            </div>
            
            <div class="p-3">
                <h4 class="font-medium text-gray-800 text-sm truncate" title="{{ $photo->title ?? '' }}">{{ $photo->title ?? 'Untitled' }}</h4>
                @if($photo->event_date)
                    <p class="text-xs text-gray-500">{{ date('M d, Y', strtotime($photo->event_date)) }}</p>
                @endif
                @if($photo->category)
                    <span class="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{{ ucfirst($photo->category) }}</span>
                @endif
                @if($photo->tags)
                    <div class="flex flex-wrap gap-1 mt-1">
                        @php
                            $tags = explode(',', $photo->tags);
                        @endphp
                        @foreach(array_slice($tags, 0, 2) as $tag)
                            <span class="text-xs text-gray-400">#{{ trim($tag) }}</span>
                        @endforeach
                        @if(count($tags) > 2)
                            <span class="text-xs text-gray-400">+{{ count($tags) - 2 }}</span>
                        @endif
                    </div>
                @endif
            </div>
        </div>
        @empty
        <div class="col-span-full text-center text-gray-500 py-12">
            <i class="fas fa-images fa-4x mb-4 text-gray-300"></i>
            <p>No photos uploaded yet</p>
            @if(auth()->user()->canAccess('music-ministry', 'manage-gallery'))
            <button onclick="openUploadModal()" class="mt-3 text-blue-600 hover:text-blue-800 text-sm">
                <i class="fas fa-upload"></i> Upload your first photo
            </button>
            @endif
        </div>
        @endforelse
    </div>
    
    <!-- Load More Button -->
    @if(($gallery ?? [])->count() > 12)
    <div class="text-center mt-6">
        <button id="loadMoreBtn" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition">
            Load More
        </button>
    </div>
    @endif
</div>

<!-- Upload Modal -->
<div id="uploadModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-6 border w-full max-w-lg shadow-lg rounded-xl bg-white">
        <div class="flex justify-between items-center pb-4 border-b">
            <h3 class="text-xl font-bold text-gray-800">Upload Photos</h3>
            <button onclick="closeModal('uploadModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form method="POST" action="{{ route('music.gallery.store') }}" enctype="multipart/form-data" id="uploadForm">
            @csrf
            
            <div class="mt-5 space-y-5">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Select Photos <span class="text-red-500">*</span>
                    </label>
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition cursor-pointer" onclick="document.getElementById('photoInput').click()">
                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                        <p class="text-sm text-gray-500">Click to select photos or drag and drop</p>
                        <p class="text-xs text-gray-400 mt-1">You can select multiple photos at once. Supported formats: JPG, PNG, GIF</p>
                        <input type="file" id="photoInput" name="images[]" accept="image/*" multiple class="hidden" onchange="handleFileSelect(this)">
                    </div>
                    <div id="fileList" class="mt-2 space-y-1"></div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                    <textarea name="caption" id="caption" rows="2" 
                              class="w-full px-4 py-2 border border-gray-300 rounded-lg"
                              placeholder="Optional caption..."></textarea>
                </div>
            </div>
            
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onclick="closeModal('uploadModal')" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Upload Photos</button>
            </div>
        </form>
    </div>
</div>

<!-- Edit Modal -->
<div id="editModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-xl bg-white">
        <div class="flex justify-between items-center pb-4 border-b">
            <h3 class="text-xl font-bold text-gray-800">Edit Photo</h3>
            <button onclick="closeModal('editModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form id="editForm" method="POST">
            @csrf
            @method('PUT')
            <input type="hidden" id="edit_id" name="photo_id">
            
            <div class="mt-5 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Title / Alt Text</label>
                    <input type="text" id="edit_title" name="title" required class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                    <textarea id="edit_caption" name="caption" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg"></textarea>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select id="edit_category" name="category" class="w-full px-4 py-2 border border-gray-300 rounded-lg">
                        <option value="">Select a category</option>
                        <option value="worship">Worship Service</option>
                        <option value="event">Special Event</option>
                        <option value="practice">Practice Session</option>
                        <option value="concert">Concert</option>
                        <option value="retreat">Retreat</option>
                        <option value="conference">Conference</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <input type="text" id="edit_tags" name="tags" class="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., worship, music">
                </div>
            </div>
            
            <div class="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onclick="closeModal('editModal')" class="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
            </div>
        </form>
    </div>
</div>

<!-- Lightbox Modal -->
<div id="lightboxModal" class="modal hidden fixed inset-0 bg-black bg-opacity-90 z-50">
    <div class="relative h-full flex items-center justify-center">
        <button onclick="closeLightbox()" class="absolute top-4 right-4 text-white text-3xl hover:text-gray-300">&times;</button>
        <button onclick="prevPhoto()" class="absolute left-4 text-white text-3xl hover:text-gray-300">&larr;</button>
        <img id="lightboxImg" src="" alt="" class="max-h-[90vh] max-w-[90vw] object-contain">
        <button onclick="nextPhoto()" class="absolute right-4 text-white text-3xl hover:text-gray-300">&rarr;</button>
        <div id="lightboxCaption" class="absolute bottom-4 left-0 right-0 text-center text-white bg-black bg-opacity-50 p-2 mx-auto w-fit rounded"></div>
    </div>
</div>

<script>
let currentPhotos = [];
let currentPhotoIndex = 0;
let visibleCount = 12;

// Search and Filter
function filterGallery() {
    const searchTerm = document.getElementById('searchPhotos').value.toLowerCase();
    const sortBy = document.getElementById('sortBy').value;
    
    let items = Array.from(document.querySelectorAll('.gallery-item'));
    
    // Filter
    items = items.filter(item => {
        const title = item.dataset.title || '';
        const matchesSearch = title.includes(searchTerm);
        return matchesSearch;
    });
    
    // Sort
    items.sort((a, b) => {
        if (sortBy === 'newest') {
            return new Date(b.dataset.date) - new Date(a.dataset.date);
        } else if (sortBy === 'oldest') {
            return new Date(a.dataset.date) - new Date(b.dataset.date);
        } else if (sortBy === 'az') {
            return (a.dataset.title || '').localeCompare(b.dataset.title || '');
        } else if (sortBy === 'za') {
            return (b.dataset.title || '').localeCompare(a.dataset.title || '');
        }
        return 0;
    });
    
    // Reorder DOM
    const container = document.getElementById('galleryGrid');
    items.forEach(item => container.appendChild(item));
    
    // Reset visibility
    visibleCount = 12;
    items.forEach((item, index) => {
        item.style.display = index < visibleCount ? '' : 'none';
    });
    
    // Show/hide load more button
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.style.display = items.length > visibleCount ? 'block' : 'none';
    }
    
    // Show/hide no results
    if (items.length === 0) {
        if (!document.getElementById('noResultsMsg')) {
            const noResults = document.createElement('div');
            noResults.id = 'noResultsMsg';
            noResults.className = 'col-span-full text-center text-gray-500 py-12';
            noResults.innerHTML = '<i class="fas fa-search fa-4x mb-3 text-gray-300"></i><p>No photos match your search</p>';
            container.appendChild(noResults);
        }
    } else {
        const noResults = document.getElementById('noResultsMsg');
        if (noResults) noResults.remove();
    }
}

// Load More functionality
function loadMore() {
    const items = document.querySelectorAll('.gallery-item');
    const newVisibleCount = visibleCount + 12;
    for (let i = visibleCount; i < newVisibleCount && i < items.length; i++) {
        items[i].style.display = '';
    }
    visibleCount = newVisibleCount;
    if (visibleCount >= items.length) {
        document.getElementById('loadMoreBtn').style.display = 'none';
    }
}

// Edit Photo
function editPhoto(id) {
    fetch(`/music/gallery/${id}/edit`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('edit_id').value = data.photo.id;
            document.getElementById('edit_title').value = data.photo.title || '';
            document.getElementById('edit_caption').value = data.photo.description || '';
            document.getElementById('edit_category').value = data.photo.category || '';
            document.getElementById('edit_tags').value = data.photo.tags || '';
            document.getElementById('editModal').classList.remove('hidden');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error loading photo data');
    });
}

// Delete Photo
async function deletePhoto(id) {
    if (!(await appConfirm('Are you sure you want to delete this photo?'))) {
        fetch(`/music/gallery/${id}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                appAlert('Error deleting photo');
            }
        });
    }
}

// Lightbox
function openLightbox(id) {
    currentPhotos = Array.from(document.querySelectorAll('.gallery-item')).map(item => ({
        id: item.dataset.id,
        img: item.querySelector('img')?.src || '',
        title: item.querySelector('h4')?.innerText || ''
    }));
    currentPhotoIndex = currentPhotos.findIndex(p => p.id == id);
    updateLightbox();
    document.getElementById('lightboxModal').classList.remove('hidden');
}

function updateLightbox() {
    const photo = currentPhotos[currentPhotoIndex];
    if (photo) {
        document.getElementById('lightboxImg').src = photo.img;
        document.getElementById('lightboxCaption').innerHTML = photo.title;
    }
}

function closeLightbox() {
    document.getElementById('lightboxModal').classList.add('hidden');
}

function prevPhoto() {
    if (currentPhotos.length > 0) {
        currentPhotoIndex = (currentPhotoIndex - 1 + currentPhotos.length) % currentPhotos.length;
        updateLightbox();
    }
}

function nextPhoto() {
    if (currentPhotos.length > 0) {
        currentPhotoIndex = (currentPhotoIndex + 1) % currentPhotos.length;
        updateLightbox();
    }
}

// Event Listeners
document.getElementById('searchPhotos')?.addEventListener('keyup', filterGallery);
document.getElementById('sortBy')?.addEventListener('change', filterGallery);
document.getElementById('loadMoreBtn')?.addEventListener('click', loadMore);

// Modal functions
function openUploadModal() {
    document.getElementById('uploadModal').classList.remove('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('fileList').innerHTML = '';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function handleFileSelect(input) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    if (input.files && input.files.length > 0) {
        for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between text-sm text-gray-600 bg-gray-50 p-2 rounded';
            div.innerHTML = `<span><i class="fas fa-image mr-2 text-blue-500"></i> ${file.name}</span>
                            <span class="text-xs text-gray-400">${(file.size / 1024).toFixed(1)} KB</span>`;
            fileList.appendChild(div);
        }
    }
}

// Edit form submission
document.getElementById('editForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('edit_id').value;
    const formData = new FormData(this);
    
    fetch(`/music/gallery/${id}`, {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            appAlert('Error updating photo');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error updating photo');
    });
});

// Keyboard navigation for lightbox
document.addEventListener('keydown', function(e) {
    const lightbox = document.getElementById('lightboxModal');
    if (lightbox && !lightbox.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft') prevPhoto();
        if (e.key === 'ArrowRight') nextPhoto();
        if (e.key === 'Escape') closeLightbox();
    }
});

// Drag and drop
const dropZone = document.querySelector('.border-dashed');
if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500', 'bg-blue-50'); });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-blue-500', 'bg-blue-50'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        const input = document.getElementById('photoInput');
        input.files = e.dataTransfer.files;
        handleFileSelect(input);
    });
}

// Initialize visible items
document.addEventListener('DOMContentLoaded', function() {
    const items = document.querySelectorAll('.gallery-item');
    items.forEach((item, index) => {
        item.style.display = index < 12 ? '' : 'none';
    });
});
</script>

<style>
.modal { display: none; }
.modal:not(.hidden) { display: block !important; }
.gallery-item { transition: all 0.3s ease; }
</style>

