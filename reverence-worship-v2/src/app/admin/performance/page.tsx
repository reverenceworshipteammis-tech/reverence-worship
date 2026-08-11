import { PerformanceClient, type PerformanceType } from "@/components/performance-client";
import { requirePageAccess } from "@/lib/auth";
import { hasSuperAdminRole } from "@/lib/system-account-rules";
import { getPerformanceDateRange } from "@/lib/performance-date-range";
import { getUserPerformanceData } from "@/lib/user-performance";
import { redirect } from "next/navigation";

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

function performanceType(value: string | undefined): PerformanceType {
  if (value === "attendance" || value === "communication" || value === "contribution") return value;
  return "discipline";
}

export default async function PerformancePage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; type?: string }> }) {
  const user = await requirePageAccess("performance");
  if (hasSuperAdminRole(user.roles.map(({ role }) => role.name))) redirect("/admin/dashboard");
  const params = await searchParams;
  const year = new Date().getFullYear();
  const range = getPerformanceDateRange(year, params.from, params.to);
  const { disciplineRecords, attendanceRecords, payments, metrics } = await getUserPerformanceData(user.id, year, { from: range.fromDate, to: range.toDate, label: range.label });

  return (
    <PerformanceClient
      key={range.label}
      year={year}
      fromDate={range.from}
      toDate={range.to}
      rangeLabel={range.label}
      initialType={performanceType(params.type)}
      metrics={metrics}
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
