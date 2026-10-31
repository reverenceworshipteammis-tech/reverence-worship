"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Download } from "lucide-react";
import type { CommitmentReportRow } from "@/lib/membership-commitment-service";
import { deleteMembershipCommitment } from "@/app/admin/intercession/actions";
import { useAppDialog } from "@/components/app-dialog-provider";
import { ActionNotice } from "@/components/action-notice";

export function commitmentDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kigali", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function CommitmentReports({ year, years, rows, canExport, canDelete = false, heading }: { heading?: ReactNode; year: number; years: number[]; rows: CommitmentReportRow[]; canExport: boolean; canDelete?: boolean }) {
  const router = useRouter();
  const { confirm } = useAppDialog();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  async function deleteRecord(row: CommitmentReportRow) {
    const commitmentId = row.commitmentId;
    if (!commitmentId || pending) return;
    const confirmed = await confirm({
      title: "Delete commitment record",
      message: `Permanently delete ${row.name}'s accepted commitment for ${row.year}? The linked form submission and any uploaded files will also be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete permanently",
      tone: "danger",
    });
    if (!confirmed) return;
    startTransition(async () => {
      try {
        const result = await deleteMembershipCommitment(commitmentId);
        setNotice(result);
        if (result.ok) router.refresh();
      } catch {
        setNotice({ ok: false, message: "The commitment record could not be deleted. Please try again." });
      }
    });
  }
  const filtered = rows.filter((row) => (!query.trim() || row.name.toLowerCase().includes(query.trim().toLowerCase())) && (status === "all" || row.status.toLowerCase() === status));
  const accepted = rows.filter((row) => row.status === "Accepted").length;
  const percentage = rows.length ? Math.round(accepted / rows.length * 1000) / 10 : 0;
  const exportQuery = new URLSearchParams({ year: String(year), q: query.trim(), status });
  return <div className="space-y-5">
    <div className="z-20 space-y-4 bg-white pb-4 lg:sticky lg:top-[var(--admin-header-height,72px)] lg:space-y-5">
      {heading}
    <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
      <label className="flex w-full items-center justify-between gap-3 text-sm font-semibold text-slate-700 sm:w-auto sm:shrink-0 sm:justify-start">Commitment year<select className="rounded-lg border border-slate-300 bg-white px-4 py-2" value={year} onChange={(event) => router.push(`/admin/forms/commitments?year=${event.target.value}`)}>{years.length ? years.map((item) => <option key={item} value={item}>{item}</option>) : <option value={year}>{year}</option>}</select></label>
    <div className="grid w-full min-w-0 grid-cols-3 gap-1.5 sm:gap-2 xl:w-auto xl:flex-1">{[{ label: "Expected members", shortLabel: "Expected", value: rows.length }, { label: "Completed", shortLabel: "Completed", value: `${accepted} (${percentage}%)` }, { label: "Pending commitment", shortLabel: "Pending", value: rows.length - accepted }].map((item) => <div key={item.label} className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-3 sm:py-2"><p className="min-h-6 text-[10px] leading-3.5 text-slate-500 sm:min-h-8 sm:text-[11px] sm:leading-4"><span className="sm:hidden">{item.shortLabel}</span><span className="hidden sm:inline">{item.label}</span></p><p className="shrink-0 text-sm font-bold leading-tight text-slate-900 sm:text-lg">{item.value}</p></div>)}</div>
      <div className="flex w-full shrink-0 gap-2 sm:w-auto sm:flex-wrap">{canExport ? <><a href={`/admin/forms/commitments/export?${exportQuery}&format=xlsx`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold sm:flex-none"><Download className="size-4" />Excel</a><a href={`/admin/forms/commitments/export?${exportQuery}&format=pdf`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold sm:flex-none"><Download className="size-4" />PDF</a></> : null}</div>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"><input aria-label="Search commitment members" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members…" className="w-full min-w-48 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /><select aria-label="Commitment status" value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:w-auto"><option value="all">All commitments</option><option value="accepted">Accepted</option><option value="pending">Pending</option></select></div>
    </div>
    {notice ? <ActionNotice message={notice.message} tone={notice.ok ? "success" : "error"} onClose={() => setNotice(null)} /> : null}
    <div className="space-y-3 sm:hidden">
      {filtered.map((row) => <article key={row.commitmentId ? `commitment-${row.commitmentId}` : `member-${row.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-sm font-bold text-slate-900">{row.name}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{year}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${row.status === "Accepted" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{row.status}</span>
        </div>
        {row.status === "Accepted" ? <dl className="mt-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Date submitted</dt><dd className="text-right font-medium text-slate-700">{row.acceptedAt ? commitmentDate(row.acceptedAt) : "—"}</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Profile changes</dt><dd className="text-right font-medium text-slate-700">{row.changes ? `${row.changes} updated` : "—"}</dd></div>
        </dl> : null}
        {row.commitmentId ? <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
          <Link href={`/admin/forms/commitments/${row.commitmentId}`} className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700">View record</Link>
          {canDelete ? <button type="button" disabled={pending} onClick={() => void deleteRecord(row)} className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 disabled:opacity-50">Delete</button> : null}
        </div> : null}
      </article>)}
      {!filtered.length ? <p className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">{years.length ? "No members match these filters." : "Create and publish an Annual commitment form to begin."}</p> : null}
    </div>
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white sm:block"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Member", "Year", "Commitment status", "Date submitted", "Profile changes", "Record"].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((row) => <tr key={row.commitmentId ? `commitment-${row.commitmentId}` : `member-${row.id}`}><td className="p-4 font-semibold">{row.name}</td><td className="p-4">{year}</td><td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.status === "Accepted" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{row.status}</span></td><td className="p-4">{row.acceptedAt ? commitmentDate(row.acceptedAt) : "—"}</td><td className="p-4">{row.changes ? `${row.changes} updated` : "—"}</td><td className="p-4"><span className="flex flex-wrap items-center gap-3">{row.commitmentId ? <Link href={`/admin/forms/commitments/${row.commitmentId}`} className="font-semibold text-blue-700">View</Link> : "—"}{canDelete && row.commitmentId ? <button type="button" disabled={pending} onClick={() => void deleteRecord(row)} className="font-semibold text-red-700 hover:underline disabled:opacity-50">Delete</button> : null}</span></td></tr>)}{!filtered.length ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">{years.length ? "No members match these filters." : "Create and publish an Annual commitment form to begin."}</td></tr> : null}</tbody></table></div>
  </div>;
}
