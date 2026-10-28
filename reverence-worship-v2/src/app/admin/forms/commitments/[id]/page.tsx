import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserPermissionSet, permissionSetHas, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { commitmentProfileDisplay, parseCommitmentChanges, type CommitmentSnapshot } from "@/lib/membership-commitment";
import { IntercessionRichText } from "@/components/intercession-rich-text";
import { parseIntercessionFormQuestions } from "@/lib/intercession-form-domain";
import { intercessionAnswerForQuestion, intercessionAnswerText } from "@/lib/intercession-response-data";
import { IntercessionQuestionImages } from "@/components/intercession-question-images";
import { parseIntercessionFormSettings } from "@/lib/intercession-form-domain";

export default async function CommitmentRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const permissions = await getUserPermissionSet(user);
  const canViewReports = ["view-reports", "view-submissions", "view-results", "export-reports"].some((feature) => permissionSetHas(permissions, "intercession", feature));
  // Scope the query itself so members cannot retrieve another member's record.
  const record = await prisma.membershipCommitment.findFirst({ where: { id, ...(!canViewReports ? { userId: user.id } : {}) } });
  if (!record) notFound();
  if (!canViewReports) {
    const form = await prisma.spiritualForm.findUnique({ where: { id: record.formId }, select: { settings: true } });
    if (!form || !parseIntercessionFormSettings(form.settings).allow_view_response) notFound();
  }
  const snapshot = record.snapshot as unknown as CommitmentSnapshot;
  const changes = parseCommitmentChanges(record.profileChanges);
  const questions = parseIntercessionFormQuestions(snapshot.questions);
  const availableFormsHref = "/admin/forms";
  const backToAvailableForms = <Link href={availableFormsHref} className="hidden sm:inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><ArrowLeft className="size-4" aria-hidden="true" />Back to Available Forms</Link>;
  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8"><div className="hidden flex-wrap items-center justify-between gap-3 sm:flex"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Accepted · {record.year}</span>{backToAvailableForms}</div><h1 className="text-2xl font-bold text-slate-900 sm:mt-4"><IntercessionRichText value={snapshot.formTitle} /></h1><p className="mt-2 text-sm text-slate-600">{snapshot.memberName} · {new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kigali", dateStyle: "long", timeStyle: "medium" }).format(record.acceptedAt)}</p>{snapshot.formDescription ? <p className="mt-3 text-sm text-slate-600"><IntercessionRichText value={snapshot.formDescription} /></p> : null}</section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8"><h2 className="text-lg font-bold text-slate-900">Information confirmed for {record.year}</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2">{snapshot.profile.map((field) => <div key={field.key}><dt className="text-xs font-semibold text-slate-500">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900">{commitmentProfileDisplay(field.key, field.value)}</dd></div>)}</dl></section>
    {questions.length ? <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-8"><h2 className="text-lg font-bold text-slate-900">Submitted answers</h2>{questions.filter((question) => Object.prototype.hasOwnProperty.call(snapshot.answers, `question_${questions.indexOf(question)}`)).map((question) => {
      const answer = intercessionAnswerForQuestion(snapshot.answers, questions, question.id);
      return <div key={question.id}><h3 className="text-sm font-semibold"><IntercessionRichText value={question.label} /></h3><IntercessionQuestionImages images={question.images} />{question.type === "file_upload" && typeof answer === "string" && /^(?:\/uploads\/form-answers\/|https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\/uploads\/form-answers\/)/.test(answer) ? <a href={answer} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-blue-700">View submitted file</a> : <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{intercessionAnswerText(answer)}</p>}</div>;
    })}</section> : null}
    {changes.length ? <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8"><h2 className="text-lg font-bold text-slate-900">Profile changes</h2><div className="mt-4 space-y-4">{changes.map((change) => <div key={change.key} className="rounded-lg bg-slate-50 p-3"><h3 className="text-sm font-semibold">{change.label}</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{commitmentProfileDisplay(change.key, change.before)} → {commitmentProfileDisplay(change.key, change.after)}</p></div>)}</div></section> : null}
    <div className="pt-1">{backToAvailableForms}</div>
  </main>;
}
