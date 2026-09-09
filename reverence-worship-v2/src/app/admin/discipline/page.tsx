import { DisciplineClient } from "@/components/discipline-client";
import { getUserPermissionSet, permissionSetHas, requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { excludeSuperAdminUserWhere } from "@/lib/system-account-rules";
import { databaseDate, databaseDateKey, kigaliDateKey, kigaliDayBounds } from "@/lib/calendar-date";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "Africa/Kigali",
  }).format(date);
}

function dateValue(date: Date) {
  return kigaliDateKey(date);
}

function monthStart() {
  return `${kigaliDateKey().slice(0, 7)}-01`;
}

function monthEnd() {
  const start = databaseDate(monthStart());
  start.setUTCMonth(start.getUTCMonth() + 1, 0);
  return databaseDateKey(start);
}

function yearStart() {
  return `${kigaliDateKey().slice(0, 4)}-01-01`;
}

async function safeRead<T>(promise: Promise<T>, fallback: T) {
  try {
    return await promise;
  } catch (error) {
    console.error("Unable to read discipline overview data", error);
    return fallback;
  }
}

type DisciplineStatsRow = {
  permissionRequests: number;
  attendanceRecords: number;
  goodAttendance: number;
  communicatedRecords: number;
  disciplineRecords: number;
  goodDiscipline: number;
};

export default async function DisciplinePage({
  searchParams,
}: {
  searchParams: Promise<{
    start_date?: string;
    end_date?: string;
    attendance_start_date?: string;
    attendance_end_date?: string;
    tab?: string;
    member?: string;
    status?: string;
  }>;
}) {
  const user = await requirePageAccess("discipline");
  const permissions = await getUserPermissionSet(user);
  const canManage = permissionSetHas(permissions, "discipline", "view");
  const canViewProbation = permissionSetHas(permissions, "probation", "view");
  const params = await searchParams;
  const startDateValue = params.start_date ?? monthStart();
  const endDateValue = params.end_date ?? monthEnd();
  const attendanceStartDateValue = params.attendance_start_date ?? yearStart();
  const attendanceEndDateValue = params.attendance_end_date ?? monthEnd();
  const startDate = kigaliDayBounds(startDateValue).start;
  const endDate = kigaliDayBounds(endDateValue).end;
  const startCalendarDate = databaseDate(startDateValue);
  const endCalendarDate = databaseDate(endDateValue);
  const attendanceStartDate = databaseDate(attendanceStartDateValue);
  const attendanceEndDate = databaseDate(attendanceEndDateValue);

  if (!canManage) {
    const ownPermissions = await prisma.permissionRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true } },
      },
    });

    return (
      <DisciplineClient
        key={`permission:${params.status ?? "all"}`}
        initialTab="permission"
        initialPermissionStatus={["pending", "approved", "rejected"].includes(params.status ?? "") ? params.status! : "all"}
        initialMemberId={null}
        canManage={false}
        canManageActionPlans={false}
        canViewProbation={false}
        startDate={startDateValue}
        endDate={endDateValue}
        attendanceStartDate={attendanceStartDateValue}
        attendanceEndDate={attendanceEndDateValue}
        stats={{
          permissionRequests: ownPermissions.length,
          attendanceRate: 0,
          attendancePresent: 0,
          attendanceTotal: 0,
          communicationRate: 0,
          communicated: 0,
          communicationTotal: 0,
          disciplineRate: 0,
          goodDiscipline: 0,
          disciplineTotal: 0,
          performancePeriod: `${formatDate(startDate)} - ${formatDate(endDate)}`,
        }}
        recentAttendanceSessions={[]}
        recentPermissions={[]}
        attendanceRecords={[]}
        attendanceSessionStates={[]}
        users={[{ id: user.id, name: user.name, email: user.email, phone: user.phone, joinedDate: dateValue(user.createdAt) }]}
        permissions={ownPermissions.map((permission) => ({
          id: permission.id,
          userId: permission.userId,
          userName: permission.user.name,
          userEmail: permission.user.email,
          type: permission.type,
          startDate: formatDate(permission.startDate),
          startDateValue: dateValue(permission.startDate),
          endDate: formatDate(permission.endDate),
          endDateValue: dateValue(permission.endDate),
          reason: permission.reason,
          status: permission.status,
          approvedByName: permission.approver?.name ?? null,
          approvedAt: permission.approvedAt ? formatDate(permission.approvedAt) : null,
          rejectionReason: permission.rejectionReason,
          createdAt: formatDate(permission.createdAt),
          createdAtValue: dateValue(permission.createdAt),
        }))}
        disciplineSessionStates={[]}
        disciplineRecords={[]}
        actionPlans={[]}
      />
    );
  }

  const [
    statsRows,
    recentAttendanceSessions,
    recentPermissions,
    attendanceRecords,
    activeUsers,
    permissionList,
    disciplineRecords,
    attendanceSessionStates,
    disciplineSessionStates,
    actionPlans,
  ] = await Promise.all([
    safeRead(
      prisma.$queryRaw<DisciplineStatsRow[]>`
        SELECT
          (SELECT COUNT(*)::int FROM "permission_requests"
            WHERE "created_at" BETWEEN ${startDate} AND ${endDate}) AS "permissionRequests",
          (SELECT COUNT(*)::int FROM "attendance_records" records
            INNER JOIN "users" users ON users."id" = records."user_id"
            WHERE records."session_date" BETWEEN ${startCalendarDate} AND ${endCalendarDate}
              AND users."status" = 'active'
              AND (users."membership_type" IS NULL OR users."membership_type" <> 'temporary')
              AND NOT EXISTS (
                SELECT 1 FROM "role_user" system_role
                INNER JOIN "roles" role ON role."id" = system_role."role_id"
                WHERE system_role."user_id" = users."id" AND role."name" = 'super-admin'
              )) AS "attendanceRecords",
          (SELECT COUNT(*)::int FROM "attendance_records" records
            INNER JOIN "users" users ON users."id" = records."user_id"
            WHERE records."session_date" BETWEEN ${startCalendarDate} AND ${endCalendarDate}
              AND records."status" = 'present'
              AND users."status" = 'active'
              AND (users."membership_type" IS NULL OR users."membership_type" <> 'temporary')
              AND NOT EXISTS (
                SELECT 1 FROM "role_user" system_role
                INNER JOIN "roles" role ON role."id" = system_role."role_id"
                WHERE system_role."user_id" = users."id" AND role."name" = 'super-admin'
              )) AS "goodAttendance",
          (SELECT COUNT(*)::int FROM "attendance_records" records
            INNER JOIN "users" users ON users."id" = records."user_id"
            WHERE records."session_date" BETWEEN ${startCalendarDate} AND ${endCalendarDate}
              AND records."communicated" = true
              AND users."status" = 'active'
              AND (users."membership_type" IS NULL OR users."membership_type" <> 'temporary')
              AND NOT EXISTS (
                SELECT 1 FROM "role_user" system_role
                INNER JOIN "roles" role ON role."id" = system_role."role_id"
                WHERE system_role."user_id" = users."id" AND role."name" = 'super-admin'
              )) AS "communicatedRecords",
          (SELECT COUNT(*)::int FROM "discipline_records" records
            INNER JOIN "users" users ON users."id" = records."user_id"
            WHERE records."created_at" BETWEEN ${startDate} AND ${endDate}
              AND users."status" = 'active'
              AND (users."membership_type" IS NULL OR users."membership_type" <> 'temporary')
              AND NOT EXISTS (
                SELECT 1 FROM "role_user" system_role
                INNER JOIN "roles" role ON role."id" = system_role."role_id"
                WHERE system_role."user_id" = users."id" AND role."name" = 'super-admin'
              )) AS "disciplineRecords",
          (SELECT COUNT(*)::int FROM "discipline_records" records
            INNER JOIN "users" users ON users."id" = records."user_id"
            WHERE records."created_at" BETWEEN ${startDate} AND ${endDate}
              AND records."type" = 'positive'
              AND users."status" = 'active'
              AND (users."membership_type" IS NULL OR users."membership_type" <> 'temporary')
              AND NOT EXISTS (
                SELECT 1 FROM "role_user" system_role
                INNER JOIN "roles" role ON role."id" = system_role."role_id"
                WHERE system_role."user_id" = users."id" AND role."name" = 'super-admin'
              )) AS "goodDiscipline"
      `,
      [],
    ),
    safeRead(
      prisma.attendanceSession.findMany({
        where: {
          sessionDate: { gte: startCalendarDate, lte: endCalendarDate },
        },
        orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
        take: 5,
      }),
      [],
    ),
    safeRead(
      prisma.permissionRequest.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      [],
    ),
    safeRead(
      prisma.attendanceRecord.findMany({
        where: {
          sessionDate: { gte: attendanceStartDate, lte: attendanceEndDate },
          user: { is: { OR: [{ membershipType: null }, { membershipType: { not: "temporary" } }] } },
        },
        orderBy: [{ sessionDate: "desc" }, { sessionType: "asc" }, { user: { name: "asc" } }],
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      [],
    ),
    safeRead(
      prisma.user.findMany({
        where: {
          status: "active",
          OR: [{ membershipType: null }, { membershipType: { not: "temporary" } }],
          ...excludeSuperAdminUserWhere(),
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, phone: true, createdAt: true },
      }),
      [],
    ),
    safeRead(
      prisma.permissionRequest.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true } },
        },
      }),
      [],
    ),
    safeRead(
      prisma.disciplineRecord.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          recorder: { select: { id: true, name: true } },
          resolver: { select: { id: true, name: true } },
        },
      }),
      [],
    ),
    safeRead(
      prisma.attendanceSession.findMany({
        where: { sessionDate: { gte: attendanceStartDate, lte: attendanceEndDate } },
        orderBy: [{ sessionDate: "desc" }, { sessionType: "asc" }],
      }),
      [],
    ),
    safeRead(
      prisma.disciplineSession.findMany({
        where: { sessionDate: { gte: startCalendarDate, lte: endCalendarDate } },
        orderBy: [{ sessionDate: "desc" }, { title: "asc" }],
      }),
      [],
    ),
    safeRead(
      prisma.actionPlan.findMany({
        where: { department: "discipline" },
        orderBy: { createdAt: "desc" },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          tasks: {
            orderBy: [{ deadline: "asc" }, { createdAt: "asc" }],
          },
        },
      }),
      [],
    ),
  ]);

  const stats = statsRows[0] ?? {
    permissionRequests: 0,
    attendanceRecords: 0,
    goodAttendance: 0,
    communicatedRecords: 0,
    disciplineRecords: 0,
    goodDiscipline: 0,
  };
  const attendanceRate = stats.attendanceRecords ? Math.round((stats.goodAttendance / stats.attendanceRecords) * 100) : 0;
  const communicationRate = stats.attendanceRecords ? Math.round((stats.communicatedRecords / stats.attendanceRecords) * 100) : 0;
  const disciplineRate = stats.disciplineRecords ? Math.round((stats.goodDiscipline / stats.disciplineRecords) * 100) : 0;

  return (
    <DisciplineClient
      key={`${params.tab ?? "overview"}:${params.status ?? "all"}:${params.member ?? "all"}`}
      initialTab={["overview", "attendance", "permission", "discipline-records", "action-plans"].includes(params.tab ?? "") ? params.tab! : "overview"}
      initialPermissionStatus={["pending", "approved", "rejected"].includes(params.status ?? "") ? params.status! : "all"}
      initialMemberId={Number(params.member) || null}
      canManage
      canManageActionPlans={permissionSetHas(permissions, "discipline", "manage-action-plans")}
      canViewProbation={canViewProbation}
      startDate={startDateValue}
      endDate={endDateValue}
      attendanceStartDate={attendanceStartDateValue}
      attendanceEndDate={attendanceEndDateValue}
      stats={{
        permissionRequests: stats.permissionRequests,
        attendanceRate,
        attendancePresent: stats.goodAttendance,
        attendanceTotal: stats.attendanceRecords,
        communicationRate,
        communicated: stats.communicatedRecords,
        communicationTotal: stats.attendanceRecords,
        disciplineRate,
        goodDiscipline: stats.goodDiscipline,
        disciplineTotal: stats.disciplineRecords,
        performancePeriod: `${formatDate(startCalendarDate)} - ${formatDate(endCalendarDate)}`,
      }}
      recentAttendanceSessions={recentAttendanceSessions.map((session) => ({
        sessionDate: dateValue(session.sessionDate),
        sessionDateLabel: formatDate(session.sessionDate),
        sessionType: session.sessionType,
        isCompleted: session.isCompleted,
      }))}
      recentPermissions={recentPermissions.map((permission) => ({
        id: permission.id,
        userName: permission.user.name,
        userEmail: permission.user.email,
        type: permission.type,
        reason: permission.reason,
        status: permission.status,
        createdAt: formatDate(permission.createdAt),
      }))}
      attendanceRecords={attendanceRecords.map((record) => ({
        id: record.id,
        userId: record.userId,
        userName: record.user.name,
        userEmail: record.user.email,
        sessionDate: dateValue(record.sessionDate),
        sessionDateLabel: formatDate(record.sessionDate),
        sessionType: record.sessionType,
        status: record.status,
        onTime: record.onTime,
        communicated: record.communicated,
        disciplinePoints: record.disciplinePoints,
        lateMinutes: record.lateMinutes,
        notes: record.notes,
      }))}
      attendanceSessionStates={attendanceSessionStates.map((session) => ({
        sessionDate: dateValue(session.sessionDate),
        sessionType: session.sessionType,
        isCompleted: session.isCompleted,
        isImported: session.isImported,
        updatedAt: session.updatedAt.toISOString(),
      }))}
      disciplineSessionStates={disciplineSessionStates.map((session) => ({
        sessionDate: dateValue(session.sessionDate),
        title: session.title,
        isCompleted: session.isCompleted,
        updatedAt: session.updatedAt.toISOString(),
      }))}
      users={activeUsers.map((activeUser) => ({
        id: activeUser.id,
        name: activeUser.name,
        email: activeUser.email,
        phone: activeUser.phone,
        joinedDate: dateValue(activeUser.createdAt),
      }))}
      permissions={permissionList.map((permission) => ({
        id: permission.id,
        userId: permission.userId,
        userName: permission.user.name,
        userEmail: permission.user.email,
        type: permission.type,
        startDate: formatDate(permission.startDate),
        startDateValue: dateValue(permission.startDate),
        endDate: formatDate(permission.endDate),
        endDateValue: dateValue(permission.endDate),
        reason: permission.reason,
        status: permission.status,
        approvedByName: permission.approver?.name ?? null,
        approvedAt: permission.approvedAt ? formatDate(permission.approvedAt) : null,
        rejectionReason: permission.rejectionReason,
        createdAt: formatDate(permission.createdAt),
        createdAtValue: dateValue(permission.createdAt),
      }))}
      disciplineRecords={disciplineRecords.map((record) => ({
        id: record.id,
        userId: record.userId,
        userName: record.user.name,
        userEmail: record.user.email,
        title: record.title,
        description: record.description,
        points: record.points,
        type: record.type,
        status: record.status,
        recordedByName: record.recorder?.name ?? null,
        resolvedByName: record.resolver?.name ?? null,
        resolvedAt: record.resolvedAt ? formatDate(record.resolvedAt) : null,
        resolvedNotes: record.resolvedNotes,
        createdAt: formatDate(record.createdAt),
        createdAtValue: dateValue(record.createdAt),
      }))}
      actionPlans={actionPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        startDate: formatDate(plan.startDate),
        startDateValue: dateValue(plan.startDate),
        dueDate: formatDate(plan.dueDate),
        dueDateValue: dateValue(plan.dueDate),
        status: plan.status,
        priority: plan.priority,
        progress: plan.progress,
        createdByName: plan.creator?.name ?? "Unknown",
        createdAt: formatDate(plan.createdAt),
        tasks: plan.tasks.map((task) => ({
          id: task.id,
          taskName: task.taskName,
          activity: task.activity,
          targetMilestone: task.targetMilestone,
          estimatedBudget: Number(task.estimatedBudget),
          startDate: task.startDate ? formatDate(task.startDate) : null,
          startDateValue: task.startDate ? dateValue(task.startDate) : "",
          deadline: task.deadline ? formatDate(task.deadline) : null,
          deadlineValue: task.deadline ? dateValue(task.deadline) : "",
          priority: task.priority,
          progress: task.progress,
          status: task.status,
        })),
      }))}
    />
  );
}
