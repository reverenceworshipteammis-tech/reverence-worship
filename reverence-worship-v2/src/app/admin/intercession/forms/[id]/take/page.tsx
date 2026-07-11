import { notFound } from "next/navigation";
import { IntercessionTakeForm } from "@/components/intercession-take-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asQuestions(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.map((question) => {
    const item = asObject(question);
    return {
      type: typeof item.type === "string" ? item.type : "paragraph",
      label: typeof item.label === "string" ? item.label : typeof item.text === "string" ? item.text : "Question",
      description: typeof item.description === "string" ? item.description : "",
      required: item.required !== false,
      options: asStringArray(item.options),
      min: Number(item.min ?? 1),
      max: Number(item.max ?? 5),
    };
  });
}

function asSettings(value: unknown) {
  const settings = asObject(value);
  return {
    limit_one_response: settings.limit_one_response !== false,
    show_progress_bar: Boolean(settings.show_progress_bar),
    shuffle_questions: Boolean(settings.shuffle_questions),
    show_question_numbers: settings.show_question_numbers !== false,
    is_quiz: Boolean(settings.is_quiz),
    release_grade: typeof settings.release_grade === "string" ? settings.release_grade : "never",
  };
}

export default async function TakeIntercessionFormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
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

  const existingSubmission = await prisma.formSubmission.findFirst({
    where: { formId, userId: user.id },
    select: { id: true },
  });

  return (
    <IntercessionTakeForm
      form={{
        id: form.id,
        title: form.title,
        description: form.description,
      }}
      questions={asQuestions(form.questions)}
      settings={asSettings(form.settings)}
      alreadySubmitted={Boolean(existingSubmission)}
    />
  );
}
