import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { IntercessionTakeForm } from "@/components/intercession-take-form";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseQuestionImages } from "@/lib/intercession-question-images";
import { parseIntercessionQuestionCondition } from "@/lib/intercession-form-rules";
import { intercessionFormAvailability, parseIntercessionFormSettings } from "@/lib/intercession-form-domain";
import { withDatabaseRetry } from "@/lib/database-retry";

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asQuestions(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((question, index) => {
    const item = asObject(question);
    return {
      id: typeof item.id === "string" && item.id ? item.id : `question-${index + 1}`,
      type: typeof item.type === "string" ? item.type : "paragraph",
      label: typeof item.label === "string" ? item.label : typeof item.text === "string" ? item.text : "Question",
      description: typeof item.description === "string" ? item.description : "",
      required: item.required !== false,
      options: asStringArray(item.options),
      rows: asStringArray(item.rows),
      columns: asStringArray(item.columns),
      min: Number(item.min ?? 1),
      max: Number(item.max ?? 5),
      images: parseQuestionImages(item.images),
      condition: parseIntercessionQuestionCondition(item.condition),
      points: Number(item.points ?? 1),
      correctAnswer: typeof item.correctAnswer === "string" ? item.correctAnswer : "",
      correctAnswers: Array.isArray(item.correctAnswers) || (item.correctAnswers && typeof item.correctAnswers === "object") ? item.correctAnswers as string[] | Record<string, string | string[]> : [],
    };
  });
}

export default async function TakeIntercessionFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("intercession", "submit-forms", "/admin/intercession");
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
  const availability = intercessionFormAvailability(formSettings, form.isActive, await withDatabaseRetry(() => prisma.formSubmission.count({ where: { formId, deletedAt: null } }), 3));
  if (availability) return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">{availability}</div>
      <div className="mt-5 text-center">
        <Link href="/admin/intercession" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Forms
        </Link>
      </div>
    </div>
  );

  const existingSubmission = await withDatabaseRetry(() => prisma.formSubmission.findFirst({
    where: { formId, userId: user.id, deletedAt: null },
    select: { id: true },
  }), 3);

  return (
    <IntercessionTakeForm
      form={{
        id: form.id,
        title: form.title,
        description: form.description,
      }}
      questions={asQuestions(form.questions)}
      settings={formSettings}
      alreadySubmitted={Boolean(existingSubmission)}
    />
  );
}
