import Link from "next/link";
import { cache, Suspense } from "react";
import {
  BookOpen,
  CalendarClock,
  FileText,
  HandCoins,
  Megaphone,
  Music,
  Shield,
  UserCheck,
  UserCog,
  UserX,
  Users,
  TriangleAlert,
} from "lucide-react";
import { requirePageAccess } from "@/lib/auth";
import { withDatabaseRetry } from "@/lib/database-retry";
import { prisma } from "@/lib/prisma";
import { normalizePermissionRequestNotificationMessage } from "@/lib/permission-notification-copy";
import { notificationLifetimeCutoff } from "@/lib/notification-retention-policy";
import { filterCurrentNotifications } from "@/lib/notification-source-validity";
import { PerformanceSummaryCards } from "@/components/performance-client";
import { getPerformanceDateRange } from "@/lib/performance-date-range";
import { getUserPerformanceData, type PerformanceMetrics } from "@/lib/user-performance";
import { ProfileModalTrigger } from "@/components/profile-modal";
import { getProbationMonitoring, probationDateSummary } from "@/lib/probation-data";
import { PROBATION_GOOD_THRESHOLD } from "@/lib/probation-rules";
import {
  DashboardBulletinCarousel,
  type DashboardBulletin,
} from "@/components/dashboard-bulletin-carousel";

const personalQuickActions = [
  { label: "Read Bible", href: "/admin/intercession?tab=bible", icon: BookOpen, color: "text-blue-700 bg-blue-50" },
  { label: "My Contribution", href: "/admin/contributions", icon: HandCoins, color: "text-emerald-700 bg-emerald-50" },
  { label: "Forms", href: "/admin/intercession?tab=forms", icon: FileText, color: "text-violet-700 bg-violet-50" },
  { label: "Playlists & Songs", href: "/admin/music", icon: Music, color: "text-orange-700 bg-orange-50" },
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

function announcementIsForUser(
  announcement: { targetType: string; targetRoles: string | null; targetUsers: string | null },
  userId: number,
  roleIds: number[],
  roleNames: string[],
) {
  if (announcement.targetType === "all") return true;

  const rawTargets = announcement.targetType === "roles" ? announcement.targetRoles : announcement.targetUsers;
  if (!rawTargets) return false;

  try {
    const targets = JSON.parse(rawTargets) as unknown;
    if (!Array.isArray(targets)) return false;
    if (announcement.targetType === "users") return targets.some((target) => Number(target) === userId);
    if (announcement.targetType === "roles") {
      return targets.some((target) => roleIds.includes(Number(target)) || roleNames.includes(String(target)));
    }
  } catch {
    return false;
  }

  return false;
}

function bulletinDate(date: Date) {
  const dayKey = (value: Date) => {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: "Africa/Kigali",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  const now = new Date();
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  if (dayKey(date) === dayKey(now)) return `${Math.floor(elapsedMinutes / 60)}h ago`;
  if (dayKey(date) === dayKey(new Date(now.getTime() - 86_400_000))) return "Yesterday";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

async function getDashboardBulletins(userId: number, roleIds: number[], roleNames: string[]): Promise<DashboardBulletin[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [announcements, notifications] = await withDatabaseRetry(() => Promise.all([
    prisma.announcement.findMany({
      where: {
        status: "active",
        OR: [
          { publishedAt: { gte: notificationLifetimeCutoff() } },
          { publishedAt: null, createdAt: { gte: notificationLifetimeCutoff() } },
        ],
        AND: [{ OR: [{ expiryDate: null }, { expiryDate: { gte: today } }] }],
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        targetType: true,
        targetRoles: true,
        targetUsers: true,
        publishedAt: true,
        createdAt: true,
        reads: {
          where: { userId },
          select: { readAt: true },
          take: 1,
        },
      },
    }),
    prisma.notification.findMany({
      where: { userId, readAt: null, createdAt: { gte: notificationLifetimeCutoff() } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        userId: true,
        title: true,
        message: true,
        link: true,
        type: true,
        sourceType: true,
        sourceId: true,
        dedupeKey: true,
        createdAt: true,
      },
    }),
  ]));
  const currentNotifications = await filterCurrentNotifications(notifications);

  const announcementItems: Array<DashboardBulletin & { sortDate: Date }> = announcements
    .filter((announcement) =>
      announcement.reads.length === 0 &&
      announcementIsForUser(announcement, userId, roleIds, roleNames),
    )
    .map((announcement) => {
      const sortDate = announcement.publishedAt ?? announcement.createdAt;
      return {
        id: `announcement-${announcement.id}`,
        kind: "announcement",
        title: announcement.title,
        message: announcement.content,
        href: "/admin/announcements",
        dateLabel: bulletinDate(sortDate),
        urgent: ["urgent", "critical", "high"].includes(announcement.priority.toLowerCase()),
        sourceId: announcement.id,
        sortDate,
      };
    });

  const notificationItems: Array<DashboardBulletin & { sortDate: Date }> = currentNotifications
    .filter((notification) => notification.sourceType !== "announcement" && notification.type !== "announcement")
    .map((notification) => ({
      id: `notification-${notification.id}`,
      kind: "notification",
      title: notification.title,
      message: normalizePermissionRequestNotificationMessage(
        notification.sourceType,
        notification.title,
        notification.message,
      ),
      href: notification.link ?? "/admin/dashboard",
      dateLabel: bulletinDate(notification.createdAt),
      urgent: ["urgent", "critical", "system"].includes(notification.type.toLowerCase()),
      sourceId: notification.id,
      sortDate: notification.createdAt,
    }));

  return [...announcementItems, ...notificationItems]
    .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      message: item.message,
      href: item.href,
      dateLabel: item.dateLabel,
      urgent: item.urgent,
      sourceId: item.sourceId,
    }));
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requirePageAccess("dashboard");
  const params = await searchParams;
  const roles = user.roles.map((userRole) => userRole.role.name);
  const roleIds = user.roles.map((userRole) => userRole.roleId);
  const year = new Date().getFullYear();
  const range = getPerformanceDateRange(year, params.from, params.to);
  const sharedProps = { userId: user.id, userName: user.name, roles, roleIds, year, range };

  if (hasRole(roles, "super-admin")) {
    return <SuperAdminDashboard {...sharedProps} />;
  }

  if (hasRole(roles, "admin")) {
    return <RoleDashboard {...sharedProps} showProbationTodo />;
  }

  const departmentRole = roles.find((role) =>
    ["music-dpt", "social-dpt", "discipline-dpt", "intercession-dpt", "finance-dpt"].includes(role),
  ) as DepartmentRole | undefined;

  if (departmentRole) {
    return <RoleDashboard {...sharedProps} showProbationTodo={departmentRole === "discipline-dpt"} />;
  }

  return <RoleDashboard {...sharedProps} />;
}

type DashboardRange = ReturnType<typeof getPerformanceDateRange>;

type DashboardSectionsProps = {
  userId: number;
  userName: string;
  roles: string[];
  roleIds: number[];
  year: number;
  range: DashboardRange;
};

type SystemDashboardCounts = {
  pendingUsers: number;
  inactiveUsers: number;
  totalRoles: number;
  pendingPermissions: number;
};

const getSystemDashboardCounts = cache(async () => {
  const rows = await withDatabaseRetry(() => prisma.$queryRaw<SystemDashboardCounts[]>`
    SELECT
      (SELECT COUNT(*)::int FROM "users" WHERE "status" = 'pending') AS "pendingUsers",
      (SELECT COUNT(*)::int FROM "users" WHERE "status" = 'inactive') AS "inactiveUsers",
      (SELECT COUNT(*)::int FROM "roles" WHERE "name" <> 'super-admin') AS "totalRoles",
      (SELECT COUNT(*)::int FROM "permission_requests" WHERE "status" = 'pending') AS "pendingPermissions"
  `);
  return rows[0];
});

function SuperAdminDashboard(props: DashboardSectionsProps) {
  const { userId, userName } = props;
  return (
    <div className="super-admin-dashboard mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
      <Suspense fallback={<DashboardHeroFallback message={`Welcome back, ${userName}!`} />}>
        <DashboardHeroSection {...props} superAdmin />
      </Suspense>
      <Suspense fallback={null}>
        <DashboardTodoPanel userId={userId} includeProbation />
      </Suspense>
      <Suspense fallback={<DashboardPanelFallback />}>
        <SuperAdminAttentionPanel />
      </Suspense>
    </div>
  );
}

async function SuperAdminAttentionPanel() {
  const counts = await getSystemDashboardCounts();
  if (!counts) return null;

  const attentionItems: DashboardCard[] = [
    ...(counts.pendingUsers > 0
      ? [{
          label: "Pending Users",
          value: counts.pendingUsers,
          note: "Accounts waiting for approval",
          href: "/admin/users?status=pending",
          icon: UserCog,
          color: "text-blue-700 bg-blue-50",
        }]
      : []),
    {
      label: "Inactive Users",
      value: counts.inactiveUsers,
      note: "Disabled accounts to review",
      href: "/admin/users?status=inactive",
      icon: UserX,
      color: "text-slate-700 bg-slate-100",
    },
    {
      label: "Permission Requests",
      value: counts.pendingPermissions,
      note: "Discipline requests pending",
      href: "/admin/discipline",
      icon: FileText,
      color: "text-blue-700 bg-blue-50",
    },
    {
      label: "Roles Configured",
      value: counts.totalRoles,
      note: "Assignable system roles",
      href: "/admin/permissions",
      icon: Shield,
      color: "text-blue-700 bg-blue-50",
    },
  ];

  return (
    <Panel className="mb-4">
      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 2xl:grid-cols-4">
        {attentionItems.map((item) => <AttentionItem key={item.label} item={item} />)}
      </div>
    </Panel>
  );
}

function DashboardHero({
  message,
  actions,
  bulletins,
}: {
  message: string;
  bulletins: DashboardBulletin[];
  actions: Array<{
    label: string;
    href: string;
    icon: typeof Users;
    variant: "primary" | "secondary";
    opensProfile?: boolean;
  }>;
}) {
  return (
    <div className="dashboard-hero mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <DashboardBulletinCarousel items={bulletins} welcomeMessage={message} />
      {actions.length > 0 ? <div className="flex flex-col gap-2 sm:flex-row">
        {actions.map((action) => {
          const className = action.variant === "primary" ? "dashboard-hero-primary" : "dashboard-hero-secondary";
          const content = (
            <>
              <action.icon className="size-4" aria-hidden="true" />
              {action.label}
            </>
          );

          return action.opensProfile ? (
            <ProfileModalTrigger key={action.label} className={className}>
              {content}
            </ProfileModalTrigger>
          ) : (
            <Link key={action.label} href={action.href} className={className}>
              {content}
            </Link>
          );
        })}
      </div> : null}
    </div>
  );
}

async function DashboardHeroSection({
  userId,
  userName,
  roles,
  roleIds,
  superAdmin = false,
}: DashboardSectionsProps & { superAdmin?: boolean }) {
  const bulletins = await getDashboardBulletins(userId, roleIds, roles);
  const actions = superAdmin
    ? []
    : bulletins.length > 0
      ? []
      : [{ label: "My Profile", href: "/admin/profile", icon: UserCheck, variant: "secondary" as const, opensProfile: true }];
  return <DashboardHero message={`Welcome back, ${userName}!`} bulletins={bulletins} actions={actions} />;
}

async function DashboardPerformanceSection({ userId, year, range }: DashboardSectionsProps) {
  const { metrics } = await getUserPerformanceData(userId, year, {
    from: range.fromDate,
    to: range.toDate,
    label: range.label,
  });
  return <DashboardPerformance metrics={metrics} fromDate={range.from} toDate={range.to} />;
}

function RoleDashboard({
  userId,
  userName,
  showProbationTodo = false,
  ...props
}: DashboardSectionsProps & { showProbationTodo?: boolean }) {
  const sectionProps = { userId, userName, ...props };
  return (
    <div className="super-admin-dashboard mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
      <Suspense fallback={<DashboardHeroFallback message={`Welcome back, ${userName}!`} />}>
        <DashboardHeroSection {...sectionProps} />
      </Suspense>
      <Suspense fallback={<DashboardPerformanceFallback />}>
        <DashboardPerformanceSection {...sectionProps} />
      </Suspense>
      <Suspense fallback={null}>
        <ProbationMemberDashboardCard userId={userId} />
      </Suspense>
      <Suspense fallback={null}>
        <DashboardTodoPanel userId={userId} includeProbation={showProbationTodo} />
      </Suspense>
      <QuickActions actions={personalQuickActions} />
    </div>
  );
}

function DashboardHeroFallback({ message }: { message: string }) {
  return (
    <div className="dashboard-hero mb-4 flex min-h-36 items-center px-5 py-4">
      <div>
        <p className="text-sm font-medium text-slate-600">{message}</p>
        <div className="mt-3 h-5 w-56 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function DashboardPerformanceFallback() {
  return (
    <section className="mb-4 animate-pulse">
      <div className="mb-3 h-6 w-40 rounded bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 rounded-xl border border-slate-200 bg-white" />)}
      </div>
    </section>
  );
}

function DashboardPanelFallback({ className = "mb-4" }: { className?: string }) {
  return <div className={`${className} h-24 animate-pulse rounded-xl border border-slate-200 bg-white`} />;
}

async function ProbationMemberDashboardCard({ userId }: { userId: number }) {
  const probation = await prisma.probation.findFirst({
    where: { userId, state: { in: ["active", "extended"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!probation) return null;
  const monitoring = await getProbationMonitoring(probation);
  const dates = probationDateSummary(probation.currentExpectedEndDate);
  const scores = [
    { label: "Attendance", rate: monitoring.attendance.rate },
    { label: "Communication", rate: monitoring.communication.rate },
    { label: "Discipline", rate: monitoring.discipline.rate },
  ];
  const format = (date: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Membership probation</p>
          <h2 className="mt-0.5 text-lg font-black text-slate-900">{probation.state === "extended" ? "Probation extended" : dates.isOverdue ? "Review overdue" : "Probation active"}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${dates.isOverdue ? "bg-rose-100 text-rose-800" : probation.state === "extended" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
          {dates.isOverdue ? `${Math.abs(dates.daysRemaining)} day(s) overdue` : `${dates.daysRemaining} day(s) remaining`}
        </span>
      </div>
      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {scores.map((score) => (
            <div key={score.label} className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-500">{score.label}</p>
              <p className={`mt-1 text-xl font-black ${score.rate >= PROBATION_GOOD_THRESHOLD ? "text-emerald-700" : "text-rose-700"}`}>{score.rate}%</p>
            </div>
          ))}
        </div>
        <div className="text-sm text-slate-600">
          <p><strong>Period:</strong> {format(probation.originalStartDate)} – {format(probation.currentExpectedEndDate)}</p>
        </div>
        {probation.memberVisibleSummary ? <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{probation.memberVisibleSummary}</p> : null}
        <p className="text-xs text-slate-500">Approved: {monitoring.permissions.approved} · Rejected: {monitoring.permissions.rejected} · Pending: {monitoring.permissions.pending} permission request(s)</p>
      </div>
    </section>
  );
}

function isPublishedForm(settings: unknown) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false;
  return (settings as { is_published?: unknown }).is_published === true;
}

function formIsStillAvailable(settings: unknown, today: string) {
  if (!isPublishedForm(settings)) return false;
  const deadline = (settings as { submission_deadline?: unknown }).submission_deadline;
  return typeof deadline !== "string" || !deadline || deadline >= today;
}

async function DashboardTodoPanel({ userId, includeProbation = false }: { userId: number; includeProbation?: boolean }) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayValue = today.toISOString().slice(0, 10);
  const [forms, submissions, countRows] = await withDatabaseRetry(() => Promise.all([
    prisma.spiritualForm.findMany({
      where: { isActive: true },
      select: { id: true, settings: true },
    }),
    prisma.formSubmission.findMany({
      where: { userId },
      select: { formId: true },
    }),
    prisma.$queryRaw<Array<{
      assignedTasks: number;
      expenseApprovals: number;
      permissionApprovals: number;
      overdueProbations: number;
      assignedDecisions: number;
    }>>`
      SELECT
        (SELECT COUNT(*)::int FROM "action_plan_tasks" WHERE "assigned_to" = ${userId} AND "status" <> 'completed' AND "progress" < 100) AS "assignedTasks",
        (SELECT COUNT(*)::int FROM "expenses" WHERE "status" IN ('pending', 'void_pending') AND ("approver_id_1" = ${userId} OR "approver_id_2" = ${userId})) AS "expenseApprovals",
        CASE WHEN ${includeProbation} THEN (SELECT COUNT(*)::int FROM "permission_requests" WHERE "status" = 'pending') ELSE 0 END AS "permissionApprovals",
        CASE WHEN ${includeProbation} THEN (SELECT COUNT(*)::int FROM "probations" WHERE "state" IN ('active', 'extended') AND "current_expected_end_date" < ${today}) ELSE 0 END AS "overdueProbations",
        CASE WHEN ${includeProbation} THEN (SELECT COUNT(*)::int FROM "probation_decision_requests" request JOIN "probations" probation ON probation."id" = request."probation_id" WHERE request."status" = 'pending' AND probation."assigned_admin_id" = ${userId}) ELSE 0 END AS "assignedDecisions"
    `,
  ]));
  const {
    assignedTasks = 0,
    expenseApprovals = 0,
    permissionApprovals = 0,
    overdueProbations = 0,
    assignedDecisions = 0,
  } = countRows[0] ?? {};

  const submittedFormIds = new Set(submissions.map((submission) => submission.formId));
  const incompleteForms = forms.filter((form) =>
    !submittedFormIds.has(form.id) && formIsStillAvailable(form.settings, todayValue),
  ).length;
  const items: DashboardCard[] = [
    ...(incompleteForms > 0 ? [{
      label: "Forms to complete",
      value: incompleteForms,
      note: "Published forms awaiting your response",
      href: "/admin/intercession?tab=forms",
      icon: FileText,
      color: "bg-violet-50 text-violet-700",
    }] : []),
    ...(assignedTasks > 0 ? [{
      label: "Assigned tasks",
      value: assignedTasks,
      note: "Tasks that are not yet completed",
      href: "/admin/social-fellowship?tab=tasks",
      icon: CalendarClock,
      color: "bg-sky-50 text-sky-700",
    }] : []),
    ...(expenseApprovals > 0 ? [{
      label: "Expense approvals",
      value: expenseApprovals,
      note: "Expense decisions awaiting your review",
      href: "/admin/finance/approvals",
      icon: HandCoins,
      color: "bg-emerald-50 text-emerald-700",
    }] : []),
    ...(permissionApprovals > 0 ? [{
      label: "Permission approvals",
      value: permissionApprovals,
      note: "Member requests awaiting a decision",
      href: "/admin/discipline?tab=permission&status=pending",
      icon: Shield,
      color: "bg-blue-50 text-blue-700",
    }] : []),
    ...(overdueProbations > 0 ? [{
      label: "Overdue probation reviews",
      value: overdueProbations,
      note: "Open records past their expected end date",
      href: "/admin/probation?status=overdue",
      icon: TriangleAlert,
      color: "bg-rose-50 text-rose-700",
    }] : []),
    ...(assignedDecisions > 0 ? [{
      label: "Decisions assigned to me",
      value: assignedDecisions,
      note: "Completion or termination requests awaiting approval",
      href: "/admin/probation",
      icon: CalendarClock,
      color: "bg-amber-50 text-amber-700",
    }] : []),
  ];

  if (!items.length) return null;
  return (
    <Panel className="mb-4">
      <PanelHeader title="My To Do" />
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => <AttentionItem key={item.label} item={item} />)}
      </div>
    </Panel>
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
          <form method="get" className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-gray-600">From</span>
              <input name="from" type="date" min={`${metrics.discipline.year}-01-01`} max={`${metrics.discipline.year}-12-31`} defaultValue={fromDate} className="h-9 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-gray-600">To</span>
              <input name="to" type="date" min={`${metrics.discipline.year}-01-01`} max={`${metrics.discipline.year}-12-31`} defaultValue={toDate} className="h-9 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <button type="submit" className="col-span-2 h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700">Apply</button>
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
