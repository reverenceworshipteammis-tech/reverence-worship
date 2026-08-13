"use server";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { del as deleteBlob, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser, requireAnyPermission, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUsers, userIdsWithPermission } from "@/lib/notifications";
import { intercessionRichTextToPlainText } from "@/lib/intercession-rich-text";
import { getIntercessionPublishingIssues, parseIntercessionQuestionCondition } from "@/lib/intercession-form-rules";
import {
  intercessionFormAvailability,
  intercessionGuestFieldConfigurationIssue,
  isIntercessionAnswerable,
  normalizeIntercessionRespondentName,
  parseIntercessionVisitorFields,
  parseIntercessionFormQuestions,
  parseIntercessionFormSettings,
  scoreIntercessionQuiz,
  visibleIntercessionQuestions,
  type IntercessionFormAnswer,
} from "@/lib/intercession-form-domain";
import {
  isManagedQuestionImagePath,
  MAX_QUESTION_IMAGE_BYTES,
  MAX_QUESTION_IMAGES,
  parseQuestionImages,
  questionImagePaths,
} from "@/lib/intercession-question-images";

const QUESTION_IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const RESPONSE_FILE_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};
const MAX_RESPONSE_FILE_BYTES = 10 * 1024 * 1024;
const QUESTION_LIBRARY_SETTING = "intercession_question_library";

async function notifyFormPublished(form: { id: number; title: string }, event: string) {
  await notifyUsers({
    userIds: await userIdsWithPermission("intercession", "submit-forms"),
    type: "form", title: "New form published", message: `${intercessionRichTextToPlainText(form.title)} is now available for submission.`,
    link: `/admin/intercession/forms/${form.id}/take`, sourceType: "spiritual_form", sourceId: form.id,
    dedupeKey: `form:${form.id}:published:${event}`,
  });
}

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

function formSubmissionErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "The form could not be submitted. Please try again.";
  if (error.name.startsWith("Prisma") || error.message.includes("prisma.") || error.message.includes("Raw query failed")) {
    console.error("Form submission database operation failed", error);
    return "The form could not be submitted. Please try again.";
  }
  return error.message;
}

function validateVisitorDetails(fieldsValue: unknown, formData: FormData) {
  const fields = parseIntercessionVisitorFields(fieldsValue);
  const details = [] as Array<{ fieldId: string; label: string; type: string; value: string | string[] }>;

  for (const field of fields) {
    const key = `visitor_${field.id}`;
    const value = field.type === "checkboxes"
      ? readValues(formData, key).map((item) => item.trim()).filter(Boolean).slice(0, 30)
      : (readString(formData, key) ?? "").slice(0, field.id === "full_name" ? 150 : 2000);
    const values = Array.isArray(value) ? value : value ? [value] : [];
    if (field.required && values.length === 0) return { ok: false as const, message: `${field.label} is required.` };
    if (field.type === "email" && values[0] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[0])) return { ok: false as const, message: `Enter a valid ${field.label.toLowerCase()}.` };
    if (field.type === "phone" && values[0] && !/^\+?[0-9][0-9 ()-]{4,29}$/.test(values[0])) return { ok: false as const, message: `Enter a valid ${field.label.toLowerCase()}.` };
    if (field.type === "number" && values[0] && !Number.isFinite(Number(values[0]))) return { ok: false as const, message: `${field.label} must be a number.` };
    if (field.type === "date" && values[0] && !/^\d{4}-\d{2}-\d{2}$/.test(values[0])) return { ok: false as const, message: `Enter a valid ${field.label.toLowerCase()}.` };
    if (["select", "checkboxes"].includes(field.type) && values.some((item) => !field.options.includes(item))) return { ok: false as const, message: `${field.label} contains an invalid option.` };
    details.push({ fieldId: field.id, label: field.label, type: field.type, value });
  }

  return { ok: true as const, details };
}

function getVisitorSettingsIssue(settings: Record<string, unknown>) {
  if (settings.require_login !== false) return null;
  return intercessionGuestFieldConfigurationIssue(settings.visitor_fields);
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

function sanitizeBuilderQuestions(value: unknown[]) {
  return value
    .map((question): Record<string, unknown> | null => {
      if (!question || typeof question !== "object" || Array.isArray(question)) return null;
      const item = question as Record<string, unknown>;
      return {
        ...item,
        id: typeof item.id === "string" && item.id ? item.id.slice(0, 100) : crypto.randomUUID(),
        images: parseQuestionImages(item.images),
        condition: parseIntercessionQuestionCondition(item.condition),
      };
    })
    .filter((question): question is Record<string, unknown> => question !== null);
}

async function isRecognizedQuestionImage(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (file.type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function saveQuestionImage(file: File) {
  const extension = QUESTION_IMAGE_MIME_EXTENSIONS[file.type];
  if (!extension || !(await isRecognizedQuestionImage(file))) {
    throw new Error("Only valid JPG, PNG, and WebP images are allowed.");
  }
  if (file.size > MAX_QUESTION_IMAGE_BYTES) {
    throw new Error("Each question image must be 3 MB or smaller.");
  }

  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/forms/${filename}`, file, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error("Form image uploads require Vercel Blob. Add BLOB_READ_WRITE_TOKEN in Vercel Environment Variables.");
  }

  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "forms");
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(path.join(uploadDirectory, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/forms/${filename}`;
}

async function deleteQuestionImageFile(imagePath: string) {
  if (!isManagedQuestionImagePath(imagePath)) return;

  if (imagePath.startsWith("https://")) {
    await deleteBlob(imagePath).catch(() => undefined);
    return;
  }

  const filename = path.basename(imagePath);
  await unlink(path.join(process.cwd(), "public", "uploads", "forms", filename)).catch(() => undefined);
}

async function deleteQuestionImagesIfUnreferenced(paths: string[]) {
  const candidates = [...new Set(paths.filter(isManagedQuestionImagePath))];
  if (candidates.length === 0) return;

  const forms = await prisma.spiritualForm.findMany({ select: { questions: true } });
  const referencedPaths = new Set(forms.flatMap((form) => questionImagePaths(form.questions)));
  await Promise.all(candidates.filter((imagePath) => !referencedPaths.has(imagePath)).map(deleteQuestionImageFile));
}

function revalidateSpiritualFormPaths(formId: number) {
  revalidatePath("/admin/intercession");
  revalidatePath(`/admin/intercession/forms/${formId}/edit`);
  revalidatePath(`/admin/intercession/forms/${formId}/take`);
  revalidatePath(`/admin/intercession/forms/${formId}/submissions`);
  revalidatePath(`/forms/${formId}`);
}

async function isRecognizedResponseFile(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (file.type === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (file.type === "application/pdf") return String.fromCharCode(...bytes.slice(0, 4)) === "%PDF";
  if (file.type === "application/msword") return bytes.slice(0, 8).every((value, index) => value === [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1][index]);
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return bytes[0] === 0x50 && bytes[1] === 0x4b;
  return false;
}

async function saveResponseFile(file: File) {
  const extension = RESPONSE_FILE_MIME_EXTENSIONS[file.type];
  if (!extension || !(await isRecognizedResponseFile(file))) throw new Error("Upload a valid JPG, PNG, WebP, PDF, DOC, or DOCX file.");
  if (file.size > MAX_RESPONSE_FILE_BYTES) throw new Error("Each response file must be 10 MB or smaller.");
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/form-answers/${filename}`, file, { access: "public", contentType: file.type });
    return blob.url;
  }
  if (process.env.VERCEL) throw new Error("File answers require Vercel Blob. Add BLOB_READ_WRITE_TOKEN in Vercel Environment Variables.");
  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "form-answers");
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(path.join(uploadDirectory, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/form-answers/${filename}`;
}

function isManagedResponseFilePath(value: string) {
  return value.startsWith("/uploads/form-answers/") || /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\/uploads\/form-answers\//.test(value);
}

async function deleteResponseFile(value: string) {
  if (!isManagedResponseFilePath(value)) return;
  if (value.startsWith("https://")) return void await deleteBlob(value).catch(() => undefined);
  await unlink(path.join(process.cwd(), "public", "uploads", "form-answers", path.basename(value))).catch(() => undefined);
}

function responseFilePaths(value: unknown): string[] {
  if (typeof value === "string") return isManagedResponseFilePath(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(responseFilePaths);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(responseFilePaths);
  return [];
}

export async function uploadSpiritualFormQuestionImages(formData: FormData) {
  await requireAnyPermission("intercession", ["create-forms", "edit-forms"], "/admin/intercession");
  const files = formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) return { ok: false, message: "Select at least one image.", images: [] };
  if (files.length > MAX_QUESTION_IMAGES) return { ok: false, message: "A question can contain no more than 5 images.", images: [] };

  const uploaded: string[] = [];
  try {
    for (const file of files) uploaded.push(await saveQuestionImage(file));
    return {
      ok: true,
      message: `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded.`,
      images: uploaded.map((imagePath) => ({ id: crypto.randomUUID(), path: imagePath, alt: "", caption: "" })),
    };
  } catch (error) {
    await Promise.all(uploaded.map(deleteQuestionImageFile));
    return { ok: false, message: error instanceof Error ? error.message : "The images could not be uploaded.", images: [] };
  }
}

export async function discardSpiritualFormQuestionImage(imagePath: string) {
  await requireAnyPermission("intercession", ["create-forms", "edit-forms"], "/admin/intercession");
  if (!isManagedQuestionImagePath(imagePath)) return { ok: false, message: "Invalid image path." };

  await deleteQuestionImagesIfUnreferenced([imagePath]);
  return { ok: true, message: "Image removed." };
}

function libraryQuestions(value: unknown) {
  return Array.isArray(value) ? sanitizeBuilderQuestions(value).slice(0, 100) : [];
}

export async function getSpiritualFormQuestionLibrary() {
  await requireAnyPermission("intercession", ["create-forms", "edit-forms"], "/admin/intercession");
  const setting = await prisma.systemSetting.findUnique({ where: { key: QUESTION_LIBRARY_SETTING }, select: { value: true } });
  return libraryQuestions(setting?.value);
}

export async function saveSpiritualFormQuestionToLibrary(questionValue: unknown) {
  await requireAnyPermission("intercession", ["create-forms", "edit-forms"], "/admin/intercession");
  const question = sanitizeBuilderQuestions([questionValue])[0];
  if (!question) return { ok: false, message: "Invalid question.", questions: [] };
  question.images = [];
  const current = await prisma.systemSetting.findUnique({ where: { key: QUESTION_LIBRARY_SETTING }, select: { value: true } });
  const questions = [...libraryQuestions(current?.value), question].slice(-100);
  await prisma.systemSetting.upsert({
    where: { key: QUESTION_LIBRARY_SETTING },
    update: { value: questions as Prisma.InputJsonValue },
    create: { key: QUESTION_LIBRARY_SETTING, value: questions as Prisma.InputJsonValue, group: "intercession" },
  });
  return { ok: true, message: "Question saved to the shared library.", questions };
}

export async function removeSpiritualFormQuestionFromLibrary(questionId: string) {
  await requireAnyPermission("intercession", ["create-forms", "edit-forms"], "/admin/intercession");
  const current = await prisma.systemSetting.findUnique({ where: { key: QUESTION_LIBRARY_SETTING }, select: { value: true } });
  const questions = libraryQuestions(current?.value).filter((question) => question.id !== questionId);
  await prisma.systemSetting.upsert({
    where: { key: QUESTION_LIBRARY_SETTING },
    update: { value: questions as Prisma.InputJsonValue },
    create: { key: QUESTION_LIBRARY_SETTING, value: questions as Prisma.InputJsonValue, group: "intercession" },
  });
  return { ok: true, message: "Question removed from the shared library.", questions };
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
  const priority = readString(formData, "priority") ?? "medium";
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
    priority,
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

  const form = await prisma.spiritualForm.create({
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

  if (isPublished) await notifyFormPublished(form, String(form.createdAt.getTime()));

  revalidatePath("/admin/intercession");

  return { ok: true, message: "Form created successfully." };
}

export async function createSpiritualFormFromBuilder(formData: FormData) {
  const user = await requirePermission("intercession", "create-forms", "/admin/intercession");
  const title = readString(formData, "title");

  if (!title || !intercessionRichTextToPlainText(title).trim()) {
    return { ok: false, message: "Form title is required." };
  }

  const questions = sanitizeBuilderQuestions(readJsonArray(formData, "questions"));
  const incomingSettings = readJsonObject(formData, "settings");
  const rawVisitorSettingsIssue = incomingSettings.require_login === false ? intercessionGuestFieldConfigurationIssue(incomingSettings.visitor_fields) : null;
  if (rawVisitorSettingsIssue) return { ok: false, message: rawVisitorSettingsIssue };
  const settings = {
    is_published: false,
    limit_one_response: true,
    release_grade: "never",
    allow_partial_points: true,
    ...incomingSettings,
    visitor_fields: parseIntercessionVisitorFields(incomingSettings.visitor_fields),
  };
  const visitorSettingsIssue = getVisitorSettingsIssue(settings);
  if (visitorSettingsIssue) return { ok: false, message: visitorSettingsIssue };
  if (Boolean((settings as Record<string, unknown>).is_published)) {
    const publishingIssues = getIntercessionPublishingIssues(title, questions, settings);
    if (publishingIssues.length > 0) return { ok: false, message: publishingIssues[0].message };
  }

  const form = await prisma.spiritualForm.create({
    data: {
      title,
      description: readString(formData, "description"),
      questions: questions as Prisma.InputJsonValue,
      settings,
      isActive: true,
      createdBy: user.id,
    },
  });

  if (Boolean((settings as Record<string, unknown>).is_published)) await notifyFormPublished(form, String(form.createdAt.getTime()));

  revalidatePath("/admin/intercession");

  return { ok: true, message: "Form created successfully." };
}

export async function duplicateSpiritualForm(formId: number) {
  const user = await requirePermission("intercession", "create-forms", "/admin/intercession");

  if (!Number.isFinite(formId) || formId <= 0) {
    return { ok: false, message: "Invalid form ID." };
  }

  const original = await prisma.spiritualForm.findUnique({
    where: { id: formId },
  });

  if (!original) {
    return { ok: false, message: "Form not found." };
  }

  const copy = await prisma.spiritualForm.create({
    data: {
      title: `Copy of ${original.title}`,
      description: original.description,
      questions: (original.questions ?? []) as Prisma.InputJsonValue,
      settings: {
        ...((original.settings as Record<string, unknown> | null) ?? {}),
        is_published: false,
      } as Prisma.InputJsonValue,
      isActive: original.isActive,
      createdBy: user.id,
    },
  });

  revalidatePath("/admin/intercession");

  return { ok: true, message: "Form duplicated successfully.", formId: copy.id };
}

export async function updateSpiritualFormFromBuilder(formId: number, formData: FormData) {
  await requirePermission("intercession", "edit-forms", "/admin/intercession");
  const title = readString(formData, "title");

  if (!title || !intercessionRichTextToPlainText(title).trim()) {
    return { ok: false, message: "Form title is required." };
  }

  const current = await prisma.spiritualForm.findUnique({
    where: { id: formId },
    select: { questions: true, settings: true },
  });

  if (!current) {
    return { ok: false, message: "Form not found." };
  }

  const questions = sanitizeBuilderQuestions(readJsonArray(formData, "questions"));
  const isAutosave = readBoolean(formData, "autosave");
  const rawIncomingSettings = readJsonObject(formData, "settings");
  const rawVisitorSettingsIssue = rawIncomingSettings.require_login === false ? intercessionGuestFieldConfigurationIssue(rawIncomingSettings.visitor_fields) : null;
  if (rawVisitorSettingsIssue) return { ok: false, message: rawVisitorSettingsIssue };
  const incomingSettings = {
    ...rawIncomingSettings,
    visitor_fields: parseIntercessionVisitorFields(rawIncomingSettings.visitor_fields),
  };
  const mergedSettings = {
    ...((current.settings as Record<string, unknown> | null) ?? {}),
    ...incomingSettings,
    ...(isAutosave ? { is_published: Boolean((current.settings as Record<string, unknown> | null)?.is_published) } : {}),
  };
  const visitorSettingsIssue = getVisitorSettingsIssue(mergedSettings);
  if (visitorSettingsIssue) return { ok: false, message: visitorSettingsIssue };
  if (Boolean(mergedSettings.is_published)) {
    const publishingIssues = getIntercessionPublishingIssues(title, questions, mergedSettings);
    if (publishingIssues.length > 0) return { ok: false, message: publishingIssues[0].message };
  }
  const removedImagePaths = questionImagePaths(current.questions).filter((imagePath) => !questionImagePaths(questions).includes(imagePath));
  const updated = await prisma.spiritualForm.update({
    where: { id: formId },
    data: {
      title,
      description: readString(formData, "description"),
      questions: questions as Prisma.InputJsonValue,
      settings: mergedSettings,
    },
  });

  const wasPublished = Boolean((current.settings as Record<string, unknown> | null)?.is_published);
  const isPublished = Boolean((updated.settings as Record<string, unknown> | null)?.is_published);
  if (!wasPublished && isPublished) {
    await notifyFormPublished(updated, String(updated.updatedAt.getTime()));
  } else if (wasPublished && !isPublished) {
    await prisma.notification.deleteMany({ where: { sourceType: "spiritual_form", sourceId: formId } });
  }

  revalidateSpiritualFormPaths(formId);
  if (!isAutosave) await deleteQuestionImagesIfUnreferenced(removedImagePaths);

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
  const wasPublished = Boolean((current?.settings as Record<string, unknown> | null)?.is_published);

  const updated = await prisma.spiritualForm.update({
    where: { id: formId },
    data: {
      title,
      description: readString(formData, "description"),
      questions: buildQuestions(formData),
      settings,
      isActive: true,
    },
  });

  const isPublished = Boolean((updated.settings as Record<string, unknown> | null)?.is_published);
  if (!wasPublished && isPublished) {
    await notifyFormPublished(updated, String(updated.updatedAt.getTime()));
  } else if (wasPublished && !isPublished) {
    await prisma.notification.deleteMany({ where: { sourceType: "spiritual_form", sourceId: formId } });
  }

  revalidateSpiritualFormPaths(formId);

  return { ok: true, message: "Form updated successfully." };
}

export async function toggleSpiritualFormPublish(formId: number) {
  await requireAnyPermission("intercession", ["publish-forms", "edit-forms"], "/admin/intercession");

  const form = await prisma.spiritualForm.findUnique({
    where: { id: formId },
    select: { settings: true, title: true, questions: true },
  });

  if (!form) {
    return { ok: false, message: "Form not found." };
  }

  const settings = (form.settings as Record<string, unknown> | null) ?? {};
  const nextPublished = !Boolean(settings.is_published);
  if (nextPublished) {
    const publishingIssues = getIntercessionPublishingIssues(form.title, form.questions, settings);
    if (publishingIssues.length > 0) {
      return { ok: false, message: `Cannot publish: ${publishingIssues[0].message}` };
    }
  }

  const updated = await prisma.spiritualForm.update({
    where: { id: formId },
    data: {
      settings: {
        ...settings,
        is_published: nextPublished,
      },
      ...(nextPublished ? { isActive: true } : {}),
    },
  });

  if (nextPublished) await notifyFormPublished(updated, String(updated.updatedAt.getTime()));
  else await prisma.notification.deleteMany({ where: { sourceType: "spiritual_form", sourceId: formId } });

  revalidateSpiritualFormPaths(formId);

  return { ok: true, message: nextPublished ? "Form published." : "Form unpublished." };
}

export async function setSpiritualFormArchived(formId: number, archived: boolean) {
  await requireAnyPermission("intercession", ["edit-forms", "manage-forms"], "/admin/intercession");
  if (!Number.isInteger(formId) || formId <= 0) return { ok: false, message: "Invalid form." };
  const form = await prisma.spiritualForm.findUnique({ where: { id: formId }, select: { settings: true } });
  if (!form) return { ok: false, message: "Form not found." };
  const settings = (form.settings as Record<string, unknown> | null) ?? {};
  await prisma.spiritualForm.update({
    where: { id: formId },
    data: { isActive: !archived, ...(archived ? { settings: { ...settings, is_published: false } } : {}) },
  });
  if (archived) await prisma.notification.deleteMany({ where: { sourceType: "spiritual_form", sourceId: formId } });
  revalidateSpiritualFormPaths(formId);
  return { ok: true, message: archived ? "Form archived." : "Form restored." };
}

export async function deleteSpiritualForm(formId: number) {
  await requirePermission("intercession", "delete-forms", "/admin/intercession");

  const form = await prisma.spiritualForm.findUnique({ where: { id: formId }, select: { questions: true, submissions: { select: { answers: true } } } });
  if (!form) return { ok: false, message: "Form not found." };
  const imagePaths = questionImagePaths(form.questions);

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { sourceType: "spiritual_form", sourceId: formId } }),
    prisma.spiritualForm.delete({ where: { id: formId } }),
  ]);

  revalidateSpiritualFormPaths(formId);
  await deleteQuestionImagesIfUnreferenced(imagePaths);
  await Promise.all(form.submissions.flatMap((submission) => responseFilePaths(submission.answers)).map(deleteResponseFile));

  return { ok: true, message: "Form deleted." };
}

export async function submitSpiritualForm(formId: number, formData: FormData) {
  const form = await prisma.spiritualForm.findUnique({
    where: { id: formId },
    select: { id: true, title: true, questions: true, settings: true, isActive: true, _count: { select: { submissions: true } } },
  });
  if (!form) return { ok: false, message: "Form not found." };

  const settings = parseIntercessionFormSettings(form.settings);
  const user = settings.require_login
    ? await requirePermission("intercession", "submit-forms", "/admin/intercession")
    : await getCurrentUser();
  const availability = intercessionFormAvailability(settings, form.isActive, form._count.submissions);
  if (availability) return { ok: false, message: availability };

  const respondentName = user?.name ?? normalizeIntercessionRespondentName(formData.get("respondent_name"));
  const visitorDetails = !user ? validateVisitorDetails(settings.visitor_fields, formData) : { ok: true as const, details: [] };
  if (!visitorDetails.ok) return { ok: false, message: visitorDetails.message };
  const visitorName = !user
    ? normalizeIntercessionRespondentName(visitorDetails.details.find((detail) => detail.fieldId === "full_name")?.value)
    : respondentName;
  if (!user && visitorName.length < 2) return { ok: false, message: "Enter your full name before submitting the form." };

  const questions = parseIntercessionFormQuestions(form.questions);
  const rawAnswers: Record<string, IntercessionFormAnswer> = {};
  const answersByQuestionId: Record<string, IntercessionFormAnswer> = {};
  const pendingFiles = new Map<number, File>();
  for (const [index, question] of questions.entries()) {
    if (!isIntercessionAnswerable(question.type)) continue;
    const key = `question_${index}`;
    let answer: IntercessionFormAnswer;
    if (question.type === "checkboxes") answer = readValues(formData, key);
    else if (["multiple_choice_grid", "checkbox_grid"].includes(question.type)) {
      answer = Object.fromEntries(question.rows.map((_row, rowIndex) => [
        `row_${rowIndex}`,
        question.type === "checkbox_grid" ? readValues(formData, `${key}_${rowIndex}`) : readString(formData, `${key}_${rowIndex}`) ?? "",
      ]));
    } else if (question.type === "file_upload") {
      const value = formData.get(key);
      if (value instanceof File && value.size > 0) pendingFiles.set(index, value);
      answer = value instanceof File && value.size > 0 ? value.name.slice(0, 500) : "";
    } else answer = (readString(formData, key) ?? "").slice(0, 20_000);
    rawAnswers[key] = answer;
    answersByQuestionId[question.id] = answer;
  }

  const visible = visibleIntercessionQuestions(questions, answersByQuestionId);
  const visibleIndexes = new Set(visible.filter(({ question }) => isIntercessionAnswerable(question.type)).map(({ index }) => index));
  const answers: Record<string, IntercessionFormAnswer> = {};
  for (const { question, index } of visible) {
    if (!isIntercessionAnswerable(question.type)) continue;
    const key = `question_${index}`;
    const answer = rawAnswers[key];
    const values = Array.isArray(answer)
      ? answer
      : answer && typeof answer === "object"
        ? Object.values(answer).flatMap((value) => Array.isArray(value) ? value : [value])
        : [answer];
    const nonEmpty = values.some((value) => String(value ?? "").trim());
    if (question.required && !nonEmpty) return { ok: false, message: `Please answer required question ${index + 1}.` };
    if (["multiple_choice", "dropdown", "checkboxes"].includes(question.type)) {
      if (values.some((value) => value && !question.options.includes(String(value)))) return { ok: false, message: `Question ${index + 1} contains an invalid option.` };
    }
    if (["linear_scale", "rating"].includes(question.type) && nonEmpty) {
      const selected = Number(values[0]);
      const min = question.type === "rating" ? 1 : question.min;
      if (!Number.isInteger(selected) || selected < min || selected > question.max) return { ok: false, message: `Question ${index + 1} contains an invalid value.` };
    }
    if (question.type === "date" && nonEmpty && !/^\d{4}-\d{2}-\d{2}$/.test(String(values[0]))) return { ok: false, message: `Question ${index + 1} contains an invalid date.` };
    if (question.type === "time" && nonEmpty && !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(values[0]))) return { ok: false, message: `Question ${index + 1} contains an invalid time.` };
    if (["multiple_choice_grid", "checkbox_grid"].includes(question.type)) {
      const rows = answer && typeof answer === "object" && !Array.isArray(answer) ? answer : {};
      for (const [rowIndex, row] of question.rows.entries()) {
        const selected = rows[`row_${rowIndex}`];
        const rowValues = Array.isArray(selected) ? selected : selected ? [selected] : [];
        if (question.required && rowValues.length === 0) return { ok: false, message: `Please answer ${row} in question ${index + 1}.` };
        if (rowValues.some((value) => !question.columns.includes(value))) return { ok: false, message: `Question ${index + 1} contains an invalid grid option.` };
      }
    }
    answers[key] = answer;
  }

  const uploadedFiles: string[] = [];
  try {
    for (const [index, file] of pendingFiles) {
      if (!visibleIndexes.has(index)) continue;
      const uploaded = await saveResponseFile(file);
      uploadedFiles.push(uploaded);
      answers[`question_${index}`] = uploaded;
      answersByQuestionId[questions[index].id] = uploaded;
    }
  } catch (error) {
    await Promise.all(uploadedFiles.map(deleteResponseFile));
    return { ok: false, message: error instanceof Error ? error.message : "The answer file could not be uploaded." };
  }

  const responseKeyRaw = readString(formData, "respondentKey") ?? "";
  const responseKey = user ? `user:${user.id}` : /^[a-zA-Z0-9:_-]{8,200}$/.test(responseKeyRaw) ? `guest:${responseKeyRaw}` : "";
  if (!user && settings.limit_one_response && !responseKey) {
    await Promise.all(uploadedFiles.map(deleteResponseFile));
    return { ok: false, message: "Your browser could not create a response key. Refresh this page and try again." };
  }
  if (responseKey) answers.__respondentKey = responseKey;

  const quizResult = settings.is_quiz
    ? scoreIntercessionQuiz(questions, answers, visibleIndexes, settings.allow_partial_points)
    : { score: null, grades: [] };

  try {
    const submission = await prisma.$transaction(async (tx) => {
      const lockKey = `intercession-form:${formId}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))::text AS "lock"`;
      const freshForm = await tx.spiritualForm.findUnique({ where: { id: formId }, select: { settings: true, isActive: true, _count: { select: { submissions: true } } } });
      if (!freshForm) throw new Error("Form not found.");
      const freshSettings = parseIntercessionFormSettings(freshForm.settings);
      const freshAvailability = intercessionFormAvailability(freshSettings, freshForm.isActive, freshForm._count.submissions);
      if (freshAvailability) throw new Error(freshAvailability);
      if (settings.limit_one_response) {
        if (user && await tx.formSubmission.findFirst({ where: { formId, userId: user.id }, select: { id: true } })) throw new Error("You already submitted this form.");
        if (!user) {
          const existingAnswers = await tx.formSubmission.findMany({ where: { formId, userId: null }, select: { answers: true } });
          if (existingAnswers.some((item) => (item.answers as Record<string, unknown> | null)?.__respondentKey === responseKey)) throw new Error("You already submitted this form from this browser.");
        }
      }
      const releaseNow = settings.is_quiz && settings.release_grade === "immediately";
      const created = await tx.formSubmission.create({
        data: {
          formId, userId: user?.id ?? null, respondentName: visitorName,
          respondentDetails: !user ? visitorDetails.details as Prisma.InputJsonValue : undefined,
          answers: answers as Prisma.InputJsonValue,
          manualGrades: settings.is_quiz ? quizResult.grades as Prisma.InputJsonValue : undefined,
          score: settings.is_quiz ? quizResult.score : null,
          isReleased: releaseNow, releasedAt: releaseNow ? new Date() : null,
        },
      });
      if (user) await tx.notification.deleteMany({ where: { userId: user.id, sourceType: "spiritual_form", sourceId: formId } });
      return created;
    }, { isolationLevel: "ReadCommitted" });

    if (settings.notify_on_submit) {
      const adminIds = [...new Set([
        ...await userIdsWithPermission("intercession", "view-submissions"),
        ...await userIdsWithPermission("intercession", "view-results"),
      ])];
      await notifyUsers({
        userIds: adminIds, type: "form", title: "New form response",
        message: `${visitorName} submitted ${intercessionRichTextToPlainText(form.title)}.`,
        link: `/admin/intercession/forms/${form.id}/submissions`, sourceType: "form_submission", sourceId: submission.id,
        dedupeKey: `form-submission:${submission.id}`,
      });
    }
    revalidatePath("/admin/intercession");
    revalidatePath(`/admin/intercession/forms/${form.id}/submissions`);
    return { ok: true, message: settings.thank_you_message, redirectUrl: settings.redirect_url, score: settings.release_grade === "immediately" ? quizResult.score : null };
  } catch (error) {
    await Promise.all(uploadedFiles.map(deleteResponseFile));
    return { ok: false, message: formSubmissionErrorMessage(error) };
  }
}

export async function saveSubmissionManualReview(formData: FormData) {
  await requirePermission("intercession", "view-results", "/admin/intercession");

  const submissionId = Number(readString(formData, "submissionId"));
  const gradesRaw = readString(formData, "grades");

  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    return { ok: false, message: "Invalid submission." };
  }

  if (!gradesRaw) {
    return { ok: false, message: "Review data is required." };
  }

  const currentSubmission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    select: { form: { select: { questions: true, settings: true } } },
  });
  if (!currentSubmission) return { ok: false, message: "Submission not found." };
  const reviewSettings = parseIntercessionFormSettings(currentSubmission.form.settings);
  if (!reviewSettings.is_quiz) return { ok: false, message: "Only quiz submissions can be graded." };
  const reviewQuestions = parseIntercessionFormQuestions(currentSubmission.form.questions);

  let grades: Array<{ questionIndex: number; correct: boolean; points: number; earnedPoints: number }> = [];
  try {
    const parsed = JSON.parse(gradesRaw) as unknown;
    if (Array.isArray(parsed)) {
      grades = parsed
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const questionIndex = Number(record.questionIndex);
          const question = reviewQuestions[questionIndex];
          if (!question || !isIntercessionAnswerable(question.type) || question.type === "file_upload") return null;
          const requestedEarnedPoints = Number(record.earnedPoints);
          const earnedPoints = Number.isFinite(requestedEarnedPoints)
            ? Math.min(question.points, Math.max(0, Math.round(requestedEarnedPoints * 100) / 100))
            : Boolean(record.correct) ? question.points : 0;
          return {
            questionIndex,
            correct: earnedPoints >= question.points,
            points: question.points,
            earnedPoints,
          };
        })
        .filter((item): item is { questionIndex: number; correct: boolean; points: number; earnedPoints: number } =>
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
  const earnedPoints = grades.reduce((sum, grade) => sum + grade.earnedPoints, 0);
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

export async function setSubmissionRelease(submissionId: number, release: boolean) {
  await requirePermission("intercession", "view-results", "/admin/intercession");

  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    return { ok: false, message: "Invalid submission." };
  }

  const submission = await prisma.formSubmission.update({
    where: { id: submissionId },
    data: {
      isReleased: release,
      releasedAt: release ? new Date() : null,
    },
    select: { formId: true, userId: true, form: { select: { title: true, settings: true } } },
  });

  const settings = parseIntercessionFormSettings(submission.form.settings);
  if (release && submission.userId && settings.notify_user_on_review) {
    await notifyUsers({
      userIds: [submission.userId], type: "form", title: "Form response reviewed",
      message: `Your response to ${intercessionRichTextToPlainText(submission.form.title)} is ready.`,
      link: "/admin/intercession?section=results", sourceType: "form_submission", sourceId: submissionId,
      dedupeKey: `form-submission:${submissionId}:reviewed`,
    });
  }

  revalidatePath("/admin/intercession");
  revalidatePath(`/admin/intercession/forms/${submission.formId}/submissions`);

  return { ok: true, message: release ? "Submission released." : "Submission hidden." };
}

export async function setAllSubmissionRelease(formId: number, release: boolean) {
  await requirePermission("intercession", "view-results", "/admin/intercession");

  if (!Number.isInteger(formId) || formId <= 0) {
    return { ok: false, message: "Invalid form." };
  }

  const form = await prisma.spiritualForm.findUnique({ where: { id: formId }, select: { title: true, settings: true } });
  if (!form) return { ok: false, message: "Form not found." };
  const notify = release && parseIntercessionFormSettings(form.settings).notify_user_on_review;
  const recipients = notify ? await prisma.formSubmission.findMany({ where: { formId, score: { not: null }, isReleased: false, userId: { not: null } }, select: { id: true, userId: true } }) : [];
  await prisma.formSubmission.updateMany({
    where: { formId, score: { not: null }, ...(release ? { isReleased: false } : { isReleased: true }) },
    data: {
      isReleased: release,
      releasedAt: release ? new Date() : null,
    },
  });

  if (notify) {
    for (const submission of recipients) {
      if (!submission.userId) continue;
      await notifyUsers({
        userIds: [submission.userId], type: "form", title: "Form response reviewed",
        message: `Your response to ${intercessionRichTextToPlainText(form.title)} is ready.`,
        link: "/admin/intercession?section=results", sourceType: "form_submission", sourceId: submission.id,
        dedupeKey: `form-submission:${submission.id}:reviewed`,
      });
    }
  }

  revalidatePath("/admin/intercession");
  revalidatePath(`/admin/intercession/forms/${formId}/submissions`);

  return { ok: true, message: release ? "Pending submissions released." : "Released submissions hidden." };
}

export async function deleteFormSubmission(submissionId: number) {
  await requirePermission("intercession", "delete-forms", "/admin/intercession");

  if (!Number.isInteger(submissionId) || submissionId <= 0) {
    return { ok: false, message: "Invalid submission." };
  }

  const existing = await prisma.formSubmission.findUnique({ where: { id: submissionId }, select: { formId: true, answers: true } });
  if (!existing) return { ok: false, message: "Submission not found." };
  await prisma.formSubmission.delete({ where: { id: submissionId } });
  const submission = existing;
  await Promise.all(responseFilePaths(existing.answers).map(deleteResponseFile));

  revalidatePath("/admin/intercession");
  revalidatePath(`/admin/intercession/forms/${submission.formId}/submissions`);

  return { ok: true, message: "Submission deleted." };
}
