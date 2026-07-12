"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  ChartLine,
  ChevronDown,
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
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

type AdminUser = {
  name: string;
  email: string;
};

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: Gauge },
      { label: "User Management", href: "/admin/users", icon: Users },
      { label: "My Family", href: "/admin/family", icon: Home },
      { label: "My Contributions", href: "/admin/contributions", icon: HandCoins },
      { label: "My Profile", href: "/admin/profile", icon: User },
      { label: "My Performance", href: "/admin/performance", icon: BarChart3 },
      { label: "Music and Evangelism DPT", href: "/admin/music", icon: Music },
      { label: "Intercession & spiritual DPT", href: "/admin/intercession", icon: HandHeart },
      { label: "Social Fellowship DPT", href: "/admin/social-fellowship", icon: HandHeart },
      { label: "Discipline  DPT", href: "/admin/discipline", icon: Gavel },
      { label: "Financial  DPT", href: "/admin/finance", icon: ChartLine },
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { label: "Permission Manager", href: "/admin/permissions", icon: Lock },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

const mobileNavItems = [
  { label: "Home", href: "/admin/dashboard", icon: Gauge },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Music", href: "/admin/music", icon: Music },
  { label: "Growth", href: "/admin/intercession", icon: HandHeart },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

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
  const pathname = usePathname();

  return (
    <main className="admin-app min-h-screen bg-[#f3f4f6] text-gray-900">
      {(userMenuOpen || notificationOpen) && (
        <button
          className="fixed inset-0 z-30 cursor-default"
          type="button"
          aria-label="Close menu"
          onClick={() => {
            setUserMenuOpen(false);
            setNotificationOpen(false);
          }}
        />
      )}

      <button
        className="admin-mobile-menu-btn"
        type="button"
        aria-label="Open menu"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

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
            {navGroups.map((group) => (
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
              <h1 className="text-2xl font-bold text-gray-800">Super Admin Dashboard</h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative z-40">
                <button
                  className="admin-notification-bell relative text-gray-600 hover:text-gray-800"
                  type="button"
                  aria-label="Notifications"
                  onClick={() => {
                    setNotificationOpen((current) => !current);
                    setUserMenuOpen(false);
                  }}
                >
                  <Bell className="size-5" aria-hidden="true" />
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-red-500 ring-2 ring-white" />
                </button>

                {notificationOpen && (
                  <div className="admin-notification-dropdown">
                    <div className="border-b border-gray-200 px-4 py-3">
                      <h4 className="font-semibold text-gray-800">Notifications</h4>
                    </div>
                    <div className="px-5 py-8 text-center text-gray-400">
                      <Bell className="mx-auto mb-2 size-8 opacity-50" aria-hidden="true" />
                      <p className="text-sm">No notifications</p>
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
                  <div className="flex size-10 items-center justify-center rounded-full bg-gray-200">
                    <User className="size-4 text-gray-500" aria-hidden="true" />
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
        {mobileNavItems.map((item) => (
          <Link key={item.href} href={item.href} className="admin-mobile-footer-item">
            <item.icon className="size-5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
