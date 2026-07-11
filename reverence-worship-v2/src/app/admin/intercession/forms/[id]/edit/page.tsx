import { notFound } from "next/navigation";
import { IntercessionBuilderInitialData, IntercessionFormBuilder } from "@/components/intercession-form-builder";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asQuestions(value: unknown): IntercessionBuilderInitialData["questions"] {
  return Array.isArray(value) ? (value as IntercessionBuilderInitialData["questions"]) : [];
}

export default async function EditIntercessionFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const formId = Number(id);

  if (!Number.isFinite(formId)) {
    notFound();
  }

  const form = await prisma.spiritualForm.findUnique({
    where: { id: formId },
  });

  if (!form) {
    notFound();
  }

  return (
    <IntercessionFormBuilder
      initialData={{
        id: form.id,
        title: form.title,
        description: form.description,
        questions: asQuestions(form.questions),
        settings: asObject(form.settings),
      }}
    />
  );
}
