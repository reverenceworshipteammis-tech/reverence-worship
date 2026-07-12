import { PerformanceClient } from "@/components/performance-client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function money(value: unknown) {
  return Number(value ?? 0);
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatPeriod(records: Array<{ sessionDate: Date }>) {
  if (records.length === 0) return "No attendance data";

  const sorted = [...records].sort((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime());
  const start = sorted[0]?.sessionDate;
  const end = sorted[sorted.length - 1]?.sessionDate;

  if (!start || !end) return "No attendance data";

  const formatter = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export default async function PerformancePage() {
  const user = await requireUser();
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`);

  const [disciplineRecords, attendanceRecords, contribution, payments] = await Promise.all([
    prisma.disciplineRecord.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: yearStart, lte: yearEnd },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        userId: user.id,
        sessionDate: { gte: yearStart, lte: yearEnd },
      },
      orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.contribution.findUnique({
      where: { userId_year: { userId: user.id, year } },
    }),
    prisma.payment.findMany({
      where: { userId: user.id, year },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const goodBehavior = disciplineRecords.filter((record) => record.type === "positive").length;
  const presentCount = attendanceRecords.filter((record) => ["present", "late"].includes(record.status)).length;
  const communicatedCount = attendanceRecords.filter((record) => record.communicated).length;
  const expectedContribution = money(contribution?.annualAmount);
  const paidContribution = payments.reduce((sum, payment) => sum + money(payment.amount), 0);
  const attendancePeriod = formatPeriod(attendanceRecords);

  return (
    <PerformanceClient
      year={year}
      metrics={{
        discipline: {
          rate: disciplineRecords.length > 0 ? Math.round((goodBehavior / disciplineRecords.length) * 100) : 0,
          good: goodBehavior,
          total: disciplineRecords.length,
          year,
        },
        attendance: {
          rate: attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : 0,
          present: presentCount,
          total: attendanceRecords.length,
          period: attendancePeriod,
          year,
        },
        communication: {
          rate: attendanceRecords.length > 0 ? Math.round((communicatedCount / attendanceRecords.length) * 100) : 0,
          communicated: communicatedCount,
          total: attendanceRecords.length,
          period: attendancePeriod,
          year,
        },
        contribution: {
          rate: expectedContribution > 0 ? Math.min(100, Math.round((paidContribution / expectedContribution) * 100)) : 0,
          paid: paidContribution,
          expected: expectedContribution,
          year,
        },
      }}
      records={{
        discipline: disciplineRecords.map((record) => ({
          id: record.id,
          date: formatDate(record.createdAt),
          title: record.title,
          description: record.description,
          type: record.type ?? "negative",
          points: record.points,
          status: record.status,
        })),
        attendance: attendanceRecords.map((record) => ({
          id: record.id,
          date: formatDate(record.sessionDate),
          session: record.sessionType,
          status: record.status,
          onTime: record.onTime,
          lateMinutes: record.lateMinutes,
          communicated: record.communicated,
          notes: record.notes,
        })),
        contribution: payments.map((payment) => ({
          id: payment.id,
          date: formatDate(payment.paymentDate ?? payment.createdAt),
          amount: money(payment.amount),
          term: payment.term,
          method: payment.paymentMethod,
          status: payment.status ?? "recorded",
          reference: payment.referenceNumber,
        })),
      }}
    />
  );
}
