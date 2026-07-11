"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Download, FileText, Search, Users } from "lucide-react";

type SubmissionRow = {
  id: number;
  memberName: string;
  memberEmail: string;
  submittedAt: string;
  score: number | null;
  answersCount: number;
};

export function IntercessionSubmissionsClient({
  form,
  submissions,
}: {
  form: { id: number; title: string; description: string | null };
  submissions: SubmissionRow[];
}) {
  const [query, setQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");

  const filteredSubmissions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return submissions.filter((submission) => {
      const matchesSearch =
        !normalized ||
        [submission.memberName, submission.memberEmail].some((value) => value.toLowerCase().includes(normalized));
      const matchesScore =
        scoreFilter === "all" ||
        (scoreFilter === "scored" && submission.score !== null) ||
        (scoreFilter === "unscored" && submission.score === null);
      return matchesSearch && matchesScore;
    });
  }, [submissions, query, scoreFilter]);

  function exportCsv() {
    const header = ["Member", "Email", "Submitted At", "Score", "Answers"];
    const rows = filteredSubmissions.map((submission) => [
      submission.memberName,
      submission.memberEmail,
      submission.submittedAt,
      submission.score === null ? "" : String(submission.score),
      String(submission.answersCount),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `submissions-${form.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href="/admin/intercession" className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-blue-600">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to Manage Forms
              </Link>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{form.title}</h1>
              {form.description && <p className="mt-1 text-sm text-slate-500">{form.description}</p>}
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
              <Users className="size-4" aria-hidden="true" />
              {submissions.length} Responses
            </span>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_180px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search member..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <select
            value={scoreFilter}
            onChange={(event) => setScoreFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">All scores</option>
            <option value="scored">Scored</option>
            <option value="unscored">Unscored</option>
          </select>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Download className="size-4" aria-hidden="true" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-center">Answers</th>
                <th className="px-4 py-3 text-center">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSubmissions.length ? (
                filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{submission.memberName}</div>
                      <div className="text-xs text-slate-400">{submission.memberEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{submission.submittedAt}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{submission.answersCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {submission.score === null ? "Unscored" : `${submission.score}`}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <FileText className="mx-auto mb-3 size-10 text-slate-300" aria-hidden="true" />
                    <p className="font-medium text-slate-500">No submissions yet</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
