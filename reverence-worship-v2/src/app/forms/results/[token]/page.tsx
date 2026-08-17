import { createHash } from "crypto";
import { notFound } from "next/navigation";
import { IntercessionResponseSummaryCard } from "@/components/intercession-response-charts";
import { intercessionAnswerForQuestion, intercessionResponseQuestionCatalog, intercessionSubmissionQuestions } from "@/lib/intercession-response-data";
import { buildIntercessionResponseSummaries, normalizeIntercessionResponseValue } from "@/lib/intercession-response-summary";
import { IntercessionRichText } from "@/components/intercession-rich-text";
import { prisma } from "@/lib/prisma";

export const metadata = { robots: { index: false, follow: false } };

export default async function SharedFormResultsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token.length < 32 || token.length > 200) notFound();
  const share = await prisma.formSummaryShare.findUnique({
    where: { tokenHash: createHash("sha256").update(token).digest("hex") },
    include: { form: { include: { submissions: { where: { deletedAt: null }, orderBy: { submittedAt: "desc" } } } } },
  });
  if (!share || share.revokedAt || share.expiresAt && share.expiresAt < new Date()) notFound();
  const catalog = intercessionResponseQuestionCatalog(share.form.questions, share.form.submissions.map((submission) => submission.questionSnapshot));
  const allowedIds = Array.isArray(share.questionIds) ? new Set(share.questionIds.filter((value): value is string => typeof value === "string")) : null;
  const questions = allowedIds ? catalog.filter((question) => allowedIds.has(question.id)) : catalog;
  const summaries = buildIntercessionResponseSummaries(
    questions.map((question, index) => ({ questionId: question.id, questionIndex: index, label: question.label, type: question.type, options: question.options, rows: question.rows, columns: question.columns, min: question.min, max: question.max })),
    share.form.submissions.map((submission) => {
      const snapshot = intercessionSubmissionQuestions(submission.questionSnapshot, share.form.questions);
      return { answers: questions.map((question, index) => ({ questionId: question.id, questionIndex: index, value: normalizeIntercessionResponseValue(intercessionAnswerForQuestion(submission.answers, snapshot, question.id)) })) };
    }),
  );

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-6 sm:px-5">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Shared response summary</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900"><IntercessionRichText value={share.form.title} /></h1>
          {share.form.description ? <div className="mt-2 text-sm text-slate-600"><IntercessionRichText value={share.form.description} /></div> : null}
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">{share.form.submissions.length} responses</span>{share.expiresAt ? <span className="rounded-full bg-slate-100 px-3 py-1.5">Link expires {share.expiresAt.toLocaleString("en-RW", { timeZone: "Africa/Kigali" })}</span> : null}</div>
          <p className="mt-4 text-xs text-slate-500">This summary contains aggregated results only. Respondent identities are not shared.</p>
        </header>
        <div className="space-y-4">{summaries.map((summary) => <IntercessionResponseSummaryCard key={summary.questionId} summary={summary} />)}</div>
      </div>
    </main>
  );
}
