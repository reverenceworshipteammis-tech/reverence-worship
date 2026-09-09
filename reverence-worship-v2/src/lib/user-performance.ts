import { withDatabaseRetry } from "@/lib/database-retry";
import { calculateContributionRate } from "@/lib/finance-rules";
import { prisma } from "@/lib/prisma";
import { databaseDate, kigaliDateKey, kigaliDayBounds } from "@/lib/calendar-date";

export type PerformanceMetrics = {
  discipline: { rate: number; good: number; total: number; year: number; period?: string };
  attendance: { rate: number; present: number; total: number; period: string; year: number };
  communication: { rate: number; communicated: number; total: number; period: string; year: number };
  contribution: { rate: number; paid: number; expected: number; year: number; period?: string };
};

type PerformanceRange = { from: Date; to: Date; databaseFrom?: Date; databaseTo?: Date; label: string };

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
  const yearStart = range?.from ?? kigaliDayBounds(`${year}-01-01`).start;
  const yearEnd = range?.to ?? kigaliDayBounds(`${year}-12-31`).end;
  const databaseYearStart = range?.databaseFrom ?? databaseDate(`${year}-01-01`);
  const databaseYearEnd = range?.databaseTo ?? databaseDate(`${year}-12-31`);
  const latestCompletedProbation = await prisma.probation.findFirst({
    where: { userId, state: "completed", decisionDate: { not: null, lte: yearEnd } },
    orderBy: { decisionDate: "desc" },
    select: { decisionDate: true },
  });
  const membershipPerformanceStart = latestCompletedProbation?.decisionDate
    ? kigaliDayBounds(kigaliDateKey(latestCompletedProbation.decisionDate)).start
    : yearStart;
  const attendanceAndDisciplineStart = membershipPerformanceStart > yearStart ? membershipPerformanceStart : yearStart;
  const membershipDatabaseStart = latestCompletedProbation?.decisionDate
    ? databaseDate(kigaliDateKey(latestCompletedProbation.decisionDate))
    : databaseYearStart;
  const attendanceDatabaseStart = membershipDatabaseStart > databaseYearStart ? membershipDatabaseStart : databaseYearStart;

  const [disciplineRecords, attendanceRecords, contribution, payments] = await withDatabaseRetry(() => Promise.all([
    prisma.disciplineRecord.findMany({
      where: { userId, createdAt: { gte: attendanceAndDisciplineStart, lte: yearEnd } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendanceRecord.findMany({
      where: { userId, sessionDate: { gte: attendanceDatabaseStart, lte: databaseYearEnd } },
      orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.contribution.findUnique({ where: { userId_year: { userId, year } } }),
    prisma.payment.findMany({
      where: { userId, year, status: { not: "voided" }, paymentDate: { gte: databaseYearStart, lte: databaseYearEnd } },
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
      rate: calculateContributionRate(paidContribution, expectedContribution),
      paid: paidContribution,
      expected: expectedContribution,
      year,
      period: range?.label,
    },
  };

  return { disciplineRecords, attendanceRecords, payments, metrics };
}
