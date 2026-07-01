<form method="POST" action="{{ route('users.store') }}" id="createUserForm">
    @csrf

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
               <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
            <input type="text" name="name" required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
            <input type="email" name="email" required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
            <input type="text" name="phone"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
            <input type="date" name="date_of_birth"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Province</label>
            <select name="province" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Province</option>
                <option value="Kigali">Kigali</option>
                <option value="Northern">Northern</option>
                <option value="Southern">Southern</option>
                <option value="Eastern">Eastern</option>
                <option value="Western">Western</option>
            </select>
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">District</label>
            <input type="text" name="district"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Sector</label>
            <input type="text" name="sector"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Village</label>
            <input type="text" name="village"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
            <select name="gender" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
            </select>
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Marital Status</label>
            <select name="marital_status" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
            </select>
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Membership Type</label>
            <select name="membership_type" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Permanent">Permanent</option>
                <option value="Temporary Member">Temporary Member</option>
                <option value="Partner">Partner</option>
            </select>
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Occupation</label>
            <input type="text" name="occupation"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-gray-700 mb-1">Skills / Talents</label>
            <textarea name="skills" rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
            <input type="password" name="password" required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Confirm Password *</label>
            <input type="password" name="password_confirmation" required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        </div>

        <div class="sm:col-span-2">
            <label class="block text-xs font-semibold text-gray-700 mb-2">Assign Roles</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 overflow-y-auto border border-gray-200 rounded-lg p-2">
                @foreach($roles as $role)
                    <label class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" name="roles[]" value="{{ $role->id }}"
                            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        <span class="text-sm text-gray-700">{{ $role->display_name }}</span>
                    </label>
                @endforeach
            </div>
        </div>
    </div>

    <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4 pt-4 border-t">
        <button type="button" onclick="closeModal('createModal')" class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Cancel
        </button>
        <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">
            <i class="fas fa-save mr-1.5"></i>
            Create User
        </button>
    </div>
</form>

<script>
document.getElementById('createUserForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const form = this;
    const formData = new FormData(form);

    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeModal('createModal');
            location.reload();
        } else {
            appAlert(data.message || 'Error creating user');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        appAlert('Error creating user');
    });
});
</script>

