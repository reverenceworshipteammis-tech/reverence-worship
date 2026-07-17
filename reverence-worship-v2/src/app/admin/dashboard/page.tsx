import Link from "next/link";
import {
  BookOpen,
  Clock,
  FileText,
  HandCoins,
  Megaphone,
  Music,
  Shield,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { requirePageAccess } from "@/lib/auth";
import { withDatabaseRetry } from "@/lib/database-retry";
import { prisma } from "@/lib/prisma";
import { PerformanceSummaryCards } from "@/components/performance-client";
import { getPerformanceDateRange } from "@/lib/performance-date-range";
import { getUserPerformanceData, type PerformanceMetrics } from "@/lib/user-performance";

const systemCountLabels = [
  "Forms",
  "Songs",
  "Playlists",
  "Sponsors",
  "Announcements",
  "Payments",
  "Expenses",
  "Discipline",
] as const;

const personalQuickActions = [
  { label: "Read Bible", href: "/admin/intercession?tab=bible", icon: BookOpen, color: "text-blue-700 bg-blue-50" },
  { label: "My Contribution", href: "/admin/contributions", icon: HandCoins, color: "text-emerald-700 bg-emerald-50" },
  { label: "Forms", href: "/admin/intercession?tab=forms", icon: FileText, color: "text-violet-700 bg-violet-50" },
  { label: "Playlist", href: "/admin/music", icon: Music, color: "text-orange-700 bg-orange-50" },
  { label: "Announcements", href: "/admin/announcements", icon: Megaphone, color: "text-sky-700 bg-sky-50" },
];

type RoleName =
  | "super-admin"
  | "admin"
  | "music-dpt"
  | "social-dpt"
  | "discipline-dpt"
  | "intercession-dpt"
  | "finance-dpt"
  | "parent"
  | "member";

type DepartmentRole = Extract<RoleName, "music-dpt" | "social-dpt" | "discipline-dpt" | "intercession-dpt" | "finance-dpt">;

type DashboardCard = {
  label: string;
  value: number | string;
  note: string;
  href: string;
  icon: typeof Users;
  color?: string;
};

function hasRole(roles: string[], role: RoleName) {
  return roles.includes(role);
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requirePageAccess("dashboard");
  const params = await searchParams;
  const roles = user.roles.map((userRole) => userRole.role.name);
  const year = new Date().getFullYear();
  const range = getPerformanceDateRange(year, params.from, params.to);
  const { metrics } = await getUserPerformanceData(user.id, year, { from: range.fromDate, to: range.toDate, label: range.label });

  if (hasRole(roles, "super-admin")) {
    return <SuperAdminDashboard userName={user.name} metrics={metrics} fromDate={range.from} toDate={range.to} />;
  }

  if (hasRole(roles, "admin")) {
    return <AdminOperationsDashboard userName={user.name} metrics={metrics} fromDate={range.from} toDate={range.to} />;
  }

  const departmentRole = roles.find((role) =>
    ["music-dpt", "social-dpt", "discipline-dpt", "intercession-dpt", "finance-dpt"].includes(role),
  ) as DepartmentRole | undefined;

  if (departmentRole) {
    return <DepartmentDashboard userName={user.name} metrics={metrics} fromDate={range.from} toDate={range.to} />;
  }

  return <MemberDashboard userName={user.name} metrics={metrics} fromDate={range.from} toDate={range.to} />;
}

async function SuperAdminDashboard({ userName, metrics, fromDate, toDate }: { userName: string; metrics: PerformanceMetrics; fromDate: string; toDate: string }) {
  const [
    pendingUsers,
    inactiveUsers,
    totalRoles,
    totalFeatures,
    forms,
    songs,
    playlists,
    sponsors,
    announcements,
    payments,
    expenses,
    discipline,
  ] = await withDatabaseRetry(() => Promise.all([
    prisma.user.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { status: "inactive" } }),
    prisma.role.count({ where: { name: { not: "super-admin" } } }),
    prisma.feature.count(),
    prisma.spiritualForm.count(),
    prisma.song.count(),
    prisma.playlist.count(),
    prisma.sponsor.count(),
    prisma.announcement.count(),
    prisma.payment.count(),
    prisma.expense.count(),
    prisma.disciplineRecord.count(),
  ]));

  const attentionItems: DashboardCard[] = [
    ...(pendingUsers > 0
      ? [{
          label: "Pending Users",
          value: pendingUsers,
          note: "Accounts waiting for approval",
          href: "/admin/users?status=pending",
          icon: UserCog,
          color: "text-blue-700 bg-blue-50",
        }]
      : []),
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
      href: "/admin/discipline",
      icon: FileText,
      color: "text-blue-700 bg-blue-50",
    },
    {
      label: "Roles Configured",
      value: totalRoles,
      note: "Assignable system roles",
      href: "/admin/permissions",
      icon: Shield,
      color: "text-blue-700 bg-blue-50",
    },
  ];

  const systemCounts = {
    Forms: forms,
    Songs: songs,
    Playlists: playlists,
    Sponsors: sponsors,
    Announcements: announcements,
    Payments: payments,
    Expenses: expenses,
    Discipline: discipline,
    Requests: totalFeatures,
  };

  return (
    <div className="super-admin-dashboard mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
      <DashboardHero
        message={`Welcome back, ${userName}!`}
        actions={[
          { label: "Activity Logs", href: "/admin/logs", icon: Clock, variant: "secondary" },
          { label: "Manage Users", href: "/admin/users", icon: UserPlus, variant: "primary" },
        ]}
      />

      <DashboardPerformance metrics={metrics} fromDate={fromDate} toDate={toDate} />

      <Panel className="mb-4">
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 2xl:grid-cols-4">
          {attentionItems.map((item) => <AttentionItem key={item.label} item={item} />)}
        </div>
      </Panel>
      <QuickActions actions={personalQuickActions} />

      <Panel className="mt-4">
        <PanelHeader title="System Counts" />
        <div className="grid grid-cols-2 gap-2.5 p-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-10">
          {systemCountLabels.map((label) => (
            <div key={label} className="system-count">
              <span>{systemCounts[label].toLocaleString()}</span>
              <p>{label}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function AdminOperationsDashboard({ userName, metrics, fromDate, toDate }: { userName: string; metrics: PerformanceMetrics; fromDate: string; toDate: string }) {
  return (
    <RoleDashboard
      message={`Welcome back, ${userName}!`}
      performanceMetrics={metrics}
      fromDate={fromDate}
      toDate={toDate}
    />
  );
}

function DepartmentDashboard({ userName, metrics, fromDate, toDate }: { userName: string; metrics: PerformanceMetrics; fromDate: string; toDate: string }) {
  return (
    <RoleDashboard
      message={`Welcome back, ${userName}!`}
      performanceMetrics={metrics}
      fromDate={fromDate}
      toDate={toDate}
    />
  );
}

function MemberDashboard({ userName, metrics, fromDate, toDate }: { userName: string; metrics: PerformanceMetrics; fromDate: string; toDate: string }) {
  return (
    <RoleDashboard
      message={`Welcome back, ${userName}!`}
      performanceMetrics={metrics}
      fromDate={fromDate}
      toDate={toDate}
    />
  );
}

function DashboardHero({
  message,
  actions,
}: {
  message: string;
  actions: Array<{ label: string; href: string; icon: typeof Users; variant: "primary" | "secondary" }>;
}) {
  return (
    <div className="dashboard-hero mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{message}</h1>
      <div className="flex flex-col gap-2 sm:flex-row">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={action.variant === "primary" ? "dashboard-hero-primary" : "dashboard-hero-secondary"}
          >
            <action.icon className="size-4" aria-hidden="true" />
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function RoleDashboard({
  message,
  performanceMetrics,
  fromDate,
  toDate,
}: {
  message: string;
  performanceMetrics: PerformanceMetrics;
  fromDate: string;
  toDate: string;
}) {
  return (
    <div className="super-admin-dashboard mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
      <DashboardHero
        message={message}
        actions={[{ label: "My Profile", href: "/admin/profile", icon: UserCheck, variant: "secondary" }]}
      />

      <DashboardPerformance metrics={performanceMetrics} fromDate={fromDate} toDate={toDate} />

      <QuickActions actions={personalQuickActions} />
    </div>
  );
}

function DashboardPerformance({ metrics, fromDate, toDate }: { metrics: PerformanceMetrics; fromDate: string; toDate: string }) {
  return (
    <section className="mb-4">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">My Performance</h2>
  
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">From</span>
              <input name="from" type="date" min={`${metrics.discipline.year}-01-01`} max={`${metrics.discipline.year}-12-31`} defaultValue={fromDate} className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600">To</span>
              <input name="to" type="date" min={`${metrics.discipline.year}-01-01`} max={`${metrics.discipline.year}-12-31`} defaultValue={toDate} className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <button type="submit" className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700">Apply</button>
          </form>
          <Link href={`/admin/performance?from=${fromDate}&to=${toDate}`} className="inline-flex h-9 items-center text-sm font-semibold text-blue-600 hover:text-blue-700">View details</Link>
        </div>
      </div>
      <PerformanceSummaryCards metrics={metrics} detailsHref={`/admin/performance?from=${fromDate}&to=${toDate}`} />
    </section>
  );
}

function AttentionItem({ item }: { item: DashboardCard }) {
  return (
    <Link href={item.href} className="attention-item">
      <span className={`attention-icon ${item.color ?? "text-blue-700 bg-blue-50"}`}>
        <item.icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-gray-900">{item.label}</span>
        <span className="mt-0.5 block text-xs text-gray-500">{item.note}</span>
      </span>
      <span className="attention-value">{typeof item.value === "number" ? item.value.toLocaleString() : item.value}</span>
    </Link>
  );
}

function QuickActions({
  actions,
}: {
  actions: Array<{ label: string; href: string; icon: typeof Users; color: string }>;
}) {
  return (
    <Panel>
      <PanelHeader title="Quick Actions" />
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => (
          <Link key={action.label} href={action.href} className="quick-action">
            <span className={`quick-action-icon ${action.color}`}>
              <action.icon className="size-4" aria-hidden="true" />
            </span>
            <span>{action.label}</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`admin-panel ${className}`}>{children}</section>;
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="admin-panel-header">
      <div>
        <h2 className="admin-panel-title">{title}</h2>
      </div>
    </div>
  );
}
