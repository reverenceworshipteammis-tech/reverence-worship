"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, Download, FileText, RotateCcw, Search, UserCheck, Users, X, XCircle } from "lucide-react";
import { deleteFormSubmission, saveSubmissionManualReview, setAllSubmissionRelease, setSubmissionRelease } from "@/app/admin/intercession/actions";

type SubmissionRow = {
  id: number;
  memberName: string;
  memberEmail: string;
  submittedAt: string;
  submittedDate: string;
  submittedTime: string;
  score: number | null;
  earnedPoints: number | null;
  totalPoints: number;
  isReleased: boolean;
  releasedAt: string | null;
  answersCount: number;
  answers: Array<{
    questionIndex: number;
    question: string;
    type: string;
    points: number;
    answer: string;
    correct: boolean | null;
  }>;
};

export function IntercessionSubmissionsClient({
  form,
  submissions,
}: {
  form: { id: number; title: string; description: string | null; isQuiz: boolean; releaseGrade: string; canDeleteSubmissions: boolean };
  submissions: SubmissionRow[];
}) {
  const [query, setQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [releaseFilter, setReleaseFilter] = useState("all");
  const [reviewSubmission, setReviewSubmission] = useState<SubmissionRow | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredSubmissions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return submissions.filter((submission) => {
      const matchesSearch =
        !normalized ||
        [submission.memberName, submission.memberEmail].some((value) => value.toLowerCase().includes(normalized));
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
      return matchesSearch && matchesScore && matchesRelease;
    });
  }, [submissions, query, scoreFilter, releaseFilter, form.isQuiz, form.releaseGrade]);

  const averageScore = useMemo(() => {
    const scored = submissions.map((submission) => submission.score).filter((score): score is number => typeof score === "number");
    if (scored.length === 0) return 0;
    return Math.round((scored.reduce((sum, score) => sum + score, 0) / scored.length) * 10) / 10;
  }, [submissions]);

  function resetFilters() {
    setQuery("");
    setScoreFilter("all");
    setReleaseFilter("all");
  }

  function runSubmissionAction(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      setNotice(await action());
    });
  }

  const pendingReleaseCount = submissions.filter((submission) => submission.score !== null && !submission.isReleased).length;
  const releasedCount = submissions.filter((submission) => submission.isReleased).length;

  function exportCsv() {
    const header = ["#", "Member", "Email", "Submitted Date", "Submitted Time", "Marks", "Score", "Answers", "Result Status"];
    const rows = filteredSubmissions.map((submission) => [
      String(submissions.indexOf(submission) + 1),
      submission.memberName,
      submission.memberEmail,
      submission.submittedDate,
      submission.submittedTime,
      submission.earnedPoints === null ? "" : `${submission.earnedPoints}/${submission.totalPoints}`,
      submission.score === null ? "" : `${submission.score}%`,
      String(submission.answersCount),
      resultStatusLabel(form.releaseGrade, submission.isReleased),
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
        {notice ? (
          <div className={`border-b px-4 py-3 text-sm font-medium ${notice.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {notice.message}
          </div>
        ) : null}
        <div className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href="/admin/intercession" className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-blue-600">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to Manage Forms
              </Link>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{form.title}</h1>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
              <Users className="size-4" aria-hidden="true" />
              {submissions.length} Responses
            </span>
          </div>
        </div>

        {form.isQuiz ? (
          <div className="grid gap-3 border-b border-slate-200 bg-white p-4 sm:grid-cols-3">
            <StatCard label="Total Submissions" value={submissions.length} tone="blue" />
            <StatCard label="Average Score" value={`${averageScore}%`} tone="green" />
            <StatCard label="Result Mode" value={resultModeLabel(form.releaseGrade)} tone="purple" />
          </div>
        ) : null}

        <div className="border-b border-slate-200 bg-slate-50 p-3 sm:p-4">
          <div className={`grid grid-cols-1 gap-3 ${form.isQuiz ? "sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_180px_auto]" : "sm:grid-cols-[minmax(220px,1fr)_auto]"}`}>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Search member</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name or email"
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
              {submissions.length > 0 ? (
                <button
                  type="button"
                  onClick={exportCsv}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Export
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Showing {filteredSubmissions.length} of {submissions.length} submissions
          </div>
        </div>

        {form.releaseGrade === "later" ? (
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
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Member</th>
                {form.isQuiz ? <th className="px-4 py-3">Marks</th> : null}
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Result status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredSubmissions.length ? (
                filteredSubmissions.map((submission, index) => (
                  <tr key={submission.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-medium text-white">
                          {initials(submission.memberName)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{submission.memberName}</div>
                          <div className="text-xs text-gray-400">{submission.memberEmail || "No email"}</div>
                        </div>
                      </div>
                    </td>
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
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="size-3.5 text-gray-400" aria-hidden="true" />
                        {submission.submittedDate}
                      </div>
                      <div className="text-xs text-gray-400">{submission.submittedTime}</div>
                    </td>
                    <td className="px-4 py-3">
                      <ResultStatus releaseGrade={form.releaseGrade} isReleased={submission.isReleased} />
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
                        {form.releaseGrade === "later" && submission.score !== null ? (
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
                        {form.canDeleteSubmissions ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              if (window.confirm(`Delete ${submission.memberName}'s submission?`)) {
                                runSubmissionAction(() => deleteFormSubmission(submission.id));
                              }
                            }}
                            className="rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={form.isQuiz ? 6 : 5} className="px-4 py-12 text-center">
                    <FileText className="mx-auto mb-3 size-10 text-slate-300" aria-hidden="true" />
                    <p className="font-medium text-slate-500">No submissions yet</p>
                    <p className="text-sm text-slate-400">Be the first to submit this form</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}

function ReviewSubmissionModal({
  form,
  submission,
  onClose,
  onSaved,
}: {
  form: { title: string; isQuiz: boolean; releaseGrade: string };
  submission: SubmissionRow;
  onClose: () => void;
  onSaved: (result: { ok: boolean; message: string }) => void;
}) {
  const [grades, setGrades] = useState<Record<number, boolean | null>>(() =>
    Object.fromEntries(submission.answers.map((answer) => [answer.questionIndex, answer.correct])),
  );
  const [pending, startTransition] = useTransition();
  const manualReview = form.isQuiz && form.releaseGrade === "later";

  function setGrade(questionIndex: number, correct: boolean) {
    setGrades((current) => ({ ...current, [questionIndex]: correct }));
  }

  function saveReview() {
    const payload = submission.answers.map((answer) => ({
      questionIndex: answer.questionIndex,
      correct: grades[answer.questionIndex] === true,
      points: answer.points,
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
      <div className="mx-auto max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Review Submission</p>
            <h2 className="mt-1 truncate text-lg font-bold text-slate-900">{form.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {submission.memberName} · {submission.submittedDate} {submission.submittedTime}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
          <StatCard label="Answers" value={submission.answersCount} tone="blue" />
          {form.isQuiz ? (
            <StatCard
              label="Marks"
              value={submission.earnedPoints === null ? "Awaiting review" : `${submission.earnedPoints}/${submission.totalPoints}`}
              tone="green"
            />
          ) : null}
          <div className="rounded-lg border border-gray-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">Result Status</p>
            <div className="mt-2"><ResultStatus releaseGrade={form.releaseGrade} /></div>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          <div className="space-y-3">
            {submission.answers.length ? (
              submission.answers.map((answer, index) => (
                <article key={`${answer.question}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Question {index + 1}</p>
                      <h3 className="mt-1 font-semibold text-slate-900">{answer.question}</h3>
                      <p className="mt-1 text-xs capitalize text-slate-400">{answer.type.replaceAll("_", " ")}</p>
                    </div>
                    {form.isQuiz ? (
                      <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {answer.points} point{answer.points === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                    {answer.answer}
                  </div>
                  {manualReview ? (
                    <div className="mt-3 flex flex-wrap gap-2">
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

function resultStatusLabel(releaseGrade: string, isReleased = false) {
  if (releaseGrade === "never") return "Private";
  if (releaseGrade === "later") return isReleased ? "Released" : "Pending review";
  return "Available";
}

function resultModeLabel(releaseGrade: string) {
  if (releaseGrade === "never") return "Private";
  if (releaseGrade === "later") return "Pending Review";
  return "Auto-graded";
}

function ResultStatus({ releaseGrade, isReleased = false }: { releaseGrade: string; isReleased?: boolean }) {
  if (releaseGrade === "never") {
    return <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">Private</span>;
  }

  if (releaseGrade === "later") {
    if (isReleased) {
      return <span className="inline-flex rounded-full bg-green-50 px-2 py-1 text-xs text-green-700">Released</span>;
    }
    return <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700">Pending review</span>;
  }

  return <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">Available</span>;
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
