import Link from "next/link";
import {
  Clock,
  FileText,
  Home,
  Settings,
  Shield,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const systemCountLabels = [
  "Roles",
  "Pages",
  "Forms",
  "Songs",
  "Playlists",
  "Sponsors",
  "Announcements",
  "Payments",
  "Expenses",
  "Discipline",
] as const;

export default async function AdminDashboardPage() {
  const user = await requireAdminUser();
  const [
    totalUsers,
    activeUsers,
    pendingUsers,
    inactiveUsers,
    totalRoles,
    totalPages,
    totalFeatures,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "active" } }),
    prisma.user.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { status: "inactive" } }),
    prisma.role.count(),
    prisma.page.count(),
    prisma.feature.count(),
  ]);

  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  const quickActions = [
    { label: "Users", href: "/admin/users", icon: Users, color: "text-blue-700 bg-blue-50" },
    { label: "Roles", href: "/admin/roles", icon: UserCheck, color: "text-blue-700 bg-blue-50" },
    { label: "Permissions", href: "/admin/permissions", icon: Shield, color: "text-blue-700 bg-blue-50" },
    { label: "Settings", href: "/admin/settings", icon: Settings, color: "text-slate-700 bg-slate-100" },
  ];

  const attentionItems = [
    {
      label: "Pending Users",
      value: pendingUsers,
      note: "Accounts waiting for approval",
      href: "/admin/users?status=pending",
      icon: UserCog,
      color: "text-blue-700 bg-blue-50",
    },
    {
      label: "Inactive Users",
      value: inactiveUsers,
      note: "Disabled accounts to review",
      href: "/admin/users?status=inactive",
      icon: UserX,
      color: "text-slate-700 bg-slate-100",
    },
    {
      label: "Permission Requests",
      value: 0,
      note: "Discipline requests pending",
      href: "/admin/discipline/permission?status=pending",
      icon: FileText,
      color: "text-blue-700 bg-blue-50",
    },
    {
      label: "Roles Configured",
      value: totalRoles,
      note: "Access groups in the system",
      href: "/admin/permissions",
      icon: Shield,
      color: "text-blue-700 bg-blue-50",
    },
  ];

  const systemCounts = {
    Roles: totalRoles,
    Pages: totalPages,
    Forms: 0,
    Songs: 0,
    Playlists: 0,
    Sponsors: 0,
    Announcements: 0,
    Payments: 0,
    Expenses: 0,
    Discipline: 0,
    Requests: totalFeatures,
  };

  return (
    <div className="super-admin-dashboard mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
      <div className="dashboard-hero mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
            System administration
          </p>
          <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">Dashboard</h1>
          <p className="mt-1 text-sm text-blue-50">
            Welcome back, {user.name}.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/logs" className="dashboard-hero-secondary">
            <Clock className="size-4" aria-hidden="true" />
            Activity Logs
          </Link>
          <Link href="/admin/users" className="dashboard-hero-primary">
            <UserPlus className="size-4" aria-hidden="true" />
            Manage Users
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="admin-kpi">
          <div>
            <p className="admin-kpi-label">Total Users</p>
            <p className="admin-kpi-value">{totalUsers.toLocaleString()}</p>
            <p className="admin-kpi-note">0 new this month</p>
          </div>
          <span className="admin-kpi-icon">
            <Users className="size-4" aria-hidden="true" />
          </span>
        </div>

        <div className="admin-kpi">
          <div>
            <p className="admin-kpi-label">Active Users</p>
            <p className="admin-kpi-value">{activeUsers.toLocaleString()}</p>
            <p className="admin-kpi-note">{activeRate}% of all users</p>
          </div>
          <span className="admin-kpi-icon">
            <UserCheck className="size-4" aria-hidden="true" />
          </span>
        </div>

        <div className="admin-kpi">
          <div>
            <p className="admin-kpi-label">Families</p>
            <p className="admin-kpi-value">0</p>
            <p className="admin-kpi-note">0 family members</p>
          </div>
          <span className="admin-kpi-icon">
            <Home className="size-4" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="admin-panel">
         
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            {attentionItems.map((item) => (
              <Link key={item.label} href={item.href} className="attention-item">
                <span className={`attention-icon ${item.color}`}>
                  <item.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-gray-900">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{item.note}</span>
                </span>
                <span className="attention-value">{item.value.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2 className="admin-panel-title">Quick Actions</h2>
            
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href} className="quick-action">
                <span className={`quick-action-icon ${action.color}`}>
                  <action.icon className="size-4" aria-hidden="true" />
                </span>
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-panel mt-4">
        <div className="admin-panel-header">
          <div>
            <h2 className="admin-panel-title">System Counts</h2>
          
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 p-3 md:grid-cols-4 xl:grid-cols-5">
          {systemCountLabels.map((label) => (
            <div key={label} className="system-count">
              <span>{systemCounts[label].toLocaleString()}</span>
              <p>{label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
