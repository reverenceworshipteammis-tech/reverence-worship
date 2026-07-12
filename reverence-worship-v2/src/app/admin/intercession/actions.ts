"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "1" || value === "true";
}

function dateOnly(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function boundedProgress(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function readValues(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function buildQuestions(formData: FormData) {
  const questionText = readString(formData, "questionText");
  const questionType = readString(formData, "questionType") ?? "short_answer";
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

async function syncIntercessionActionPlanProgress(actionPlanId: number) {
  const tasks = await prisma.actionPlanTask.findMany({
    where: { actionPlanId },
    select: { progress: true },
  });
  const progress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0;
  const status = progress === 100 ? "completed" : progress > 0 ? "in_progress" : "pending";

  await prisma.actionPlan.update({
    where: { id: actionPlanId, department: "intercession" },
    data: { progress, status },
  });
}

export async function saveIntercessionActionPlan(formData: FormData) {
  const user = await requirePermission("intercession", "manage-action-plans", "/admin/intercession");
  const id = Number(readString(formData, "id"));
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const startDateValue = readString(formData, "startDate");
  const dueDateValue = readString(formData, "dueDate");
  const year = Number(readString(formData, "year") || new Date().getFullYear());

  if (!title || !startDateValue || !dueDateValue) {
    return { ok: false, message: "Action plan name, start date, and completion date are required." };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, message: "Please select a valid year." };
  }

  if (Number.isFinite(id) && id > 0) {
    await prisma.actionPlan.update({
      where: { id, department: "intercession" },
      data: {
        title,
        description,
        startDate: dateOnly(startDateValue),
        dueDate: dateOnly(dueDateValue),
        year,
      },
    });
  } else {
    await prisma.actionPlan.create({
      data: {
        title,
        description,
        startDate: dateOnly(startDateValue),
        dueDate: dateOnly(dueDateValue),
        department: "intercession",
        year,
        createdBy: user.id,
      },
    });
  }

  revalidatePath("/admin/intercession");
  return { ok: true, message: id ? "Action plan updated successfully." : "Action plan created successfully." };
}

export async function deleteIntercessionActionPlan(id: number) {
  await requirePermission("intercession", "manage-action-plans", "/admin/intercession");

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Action plan not found." };
  }

  await prisma.actionPlan.delete({ where: { id, department: "intercession" } });
  revalidatePath("/admin/intercession");
  return { ok: true, message: "Action plan deleted successfully." };
}

export async function saveIntercessionActionPlanTask(formData: FormData) {
  await requirePermission("intercession", "manage-action-plans", "/admin/intercession");
  const id = Number(readString(formData, "id"));
  const actionPlanId = Number(readString(formData, "actionPlanId"));
  const activity = readString(formData, "activity");
  const targetMilestone = readString(formData, "targetMilestone");
  const estimatedBudget = readString(formData, "estimatedBudget") || "0";
  const startDateValue = readString(formData, "startDate");
  const deadlineValue = readString(formData, "deadline");
  const progress = boundedProgress(formData.get("progress"));

  if (!Number.isInteger(actionPlanId) || actionPlanId <= 0 || !activity || !targetMilestone || !deadlineValue) {
    return { ok: false, message: "Action plan, activity, milestone, and deadline are required." };
  }

  const plan = await prisma.actionPlan.findUnique({
    where: { id: actionPlanId, department: "intercession" },
    select: { id: true },
  });

  if (!plan) {
    return { ok: false, message: "Action plan not found." };
  }

  const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "pending";
  const data = {
    actionPlanId,
    taskName: activity,
    activity,
    targetMilestone,
    estimatedBudget,
    startDate: startDateValue ? dateOnly(startDateValue) : null,
    deadline: dateOnly(deadlineValue),
    progress,
    status,
    startedAt: progress > 0 ? new Date() : null,
    completedAt: progress >= 100 ? new Date() : null,
  };

  if (Number.isFinite(id) && id > 0) {
    await prisma.actionPlanTask.update({
      where: { id },
      data,
    });
  } else {
    await prisma.actionPlanTask.create({ data });
  }

  await syncIntercessionActionPlanProgress(actionPlanId);
  revalidatePath("/admin/intercession");
  return { ok: true, message: id ? "Task updated successfully." : "Task created successfully." };
}

export async function deleteIntercessionActionPlanTask(id: number) {
  await requirePermission("intercession", "manage-action-plans", "/admin/intercession");

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Task not found." };
  }

  const task = await prisma.actionPlanTask.findUnique({
    where: { id },
    select: { actionPlanId: true, actionPlan: { select: { department: true } } },
  });

  if (!task || task.actionPlan.department !== "intercession") {
    return { ok: false, message: "Task not found." };
  }

  await prisma.actionPlanTask.delete({ where: { id } });
  await syncIntercessionActionPlanProgress(task.actionPlanId);
  revalidatePath("/admin/intercession");
  return { ok: true, message: "Task deleted successfully." };
}

export async function createSpiritualForm(formData: FormData) {
  const user = await requirePermission("intercession", "create-forms", "/admin/intercession");
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
  const user = await requirePermission("intercession", "create-forms", "/admin/intercession");
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
  await requirePermission("intercession", "edit-forms", "/admin/intercession");
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
  await requirePermission("intercession", "edit-forms", "/admin/intercession");
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
  await requirePermission("intercession", "edit-forms", "/admin/intercession");

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
  await requirePermission("intercession", "delete-forms", "/admin/intercession");

  await prisma.spiritualForm.delete({
    where: { id: formId },
  });

  revalidatePath("/admin/intercession");

  return { ok: true, message: "Form deleted." };
}

export async function submitSpiritualForm(formId: number, formData: FormData) {
  const user = await requirePermission("intercession", "submit-forms", "/admin/intercession");

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
  const answers = questions.reduce<Record<string, string | string[] | Record<string, string | string[]>>>((carry, question, index) => {
    const questionObject = question && typeof question === "object" && !Array.isArray(question) ? (question as Record<string, unknown>) : {};
    const key = `question_${index}`;
    if (questionObject.type === "checkboxes") {
      carry[key] = readValues(formData, key);
    } else if (questionObject.type === "multiple_choice_grid" || questionObject.type === "checkbox_grid") {
      const rows = Array.isArray(questionObject.rows) ? questionObject.rows : [];
      carry[key] = rows.reduce<Record<string, string | string[]>>((rowCarry, _row, rowIndex) => {
        const rowKey = `${key}_${rowIndex}`;
        rowCarry[rowKey] =
          questionObject.type === "checkbox_grid"
            ? readValues(formData, rowKey)
            : readString(formData, rowKey) ?? "";
        return rowCarry;
      }, {});
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

export async function saveSubmissionManualReview(formData: FormData) {
  await requirePermission("intercession", "view-submissions", "/admin/intercession");

  const submissionId = Number(readString(formData, "submissionId"));
  const gradesRaw = readString(formData, "grades");

  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    return { ok: false, message: "Invalid submission." };
  }

  if (!gradesRaw) {
    return { ok: false, message: "Review data is required." };
  }

  let grades: Array<{ questionIndex: number; correct: boolean; points: number }> = [];
  try {
    const parsed = JSON.parse(gradesRaw) as unknown;
    if (Array.isArray(parsed)) {
      grades = parsed
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const questionIndex = Number(record.questionIndex);
          const points = Number(record.points);
          return {
            questionIndex,
            correct: Boolean(record.correct),
            points: Number.isFinite(points) && points > 0 ? points : 1,
          };
        })
        .filter((item): item is { questionIndex: number; correct: boolean; points: number } =>
          item !== null && Number.isInteger(item.questionIndex),
        );
    }
  } catch {
    return { ok: false, message: "Invalid review data." };
  }

  if (grades.length === 0) {
    return { ok: false, message: "Tick at least one answer before saving review." };
  }

  const totalPoints = grades.reduce((sum, grade) => sum + grade.points, 0);
  const earnedPoints = grades.reduce((sum, grade) => sum + (grade.correct ? grade.points : 0), 0);
  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 1000) / 10 : null;

  const submission = await prisma.formSubmission.update({
    where: { id: submissionId },
    data: {
      manualGrades: grades,
      score,
    },
    select: { formId: true },
  });

  revalidatePath("/admin/intercession");
  revalidatePath(`/admin/intercession/forms/${submission.formId}/submissions`);

  return { ok: true, message: "Manual review saved." };
}
