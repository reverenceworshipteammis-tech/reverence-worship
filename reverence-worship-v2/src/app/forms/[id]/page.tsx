import { notFound } from "next/navigation";
import { IntercessionTakeForm } from "@/components/intercession-take-form";
import { getCurrentUser } from "@/lib/auth";
import { intercessionFormAvailability, parseIntercessionFormQuestions, parseIntercessionFormSettings } from "@/lib/intercession-form-domain";
import { prisma } from "@/lib/prisma";
import { withDatabaseRetry } from "@/lib/database-retry";

export default async function PublicIntercessionFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formId = Number(id);
  if (!Number.isInteger(formId) || formId <= 0) notFound();
  const [form, user] = await withDatabaseRetry(() => Promise.all([
    prisma.spiritualForm.findUnique({ where: { id: formId }, include: { _count: { select: { submissions: true } } } }),
    getCurrentUser(),
  ]), 3);
  if (!form) notFound();
  const settings = parseIntercessionFormSettings(form.settings);
  if (settings.require_login) notFound();
  const availability = intercessionFormAvailability(settings, form.isActive, form._count.submissions);
  if (availability) return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">{availability}</div></main>;
  const existingSubmission = user && settings.limit_one_response
    ? await withDatabaseRetry(() => prisma.formSubmission.findFirst({ where: { formId, userId: user.id }, select: { id: true } }), 3)
    : null;
  return <main className="min-h-screen bg-slate-50"><IntercessionTakeForm form={{ id: form.id, title: form.title, description: form.description }} questions={parseIntercessionFormQuestions(form.questions)} settings={settings} alreadySubmitted={Boolean(existingSubmission)} requireRespondentName={!user} backHref="/" /></main>;
}
