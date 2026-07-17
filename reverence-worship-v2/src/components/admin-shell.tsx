"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  ChartLine,
  ChevronDown,
  ClipboardList,
  Gavel,
  Gauge,
  HandCoins,
  HandHeart,
  Home,
  Lock,
  LogOut,
  Menu,
  Megaphone,
  Music,
  Settings,
  UserCheck,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
} from "@/app/admin/notifications/actions";

type AdminUser = {
  name: string;
  email: string;
  avatarUrl?: string | null;
  roles: string[];
  permissions: string[];
  isParent?: boolean;
};

type NavItem = {
  label: string;
  href: string;
  page: string;
  icon: LucideIcon;
  active?: boolean;
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", page: "dashboard", icon: Gauge },
      { label: "User Management", href: "/admin/users", page: "users", icon: Users },
      { label: "Music and Evangelism DPT", href: "/admin/music", page: "music-ministry", icon: Music },
      { label: "Intercession & spiritual DPT", href: "/admin/intercession", page: "intercession", icon: HandHeart },
      { label: "Social Fellowship DPT", href: "/admin/social-fellowship", page: "social-fellowship", icon: ClipboardList },
      { label: "Discipline  DPT", href: "/admin/discipline", page: "discipline", icon: Gavel },
      { label: "Financial  DPT", href: "/admin/finance", page: "finance", icon: ChartLine },
      { label: "Announcements", href: "/admin/announcements", page: "announcements", icon: Megaphone },
      { label: "My Family", href: "/admin/family", page: "family", icon: Home },
      { label: "Parent Dashboard", href: "/admin/parent", page: "parent", icon: UserCheck },
      { label: "My Contributions", href: "/admin/contributions", page: "contributions", icon: HandCoins },
      { label: "My Profile", href: "/admin/profile", page: "profile", icon: User },
      { label: "My Performance", href: "/admin/performance", page: "performance", icon: BarChart3 },
      { label: "Permission Manager", href: "/admin/permissions", page: "permissions", icon: Lock },
      { label: "Settings", href: "/admin/settings", page: "settings", icon: Settings },
    ],
  },
];

const mobileNavItems = [
  { label: "Home", href: "/admin/dashboard", page: "dashboard", icon: Gauge },
  { label: "Users", href: "/admin/users", page: "users", icon: Users },
  { label: "Music", href: "/admin/music", page: "music-ministry", icon: Music },
  { label: "Growth", href: "/admin/intercession", page: "intercession", icon: HandHeart },
  { label: "Giving", href: "/admin/contributions", page: "contributions", icon: HandCoins },
  { label: "Profile", href: "/admin/profile", page: "profile", icon: User },
  { label: "Progress", href: "/admin/performance", page: "performance", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", page: "settings", icon: Settings },
];

const IDLE_LOGOUT_MS = 10 * 60 * 1000;
const SESSION_PING_MS = 60 * 1000;

function hasPagePermission(permissions: string[], page: string) {
  return permissions.includes("*") || permissions.some((permission) => permission.startsWith(`${page}.`));
}

function navGroupsForPermissions(permissions: string[], roles: string[], isParent: boolean) {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        hasPagePermission(permissions, item.page) || (item.page === "parent" && roles.some((r) => r.toLowerCase() === "parent") && isParent),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function AdminShell({
  user,
  children,
}: Readonly<{
  user: AdminUser;
  children: React.ReactNode;
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const lastActivityRef = useRef(0);
  const activitySincePingRef = useRef(true);
  const loggingOutRef = useRef(false);
  const pathname = usePathname();
  const router = useRouter();
  const visibleNavGroups = navGroupsForPermissions(user.permissions, user.roles, !!user.isParent);
  const visibleMobileNavItems = mobileNavItems.filter((item) =>
    visibleNavGroups.some((group) => group.items.some((navItem) => navItem.href === item.href)),
  ).slice(0, 4);
  const canViewAnnouncementsPage = hasPagePermission(user.permissions, "announcements");
  const currentPageTitle =
    visibleNavGroups
      .flatMap((group) => group.items)
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.label ?? "Admin";

  function loadNotifications() {
    setNotificationError(null);
    startTransition(async () => {
      const result = await getAdminNotifications();
      if (result.ok) {
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
        setNotificationsLoaded(true);
      } else {
        setNotificationError("Could not load notifications.");
      }
    });
  }

  useEffect(() => {
    const timeout = window.setTimeout(loadNotifications, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const markActive = () => {
      lastActivityRef.current = Date.now();
      activitySincePingRef.current = true;
    };

    markActive();

    const logoutForIdle = async () => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      try {
        await fetch("/logout", { method: "POST" });
      } finally {
        router.replace("/login");
      }
    };

    const refreshSession = async () => {
      if (!activitySincePingRef.current) return;
      activitySincePingRef.current = false;

      const response = await fetch("/api/session/ping", {
        method: "POST",
        cache: "no-store",
      });

      if (response.status === 401) {
        await logoutForIdle();
      }
    };

    const events: Array<keyof WindowEventMap> = ["click", "keydown", "mousemove", "scroll", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }));

    const interval = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_LOGOUT_MS) {
        void logoutForIdle();
        return;
      }

      void refreshSession();
    }, SESSION_PING_MS);

    void refreshSession();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActive));
      window.clearInterval(interval);
    };
  }, [router]);

  function openNotificationDropdown() {
    setNotificationOpen((current) => {
      const next = !current;
      if (next && !notificationsLoaded) loadNotifications();
      return next;
    });
    setUserMenuOpen(false);
  }

  function handleNotificationClick(notification: AdminNotification) {
    setNotificationOpen(false);
    startTransition(async () => {
      await markAdminNotificationRead(notification.type, notification.sourceId);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      setUnreadCount((current) => Math.max(0, current - (notification.readAt ? 0 : 1)));
      router.push(notification.link);
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllAdminNotificationsRead();
      loadNotifications();
    });
  }

  return (
    <main className="admin-app min-h-screen bg-[#f3f4f6] text-gray-900">
      {(userMenuOpen || notificationOpen || mobileOpen) && (
        <button
          className="fixed inset-0 z-30 cursor-default"
          type="button"
          aria-label="Close menu"
          onClick={() => {
            setUserMenuOpen(false);
            setNotificationOpen(false);
            setMobileOpen(false);
          }}
        />
      )}

      <button
        className={`admin-overlay ${mobileOpen ? "active" : ""}`}
        type="button"
        aria-label="Close menu"
        onClick={() => setMobileOpen(false)}
      />

      <aside
        className={`admin-sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "open" : ""
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col bg-white">
          <div className="flex flex-shrink-0 items-center gap-3 bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-4">
            <Image
              src="/logo.png"
              alt="Reverence Worship"
              width={42}
              height={42}
              className="h-10 w-auto object-contain"
              priority
            />
            <h2 className="sidebar-logo-text text-md font-bold text-white">
              Reverence <br />Worship Team
            </h2>
          </div>

          <nav className="admin-sidebar-nav flex-1 overflow-y-auto px-3 py-3">
            {visibleNavGroups.map((group) => (
              <div key={group.label} className="admin-nav-group">
                <p className="admin-nav-heading">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`admin-nav-item ${
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                          ? "active"
                          : ""
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <item.icon className="admin-nav-icon" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="user-info-footer mt-auto flex-shrink-0 border-t border-gray-200 px-3 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-gray-200">
                <User className="size-4 text-gray-500" aria-hidden="true" />
              </div>
              <div className="user-info-text min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{user.name}</p>
                <p className="truncate text-xs text-gray-400">{user.email}</p>
              </div>
              <form action="/logout" method="post">
                <button
                  className="text-gray-400 transition hover:text-red-500"
                  type="submit"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className={`admin-main-content min-h-screen ${collapsed ? "expanded" : ""}`}>
        <header className="admin-top-header sticky top-0 z-40 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                className="admin-sidebar-toggle hidden text-gray-600 hover:text-gray-800 lg:inline-flex"
                type="button"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setCollapsed((current) => !current)}
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">{currentPageTitle}</h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative z-40">
                <button
                  className="admin-notification-bell relative text-gray-600 hover:text-gray-800"
                  type="button"
                  aria-label="Notifications"
                  onClick={openNotificationDropdown}
                >
                  <Bell className="size-5" aria-hidden="true" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </button>

                {notificationOpen && (
                  <div className="admin-notification-dropdown">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                      <h4 className="font-semibold text-gray-800">Notifications</h4>
                      {unreadCount > 0 ? (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                          disabled={pending}
                        >
                          Mark all read
                        </button>
                      ) : null}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {pending && !notificationsLoaded ? (
                        <div className="px-5 py-8 text-center text-gray-400">
                          <Bell className="mx-auto mb-2 size-8 opacity-50" aria-hidden="true" />
                          <p className="text-sm">Loading notifications...</p>
                        </div>
                      ) : notificationError ? (
                        <div className="px-5 py-8 text-center text-red-500">
                          <Bell className="mx-auto mb-2 size-8 opacity-50" aria-hidden="true" />
                          <p className="text-sm">{notificationError}</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-5 py-8 text-center text-gray-400">
                          <Bell className="mx-auto mb-2 size-8 opacity-50" aria-hidden="true" />
                          <p className="text-sm">No notifications</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 ${
                              notification.readAt ? "" : "bg-blue-50/60"
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <NotificationTypeIcon type={notification.type} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-gray-800">{notification.title}</span>
                              <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-gray-500">{notification.message}</span>
                              <span className="mt-1 block text-[11px] font-medium text-gray-400">{formatTimeAgo(notification.createdAt)}</span>
                            </span>
                            {!notification.readAt ? <span className="mt-2 size-2 rounded-full bg-blue-500" /> : null}
                          </button>
                        ))
                      )}
                    </div>
                    <div className="border-t border-gray-200 px-4 py-3 text-center">
                      <Link href={canViewAnnouncementsPage ? "/admin/announcements" : "/admin/dashboard"} className="text-sm font-semibold text-blue-600 hover:text-blue-800" onClick={() => setNotificationOpen(false)}>
                        View all announcements
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative z-40">
                <button
                  className="flex items-center gap-4 focus:outline-none"
                  type="button"
                  aria-expanded={userMenuOpen}
                  onClick={() => {
                    setUserMenuOpen((current) => !current);
                    setNotificationOpen(false);
                  }}
                >
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-full bg-gray-200">
                    {user.avatarUrl ? (
                      <Image src={user.avatarUrl} alt={user.name} fill sizes="40px" className="object-cover" />
                    ) : (
                      <User className="size-4 text-gray-500" aria-hidden="true" />
                    )}
                  </div>
                  <ChevronDown
                    className={`size-3 text-gray-400 transition ${userMenuOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {userMenuOpen && (
                  <div className="admin-user-dropdown">
                    <Link
                      href="/admin/profile"
                      className="admin-user-dropdown-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="size-4 text-gray-500" aria-hidden="true" />
                      <span>My Profile</span>
                    </Link>
                    <div className="h-px bg-gray-200" />
                    <form action="/logout" method="post">
                      <button type="submit" className="admin-user-dropdown-item w-full text-left">
                        <LogOut className="size-4 text-red-500" aria-hidden="true" />
                        <span className="text-red-600">Sign Out</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">{children}</div>
      </div>

      <nav className="admin-mobile-footer">
        {visibleMobileNavItems.map((item) => (
          <Link key={item.href} href={item.href} className="admin-mobile-footer-item" onClick={() => setMobileOpen(false)}>
            <item.icon className="size-5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="admin-mobile-footer-item admin-mobile-footer-menu"
          onClick={() => setMobileOpen((current) => !current)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <Menu className="size-5" aria-hidden="true" />
          <span>Menu</span>
        </button>
      </nav>
    </main>
  );
}

function NotificationTypeIcon({ type }: { type: AdminNotification["type"] }) {
  const config: Record<AdminNotification["type"], { icon: LucideIcon; className: string }> = {
    notification: { icon: Bell, className: "bg-blue-100 text-blue-600" },
    announcement: { icon: Megaphone, className: "bg-blue-100 text-blue-600" },
    form: { icon: ClipboardList, className: "bg-purple-100 text-purple-600" },
    pending_user: { icon: UserCheck, className: "bg-green-100 text-green-600" },
    task: { icon: ClipboardList, className: "bg-amber-100 text-amber-600" },
    permission: { icon: Gavel, className: "bg-red-100 text-red-600" },
    expense_approval: { icon: HandCoins, className: "bg-emerald-100 text-emerald-600" },
    expense_status: { icon: HandCoins, className: "bg-blue-100 text-blue-600" },
  };
  const item = config[type];
  const Icon = item.icon;

  return (
    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${item.className}`}>
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

function formatTimeAgo(value: string) {
  const created = new Date(value).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - created) / 1000));

  if (diffSeconds < 60) return "Just now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
