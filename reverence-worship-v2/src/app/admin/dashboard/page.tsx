import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Gavel,
  HandCoins,
  HandHeart,
  Home,
  Megaphone,
  Music,
  Settings,
  Shield,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users,
  Wallet,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

type RoleName =
  | "super-admin"
  | "admin"
  | "music-dpt"
  | "social-dpt"
  | "discipline-dpt"
  | "intercession-dpt"
  | "member";

type DepartmentRole = Extract<RoleName, "music-dpt" | "social-dpt" | "discipline-dpt" | "intercession-dpt">;

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

function money(value: unknown) {
  return Number(value ?? 0);
}

export default async function AdminDashboardPage() {
  const user = await requireUser();
  const roles = user.roles.map((userRole) => userRole.role.name);

  if (hasRole(roles, "super-admin")) {
    return <SuperAdminDashboard userName={user.name} />;
  }

  if (hasRole(roles, "admin")) {
    return <AdminOperationsDashboard userName={user.name} />;
  }

  const departmentRole = roles.find((role) =>
    ["music-dpt", "social-dpt", "discipline-dpt", "intercession-dpt"].includes(role),
  ) as DepartmentRole | undefined;

  if (departmentRole) {
    return <DepartmentDashboard userName={user.name} role={departmentRole} />;
  }

  return <MemberDashboard userId={user.id} userName={user.name} />;
}

async function SuperAdminDashboard({ userName }: { userName: string }) {
  const [
    totalUsers,
    activeUsers,
    pendingUsers,
    inactiveUsers,
    permanentUsers,
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
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "active" } }),
    prisma.user.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { status: "inactive" } }),
    prisma.user.count({ where: { membershipType: "permanent" } }),
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
  ]);

  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
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

  const quickActions = [
    { label: "Users", href: "/admin/users", icon: Users, color: "text-blue-700 bg-blue-50" },
    { label: "Permissions", href: "/admin/permissions", icon: Shield, color: "text-blue-700 bg-blue-50" },
    { label: "Settings", href: "/admin/settings", icon: Settings, color: "text-slate-700 bg-slate-100" },
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
        eyebrow="System administration"
        title="Super Admin Dashboard"
        message={`Welcome back, ${userName}.`}
        actions={[
          { label: "Activity Logs", href: "/admin/logs", icon: Clock, variant: "secondary" },
          { label: "Manage Users", href: "/admin/users", icon: UserPlus, variant: "primary" },
        ]}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Users" value={totalUsers} note="All registered accounts" icon={Users} />
        <KpiCard label="Active Users" value={activeUsers} note={`${activeRate}% of all users`} icon={UserCheck} />
        <KpiCard label="Families" value={0} note="Family groups" icon={Home} />
        <KpiCard label="Permanent Members" value={permanentUsers} note="Default account type" icon={Users} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 2xl:grid-cols-4">
            {attentionItems.map((item) => <AttentionItem key={item.label} item={item} />)}
          </div>
        </Panel>
        <QuickActions actions={quickActions} />
      </div>

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

async function AdminOperationsDashboard({ userName }: { userName: string }) {
  const [totalUsers, activeUsers, pendingUsers, families, permissions, expenses] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "active" } }),
    prisma.user.count({ where: { status: "pending" } }),
    prisma.family.count(),
    prisma.permissionRequest.count({ where: { status: "pending" } }),
    prisma.expense.count({ where: { status: "pending" } }),
  ]);

  const cards: DashboardCard[] = [
    { label: "Pending Users", value: pendingUsers, note: "Approve new accounts", href: "/admin/users?status=pending", icon: UserCog },
    { label: "Permission Requests", value: permissions, note: "Waiting for decision", href: "/admin/discipline", icon: FileText },
    { label: "Pending Expenses", value: expenses, note: "Financial approvals", href: "/admin/finance", icon: Wallet },
    { label: "Families", value: families, note: "Social fellowship groups", href: "/admin/social-fellowship", icon: Home },
  ];

  return (
    <RoleDashboard
      eyebrow="Operations"
      title="Admin Dashboard"
      message={`Welcome back, ${userName}.`}
      kpis={[
        { label: "Total Users", value: totalUsers, note: "Registered accounts", href: "/admin/users", icon: Users },
        { label: "Active Users", value: activeUsers, note: "Currently active", href: "/admin/users?status=active", icon: UserCheck },
        ...cards.slice(0, 2),
      ]}
      actions={[
        { label: "User Management", href: "/admin/users", icon: Users },
        { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
        { label: "Finance", href: "/admin/finance", icon: Wallet },
        { label: "Discipline", href: "/admin/discipline", icon: Gavel },
      ]}
      attention={cards}
    />
  );
}

async function DepartmentDashboard({ userName, role }: { userName: string; role: DepartmentRole }) {
  const configs = {
    "music-dpt": {
      eyebrow: "Music and Evangelism",
      title: "Music DPT Dashboard",
      href: "/admin/music",
      icon: Music,
      department: "music",
      queries: [
        prisma.song.count(),
        prisma.playlist.count(),
        prisma.serviceTeam.count(),
        prisma.actionPlan.count({ where: { department: "music" } }),
      ],
      labels: ["Songs", "Playlists", "Service Teams", "Action Plans"],
    },
    "social-dpt": {
      eyebrow: "Social Fellowship",
      title: "Social DPT Dashboard",
      href: "/admin/social-fellowship",
      icon: HandHeart,
      department: "social-fellowship",
      queries: [
        prisma.family.count(),
        prisma.familyTask.count({ where: { status: "pending" } }),
        prisma.actionPlan.count({ where: { department: "social-fellowship" } }),
        prisma.user.count({ where: { status: "active" } }),
      ],
      labels: ["Families", "Pending Tasks", "Action Plans", "Active Members"],
    },
    "discipline-dpt": {
      eyebrow: "Discipline Management",
      title: "Discipline DPT Dashboard",
      href: "/admin/discipline",
      icon: Gavel,
      department: "discipline",
      queries: [
        prisma.permissionRequest.count({ where: { status: "pending" } }),
        prisma.attendanceSession.count(),
        prisma.disciplineRecord.count({ where: { status: "active" } }),
        prisma.actionPlan.count({ where: { department: "discipline" } }),
      ],
      labels: ["Pending Permissions", "Attendance Sessions", "Active Records", "Action Plans"],
    },
    "intercession-dpt": {
      eyebrow: "Intercession and Spiritual Growth",
      title: "Intercession DPT Dashboard",
      href: "/admin/intercession",
      icon: BookOpen,
      department: "intercession",
      queries: [
        prisma.spiritualForm.count({ where: { isActive: true } }),
        prisma.formSubmission.count(),
        prisma.actionPlan.count({ where: { department: "intercession" } }),
        prisma.user.count({ where: { status: "active" } }),
      ],
      labels: ["Active Forms", "Submissions", "Action Plans", "Active Members"],
    },
  }[role];

  const values = await Promise.all(configs.queries);
  const cards = configs.labels.map((label, index) => ({
    label,
    value: values[index] ?? 0,
    note: index === 0 ? "Main department workload" : "Current department activity",
    href: configs.href,
    icon: configs.icon,
  }));

  return (
    <RoleDashboard
      eyebrow={configs.eyebrow}
      title={configs.title}
      message={`Welcome back, ${userName}.`}
      kpis={cards}
      actions={[
        { label: "Open Department", href: configs.href, icon: configs.icon },
        { label: "Action Plans", href: configs.href, icon: ClipboardList },
        { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
        { label: "My Performance", href: "/admin/performance", icon: BarChart3 },
      ]}
      attention={cards}
    />
  );
}

async function MemberDashboard({ userId, userName }: { userId: number; userName: string }) {
  const year = new Date().getFullYear();
  const [forms, submissions, contribution, payments, attendance, discipline, announcements] = await Promise.all([
    prisma.spiritualForm.count({ where: { isActive: true } }),
    prisma.formSubmission.count({ where: { userId } }),
    prisma.contribution.findUnique({ where: { userId_year: { userId, year } } }),
    prisma.payment.findMany({ where: { userId, year }, select: { amount: true } }),
    prisma.attendanceRecord.count({ where: { userId } }),
    prisma.disciplineRecord.count({ where: { userId, status: "active" } }),
    prisma.announcement.count({ where: { status: "active" } }),
  ]);

  const paid = payments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const expected = money(contribution?.annualAmount);
  const progress = expected > 0 ? `${Math.min(100, Math.round((paid / expected) * 100))}%` : "0%";

  return (
    <RoleDashboard
      eyebrow="Member area"
      title="Member Dashboard"
      message={`Welcome back, ${userName}.`}
      kpis={[
        { label: "Forms Available", value: forms, note: "Spiritual forms to submit", href: "/admin/intercession", icon: BookOpen },
        { label: "My Submissions", value: submissions, note: "Forms you submitted", href: "/admin/intercession", icon: CheckCircle2 },
        { label: "Contribution", value: progress, note: `${paid.toLocaleString()} paid this year`, href: "/admin/contributions", icon: HandCoins },
        { label: "Attendance Records", value: attendance, note: "Your saved attendance history", href: "/admin/performance", icon: CalendarCheck },
      ]}
      actions={[
        { label: "Take Forms", href: "/admin/intercession", icon: BookOpen },
        { label: "My Contributions", href: "/admin/contributions", icon: HandCoins },
        { label: "My Performance", href: "/admin/performance", icon: BarChart3 },
        { label: "My Profile", href: "/admin/profile", icon: UserCheck },
      ]}
      attention={[
        { label: "Active Announcements", value: announcements, note: "Messages from the team", href: "/admin/announcements", icon: Megaphone },
        { label: "Discipline Records", value: discipline, note: "Your active records", href: "/admin/performance", icon: Gavel },
      ]}
    />
  );
}

function DashboardHero({
  eyebrow,
  title,
  message,
  actions,
}: {
  eyebrow: string;
  title: string;
  message: string;
  actions: Array<{ label: string; href: string; icon: typeof Users; variant: "primary" | "secondary" }>;
}) {
  return (
    <div className="dashboard-hero mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">{eyebrow}</p>
        <h1 className="mt-1 text-xl font-bold text-white sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-blue-50">{message}</p>
      </div>
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
  eyebrow,
  title,
  message,
  kpis,
  actions,
  attention,
}: {
  eyebrow: string;
  title: string;
  message: string;
  kpis: DashboardCard[];
  actions: Array<{ label: string; href: string; icon: typeof Users }>;
  attention: DashboardCard[];
}) {
  return (
    <div className="super-admin-dashboard mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
      <DashboardHero
        eyebrow={eyebrow}
        title={title}
        message={message}
        actions={[{ label: "My Profile", href: "/admin/profile", icon: UserCheck, variant: "secondary" }]}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((item) => (
          <Link key={item.label} href={item.href} className="admin-kpi transition hover:-translate-y-0.5 hover:shadow-md">
            <div>
              <p className="admin-kpi-label">{item.label}</p>
              <p className="admin-kpi-value">{typeof item.value === "number" ? item.value.toLocaleString() : item.value}</p>
              <p className="admin-kpi-note">{item.note}</p>
            </div>
            <span className="admin-kpi-icon">
              <item.icon className="size-4" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <PanelHeader title="For Your Role" />
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            {attention.map((item) => <AttentionItem key={item.label} item={item} />)}
          </div>
        </Panel>
        <QuickActions actions={actions.map((action) => ({ ...action, color: "text-blue-700 bg-blue-50" }))} />
      </div>
    </div>
  );
}

function KpiCard({ label, value, note, icon: Icon }: { label: string; value: number; note: string; icon: typeof Users }) {
  return (
    <div className="admin-kpi">
      <div>
        <p className="admin-kpi-label">{label}</p>
        <p className="admin-kpi-value">{value.toLocaleString()}</p>
        <p className="admin-kpi-note">{note}</p>
      </div>
      <span className="admin-kpi-icon">
        <Icon className="size-4" aria-hidden="true" />
      </span>
    </div>
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
      <div className="grid grid-cols-2 gap-3 p-4">
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
