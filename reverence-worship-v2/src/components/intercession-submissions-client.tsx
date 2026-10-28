"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, BarChart3, CalendarDays, CheckCircle2, ChevronRight, FileSpreadsheet, FileText, RotateCcw, Search, UserCheck, Users, X, XCircle, type LucideIcon } from "lucide-react";
import { bulkUpdateFormSubmissions, permanentlyDeleteFormSubmission, restoreFormSubmission, saveSubmissionManualReview, setAllSubmissionRelease, setSubmissionRelease } from "@/app/admin/intercession/actions";
import { useAppDialog } from "@/components/app-dialog-provider";
import { ActionNotice } from "@/components/action-notice";
import { FormActionsSheet } from "@/components/form-actions-sheet";
import { IntercessionRichText } from "@/components/intercession-rich-text";
import { IntercessionQuestionImages } from "@/components/intercession-question-images";
import { IntercessionResponseSummaryCard, type IntercessionChartSelection } from "@/components/intercession-response-charts";
import { type ResponseManagementForm } from "@/components/intercession-response-management";
import { intercessionRichTextToPlainText } from "@/lib/intercession-rich-text";
import { buildIntercessionResponseSummaries, type IntercessionAnalyticsQuestion, type IntercessionResponseValue } from "@/lib/intercession-response-summary";
import type { IntercessionQuestionImage } from "@/lib/intercession-question-images";
import { formatIntercessionMarks, type IntercessionVisitorDetail } from "@/lib/intercession-form-domain";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";

type SubmissionRow = {
  id: number;
  memberName: string;
  isCommitment: boolean;
  respondentType: "Member" | "Guest";
  visitorDetails: IntercessionVisitorDetail[];
  submittedAt: string;
  submittedAtIso: string;
  submittedDate: string;
  submittedTime: string;
  score: number | null;
  earnedPoints: number | null;
  totalPoints: number;
  isReleased: boolean;
  releasedAt: string | null;
  reviewedAt: string | null;
  deletedAt: string | null;
  formVersion: number;
  completionSeconds: number | null;
  answers: Array<{
    questionId: string;
    questionIndex: number;
    question: string;
    type: string;
    points: number;
    images: IntercessionQuestionImage[];
    answer: string;
    responseValue: IntercessionResponseValue;
    correct: boolean | null;
    earnedPoints: number | null;
  }>;
};

type SubmissionSortField = "responder" | "type" | "submitted" | "marks";
type SubmissionFilter = "name" | "date" | "question" | "answer" | "category" | "review" | "storage";
export function IntercessionSubmissionsClient({
  form,
  submissions,
}: {
  form: ResponseManagementForm & { version: number; title: string; description: string | null; isQuiz: boolean; releaseGrade: string; canDeleteSubmissions: boolean; canGradeSubmissions: boolean; includeTimestamps: boolean; exportQuestions: Array<{ questionId: string; questionIndex: number; question: string }>; analyticsQuestions: IntercessionAnalyticsQuestion[] };
  submissions: SubmissionRow[];
}) {
  const { confirm } = useAppDialog();
  const [activeView, setActiveView] = useState<"summary" | "manage">("summary");
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<number>>(() => new Set());
  const [mobileSelectionMode, setMobileSelectionMode] = useState(false);
  const [actionsSubmissionId, setActionsSubmissionId] = useState<number | null>(null);
  const [filterBy, setFilterBy] = useState<SubmissionFilter>("name");
  const filterMenuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function closeOnOutsideInteraction(event: Event) {
      const menu = filterMenuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    document.addEventListener("focusin", closeOnOutsideInteraction);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
      document.removeEventListener("focusin", closeOnOutsideInteraction);
    };
  }, []);
  const [query, setQuery] = useState("");
  const [respondentFilter, setRespondentFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [deletionFilter, setDeletionFilter] = useState("active");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [questionFilter, setQuestionFilter] = useState("");
  const [answerFilter, setAnswerFilter] = useState("");
  const [sortField, setSortField] = useState<SubmissionSortField>("submitted");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [reviewSubmission, setReviewSubmission] = useState<SubmissionRow | null>(null);
  const [answerDrilldown, setAnswerDrilldown] = useState<IntercessionChartSelection | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const actionInFlight = useRef(false);

  const activeSubmissions = useMemo(() => submissions.filter((submission) => !submission.deletedAt), [submissions]);
  const responseSummaries = useMemo(() => buildIntercessionResponseSummaries(
    form.analyticsQuestions,
    activeSubmissions.map((submission) => ({
      answers: submission.answers.map((answer) => ({ questionId: answer.questionId, questionIndex: answer.questionIndex, value: answer.responseValue })),
    })),
  ), [activeSubmissions, form.analyticsQuestions]);
  const filteredSubmissions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return submissions.filter((submission) => {
      const matchesName = filterBy !== "name" || !normalized || submission.memberName.toLowerCase().includes(normalized);
      const matchesRespondent = filterBy !== "category" || respondentFilter === "all" || submission.respondentType.toLowerCase() === respondentFilter;
      const matchesReview = filterBy !== "review" || reviewFilter === "all" || reviewFilter === "reviewed" && Boolean(submission.reviewedAt) || reviewFilter === "pending" && !submission.reviewedAt;
      const matchesDeleted = filterBy === "storage"
        ? deletionFilter === "all" || deletionFilter === "trash" && Boolean(submission.deletedAt) || deletionFilter === "active" && !submission.deletedAt
        : !submission.deletedAt;
      const submittedTime = new Date(submission.submittedAtIso).getTime();
      const matchesDate = filterBy !== "date" || (!dateFrom || submittedTime >= new Date(`${dateFrom}T00:00:00+02:00`).getTime()) && (!dateTo || submittedTime <= new Date(`${dateTo}T23:59:59.999+02:00`).getTime());
      const questionAnswer = questionFilter ? submission.answers.find((answer) => answer.questionId === questionFilter)?.answer ?? "" : "";
      const matchesQuestion = filterBy !== "question" || !questionFilter || Boolean(questionAnswer.trim());
      const matchesAnswer = filterBy !== "answer" || !answerFilter.trim() || submission.answers.some((answer) => answer.answer.toLowerCase().includes(answerFilter.trim().toLowerCase()));
      return matchesName && matchesRespondent && matchesReview && matchesDeleted && matchesDate && matchesQuestion && matchesAnswer;
    }).sort((first, second) => {
      let comparison = 0;
      if (sortField === "responder") comparison = first.memberName.localeCompare(second.memberName, undefined, { sensitivity: "base" });
      if (sortField === "type") comparison = first.respondentType.localeCompare(second.respondentType, undefined, { sensitivity: "base" });
      if (sortField === "submitted") comparison = new Date(first.submittedAtIso).getTime() - new Date(second.submittedAtIso).getTime();
      if (sortField === "marks") comparison = (first.score ?? -1) - (second.score ?? -1);
      return (comparison || first.id - second.id) * (sortDirection === "asc" ? 1 : -1);
    });
  }, [submissions, filterBy, query, respondentFilter, reviewFilter, deletionFilter, dateFrom, dateTo, questionFilter, answerFilter, sortField, sortDirection]);

  const averageScore = useMemo(() => {
    const scored = activeSubmissions.map((submission) => submission.score).filter((score): score is number => typeof score === "number");
    if (scored.length === 0) return 0;
    return Math.round((scored.reduce((sum, score) => sum + score, 0) / scored.length) * 10) / 10;
  }, [activeSubmissions]);

  function resetFilters() {
    setFilterBy("name");
    setQuery("");
    setRespondentFilter("all");
    setReviewFilter("all");
    setDeletionFilter("active");
    setDateFrom("");
    setDateTo("");
    setQuestionFilter("");
    setAnswerFilter("");
    setSortField("submitted");
    setSortDirection("desc");
  }

  function changeSort(field: SubmissionSortField) {
    if (sortField === field) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortField(field);
    setSortDirection(field === "submitted" ? "desc" : "asc");
  }

  function runSubmissionAction(action: () => Promise<{ ok: boolean; message: string }>) {
    if (actionInFlight.current) return;
    actionInFlight.current = true;
    startTransition(async () => {
      try {
      const result = await action();
      setNotice(result);
      if (result.ok) setSelectedSubmissionIds(new Set());
      } catch { setNotice({ ok: false, message: "The action could not be completed. Please try again." }); }
      finally { actionInFlight.current = false; }
    });
  }

  const pendingReleaseCount = activeSubmissions.filter((submission) => submission.score !== null && !submission.isReleased).length;
  const releasedCount = activeSubmissions.filter((submission) => submission.isReleased).length;
  const exportSearch = new URLSearchParams({ status: filterBy === "storage" ? deletionFilter : "active" });
  if (filterBy === "name" && query.trim()) exportSearch.set("name", query.trim());
  if (filterBy === "category" && respondentFilter !== "all") exportSearch.set("type", respondentFilter);
  if (filterBy === "review" && reviewFilter !== "all") exportSearch.set("review", reviewFilter);
  if (filterBy === "question" && questionFilter) exportSearch.set("question", questionFilter);
  if (filterBy === "answer" && answerFilter.trim()) exportSearch.set("answer", answerFilter.trim());
  if (filterBy === "date" && dateFrom) exportSearch.set("from", dateFrom);
  if (filterBy === "date" && dateTo) exportSearch.set("to", dateTo);
  if (selectedSubmissionIds.size) exportSearch.set("ids", [...selectedSubmissionIds].join(","));

  return (
    <div className="mx-auto max-w-7xl px-0 pt-2 pb-28 sm:px-4 sm:py-6">
      {pending && <p role="status" className="fixed bottom-24 left-1/2 z-[160] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">Saving changes…</p>}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {notice ? (
          <ActionNotice message={notice.message} tone={notice.ok ? "success" : "error"} onClose={() => setNotice(null)} className="m-4" />
        ) : null}
        <div className="rounded-t-2xl bg-white lg:sticky lg:top-[var(--admin-header-height,72px)] lg:z-20">
        <div className="rounded-t-2xl border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-3">
            <div className="contents">
              <Link href="/admin/forms?section=manage" className="order-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back
              </Link>
              <h1 className="order-3 col-span-2 break-words text-base font-semibold leading-snug text-slate-900 sm:text-2xl"><IntercessionRichText value={form.title} /></h1>
            </div>
            <span className="order-2 inline-flex w-fit items-center gap-1.5 justify-self-end rounded-full bg-slate-100 px-2 py-1.5 text-[11px] font-medium text-slate-600 sm:px-3 sm:text-sm">
              <Users className="size-4" aria-hidden="true" />
              {activeSubmissions.length} Responses
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-slate-200 bg-white px-2 sm:px-5">
        <nav className="flex w-full justify-around overflow-x-auto sm:w-auto sm:justify-start" role="tablist" aria-label="Response views">
          <ResponseViewTab active={activeView === "summary"} icon={BarChart3} label="Summary" onClick={() => setActiveView("summary")} />
          <ResponseViewTab active={activeView === "manage"} icon={FileSpreadsheet} label="Manage" onClick={() => setActiveView("manage")} />
        </nav>

        {form.isQuiz ? (
          <div className="grid w-full grid-cols-2 gap-2 py-3 sm:w-auto">
            <StatCard label="Total Submissions" value={activeSubmissions.length} tone="blue" />
            <StatCard label="Average Score" value={`${averageScore}%`} tone="green" />
          </div>
        ) : null}
        </div>

        </div>

        {activeView === "summary" ? (
          <div className="space-y-3 rounded-b-2xl bg-slate-50 p-2 sm:space-y-4 sm:p-5">
            {responseSummaries.length ? responseSummaries.map((summary) => (
              <IntercessionResponseSummaryCard key={summary.questionId} summary={summary} fullExcelHref={form.allowExport ? `/admin/forms/${form.id}/submissions/export` : undefined} onSeriesSelect={setAnswerDrilldown} />
            )) : <ResponseAnalyticsEmpty />}
          </div>
        ) : (
        <>
        <div className="border-b border-slate-200 bg-slate-50 p-3 sm:p-4">
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 md:grid-cols-[180px_minmax(220px,1fr)_auto] md:gap-3">
            <div className="min-w-0 text-xs font-semibold text-slate-600">
              <span id="submission-filter-label">Filter by</span>
              <details ref={filterMenuRef} className="group mt-1 rounded-lg border border-slate-300 bg-white" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
                <summary aria-labelledby="submission-filter-label submission-filter-value" className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-1 rounded-lg px-2 py-2 text-xs font-normal text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3 sm:text-sm [&::-webkit-details-marker]:hidden">
                  <span id="submission-filter-value">{({ name: "Name", date: "Date", question: "Question", answer: "Answer", category: "User category", review: "Review status", storage: "Storage" })[filterBy]}</span>
                  <ArrowDown className="size-4 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  {([["name", "Name"], ["date", "Date"], ["question", "Question"], ["answer", "Answer"], ["category", "User category (guest or member)"], ["review", "Review status"], ["storage", "Storage"]] as const).map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={filterBy === value} onClick={(event) => { setFilterBy(value); const dropdown = event.currentTarget.closest("details"); if (dropdown) { dropdown.open = false; dropdown.querySelector("summary")?.focus(); } }} className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${filterBy === value ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}>
                      <span className="min-w-0 break-words">{label}</span>
                      {filterBy === value && <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </details>
            </div>
            <div className="order-last col-span-2 min-w-0 md:order-none md:col-span-1 [&_input]:min-w-0 [&_select]:min-w-0 [&_label]:min-w-0">
            {filterBy === "name" ? (
              <div className="relative">
                <label htmlFor="submission-name-filter" className="mb-1 block text-xs font-semibold text-slate-600">Name</label>
                <Search className="pointer-events-none absolute left-3 top-[2.35rem] size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="submission-name-filter" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search respondent name" className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            ) : null}
            {filterBy === "date" ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-slate-600">From date<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900" /></label>
                <label className="text-xs font-semibold text-slate-600">To date<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900" /></label>
              </div>
            ) : null}
            {filterBy === "question" ? (
              <label className="text-xs font-semibold text-slate-600">Question
                <select value={questionFilter} onChange={(event) => setQuestionFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900">
                  <option value="">Any question</option>
                  {form.analyticsQuestions.map((question, index) => <option key={question.questionId} value={question.questionId}>{index + 1}. {intercessionRichTextToPlainText(question.label).replace(/\s+/g, " ").trim()}</option>)}
                </select>
              </label>
            ) : null}
            {filterBy === "answer" ? (
              <label className="text-xs font-semibold text-slate-600">Answer contains<input value={answerFilter} onChange={(event) => setAnswerFilter(event.target.value)} placeholder="Search answers" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900" /></label>
            ) : null}
            {filterBy === "category" ? <FilterSelect label="User category" value={respondentFilter} onChange={setRespondentFilter} options={[["all", "Members and guests"], ["member", "Members"], ["guest", "Guests"]]} /> : null}
            {filterBy === "review" ? <FilterSelect label="Review status" value={reviewFilter} onChange={setReviewFilter} options={[["all", "All review statuses"], ["reviewed", "Reviewed"], ["pending", "Awaiting review"]]} /> : null}
            {filterBy === "storage" ? <FilterSelect label="Storage" value={deletionFilter} onChange={setDeletionFilter} options={[["active", "Active responses"], ["trash", "Trash"], ["all", "Active and trash"]]} /> : null}
            </div>
            <div className="flex items-end justify-end gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 sm:gap-2 sm:px-4 sm:text-sm"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </button>
              {form.allowExport && submissions.length > 0 ? <a href={`/admin/forms/${form.id}/submissions/export?${exportSearch.toString()}`} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 sm:gap-2 sm:px-4 sm:text-sm"><FileSpreadsheet className="size-4" aria-hidden="true" />Excel</a> : null}
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Showing {filteredSubmissions.length} of {submissions.length} submissions
          </div>
        </div>

        {selectedSubmissionIds.size ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-3 text-xs"><strong className="mr-2 text-blue-800">{selectedSubmissionIds.size} selected</strong>{form.canGradeSubmissions ? <><BulkButton label="Mark reviewed" onClick={() => runSubmissionAction(() => bulkUpdateFormSubmissions(form.id, [...selectedSubmissionIds], "reviewed"))} /><BulkButton label="Release" onClick={() => runSubmissionAction(() => bulkUpdateFormSubmissions(form.id, [...selectedSubmissionIds], "release"))} /><BulkButton label="Hide" onClick={() => runSubmissionAction(() => bulkUpdateFormSubmissions(form.id, [...selectedSubmissionIds], "hide"))} /></> : null}{form.canDeleteSubmissions ? deletionFilter === "trash" ? <BulkButton label="Restore" onClick={() => runSubmissionAction(() => bulkUpdateFormSubmissions(form.id, [...selectedSubmissionIds], "restore"))} /> : <BulkButton label="Move to trash" tone="danger" onClick={() => runSubmissionAction(() => bulkUpdateFormSubmissions(form.id, [...selectedSubmissionIds], "trash"))} /> : null}<button type="button" onClick={() => setSelectedSubmissionIds(new Set())} className="ml-auto font-semibold text-slate-600 hover:underline">Clear selection</button></div>
        ) : null}

        {form.releaseGrade === "later" && form.canGradeSubmissions ? (
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="text-sm text-slate-600">
              {pendingReleaseCount > 0 ? (
                <span><strong className="text-amber-700">{pendingReleaseCount}</strong> awaiting release</span>
              ) : (
                <span className="text-green-700">All reviewed submissions are released</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingReleaseCount > 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => runSubmissionAction(() => setAllSubmissionRelease(form.id, true))}
                  className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                >
                  Release pending
                </button>
              ) : null}
              {releasedCount > 0 ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => runSubmissionAction(() => setAllSubmissionRelease(form.id, false))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Hide released
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-3 bg-slate-50 p-3 md:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex min-w-0 items-center gap-2 text-xs text-slate-500">Sort by
              <select value={sortField} onChange={(event) => setSortField(event.target.value as SubmissionSortField)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700">
                <option value="submitted">Date</option><option value="responder">Name</option><option value="type">User type</option>{form.isQuiz && <option value="marks">Marks</option>}
              </select>
              <button type="button" aria-label={sortDirection === "asc" ? "Sort descending" : "Sort ascending"} onClick={() => setSortDirection((current) => current === "asc" ? "desc" : "asc")} className="flex size-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">{sortDirection === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}</button>
            </label>
            <button type="button" aria-pressed={mobileSelectionMode} onClick={() => { setMobileSelectionMode(!mobileSelectionMode); setSelectedSubmissionIds(new Set()); }} className="min-h-11 rounded-lg px-2 text-xs font-semibold text-slate-600">{mobileSelectionMode ? "Done" : "Select"}</button>
          </div>
          {mobileSelectionMode && <label className="flex min-h-11 items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={filteredSubmissions.length > 0 && filteredSubmissions.every((submission) => selectedSubmissionIds.has(submission.id))} onChange={(event) => { const checked = event.target.checked; setSelectedSubmissionIds((current) => { const next = new Set(current); filteredSubmissions.forEach((submission) => checked ? next.add(submission.id) : next.delete(submission.id)); return next; }); }} className="size-4" />Select all visible responses</label>}
          {filteredSubmissions.map((submission) => (
            <article key={submission.id} className="relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <button type="button" disabled={pending} aria-haspopup={mobileSelectionMode ? undefined : "dialog"} aria-label={mobileSelectionMode ? `Select ${submission.memberName}` : `Actions for response from ${submission.memberName}`} onClick={() => { if (mobileSelectionMode) { setSelectedSubmissionIds((current) => { const next = new Set(current); if (next.has(submission.id)) next.delete(submission.id); else next.add(submission.id); return next; }); } else setActionsSubmissionId(submission.id); }} className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
              <div className="pointer-events-none relative flex items-start gap-2">
                {mobileSelectionMode && <input type="checkbox" checked={selectedSubmissionIds.has(submission.id)} readOnly tabIndex={-1} aria-hidden="true" className="mt-1 size-4 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-medium text-slate-900">{submission.memberName}</h3>
                </div>
                <ChevronRight className="mt-1 size-4 shrink-0 text-slate-400" aria-hidden="true" />
              </div>
              <div className="pointer-events-none relative mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-slate-500">
                {form.isQuiz && <p>{submission.earnedPoints === null ? <span className="text-amber-700">Awaiting review</span> : <span>Marks <strong className="font-semibold text-slate-800">{formatIntercessionMarks(submission.earnedPoints)} / {formatIntercessionMarks(submission.totalPoints)}</strong></span>}</p>}
                <p className="ml-auto flex items-start gap-1.5 text-[11px]"><CalendarDays className="size-3.5 shrink-0" aria-hidden="true" /><span>{submission.submittedDate}, {submission.submittedTime}</span></p>
                {submission.deletedAt && <p className="w-full text-red-700">In trash</p>}
              </div>
              <FormActionsSheet title={submission.memberName} open={actionsSubmissionId === submission.id} onClose={() => setActionsSubmissionId(null)}>
                <button type="button" disabled={pending} onClick={() => setReviewSubmission(submission)} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 text-left text-sm text-slate-700"><UserCheck className="size-4" aria-hidden="true" />Review response</button>
                {form.canGradeSubmissions && form.releaseGrade === "later" && submission.score !== null && <button type="button" disabled={pending} onClick={() => runSubmissionAction(() => setSubmissionRelease(submission.id, !submission.isReleased))} className="min-h-11 rounded-lg bg-slate-50 px-3 text-xs font-medium text-slate-700 disabled:opacity-50">{submission.isReleased ? "Hide grade" : "Release grade"}</button>}
                {form.canDeleteSubmissions && submission.deletedAt && <><button type="button" disabled={pending} onClick={() => runSubmissionAction(() => restoreFormSubmission(submission.id))} className="min-h-11 rounded-lg px-3 text-xs text-emerald-700 disabled:opacity-50">Restore</button><button type="button" disabled={pending} onClick={async () => { if (await confirm({ title: "Permanently delete submission", message: `Permanently delete ${submission.memberName}'s submission and uploaded files?${submission.isCommitment ? " This will also permanently delete the accepted commitment record." : ""} This cannot be undone.`, confirmLabel: "Delete permanently", tone: "danger" })) runSubmissionAction(() => permanentlyDeleteFormSubmission(submission.id)); }} className="min-h-11 rounded-lg px-3 text-xs text-red-700 disabled:opacity-50">Delete forever</button></>}
              </FormActionsSheet>
            </article>
          ))}
          {!filteredSubmissions.length && <p className="py-8 text-center text-sm text-slate-500">No responses match these filters.</p>}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all visible submissions" checked={filteredSubmissions.length > 0 && filteredSubmissions.every((submission) => selectedSubmissionIds.has(submission.id))} onChange={(event) => setSelectedSubmissionIds((current) => { const next = new Set(current); filteredSubmissions.forEach((submission) => event.target.checked ? next.add(submission.id) : next.delete(submission.id)); return next; })} className="size-4 rounded border-slate-300 text-blue-600" /></th>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3" aria-sort={sortField === "responder" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortHeader label="Responder" active={sortField === "responder"} direction={sortDirection} onClick={() => changeSort("responder")} /></th>
                <th className="w-24 px-4 py-3" aria-sort={sortField === "type" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortHeader label="Type" active={sortField === "type"} direction={sortDirection} onClick={() => changeSort("type")} /></th>
                {form.isQuiz ? <th className="px-4 py-3" aria-sort={sortField === "marks" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortHeader label="Marks" active={sortField === "marks"} direction={sortDirection} onClick={() => changeSort("marks")} /></th> : null}
                <th className="px-4 py-3" aria-sort={sortField === "submitted" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortHeader label="Submitted" active={sortField === "submitted"} direction={sortDirection} onClick={() => changeSort("submitted")} /></th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredSubmissions.length ? (
                filteredSubmissions.map((submission, index) => (
                  <tr key={submission.id} className={submission.deletedAt ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-slate-50"}>
                    <td className="px-4 py-2.5"><input type="checkbox" aria-label={`Select ${submission.memberName}`} checked={selectedSubmissionIds.has(submission.id)} onChange={(event) => setSelectedSubmissionIds((current) => { const next = new Set(current); if (event.target.checked) next.add(submission.id); else next.delete(submission.id); return next; })} className="size-4 rounded border-slate-300 text-blue-600" /></td>
                    <td className="px-4 py-2.5 text-gray-400">{index + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-medium text-white">
                          {initials(submission.memberName)}
                        </div>
                        <div className="font-medium text-gray-800">{submission.memberName}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${submission.respondentType === "Guest" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{submission.respondentType}</span></td>
                    {form.isQuiz ? (
                      <td className="px-4 py-3">
                        {submission.earnedPoints === null ? (
                          <span className="text-xs text-amber-600">Awaiting review</span>
                        ) : (
                          <>
                            <span className="font-semibold text-slate-800">{formatIntercessionMarks(submission.earnedPoints)}</span>
                            <span className="text-sm text-slate-400"> / {formatIntercessionMarks(submission.totalPoints)}</span>
                          </>
                        )}
                      </td>
                    ) : null}
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 text-gray-400" aria-hidden="true" />
                        <span>{submission.submittedDate}, {submission.submittedTime}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setReviewSubmission(submission)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          <UserCheck className="size-3.5" aria-hidden="true" />
                          Review
                        </button>
                        {submission.deletedAt ? <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold uppercase text-red-700">In trash</span> : null}
                        {form.canGradeSubmissions && form.releaseGrade === "later" && submission.score !== null ? (
                          submission.isReleased ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => runSubmissionAction(() => setSubmissionRelease(submission.id, false))}
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                            >
                              Hide
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => runSubmissionAction(() => setSubmissionRelease(submission.id, true))}
                              className="rounded-lg border border-green-200 px-2.5 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-50 disabled:opacity-60"
                            >
                              Release
                            </button>
                          )
                        ) : null}
                        {form.canDeleteSubmissions && submission.deletedAt ? <><button type="button" disabled={pending} onClick={() => runSubmissionAction(() => restoreFormSubmission(submission.id))} className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">Restore</button><button type="button" disabled={pending} onClick={async () => { const commitmentWarning = submission.isCommitment ? " This will also permanently delete the accepted commitment record." : ""; if (await confirm({ title: "Permanently delete submission", message: `Permanently delete ${submission.memberName}'s submission and uploaded files?${commitmentWarning} This cannot be undone.`, confirmLabel: "Delete permanently", tone: "danger" })) runSubmissionAction(() => permanentlyDeleteFormSubmission(submission.id)); }} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Delete forever</button></> : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={form.isQuiz ? 7 : 6} className="px-4 py-12 text-center">
                    <FileText className="mx-auto mb-3 size-10 text-slate-300" aria-hidden="true" />
                    <p className="font-medium text-slate-500">No submissions yet</p>
                    <p className="text-sm text-slate-400">Be the first to submit this form</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>

      {reviewSubmission ? (
        <ReviewSubmissionModal
          form={form}
          submission={reviewSubmission}
          onClose={() => setReviewSubmission(null)}
          onSaved={(result) => {
            setNotice(result);
            if (result.ok) setReviewSubmission(null);
          }}
        />
      ) : null}
      {answerDrilldown ? <AnswerDrilldownModal selection={answerDrilldown} submissions={activeSubmissions} onClose={() => setAnswerDrilldown(null)} onOpenSubmission={(submissionId) => {
        const submission = activeSubmissions.find((item) => item.id === submissionId);
        if (submission) {
          setQuery(submission.memberName);
          setActiveView("manage");
        }
        setAnswerDrilldown(null);
      }} /> : null}
    </div>
  );
}

function ResponseViewTab({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-w-fit items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"}`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}

function SortHeader({ label, active, direction, onClick }: { label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void }) {
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition hover:bg-slate-100 hover:text-slate-800 ${active ? "text-blue-700" : "text-gray-500"}`}>{label}<Icon className="size-3.5" aria-hidden="true" /></button>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label className="text-xs font-semibold text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function BulkButton({ label, onClick, tone = "default" }: { label: string; onClick: () => void; tone?: "default" | "danger" }) {
  return <button type="button" onClick={onClick} className={`rounded-lg border px-3 py-1.5 font-semibold ${tone === "danger" ? "border-red-200 bg-white text-red-700" : "border-blue-200 bg-white text-blue-700"}`}>{label}</button>;
}

function AnswerDrilldownModal({ selection, submissions, onClose, onOpenSubmission }: { selection: IntercessionChartSelection; submissions: SubmissionRow[]; onClose: () => void; onOpenSubmission: (submissionId: number) => void }) {
  const dialogRef = useDialogFocusTrap<HTMLDivElement>(true, onClose);
  const matching = submissions.filter((submission) => submissionMatchesSelection(submission, selection));
  return (
    <div className="fixed inset-0 z-[125] overflow-y-auto bg-slate-950/50 px-3 py-6">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="answer-drilldown-title" className="mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Selected answer</p><h2 id="answer-drilldown-title" className="mt-1 text-lg font-bold text-slate-900">{selection.answerLabel}</h2>{selection.rowLabel ? <p className="mt-1 text-sm text-slate-500">{selection.rowLabel}</p> : null}<p className="mt-1 text-xs text-slate-400">{selection.questionLabel}</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X className="size-5" aria-hidden="true" /></button></header>
        <div className="max-h-[65vh] overflow-y-auto p-3"><p className="px-2 pb-2 text-sm font-semibold text-slate-600">{matching.length} {matching.length === 1 ? "respondent" : "respondents"}</p>{matching.length ? <div className="space-y-1">{matching.map((submission) => <button key={submission.id} type="button" onClick={() => onOpenSubmission(submission.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{submission.memberName}</p><p className="truncate text-xs text-slate-500">{submission.respondentType}</p></div><div className="shrink-0 text-right"><p className="text-xs font-semibold text-blue-700">View response</p><p className="mt-0.5 text-[11px] text-slate-400">{submission.submittedDate}</p></div></button>)}</div> : <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center"><Users className="mx-auto size-8 text-slate-300" aria-hidden="true" /><p className="mt-2 text-sm text-slate-500">No respondents matched this answer.</p></div>}</div>
        <footer className="flex justify-end border-t border-slate-200 px-5 py-3"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button></footer>
      </div>
    </div>
  );
}

function submissionMatchesSelection(submission: SubmissionRow, selection: IntercessionChartSelection) {
  const value = submission.answers.find((answer) => answer.questionId === selection.questionId)?.responseValue;
  if (selection.rowIndex !== undefined) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const rowValue = value[`row_${selection.rowIndex}`];
    return Array.isArray(rowValue) ? rowValue.includes(selection.answerLabel) : rowValue === selection.answerLabel;
  }
  return Array.isArray(value) ? value.includes(selection.answerLabel) : value === selection.answerLabel;
}

function ResponseAnalyticsEmpty() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
      <BarChart3 className="mx-auto size-10 text-slate-300" aria-hidden="true" />
      <p className="mt-3 font-semibold text-slate-600">No questions available for response analytics.</p>
    </div>
  );
}

function ReviewSubmissionModal({
  form,
  submission,
  onClose,
  onSaved,
}: {
  form: { title: string; isQuiz: boolean; releaseGrade: string; canGradeSubmissions: boolean };
  submission: SubmissionRow;
  onClose: () => void;
  onSaved: (result: { ok: boolean; message: string }) => void;
}) {
  const [grades, setGrades] = useState<Record<number, boolean | null>>(() =>
    Object.fromEntries(submission.answers.map((answer) => [answer.questionIndex, answer.correct])),
  );
  const [awardedPoints, setAwardedPoints] = useState<Record<number, number>>(() =>
    Object.fromEntries(submission.answers.map((answer) => [answer.questionIndex, answer.earnedPoints ?? (answer.correct ? answer.points : 0)])),
  );
  const [pending, startTransition] = useTransition();
  const dialogRef = useDialogFocusTrap<HTMLDivElement>(true, onClose);
  const manualReview = form.isQuiz && form.releaseGrade === "later" && form.canGradeSubmissions;
  const earnedTotal = submission.answers.reduce((sum, answer) => sum + (answer.points > 0 ? awardedPoints[answer.questionIndex] ?? 0 : 0), 0);

  function setGrade(questionIndex: number, correct: boolean) {
    setGrades((current) => ({ ...current, [questionIndex]: correct }));
    const answer = submission.answers.find((item) => item.questionIndex === questionIndex);
    setAwardedPoints((current) => ({ ...current, [questionIndex]: correct ? answer?.points ?? 0 : 0 }));
  }

  function saveReview() {
    const payload = submission.answers.map((answer) => ({
      questionIndex: answer.questionIndex,
      correct: grades[answer.questionIndex] === true,
      points: answer.points,
      earnedPoints: awardedPoints[answer.questionIndex] ?? 0,
    }));
    const formData = new FormData();
    formData.set("submissionId", String(submission.id));
    formData.set("grades", JSON.stringify(payload));

    startTransition(async () => {
      onSaved(await saveSubmissionManualReview(formData));
    });
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/50 px-3 py-6">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Review submission" className="mx-auto max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Review Submission</p>
            <h2 className="mt-1 truncate text-lg font-bold text-slate-900"><IntercessionRichText value={form.title} /></h2>
            <p className="mt-1 text-sm text-slate-500">
              {submission.memberName} · {submission.submittedDate} {submission.submittedTime}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {form.isQuiz ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center shadow-sm">
                <p className="text-sm font-bold tabular-nums text-blue-900">{formatIntercessionMarks(earnedTotal)}<span className="px-1 text-blue-500">/</span>{formatIntercessionMarks(submission.totalPoints)}</p>
              </div>
            ) : null}
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          {submission.visitorDetails.length ? (
            <section className="mb-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
              <h3 className="text-sm font-bold text-slate-900">Guest information</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {submission.visitorDetails.map((detail) => <div key={detail.fieldId} className="rounded-lg bg-white px-3 py-2"><dt className="text-xs font-semibold text-slate-500">{detail.label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{Array.isArray(detail.value) ? detail.value.join(", ") || "—" : detail.value || "—"}</dd></div>)}
              </dl>
            </section>
          ) : null}
          <div className="space-y-3">
            {submission.answers.length ? (
              submission.answers.map((answer, index) => (
                <article key={`${answer.question}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900"><IntercessionRichText value={answer.question} /></h3>
                    </div>
                    {form.isQuiz && answer.points > 0 ? (
                      <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {formatIntercessionMarks(answer.earnedPoints ?? 0)}/{formatIntercessionMarks(answer.points)}
                      </span>
                    ) : null}
                  </div>
                  <IntercessionQuestionImages images={answer.images} className="mt-3" />
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                    {/^https?:\/\//.test(answer.answer) || answer.answer.startsWith("/uploads/form-answers/") ? <a href={answer.answer} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline underline-offset-2">Open uploaded file</a> : answer.answer}
                  </div>
                  {manualReview && answer.points > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">Award points<input type="number" min={0} max={answer.points} step={0.01} value={awardedPoints[answer.questionIndex] ?? 0} onChange={(event) => { const value = Math.min(answer.points, Math.max(0, Number(event.target.value) || 0)); setAwardedPoints((current) => ({ ...current, [answer.questionIndex]: value })); setGrades((current) => ({ ...current, [answer.questionIndex]: value >= answer.points })); }} className="w-20 rounded border border-blue-200 bg-white px-2 py-1 text-right" /><span>/ {formatIntercessionMarks(answer.points)}</span></label>
                      <button
                        type="button"
                        onClick={() => setGrade(answer.questionIndex, true)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          grades[answer.questionIndex] === true ? "bg-green-600 text-white" : "bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Correct
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrade(answer.questionIndex, false)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          grades[answer.questionIndex] === false ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        <XCircle className="size-4" aria-hidden="true" />
                        Incorrect
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 py-10 text-center">
                <FileText className="mx-auto mb-2 size-10 text-slate-300" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-500">No answers found for this submission.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end">
          {manualReview ? (
            <button type="button" onClick={saveReview} disabled={pending} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60">
              {pending ? "Saving..." : "Save Review"}
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: "blue" | "green" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
  }[tone];

  return (
    <div className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border border-gray-100 px-2 py-2 sm:gap-3 sm:px-3 ${toneClass}`}>
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className="shrink-0 text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
