<div class="flex flex-col flex-1 min-h-0 bg-white" id="sidebarContent">
    <!-- Sidebar Header - Blue Background -->
    <div class="bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-4 flex items-center space-x-3 flex-shrink-0">
        <img src="{{ asset('images/logo.png') }}" alt="Reverence Worship" class="h-10 w-auto object-contain">
        <div class="sidebar-logo-text">
            <h2 class="text-white text-md font-bold">Reverence Worship Team</h2>
        </div>
    </div>
    
    <!-- Navigation Menu - White Background -->
    <nav class="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-1">
        @auth
            @if(auth()->user()->isSuperAdmin())
                <!-- Super Admin Full Menu -->
                <a href="{{ route('super-admin.dashboard') }}" class="nav-item {{ request()->routeIs('super-admin.dashboard') ? 'active' : '' }}">
                    <i class="fas fa-tachometer-alt w-5"></i>
                    <span class="nav-text text-sm font-medium">Dashboard</span>
                </a>
                <a href="{{ route('users.index') }}" class="nav-item {{ request()->routeIs('users.*') ? 'active' : '' }}">
                    <i class="fas fa-users w-5"></i>
                    <span class="nav-text text-sm font-medium">User Management</span>
                </a>
                @if(auth()->user()->hasFamily())
                <a href="{{ route('family.index') }}" class="nav-item {{ request()->routeIs('family.*') ? 'active' : '' }}">
                    <i class="fas fa-home w-5"></i>
                    <span class="nav-text text-sm font-medium">My Family</span>
                </a>
                @endif
                <a href="{{ route('financial.my-contributions') }}" class="nav-item {{ request()->routeIs('financial.*') ? 'active' : '' }}">
                    <i class="fas fa-hand-holding-usd w-5"></i>
                    <span class="nav-text text-sm font-medium">My Contributions</span>
                </a>
                <!-- Parent Dashboard -->
                @if(auth()->user()->isParent())
                <a href="{{ route('parent.index') }}" class="nav-item {{ request()->routeIs('parent.*') ? 'active' : '' }}">
                    <i class="fas fa-user-friends w-5"></i>
                    <span class="nav-text text-sm font-medium">Parent Dashboard</span>
                </a>
                @endif
                <a href="{{ route('music.index') }}" class="nav-item {{ request()->routeIs('music.*') ? 'active' : '' }}">
                    <i class="fas fa-music w-5"></i>
                    <span class="nav-text text-sm font-medium">Music and Evangelism DPT</span>
                </a>
                <a href="{{ route('intercession.index') }}" class="nav-item {{ request()->routeIs('intercession.*') ? 'active' : '' }}">
                    <i class="fas fa-pray w-5"></i>
                    <span class="nav-text text-sm font-medium">Intercession and spiritual growth</span>
                </a>
                <a href="{{ route('social-fellowship.index') }}" class="nav-item {{ request()->routeIs('social-fellowship.*') ? 'active' : '' }}">
                    <i class="fas fa-hand-holding-heart w-5"></i>
                    <span class="nav-text text-sm font-medium">Social Fellowship DPT</span>
                </a>
                <a href="{{ route('discipline.index') }}" class="nav-item {{ request()->routeIs('discipline.*') ? 'active' : '' }}">
                    <i class="fas fa-gavel w-5"></i>
                    <span class="nav-text text-sm font-medium">Discipline Management DPT</span>
                </a>
                <a href="{{ route('finance.index') }}" class="nav-item {{ request()->routeIs('finance.*') ? 'active' : '' }}">
                    <i class="fas fa-chart-line w-5"></i>
                    <span class="nav-text text-sm font-medium">Financial Management DPT</span>
                </a>
                <a href="{{ route('announcements.index') }}" class="nav-item {{ request()->routeIs('announcements.*') ? 'active' : '' }}">
                    <i class="fas fa-bullhorn w-5"></i>
                    <span class="nav-text text-sm font-medium">Admin Announcements</span>
                </a>
                <a href="{{ route('reports.index') }}" class="nav-item {{ request()->routeIs('reports.*') ? 'active' : '' }}">
                    <i class="fas fa-file-alt w-5"></i>
                    <span class="nav-text text-sm font-medium">Reports</span>
                </a>

                <a href="{{ route('profile.index') }}" class="nav-item {{ request()->routeIs('profile.*') ? 'active' : '' }}">
                    <i class="fas fa-user w-5"></i>
                    <span class="nav-text text-sm font-medium">My Profile</span>
                </a>

                <a href="{{ route('user.performance.index') }}" class="nav-item {{ request()->routeIs('user.performance.*') ? 'active' : '' }}">
                    <i class="fas fa-chart-line w-5"></i>
                    <span class="nav-text text-sm font-medium">My Performance</span>
                </a>
                
                <a href="{{ route('permission-manager.index') }}" class="nav-item {{ request()->routeIs('permission-manager.*') ? 'active' : '' }}">
                    <i class="fas fa-lock w-5"></i>
                    <span class="nav-text text-sm font-medium">Permission Manager</span>
                </a>
                
                <a href="{{ route('settings.index') }}" class="nav-item {{ request()->routeIs('settings.*') ? 'active' : '' }}">
                    <i class="fas fa-cog w-5"></i>
                    <span class="nav-text text-sm font-medium">Settings</span>
                </a>
                <a href="{{ route('logs.activity') }}" class="nav-item {{ request()->routeIs('logs.*') ? 'active' : '' }}">
                    <i class="fas fa-history w-5"></i>
                    <span class="nav-text text-sm font-medium">System Logs</span>
                </a>
                
            @else
                            
                <!-- Dashboard - Always visible -->
                <a href="{{ route('user.dashboard') }}" class="nav-item {{ request()->routeIs('user.dashboard') ? 'active' : '' }}">
                    <i class="fas fa-tachometer-alt w-5"></i>
                    <span class="nav-text text-sm font-medium">Dashboard</span>
                </a>
                
                <!-- User Management - Check for 'view' permission on 'users' page -->
                @if(auth()->user()->canAccess('users', 'view'))
                <a href="{{ route('users.index') }}" class="nav-item {{ request()->routeIs('users.*') ? 'active' : '' }}">
                    <i class="fas fa-users w-5"></i>
                    <span class="nav-text text-sm font-medium">User Management</span>
                </a>
                @endif
                
                <!-- My Family - Check permission for 'family' page -->
                @if(auth()->user()->hasFamily())
                <a href="{{ route('family.index') }}" class="nav-item {{ request()->routeIs('family.*') ? 'active' : '' }}">
                    <i class="fas fa-home w-5"></i>
                    <span class="nav-text text-sm font-medium">My Family</span>
                </a>
                @endif
                
                <!-- My Contributions - Check permission for 'financial' page -->
                @if(auth()->user()->canAccess('financial', 'view'))
                <a href="{{ route('financial.my-contributions') }}" class="nav-item {{ request()->routeIs('financial.*') ? 'active' : '' }}">
                    <i class="fas fa-hand-holding-usd w-5"></i>
                    <span class="nav-text text-sm font-medium">My Contributions</span>
                </a>
                @endif
                
                <!-- Parent Dashboard - Check permission for 'parent' page -->
                @if(auth()->user()->isParent())
                <a href="{{ route('parent.index') }}" class="nav-item {{ request()->routeIs('parent.*') ? 'active' : '' }}">
                    <i class="fas fa-user-friends w-5"></i>
                    <span class="nav-text text-sm font-medium">Parent Dashboard</span>
                </a>
                @endif
                
                <!-- Music Ministry - Check permission for 'music-ministry' page -->
                @if(auth()->user()->canAccess('music-ministry', 'view'))
                <a href="{{ route('music.index') }}" class="nav-item {{ request()->routeIs('music.*') ? 'active' : '' }}">
                    <i class="fas fa-music w-5"></i>
                    <span class="nav-text text-sm font-medium">Music and Evangelism</span>
                </a>
                @endif
                
                <!-- Intercession - Check permission for 'intercession' page -->
                @if(auth()->user()->canAccess('intercession', 'view'))
                <a href="{{ route('intercession.index') }}" class="nav-item {{ request()->routeIs('intercession.*') ? 'active' : '' }}">
                    <i class="fas fa-pray w-5"></i>
                    <span class="nav-text text-sm font-medium">Intercession</span>
                </a>
                @endif
                
                <!-- Social Fellowship - Check permission for 'social-fellowship' page -->
                @if(auth()->user()->canAccess('social-fellowship', 'view'))
                <a href="{{ route('social-fellowship.index') }}" class="nav-item {{ request()->routeIs('social-fellowship.*') ? 'active' : '' }}">
                    <i class="fas fa-hand-holding-heart w-5"></i>
                    <span class="nav-text text-sm font-medium">Social Fellowship</span>
                </a>
                @endif
                
                <!-- Discipline - Check permission for 'discipline' page -->
                @if(auth()->user()->canAccess('discipline', 'view'))
                <a href="{{ route('discipline.index') }}" class="nav-item {{ request()->routeIs('discipline.*') ? 'active' : '' }}">
                    <i class="fas fa-gavel w-5"></i>
                    <span class="nav-text text-sm font-medium">Discipline Management</span>
                </a>
                @endif
                
                <!-- Finance - Check permission for 'finance' page -->
                @if(auth()->user()->canAccess('finance', 'view'))
                <a href="{{ route('finance.index') }}" class="nav-item {{ request()->routeIs('finance.*') ? 'active' : '' }}">
                    <i class="fas fa-chart-line w-5"></i>
                    <span class="nav-text text-sm font-medium">Financial Management</span>
                </a>
                @endif
                
                <!-- Announcements - Check permission for 'announcements' page -->
                @if(auth()->user()->canAccess('announcements', 'view'))
                <a href="{{ route('announcements.index') }}" class="nav-item {{ request()->routeIs('announcements.*') ? 'active' : '' }}">
                    <i class="fas fa-bullhorn w-5"></i>
                    <span class="nav-text text-sm font-medium">Announcements</span>
                </a>
                @endif
                
                <!-- Reports - Check permission for 'reports' page -->
                @if(auth()->user()->canAccess('reports', 'view'))
                <a href="{{ route('reports.index') }}" class="nav-item {{ request()->routeIs('reports.*') ? 'active' : '' }}">
                    <i class="fas fa-chart-bar w-5"></i>
                    <span class="nav-text text-sm font-medium">Reports</span>
                </a>
                @endif
                
                <!-- My Profile - Always visible -->
                <a href="{{ route('profile.index') }}" class="nav-item {{ request()->routeIs('profile.*') ? 'active' : '' }}">
                    <i class="fas fa-user w-5"></i>
                    <span class="nav-text text-sm font-medium">My Profile</span>
                </a>
                <a href="{{ route('user.performance.index') }}" class="nav-item {{ request()->routeIs('user.performance.*') ? 'active' : '' }}">
                    <i class="fas fa-chart-line w-5"></i>
                    <span class="nav-text text-sm font-medium">My Performance</span>
                </a>
            @endif
        @else
            <a href="{{ route('login') }}" class="nav-item">
                <i class="fas fa-sign-in-alt w-5"></i>
                <span class="nav-text text-sm font-medium">Login</span>
            </a>
            <a href="{{ route('register') }}" class="nav-item">
                <i class="fas fa-user-plus w-5"></i>
                <span class="nav-text text-sm font-medium">Register</span>
            </a>
        @endauth
    </nav>
    
    <!-- User Info Footer -->
    @auth
    <div class="user-info-footer mt-auto pt-4 pb-4 border-t border-gray-200 flex-shrink-0 px-3">
        <div class="flex items-center space-x-3">
            <div class="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                <i class="fas fa-user text-gray-500 text-sm"></i>
            </div>
            <div class="flex-1 user-info-text">
                <p class="text-gray-800 text-sm font-medium truncate">{{ Auth::user()->name }}</p>
                <p class="text-gray-400 text-xs truncate">{{ Auth::user()->email }}</p>
            </div>
            <form method="POST" action="{{ route('logout') }}">
                @csrf
                <button type="submit" class="text-gray-400 hover:text-red-500 transition">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            </form>
        </div>
    </div>
    @endauth
</div>

<style>
.nav-item {
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #4b5563;
    border-radius: 8px;
    margin: 2px 0;
    padding: 10px 12px;
}

.nav-item i {
    width: 20px;
    font-size: 16px;
    color: #6b7280;
}

.nav-item .nav-text {
    font-size: 13px;
    font-weight: 500;
    color: #4b5563;
    white-space: nowrap;
}

.nav-item:hover {
    background: #f3f4f6;
    transform: translateX(3px);
}

.nav-item:hover i,
.nav-item:hover .nav-text {
    color: #1f2937;
}

.nav-item.active {
    background: #e5e7eb;
}

.nav-item.active i {
    color: #0060fb;
}

.nav-item.active .nav-text {
    color: #2572dd;
    font-weight: 600;
}

/* Collapsed Sidebar Styles */
.sidebar.collapsed .nav-item {
    justify-content: center;
    padding: 12px;
}

.sidebar.collapsed .nav-item .nav-text {
    display: none;
}

.sidebar.collapsed .nav-item i {
    margin: 0;
    font-size: 20px;
}

.sidebar.collapsed .sidebar-logo-text {
    display: none;
}

.sidebar.collapsed .user-info-text {
    display: none;
}

.sidebar.collapsed .user-info-footer {
    justify-content: center;
}

.sidebar.collapsed .user-info-footer .flex {
    justify-content: center;
}

.sidebar.collapsed .user-info-footer .w-9 {
    margin-right: 0;
}

nav::-webkit-scrollbar {
    width: 4px;
}

nav::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
}

nav::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 10px;
}
</style>
