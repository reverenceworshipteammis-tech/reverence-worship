@props(['canManage' => false])

<div class="bg-white rounded-lg shadow-lg p-6">
    <!-- Header -->
    <div class="mb-6">
        <h3 class="text-lg font-bold text-gray-800 mb-2">
            <i class="fas fa-users text-blue-600 mr-2"></i>Service Team Generator
        </h3>
        <p class="text-sm text-gray-600">
            Automatically generate balanced singer teams for services based on voice part and performance level.
        </p>
    </div>
    
    <!-- Generator Form -->
    <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
        <form method="POST" action="{{ route('music.teams.generate') }}" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            @csrf
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input type="text" name="service_name" required placeholder="e.g., Sunday Morning Worship" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Number of Teams to generate</label>
                <input type="number" name="number_of_teams" required min="1" max="10" value="2"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            <div class="flex items-end">
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                    <i class="fas fa-magic mr-2"></i> Generate Teams
                </button>
            </div>
        </form>
    </div>
    
    <!-- Previous Teams -->
    <div>
        <h4 class="font-semibold text-gray-700 mb-3 flex items-center">
            <i class="fas fa-history text-gray-500 mr-2"></i>Most Recent Generated Teams
        </h4>
        
        @forelse($serviceTeams ?? [] as $serviceTeam)
        <div class="border rounded-lg mb-4 overflow-hidden">
            <div class="bg-gray-50 px-4 py-3 flex justify-between items-center">
                <div>
                    <h5 class="font-bold text-gray-800">{{ $serviceTeam->service_name }}</h5>
                    <p class="text-xs text-gray-500">
                        Generated: {{ $serviceTeam->created_at->format('M d, Y H:i') }} | 
                        Teams: {{ $serviceTeam->number_of_teams }} | 
                        Members: {{ $serviceTeam->members->count() }}
                    </p>
                </div>
                @if($canManage)
                <form action="{{ route('music.teams.delete', $serviceTeam->id) }}" method="POST" class="inline" 
                      onsubmit="return confirmSubmit(event, 'Delete this service team?')">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="text-red-600 hover:text-red-800 text-sm">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </form>
                @endif
            </div>
            
            <div class="p-4">
                <div class="grid grid-cols-1 md:grid-cols-{{ min($serviceTeam->number_of_teams, 4) }} gap-4">
                    @php
                        $teamsGrouped = $serviceTeam->members->groupBy('team_number');
                    @endphp
                    @foreach($teamsGrouped as $teamNum => $members)
                    <div class="border rounded-lg p-3 bg-white">
                        <h6 class="font-semibold text-blue-600 mb-2 text-center">Team {{ $teamNum }}</h6>
                        <div class="space-y-2">
                            @foreach($members as $member)
                            <div class="flex items-center justify-between text-sm border-b pb-1">
                                <div>
                                    <span class="font-medium">{{ $member->user->name ?? 'Unknown' }}</span>
                                    <span class="text-xs text-gray-500 ml-2">({{ $member->voice_part ?? '?' }})</span>
                                </div>
                                <span class="text-xs px-2 py-0.5 rounded-full 
                                  
                                    {{ $member->performance_level == 'Good' ? 'bg-green-100 text-green-800' : '' }}
                                    {{ $member->performance_level == 'Normal' ? 'bg-gray-100 text-gray-800' : '' }}">
                                    {{ $member->performance_level ?? '?' }}
                                </span>
                            </div>
                            @endforeach
                        </div>
                    </div>
                    @endforeach
                </div>
            </div>
        </div>
        @empty
        <div class="text-center text-gray-500 py-8">
            <i class="fas fa-users-slash fa-3x mb-3 text-gray-300"></i>
            <p>No service teams generated yet.</p>
            <p class="text-sm">Use the generator above to create balanced teams.</p>
        </div>
        @endforelse
    </div>
</div>
