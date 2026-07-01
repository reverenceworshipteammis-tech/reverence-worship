<div class="bg-white rounded-xl shadow-sm p-4">
    
    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
            <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                <i class="fas fa-archive text-blue-600"></i>
                Archives
            </h2>
            <p class="text-xs text-gray-500">Organize your documents and resources</p>
        </div>
        <div class="flex flex-wrap gap-2">
            @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('intercession', 'manage-archives'))
            <button onclick="openFolderModal()" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition">
                <i class="fas fa-folder-plus"></i> New Folder
            </button>
            <button onclick="openFileUploadModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition">
                <i class="fas fa-file-upload"></i> Upload
            </button>
            @endif
        </div>
    </div>

    <!-- Stats -->
    @php
        $totalFolders = count($archiveSections ?? []);
        $totalFiles = 0;
        foreach($archiveSections ?? [] as $section) {
            $totalFiles += $section->pages_count ?? 0;
        }
    @endphp
    
    <div class="flex flex-wrap gap-4 mb-4 text-xs">
        <span class="text-gray-500">Folders: <strong class="text-blue-600">{{ $totalFolders }}</strong></span>
        <span class="text-gray-300">|</span>
        <span class="text-gray-500">Files: <strong class="text-green-600">{{ $totalFiles }}</strong></span>
    </div>

    <!-- Search -->
    <div class="relative mb-3">
        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"></i>
        <input type="text" id="archiveSearch" placeholder="Search folders..." 
               class="w-full pl-8 pr-8 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
               onkeyup="searchArchive()">
        <button onclick="clearSearch()" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hidden" id="clearSearchBtn">
            <i class="fas fa-times-circle"></i>
        </button>
    </div>

    <!-- Folder List -->
    <div id="archiveList" class="space-y-2">
        @forelse($archiveSections ?? [] as $section)
        <div class="folder-item bg-gray-50 hover:bg-blue-50 rounded-lg p-3 transition cursor-pointer flex items-center justify-between group"
             data-id="{{ $section->id }}"
             data-name="{{ strtolower($section->name) }}"
             onclick="openFolder({{ $section->id }})">
            <div class="flex items-center gap-3 flex-1 min-w-0">
                <i class="fas fa-folder text-yellow-500 text-lg flex-shrink-0"></i>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-medium text-gray-800 text-sm truncate">{{ $section->name }}</span>
                        <span class="text-xs text-gray-400 flex-shrink-0">({{ $section->pages_count ?? 0 }} files)</span>
                        @if(($section->is_published ?? false))
                            <span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex-shrink-0">Published</span>
                        @endif
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-1 ml-2 flex-shrink-0">
                <a href="#" onclick="event.stopPropagation(); openFolder({{ $section->id }})" 
                   class="text-blue-600 hover:text-blue-800 text-xs font-medium transition">
                    Open <i class="fas fa-arrow-right ml-0.5"></i>
                </a>
                @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('intercession', 'manage-archives'))
                <button onclick="event.stopPropagation(); editFolder({{ $section->id }}, '{{ $section->name }}', {{ $section->is_published ?? 0 }})" 
                        class="text-gray-400 hover:text-blue-600 p-1 transition">
                    <i class="fas fa-edit text-xs"></i>
                </button>
                <button onclick="event.stopPropagation(); deleteFolder({{ $section->id }})" 
                        class="text-gray-400 hover:text-red-600 p-1 transition">
                    <i class="fas fa-trash text-xs"></i>
                </button>
                @endif
            </div>
        </div>
        @empty
        <div class="text-center py-8">
            <i class="fas fa-folder-open text-3xl text-gray-300 mb-2"></i>
            <p class="text-gray-500 text-sm">No folders yet</p>
            <p class="text-xs text-gray-400">Create your first folder</p>
            @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('intercession', 'manage-archives'))
            <button onclick="openFolderModal()" class="mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium">
                <i class="fas fa-plus"></i> Create Folder
            </button>
            @endif
        </div>
        @endforelse
    </div>
</div>

<!-- Folder Modal -->
<div id="folderModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-40 mx-auto p-4 border w-full max-w-sm shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-2 border-b">
            <h3 id="folderModalTitle" class="text-base font-bold text-gray-800">
                <i class="fas fa-folder text-yellow-500"></i> New Folder
            </h3>
            <button type="button" onclick="closeModal('folderModal')" class="text-gray-400 hover:text-gray-600 text-xl">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <form id="folder-form" method="POST" class="mt-3">
            @csrf
            <input type="hidden" id="folder_id" name="folder_id">
            <input type="hidden" id="folder_method" name="_method" value="POST">
            
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Folder Name <span class="text-red-500">*</span></label>
                <input type="text" id="folder_name" name="name" required 
                       placeholder="Enter folder name"
                       class="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
            </div>
            
            <div class="flex items-center gap-2 mt-3">
                <input type="checkbox" id="folder_published" name="is_published" value="1" 
                       class="w-3.5 h-3.5 text-blue-600 rounded" checked>
                <label class="text-xs text-gray-700">Publish</label>
            </div>
            
            <div class="flex justify-end gap-2 mt-4 pt-2 border-t">
                <button type="button" onclick="closeModal('folderModal')" class="px-3 py-1 border rounded-lg text-xs hover:bg-gray-50">Cancel</button>
                <button type="submit" class="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 flex items-center gap-1">
                    <i class="fas fa-save"></i> Save
                </button>
            </div>
        </form>
    </div>
</div>

<!-- File Upload Modal -->
<div id="fileUploadModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-4 border w-full max-w-lg shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-2 border-b">
            <h3 class="text-base font-bold text-gray-800">
                <i class="fas fa-file-upload text-blue-600"></i> Upload File
            </h3>
            <button type="button" onclick="closeModal('fileUploadModal')" class="text-gray-400 hover:text-gray-600 text-xl">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <form id="file-upload-form" method="POST" enctype="multipart/form-data" class="mt-3">
            @csrf
            <input type="hidden" id="file_page_id" name="page_id">
            <input type="hidden" id="file_method" name="_method" value="POST">
            
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Folder <span class="text-red-500">*</span></label>
                    <select id="file_section_id" name="section_id" required 
                            class="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                        <option value="">-- Select --</option>
                        @foreach($archiveSections ?? [] as $section)
                            <option value="{{ $section->id }}">{{ $section->name }}</option>
                        @endforeach
                    </select>
                </div>
                
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Title <span class="text-red-500">*</span></label>
                    <input type="text" id="file_title" name="title" required 
                           placeholder="Enter title"
                           class="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                </div>
                
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Upload File (Optional)</label>
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 transition cursor-pointer" id="dropZone">
                        <i class="fas fa-cloud-upload-alt text-2xl text-gray-400"></i>
                        <p class="text-xs text-gray-500">Click or drag to upload</p>
                        <input type="file" id="file_upload" name="file" class="hidden">
                        <div id="fileInfo" class="hidden mt-1 text-xs text-green-600">
                            <i class="fas fa-check-circle"></i> <span id="fileName"></span>
                        </div>
                    </div>
                </div>
                
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Or Write Content</label>
                    <textarea id="file_content" name="content" rows="3" 
                              placeholder="Write content here..."
                              class="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"></textarea>
                </div>
                
                <div class="flex items-center gap-2">
                    <input type="checkbox" id="file_published" name="is_published" value="1" 
                           class="w-3.5 h-3.5 text-blue-600 rounded" checked>
                    <label class="text-xs text-gray-700">Publish</label>
                </div>
            </div>
            
            <div class="flex justify-end gap-2 mt-3 pt-2 border-t">
                <button type="button" onclick="closeModal('fileUploadModal')" class="px-3 py-1 border rounded-lg text-xs hover:bg-gray-50">Cancel</button>
                <button type="submit" class="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 flex items-center gap-1">
                    <i class="fas fa-save"></i> Save
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Folder View Modal -->
<div id="folderViewModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-10 mx-auto p-4 border w-full max-w-3xl shadow-lg rounded-lg bg-white mb-10">
        <div class="flex justify-between items-center pb-2 border-b">
            <h3 id="folderViewTitle" class="text-base font-bold text-gray-800 flex items-center gap-2">
                <i class="fas fa-folder-open text-yellow-500"></i> <span id="folderViewName">Folder</span>
            </h3>
            <div class="flex items-center gap-2">
                @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('intercession', 'manage-archives'))
                <button onclick="openFileUploadModalFromFolder()" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition">
                    <i class="fas fa-plus"></i> Add File
                </button>
                @endif
                <button type="button" onclick="closeModal('folderViewModal')" class="text-gray-400 hover:text-gray-600 text-xl">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        
        <div id="folderFilesContainer" class="mt-3 space-y-2 max-h-96 overflow-y-auto">
            <div class="text-center py-6">
                <i class="fas fa-spinner fa-spin text-blue-500"></i>
                <p class="text-xs text-gray-500 mt-1">Loading...</p>
            </div>
        </div>
        
        <div class="mt-3 pt-2 border-t flex justify-end">
            <button type="button" onclick="closeModal('folderViewModal')" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs transition">Close</button>
        </div>
    </div>
</div>

<script>
let currentViewFolderId = null;

// ============ MODAL FUNCTIONS ============
function openFolderModal() {
    const modal = document.getElementById('folderModal');
    document.getElementById('folderModalTitle').innerHTML = '<i class="fas fa-folder text-yellow-500"></i> New Folder';
    document.getElementById('folder_id').value = '';
    document.getElementById('folder_method').value = 'POST';
    document.getElementById('folder_name').value = '';
    document.getElementById('folder_published').checked = true;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('folder_name').focus(), 100);
}

function editFolder(id, name, published) {
    const modal = document.getElementById('folderModal');
    document.getElementById('folderModalTitle').innerHTML = '<i class="fas fa-folder-edit text-yellow-500"></i> Edit Folder';
    document.getElementById('folder_id').value = id;
    document.getElementById('folder_method').value = 'PUT';
    document.getElementById('folder_name').value = name;
    document.getElementById('folder_published').checked = published == 1;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('folder_name').focus(), 100);
}

function openFileUploadModal() {
    const folderSelect = document.getElementById('file_section_id');
    if (folderSelect.options.length <= 1) {
        showNotification('Create a folder first', 'warning');
        return;
    }
    const modal = document.getElementById('fileUploadModal');
    document.getElementById('file_page_id').value = '';
    document.getElementById('file_method').value = 'POST';
    document.getElementById('file_title').value = '';
    document.getElementById('file_content').value = '';
    document.getElementById('file_published').checked = true;
    document.getElementById('file_upload').value = '';
    document.getElementById('fileInfo').classList.add('hidden');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('file_title').focus(), 100);
}

function openFileUploadModalFromFolder() {
    if (!currentViewFolderId) {
        showNotification('Select a folder first', 'warning');
        return;
    }
    const modal = document.getElementById('fileUploadModal');
    document.getElementById('file_section_id').value = currentViewFolderId;
    document.getElementById('file_page_id').value = '';
    document.getElementById('file_method').value = 'POST';
    document.getElementById('file_title').value = '';
    document.getElementById('file_content').value = '';
    document.getElementById('file_published').checked = true;
    document.getElementById('file_upload').value = '';
    document.getElementById('fileInfo').classList.add('hidden');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('file_title').focus(), 100);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// ============ FILE HANDLING ============
document.addEventListener('DOMContentLoaded', function() {
    // File input change handler
    const fileInput = document.getElementById('file_upload');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                const fileInfo = document.getElementById('fileInfo');
                const fileName = document.getElementById('fileName');
                fileName.textContent = `${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`;
                fileInfo.classList.remove('hidden');
            }
        });
    }
    
    // Drop zone click handler
    const dropZone = document.getElementById('dropZone');
    if (dropZone) {
        dropZone.addEventListener('click', function(e) {
            e.stopPropagation();
            document.getElementById('file_upload').click();
        });
        
        dropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('border-blue-500', 'bg-blue-50');
        });
        
        dropZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('border-blue-500', 'bg-blue-50');
        });
        
        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('border-blue-500', 'bg-blue-50');
            const input = document.getElementById('file_upload');
            if (e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                input.dispatchEvent(new Event('change'));
            }
        });
    }
});

// ============ FOLDER FUNCTIONS ============
async function deleteFolder(id) {
    if (await appConfirm('Delete this folder and all its files?')) {
        const url = `/intercession/archives/sections/${id}`;
        fetch(url, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Folder deleted', 'success');
                setTimeout(() => location.reload(), 800);
            } else {
                showNotification('Error deleting folder', 'error');
            }
        })
        .catch(() => showNotification('Error deleting folder', 'error'));
    }
}

function openFolder(id) {
    currentViewFolderId = id;
    const folder = document.querySelector(`.folder-item[data-id="${id}"]`);
    const name = folder?.querySelector('.font-medium')?.textContent || 'Folder';
    
    document.getElementById('folderViewName').textContent = name;
    document.getElementById('folderViewModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    const url = `/intercession/archives/sections/${id}/pages`;
    fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        const container = document.getElementById('folderFilesContainer');
        if (data.success && data.pages && data.pages.length > 0) {
            container.innerHTML = data.pages.map(page => `
                <div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition group">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                        <i class="fas fa-file-alt text-blue-500 text-sm"></i>
                        <span class="text-sm text-gray-700 truncate">${escapeHtml(page.title)}</span>
                        ${page.is_published ? '<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Published</span>' : ''}
                        ${page.file_name ? `<span class="text-xs text-gray-400"><i class="fas fa-paperclip"></i> ${escapeHtml(page.file_name)}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                        <a href="/intercession/archives/pages/${page.id}" target="_blank" class="text-blue-600 hover:text-blue-800 text-xs p-1">
                            <i class="fas fa-file-lines"></i>
                        </a>
                        ${page.file_path ? `<a href="/intercession/archives/pages/${page.id}/download" class="text-green-600 hover:text-green-800 text-xs p-1">
                            <i class="fas fa-download"></i>
                        </a>` : ''}
                        @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('intercession', 'manage-archives'))
                        <button onclick="event.stopPropagation(); editFile(${page.id})" class="text-gray-400 hover:text-blue-600 text-xs p-1">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="event.stopPropagation(); deleteFile(${page.id})" class="text-gray-400 hover:text-red-600 text-xs p-1">
                            <i class="fas fa-trash"></i>
                        </button>
                        @endif
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-file-alt text-3xl text-gray-300"></i>
                    <p class="text-gray-500 text-sm mt-1">No files in this folder</p>
                    <button onclick="openFileUploadModalFromFolder()" class="mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium">
                        <i class="fas fa-plus"></i> Upload file
                    </button>
                </div>
            `;
        }
    })
    .catch(() => {
        document.getElementById('folderFilesContainer').innerHTML = `
            <div class="text-center py-6 text-red-500">
                <i class="fas fa-exclamation-circle"></i>
                <p class="text-sm mt-1">Error loading files</p>
            </div>
        `;
    });
}

function editFile(pageId) {
    // Use the named route for editing
    const url = `/intercession/archives/pages/${pageId}/edit`;
    fetch(url, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const modal = document.getElementById('fileUploadModal');
            document.getElementById('file_page_id').value = data.page.id;
            document.getElementById('file_method').value = 'PUT';
            document.getElementById('file_section_id').value = data.page.section_id;
            document.getElementById('file_title').value = data.page.title;
            document.getElementById('file_content').value = data.page.content || '';
            document.getElementById('file_published').checked = data.page.is_published == 1;
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    })
    .catch(() => showNotification('Error loading file', 'error'));
}

async function deleteFile(pageId) {
    if (await appConfirm('Delete this file?')) {
        const url = `/intercession/archives/pages/${pageId}`;
        fetch(url, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('File deleted', 'success');
                if (currentViewFolderId) openFolder(currentViewFolderId);
            } else {
                showNotification('Error deleting file', 'error');
            }
        })
        .catch(() => showNotification('Error deleting file', 'error'));
    }
}

// ============ SEARCH ============
function searchArchive() {
    const term = document.getElementById('archiveSearch').value.toLowerCase().trim();
    const clearBtn = document.getElementById('clearSearchBtn');
    const items = document.querySelectorAll('.folder-item');
    let visible = 0;
    
    if (term.length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }
    
    items.forEach(item => {
        const name = item.dataset.name || '';
        const match = name.includes(term);
        item.style.display = match ? '' : 'none';
        if (match) visible++;
    });
}

function clearSearch() {
    document.getElementById('archiveSearch').value = '';
    document.getElementById('clearSearchBtn').classList.add('hidden');
    document.querySelectorAll('.folder-item').forEach(item => item.style.display = '');
}

// ============ FORM SUBMISSIONS ============
document.getElementById('folder-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const folderId = document.getElementById('folder_id').value;
    const method = document.getElementById('folder_method').value;
    const submitBtn = this.querySelector('button[type="submit"]');
    
    let url = '{{ route("intercession.archives.sections.store") }}';
    if (method === 'PUT' && folderId) {
        url = `/intercession/archives/sections/${folderId}`;
        formData.append('_method', 'PUT');
    }
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('folderModal');
            showNotification('Folder saved', 'success');
            setTimeout(() => location.reload(), 800);
        } else {
            showNotification('Error: ' + (data.message || 'Failed'), 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            }
        }
    })
    .catch(() => {
        showNotification('Error saving folder', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        }
    });
});

document.getElementById('file-upload-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const pageId = document.getElementById('file_page_id').value;
    const method = document.getElementById('file_method').value;
    const submitBtn = this.querySelector('button[type="submit"]');
    
    let url = '{{ route("intercession.archives.pages.store") }}';
    if (method === 'PUT' && pageId) {
        url = `/intercession/archives/pages/${pageId}`;
        formData.append('_method', 'PUT');
    }
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('fileUploadModal');
            showNotification('File saved', 'success');
            if (currentViewFolderId) {
                openFolder(currentViewFolderId);
            } else {
                setTimeout(() => location.reload(), 800);
            }
        } else {
            showNotification('Error: ' + (data.message || 'Failed'), 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save';
            }
        }
    })
    .catch(() => {
        showNotification('Error saving file', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        }
    });
});

// ============ NOTIFICATIONS ============
function showNotification(message, type) {
    return window.appNotify(...arguments);
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    const existing = document.querySelector('.notification-toast');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification-toast fixed top-4 right-4 px-3 py-1.5 rounded-lg shadow-lg text-white z-[9999] ${colors[type] || 'bg-gray-700'} text-sm flex items-center gap-2`;
    notification.innerHTML = `${message} <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white ml-2">Ã—</button>`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============ CLOSE MODALS ON BACKGROUND CLICK ============
document.addEventListener('click', function(e) {
    const modals = ['folderModal', 'fileUploadModal', 'folderViewModal'];
    modals.forEach(id => {
        const modal = document.getElementById(id);
        if (e.target === modal && modal.style.display === 'block') {
            closeModal(id);
        }
    });
});

// ============ ESCAPE KEY ============
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = ['folderModal', 'fileUploadModal', 'folderViewModal'];
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (modal && modal.style.display === 'block') {
                closeModal(id);
            }
        });
    }
});

// ============ ADD STYLES ============
const style = document.createElement('style');
style.textContent = `
    .modal { 
        display: none; 
    }
    .modal[style*="display: block"] {
        display: block !important;
    }
    .folder-item:hover { 
        background-color: #eff6ff !important; 
    }
    .notification-toast {
        animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn { 
        from { transform: translateX(100%); opacity: 0; } 
        to { transform: translateX(0); opacity: 1; } 
    }
`;
document.head.appendChild(style);
</script>

