{{-- resources/views/admin/attendance-modal.blade.php --}}
<div class="space-y-6" x-data="attendanceManager()" x-init="init()">
    <!-- Header -->
    <div class="flex justify-between items-center">
        <div>
            <h3 class="text-2xl font-bold text-gray-800">Attendance Management</h3>
        </div>
        <button @click="openCreateSessionModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2">
            <i class="fas fa-plus-circle"></i> New Session
        </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl font-bold text-gray-800" x-text="stats.totalSessions">0</p>
                    <p class="text-xs text-gray-500">Total Sessions</p>
                </div>
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-calendar-alt text-blue-600"></i>
                </div>
            </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl font-bold text-green-600" x-text="stats.presentCount">0</p>
                    <p class="text-xs text-gray-500">Present</p>
                </div>
                <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-check-circle text-green-600"></i>
                </div>
            </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl font-bold text-yellow-600" x-text="stats.lateCount">0</p>
                    <p class="text-xs text-gray-500">Late</p>
                </div>
                <div class="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-clock text-yellow-600"></i>
                </div>
            </div>
        </div>
        <div class="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-2xl font-bold text-red-600" x-text="stats.absentCount">0</p>
                    <p class="text-xs text-gray-500">Absent</p>
                </div>
                <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <i class="fas fa-times-circle text-red-600"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div class="flex flex-wrap gap-3 items-end">
            <div class="flex-1 min-w-[150px]">
                <label class="block text-xs text-gray-600 mb-1">From Date</label>
                <input type="date" x-model="filters.startDate" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            </div>
            <div class="flex-1 min-w-[150px]">
                <label class="block text-xs text-gray-600 mb-1">To Date</label>
                <input type="date" x-model="filters.endDate" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            </div>
            <div class="flex-1 min-w-[150px]">
                <label class="block text-xs text-gray-600 mb-1">Session Type</label>
                <select x-model="filters.sessionType" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="">All Sessions</option>
                    <template x-for="type in sessionTypes" :key="type">
                        <option x-text="type" :value="type"></option>
                    </template>
                </select>
            </div>
            <button @click="loadSessions()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition">
                <i class="fas fa-search mr-1"></i> Apply
            </button>
            <button @click="resetFilters()" class="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm">
                <i class="fas fa-undo-alt"></i> Reset
            </button>
        </div>
    </div>

    <!-- Sessions Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-gray-50 border-b">
                    <tr>
                        <th class="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                        <th class="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Session</th>
                        <th class="px-5 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Present</th>
                        <th class="px-5 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Late</th>
                        <th class="px-5 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Absent</th>
                        <th class="px-5 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Excused</th>
                        <th class="px-5 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Rate</th>
                        <th class="px-5 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <template x-if="loading">
                        <tr>
                            <td colspan="8" class="text-center py-12">
                                <i class="fas fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
                                <p class="text-gray-400">Loading sessions...</p>
                            </td>
                        </tr>
                    </template>
                    <template x-if="!loading && sessions.length === 0">
                        <tr>
                            <td colspan="8" class="text-center py-12 text-gray-400">
                                <i class="fas fa-calendar-times text-3xl mb-2 opacity-50"></i>
                                <p>No attendance records found</p>
                            </td>
                        </tr>
                    </template>
                    <template x-for="session in sessions" :key="session.key">
                        <tr class="border-b hover:bg-gray-50 transition">
                            <td class="px-5 py-3 text-sm text-gray-600" x-text="formatDate(session.date)"></td>
                            <td class="px-5 py-3 text-sm font-medium text-gray-800" x-text="session.session"></td>
                            <td class="px-5 py-3 text-center text-sm font-semibold text-green-600" x-text="session.present"></td>
                            <td class="px-5 py-3 text-center text-sm font-semibold text-yellow-600" x-text="session.late"></td>
                            <td class="px-5 py-3 text-center text-sm text-red-500" x-text="session.absent"></td>
                            <td class="px-5 py-3 text-center text-sm text-gray-500" x-text="session.excused"></td>
                            <td class="px-5 py-3 text-center">
                                <span class="text-sm font-semibold" :class="getRateColor(session.rate)" x-text="session.rate + '%'"></span>
                            </td>
                            <td class="px-5 py-3 text-center">
                                <div class="flex items-center justify-center gap-2">
                                    <button @click="viewSession(session.date, session.session)" class="text-blue-500 hover:text-blue-700 transition" title="View/Edit">
                                        <i class="fas fa-users"></i>
                                    </button>
                                    <button @click="deleteSession(session.date, session.session)" class="text-red-400 hover:text-red-600 transition" title="Delete Session">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Create/Edit Session Modal - HIGH Z-INDEX for side nav -->
    <div x-show="showSessionModal" x-cloak class="fixed inset-0 z-[100] overflow-y-auto" style="display: none;">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="fixed inset-0 bg-gray-900 bg-opacity-50" @click="closeSessionModal()"></div>
            <div class="relative bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
                <div class="flex justify-between items-center px-6 py-4 border-b">
                    <h3 class="text-lg font-semibold text-gray-800" x-text="modalTitle"></h3>
                    <button @click="closeSessionModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <!-- Session Info -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Session Date *</label>
                            <input type="date" x-model="currentSession.date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Session Name *</label>
                            <input type="text" x-model="currentSession.name" placeholder="e.g., Sunday Service, Bible Study" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>

                    <!-- Permission Summary Cards - Pending & Rejected -->
                    <div class="mb-6" x-show="permissionStats.approved > 0 || permissionStats.pending > 0 || permissionStats.rejected > 0">
                        <h4 class="text-sm font-semibold text-gray-700 mb-3">Permission Status for This Date</h4>
                        <div class="grid grid-cols-3 gap-3">
                            <!-- Approved Card -->
                            <div class="bg-green-50 rounded-lg p-3 border border-green-200" x-show="permissionStats.approved > 0">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-2xl font-bold text-green-700" x-text="permissionStats.approved">0</p>
                                        <p class="text-xs text-green-600">Approved</p>
                                    </div>
                                    <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <i class="fas fa-check-circle text-green-600 text-sm"></i>
                                    </div>
                                </div>
                                <p class="text-xs text-green-600 mt-1">Auto-marked as On Time</p>
                            </div>
                            
                            <!-- Pending Card - CLICKABLE -->
                            <div class="bg-yellow-50 rounded-lg p-3 border border-yellow-200 cursor-pointer hover:shadow-md transition" 
                                 x-show="permissionStats.pending > 0"
                                 @click="showPendingPermissionsModal = true">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-2xl font-bold text-yellow-700" x-text="permissionStats.pending">0</p>
                                        <p class="text-xs text-yellow-600">Pending</p>
                                    </div>
                                    <div class="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                        <i class="fas fa-clock text-yellow-600 text-sm"></i>
                                    </div>
                                </div>
                                <p class="text-xs text-yellow-600 mt-1">Click to review</p>
                            </div>
                            
                            <!-- Rejected Card - CLICKABLE -->
                            <div class="bg-red-50 rounded-lg p-3 border border-red-200 cursor-pointer hover:shadow-md transition" 
                                 x-show="permissionStats.rejected > 0"
                                 @click="showRejectedPermissionsModal = true">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-2xl font-bold text-red-700" x-text="permissionStats.rejected">0</p>
                                        <p class="text-xs text-red-600">Rejected</p>
                                    </div>
                                    <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                        <i class="fas fa-times-circle text-red-600 text-sm"></i>
                                    </div>
                                </div>
                                <p class="text-xs text-red-600 mt-1">Click to view</p>
                            </div>
                        </div>
                    </div>

                    <!-- Members List with Status Selection -->
                    <div class="border rounded-lg overflow-hidden">
                        <div class="bg-gray-50 px-4 py-2 border-b">
                            <div class="flex justify-between items-center">
                                <span class="text-sm font-medium text-gray-700">Members Attendance</span>
                                <div class="flex gap-2">
                                    <button type="button" @click="setAllStatus('present')" class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">All Present</button>
                                    <button type="button" @click="setAllStatus('late')" class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200">All Late</button>
                                    <button type="button" @click="setAllStatus('absent')" class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">All Absent</button>
                                    <button type="button" @click="setAllStatus('excused')" class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200">All Excused</button>
                                </div>
                            </div>
                        </div>
                        <div class="max-h-96 overflow-y-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-white border-b sticky top-0">
                                    <tr>
                                        <th class="px-4 py-2 text-left">Member</th>
                                        <th class="px-4 py-2 text-left">Email</th>
                                        <th class="px-4 py-2 text-center w-32">Status</th>
                                        <th class="px-4 py-2 text-left">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template x-for="member in members" :key="member.id">
                                        <tr class="border-b hover:bg-gray-50" :class="{'bg-green-50': member.has_permission && member.permission?.status === 'approved'}">
                                            <td class="px-4 py-2 font-medium">
                                                <span x-text="member.name"></span>
                                                <span x-show="member.has_permission && member.permission?.status === 'approved'" class="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Permission</span>
                                            </td>
                                            <td class="px-4 py-2 text-gray-500 text-xs" x-text="member.email"></td>
                                            <td class="px-4 py-2">
                                                <select x-model="memberAttendance[member.id].status" 
                                                        :disabled="member.present_disabled"
                                                        class="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                        :class="{'bg-gray-100 cursor-not-allowed': member.present_disabled}">
                                                    <option value="present">Present</option>
                                                    <option value="late">Late</option>
                                                    <option value="absent">Absent</option>
                                                    <option value="excused">Excused</option>
                                                </select>
                                            </td>
                                            <td class="px-4 py-2">
                                                <input type="text" x-model="memberAttendance[member.id].notes" 
                                                       placeholder="Optional" 
                                                       :disabled="member.present_disabled"
                                                       class="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                       :class="{'bg-gray-100 cursor-not-allowed': member.present_disabled}">
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button @click="closeSessionModal()" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancel</button>
                    <button @click="saveAttendance()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fas fa-save mr-1"></i> Save Attendance
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Pending Permissions Modal -->
    <div x-show="showPendingPermissionsModal" x-cloak class="fixed inset-0 z-[101] overflow-y-auto" style="display: none;">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="fixed inset-0 bg-gray-900 bg-opacity-50" @click="showPendingPermissionsModal = false"></div>
            <div class="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                <div class="flex justify-between items-center px-6 py-4 border-b bg-yellow-50">
                    <h3 class="text-lg font-semibold text-yellow-800">
                        <i class="fas fa-clock mr-2"></i> Pending Permission Requests
                    </h3>
                    <button @click="showPendingPermissionsModal = false" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                    <template x-if="pendingPermissions.length === 0">
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-inbox text-3xl mb-2 opacity-50"></i>
                            <p>No pending permission requests for this date</p>
                        </div>
                    </template>
                    <template x-for="perm in pendingPermissions" :key="perm.id">
                        <div class="border rounded-lg p-4 mb-3 hover:shadow-md transition">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-semibold text-gray-800" x-text="perm.user_name"></h4>
                                    <p class="text-xs text-gray-500" x-text="perm.user_email"></p>
                                </div>
                                <span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                                    <i class="fas fa-clock mr-1"></i> Pending
                                </span>
                            </div>
                            <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <template x-if="perm.type && perm.type.trim() && perm.type.trim().toLowerCase() !== 'general'">
                                <div><span class="text-gray-500">Type:</span> <span class="font-medium" x-text="perm.type"></span></div>
                            </template>
                                <div><span class="text-gray-500">Dates:</span> <span class="font-medium" x-text="formatDateRange(perm.start_date, perm.end_date)"></span></div>
                                <div class="col-span-2"><span class="text-gray-500">Reason:</span> <span x-text="perm.reason"></span></div>
                            </div>
                            <div class="mt-3 flex gap-2 justify-end">
                                <button @click="quickApprovePermission(perm.id)" class="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                                    <i class="fas fa-check mr-1"></i> Approve
                                </button>
                                <button @click="quickRejectPermission(perm.id)" class="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                                    <i class="fas fa-times mr-1"></i> Reject
                                </button>
                            </div>
                        </div>
                    </template>
                </div>
                <div class="px-6 py-4 border-t bg-gray-50 flex justify-end">
                    <button @click="showPendingPermissionsModal = false" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Close</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Rejected Permissions Modal -->
    <div x-show="showRejectedPermissionsModal" x-cloak class="fixed inset-0 z-[101] overflow-y-auto" style="display: none;">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="fixed inset-0 bg-gray-900 bg-opacity-50" @click="showRejectedPermissionsModal = false"></div>
            <div class="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                <div class="flex justify-between items-center px-6 py-4 border-b bg-red-50">
                    <h3 class="text-lg font-semibold text-red-800">
                        <i class="fas fa-times-circle mr-2"></i> Rejected Permission Requests
                    </h3>
                    <button @click="showRejectedPermissionsModal = false" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                    <template x-if="rejectedPermissions.length === 0">
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-inbox text-3xl mb-2 opacity-50"></i>
                            <p>No rejected permission requests for this date</p>
                        </div>
                    </template>
                    <template x-for="perm in rejectedPermissions" :key="perm.id">
                        <div class="border rounded-lg p-4 mb-3 hover:shadow-md transition">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-semibold text-gray-800" x-text="perm.user_name"></h4>
                                    <p class="text-xs text-gray-500" x-text="perm.user_email"></p>
                                </div>
                                <span class="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                    <i class="fas fa-times-circle mr-1"></i> Rejected
                                </span>
                            </div>
                            <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <template x-if="perm.type && perm.type.trim() && perm.type.trim().toLowerCase() !== 'general'">
                                <div><span class="text-gray-500">Type:</span> <span class="font-medium" x-text="perm.type"></span></div>
                            </template>
                                <div><span class="text-gray-500">Dates:</span> <span class="font-medium" x-text="formatDateRange(perm.start_date, perm.end_date)"></span></div>
                                <div class="col-span-2"><span class="text-gray-500">Reason:</span> <span x-text="perm.reason"></span></div>
                            </div>
                            <div class="mt-2 p-2 bg-red-50 rounded text-sm text-red-700" x-show="perm.rejection_reason">
                                <i class="fas fa-exclamation-triangle mr-1"></i>
                                <span class="font-medium">Rejection reason:</span> <span x-text="perm.rejection_reason"></span>
                            </div>
                        </div>
                    </template>
                </div>
                <div class="px-6 py-4 border-t bg-gray-50 flex justify-end">
                    <button @click="showRejectedPermissionsModal = false" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Close</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div x-show="showDeleteModal" x-cloak class="fixed inset-0 z-[100] overflow-y-auto" style="display: none;">
        <div class="flex items-center justify-center min-h-screen p-4">
            <div class="fixed inset-0 bg-gray-900 bg-opacity-50" @click="showDeleteModal = false"></div>
            <div class="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <i class="fas fa-exclamation-triangle text-red-600"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Delete Session</h3>
                    <p class="text-sm text-gray-500 mb-4">
                        Are you sure you want to delete "<span x-text="deleteTarget.session"></span>" on <span x-text="deleteTarget.date"></span>?<br>
                        This action cannot be undone.
                    </p>
                    <div class="flex gap-3 justify-center">
                        <button @click="showDeleteModal = false" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">Cancel</button>
                        <button @click="confirmDelete()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div x-show="toast.show" x-transition.duration.300ms class="fixed bottom-4 right-4 z-[200]" style="display: none;">
        <div class="rounded-lg shadow-lg px-4 py-3" :class="toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'">
            <p class="text-white text-sm" x-text="toast.message"></p>
        </div>
    </div>
</div>

<style>
    [x-cloak] { display: none !important; }
</style>

<script>
    function attendanceManager() {
        return {
            // State
            loading: false,
            sessions: [],
            members: [],
            sessionTypes: [],
            memberAttendance: {},
            filters: {
                startDate: '',
                endDate: '',
                sessionType: ''
            },
            stats: {
                totalSessions: 0,
                presentCount: 0,
                lateCount: 0,
                absentCount: 0
            },
            showSessionModal: false,
            showDeleteModal: false,
            showPendingPermissionsModal: false,
            showRejectedPermissionsModal: false,
            modalTitle: 'Mark Attendance',
            currentSession: {
                date: '',
                name: '',
                editMode: false
            },
            deleteTarget: {
                date: '',
                session: ''
            },
            toast: {
                show: false,
                message: '',
                type: 'success'
            },
            permissionStats: {
                approved: 0,
                pending: 0,
                rejected: 0
            },
            pendingPermissions: [],
            rejectedPermissions: [],

            // Initialize
            init() {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                this.filters.startDate = this.formatDateForInput(firstDay);
                this.filters.endDate = this.formatDateForInput(lastDay);
                
                this.loadMembers();
                this.loadSessions();
            },

            // Load all members
            async loadMembers() {
                try {
                    const response = await fetch('/users/list', {
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                    const data = await response.json();
                    if (data.success && data.users) {
                        this.members = data.users;
                        this.initMemberAttendance();
                    }
                } catch (error) {
                    console.error('Error loading members:', error);
                }
            },

            // Initialize member attendance object
            initMemberAttendance() {
                const attendance = {};
                this.members.forEach(member => {
                    attendance[member.id] = {
                        status: 'present',
                        notes: '',
                        attendance_id: null
                    };
                });
                this.memberAttendance = attendance;
            },

            // Load sessions with filters
            async loadSessions() {
                this.loading = true;
                try {
                    const params = new URLSearchParams();
                    if (this.filters.startDate) params.append('start_date', this.filters.startDate);
                    if (this.filters.endDate) params.append('end_date', this.filters.endDate);
                    if (this.filters.sessionType) params.append('session_type', this.filters.sessionType);
                    
                    const response = await fetch(`/discipline/attendance?${params.toString()}`, {
                        headers: { 
                            'X-Requested-With': 'XMLHttpRequest',
                            'Accept': 'application/json'
                        }
                    });
                    const data = await response.json();
                    
                    if (data.success && data.attendances) {
                        this.processAttendanceData(data.attendances);
                    }
                } catch (error) {
                    console.error('Error loading sessions:', error);
                    this.showToast('Failed to load attendance data', 'error');
                } finally {
                    this.loading = false;
                }
            },

            // Process raw attendance into grouped sessions
            processAttendanceData(attendances) {
                const grouped = {};
                
                attendances.forEach(att => {
                    const key = `${att.session_date}|${att.session_type}`;
                    if (!grouped[key]) {
                        grouped[key] = {
                            key: key,
                            date: att.session_date,
                            session: att.session_type,
                            present: 0,
                            late: 0,
                            absent: 0,
                            excused: 0,
                            total: 0
                        };
                    }
                    
                    switch(att.status) {
                        case 'present': grouped[key].present++; break;
                        case 'late': grouped[key].late++; break;
                        case 'absent': grouped[key].absent++; break;
                        case 'excused': grouped[key].excused++; break;
                    }
                    grouped[key].total++;
                });
                
                this.sessions = Object.values(grouped).map(session => ({
                    ...session,
                    rate: session.total > 0 ? Math.round(((session.present + session.late) / session.total) * 100) : 0
                })).sort((a, b) => b.date.localeCompare(a.date));
                
                this.sessionTypes = [...new Set(this.sessions.map(s => s.session))];
                this.updateStats(attendances);
            },

            // Update statistics
            updateStats(attendances) {
                const uniqueSessions = new Set(attendances.map(a => `${a.session_date}|${a.session_type}`));
                this.stats.totalSessions = uniqueSessions.size;
                this.stats.presentCount = attendances.filter(a => a.status === 'present').length;
                this.stats.lateCount = attendances.filter(a => a.status === 'late').length;
                this.stats.absentCount = attendances.filter(a => a.status === 'absent' || a.status === 'excused').length;
            },

            // Open create session modal
            openCreateSessionModal() {
                const today = this.formatDateForInput(new Date());
                this.currentSession = {
                    date: today,
                    name: '',
                    editMode: false
                };
                this.modalTitle = 'Mark Attendance';
                this.initMemberAttendance();
                this.showSessionModal = true;
            },

            // View/edit existing session with permission data
            async viewSession(date, sessionType) {
                this.loading = true;
                this.showSessionModal = true;
                this.modalTitle = `Session: ${sessionType}`;
                this.currentSession = {
                    date: date,
                    name: sessionType,
                    editMode: true
                };
                
                try {
                    const encodedType = encodeURIComponent(sessionType);
                    const response = await fetch(`/discipline/attendance/session-details/${date}/${encodedType}`, {
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        // Update members list with permission and disabled states
                        if (data.members) {
                            this.members = data.members;
                            
                            // Initialize member attendance
                            const attendance = {};
                            data.members.forEach(member => {
                                attendance[member.user_id] = {
                                    status: member.present ? (member.on_time ? 'present' : 'late') : 'absent',
                                    notes: '',
                                    attendance_id: null,
                                    disabled: member.present_disabled
                                };
                            });
                            this.memberAttendance = attendance;
                        }
                        
                        // Update permission stats
                        this.permissionStats = {
                            approved: data.approved_permissions || 0,
                            pending: data.pending_permissions || 0,
                            rejected: data.rejected_permissions || 0
                        };
                        
                        // Store pending permissions
                        if (data.pending_permissions_list) {
                            this.pendingPermissions = data.pending_permissions_list;
                        }
                        if (data.rejected_permissions_list) {
                            this.rejectedPermissions = data.rejected_permissions_list;
                        }
                    } else {
                        this.initMemberAttendance();
                    }
                } catch (error) {
                    console.error('Error loading session details:', error);
                    this.initMemberAttendance();
                    this.showToast('Error loading session details', 'error');
                } finally {
                    this.loading = false;
                }
            },

            // Save attendance records
            async saveAttendance() {
                if (!this.currentSession.date || !this.currentSession.name) {
                    this.showToast('Please fill in session date and name', 'error');
                    return;
                }
                
                this.loading = true;
                
                const attendanceRecords = [];
                for (const [userId, data] of Object.entries(this.memberAttendance)) {
                    // Skip if disabled (permission auto-handled)
                    if (data.disabled) continue;
                    
                    attendanceRecords.push({
                        user_id: parseInt(userId),
                        session_date: this.currentSession.date,
                        session_type: this.currentSession.name,
                        status: data.status,
                        notes: data.notes,
                        attendance_id: data.attendance_id || null
                    });
                }
                
                try {
                    const response = await fetch('/discipline/attendance/bulk', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({ attendances: attendanceRecords })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showToast('Attendance saved successfully', 'success');
                        this.closeSessionModal();
                        this.loadSessions();
                    } else {
                        this.showToast(result.message || 'Failed to save attendance', 'error');
                    }
                } catch (error) {
                    console.error('Error saving attendance:', error);
                    this.showToast('An error occurred while saving', 'error');
                } finally {
                    this.loading = false;
                }
            },

            // Quick approve permission
            async quickApprovePermission(permissionId) {
                if (!(await disciplineConfirm('Approve this permission request?', 'Approve request', 'Approve', 'Cancel', 'confirm'))) return;
                
                try {
                    const response = await fetch(`/discipline/permission/${permissionId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({ status: 'approved' })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showToast('Permission approved successfully', 'success');
                        // Refresh the session view
                        await this.viewSession(this.currentSession.date, this.currentSession.name);
                    } else {
                        this.showToast(result.message || 'Failed to approve', 'error');
                    }
                } catch (error) {
                    console.error('Error approving permission:', error);
                    this.showToast('Error approving permission', 'error');
                }
            },

            // Quick reject permission with reason
            async quickRejectPermission(permissionId) {
                const reason = await disciplinePrompt('Enter rejection reason:', 'Reject request', 'Rejection reason');
                if (reason === null) return;
                if (reason.trim() === '') {
                    this.showToast('Please provide a rejection reason', 'error');
                    return;
                }
                
                try {
                    const response = await fetch(`/discipline/permission/${permissionId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                            'X-Requested-With': 'XMLHttpRequest'
                        },
                        body: JSON.stringify({ status: 'rejected', rejection_reason: reason })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showToast('Permission rejected', 'success');
                        await this.viewSession(this.currentSession.date, this.currentSession.name);
                    } else {
                        this.showToast(result.message || 'Failed to reject', 'error');
                    }
                } catch (error) {
                    console.error('Error rejecting permission:', error);
                    this.showToast('Error rejecting permission', 'error');
                }
            },

            // Delete entire session
            deleteSession(date, sessionType) {
                this.deleteTarget = { date, session: sessionType };
                this.showDeleteModal = true;
            },

            async confirmDelete() {
                this.showDeleteModal = false;
                this.loading = true;
                
                try {
                    const encodedType = encodeURIComponent(this.deleteTarget.session);
                    const response = await fetch(`/discipline/attendance/session?date=${this.deleteTarget.date}&type=${encodedType}`, {
                        method: 'DELETE',
                        headers: {
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.showToast('Session deleted successfully', 'success');
                        this.loadSessions();
                    } else {
                        this.showToast(result.message || 'Failed to delete session', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting session:', error);
                    this.showToast('An error occurred while deleting', 'error');
                } finally {
                    this.loading = false;
                }
            },

            // Set all members to same status (skip disabled ones)
            setAllStatus(status) {
                for (const memberId in this.memberAttendance) {
                    if (!this.memberAttendance[memberId].disabled) {
                        this.memberAttendance[memberId].status = status;
                    }
                }
            },

            // Reset filters
            resetFilters() {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                this.filters.startDate = this.formatDateForInput(firstDay);
                this.filters.endDate = this.formatDateForInput(lastDay);
                this.filters.sessionType = '';
                this.loadSessions();
            },

            // Close session modal
            closeSessionModal() {
                this.showSessionModal = false;
                this.currentSession = { date: '', name: '', editMode: false };
                this.permissionStats = { approved: 0, pending: 0, rejected: 0 };
                this.pendingPermissions = [];
                this.rejectedPermissions = [];
            },

            // Show toast notification
            showToast(message, type = 'success') {
                this.toast.message = message;
                this.toast.type = type;
                this.toast.show = true;
                setTimeout(() => {
                    this.toast.show = false;
                }, 3000);
            },

            // Helper: Format date for display
            formatDate(dateString) {
                if (!dateString) return '';
                const parts = dateString.split('-');
                if (parts.length === 3) {
                    return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                return dateString;
            },

            // Helper: Format date range
            formatDateRange(start, end) {
                if (!start || !end) return '';
                const format = (d) => {
                    const parts = d.split('-');
                    return `${parts[2]}/${parts[1]}`;
                };
                if (start === end) return format(start);
                return `${format(start)} - ${format(end)}`;
            },

            // Helper: Format date for input field
            formatDateForInput(date) {
                return date.toISOString().split('T')[0];
            },

            // Helper: Get rate color class
            getRateColor(rate) {
                if (rate >= 75) return 'text-green-600';
                if (rate >= 50) return 'text-yellow-600';
                return 'text-red-600';
            }
        }
    }
</script>
