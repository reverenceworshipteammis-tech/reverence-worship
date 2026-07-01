<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Reverence Worship Team - @yield('title')</title>
    <link rel="icon" type="image/png" sizes="16x16" href="{{ asset('images/logo-16x16.png') }}">
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('images/logo-32x32.png') }}">
    <link rel="icon" type="image/png" sizes="192x192" href="{{ asset('images/logo-192x192.png') }}">
    <link rel="apple-touch-icon" sizes="180x180" href="{{ asset('images/logo-180x180.png') }}">
    <!-- Simple favicon fallback -->
    <link rel="shortcut icon" href="{{ asset('images/logo.png') }}" type="image/png">
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Alpine.js -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.8/dist/cdn.min.js"></script>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: #f3f4f6;
        }

        /* Desktop Sidebar - White Background */
        .sidebar {
            background: white;
            position: fixed;
            left: 0;
            top: 0;
            height: 100vh;
            width: 280px;
            z-index: 1000;
            overflow-y: auto;
            transition: all 0.3s ease;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
            border-right: 1px solid #e5e7eb;
        }

        /* Collapsed Sidebar - Only Icons */
        .sidebar.collapsed {
            width: 80px;
        }

        .sidebar.collapsed .sidebar-logo-text,
        .sidebar.collapsed .nav-item span,
        .sidebar.collapsed .user-info-text {
            display: none;
        }

        .sidebar.collapsed .nav-item {
            justify-content: center;
            padding: 12px;
        }

        .sidebar.collapsed .nav-item i {
            margin: 0;
            font-size: 20px;
        }

        .sidebar.collapsed .logo-section {
            padding: 16px 0;
        }

        .sidebar.collapsed .logo-section img {
            width: 40px;
            height: 40px;
        }

        .sidebar.collapsed .user-info-footer {
            justify-content: center;
            padding: 12px 0;
        }

        .sidebar.collapsed .user-info-footer .flex-1 {
            display: none;
        }

        .sidebar::-webkit-scrollbar {
            width: 5px;
        }

        .sidebar::-webkit-scrollbar-track {
            background: #f1f1f1;
        }

        .sidebar::-webkit-scrollbar-thumb {
            background: #3b82f6;
            border-radius: 5px;
        }

        .main-content {
            margin-left: 280px;
            min-height: 100vh;
            transition: all 0.3s ease;
        }

        .main-content.expanded {
            margin-left: 80px;
        }

        /* Top Header - White Background */
        .top-header {
            background: white;
            border-bottom: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        /* Sidebar Toggle Button */
        .sidebar-toggle {
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .sidebar-toggle:hover {
            background: #f3f4f6;
        }

        /* Notification Bell */
        .notification-bell {
            position: relative;
            cursor: pointer;
            padding: 8px 10px;
            border-radius: 8px;
            transition: all 0.3s ease;
        }

        .notification-bell:hover {
            background: #f3f4f6;
        }

        .notification-badge {
            position: absolute;
            top: -2px;
            right: -2px;
            background: #ef4444;
            color: white;
            font-size: 9px;
            font-weight: 700;
            min-width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            padding: 0 4px;
        }

        .notification-dot {
            position: absolute;
            top: 2px;
            right: 2px;
            width: 8px;
            height: 8px;
            background: #ef4444;
            border-radius: 50%;
            border: 2px solid white;
        }

        /* Notification Dropdown */
        .notification-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            width: 380px;
            max-height: 500px;
            z-index: 50;
            overflow: hidden;
            border: 1px solid #e5e7eb;
        }

        .notification-header {
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .notification-header h4 {
            font-weight: 600;
            color: #1f2937;
        }

        .notification-header .mark-all-read {
            font-size: 12px;
            color: #3b82f6;
            cursor: pointer;
        }

        .notification-header .mark-all-read:hover {
            text-decoration: underline;
        }

        .notification-list {
            max-height: 400px;
            overflow-y: auto;
        }

        .notification-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            border-bottom: 1px solid #f3f4f6;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .notification-item:hover {
            background: #f9fafb;
        }

        .notification-item.unread {
            background: #eff6ff;
        }

        .notification-item .icon-wrapper {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .notification-item .content {
            flex: 1;
            min-width: 0;
        }

        .notification-item .content .title {
            font-size: 13px;
            font-weight: 500;
            color: #1f2937;
        }

        .notification-item .content .description {
            font-size: 12px;
            color: #6b7280;
            margin-top: 1px;
        }

        .notification-item .content .time {
            font-size: 10px;
            color: #9ca3af;
            margin-top: 2px;
        }

        .notification-item .unread-dot {
            width: 6px;
            height: 6px;
            background: #3b82f6;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .notification-footer {
            padding: 10px 16px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
        }

        .notification-footer a {
            font-size: 13px;
            color: #3b82f6;
        }

        .notification-footer a:hover {
            text-decoration: underline;
        }

        .notification-empty {
            padding: 30px 20px;
            text-align: center;
            color: #9ca3af;
        }

        .notification-empty i {
            font-size: 32px;
            margin-bottom: 8px;
            opacity: 0.5;
        }

        .notification-empty p {
            font-size: 14px;
        }

        /* User Dropdown Menu */
        .user-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            min-width: 220px;
            z-index: 50;
            overflow: hidden;
            border: 1px solid #e5e7eb;
        }

        .user-dropdown-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 16px;
            transition: all 0.2s ease;
            color: #374151;
        }

        .user-dropdown-item:hover {
            background: #f3f4f6;
        }

        .user-dropdown-item i {
            width: 20px;
            font-size: 16px;
            color: #6b7280;
        }

        .user-dropdown-divider {
            height: 1px;
            background: #e5e7eb;
            margin: 4px 0;
        }

        /* Mobile Styles */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
                width: 280px;
                z-index: 1001;
            }

            .sidebar.open {
                transform: translateX(0);
            }

            .sidebar.collapsed {
                transform: translateX(-100%);
            }

            .main-content {
                margin-left: 0;
                margin-bottom: 70px;
            }

            .mobile-menu-btn {
                display: block;
                position: fixed;
                top: 15px;
                left: 15px;
                z-index: 1002;
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 10px;
                padding: 10px 15px;
                cursor: pointer;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            }

            .mobile-footer-nav {
                display: flex;
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%);
                z-index: 1000;
                padding: 10px;
                justify-content: space-around;
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
            }

            .mobile-footer-nav a {
                color: white;
                text-align: center;
                font-size: 12px;
                padding: 8px;
                border-radius: 8px;
                transition: all 0.3s ease;
                text-decoration: none;
            }

            .mobile-footer-nav a:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            .mobile-footer-nav i {
                font-size: 20px;
                display: block;
                margin-bottom: 4px;
            }

            .overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000;
            }

            .overlay.active {
                display: block;
            }

            .top-bar {
                padding-top: 60px;
            }

            .notification-dropdown {
                width: 320px;
                right: -20px;
            }
        }

        @media (min-width: 769px) {
            .mobile-menu-btn {
                display: none;
            }

            .mobile-footer-nav {
                display: none;
            }

            .overlay {
                display: none !important;
            }
        }

        /* Animation */
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .notification-dropdown {
            animation: slideDown 0.2s ease-out;
        }
    </style>
</head>

<body>
    <!-- Mobile Menu Button -->
    <button class="mobile-menu-btn" onclick="toggleMobileMenu()">
        <i class="fas fa-bars text-xl"></i>
    </button>

    <!-- Overlay -->
    <div class="overlay" onclick="toggleMobileMenu()"></div>

    <!-- Sidebar (White Background) -->
    <div class="sidebar" id="sidebar">
        @include('layouts.sidebar')
    </div>

    <!-- Main Content -->
    <div class="main-content" id="mainContent">
        <!-- Top Navigation Bar - White Header -->
        <nav class="top-header shadow-sm sticky top-0 z-50">
            <div class="px-6 py-4 flex justify-between items-center">
                <!-- Left side - Sidebar Toggle Button + Page Title -->
                <div class="flex items-center gap-4">
                    <button onclick="toggleSidebar()" class="sidebar-toggle text-gray-600 hover:text-gray-800">
                        <i class="fas fa-bars text-xl"></i>
                    </button>
                    <h1 class="text-2xl font-bold text-gray-800">@yield('page-title', 'Dashboard')</h1>
                </div>

                <!-- Right side - User Profile with Dropdown -->
                @auth
                <div class="flex items-center gap-2">
                    <!-- Notification Bell -->
                    <div class="relative">
                        <div onclick="toggleNotificationDropdown()" class="notification-bell text-gray-600 hover:text-gray-800">
                            <i class="fas fa-bell text-xl"></i>
                            <span id="totalNotificationBadge" class="notification-badge hidden">0</span>
                        </div>

                        <!-- Notification Dropdown -->
                        <div id="notificationDropdown" class="notification-dropdown hidden">
                            <div class="notification-header">
                                <h4>Notifications</h4>
                                <span class="mark-all-read" onclick="markAllRead()">Mark all as read</span>
                            </div>

                            <div id="notificationList" class="notification-list">
                                <!-- Notifications will be loaded here -->
                            </div>

                            <div class="notification-footer">
                                @if(auth()->check())
                                @if(auth()->user()->isSuperAdmin())
                                <a href="{{ route('users.index') }}?status=pending">View all</a>
                                @else
                                <a href="{{ route('announcements.index') }}">View all</a>
                                @endif
                                @endif
                            </div>
                        </div>
                    </div>

                    <!-- User Dropdown -->
                    <div class="relative">
                        <button onclick="toggleUserDropdown()" class="flex items-center space-x-4 focus:outline-none">
                            <div class="text-right hidden sm:block">
                                <p class="text-sm font-semibold text-gray-800">{{ Auth::user()->name }}</p>
                                <p class="text-xs text-gray-500">{{ Auth::user()->email }}</p>
                            </div>
                            <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-gray-500 text-sm"></i>
                            </div>
                            <i class="fas fa-chevron-down text-gray-400 text-xs"></i>
                        </button>

                        <!-- Dropdown Menu -->
                        <div id="userDropdown" class="user-dropdown hidden">
                            <a href="{{ route('profile.index') }}" class="user-dropdown-item">
                                <i class="fas fa-user-circle"></i>
                                <span>My Profile</span>
                            </a>

                            <div class="user-dropdown-divider"></div>
                            <form method="POST" action="{{ route('logout') }}">
                                @csrf
                                <button type="submit" class="user-dropdown-item w-full text-left">
                                    <i class="fas fa-sign-out-alt text-red-500"></i>
                                    <span class="text-red-600">Sign Out</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
                @else
                <div class="flex items-center space-x-3">
                    <a href="{{ route('login') }}" class="text-gray-600 hover:text-gray-800">Login</a>
                    <a href="{{ route('register') }}" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Register</a>
                </div>
                @endauth
            </div>
        </nav>

        <!-- Page Content -->
        <div class="p-6">
            @if(session('success'))
            <div class="bg-green-100 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded mb-4">
                <i class="fas fa-check-circle mr-2"></i>
                {{ session('success') }}
            </div>
            @endif

            @if(session('error'))
            <div class="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4">
                <i class="fas fa-exclamation-circle mr-2"></i>
                {{ session('error') }}
            </div>
            @endif

            @yield('content')
        </div>
    </div>

    <!-- Mobile Footer Navigation -->
    <div class="mobile-footer-nav">
        @include('layouts.mobile-footer')
    </div>

    @include('layouts.partials.global-dialogs')

    <script>
        function toggleMobileMenu() {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.overlay');
            if (sidebar && overlay) {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('active');
            }
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');

            if (sidebar && mainContent) {
                sidebar.classList.toggle('collapsed');
                mainContent.classList.toggle('expanded');

                const isCollapsed = sidebar.classList.contains('collapsed');
                localStorage.setItem('sidebarCollapsed', isCollapsed);
            }
        }

        function toggleUserDropdown() {
            const dropdown = document.getElementById('userDropdown');
            if (dropdown) {
                dropdown.classList.toggle('hidden');
            }
        }

        function toggleNotificationDropdown() {
            const dropdown = document.getElementById('notificationDropdown');
            if (dropdown) {
                dropdown.classList.toggle('hidden');
                if (!dropdown.classList.contains('hidden')) {
                    loadNotifications();
                }
            }
        }

        // Load notifications
        function loadNotifications() {
            const container = document.getElementById('notificationList');

            fetch('/notifications', {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        renderNotifications(data.notifications, data.unread_count, data.is_super_admin);
                    }
                })
                .catch(error => {
                    console.error('Error loading notifications:', error);
                });
        }

        // Render notifications with clickable links
        function renderNotifications(notifications, unreadCount, isSuperAdmin) {
            const container = document.getElementById('notificationList');
            const badge = document.getElementById('totalNotificationBadge');

            // Update badge
            if (unreadCount > 0) {
                badge.classList.remove('hidden');
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            } else {
                badge.classList.add('hidden');
            }

            if (!notifications || notifications.length === 0) {
                container.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications</p>
                </div>
            `;
                return;
            }

            container.innerHTML = notifications.map(notification => {
                const iconConfig = getNotificationIcon(notification.type);
                const isUnread = !notification.read_at || notification.read_at === null;
                const link = notification.link || '#';

                // Add query params for pending users to show pending filter
                let finalLink = link;
                if (notification.type === 'pending_user' && link === '/users') {
                    finalLink = '/users?status=pending';
                }
                if (notification.type === 'permission' && link === '/discipline/permission') {
                    finalLink = '/discipline/permission?status=pending';
                }

                return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" 
                     onclick="handleNotificationClick(${notification.source_id}, '${notification.type}', '${finalLink}')">
                    <div class="icon-wrapper" style="background: ${iconConfig.bgColor}">
                        <i class="${iconConfig.icon}" style="color: ${iconConfig.color}"></i>
                    </div>
                    <div class="content">
                        <div class="title">${escapeHtml(notification.title)}</div>
                        <div class="description">${escapeHtml(notification.message)}</div>
                        <div class="time">${formatTimeAgo(notification.created_at)}</div>
                    </div>
                    ${isUnread ? '<div class="unread-dot"></div>' : ''}
                </div>
            `;
            }).join('');
        }

        // Get notification icon based on type
        function getNotificationIcon(type) {
            const icons = {
                'announcement': {
                    icon: 'fas fa-bullhorn',
                    color: '#3b82f6',
                    bgColor: '#eff6ff'
                },
                'pending_user': {
                    icon: 'fas fa-user-plus',
                    color: '#8b5cf6',
                    bgColor: '#f5f3ff'
                },
                'task': {
                    icon: 'fas fa-tasks',
                    color: '#10b981',
                    bgColor: '#ecfdf5'
                },
                'permission': {
                    icon: 'fas fa-shield-alt',
                    color: '#f59e0b',
                    bgColor: '#fffbeb'
                },
                'default': {
                    icon: 'fas fa-bell',
                    color: '#6b7280',
                    bgColor: '#f3f4f6'
                }
            };
            return icons[type] || icons['default'];
        }

        // Handle notification click - mark as read and navigate
        function handleNotificationClick(id, type, link) {
            // Mark as read
            fetch(`/notifications/${id}/read`, {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: type
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Close notification dropdown
                        const dropdown = document.getElementById('notificationDropdown');
                        if (dropdown) dropdown.classList.add('hidden');

                        // Navigate to the link
                        if (link && link !== '#') {
                            window.location.href = link;
                        }
                    }
                })
                .catch(error => {
                    console.error('Error marking notification as read:', error);
                    // Still navigate even if mark as read fails
                    if (link && link !== '#') {
                        window.location.href = link;
                    }
                });
        }

        // Mark all as read
        function markAllRead() {
            fetch('/notifications/mark-all-read', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        loadNotifications();
                        // Update badge
                        const badge = document.getElementById('totalNotificationBadge');
                        if (badge) badge.classList.add('hidden');
                    }
                })
                .catch(error => {
                    console.error('Error marking all as read:', error);
                });
        }

        // Helper: Format time ago
        function formatTimeAgo(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const diff = Math.floor((now - date) / 1000);

            if (diff < 60) return 'Just now';
            if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
            if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
            if (diff < 2592000) return Math.floor(diff / 86400) + 'd ago';
            return date.toLocaleDateString();
        }

        // Helper: Escape HTML
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Load sidebar state from localStorage
        document.addEventListener('DOMContentLoaded', function() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

            if (sidebar && mainContent && isCollapsed) {
                sidebar.classList.add('collapsed');
                mainContent.classList.add('expanded');
            }

            // Load unread count
            fetch('/notifications/unread-count', {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.unread_count > 0) {
                        const badge = document.getElementById('totalNotificationBadge');
                        badge.classList.remove('hidden');
                        badge.textContent = data.unread_count > 99 ? '99+' : data.unread_count;
                    }
                })
                .catch(error => {
                    console.error('Error loading unread count:', error);
                });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('userDropdown');
            const button = event.target.closest('[onclick="toggleUserDropdown()"]');
            if (dropdown && !button && !dropdown.contains(event.target)) {
                dropdown.classList.add('hidden');
            }

            const notificationDropdown = document.getElementById('notificationDropdown');
            const notificationButton = event.target.closest('[onclick="toggleNotificationDropdown()"]');
            if (notificationDropdown && !notificationButton && !notificationDropdown.contains(event.target)) {
                notificationDropdown.classList.add('hidden');
            }
        });

        // Close mobile menu when clicking a link
        if (document.querySelectorAll('.sidebar a').length > 0) {
            document.querySelectorAll('.sidebar a').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        const sidebar = document.querySelector('.sidebar');
                        const overlay = document.querySelector('.overlay');
                        if (sidebar && overlay) {
                            sidebar.classList.remove('open');
                            overlay.classList.remove('active');
                        }
                    }
                });
            });
        }
    </script>
    @stack('scripts')
</body>

</html>
