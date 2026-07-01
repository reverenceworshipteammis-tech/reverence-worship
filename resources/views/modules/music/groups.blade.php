@props(['canManage' => false, 'generations' => [], 'singers' => [], 'voiceParts' => [], 'performanceLevels' => []])

<div class="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">

    <!-- Top Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

        <h2 class="text-2xl font-bold text-gray-900">
            Groups
        </h2>

        <div class="flex flex-wrap gap-3">
            <button onclick="openSettingsModal()"
                class="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm text-gray-700 font-small">
                <i class="fas fa-cog"></i>
                Settings
            </button>

            <button onclick="openPreviousModal()"
                class="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm text-gray-700 font-small">

                <i class="fas fa-history"></i>
                View Previous
            </button>

            <button onclick="openGeneratedListModal()"
                class="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm text-gray-700 font-small">
                <i class="fas fa-file-lines"></i>
                View Generated List
            </button>

            <button onclick="openGenerateModal()"
                class="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 hover:opacity-90 transition text-white font-small shadow-md">
                <i class="fas fa-plus-circle"></i>
                Generate Groups
            </button>
        </div>
    </div>

    <!-- Display Generated Groups -->
    @if($generations && $generations->count() > 0)
    @php
    $latestGeneration = $generations->first();
    $teams = $latestGeneration->members->groupBy('team_number');
    @endphp

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
        @foreach($teams as $teamNum => $members)
        <div class="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition cursor-pointer"
            onclick="viewTeamDetails({{ $latestGeneration->id }}, {{ $teamNum }})">

            <div class="flex items-center justify-between">
                <div>
                    <h4 class="text-lg font-bold text-gray-800">Service {{ chr(64 + $teamNum) }}</h4>
                    <p class="text-xs text-gray-400 mt-0.5">
                        {{ $latestGeneration->service_date ? date('M d, Y', strtotime($latestGeneration->service_date)) : 'No date' }}
                    </p>
                </div>
                <div class="w-7 h-7 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                    <i class="fas fa-chevron-right text-xs"></i>
                </div>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-100">
                <div class="flex items-center gap-2 text-xs text-gray-500">
                    <i class="fas fa-users text-gray-400"></i>
                    <span>{{ $members->count() }} singers</span>
                </div>
            </div>
        </div>
        @endforeach
    </div>
    @else
    <div class="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center">
        <i class="fas fa-users text-5xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-700 mb-2">No Groups Generated</h3>
        <p class="text-gray-500">Click Generate Groups to create teams.</p>
    </div>
    @endif
</div>

<!-- Generate Groups Modal -->
<div id="generateModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-6 border w-full max-w-md shadow-xl rounded-xl bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 class="text-xl font-bold text-gray-900">Generate Groups</h3>
            <button onclick="closeModal('generateModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <form id="generateGroupsForm" method="POST" action="{{ route('music.teams.generate') }}" class="mt-4 space-y-4">
            @csrf

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                <input type="text" name="service_name" id="serviceName" required
                    value="Sunday Service"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Service Date *</label>
                <input type="date" name="service_date" id="serviceDate" required
                    value="{{ date('Y-m-d') }}"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Number of Teams *</label>
                <select name="number_of_teams" id="numberOfTeams" required
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="1">1 Team</option>
                    <option value="2" selected>2 Teams</option>
                    <option value="3">3 Teams</option>
                    <option value="4">4 Teams</option>
                    <option value="5">5 Teams</option>
                </select>
            </div>

            <div class="bg-blue-50 rounded-lg p-3 text-sm">
                <p class="text-blue-800 font-medium mb-1">How groups are formed:</p>
                
            </div>

            <div class="flex justify-end gap-3 pt-3 border-t">
                <button type="button" onclick="closeModal('generateModal')" class="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Generate Groups</button>
            </div>
        </form>
    </div>
</div>

<!-- Settings Modal -->
<!-- Settings Modal -->
<div id="settingsModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-xl rounded-xl bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <div>
                <h3 class="text-xl font-bold text-gray-900">Settings</h3>

                <p class="text-xs text-gray-400 mt-1">
                    <i class="fas fa-database mr-1"></i>
                    <span id="singerCount">{{ $singers->count() }}</span> permanent members found
                </p>
            </div>
            <button onclick="closeModal('settingsModal')" class="text-gray-400 hover:text-gray-600 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <div class="relative my-3">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input type="text" id="singerSearchInput" placeholder="Search singers by name or email..."
                class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div class="overflow-x-auto rounded-lg border border-gray-200 max-h-80 overflow-y-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50 sticky top-0">
                    <tr>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">NAME</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">MEMBERSHIP</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">VOICE</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">LEVEL</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-100">
                    @php
                    // Filter singers to only show Permanent members
                    $permanentSingers = $singers->filter(function($singer) {
                    $membershipType = $singer->membership_type ?? '';
                    return strtolower(trim($membershipType)) === 'permanent';
                    });
                    @endphp

                    @forelse($permanentSingers as $singer)
                    <tr class="hover:bg-gray-50 transition singer-row"
                        data-name="{{ strtolower($singer->name) }}"
                        data-email="{{ strtolower($singer->email) }}">
                        <td class="px-4 py-2">
                            <div>
                                <p class="font-medium text-gray-900 text-sm">{{ $singer->name }}</p>
                                <p class="text-xs text-gray-400">{{ $singer->email }}</p>
                            </div>
                        </td>
                        <td class="px-4 py-2">
                            <span class="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                                {{ $singer->membership_type ?? 'Permanent' }}
                            </span>
                        </td>
                        <td class="px-4 py-2">
                            <select data-user-id="{{ $singer->id }}" data-field="voice_part"
                                class="singer-select border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-28">
                                <option value="">Select Voice</option>
                                @foreach($voiceParts ?? [] as $voice)
                                <option value="{{ $voice }}" {{ $singer->voice_part == $voice ? 'selected' : '' }}>{{ $voice }}</option>
                                @endforeach
                            </select>

                        </td>
                        <td class="px-4 py-2">
                            <select data-user-id="{{ $singer->id }}" data-field="singer_level"
                                class="singer-select border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-24">
                                <option value="">Select Level</option>
                                @foreach($performanceLevels ?? [] as $level)
                                <option value="{{ $level }}" {{ $singer->singer_level == $level ? 'selected' : '' }}>{{ $level }}</option>
                                @endforeach
                            </select>

                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                            <i class="fas fa-user-slash text-2xl mb-2 block text-gray-300"></i>
                            <p>No permanent members found.</p>
                            <p class="text-xs mt-1">Only members with "Permanent" membership type are shown here.</p>

                            @if($singers->count() > 0)
                            <div class="mt-4 text-left text-xs border-t border-gray-200 pt-3">
                                <p class="font-semibold text-gray-600 mb-2">ðŸ“Š Membership Type Distribution:</p>
                                @php
                                $grouped = $singers->groupBy('membership_type');
                                @endphp
                                @foreach($grouped as $type => $users)
                                <p class="text-gray-500">
                                    <span class="inline-block w-24">{{ $type ?: 'Not Set' }}</span>
                                    <span class="font-bold text-blue-600">{{ $users->count() }}</span> users
                                    @if(strtolower(trim($type)) === 'permanent')
                                    <span class="text-green-500">âœ…</span>
                                    @endif
                                </p>
                                @endforeach
                            </div>
                            @else
                            <div class="mt-4 text-left text-xs border-t border-gray-200 pt-3">
                                <p class="text-red-500">âš ï¸ No singers found in the database.</p>
                                <p class="text-gray-400 mt-1">Make sure users have a membership_type value.</p>
                            </div>
                            @endif
                        </td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="flex justify-between items-center mt-4 pt-3 border-t">

            <div class="flex gap-2">
                <button onclick="closeModal('settingsModal')" class="px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition">
                    Cancel
                </button>
                <button onclick="saveAllSettings()" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
                    <i class="fas fa-save mr-1"></i> Save Changes
                </button>
            </div>
        </div>
    </div>
</div>

<!-- View Previous Generations Modal -->
<div id="previousModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
    <div class="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-2xl rounded-xl bg-white max-h-[90vh]">
        <!-- Header -->
        <div class="flex justify-between items-center pb-3 border-b">
            <div>
                <h3 class="text-xl font-semibold text-gray-900">Group Generation History</h3>

            </div>
            <button onclick="closeModal('previousModal')" class="text-gray-400 hover:text-gray-600 transition">
                <i class="fas fa-times text-lg"></i>
            </button>
        </div>

        <!-- Content -->
        <div class="mt-4 overflow-y-auto" style="max-height: calc(90vh - 180px);">
            @forelse($generations ?? [] as $gen)
            <div class="border rounded-lg p-3.5 mb-3 hover:shadow-md transition bg-white">
                <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <!-- Left - Generation Info -->
                    <div class="flex-1 min-w-0">

                        <h4 class="text-sm font-semibold text-gray-900 truncate">{{ $gen->service_name }}</h4>
                        <div class="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <span class="flex items-center gap-1">
                                <i class="far fa-calendar-alt text-gray-400 text-sm"></i>
                                {{ $gen->service_date ? \Carbon\Carbon::parse($gen->service_date)->format('M d, Y') : 'No date' }}
                            </span>
                            <span class="text-gray-300">|</span>
                            <span class="flex items-center gap-1">
                                <i class="fas fa-users text-gray-400 text-sm"></i>
                                {{ $gen->members->count() }} members
                            </span>
                            <span class="text-gray-300">|</span>
                            <span class="flex items-center gap-1">
                                <i class="fas fa-layer-group text-gray-400 text-sm"></i>
                                {{ $gen->number_of_teams ?? $gen->members->groupBy('team_number')->count() }} teams
                            </span>
                        </div>
                        <div class="flex flex-wrap gap-1 mt-1.5">
                            @php
                            $teamGroups = $gen->members->groupBy('team_number');
                            $teamLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                            @endphp
                            @foreach($teamGroups as $teamNum => $members)
                            <span class="text-sm px-2 py-0.5 bg-gray-50 text-gray-600 rounded border border-gray-200">
                                Team {{ $teamLetters[$teamNum - 1] ?? $teamNum }}: {{ $members->count() }}
                            </span>
                            @endforeach
                        </div>
                    </div>

                    <!-- Right - Actions -->
                    <div class="flex flex-wrap gap-1 items-center flex-shrink-0">
                        <button onclick="viewFullGenerationDetails({{ $gen->id }})"
                            class="px-2.5 py-1 text-sm font-medium bg-black-50 hover:bg-black-100 text-black-600 rounded transition flex items-center gap-1">
                            <i class="fas fa-file-lines text-sm"></i> View
                        </button>
                        <button onclick="restoreGeneration({{ $gen->id }})"
                            class="px-2.5 py-1 text-sm font-medium bg-black-50 hover:bg-black-100 text-black-600 rounded transition flex items-center gap-1">
                            <i class="fas fa-history text-sm"></i> Restore
                        </button>
                        <a href="{{ route('music.teams.export', $gen->id) }}"
                            class="px-2.5 py-1 text-sm font-medium bg-black-50 hover:bg-black-100 text-black-600 rounded transition flex items-center gap-1">
                            <i class="fas fa-file-export text-sm"></i> Export
                        </a>
                        <form action="{{ route('music.teams.delete', $gen->id) }}" method="POST" class="inline"
                            onsubmit="return confirmSubmit(event, 'âš ï¸ Delete this generation? This action cannot be undone.')">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="px-2.5 py-1 text-sm font-medium bg-black-50 hover:bg-black-100 text-black-600 rounded transition flex items-center gap-1">
                                <i class="fas fa-trash-alt text-sm"></i> Delete
                            </button>
                        </form>
                    </div>
                </div>


            </div>
            @empty
            <div class="text-center py-12">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i class="fas fa-history text-2xl text-gray-400"></i>
                </div>
                <h4 class="text-sm font-medium text-gray-700 mb-1">No Generations Found</h4>
                <p class="text-xs text-gray-500">Click "Generate Groups" to create your first service teams.</p>
                <button onclick="closeModal('previousModal'); openGenerateModal();"
                    class="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition flex items-center gap-1.5 mx-auto">
                    <i class="fas fa-plus-circle text-xs"></i> Generate Groups
                </button>
            </div>
            @endforelse
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-2 mt-4 pt-3 border-t">
            <button onclick="closeModal('previousModal')" class="px-3.5 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 transition">
                Close
            </button>
            @if(($generations ?? [])->count() > 0)
            <button onclick="exportAllGenerations()" class="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs transition flex items-center gap-1.5">
                <i class="fas fa-file-export text-xs"></i> Export All
            </button>
            @endif
        </div>
    </div>
</div>

<!-- View Generated List Modal -->
<div id="generatedListModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]">
    <div class="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-2xl rounded-xl bg-white max-h-[100vh]">
        <!-- Header -->
        <div class="flex justify-between items-center pb-4 border-b">
            <div>
                <h3 class="text-xl font-bold text-gray-900">Generated Service Groups</h3>

            </div>
            <button onclick="closeModal('generatedListModal')" class="text-gray-400 hover:text-gray-600 transition">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <!-- Content -->
        <div id="generatedListContent" class="mt-5 overflow-y-auto" style="max-height: calc(90vh - 180px);">
            <!-- Content will be loaded here -->
        </div>

        <!-- Footer -->

    </div>
</div>

<style>
    /* Modal overlay - ensures it covers everything including sidebar */
    .modal {
        z-index: 9999 !important;
    }

    .modal .relative {
        z-index: 10000 !important;
    }

    /* Ensure modal content scrolls smoothly */
    #generatedListContent {
        scroll-behavior: smooth;
    }

    #generatedListContent::-webkit-scrollbar {
        width: 6px;
    }

    #generatedListContent::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
    }

    #generatedListContent::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 10px;
    }

    #generatedListContent::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
    }
</style>

<!-- View Team Details Modal -->
<div id="teamDetailsModal" class="modal hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
    <div class="relative top-20 mx-auto p-5 border w-full max-w-xl shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-center pb-3 border-b">
            <h3 id="teamDetailsTitle" class="text-lg font-bold text-gray-800">Team Members</h3>
            <button onclick="closeModal('teamDetailsModal')" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        <div id="teamDetailsContent" class="mt-4 max-h-80 overflow-y-auto"></div>
        <div class="flex justify-end mt-4 pt-3 border-t">
            <button onclick="closeModal('teamDetailsModal')" class="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm">Close</button>
        </div>
    </div>
</div>

<script>
    // ==================== MODAL FUNCTIONS ====================
    function openSettingsModal() {
        document.getElementById('settingsModal').classList.remove('hidden');
    }

    function openPreviousModal() {
        document.getElementById('previousModal').classList.remove('hidden');
    }

    function openGeneratedListModal() {
    @if($generations && $generations->count() > 0)
        viewFullGenerationDetails({{ $generations->first()->id }});
    @else
        appAlert('No groups generated yet');
    @endif
}

    function openGenerateModal() {
        document.getElementById('generateModal').classList.remove('hidden');
    }

    function closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    // ==================== SEARCH FUNCTIONALITY ====================
    const singerSearchInput = document.getElementById('singerSearchInput');
    if (singerSearchInput) {
        singerSearchInput.addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();
            document.querySelectorAll('.singer-row').forEach(row => {
                const name = row.dataset.name || '';
                const email = row.dataset.email || '';
                if (name.includes(searchTerm) || email.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // ==================== SAVE ALL SETTINGS ====================
    async function saveAllSettings() {
        const selects = document.querySelectorAll('#settingsModal .singer-select');
        const saveBtn = document.querySelector('#settingsModal button[onclick="saveAllSettings()"]');
        const originalText = saveBtn.innerHTML;

        if (selects.length === 0) {
            appAlert('No singers found to save');
            return;
        }

        const changes = [];
        selects.forEach(select => {
            const userId = select.dataset.userId;
            const field = select.dataset.field;
            const value = select.value;
            if (value) {
                changes.push({
                    user_id: userId,
                    field: field,
                    value: value
                });
            }
        });

        if (changes.length === 0) {
            appAlert('No changes to save.');
            return;
        }

        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Saving...';
        saveBtn.disabled = true;

        try {
            const response = await fetch('/music/singers/update-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    updates: changes
                })
            });

            const data = await response.json();

            if (data.success) {
                appAlert('Settings saved successfully!');
                location.reload();
            } else {
                appAlert('Error: ' + (data.message || 'Failed to save'));
            }
        } catch (error) {
            console.error('Error:', error);
            appAlert('Network error: ' + error.message);
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    }

    // ==================== GENERATE GROUPS ====================
    document.getElementById('generateGroupsForm')?.addEventListener('submit', function(e) {
        e.preventDefault();

        const form = this;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Generating...';
        submitBtn.disabled = true;

        fetch(form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    service_name: document.getElementById('serviceName').value,
                    service_date: document.getElementById('serviceDate').value,
                    number_of_teams: parseInt(document.getElementById('numberOfTeams').value)
                })
            })
            .then(response => response.json())
            .then(data => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                closeModal('generateModal');

                if (data.success) {
                    appAlert('Groups generated successfully!');
                    location.reload();
                } else {
                    appAlert('Error: ' + (data.message || 'Unknown error'));
                }
            })
            .catch(error => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                appAlert('Network error: ' + error.message);
            });
    });

    async function exportAllGenerations() {
        if (!(await appConfirm('Export all generations data as CSV?'))) {
            window.location.href = '/music/teams/export-all';
        }
    }
    // ==================== VIEW TEAM DETAILS ====================
    function viewTeamDetails(id, teamNum) {
    // Get modal elements
    const modal = document.getElementById('teamDetailsModal');
    const content = document.getElementById('teamDetailsContent');
    const title = document.getElementById('teamDetailsTitle');
    
    // Show loading state
    content.innerHTML = `
        <div class="flex items-center justify-center py-8">
            <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p class="mt-2 text-sm text-gray-500">Loading team details...</p>
            </div>
        </div>
    `;
    
    // Show modal immediately with loading state
    modal.classList.remove('hidden');
    
    // Close any existing notification
    if (window.currentNotification) {
        window.currentNotification.remove();
    }
    
    fetch(`/music/teams/${id}/details`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const teamLetter = String.fromCharCode(64 + teamNum);
                const team = data.teams[teamNum - 1];
                
                // Update title with badge and export button
                title.innerHTML = `
                    <div class="flex items-center justify-between w-full">
                        <div class="flex items-center gap-3">
                            <span class="text-lg font-semibold text-gray-800">Service ${teamLetter} - ${escapeHtml(data.service_name)}</span>
                            <span class="px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                                ${team.members.length} Member${team.members.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <button onclick="exportTeamMembers(${id}, ${teamNum}, '${escapeHtml(data.service_name)}', '${teamLetter}')" 
                                class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Export CSV
                        </button>
                    </div>
                `;

                // Build members list in table format with columns
                let html = `
                    <div class="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        <table class="w-full">
                            <thead class="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">#</th>
                                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Voice</th>
                                    <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Performance</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                `;
                
                if (team.members.length === 0) {
                    html += `
                        <tr>
                            <td colspan="4" class="text-center py-8 text-gray-400">
                                <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                                <p class="text-sm">No members assigned to this team</p>
                            </td>
                        </tr>
                    `;
                } else {
                    team.members.forEach((member, index) => {
                        // Determine performance level color
                        let levelColor = 'bg-gray-100 text-gray-700';
                        let levelIcon = '';
                        if (member.performance_level === 'Good') {
                            levelColor = 'bg-gray-100 text-gray-700';
                          
                        } else if (member.performance_level === 'Excellent') {
                            levelColor = 'bg-blue-100 text-blue-700';
                           
                        } else if (member.performance_level === 'Needs Improvement') {
                            levelColor = 'bg-yellow-100 text-yellow-700';
                            
                        }
                        
                        html += `
                            <tr class="hover:bg-gray-50 transition duration-150">
                                <td class="px-4 py-3 text-sm text-gray-400">${index + 1}</td>
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-2">
                                        <div class="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                                            ${escapeHtml(member.name.charAt(0).toUpperCase())}
                                        </div>
                                        <span class="font-medium text-gray-800 text-sm">${escapeHtml(member.name)}</span>
                                    </div>
                                </td>
                                <td class="px-4 py-3">
                                    <span class="text-sm text-gray-600 flex items-center gap-1">
                                        
                                        ${escapeHtml(member.voice_part)}
                                    </span>
                                </td>
                                <td class="px-4 py-3">
                                    <span class="px-2.5 py-1 text-xs font-medium rounded-full ${levelColor}">
                                        ${levelIcon}${escapeHtml(member.performance_level)}
                                    </span>
                                </td>
                            </tr>
                        `;
                    });
                }
                
                html += `
                            </tbody>
                        </table>
                    </div>
                `;
                
                content.innerHTML = html;
                
                // Add a subtle animation
                content.classList.add('fade-in');
                setTimeout(() => content.classList.remove('fade-in'), 300);
                
            } else {
                throw new Error(data.message || 'Failed to load team details');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            
            // Show error state with retry option
            content.innerHTML = `
                <div class="text-center py-8">
                    <svg class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p class="text-sm text-gray-600 mb-2">Unable to load team details</p>
                    <p class="text-xs text-gray-400 mb-3">${escapeHtml(error.message || 'Please try again')}</p>
                    <button onclick="viewTeamDetails(${id}, ${teamNum})" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
                        <svg class="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Retry
                    </button>
                </div>
            `;
            
            // Show user-friendly notification
            showFriendlyNotification('error', 'Could not load team details. Please check your connection and try again.');
        });
}

// Export team members to CSV
function exportTeamMembers(id, teamNum, serviceName, teamLetter) {
    // Show loading state on button
    const exportBtn = document.querySelector('button[onclick*="exportTeamMembers"]');
    const originalText = exportBtn ? exportBtn.innerHTML : '';
    if (exportBtn) {
        exportBtn.innerHTML = `
            <svg class="inline w-3.5 h-3.5 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Exporting...
        `;
        exportBtn.disabled = true;
    }
    
    fetch(`/music/teams/${id}/details`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const team = data.teams[teamNum - 1];
                
                if (!team || team.members.length === 0) {
                    showFriendlyNotification('error', 'No members to export');
                    return;
                }
                
                // Generate CSV
                let csv = [];
                
                // Add BOM for UTF-8 and headers
                const headers = ['#', 'Name', 'Voice', 'Performance'];
                csv.push(headers.join(','));
                
                // Add member data
                team.members.forEach((member, index) => {
                    const row = [
                        index + 1,
                        `"${(member.name || '').replace(/"/g, '""')}"`,
                        `"${(member.voice_part || '').replace(/"/g, '""')}"`,
                        `"${(member.performance_level || '').replace(/"/g, '""')}"`
                    ];
                    csv.push(row.join(','));
                });
                
                // Create and download CSV file
                const blob = new Blob(['\uFEFF' + csv.join('\n')], { 
                    type: 'text/csv;charset=utf-8;' 
                });
                
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `Service_${teamLetter}_${serviceName.replace(/[^a-zA-Z0-9]/g, '_')}_Team.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showFriendlyNotification('success', `Exported ${team.members.length} members successfully!`);
            } else {
                throw new Error(data.message || 'Failed to export team details');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showFriendlyNotification('error', 'Failed to export team members. Please try again.');
        })
        .finally(() => {
            // Restore button state
            if (exportBtn) {
                exportBtn.innerHTML = originalText;
                exportBtn.disabled = false;
            }
        });
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function for user-friendly notifications
function showFriendlyNotification(type, message) {
    // Remove any existing notification
    if (window.currentNotification) {
        window.currentNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in max-w-md`;
    notification.style.backgroundColor = type === 'error' ? '#ef4444' : '#10b981';
    notification.style.border = '1px solid rgba(255,255,255,0.1)';
    notification.style.backdropFilter = 'blur(8px)';
    
    const icon = type === 'error' ? 'âœ•' : 'âœ“';
    
    notification.innerHTML = `
        <div class="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
            ${icon}
        </div>
        <div class="flex-1">
            <p class="text-white font-medium text-sm">${type === 'error' ? 'Error' : 'Success'}</p>
            <p class="text-white/90 text-xs">${escapeHtml(message)}</p>
        </div>
        <button onclick="this.parentElement.remove()" class="text-white/70 hover:text-white transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    `;
    
    document.body.appendChild(notification);
    window.currentNotification = notification;
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Add this CSS to your stylesheet if not already present
const style = document.createElement('style');
style.textContent = `
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
    }
    
    .fade-in {
        animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    .animate-slide-in {
        animation: slideIn 0.3s ease-out;
        transition: opacity 0.3s, transform 0.3s;
    }
    
    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    /* Table styles */
    .sticky {
        position: sticky;
    }
    
    table {
        border-collapse: collapse;
    }
    
    tbody tr:hover {
        background-color: #f9fafb;
    }
`;
document.head.appendChild(style);

    // ==================== VIEW FULL GENERATION DETAILS ====================
    function viewFullGenerationDetails(id) {
        // Show loading state
        const modal = document.getElementById('generatedListModal');
        const content = document.getElementById('generatedListContent');
        content.innerHTML = `
        <div class="flex items-center justify-center py-12">
            <div class="inline-flex items-center gap-3 text-gray-500">
                <svg class="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading team details...</span>
            </div>
        </div>
    `;
        modal.classList.remove('hidden');

        fetch(`/music/teams/${id}/details`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Build summary stats
                    const totalMembers = data.teams.reduce((sum, team) => sum + (team.members ? team.members.length : 0), 0);
                    const totalTeams = data.teams.length;

                    let html = `
                    <!-- Summary Stats -->
                    <div class="grid grid-cols-3 gap-3 mb-5">
                        <div class="bg-blue-50 rounded-lg p-3 text-center">
                            <p class="text-2xl font-bold text-blue-600">${totalTeams}</p>
                            <p class="text-xs text-gray-500">Teams</p>
                        </div>
                        <div class="bg-green-50 rounded-lg p-3 text-center">
                            <p class="text-2xl font-bold text-green-600">${totalMembers}</p>
                            <p class="text-xs text-gray-500">Total Members</p>
                        </div>
                       
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                `;

                    // Loop through all teams
                    data.teams.forEach((team, index) => {
                        const teamNumber = team.team_number || index + 1;
                        const teamLetter = String.fromCharCode(64 + teamNumber);
                        const members = team.members || [];
                        const memberCount = members.length;

                        // Calculate voice part distribution
                        const voiceCounts = {};
                        members.forEach(m => {
                            const voice = m.voice_part || 'Unknown';
                            voiceCounts[voice] = (voiceCounts[voice] || 0) + 1;
                        });

                        // Calculate level distribution
                        const goodCount = members.filter(m => m.performance_level === 'Good').length;
                        const normalCount = members.filter(m => m.performance_level === 'Normal').length;

                        html += `
                        <div class="border rounded-xl overflow-hidden hover:shadow-md transition">
                            <!-- Team Header -->
                            <div class="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2 flex items-center justify-between">
                                <div>
                                    <h4 class="text-white font-bold text-sm">Service ${teamLetter}</h4>
                                    <p class="text-indigo-100 text-xs">${memberCount} members</p>
                                </div>
                                
                            </div>
                            
                            <!-- Voice Distribution -->
                            <div class="bg-gray-50 px-4 py-2 border-b flex flex-wrap gap-2">
                                ${Object.entries(voiceCounts).map(([voice, count]) => `
                                    <span class="text-xs px-2 py-0.5 bg-white rounded-full border text-gray-600">
                                        ${voice}: ${count}
                                    </span>
                                `).join('')}
                            </div>
                            
                            <!-- Members List -->
                            <div class="max-h-150 overflow-y-auto divide-y divide-gray-100">
                                ${members.length > 0 ? members.map(member => `
                                    <div class="flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition">
                                        <div class="flex items-center gap-3">
                                            <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                ${member.name ? member.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <span class="text-sm font-medium text-gray-800">${escapeHtml(member.name || 'Unknown')}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-xs text-blue-600">${escapeHtml(member.voice_part || '-')}</span>
                                            <span class="text-xs px-2 py-0.5 rounded-full ${member.performance_level == 'Good' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                                                ${member.performance_level || 'Normal'}
                                            </span>
                                        </div>
                                    </div>
                                `).join('') : `
                                    <div class="text-center py-4 text-gray-400 text-sm">No members</div>
                                `}
                            </div>
                        </div>
                    `;
                    });

                    html += `
                    </div>
                    <div class="flex justify-end gap-3 mt-5 pt-4 border-t">
                        <button onclick="closeModal('generatedListModal')" class="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition">
                            Close
                        </button>
                        <a href="/music/teams/${id}/export" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition flex items-center gap-2">
                            <i class="fas fa-file-export"></i> Export CSV
                        </a>
                    </div>
                `;

                    document.getElementById('generatedListContent').innerHTML = html;
                } else {
                    document.getElementById('generatedListContent').innerHTML = `
                    <div class="text-center py-12">
                        <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-3"></i>
                        <p class="text-red-500">${data.message || 'Failed to load team details'}</p>
                        <button onclick="closeModal('generatedListModal')" class="mt-4 px-4 py-2 bg-gray-200 rounded-lg text-sm">Close</button>
                    </div>
                `;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('generatedListContent').innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-exclamation-circle text-4xl text-red-400 mb-3"></i>
                    <p class="text-red-500">Network error loading details</p>
                    <button onclick="closeModal('generatedListModal')" class="mt-4 px-4 py-2 bg-gray-200 rounded-lg text-sm">Close</button>
                </div>
            `;
            });
    }

    // ==================== RESTORE GENERATION ====================
    async function restoreGeneration(id) {
        if (!(await appConfirm('Restore this generation? It will create a new copy.'))) {
            fetch(`/music/teams/${id}/restore`, {
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
                        appAlert('Generation restored successfully!');
                        location.reload();
                    } else {
                        appAlert('Error: ' + (data.message || 'Failed to restore'));
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    appAlert('Network error: ' + error.message);
                });
        }
    }

    // ==================== HELPER FUNCTIONS ====================
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
</script>

<style>
    .modal {
        display: none;
    }

    .modal:not(.hidden) {
        display: block !important;
    }
</style>



