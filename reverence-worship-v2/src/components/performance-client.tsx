"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { PerformanceMetrics } from "@/lib/user-performance";

type PerformanceType = "discipline" | "attendance" | "communication" | "contribution";

type PerformanceRecords = {
  discipline: Array<{ id: number; date: string; title: string; description: string | null; type: string; points: number; status: string }>;
  attendance: Array<{ id: number; date: string; session: string; status: string; onTime: boolean; lateMinutes: number; communicated: boolean; notes: string | null }>;
  contribution: Array<{ id: number; date: string; amount: number; term: number | null; method: string | null; status: string; reference: string | null }>;
};

const cardMeta: Array<{ type: PerformanceType; title: string; accent: string; hover: string }> = [
  { type: "discipline", title: "Discipline Performance", accent: "#10b981", hover: "hover:border-emerald-300" },
  { type: "attendance", title: "Attendance Performance", accent: "#10b981", hover: "hover:border-emerald-300" },
  { type: "communication", title: "Communication Performance", accent: "#3b82f6", hover: "hover:border-blue-300" },
  { type: "contribution", title: "Contribution Progress", accent: "#f97316", hover: "hover:border-orange-300" },
];

function rwf(value: number) {
  return `RWF ${Math.round(value).toLocaleString()}`;
}

function titleFor(type: PerformanceType) {
  return cardMeta.find((item) => item.type === type)?.title ?? "Performance Details";
}

function typeClass(value: string) {
  return value === "positive" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700";
}

export function PerformanceClient({ year, fromDate, toDate, rangeLabel, metrics, records }: { year: number; fromDate: string; toDate: string; rangeLabel: string; metrics: PerformanceMetrics; records: PerformanceRecords }) {
  const [activeType, setActiveType] = useState<PerformanceType>("discipline");
  const [requestedPage, setRequestedPage] = useState(1);
  const contributionBalance = Math.max(0, metrics.contribution.expected - metrics.contribution.paid);
  const recordsPerPage = 5;
  const totalRecords = recordCount(activeType, records);
  const totalPages = Math.max(1, Math.ceil(totalRecords / recordsPerPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const firstRecordIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRecords = {
    discipline: records.discipline.slice(firstRecordIndex, firstRecordIndex + recordsPerPage),
    attendance: records.attendance.slice(firstRecordIndex, firstRecordIndex + recordsPerPage),
    contribution: records.contribution.slice(firstRecordIndex, firstRecordIndex + recordsPerPage),
  };

  function selectPerformanceType(type: PerformanceType) {
    setActiveType(type);
    setRequestedPage(1);
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-5 lg:px-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Performance</h1>

        </div>
        <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">From</span>
            <input name="from" type="date" min={`${year}-01-01`} max={`${year}-12-31`} defaultValue={fromDate} className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600">To</span>
            <input name="to" type="date" min={`${year}-01-01`} max={`${year}-12-31`} defaultValue={toDate} className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <button type="submit" className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-700">Apply</button>
        </form>
      </div>

      <PerformanceSummaryCards metrics={metrics} activeType={activeType} onSelect={selectPerformanceType} />

      <div className="mt-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{titleFor(activeType)}</h2>
          <p className="text-sm text-gray-500">Your personal records for {rangeLabel}.</p>
        </div>
      </div>

      {activeType === "contribution" && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Summary label="Expected" value={rwf(metrics.contribution.expected)} className="text-gray-900" />
          <Summary label="Paid" value={rwf(metrics.contribution.paid)} className="text-emerald-600" />
          <Summary label="Remaining" value={rwf(contributionBalance)} className="text-orange-600" />
        </div>
      )}

      <section className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
          <h2 className="font-bold text-gray-900">{activeType === "contribution" ? "Payment history" : "Detailed records"}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{totalRecords} records</p>
        </div>
        <div className="overflow-x-auto">
          {activeType === "discipline" && <DisciplineTable records={paginatedRecords.discipline} rangeLabel={rangeLabel} />}
          {activeType === "attendance" && <AttendanceTable records={paginatedRecords.attendance} rangeLabel={rangeLabel} />}
          {activeType === "communication" && <CommunicationTable records={paginatedRecords.attendance} rangeLabel={rangeLabel} />}
          {activeType === "contribution" && <ContributionTable records={paginatedRecords.contribution} rangeLabel={rangeLabel} />}
        </div>
        {totalRecords > recordsPerPage ? (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:px-5">
            <p className="text-xs text-gray-500">Showing {firstRecordIndex + 1}–{Math.min(firstRecordIndex + recordsPerPage, totalRecords)} of {totalRecords} records</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={currentPage === 1} onClick={() => setRequestedPage(currentPage - 1)} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
              <span className="min-w-20 text-center text-xs font-medium text-gray-600">Page {currentPage} of {totalPages}</span>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setRequestedPage(currentPage + 1)} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function PerformanceSummaryCards({
  metrics,
  activeType,
  onSelect,
  detailsHref = "/admin/performance",
}: {
  metrics: PerformanceMetrics;
  activeType?: PerformanceType;
  onSelect?: (type: PerformanceType) => void;
  detailsHref?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cardMeta.map((card) => {
        const className = `min-h-[200px] rounded-xl border bg-white p-5 text-left shadow-sm transition hover:shadow-md ${card.hover} ${activeType === card.type ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"}`;
        const content = (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{card.title}</h2>
              <ChevronRight className="size-4 text-gray-300" aria-hidden />
            </div>
            <div className="mt-6 flex items-center gap-4">
              <div className="size-20 shrink-0 rounded-full p-[6px]" style={{ background: `conic-gradient(${card.accent} ${metrics[card.type].rate}%, #e5e7eb 0)` }}>
                <div className="flex size-full items-center justify-center rounded-full bg-white text-xl font-bold">{metrics[card.type].rate}%</div>
              </div>
              <CardText type={card.type} metrics={metrics} />
            </div>
          </>
        );

        return onSelect ? (
          <button key={card.type} type="button" onClick={() => onSelect(card.type)} className={className}>
            {content}
          </button>
        ) : (
          <Link key={card.type} href={detailsHref} className={className}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

function CardText({ type, metrics }: { type: PerformanceType; metrics: PerformanceMetrics }) {
  if (type === "discipline") {
    return <div className="text-sm"><p className="font-semibold text-gray-600">Good Behavior Rate</p><p className="mt-1 text-gray-900">{metrics.discipline.good} good / {metrics.discipline.total} records</p><p className="mt-1 text-xs text-gray-500">{metrics.discipline.period ?? `Year ${metrics.discipline.year}`}</p></div>;
  }
  if (type === "attendance") {
    return <div className="text-sm"><p className="font-semibold text-gray-600">Attendance Rate</p><p className="mt-1 text-gray-900">{metrics.attendance.present} attended / {metrics.attendance.total} sessions</p><p className="mt-1 text-xs text-gray-500">{metrics.attendance.period}</p></div>;
  }
  if (type === "communication") {
    return <div className="text-sm"><p className="font-semibold text-gray-600">Communication Rate</p><p className="mt-1 text-gray-900">{metrics.communication.communicated} communicated / {metrics.communication.total} sessions</p><p className="mt-1 text-xs text-gray-500">{metrics.communication.period}</p></div>;
  }
  return <div className="text-sm"><p className="font-semibold text-gray-600">Contribution Rate</p><p className="mt-1 text-gray-900">{rwf(metrics.contribution.paid)} / {rwf(metrics.contribution.expected)}</p><p className="mt-1 text-xs text-gray-500">{metrics.contribution.period ?? `Year ${metrics.contribution.year}`}</p></div>;
}

function Summary({ label, value, className }: { label: string; value: string; className: string }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-xs text-gray-500">{label}</p><p className={`mt-1 text-lg font-bold ${className}`}>{value}</p></div>;
}

function recordCount(type: PerformanceType, records: PerformanceRecords) {
  if (type === "discipline") return records.discipline.length;
  if (type === "contribution") return records.contribution.length;
  return records.attendance.length;
}

function DisciplineTable({ records, rangeLabel }: { records: PerformanceRecords["discipline"]; rangeLabel: string }) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50"><tr className="text-left text-xs uppercase text-gray-500"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Status</th></tr></thead>
      <tbody className="divide-y divide-gray-100">
        {records.map((record) => <tr key={record.id} className="text-sm"><td className="whitespace-nowrap px-4 py-3 text-gray-500">{record.date}</td><td className="px-4 py-3"><p className="font-medium text-gray-900">{record.title}</p>{record.description && <p className="mt-1 text-xs text-gray-500">{record.description}</p>}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs capitalize ${typeClass(record.type)}`}>{record.type}</span></td><td className="px-4 py-3 text-gray-700">{record.points}</td><td className="px-4 py-3 text-gray-700 capitalize">{record.status}</td></tr>)}
        {records.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No discipline records for {rangeLabel}.</td></tr>}
      </tbody>
    </table>
  );
}

function AttendanceTable({ records, rangeLabel }: { records: PerformanceRecords["attendance"]; rangeLabel: string }) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50"><tr className="text-left text-xs uppercase text-gray-500"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Session</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">On time</th><th className="px-4 py-3">Late minutes</th></tr></thead>
      <tbody className="divide-y divide-gray-100">
        {records.map((record) => <tr key={record.id} className="text-sm"><td className="whitespace-nowrap px-4 py-3 text-gray-500">{record.date}</td><td className="px-4 py-3 font-medium text-gray-900">{record.session}</td><td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs capitalize text-gray-700">{record.status}</span></td><td className="px-4 py-3 text-gray-700">{record.onTime ? "Yes" : "No"}</td><td className="px-4 py-3 text-gray-700">{record.lateMinutes}</td></tr>)}
        {records.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No attendance records for {rangeLabel}.</td></tr>}
      </tbody>
    </table>
  );
}

function CommunicationTable({ records, rangeLabel }: { records: PerformanceRecords["attendance"]; rangeLabel: string }) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50"><tr className="text-left text-xs uppercase text-gray-500"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Session</th><th className="px-4 py-3">Attendance</th><th className="px-4 py-3">Communicated</th><th className="px-4 py-3">Notes</th></tr></thead>
      <tbody className="divide-y divide-gray-100">
        {records.map((record) => <tr key={record.id} className="text-sm"><td className="whitespace-nowrap px-4 py-3 text-gray-500">{record.date}</td><td className="px-4 py-3 font-medium text-gray-900">{record.session}</td><td className="px-4 py-3 capitalize text-gray-700">{record.status}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${record.communicated ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{record.communicated ? "Yes" : "No"}</span></td><td className="px-4 py-3 text-gray-500">{record.notes || "-"}</td></tr>)}
        {records.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No communication records for {rangeLabel}.</td></tr>}
      </tbody>
    </table>
  );
}

function ContributionTable({ records, rangeLabel }: { records: PerformanceRecords["contribution"]; rangeLabel: string }) {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50"><tr className="text-left text-xs uppercase text-gray-500"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Term</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Reference</th></tr></thead>
      <tbody className="divide-y divide-gray-100">
        {records.map((record) => <tr key={record.id} className="text-sm"><td className="whitespace-nowrap px-4 py-3 text-gray-500">{record.date}</td><td className="px-4 py-3 font-semibold text-gray-900">{rwf(record.amount)}</td><td className="px-4 py-3 text-gray-700">{record.term || "-"}</td><td className="px-4 py-3 text-gray-700">{record.method || "-"}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs capitalize text-emerald-700">{record.status}</span></td><td className="px-4 py-3 text-gray-500">{record.reference || "-"}</td></tr>)}
        {records.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No payments recorded for {rangeLabel}.</td></tr>}
      </tbody>
    </table>
  );
}
