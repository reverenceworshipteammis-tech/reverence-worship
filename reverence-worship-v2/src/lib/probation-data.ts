import "server-only";

import { withDatabaseRetry } from "@/lib/database-retry";
import { prisma } from "@/lib/prisma";
import { databaseDate, databaseDateKey, kigaliDateKey, kigaliDayBounds } from "@/lib/calendar-date";
import { calculateProbationRates, calendarDaysRemaining, probationAttentionReasons } from "@/lib/probation-rules";

export type ProbationMonitoring = {
  attendance: {
    total: number;
    present: number;
    absent: number;
    onTime: number;
    late: number;
    rate: number;
  };
  communication: {
    total: number;
    communicated: number;
    uncommunicated: number;
    rate: number;
  };
  discipline: {
    total: number;
    positive: number;
    negative: number;
    unresolved: number;
    rate: number;
  };
  permissions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  };
  needsAttention: boolean;
  attentionReasons: string[];
};

type ProbationWindow = {
  userId: number;
  originalStartDate: Date;
  decisionDate?: Date | null;
};

type AttendanceMonitoringRecord = {
  sessionDate: Date;
  status: string;
  communicated: boolean;
  onTime: boolean;
  lateMinutes: number;
};

type DisciplineMonitoringRecord = {
  type: string | null;
  status: string;
};

type PermissionMonitoringRecord = {
  status: string;
  startDate: Date;
  endDate: Date;
};

function summarizeProbationMonitoring(
  attendanceRecords: AttendanceMonitoringRecord[],
  disciplineRecords: DisciplineMonitoringRecord[],
  permissionRequests: PermissionMonitoringRecord[],
): ProbationMonitoring {
  const approvedPermissions = permissionRequests.filter((request) => request.status === "approved");
  const evaluatedAttendance = attendanceRecords.filter((record) => {
    if (record.status.toLowerCase() === "excused") return false;
    if (record.status.toLowerCase() === "present") return true;
    return !approvedPermissions.some((permission) =>
      permission.startDate <= record.sessionDate && permission.endDate >= record.sessionDate,
    );
  });
  const present = evaluatedAttendance.filter((record) => record.status.toLowerCase() === "present");
  const absent = evaluatedAttendance.filter((record) => record.status.toLowerCase() !== "present");
  const communicated = evaluatedAttendance.filter((record) => record.communicated);
  const positive = disciplineRecords.filter((record) => record.type?.toLowerCase() === "positive");
  const negative = disciplineRecords.filter((record) => record.type?.toLowerCase() !== "positive");
  const unresolved = negative.filter((record) => !["resolved", "closed"].includes(record.status.toLowerCase()));

  const rates = calculateProbationRates({
    present: present.length,
    attendanceTotal: evaluatedAttendance.length,
    communicated: communicated.length,
    disciplinePositive: positive.length,
    disciplineTotal: disciplineRecords.length,
  });
  const attentionReasons = probationAttentionReasons({
    attendanceRate: rates.attendance,
    communicationRate: rates.communication,
    disciplineRate: rates.discipline,
    unresolvedDiscipline: unresolved.length,
  });

  return {
    attendance: {
      total: evaluatedAttendance.length,
      present: present.length,
      absent: absent.length,
      onTime: present.filter((record) => record.onTime).length,
      late: present.filter((record) => !record.onTime || record.lateMinutes > 0).length,
      rate: rates.attendance,
    },
    communication: {
      total: evaluatedAttendance.length,
      communicated: communicated.length,
      uncommunicated: evaluatedAttendance.length - communicated.length,
      rate: rates.communication,
    },
    discipline: {
      total: disciplineRecords.length,
      positive: positive.length,
      negative: negative.length,
      unresolved: unresolved.length,
      rate: rates.discipline,
    },
    permissions: {
      total: permissionRequests.length,
      pending: permissionRequests.filter((request) => request.status === "pending").length,
      approved: permissionRequests.filter((request) => request.status === "approved").length,
      rejected: permissionRequests.filter((request) => request.status === "rejected").length,
      cancelled: permissionRequests.filter((request) => request.status === "cancelled").length,
    },
    needsAttention: attentionReasons.length > 0,
    attentionReasons,
  };
}

export async function getProbationMonitoring(probation: ProbationWindow): Promise<ProbationMonitoring> {
  const endDate = probation.decisionDate ?? new Date();
  const startKey = databaseDateKey(probation.originalStartDate);
  const timestampStart = kigaliDayBounds(startKey).start;
  const attendanceEnd = databaseDate(kigaliDateKey(endDate));
  const [attendanceRecords, disciplineRecords, permissionRequests] = await withDatabaseRetry(() => Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        userId: probation.userId,
        sessionDate: { gte: databaseDate(startKey), lte: attendanceEnd },
      },
      select: { sessionDate: true, status: true, communicated: true, onTime: true, lateMinutes: true },
    }),
    prisma.disciplineRecord.findMany({
      where: {
        userId: probation.userId,
        createdAt: { gte: timestampStart, lte: endDate },
      },
      select: { type: true, status: true },
    }),
    prisma.permissionRequest.findMany({
      where: {
        userId: probation.userId,
        createdAt: { gte: timestampStart, lte: endDate },
      },
      select: { status: true, startDate: true, endDate: true },
    }),
  ]), 5);

  return summarizeProbationMonitoring(attendanceRecords, disciplineRecords, permissionRequests);
}

export async function getProbationMonitoringBatch(
  probations: Array<ProbationWindow & { id: number }>,
): Promise<Map<number, ProbationMonitoring>> {
  if (probations.length === 0) return new Map();

  const now = new Date();
  const [attendanceRecords, disciplineRecords, permissionRequests] = await withDatabaseRetry(() => Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        OR: probations.map((probation) => ({
          userId: probation.userId,
          sessionDate: {
            gte: databaseDate(databaseDateKey(probation.originalStartDate)),
            lte: databaseDate(kigaliDateKey(probation.decisionDate ?? now)),
          },
        })),
      },
      select: { userId: true, sessionDate: true, status: true, communicated: true, onTime: true, lateMinutes: true },
    }),
    prisma.disciplineRecord.findMany({
      where: {
        OR: probations.map((probation) => ({
          userId: probation.userId,
          createdAt: { gte: kigaliDayBounds(databaseDateKey(probation.originalStartDate)).start, lte: probation.decisionDate ?? now },
        })),
      },
      select: { userId: true, createdAt: true, type: true, status: true },
    }),
    prisma.permissionRequest.findMany({
      where: {
        OR: probations.map((probation) => ({
          userId: probation.userId,
          createdAt: { gte: kigaliDayBounds(databaseDateKey(probation.originalStartDate)).start, lte: probation.decisionDate ?? now },
        })),
      },
      select: { userId: true, createdAt: true, status: true, startDate: true, endDate: true },
    }),
  ]), 5);

  return new Map(probations.map((probation) => {
    const endDate = probation.decisionDate ?? now;
    const timestampStart = kigaliDayBounds(databaseDateKey(probation.originalStartDate)).start;
    const inTimestampWindow = (date: Date) => date >= timestampStart && date <= endDate;
    const startKey = databaseDateKey(probation.originalStartDate);
    const endKey = kigaliDateKey(endDate);
    const inAttendanceWindow = (date: Date) => {
      const key = databaseDateKey(date);
      return key >= startKey && key <= endKey;
    };
    return [
      probation.id,
      summarizeProbationMonitoring(
        attendanceRecords.filter((record) => record.userId === probation.userId && inAttendanceWindow(record.sessionDate)),
        disciplineRecords.filter((record) => record.userId === probation.userId && inTimestampWindow(record.createdAt)),
        permissionRequests.filter((request) => request.userId === probation.userId && inTimestampWindow(request.createdAt)),
      ),
    ];
  }));
}

export function probationDateSummary(currentExpectedEndDate: Date, now = new Date()) {
  const daysRemaining = calendarDaysRemaining(currentExpectedEndDate, now);
  return {
    daysRemaining,
    isOverdue: daysRemaining < 0,
    dueWithin14Days: daysRemaining >= 0 && daysRemaining <= 14,
  };
}
