import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, CheckCircle2, FileText, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  memberCanViewScore,
  memberResultLabel,
  memberResultState,
} from "@/lib/intercession-result-rules";
import { prisma } from "@/lib/prisma";

type Question = {
  index: number;
  type: string;
  label: string;
  description: string;
  rows: string[];
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((value, index) => {
      const question = asObject(value);
      return {
        index,
        type: String(question.type ?? "short_answer"),
        label: String(question.label ?? question.text ?? `Question ${index + 1}`),
        description: typeof question.description === "string" ? question.description : "",
        rows: asStringArray(question.rows),
      };
    })
    .filter((question) => question.type !== "title_section" && question.type !== "section_break");
}

function answerText(value: unknown, rows: string[]) {
  if (Array.isArray(value)) {
    const answers = value.map(String).filter(Boolean);
    return answers.length ? answers.join(", ") : "No answer submitted.";
  }

  if (value && typeof value === "object") {
    const lines = Object.entries(value as Record<string, unknown>).map(([key, rowAnswer], index) => {
      const rowIndex = Number(key.match(/_(\d+)$/)?.[1] ?? index);
      const label = rows[rowIndex] ?? `Row ${rowIndex + 1}`;
      const formatted = Array.isArray(rowAnswer)
        ? rowAnswer.map(String).filter(Boolean).join(", ")
        : String(rowAnswer ?? "");
      return `${label}: ${formatted || "No answer"}`;
    });
    return lines.length ? lines.join("\n") : "No answer submitted.";
  }

  const answer = String(value ?? "").trim();
  return answer || "No answer submitted.";
}

function manualGradeFor(value: unknown, questionIndex: number) {
  if (!Array.isArray(value)) return null;
  const grade = value.find((item) =>
    Boolean(item) &&
    typeof item === "object" &&
    Number((item as Record<string, unknown>).questionIndex) === questionIndex,
  );
  return grade && typeof grade === "object"
    ? Boolean((grade as Record<string, unknown>).correct)
    : null;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function MemberSubmissionResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const submissionId = Number(id);

  if (!Number.isInteger(submissionId) || submissionId <= 0) notFound();

  const submission = await prisma.formSubmission.findFirst({
    where: { id: submissionId, userId: user.id },
    include: { form: true },
  });

  if (!submission) notFound();

  const settings = asObject(submission.form.settings);
  const answers = asObject(submission.answers);
  const questions = parseQuestions(submission.form.questions);
  const allowViewResponse = settings.allow_view_response !== false;
  const resultInput = {
    isQuiz: Boolean(settings.is_quiz),
    releaseGrade: String(settings.release_grade ?? "never"),
    score: submission.score,
    isReleased: submission.isReleased,
  };
  const resultState = memberResultState(resultInput);
  const canViewScore = memberCanViewScore(resultInput);

  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50/40 px-5 py-6 sm:px-8">
          <Link
            href="/admin/intercession?section=results"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition hover:text-sky-900"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to My Results
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-700">Your submission</p>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{submission.form.title}</h1>
              {submission.form.description ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{submission.form.description}</p>
              ) : null}
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500">
                <CalendarDays className="size-4" aria-hidden="true" />
                Submitted {formatDateTime(submission.submittedAt)}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {canViewScore ? `${submission.score}%` : memberResultLabel(resultState)}
            </span>
          </div>
        </div>

        {resultInput.isQuiz && !canViewScore ? (
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600 sm:px-8">
            {resultState === "awaiting_review"
              ? "Your submission is awaiting review."
              : resultState === "pending_release"
                ? "Your result has been reviewed and is waiting to be released."
                : "The score for this form is private."}
          </div>
        ) : null}

        <div className="bg-slate-50 p-5 sm:p-8">
          {allowViewResponse ? (
            <div>
              <div className="mb-5 flex items-center gap-2">
                <FileText className="size-5 text-blue-600" aria-hidden="true" />
                <h2 className="text-lg font-bold text-slate-900">Your responses</h2>
              </div>
              <div className="space-y-4">
                {questions.map((question, displayIndex) => {
                  const grade = canViewScore
                    ? manualGradeFor(submission.manualGrades, question.index)
                    : null;
                  return (
                    <article key={question.index} className="rounded-xl border border-slate-200 bg-white p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-slate-900">
                          <span className="mr-2 text-blue-600">{displayIndex + 1}.</span>
                          {question.label}
                        </h3>
                        {grade !== null ? (
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            grade ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {grade ? "Correct" : "Incorrect"}
                          </span>
                        ) : null}
                      </div>
                      {question.description ? (
                        <p className="mt-1 whitespace-pre-line text-sm text-slate-500">{question.description}</p>
                      ) : null}
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Answer</p>
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                          {answerText(answers[`question_${question.index}`], question.rows)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
              <Lock className="mx-auto mb-3 size-8 text-amber-600" aria-hidden="true" />
              <h2 className="font-semibold text-amber-900">Response review is unavailable</h2>
              <p className="mt-1 text-sm text-amber-700">The form owner has disabled viewing submitted answers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
