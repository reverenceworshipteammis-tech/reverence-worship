"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "1" || value === "true";
}

function readValues(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function buildQuestions(formData: FormData) {
  const questionText = readString(formData, "questionText");
  const questionType = readString(formData, "questionType") ?? "paragraph";
  const required = readBoolean(formData, "questionRequired");

  if (!questionText) return [];

  return [
    {
      type: questionType,
      label: questionText,
      required,
      options:
        questionType === "multiple_choice"
          ? (readString(formData, "questionOptions") ?? "")
              .split("\n")
              .map((option) => option.trim())
              .filter(Boolean)
          : [],
      points: 1,
    },
  ];
}

function readJsonArray(formData: FormData, key: string) {
  const raw = readString(formData, key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readJsonObject(formData: FormData, key: string) {
  const raw = readString(formData, key);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function createSpiritualForm(formData: FormData) {
  const user = await requireUser();
  const title = readString(formData, "title");

  if (!title) {
    return { ok: false, message: "Form title is required." };
  }

  const limitOneResponse = readBoolean(formData, "limitOneResponse");
  const isPublished = readBoolean(formData, "isPublished");

  await prisma.spiritualForm.create({
    data: {
      title,
      description: readString(formData, "description"),
      questions: buildQuestions(formData),
      settings: {
        is_published: isPublished,
        limit_one_response: limitOneResponse,
        release_grade: "immediately",
        allow_partial_points: true,
      },
      isActive: true,
      createdBy: user.id,
    },
  });

  revalidatePath("/admin/intercession");

  return { ok: true, message: "Form created successfully." };
}

export async function createSpiritualFormFromBuilder(formData: FormData) {
  const user = await requireUser();
  const title = readString(formData, "title");

  if (!title) {
    return { ok: false, message: "Form title is required." };
  }

  const questions = readJsonArray(formData, "questions");
  const settings = {
    is_published: false,
    limit_one_response: true,
    release_grade: "never",
    allow_partial_points: true,
    ...readJsonObject(formData, "settings"),
  };

  await prisma.spiritualForm.create({
    data: {
      title,
      description: readString(formData, "description"),
      questions,
      settings,
      isActive: true,
      createdBy: user.id,
    },
  });

  revalidatePath("/admin/intercession");

  return { ok: true, message: "Form created successfully." };
}

export async function updateSpiritualFormFromBuilder(formId: number, formData: FormData) {
  await requireUser();
  const title = readString(formData, "title");

  if (!title) {
    return { ok: false, message: "Form title is required." };
  }

  const current = await prisma.spiritualForm.findUnique({
    where: { id: formId },
    select: { settings: true },
  });

  if (!current) {
    return { ok: false, message: "Form not found." };
  }

  await prisma.spiritualForm.update({
    where: { id: formId },
    data: {
      title,
      description: readString(formData, "description"),
      questions: readJsonArray(formData, "questions"),
      settings: {
        ...((current.settings as Record<string, unknown> | null) ?? {}),
        ...readJsonObject(formData, "settings"),
      },
      isActive: true,
    },
  });

  revalidatePath("/admin/intercession");
  revalidatePath(`/admin/intercession/forms/${formId}/edit`);

  return { ok: true, message: "Form updated successfully." };
}

export async function updateSpiritualForm(formId: number, formData: FormData) {
  await requireUser();
  const title = readString(formData, "title");

  if (!title) {
    return { ok: false, message: "Form title is required." };
  }

  const current = await prisma.spiritualForm.findUnique({
    where: { id: formId },
    select: { settings: true },
  });

  const settings = {
    ...((current?.settings as Record<string, unknown> | null) ?? {}),
    is_published: readBoolean(formData, "isPublished"),
    limit_one_response: readBoolean(formData, "limitOneResponse"),
  };

  await prisma.spiritualForm.update({
    where: { id: formId },
    data: {
      title,
      description: readString(formData, "description"),
      questions: buildQuestions(formData),
      settings,
      isActive: true,
    },
  });

  revalidatePath("/admin/intercession");

  return { ok: true, message: "Form updated successfully." };
}

export async function toggleSpiritualFormPublish(formId: number) {
  await requireUser();

  const form = await prisma.spiritualForm.findUnique({
    where: { id: formId },
    select: { settings: true },
  });

  if (!form) {
    return { ok: false, message: "Form not found." };
  }

  const settings = (form.settings as Record<string, unknown> | null) ?? {};
  const nextPublished = !Boolean(settings.is_published);

  await prisma.spiritualForm.update({
    where: { id: formId },
    data: {
      settings: {
        ...settings,
        is_published: nextPublished,
      },
    },
  });

  revalidatePath("/admin/intercession");

  return { ok: true, message: nextPublished ? "Form published." : "Form unpublished." };
}

export async function deleteSpiritualForm(formId: number) {
  await requireUser();

  await prisma.spiritualForm.delete({
    where: { id: formId },
  });

  revalidatePath("/admin/intercession");

  return { ok: true, message: "Form deleted." };
}

export async function submitSpiritualForm(formId: number, formData: FormData) {
  const user = await requireUser();

  const form = await prisma.spiritualForm.findUnique({
    where: { id: formId },
    select: { questions: true, settings: true },
  });

  if (!form) {
    return { ok: false, message: "Form not found." };
  }

  const settings = (form.settings as Record<string, unknown> | null) ?? {};
  const limitOneResponse = settings.limit_one_response !== false;

  if (limitOneResponse) {
    const existing = await prisma.formSubmission.findFirst({
      where: { formId, userId: user.id },
      select: { id: true },
    });

    if (existing) {
      return { ok: false, message: "You already submitted this form." };
    }
  }

  const questions = Array.isArray(form.questions) ? form.questions : [];
  const answers = questions.reduce<Record<string, string | string[]>>((carry, question, index) => {
    const questionObject = question && typeof question === "object" && !Array.isArray(question) ? (question as Record<string, unknown>) : {};
    const key = `question_${index}`;
    if (questionObject.type === "checkboxes") {
      carry[key] = readValues(formData, key);
    } else {
      carry[key] = readString(formData, key) ?? "";
    }
    return carry;
  }, {});

  await prisma.formSubmission.create({
    data: {
      formId,
      userId: user.id,
      answers,
      score: null,
    },
  });

  revalidatePath("/admin/intercession");

  return { ok: true, message: "Form submitted successfully." };
}
