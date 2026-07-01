@extends('layouts.app')

@section('title', 'Manage Forms')

@section('content')
<div class="max-w-6xl mx-auto py-6">
    <div class="bg-white rounded-xl shadow-md p-6">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-bold text-gray-800">Manage Forms</h1>
            <a href="{{ route('forms.manage.create') }}" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm">
                <i class="fas fa-plus mr-2"></i> Create New Form
            </a>
        </div>
        
        @if(session('success'))
        <div class="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4">
            {{ session('success') }}
        </div>
        @endif
        
        @if(session('error'))
        <div class="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4">
            {{ session('error') }}
        </div>
        @endif
        
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submissions</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($forms ?? [] as $form)
                    @php
                        $settings = is_string($form->settings) ? json_decode($form->settings, true) : ($form->settings ?? []);
                        $isPublished = $settings['is_published'] ?? false;
                        $submissionsCount = DB::table('form_submissions')->where('form_id', $form->id)->count();
                    @endphp
                    <tr class="border-t hover:bg-gray-50">
                        <td class="px-4 py-3">
                            <div>
                                <p class="font-medium text-gray-800">{{ $form->title }}</p>
                                <p class="text-xs text-gray-500">{{ Str::limit($form->description, 50) }}</p>
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            <span class="px-2 py-1 text-xs rounded-full {{ $isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500' }}">
                                {{ $isPublished ? 'Published' : 'Draft' }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-sm text-gray-500">{{ $submissionsCount }}</td>
                        <td class="px-4 py-3 text-sm text-gray-500">{{ \Carbon\Carbon::parse($form->created_at)->format('d/m/Y') }}</td>
                        <td class="px-4 py-3">
                            <div class="flex gap-2">
                                <a href="{{ route('forms.manage.edit', $form->id) }}" class="text-blue-600 hover:text-blue-800 text-sm">Edit</a>
                                <a href="{{ route('forms.take', $form->id) }}" class="text-green-600 hover:text-green-800 text-sm">Take</a>
                                <button onclick="deleteForm({{ $form->id }})" class="text-red-600 hover:text-red-800 text-sm">Delete</button>
                            </div>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                            <i class="fas fa-file-alt text-4xl text-gray-300 mb-2"></i>
                            <p>No forms created yet</p>
                            <a href="{{ route('forms.manage.create') }}" class="text-blue-600 hover:underline text-sm">Create your first form</a>
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>

<script>
async function deleteForm(id) {
    if (!(await appConfirm('Delete this form? All responses will be lost forever.'))) {
        fetch(`/forms/manage/${id}`, {
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
                appAlert('Error deleting form: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            appAlert('Error deleting form');
        });
    }
}
</script>
@endsection

