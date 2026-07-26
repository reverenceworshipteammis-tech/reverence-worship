import "server-only";

import { prisma } from "@/lib/prisma";
import { calendarDaysRemaining, percentage, probationAttentionReasons } from "@/lib/probation-rules";

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
    absences: number;
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

export async function getProbationMonitoring(probation: ProbationWindow): Promise<ProbationMonitoring> {
  const endDate = probation.decisionDate ?? new Date();
  const [attendanceRecords, disciplineRecords, permissionRequests] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        userId: probation.userId,
        sessionDate: { gte: probation.originalStartDate, lte: endDate },
      },
      select: { sessionDate: true, status: true, communicated: true, onTime: true, lateMinutes: true },
    }),
    prisma.disciplineRecord.findMany({
      where: {
        userId: probation.userId,
        createdAt: { gte: probation.originalStartDate, lte: endDate },
      },
      select: { type: true, status: true },
    }),
    prisma.permissionRequest.findMany({
      where: {
        userId: probation.userId,
        createdAt: { gte: probation.originalStartDate, lte: endDate },
      },
      select: { status: true, startDate: true, endDate: true },
    }),
  ]);

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
  const communicatedAbsences = absent.filter((record) => record.communicated);
  const positive = disciplineRecords.filter((record) => record.type?.toLowerCase() === "positive");
  const negative = disciplineRecords.filter((record) => record.type?.toLowerCase() !== "positive");
  const unresolved = negative.filter((record) => !["resolved", "closed"].includes(record.status.toLowerCase()));

  const attendanceRate = percentage(present.length, evaluatedAttendance.length);
  const communicationRate = percentage(communicatedAbsences.length, absent.length, 100);
  const disciplineRate = percentage(positive.length, disciplineRecords.length, 100);
  const attentionReasons = probationAttentionReasons({
    attendanceRate,
    communicationRate,
    disciplineRate,
    unresolvedDiscipline: unresolved.length,
  });

  return {
    attendance: {
      total: evaluatedAttendance.length,
      present: present.length,
      absent: absent.length,
      onTime: present.filter((record) => record.onTime).length,
      late: present.filter((record) => !record.onTime || record.lateMinutes > 0).length,
      rate: attendanceRate,
    },
    communication: {
      absences: absent.length,
      communicated: communicatedAbsences.length,
      uncommunicated: absent.length - communicatedAbsences.length,
      rate: communicationRate,
    },
    discipline: {
      total: disciplineRecords.length,
      positive: positive.length,
      negative: negative.length,
      unresolved: unresolved.length,
      rate: disciplineRate,
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

export function probationDateSummary(currentExpectedEndDate: Date, now = new Date()) {
  const daysRemaining = calendarDaysRemaining(currentExpectedEndDate, now);
  return {
    daysRemaining,
    isOverdue: daysRemaining < 0,
    dueWithin14Days: daysRemaining >= 0 && daysRemaining <= 14,
  };
}
