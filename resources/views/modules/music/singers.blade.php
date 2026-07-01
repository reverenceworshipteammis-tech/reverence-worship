@props(['canManage' => false])

<div class="bg-white rounded-lg shadow-lg p-6">
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-gray-800">Manage Singers (Voice Part & Level)</h3>
        @if($canManage)
        <a href="{{ route('users.index') }}" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">
            <i class="fas fa-user-plus mr-2"></i> Add New Singer
        </a>
        @endif
    </div>
    
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NAME</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">EMAIL</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">VOICE PART</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PERFORMANCE LEVEL</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                @forelse($singers ?? [] as $singer)
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">{{ $singer->name }}</td>
                    <td class="px-6 py-4">{{ $singer->email }}</td>
                    <td class="px-6 py-4">
                        @if($canManage)
                        <select data-user-id="{{ $singer->id }}" 
                                class="voice-part-select border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option value="">Select Voice</option>
                            <option value="Soprano" {{ $singer->voice_part == 'Soprano' ? 'selected' : '' }}>Soprano</option>
                            <option value="Alto" {{ $singer->voice_part == 'Alto' ? 'selected' : '' }}>Alto</option>
                            <option value="Tenor" {{ $singer->voice_part == 'Tenor' ? 'selected' : '' }}>Tenor</option>
                            <option value="Bass" {{ $singer->voice_part == 'Bass' ? 'selected' : '' }}>Bass</option>
                            <option value="Lead" {{ $singer->voice_part == 'Lead' ? 'selected' : '' }}>Lead Vocalist</option>
                        </select>
                        @else
                        {{ $singer->voice_part ?? '-' }}
                        @endif
                    </td>
                    <td class="px-6 py-4">
                        @if($canManage)
                        <select data-user-id="{{ $singer->id }}" 
                                class="performance-level-select border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <option value="">Select Level</option>
                            <option value="Normal" {{ $singer->singer_level == 'Normal' ? 'selected' : '' }}>Normal</option>
                            <option value="Good" {{ $singer->singer_level == 'Good' ? 'selected' : '' }}>Good</option>
                        </select>
                        @else
                        {{ $singer->singer_level ?? '-' }}
                        @endif
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="4" class="px-6 py-8 text-center text-gray-500">No singers found</td>
                </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // Handle voice part changes
    document.querySelectorAll('.voice-part-select').forEach(select => {
        select.addEventListener('change', function() {
            const userId = this.dataset.userId;
            const value = this.value;
            
            fetch(`/music/singers/${userId}/voice-part`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ voice_part: value })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    appAlert('Voice part updated!');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                appAlert('Error updating voice part');
            });
        });
    });
    
    // Handle performance level changes
    document.querySelectorAll('.performance-level-select').forEach(select => {
        select.addEventListener('change', function() {
            const userId = this.dataset.userId;
            const value = this.value;
            
            fetch(`/music/singers/${userId}/performance-level`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ performance_level: value })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    appAlert('Performance level updated!');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                appAlert('Error updating performance level');
            });
        });
    });
});

async function toggleSingerStatus(userId) {
    if (!(await appConfirm('Remove this user from singers list?'))) {
        fetch(`/music/singers/${userId}/toggle`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify({ is_singer: false })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            appAlert('Error updating singer status');
        });
    }
}
</script>

