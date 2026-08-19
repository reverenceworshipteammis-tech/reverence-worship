"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, List, RotateCcw, Search, UserCheck, Users, X, XCircle, type LucideIcon } from "lucide-react";
import { bulkUpdateFormSubmissions, deleteFormSubmission, permanentlyDeleteFormSubmission, restoreFormSubmission, saveSubmissionManualReview, setAllSubmissionRelease, setSubmissionRelease } from "@/app/admin/intercession/actions";
import { useAppDialog } from "@/components/app-dialog-provider";
import { ActionNotice } from "@/components/action-notice";
import { IntercessionRichText } from "@/components/intercession-rich-text";
import { IntercessionQuestionImages } from "@/components/intercession-question-images";
import { IntercessionResponseSummaryCard, type IntercessionChartSelection } from "@/components/intercession-response-charts";
import { IntercessionResponseManagement, type ResponseManagementForm } from "@/components/intercession-response-management";
import { PrintButton } from "@/components/print-button";
import { intercessionRichTextToPlainText } from "@/lib/intercession-rich-text";
import { buildIntercessionResponseSummaries, type IntercessionAnalyticsQuestion, type IntercessionResponseValue } from "@/lib/intercession-response-summary";
import type { IntercessionQuestionImage } from "@/lib/intercession-question-images";
import type { IntercessionVisitorDetail } from "@/lib/intercession-form-domain";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";

type SubmissionRow = {
  id: number;
  memberName: string;
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

type SubmissionSortField = "responder" | "type" | "submitted";

export function IntercessionSubmissionsClient({
  form,
  submissions,
}: {
  form: ResponseManagementForm & { generatedAtIso: string; createdAtIso: string; version: number; title: string; description: string | null; isQuiz: boolean; releaseGrade: string; canDeleteSubmissions: boolean; canGradeSubmissions: boolean; includeTimestamps: boolean; exportQuestions: Array<{ questionId: string; questionIndex: number; question: string }>; analyticsQuestions: IntercessionAnalyticsQuestion[]; responseActivity: Array<{ id: number; action: string; actor: string; createdAt: string }> };
  submissions: SubmissionRow[];
}) {
  const { confirm } = useAppDialog();
  const [activeView, setActiveView] = useState<"summary" | "question" | "individual" | "manage">("summary");
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [questionSearch, setQuestionSearch] = useState("");
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<number>>(() => new Set());
  const [query, setQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [releaseFilter, setReleaseFilter] = useState("all");
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

  const activeSubmissions = useMemo(() => submissions.filter((submission) => !submission.deletedAt), [submissions]);
  const responseSummaries = useMemo(() => buildIntercessionResponseSummaries(
    form.analyticsQuestions,
    activeSubmissions.map((submission) => ({
      answers: submission.answers.map((answer) => ({ questionId: answer.questionId, questionIndex: answer.questionIndex, value: answer.responseValue })),
    })),
  ), [activeSubmissions, form.analyticsQuestions]);
  const selectedSummary = responseSummaries[selectedQuestionIndex] ?? null;
  const matchingQuestions = responseSummaries.map((summary, index) => ({ summary, index, label: intercessionRichTextToPlainText(summary.label).replace(/\s+/g, " ").trim() || "Question" })).filter((item) => !questionSearch.trim() || item.label.toLowerCase().includes(questionSearch.trim().toLowerCase()));

  const filteredSubmissions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return submissions.filter((submission) => {
      const matchesSearch =
        !normalized ||
        [submission.memberName, ...submission.visitorDetails.flatMap((detail) => Array.isArray(detail.value) ? detail.value : [detail.value]), ...submission.answers.map((answer) => answer.answer)].some((value) => value.toLowerCase().includes(normalized));
      const score = submission.score ?? 0;
      const matchesScore = !form.isQuiz || scoreFilter === "all" ||
        (scoreFilter === "high" && score >= 80) ||
        (scoreFilter === "medium" && score >= 60 && score < 80) ||
        (scoreFilter === "low" && score >= 40 && score < 60) ||
        (scoreFilter === "fail" && score < 40) ||
        (scoreFilter === "unscored" && submission.score === null);
      const matchesRelease =
        form.releaseGrade !== "later" ||
        releaseFilter === "all" ||
        (releaseFilter === "released" && submission.isReleased) ||
        (releaseFilter === "pending" && !submission.isReleased);
      const matchesRespondent = respondentFilter === "all" || submission.respondentType.toLowerCase() === respondentFilter;
      const matchesReview = reviewFilter === "all" || reviewFilter === "reviewed" && Boolean(submission.reviewedAt) || reviewFilter === "pending" && !submission.reviewedAt;
      const matchesDeleted = deletionFilter === "all" || deletionFilter === "trash" && Boolean(submission.deletedAt) || deletionFilter === "active" && !submission.deletedAt;
      const submittedTime = new Date(submission.submittedAtIso).getTime();
      const matchesDate = (!dateFrom || submittedTime >= new Date(`${dateFrom}T00:00:00+02:00`).getTime()) && (!dateTo || submittedTime <= new Date(`${dateTo}T23:59:59.999+02:00`).getTime());
      const selectedAnswer = questionFilter ? submission.answers.find((answer) => answer.questionId === questionFilter)?.answer ?? "" : submission.answers.map((answer) => answer.answer).join(" ");
      const matchesAnswer = !answerFilter.trim() || selectedAnswer.toLowerCase().includes(answerFilter.trim().toLowerCase());
      return matchesSearch && matchesScore && matchesRelease && matchesRespondent && matchesReview && matchesDeleted && matchesDate && matchesAnswer;
    }).sort((first, second) => {
      let comparison = 0;
      if (sortField === "responder") comparison = first.memberName.localeCompare(second.memberName, undefined, { sensitivity: "base" });
      if (sortField === "type") comparison = first.respondentType.localeCompare(second.respondentType, undefined, { sensitivity: "base" });
      if (sortField === "submitted") comparison = new Date(first.submittedAtIso).getTime() - new Date(second.submittedAtIso).getTime();
      return (comparison || first.id - second.id) * (sortDirection === "asc" ? 1 : -1);
    });
  }, [submissions, query, scoreFilter, releaseFilter, respondentFilter, reviewFilter, deletionFilter, dateFrom, dateTo, questionFilter, answerFilter, sortField, sortDirection, form.isQuiz, form.releaseGrade]);

  const averageScore = useMemo(() => {
    const scored = activeSubmissions.map((submission) => submission.score).filter((score): score is number => typeof score === "number");
    if (scored.length === 0) return 0;
    return Math.round((scored.reduce((sum, score) => sum + score, 0) / scored.length) * 10) / 10;
  }, [activeSubmissions]);

  function resetFilters() {
    setQuery("");
    setScoreFilter("all");
    setReleaseFilter("all");
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
    startTransition(async () => {
      const result = await action();
      setNotice(result);
      if (result.ok) setSelectedSubmissionIds(new Set());
    });
  }

  const pendingReleaseCount = activeSubmissions.filter((submission) => submission.score !== null && !submission.isReleased).length;
  const releasedCount = activeSubmissions.filter((submission) => submission.isReleased).length;
  const exportSearch = new URLSearchParams({ status: deletionFilter });
  if (query) exportSearch.set("q", query);
  if (respondentFilter !== "all") exportSearch.set("type", respondentFilter);
  if (scoreFilter !== "all") exportSearch.set("score", scoreFilter);
  if (releaseFilter !== "all") exportSearch.set("release", releaseFilter);
  if (reviewFilter !== "all") exportSearch.set("review", reviewFilter);
  if (questionFilter) exportSearch.set("question", questionFilter);
  if (answerFilter) exportSearch.set("answer", answerFilter);
  if (dateFrom) exportSearch.set("from", dateFrom);
  if (dateTo) exportSearch.set("to", dateTo);
  if (selectedSubmissionIds.size) exportSearch.set("ids", [...selectedSubmissionIds].join(","));

  function exportCsv() {
    const visitorColumns = Array.from(new Map(filteredSubmissions.flatMap((submission) => submission.visitorDetails.map((detail) => [detail.fieldId, detail.label] as const))).entries());
    const answerColumns = form.exportQuestions.map((question) => ({
      ...question,
      header: `Q${question.questionIndex + 1}: ${intercessionRichTextToPlainText(question.question).replace(/\s+/g, " ").trim()}`,
    }));
    const header = ["#", "Responder", "Type", ...visitorColumns.map(([, label]) => label), ...(form.includeTimestamps ? ["Submitted Date", "Submitted Time"] : []), ...answerColumns.map((question) => question.header), ...(form.isQuiz ? ["Marks", "Score"] : [])];
    const rows = filteredSubmissions.map((submission) => [
      String(submissions.indexOf(submission) + 1),
      submission.memberName,
      submission.respondentType,
      ...visitorColumns.map(([fieldId]) => {
        const value = submission.visitorDetails.find((detail) => detail.fieldId === fieldId)?.value;
        return Array.isArray(value) ? value.join(", ") : value ?? "";
      }),
      ...(form.includeTimestamps ? [submission.submittedDate, submission.submittedTime] : []),
      ...answerColumns.map((question) => submission.answers.find((answer) => answer.questionId === question.questionId)?.answer ?? ""),
      ...(form.isQuiz ? [submission.earnedPoints === null ? "" : `${submission.earnedPoints}/${submission.totalPoints}`, submission.score === null ? "" : `${submission.score}%`] : []),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
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
        {notice ? (
          <ActionNotice message={notice.message} tone={notice.ok ? "success" : "error"} onClose={() => setNotice(null)} className="m-4" />
        ) : null}
        <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href="/admin/intercession" className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-blue-600">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to Manage Forms
              </Link>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl"><IntercessionRichText value={form.title} /></h1>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
              <Users className="size-4" aria-hidden="true" />
              {activeSubmissions.length} Responses{submissions.length - activeSubmissions.length > 0 ? ` · ${submissions.length - activeSubmissions.length} in trash` : ""}
            </span>
          </div>
        </div>

        <IntercessionResponseManagement form={form} onNotice={setNotice} />

        <nav className="flex overflow-x-auto border-b border-slate-200 bg-white px-2 sm:px-5" role="tablist" aria-label="Response views">
          <ResponseViewTab active={activeView === "summary"} icon={BarChart3} label="Summary" onClick={() => setActiveView("summary")} />
          <ResponseViewTab active={activeView === "question"} icon={List} label="Question" onClick={() => setActiveView("question")} />
          <ResponseViewTab active={activeView === "individual"} icon={UserCheck} label="Individual" onClick={() => setActiveView("individual")} />
          <ResponseViewTab active={activeView === "manage"} icon={FileSpreadsheet} label="Manage" onClick={() => setActiveView("manage")} />
        </nav>

        {form.isQuiz ? (
          <div className="grid gap-3 border-b border-slate-200 bg-white p-4 sm:grid-cols-3">
            <StatCard label="Total Submissions" value={activeSubmissions.length} tone="blue" />
            <StatCard label="Average Score" value={`${averageScore}%`} tone="green" />
            <StatCard label="Result Mode" value={resultModeLabel(form.releaseGrade)} tone="purple" />
          </div>
        ) : null}

        {activeView === "summary" ? (
          <div className="space-y-4 bg-slate-50 p-3 sm:p-5">
            <ResponseOverview submissions={activeSubmissions} generatedAtIso={form.generatedAtIso} formCreatedAtIso={form.createdAtIso} />
            {responseSummaries.length ? responseSummaries.map((summary) => (
              <IntercessionResponseSummaryCard key={summary.questionId} summary={summary} fullExcelHref={form.allowExport ? `/admin/intercession/forms/${form.id}/submissions/export` : undefined} onSeriesSelect={setAnswerDrilldown} />
            )) : <ResponseAnalyticsEmpty />}
          </div>
        ) : activeView === "question" ? (
          <div className="bg-slate-50 p-3 sm:p-5">
            {selectedSummary ? (
              <>
                <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(180px,0.65fr)_minmax(260px,1.35fr)_auto] sm:items-end">
                  <label className="min-w-0 text-xs font-semibold text-slate-600">Search questions
                    <span className="relative mt-1 block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input type="search" value={questionSearch} onChange={(event) => setQuestionSearch(event.target.value)} placeholder="Type question text" className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></span>
                  </label>
                  <label className="min-w-0 text-xs font-semibold text-slate-600">
                    Question {selectedQuestionIndex + 1} of {responseSummaries.length}{questionSearch ? ` · ${matchingQuestions.length} matching` : ""}
                    <select
                      value={matchingQuestions.some((item) => item.index === selectedQuestionIndex) ? selectedQuestionIndex : ""}
                      onChange={(event) => setSelectedQuestionIndex(Number(event.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {matchingQuestions.length ? matchingQuestions.map((item) => <option key={item.summary.questionId} value={item.index}>{item.index + 1}. {item.label}</option>) : <option value="">No matching questions</option>}
                    </select>
                  </label>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" disabled={selectedQuestionIndex === 0} onClick={() => setSelectedQuestionIndex((current) => Math.max(0, current - 1))} className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous question"><ChevronLeft className="size-5" aria-hidden="true" /></button>
                    <button type="button" disabled={selectedQuestionIndex >= responseSummaries.length - 1} onClick={() => setSelectedQuestionIndex((current) => Math.min(responseSummaries.length - 1, current + 1))} className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next question"><ChevronRight className="size-5" aria-hidden="true" /></button>
                  </div>
                </div>
                <IntercessionResponseSummaryCard key={selectedSummary.questionId} summary={selectedSummary} fullExcelHref={form.allowExport ? `/admin/intercession/forms/${form.id}/submissions/export` : undefined} onSeriesSelect={setAnswerDrilldown} />
              </>
            ) : <ResponseAnalyticsEmpty />}
          </div>
        ) : activeView === "individual" ? (
          <IndividualResponseView submissions={activeSubmissions} selectedId={selectedResponseId} onSelectedId={setSelectedResponseId} onReview={setReviewSubmission} />
        ) : (
        <>
        <div className="border-b border-slate-200 bg-slate-50 p-3 sm:p-4">
          <div className={`grid grid-cols-1 gap-3 ${form.isQuiz ? "sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]" : "sm:grid-cols-[minmax(220px,1fr)_auto]"}`}>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Search responder</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name, detail, or answer"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            {form.isQuiz ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Score range</label>
                <select
                  value={scoreFilter}
                  onChange={(event) => setScoreFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All scores</option>
                  <option value="high">80% and above</option>
                  <option value="medium">60% - 79%</option>
                  <option value="low">40% - 59%</option>
                  <option value="fail">Below 40%</option>
                  <option value="unscored">Awaiting review</option>
                </select>
              </div>
            ) : null}
            {form.releaseGrade === "later" ? (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Release status</label>
                <select
                  value={releaseFilter}
                  onChange={(event) => setReleaseFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">All statuses</option>
                  <option value="released">Released</option>
                  <option value="pending">Pending review</option>
                </select>
              </div>
            ) : null}
            <div className="flex items-end justify-end gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </button>
              {form.allowExport && submissions.length > 0 ? (
                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  <Download className="size-4" aria-hidden="true" />
                  CSV
                </button>
              ) : null}
              {form.allowExport && submissions.length > 0 ? <a href={`/admin/intercession/forms/${form.id}/submissions/export?${exportSearch.toString()}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"><FileSpreadsheet className="size-4" aria-hidden="true" />Excel</a> : null}
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Respondent" value={respondentFilter} onChange={setRespondentFilter} options={[["all", "Members and guests"], ["member", "Members"], ["guest", "Guests"]]} />
            <FilterSelect label="Review status" value={reviewFilter} onChange={setReviewFilter} options={[["all", "All review statuses"], ["reviewed", "Reviewed"], ["pending", "Awaiting review"]]} />
            <FilterSelect label="Storage" value={deletionFilter} onChange={setDeletionFilter} options={[["active", "Active responses"], ["trash", "Trash"], ["all", "Active and trash"]]} />
            <label className="text-xs font-semibold text-slate-600">Question<select value={questionFilter} onChange={(event) => setQuestionFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900"><option value="">Any question</option>{form.analyticsQuestions.map((question, index) => <option key={question.questionId} value={question.questionId}>{index + 1}. {intercessionRichTextToPlainText(question.label).replace(/\s+/g, " ").trim()}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-600">Answer contains<input value={answerFilter} onChange={(event) => setAnswerFilter(event.target.value)} placeholder="Search selected answer" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900" /></label>
            <label className="text-xs font-semibold text-slate-600">From date<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900" /></label>
            <label className="text-xs font-semibold text-slate-600">To date<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900" /></label>
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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all visible submissions" checked={filteredSubmissions.length > 0 && filteredSubmissions.every((submission) => selectedSubmissionIds.has(submission.id))} onChange={(event) => setSelectedSubmissionIds((current) => { const next = new Set(current); filteredSubmissions.forEach((submission) => event.target.checked ? next.add(submission.id) : next.delete(submission.id)); return next; })} className="size-4 rounded border-slate-300 text-blue-600" /></th>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3" aria-sort={sortField === "responder" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortHeader label="Responder" active={sortField === "responder"} direction={sortDirection} onClick={() => changeSort("responder")} /></th>
                <th className="w-24 px-4 py-3" aria-sort={sortField === "type" ? sortDirection === "asc" ? "ascending" : "descending" : "none"}><SortHeader label="Type" active={sortField === "type"} direction={sortDirection} onClick={() => changeSort("type")} /></th>
                {form.isQuiz ? <th className="px-4 py-3">Marks</th> : null}
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
                            <span className="font-semibold text-slate-800">{submission.earnedPoints.toLocaleString()}</span>
                            <span className="text-sm text-slate-400"> / {submission.totalPoints.toLocaleString()}</span>
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
                        {form.canDeleteSubmissions && !submission.deletedAt ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={async () => {
                              if (await confirm({ title: "Move submission to trash", message: `Move ${submission.memberName}'s submission to trash? It can be restored later.`, confirmLabel: "Move to trash", tone: "danger" })) {
                                runSubmissionAction(() => deleteFormSubmission(submission.id));
                              }
                            }}
                            className="rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            Trash
                          </button>
                        ) : null}
                        {form.canDeleteSubmissions && submission.deletedAt ? <><button type="button" disabled={pending} onClick={() => runSubmissionAction(() => restoreFormSubmission(submission.id))} className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">Restore</button><button type="button" disabled={pending} onClick={async () => { if (await confirm({ title: "Permanently delete submission", message: `Permanently delete ${submission.memberName}'s submission and uploaded files? This cannot be undone.`, confirmLabel: "Delete permanently", tone: "danger" })) runSubmissionAction(() => permanentlyDeleteFormSubmission(submission.id)); }} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">Delete forever</button></> : null}
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
        <ActivityHistory entries={form.responseActivity} />
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
      {answerDrilldown ? <AnswerDrilldownModal selection={answerDrilldown} submissions={activeSubmissions} onClose={() => setAnswerDrilldown(null)} onOpenSubmission={(submissionId) => { setSelectedResponseId(submissionId); setActiveView("individual"); setAnswerDrilldown(null); }} /> : null}
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

function ResponseOverview({ submissions, generatedAtIso, formCreatedAtIso }: { submissions: SubmissionRow[]; generatedAtIso: string; formCreatedAtIso: string }) {
  const todayKey = kigaliDateKey(generatedAtIso);
  const createdKey = kigaliDateKey(formCreatedAtIso);
  const createdDay = kigaliCalendarDay(createdKey);
  const today = kigaliCalendarDay(todayKey);
  const trendStart = createdDay <= today ? createdDay : today;
  const dayCount = Math.max(1, Math.floor((today.getTime() - trendStart.getTime()) / 86_400_000) + 1);
  const responsesByDay = new Map<string, number>();
  submissions.forEach((submission) => {
    const key = kigaliDateKey(submission.submittedAtIso);
    responsesByDay.set(key, (responsesByDay.get(key) ?? 0) + 1);
  });
  const showYear = trendStart.getUTCFullYear() !== today.getUTCFullYear();
  const trend = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(trendStart.getTime() + index * 86_400_000);
    const key = kigaliDateKey(date.toISOString());
    return { key, label: date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(showYear ? { year: "2-digit" as const } : {}), timeZone: "Africa/Kigali" }), count: responsesByDay.get(key) ?? 0 };
  });
  const max = Math.max(1, ...trend.map((item) => item.count));
  const createdLabel = new Date(formCreatedAtIso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric", timeZone: "Africa/Kigali" });
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div><h2 className="text-sm font-bold text-slate-900">Responses since form creation</h2><p className="mt-0.5 text-xs text-slate-500">Daily responses from {createdLabel}</p><div className="mt-3 overflow-x-auto pb-2"><div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Daily response trend from ${createdLabel}`} style={{ minWidth: "100%", width: trend.length > 21 ? `${trend.length * 54}px` : "100%" }}>{trend.map((item) => <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" aria-label={`${item.label}: ${item.count} responses`} title={`${item.label}: ${item.count} responses`}><span className="text-[10px] font-semibold text-slate-500">{item.count || ""}</span><div className="w-full rounded-t bg-blue-500" style={{ height: `${Math.max(item.count ? 8 : 2, item.count / max * 104)}px` }} /><span className="text-[9px] text-slate-400">{item.label}</span></div>)}</div></div></div>
    </section>
  );
}

function kigaliDateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kigali", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

function kigaliCalendarDay(key: string) {
  return new Date(`${key}T12:00:00+02:00`);
}

function IndividualResponseView({ submissions, selectedId, onSelectedId, onReview }: { submissions: SubmissionRow[]; selectedId: number | null; onSelectedId: (id: number | null) => void; onReview: (submission: SubmissionRow) => void }) {
  const [search, setSearch] = useState("");
  if (!submissions.length) return <div className="bg-slate-50 p-5"><IndividualResponsesEmpty /></div>;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSubmissions = submissions.filter((submission) => !normalizedSearch || [
    submission.memberName,
    submission.respondentType,
    ...submission.visitorDetails.flatMap((detail) => Array.isArray(detail.value) ? detail.value : [detail.value]),
  ].some((value) => value.toLowerCase().includes(normalizedSearch)));
  const submission = selectedId === null ? null : submissions.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="bg-slate-50 p-3 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:items-start">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-4">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-bold text-slate-900">Submitted responses</h2><p className="text-xs text-slate-500">{submissions.length} {submissions.length === 1 ? "person" : "people"}</p></div>
              <Users className="size-5 text-blue-600" aria-hidden="true" />
            </div>
            <label className="relative mt-3 block">
              <span className="sr-only">Search submitted members</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name" className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-2" role="list" aria-label="Submitted members">
            {filteredSubmissions.length ? filteredSubmissions.map((item) => {
              const selected = item.id === selectedId;
              return (
                <button key={item.id} type="button" role="listitem" aria-current={selected ? "true" : undefined} onClick={() => onSelectedId(item.id)} className={`mb-1 w-full rounded-xl border px-3 py-3 text-left transition last:mb-0 ${selected ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{item.memberName}</p><p className="mt-0.5 truncate text-xs text-slate-500">{item.respondentType}</p></div><span className={`mt-0.5 size-2 shrink-0 rounded-full ${selected ? "bg-blue-600" : "bg-emerald-500"}`} aria-hidden="true" /></div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400"><span>{item.respondentType}</span><span>{item.submittedDate}</span></div>
                </button>
              );
            }) : <div className="px-3 py-10 text-center"><Search className="mx-auto size-7 text-slate-300" aria-hidden="true" /><p className="mt-2 text-sm font-semibold text-slate-600">No matching members</p><button type="button" onClick={() => setSearch("")} className="mt-2 text-xs font-semibold text-blue-700 hover:underline">Clear search</button></div>}
          </div>
        </section>

        {submission ? (
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0"><button type="button" onClick={() => onSelectedId(null)} className="mb-2 text-xs font-semibold text-blue-700 hover:underline lg:hidden">Back to all responses</button><h2 className="text-lg font-bold text-slate-900">{submission.memberName}</h2><p className="truncate text-sm text-slate-500">{submission.respondentType}</p><div className="mt-2 text-sm text-slate-500"><p>{submission.submittedAt}</p><p>Completed in {submission.completionSeconds === null ? "unknown time" : formatDuration(submission.completionSeconds)} · Form v{submission.formVersion}</p></div></div>
              <div className="flex shrink-0 flex-wrap gap-2"><PrintButton label="Print response" /><button type="button" onClick={() => onReview(submission)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Open review</button></div>
            </div>
            <div className="mt-4 space-y-3">{submission.answers.map((answer) => <section key={answer.questionId} className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-900"><IntercessionRichText value={answer.question} /></h3><div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{answer.answer}</div></section>)}</div>
          </article>
        ) : (
          <section className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><div><UserCheck className="mx-auto size-10 text-slate-300" aria-hidden="true" /><h2 className="mt-3 font-bold text-slate-700">Select a submitted member</h2><p className="mt-1 text-sm text-slate-500">Click a person in the list to view their details and answers.</p></div></section>
        )}
      </div>
    </div>
  );
}

function IndividualResponsesEmpty() {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center"><Users className="mx-auto size-10 text-slate-300" aria-hidden="true" /><p className="mt-3 font-semibold text-slate-600">No responses have been submitted yet.</p></div>;
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

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m${remainder ? ` ${remainder}s` : ""}`;
}

function ActivityHistory({ entries }: { entries: Array<{ id: number; action: string; actor: string; createdAt: string }> }) {
  return (
    <details className="border-t border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-bold text-slate-700">Activity history ({entries.length})</summary>
      <div className="mt-3 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">{entries.length ? entries.map((entry) => <div key={entry.id} className="flex flex-col gap-1 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"><span className="font-semibold text-slate-700">{activityLabel(entry.action)} <span className="font-normal text-slate-500">by {entry.actor}</span></span><time className="text-slate-400">{entry.createdAt}</time></div>) : <p className="p-4 text-sm text-slate-500">No response management activity recorded yet.</p>}</div>
    </details>
  );
}

function activityLabel(action: string) {
  return action.replace(/^intercession\./, "").replace(/[.-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="size-5" aria-hidden="true" />
          </button>
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
                    {form.isQuiz ? (
                      <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {answer.points} point{answer.points === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                  <IntercessionQuestionImages images={answer.images} className="mt-3" />
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                    {/^https?:\/\//.test(answer.answer) || answer.answer.startsWith("/uploads/form-answers/") ? <a href={answer.answer} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline underline-offset-2">Open uploaded file</a> : answer.answer}
                  </div>
                  {form.isQuiz && answer.earnedPoints !== null ? <p className="mt-2 text-xs font-semibold text-blue-700">Awarded {answer.earnedPoints.toLocaleString()} of {answer.points.toLocaleString()} point{answer.points === 1 ? "" : "s"}</p> : null}
                  {manualReview ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">Award points<input type="number" min={0} max={answer.points} step={0.01} value={awardedPoints[answer.questionIndex] ?? 0} onChange={(event) => { const value = Math.min(answer.points, Math.max(0, Number(event.target.value) || 0)); setAwardedPoints((current) => ({ ...current, [answer.questionIndex]: value })); setGrades((current) => ({ ...current, [answer.questionIndex]: value >= answer.points })); }} className="w-20 rounded border border-blue-200 bg-white px-2 py-1 text-right" /><span>/ {answer.points}</span></label>
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

function resultModeLabel(releaseGrade: string) {
  if (releaseGrade === "never") return "Private";
  if (releaseGrade === "later") return "Pending Review";
  return "Auto-graded";
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: "blue" | "green" | "purple" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
  }[tone];

  return (
    <div className={`rounded-lg border border-gray-100 p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
