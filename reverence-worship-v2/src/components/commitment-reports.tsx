"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download } from "lucide-react";
import type { CommitmentReportRow } from "@/lib/membership-commitment-service";

export function commitmentDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kigali", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function CommitmentReports({ year, years, rows, canExport }: { year: number; years: number[]; rows: CommitmentReportRow[]; canExport: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = rows.filter((row) => (!query.trim() || row.name.toLowerCase().includes(query.trim().toLowerCase())) && (status === "all" || row.status.toLowerCase() === status));
  const accepted = rows.filter((row) => row.status === "Accepted").length;
  const percentage = rows.length ? Math.round(accepted / rows.length * 1000) / 10 : 0;
  const exportQuery = new URLSearchParams({ year: String(year), q: query.trim(), status });
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <label className="text-sm font-semibold text-slate-700">Commitment year<select className="ml-3 rounded-lg border border-slate-300 bg-white px-4 py-2" value={year} onChange={(event) => router.push(`/admin/intercession/commitments?year=${event.target.value}`)}>{years.length ? years.map((item) => <option key={item} value={item}>{item}</option>) : <option value={year}>{year}</option>}</select></label>
      <div className="flex flex-wrap gap-2">{canExport ? <><a href={`/admin/intercession/commitments/export?${exportQuery}&format=xlsx`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"><Download className="size-4" />Excel</a><a href={`/admin/intercession/commitments/export?${exportQuery}&format=pdf`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"><Download className="size-4" />PDF</a></> : null}</div>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{[{ label: "Expected members", value: rows.length }, { label: "Completed", value: `${accepted} (${percentage}%)` }, { label: "Pending commitment", value: rows.length - accepted }].map((item) => <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p></div>)}</div>
    <div className="flex flex-wrap gap-3"><input aria-label="Search commitment members" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members…" className="min-w-48 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /><select aria-label="Commitment status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="all">All commitments</option><option value="accepted">Accepted</option><option value="pending">Pending</option></select></div>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["Member", "Year", "Commitment status", "Date submitted", "Profile changes", "Record"].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((row) => <tr key={row.id}><td className="p-4 font-semibold">{row.name}</td><td className="p-4">{year}</td><td className="p-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.status === "Accepted" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{row.status}</span></td><td className="p-4">{row.acceptedAt ? commitmentDate(row.acceptedAt) : "—"}</td><td className="p-4">{row.changes ? `${row.changes} updated` : "—"}</td><td className="p-4">{row.commitmentId ? <Link href={`/admin/intercession/commitments/${row.commitmentId}`} className="font-semibold text-blue-700">View</Link> : "—"}</td></tr>)}{!filtered.length ? <tr><td colSpan={6} className="p-10 text-center text-slate-500">{years.length ? "No members match these filters." : "Create and publish an Annual commitment form to begin."}</td></tr> : null}</tbody></table></div>
  </div>;
}
