import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { IntercessionTakeForm } from "@/components/intercession-take-form";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { intercessionFormAvailability, parseIntercessionFormQuestions, parseIntercessionFormSettings } from "@/lib/intercession-form-domain";
import { withDatabaseRetry } from "@/lib/database-retry";
import { commitmentProfileValues } from "@/lib/membership-commitment";

export default async function TakeIntercessionFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("intercession", "submit-forms", "/admin/forms");
  const { id } = await params;
  const formId = Number(id);

  if (!Number.isFinite(formId)) {
    notFound();
  }

  const form = await withDatabaseRetry(() => prisma.spiritualForm.findUnique({
    where: { id: formId },
  }), 3);

  if (!form) {
    notFound();
  }

  const formSettings = parseIntercessionFormSettings(form.settings);
  const acceptedCommitment = formSettings.commitment && formSettings.limit_one_response
    ? await prisma.membershipCommitment.findFirst({ where: { userId: user.id, year: formSettings.commitment.year }, select: { id: true } })
    : null;
  if (formSettings.commitment) {
    if (!acceptedCommitment && (!user.membershipType || !formSettings.commitment.membershipTypes.includes(user.membershipType))) return <div className="p-6 text-center">This commitment is not available for your membership type.</div>;
  }
  const availability = intercessionFormAvailability(formSettings, form.isActive, await withDatabaseRetry(() => prisma.formSubmission.count({ where: { formId, deletedAt: null } }), 3));
  if (availability) return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">{availability}</div>
      <div className="mt-5 text-center">
        <Link href="/admin/forms" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Forms
        </Link>
      </div>
    </div>
  );

  const existingSubmission = formSettings.limit_one_response ? await withDatabaseRetry(() => prisma.formSubmission.findFirst({
    where: { formId, userId: user.id, deletedAt: null },
    select: { id: true },
  }), 3) : null;

  return (
    <IntercessionTakeForm
      form={{
        id: form.id,
        title: form.title,
        description: form.description,
        version: form.version,
      }}
      questions={parseIntercessionFormQuestions(form.questions)}
      settings={formSettings}
      alreadySubmitted={Boolean(existingSubmission || acceptedCommitment)}
      memberProfile={formSettings.commitment ? commitmentProfileValues(user) : undefined}
    />
  );
}
