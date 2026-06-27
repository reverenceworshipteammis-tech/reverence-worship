<div>
    <div class="space-y-6">

        <!-- Statistics Cards - White background -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Permission Requests Card -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-xs uppercase tracking-wide">Permission Requests</p>
                        <p class="text-2xl font-bold text-gray-800 mt-1">{{ $stats->permission_requests ?? 0 }}</p>
                    </div>
                    <div class="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <i class="fas fa-envelope text-indigo-500 text-lg"></i>
                    </div>
                </div>
            </div>

            <!-- Attendance Sessions Card -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-xs uppercase tracking-wide">Attendance Sessions</p>
                        <p class="text-2xl font-bold text-gray-800 mt-1">{{ $stats->attendance_sessions ?? 0 }}</p>
                    </div>
                    <div class="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                        <i class="fas fa-calendar-check text-purple-500 text-lg"></i>
                    </div>
                </div>
            </div>

            <!-- Discipline Sessions Card -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-xs uppercase tracking-wide">Discipline Sessions</p>
                        <p class="text-2xl font-bold text-gray-800 mt-1">{{ $stats->total_discipline_sessions ?? 0 }}</p>
                    </div>
                    <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <i class="fas fa-gavel text-blue-500 text-lg"></i>
                    </div>
                </div>
            </div>

            <!-- Avg Good Behavior Card -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-500 text-xs uppercase tracking-wide">Avg Good Behavior</p>
                        <p class="text-2xl font-bold text-gray-800 mt-1">{{ round($stats->avg_good_behavior ?? 0) }}%</p>
                    </div>
                    <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <i class="fas fa-smile text-green-500 text-lg"></i>
                    </div>
                </div>
            </div>
        </div>

        <!-- Management Cards - 3 Column Grid White Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Attendance Management Card -->
            <div class="rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50/40 p-4 shadow-sm">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center ring-1 ring-sky-200">
                        <i class="fas fa-calendar-alt text-sky-700 text-sm"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-semibold text-slate-800">Attendance Management</h3>
                
                    </div>
                </div>
                <button onclick="switchTab('attendance')"
                    class="w-full rounded-xl bg-sky-100 py-2 text-sm font-medium text-sky-700 ring-1 ring-sky-200 transition-colors duration-200 hover:bg-sky-200">
                    Manage Attendance
                </button>
            </div>

            <!-- Permission Requests Card -->
            <div class="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50/40 p-4 shadow-sm">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center ring-1 ring-emerald-200">
                        <i class="fas fa-envelope-open-text text-emerald-700 text-sm"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-semibold text-slate-800">Permission Requests</h3>
                    </div>
                </div>
                <button onclick="switchTab('permission')"
                    class="w-full rounded-xl bg-emerald-100 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200 transition-colors duration-200 hover:bg-emerald-200">
                    Manage Requests
                </button>
            </div>

            <!-- Discipline Records Card -->
            <div class="rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-violet-50/30 p-4 shadow-sm">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center ring-1 ring-indigo-200">
                        <i class="fas fa-book text-indigo-700 text-sm"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-semibold text-slate-800">Discipline Records</h3>
                    </div>
                </div>
                <button onclick="switchTab('discipline-records')"
                    class="w-full rounded-xl bg-indigo-100 py-2 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 transition-colors duration-200 hover:bg-indigo-200">
                    Manage Discipline
                </button>
            </div>
        </div>

        <!-- Overview Date Range Filter -->
        <div class="mb-5 rounded-2xl border border-gray-100 bg-gradient-to-r from-white via-slate-50 to-white p-4 shadow-sm">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,170px))_auto] sm:items-end lg:justify-start">
                    <div>
                        <label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">From</label>
                        <input type="date" id="overview_start_date" value="{{ $startDate ?? date('Y-m-01') }}" class="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                    </div>
                    <div>
                        <label class="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">To</label>
                        <input type="date" id="overview_end_date" value="{{ $endDate ?? date('Y-m-t') }}" class="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                    </div>
                    <button onclick="applyOverviewFilter()" class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-200 hover:shadow-md">
                        <i class="fas fa-filter text-xs"></i>
                        Apply Range
                    </button>
                </div>
            </div>
        </div>

        <!-- Recent Sections - 2 Column Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <!-- Recent Attendance Sessions -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h2 class="text-sm font-semibold text-gray-800">
                        <i class="fas fa-gavel text-blue-500 mr-2"></i> Recent Attendance Sessions
                    </h2>
                </div>
                <div class="divide-y divide-gray-100">
                    @forelse($recentAttendanceSessions ?? [] as $session)
                    <div class="px-4 py-3 hover:bg-gray-50 transition">
                        <div class="flex items-center justify-between">
                            <div>
                                <h4 class="text-sm font-medium text-gray-800">{{ $session->session_type ?? 'Attendance Session' }}</h4>
                                <p class="text-xs text-gray-400 mt-0.5">
                                    <i class="far fa-calendar-alt mr-1"></i>
                                    {{ $session->formatted_date ?? date('d/m/Y', strtotime($session->created_at ?? 'now')) }}
                                </p>
                            </div>
                            <div class="flex items-center gap-2">
                                <button onclick="viewAttendanceSession('{{ $session->session_date ?? '' }}', '{{ addslashes($session->session_type ?? 'Attendance Session') }}')"
                                    class="text-blue-600 hover:text-blue-800 text-xs font-medium transition">
                                    View
                                </button>
                            </div>
                        </div>
                    </div>
                    @empty
                    <div class="text-center py-8 text-gray-400 text-sm">
                        <i class="fas fa-inbox text-2xl mb-2 block"></i>
                        <p>No attendance sessions found</p>
                    </div>
                    @endforelse
                </div>
            </div>

            <!-- Recent Permission Requests -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h2 class="text-sm font-semibold text-gray-800">
                        <i class="fas fa-envelope text-green-500 mr-2"></i> Recent Permission Requests
                    </h2>
                </div>
                <div class="divide-y divide-gray-100">
                    @forelse($recentPermissions ?? [] as $permission)
                    <div class="px-4 py-3 hover:bg-gray-50 transition">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <h4 class="text-sm font-medium text-gray-800">{{ $permission->user_name ?? 'Unknown' }}</h4>
                                    <span class="px-1.5 py-0.5 text-xs rounded-full font-medium
                                        {{ ($permission->status ?? 'pending') === 'approved' ? 'bg-green-100 text-green-700' : 
                                           (($permission->status ?? 'pending') === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700') }}">
                                        {{ ucfirst($permission->status ?? 'Pending') }}
                                    </span>
                                </div>
                                <p class="text-xs text-gray-500 line-clamp-1">
                                    {{ Str::limit($permission->reason ?? 'No reason provided', 80) }}
                                </p>
                                <p class="text-xs text-gray-400 mt-1">
                                    <i class="far fa-calendar-alt mr-1"></i>
                                    {{ $permission->formatted_date ?? date('d/m/Y', strtotime($permission->created_at ?? 'now')) }}
                                </p>
                            </div>
                            <button onclick="viewPermission({{ $permission->id }})"
                                class="text-blue-600 hover:text-blue-800 text-xs font-medium ml-2 transition">
                                View
                            </button>
                        </div>
                    </div>
                    @empty
                    <div class="text-center py-8 text-gray-400 text-sm">
                        <i class="fas fa-inbox text-2xl mb-2 block"></i>
                        <p>No permission requests found</p>
                    </div>
                    @endforelse
                </div>
            </div>
        </div>

    </div>
</div>

<script>
function switchTab(tabName) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.click();
        }
    });
}

function viewAttendanceSession(date, sessionType) {
    if (!date || !sessionType) return;
    if (typeof window.viewSession === 'function') {
        window.viewSession(date, sessionType);
        return;
    }
    window.location.href = `/discipline/attendance/session/${encodeURIComponent(date)}/${encodeURIComponent(sessionType)}`;
}

function applyOverviewFilter() {
    const startDate = document.getElementById('overview_start_date')?.value || '';
    const endDate = document.getElementById('overview_end_date')?.value || '';
    const params = new URLSearchParams(window.location.search);

    if (startDate) params.set('start_date', startDate); else params.delete('start_date');
    if (endDate) params.set('end_date', endDate); else params.delete('end_date');
    localStorage.setItem(STORAGE_KEY, 'overview');
    window.location.search = params.toString();
}

function viewPermission(id) {
    switchTab('permission');
}

</script>
