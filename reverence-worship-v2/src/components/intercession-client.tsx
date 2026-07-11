"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  EyeOff,
  FileText,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import {
  deleteSpiritualForm,
  toggleSpiritualFormPublish,
} from "@/app/admin/intercession/actions";

type Question = {
  type: string;
  label: string;
  required: boolean;
  options: string[];
};

type SpiritualForm = {
  id: number;
  title: string;
  description: string | null;
  questions: Question[];
  questionCount: number;
  isPublished: boolean;
  limitOneResponse: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  submissionsCount: number;
  hasSubmitted: boolean;
};

type FormSubmission = {
  id: number;
  formId: number;
  formTitle: string;
  formDescription: string | null;
  questionCount: number;
  submittedAt: string;
  score: number | null;
};

type ReportRow = {
  id: number;
  name: string;
  email: string;
  submissions: Array<{
    formId: number;
    score: number | null;
    submittedAt: string;
  }>;
  submitted: number;
  totalForms: number;
  participation: number;
  averageScore: number | null;
  latestSubmittedAt: string | null;
  status: string;
};

type Section = "available" | "results" | "manage" | "reports";

export function IntercessionClient({
  forms,
  mySubmissions,
  reportRows,
}: {
  forms: SpiritualForm[];
  mySubmissions: FormSubmission[];
  reportRows: ReportRow[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("forms");
  const [section, setSection] = useState<Section>("available");
  const [query, setQuery] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [selectedReportFormIds, setSelectedReportFormIds] = useState<number[]>([]);
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const publishedForms = forms.filter((form) => form.isPublished && form.isActive);
  const filteredForms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return forms;
    return forms.filter((form) =>
      [form.title, form.description, form.createdBy].filter(Boolean).some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [forms, query]);

  const reportDisplayRows = useMemo(() => {
    if (selectedReportFormIds.length === 0) return [];

    const selectedSet = new Set(selectedReportFormIds);

    return reportRows.map((row) => {
      const selectedSubmissions = row.submissions.filter((submission) => selectedSet.has(submission.formId));
      const submittedFormCount = new Set(selectedSubmissions.map((submission) => submission.formId)).size;
      const scores = selectedSubmissions.map((submission) => submission.score).filter((score): score is number => typeof score === "number");
      const latestSubmittedAt = selectedSubmissions
        .map((submission) => submission.submittedAt)
        .sort()
        .reverse()[0] ?? null;
      const participation = selectedReportFormIds.length ? Math.round((submittedFormCount / selectedReportFormIds.length) * 1000) / 10 : 0;
      return {
        ...row,
        submitted: submittedFormCount,
        totalForms: selectedReportFormIds.length,
        participation,
        averageScore: scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : null,
        latestSubmittedAt,
        status: submittedFormCount === 0 ? "Not Started" : submittedFormCount === selectedReportFormIds.length ? "Complete" : "Partial",
      };
    });
  }, [reportRows, selectedReportFormIds]);

  const filteredReportRows = useMemo(() => {
    const normalized = reportSearch.trim().toLowerCase();
    return reportDisplayRows.filter((row) => {
      const matchesStatus = reportStatus === "all" || row.status === reportStatus;
      const matchesSearch = !normalized || [row.name, row.email].some((value) => value.toLowerCase().includes(normalized));
      const matchesFrom = !reportDateFrom || (row.latestSubmittedAt !== null && row.latestSubmittedAt >= reportDateFrom);
      const matchesTo = !reportDateTo || (row.latestSubmittedAt !== null && row.latestSubmittedAt <= reportDateTo);

      if (row.status === "Not Started" && (reportDateFrom || reportDateTo)) {
        return matchesStatus && matchesSearch && false;
      }

      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });
  }, [reportDisplayRows, reportSearch, reportStatus, reportDateFrom, reportDateTo]);

  const reportSummary = useMemo(() => {
    return {
      total: filteredReportRows.length,
      complete: filteredReportRows.filter((row) => row.status === "Complete").length,
      partial: filteredReportRows.filter((row) => row.status === "Partial").length,
      notStarted: filteredReportRows.filter((row) => row.status === "Not Started").length,
    };
  }, [filteredReportRows]);

  function runAction(action: () => Promise<{ ok: boolean; message: string }>, close?: () => void) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (result.ok) {
        close?.();
        router.refresh();
      }
    });
  }

  async function shareForm(formId: number) {
    const url = `${window.location.origin}/admin/intercession/forms/${formId}/take`;
    await navigator.clipboard.writeText(url);
    setMessage("Form link copied.");
  }

  function resetReportFilters() {
    setReportSearch("");
    setReportStatus("all");
    setSelectedReportFormIds([]);
    setReportDateFrom("");
    setReportDateTo("");
  }

  function exportReportCsv() {
    const header = ["Name", "Email", "Submitted", "Total Forms", "Participation", "Points", "Status", "Latest Submitted"];
    const rows = filteredReportRows.map((row) => [
      row.name,
      row.email,
      String(row.submitted),
      String(row.totalForms),
      `${row.participation}%`,
      row.averageScore === null ? "" : `${row.averageScore}%`,
      row.status,
      row.latestSubmittedAt ?? "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "intercession-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const tabs = [
    { id: "forms", label: "Forms", icon: FileText },
    { id: "actions", label: "Action Plans", icon: ListChecks },
    { id: "bible", label: "Read Bible", icon: BookOpen },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-2 py-3 sm:px-4 sm:py-5 lg:px-6">
      <div className="border-b border-gray-200">
        <nav className="flex gap-5 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 py-2 text-sm font-medium transition ${
                  selected ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab !== "forms" ? (
        <div className="rounded-xl bg-white p-10 text-center shadow-md">
          <BookOpen className="mx-auto mb-3 size-10 text-gray-300" aria-hidden="true" />
          <h2 className="text-lg font-bold text-gray-900">{activeTab === "actions" ? "Action Plans" : "Read Bible"}</h2>
          <p className="mt-1 text-sm text-gray-500">We will build this tab next.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white p-4 shadow-md sm:p-6">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 sm:inline-grid sm:w-auto sm:grid-cols-4">
              {[
                { id: "available" as const, label: "Available", icon: ClipboardList },
                { id: "results" as const, label: "My Results", icon: CheckCircle2 },
                { id: "manage" as const, label: "Manage", icon: SlidersHorizontal },
                { id: "reports" as const, label: "Reports", icon: BarChart3 },
              ].map((item) => {
                const Icon = item.icon;
                const selected = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      selected ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-white"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <Link
              href="/admin/intercession/forms/create"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus className="size-4" aria-hidden="true" />
              Create Form
            </Link>
          </div>

          {message && <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">{message}</div>}

          {section === "available" && (
            <section>
              <h2 className="mb-4 text-lg font-bold text-gray-900">Available Forms</h2>
              <div className="space-y-3">
                {publishedForms.length ? (
                  publishedForms.map((form) => (
                    <Link
                      key={form.id}
                      href={`/admin/intercession/forms/${form.id}/take`}
                      className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-200 hover:shadow-md sm:p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-800 sm:text-lg">{form.title}</h3>
                            {form.hasSubmitted && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Completed</span>
                            )}
                            {form.limitOneResponse && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Limit 1</span>
                            )}
                          </div>
                          {form.description && <p className="mt-1 text-sm text-gray-500">{form.description}</p>}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span className="rounded-full bg-gray-100 px-2 py-1">{form.createdAt}</span>
                            <span className="rounded-full bg-gray-100 px-2 py-1">{form.submissionsCount} response(s)</span>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-blue-700">{form.questionCount} questions</span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <EmptyState title="No forms available" />
                )}
              </div>
            </section>
          )}

          {section === "results" && (
            <section>
              <h2 className="mb-4 text-lg font-bold text-gray-900">My Results</h2>
              <div className="space-y-3">
                {mySubmissions.length ? (
                  mySubmissions.map((submission) => (
                    <div key={submission.id} className="rounded-xl border border-gray-200 p-4 sm:p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{submission.formTitle}</h3>
                          {submission.formDescription && <p className="mt-1 text-sm text-gray-500">{submission.formDescription}</p>}
                          <p className="mt-2 text-xs font-medium text-gray-400">Submitted {submission.submittedAt}</p>
                        </div>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          {submission.score === null ? "Submitted" : `${submission.score} pts`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No results yet" />
                )}
              </div>
            </section>
          )}

          {section === "manage" && (
            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-gray-900">Manage Forms</h2>
                <label className="relative block sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Search forms..."
                  />
                </label>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Form</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Responses</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredForms.map((form) => (
                      <tr key={form.id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{form.title}</div>
                          <div className="text-xs text-gray-500">{form.questionCount} questions · by {form.createdBy}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              form.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {form.isPublished ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{form.submissionsCount}</td>
                        <td className="px-4 py-3 text-gray-600">{form.createdAt}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <IconButton label={form.isPublished ? "Unpublish" : "Publish"} onClick={() => runAction(() => toggleSpiritualFormPublish(form.id))}>
                              {form.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </IconButton>
                            <Link
                              href={`/admin/intercession/forms/${form.id}/edit`}
                              aria-label="Edit"
                              title="Edit"
                              className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                            >
                              <Pencil className="size-4" />
                            </Link>
                            <IconButton label="Share" onClick={() => shareForm(form.id)}>
                              <Share2 className="size-4" />
                            </IconButton>
                            <Link
                              href={`/admin/intercession/forms/${form.id}/submissions`}
                              aria-label="Submissions"
                              title="Submissions"
                              className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-purple-600 transition hover:bg-purple-50"
                            >
                              <Users className="size-4" />
                            </Link>
                            <IconButton label="Delete" danger onClick={() => runAction(() => deleteSpiritualForm(form.id))}>
                              <Trash2 className="size-4" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {section === "reports" && (
            <section className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-gray-900">Reports</h2>
                <div className="text-sm text-gray-500">Participation across published forms</div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Select Forms</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReportFormIds(publishedForms.map((form) => form.id))}
                        className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedReportFormIds([])}
                        className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {publishedForms.length ? (
                      publishedForms.map((form) => (
                        <label key={form.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-blue-50">
                          <input
                            type="checkbox"
                            checked={selectedReportFormIds.includes(form.id)}
                            onChange={(event) => {
                              setSelectedReportFormIds((current) =>
                                event.target.checked ? [...current, form.id] : current.filter((id) => id !== form.id),
                              );
                            }}
                            className="mt-0.5 size-4 rounded border-gray-300 text-blue-600"
                          />
                          <span>
                            <span className="block font-medium text-gray-800">{form.title}</span>
                            <span className="text-xs text-gray-400">{form.submissionsCount} response(s)</span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No published forms available.</p>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {selectedReportFormIds.length === 0
                      ? "No form ticked, no users shown."
                      : `${selectedReportFormIds.length} form(s) selected.`}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_1.2fr_auto_auto]">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">From</label>
                    <input
                      type="date"
                      value={reportDateFrom}
                      onChange={(event) => setReportDateFrom(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">To</label>
                    <input
                      type="date"
                      value={reportDateTo}
                      onChange={(event) => setReportDateTo(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
                    <select
                      value={reportStatus}
                      onChange={(event) => setReportStatus(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="all">All statuses</option>
                      <option value="Complete">Complete</option>
                      <option value="Partial">Partial</option>
                      <option value="Not Started">Not Started</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Search user</label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                      <input
                        type="search"
                        value={reportSearch}
                        onChange={(event) => setReportSearch(event.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={resetReportFilters}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                    >
                      <RotateCcw className="size-4" aria-hidden="true" />
                      Reset
                    </button>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={exportReportCsv}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                      <Download className="size-4" aria-hidden="true" />
                      Export
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Showing <strong>{filteredReportRows.length}</strong> member(s)
                  {selectedReportFormIds.length > 0 ? (
                    <>
                      {" "}
                      for <strong>{selectedReportFormIds.length}</strong> selected form(s)
                    </>
                  ) : null}
                  {reportDateFrom || reportDateTo ? (
                    <>
                      {" "}
                      between <strong>{reportDateFrom || "start"}</strong> and <strong>{reportDateTo || "today"}</strong>
                    </>
                  ) : null}
                  .
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <ReportCard label="All Members" value={reportSummary.total} tone="blue" />
                <ReportCard label="100% Participation" value={reportSummary.complete} tone="green" />
                <ReportCard label="Partial Participation" value={reportSummary.partial} tone="amber" />
                <ReportCard label="0% Participation" value={reportSummary.notStarted} tone="red" />
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3 text-center">Submitted</th>
                      <th className="px-4 py-3 text-center">Participation</th>
                      <th className="px-4 py-3 text-center">Points</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredReportRows.length ? (
                      filteredReportRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{row.name}</div>
                            <div className="text-xs text-gray-400">{row.email}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-gray-700">
                            {row.submitted}/{row.totalForms}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-blue-600">{row.participation}%</td>
                          <td className="px-4 py-3 text-center font-medium text-purple-600">{row.averageScore === null ? "-" : `${row.averageScore}%`}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                row.status === "Complete"
                                  ? "bg-green-100 text-green-700"
                                  : row.status === "Partial"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                          No report data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
      <FileText className="mx-auto mb-3 size-10 text-gray-300" aria-hidden="true" />
      <p className="text-sm font-medium text-gray-500">{title}</p>
    </div>
  );
}

function ReportCard({ label, value, tone }: { label: string; value: number; tone: "blue" | "green" | "amber" | "red" }) {
  const styles = {
    blue: "border-blue-200 bg-blue-50 text-blue-600",
    green: "border-green-200 bg-green-50 text-green-600",
    amber: "border-amber-200 bg-amber-50 text-amber-600",
    red: "border-red-200 bg-red-50 text-red-600",
  };

  return (
    <div className={`rounded-xl border p-3 ${styles[tone]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex size-9 items-center justify-center rounded-lg border transition ${
        danger ? "border-red-100 text-red-600 hover:bg-red-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}
