import { withDatabaseRetry } from "@/lib/database-retry";
import { prisma } from "@/lib/prisma";

export type PerformanceMetrics = {
  discipline: { rate: number; good: number; total: number; year: number; period?: string };
  attendance: { rate: number; present: number; total: number; period: string; year: number };
  communication: { rate: number; communicated: number; total: number; period: string; year: number };
  contribution: { rate: number; paid: number; expected: number; year: number; period?: string };
};

type PerformanceRange = { from: Date; to: Date; label: string };

function money(value: unknown) {
  return Number(value ?? 0);
}

function formatPeriod(records: Array<{ sessionDate: Date }>) {
  if (records.length === 0) return "No attendance data";

  const timestamps = records.map((record) => record.sessionDate.getTime());
  const start = new Date(Math.min(...timestamps));
  const end = new Date(Math.max(...timestamps));
  const formatter = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export async function getUserPerformanceData(userId: number, year: number, range?: PerformanceRange) {
  const yearStart = range?.from ?? new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = range?.to ?? new Date(`${year}-12-31T23:59:59.999Z`);

  const [disciplineRecords, attendanceRecords, contribution, payments] = await withDatabaseRetry(() => Promise.all([
    prisma.disciplineRecord.findMany({
      where: { userId, createdAt: { gte: yearStart, lte: yearEnd } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendanceRecord.findMany({
      where: { userId, sessionDate: { gte: yearStart, lte: yearEnd } },
      orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.contribution.findUnique({ where: { userId_year: { userId, year } } }),
    prisma.payment.findMany({
      where: { userId, year, paymentDate: { gte: yearStart, lte: yearEnd } },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    }),
  ]));

  const goodBehavior = disciplineRecords.filter((record) => record.type === "positive").length;
  const presentCount = attendanceRecords.filter((record) => record.status === "present").length;
  const communicatedCount = attendanceRecords.filter((record) => record.communicated).length;
  const expectedContribution = money(contribution?.annualAmount);
  const paidContribution = payments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const attendancePeriod = formatPeriod(attendanceRecords);

  const metrics: PerformanceMetrics = {
    discipline: {
      rate: disciplineRecords.length > 0 ? Math.round((goodBehavior / disciplineRecords.length) * 100) : 0,
      good: goodBehavior,
      total: disciplineRecords.length,
      year,
      period: range?.label,
    },
    attendance: {
      rate: attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : 0,
      present: presentCount,
      total: attendanceRecords.length,
      period: range?.label ?? attendancePeriod,
      year,
    },
    communication: {
      rate: attendanceRecords.length > 0 ? Math.round((communicatedCount / attendanceRecords.length) * 100) : 0,
      communicated: communicatedCount,
      total: attendanceRecords.length,
      period: range?.label ?? attendancePeriod,
      year,
    },
    contribution: {
      rate: expectedContribution > 0 ? Math.min(100, Math.round((paidContribution / expectedContribution) * 100)) : 0,
      paid: paidContribution,
      expected: expectedContribution,
      year,
      period: range?.label,
    },
  };

  return { disciplineRecords, attendanceRecords, payments, metrics };
}
