<div class="bg-white rounded-xl shadow-md p-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Left Sidebar - Sections -->
        <div class="md:col-span-1 border-r pr-4">
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-2">
                    <i class="fas fa-layer-group text-gray-700"></i>
                    <h3 class="text-lg font-bold text-gray-800">Sections</h3>
                </div>
                @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('social-fellowship', 'manage-archives'))
                <button onclick="openSectionModal()" class="text-gray-600 hover:text-gray-800 text-sm flex items-center gap-1">
                    <i class="fas fa-plus"></i> New Section
                </button>
                @endif
            </div>
            
            <p class="text-xs text-gray-500 mb-3">Organize your notes</p>
            
            <!-- Sections List -->
            <div id="sections-list" class="space-y-2">
                @forelse($archiveSections ?? [] as $section)
                <div class="section-item group">
                    <button onclick="loadSectionContent({{ $section->id }})" 
                            class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-folder text-gray-500"></i>
                            <span class="text-sm text-gray-700">{{ $section->name }}</span>
                            <span class="text-xs text-gray-400">({{ $section->pages_count ?? 0 }})</span>
                        </div>
                        @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('social-fellowship', 'manage-archives'))
                        <div class="opacity-0 group-hover:opacity-100 transition">
                            <button onclick="editSection({{ $section->id }}, '{{ $section->name }}')" class="text-gray-400 hover:text-gray-600 mr-1">
                                <i class="fas fa-edit text-xs"></i>
                            </button>
                            <button onclick="deleteSection({{ $section->id }})" class="text-gray-400 hover:text-red-600">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        </div>
                        @endif
                    </button>
                </div>
                @empty
                <div class="text-center py-8">
                    <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i class="fas fa-folder-open text-gray-400 text-2xl"></i>
                    </div>
                    <p class="text-gray-500 text-sm">No sections yet</p>
                    <p class="text-xs text-gray-400 mt-1">Create your first section to get started</p>
                    @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('social-fellowship', 'manage-archives'))
                    <button onclick="openSectionModal()" class="mt-3 text-gray-600 hover:text-gray-800 text-sm">
                        <i class="fas fa-plus"></i> Create Section
                    </button>
                    @endif
                </div>
                @endforelse
            </div>
        </div>
        
        <!-- Right Side - Pages/Content -->
        <div class="md:col-span-2">
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-2">
                    <i class="fas fa-file-alt text-gray-700"></i>
                    <h3 class="text-lg font-bold text-gray-800" id="current-section-title">Pages</h3>
                </div>
                @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('social-fellowship', 'manage-archives'))
                <button onclick="openPageModal()" class="bg-gray-700 hover:bg-gray-800 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1">
                    <i class="fas fa-plus"></i> New Page
                </button>
                @endif
            </div>
            
            <!-- Pages Content -->
            <div id="pages-content" class="space-y-3">
                <div class="text-center py-12">
                    <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-book-open text-gray-400 text-3xl"></i>
                    </div>
                    <p class="text-gray-500">Select a section to view pages</p>
                    <p class="text-sm text-gray-400 mt-1">Choose a section from the sidebar to see its pages</p>
                </div>
            </div>
        </div>
        
    </div>
</div>

<!-- Section Modal -->
<div id="sectionModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-40 mx-auto p-5 border w-full max-w-md shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="sectionModalTitle" class="text-lg font-bold text-gray-800">Create New Section</h3>
            <button onclick="closeModal('sectionModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form id="section-form" method="POST">
            @csrf
            <input type="hidden" id="section_id" name="section_id">
            <input type="hidden" id="section_method" name="_method" value="POST">
            
            <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Section Name *</label>
                <input type="text" id="section_name" name="name" required 
                       placeholder="e.g., Sermons, Bible Studies, Teachings"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500">
            </div>
            
            <div class="flex justify-end gap-2 mt-5 pt-3 border-t">
                <button type="button" onclick="closeModal('sectionModal')" class="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm">Save Section</button>
            </div>
        </form>
    </div>
</div>

<!-- Page Modal -->
<div id="pageModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="pageModalTitle" class="text-lg font-bold text-gray-800">Create New Page</h3>
            <button onclick="closeModal('pageModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <form id="page-form" method="POST">
            @csrf
            <input type="hidden" id="page_id" name="page_id">
            <input type="hidden" id="page_method" name="_method" value="POST">
            <input type="hidden" id="page_section_id" name="section_id">
            
            <div class="mt-4 space-y-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input type="text" id="page_title" name="title" required 
                           placeholder="Page title"
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500">
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                    <textarea id="page_content" name="content" rows="8" required 
                              placeholder="Write your content here..."
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-gray-500 focus:border-gray-500">
                    </textarea>
                </div>
                
                <div class="flex items-center gap-2">
                    <input type="checkbox" id="page_is_published" name="is_published" value="1" class="w-4 h-4 text-gray-700 rounded" checked>
                    <label class="text-sm text-gray-700">Publish this page</label>
                </div>
            </div>
            
            <div class="flex justify-end gap-2 mt-5 pt-3 border-t">
                <button type="button" onclick="closeModal('pageModal')" class="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm">Save Page</button>
            </div>
        </form>
    </div>
</div>

<script>
let currentSectionId = null;
const moduleName = 'social-fellowship';

function openSectionModal() {
    document.getElementById('sectionModalTitle').textContent = 'Create New Section';
    document.getElementById('section_id').value = '';
    document.getElementById('section_method').value = 'POST';
    document.getElementById('section_name').value = '';
    document.getElementById('sectionModal').classList.remove('hidden');
}

function editSection(id, name) {
    document.getElementById('sectionModalTitle').textContent = 'Edit Section';
    document.getElementById('section_id').value = id;
    document.getElementById('section_method').value = 'PUT';
    document.getElementById('section_name').value = name;
    document.getElementById('sectionModal').classList.remove('hidden');
}

async function deleteSection(id) {
    if (!(await appConfirm('Delete this section? All pages in this section will also be deleted.'))) {
        fetch(`/${moduleName}/archives/sections/${id}`, {
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
                appAlert('Error deleting section');
            }
        });
    }
}

function loadSectionContent(sectionId) {
    currentSectionId = sectionId;
    
    fetch(`/${moduleName}/archives/sections/${sectionId}/pages`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('current-section-title').textContent = data.section_name;
            const pagesContainer = document.getElementById('pages-content');
            
            if (data.pages.length > 0) {
                pagesContainer.innerHTML = data.pages.map(page => `
                    <div class="border rounded-lg p-4 hover:shadow-md transition cursor-pointer" onclick="loadPageContent(${page.id})">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <i class="fas fa-file-alt text-gray-500"></i>
                                    <h4 class="font-semibold text-gray-800">${escapeHtml(page.title)}</h4>
                                    ${page.is_published ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Published</span>' : '<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>'}
                                </div>
                                <p class="text-sm text-gray-600 mt-1">${escapeHtml(page.excerpt || page.content.substring(0, 100))}...</p>
                                <p class="text-xs text-gray-400 mt-2">
                                    <i class="fas fa-calendar"></i> ${page.formatted_date}
                                </p>
                            </div>
                            @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('social-fellowship', 'manage-archives'))
                            <div class="flex gap-2 ml-4">
                                <button onclick="event.stopPropagation(); editPage(${page.id})" class="text-gray-400 hover:text-gray-600">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="event.stopPropagation(); deletePage(${page.id})" class="text-gray-400 hover:text-red-600">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                            @endif
                        </div>
                    </div>
                `).join('');
            } else {
                pagesContainer.innerHTML = `
                    <div class="text-center py-12">
                        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-file-alt text-gray-400 text-3xl"></i>
                        </div>
                        <p class="text-gray-500">No pages in this section</p>
                        @if(auth()->user()->isSuperAdmin() || auth()->user()->canAccess('social-fellowship', 'manage-archives'))
                        <button onclick="openPageModal()" class="mt-3 text-gray-600 hover:text-gray-800 text-sm">
                            <i class="fas fa-plus"></i> Create your first page
                        </button>
                        @endif
                    </div>
                `;
            }
        }
    });
}

function openPageModal() {
    if (!currentSectionId) {
        appAlert('Please select a section first');
        return;
    }
    
    document.getElementById('pageModalTitle').textContent = 'Create New Page';
    document.getElementById('page_id').value = '';
    document.getElementById('page_method').value = 'POST';
    document.getElementById('page_section_id').value = currentSectionId;
    document.getElementById('page_title').value = '';
    document.getElementById('page_content').value = '';
    document.getElementById('page_is_published').checked = true;
    document.getElementById('pageModal').classList.remove('hidden');
}

function editPage(pageId) {
    fetch(`/${moduleName}/archives/pages/${pageId}/edit`, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('pageModalTitle').textContent = 'Edit Page';
            document.getElementById('page_id').value = data.page.id;
            document.getElementById('page_method').value = 'PUT';
            document.getElementById('page_section_id').value = data.page.section_id;
            document.getElementById('page_title').value = data.page.title;
            document.getElementById('page_content').value = data.page.content;
            document.getElementById('page_is_published').checked = data.page.is_published == 1;
            document.getElementById('pageModal').classList.remove('hidden');
        }
    });
}

async function deletePage(pageId) {
    if (!(await appConfirm('Delete this page?'))) {
        fetch(`/${moduleName}/archives/pages/${pageId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (currentSectionId) {
                    loadSectionContent(currentSectionId);
                }
            } else {
                appAlert('Error deleting page');
            }
        });
    }
}

function loadPageContent(pageId) {
    window.location.href = `/${moduleName}/archives/pages/${pageId}`;
}

// Section form submission
document.getElementById('section-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const sectionId = document.getElementById('section_id').value;
    const method = document.getElementById('section_method').value;
    
    let url = `/${moduleName}/archives/sections`;
    if (method === 'PUT' && sectionId) {
        url = `/${moduleName}/archives/sections/${sectionId}`;
        formData.append('_method', 'PUT');
    } else {
        url = `/${moduleName}/archives/sections`;
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
            closeModal('sectionModal');
            location.reload();
        } else {
            appAlert('Error: ' + (data.message || 'Something went wrong'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('An error occurred. Please try again.');
    });
});

// Page form submission
document.getElementById('page-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const pageId = document.getElementById('page_id').value;
    const method = document.getElementById('page_method').value;
    
    let url = `/${moduleName}/archives/pages`;
    if (method === 'PUT' && pageId) {
        url = `/${moduleName}/archives/pages/${pageId}`;
        formData.append('_method', 'PUT');
    } else {
        url = `/${moduleName}/archives/pages`;
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
            closeModal('pageModal');
            if (currentSectionId) {
                loadSectionContent(currentSectionId);
            }
        } else {
            appAlert('Error: ' + (data.message || 'Something went wrong'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('An error occurred. Please try again.');
    });
});

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
</script>

<style>
.modal { display: none; }
.modal:not(.hidden) { display: block !important; }
</style>

