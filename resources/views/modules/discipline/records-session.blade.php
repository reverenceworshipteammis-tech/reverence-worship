@extends('layouts.app')

@section('title', 'Discipline Session Details')
@section('page-title', 'Discipline Session Details')

@section('content')
<div class="container mx-auto px-4 py-8">
    @php
        $recordedByName = $records[0]->recorded_by_name ?? 'N/A';
    @endphp
    <div class="mb-6 flex items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold text-gray-800">Discipline Session Details</h1>
            <p class="text-sm text-gray-500 mt-1">{{ $title }} on {{ \Carbon\Carbon::parse($date)->format('F d, Y') }}</p>
        </div>
        <div class="flex items-center gap-3">
            <div class="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 shadow-sm">
                <span class="font-medium text-gray-500">Recorded By:</span>
                <span class="ml-1 text-gray-800">{{ $recordedByName }}</span>
            </div>
            <a href="{{ route('discipline.index') }}#discipline-records-tab" class="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Back to Records
            </a>
        </div>
    </div>

    <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <div class="p-4 border-b bg-gray-50 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div class="flex flex-col sm:flex-row sm:items-end gap-3 w-full">
            <div class="w-full sm:w-80">
                <label for="session-user-search" class="block text-sm font-medium text-gray-700 mb-1">Search User</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                        <i class="fas fa-search"></i>
                    </span>
                    <input id="session-user-search" type="text" placeholder="Search by user name..." class="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                </div>
            </div>
            <button type="button" onclick="exportSessionRecords()" class="inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm transition shadow-sm">
                <i class="fas fa-file-export"></i>
                Export
            </button>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50 border-b">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Points</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($records as $record)
                        <tr class="border-b hover:bg-gray-50" data-user="{{ strtolower($record->user_name ?? '') }}">
                            <td class="px-6 py-4 text-sm text-gray-800">{{ $record->user_name ?? 'N/A' }}</td>
                            <td class="px-6 py-4 text-sm text-gray-600">{{ $record->description ?? '-' }}</td>
                            <td class="px-6 py-4 text-sm text-center font-semibold text-gray-800">{{ $record->points ?? 0 }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="3" class="px-6 py-10 text-center text-gray-500">No records found for this session.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>
@include('modules.discipline.modals.discipline-dialog')
<script>
const sessionUserSearch = document.getElementById('session-user-search');
const sessionRows = Array.from(document.querySelectorAll('tbody tr[data-user]'));

sessionUserSearch?.addEventListener('input', function () {
    const query = this.value.trim().toLowerCase();

    sessionRows.forEach(row => {
        const user = row.dataset.user || '';
        row.classList.toggle('hidden', query !== '' && !user.includes(query));
    });
});

function exportSessionRecords() {
    const rows = Array.from(document.querySelectorAll('tbody tr[data-user]'));

    if (!rows.length) {
        disciplineAlert('No records to export.');
        return;
    }

    const headers = ['No', 'Names', 'Description', 'Point'];
    const csvRows = [headers.join(',')];

    rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        const values = [
            index + 1,
            cells[0]?.textContent?.trim() || '',
            cells[1]?.textContent?.trim() || '',
            cells[2]?.textContent?.trim() || '0'
        ];

        csvRows.push(values.map(escapeCsvValue).join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const title = @json($title ?? 'session');
    const date = @json($date ?? '');
    const safeTitle = String(title).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'session';
    const safeDate = String(date).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    link.href = url;
    link.download = `discipline_session_${safeTitle}${safeDate ? '_' + safeDate : ''}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
    const text = value === null || value === undefined ? '' : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}
</script>
@endsection
