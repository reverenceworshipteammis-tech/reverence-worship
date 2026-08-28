"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { getUserPermissionSet, permissionSetHas, requireUser } from "@/lib/auth";
import {
  actionPlanTaskSignature,
  MAX_ACTION_PLAN_IMPORT_BYTES,
  parseActionPlanTaskImport,
} from "@/lib/action-plan-task-import";
import { prisma } from "@/lib/prisma";

const DEPARTMENT_ACCESS: Record<string, { page: string; route: string; inProgressStatus: string }> = {
  "music-ministry": { page: "music-ministry", route: "/admin/music", inProgressStatus: "in_progress" },
  intercession: { page: "intercession", route: "/admin/intercession", inProgressStatus: "in_progress" },
  "social-fellowship": { page: "social-fellowship", route: "/admin/social-fellowship", inProgressStatus: "in_progress" },
  discipline: { page: "discipline", route: "/admin/discipline", inProgressStatus: "in_progress" },
  finance: { page: "finance", route: "/admin/finance", inProgressStatus: "in_progress" },
};

export type ActionPlanTaskImportActionResult = { ok: boolean; message: string };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateOnly(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function validDateValue(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return dateOnly(value).toISOString().slice(0, 10) === value;
}

function boundedProgress(value: FormDataEntryValue | null) {
  const progress = Number(value ?? 0);
  return Number.isFinite(progress) && progress >= 0 && progress <= 100 ? Math.round(progress) : null;
}

async function authorizeDepartment(department: string) {
  const user = await requireUser();
  const access = DEPARTMENT_ACCESS[department];
  if (!access) return { ok: false as const, message: "Department not found." };
  const permissions = await getUserPermissionSet(user);
  if (!permissionSetHas(permissions, access.page, "manage-action-plans")) {
    return { ok: false as const, message: "You do not have permission to manage action plans for this department." };
  }
  return { ok: true as const, user, access };
}

function revalidateDepartment(route: string) {
  revalidatePath(route);
  revalidatePath("/admin/action-plans");
}

export async function saveDepartmentActionPlan(department: string, formData: FormData): Promise<ActionPlanTaskImportActionResult> {
  const authorization = await authorizeDepartment(department);
  if (!authorization.ok) return authorization;
  const id = Number(readString(formData, "id"));
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const startDateValue = readString(formData, "startDate");
  const dueDateValue = readString(formData, "dueDate");
  const year = Number(readString(formData, "year") ?? new Date().getFullYear());
  if (!title || !validDateValue(startDateValue) || !validDateValue(dueDateValue)) {
    return { ok: false, message: "Action plan name, start date, and completion date are required." };
  }
  if (title.length > 250 || (description?.length ?? 0) > 4_000) {
    return { ok: false, message: "Keep the action plan name under 250 characters and the description under 4,000 characters." };
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, message: "Select a valid action-plan year." };
  if (startDateValue! > dueDateValue!) return { ok: false, message: "Completion date cannot be before the start date." };

  if (Number.isInteger(id) && id > 0) {
    const existing = await prisma.actionPlan.findFirst({ where: { id, department }, select: { id: true } });
    if (!existing) return { ok: false, message: "Action plan not found." };
    await prisma.actionPlan.update({
      where: { id },
      data: { title, description, startDate: dateOnly(startDateValue!), dueDate: dateOnly(dueDateValue!), year },
    });
  } else {
    await prisma.actionPlan.create({
      data: {
        title,
        description,
        startDate: dateOnly(startDateValue!),
        dueDate: dateOnly(dueDateValue!),
        department,
        year,
        createdBy: authorization.user.id,
      },
    });
  }
  revalidateDepartment(authorization.access.route);
  return { ok: true, message: Number.isInteger(id) && id > 0 ? "Action plan updated successfully." : "Action plan created successfully." };
}

export async function deleteDepartmentActionPlan(department: string, id: number): Promise<ActionPlanTaskImportActionResult> {
  const authorization = await authorizeDepartment(department);
  if (!authorization.ok) return authorization;
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Action plan not found." };
  const existing = await prisma.actionPlan.findFirst({ where: { id, department }, select: { id: true } });
  if (!existing) return { ok: false, message: "Action plan not found." };
  await prisma.actionPlan.delete({ where: { id } });
  revalidateDepartment(authorization.access.route);
  return { ok: true, message: "Action plan deleted successfully." };
}

export async function saveDepartmentActionPlanTask(department: string, formData: FormData): Promise<ActionPlanTaskImportActionResult> {
  const authorization = await authorizeDepartment(department);
  if (!authorization.ok) return authorization;
  const id = Number(readString(formData, "id"));
  const actionPlanId = Number(readString(formData, "actionPlanId"));
  const activity = readString(formData, "activity");
  const targetMilestone = readString(formData, "targetMilestone");
  const budgetValue = readString(formData, "estimatedBudget") ?? "0";
  const estimatedBudget = Number(budgetValue.replace(/,/g, ""));
  const startDateValue = readString(formData, "startDate");
  const deadlineValue = readString(formData, "deadline");
  const priority = (readString(formData, "priority") ?? "medium").toLowerCase();
  const progress = boundedProgress(formData.get("progress"));
  if (!Number.isInteger(actionPlanId) || actionPlanId <= 0 || !activity || !targetMilestone || !validDateValue(deadlineValue)) {
    return { ok: false, message: "Action plan, activity, milestone, and deadline are required." };
  }
  if (activity.length > 500 || targetMilestone.length > 1_000) return { ok: false, message: "The activity or milestone is too long." };
  if (!Number.isFinite(estimatedBudget) || estimatedBudget < 0 || estimatedBudget > 999_999_999_999.99) return { ok: false, message: "Enter a valid non-negative estimated budget." };
  if (startDateValue && !validDateValue(startDateValue)) return { ok: false, message: "Enter a valid start date." };
  if (startDateValue && startDateValue > deadlineValue!) return { ok: false, message: "Task deadline cannot be before its start date." };
  if (!["low", "medium", "high"].includes(priority)) return { ok: false, message: "Select a valid priority." };
  if (progress === null) return { ok: false, message: "Progress must be between 0 and 100." };
  const plan = await prisma.actionPlan.findFirst({ where: { id: actionPlanId, department }, select: { id: true } });
  if (!plan) return { ok: false, message: "Action plan not found." };
  if (Number.isInteger(id) && id > 0) {
    const existingTask = await prisma.actionPlanTask.findFirst({ where: { id, actionPlanId }, select: { id: true } });
    if (!existingTask) return { ok: false, message: "Task not found." };
  }
  const now = new Date();
  const data = {
    actionPlanId,
    taskName: activity,
    activity,
    targetMilestone,
    estimatedBudget,
    startDate: startDateValue ? dateOnly(startDateValue) : null,
    deadline: dateOnly(deadlineValue!),
    priority,
    progress,
    status: progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "pending",
    startedAt: progress > 0 ? now : null,
    completedAt: progress >= 100 ? now : null,
  };
  await prisma.$transaction(async (transaction) => {
    if (Number.isInteger(id) && id > 0) await transaction.actionPlanTask.update({ where: { id }, data });
    else await transaction.actionPlanTask.create({ data });
    await syncActionPlanProgress(transaction, actionPlanId);
  });
  revalidateDepartment(authorization.access.route);
  return { ok: true, message: Number.isInteger(id) && id > 0 ? "Task updated successfully." : "Task created successfully." };
}

export async function deleteDepartmentActionPlanTask(department: string, id: number): Promise<ActionPlanTaskImportActionResult> {
  const authorization = await authorizeDepartment(department);
  if (!authorization.ok) return authorization;
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Task not found." };
  const task = await prisma.actionPlanTask.findFirst({
    where: { id, actionPlan: { department } },
    select: { id: true, actionPlanId: true },
  });
  if (!task) return { ok: false, message: "Task not found." };
  await prisma.$transaction(async (transaction) => {
    await transaction.actionPlanTask.delete({ where: { id: task.id } });
    await syncActionPlanProgress(transaction, task.actionPlanId);
  });
  revalidateDepartment(authorization.access.route);
  return { ok: true, message: "Task deleted successfully." };
}

async function syncActionPlanProgress(transaction: Prisma.TransactionClient, actionPlanId: number) {
  const aggregate = await transaction.actionPlanTask.aggregate({ where: { actionPlanId }, _avg: { progress: true } });
  const progress = Math.round(aggregate._avg.progress ?? 0);
  const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "pending";
  await transaction.actionPlan.update({ where: { id: actionPlanId }, data: { progress, status } });
}

export async function importActionPlanTasks(formData: FormData): Promise<ActionPlanTaskImportActionResult> {
  const user = await requireUser();
  const actionPlanId = Number(formData.get("actionPlanId"));
  const file = formData.get("file");
  if (!Number.isInteger(actionPlanId) || actionPlanId <= 0) return { ok: false, message: "Action plan not found." };
  if (!(file instanceof File) || !file.name || file.size === 0) return { ok: false, message: "Choose an Excel or CSV file to import." };
  if (file.size > MAX_ACTION_PLAN_IMPORT_BYTES) return { ok: false, message: "The import file must be 2 MB or smaller." };

  const plan = await prisma.actionPlan.findUnique({
    where: { id: actionPlanId },
    select: {
      id: true,
      title: true,
      department: true,
      tasks: { select: { activity: true, taskName: true, targetMilestone: true, deadline: true } },
    },
  });
  if (!plan) return { ok: false, message: "Action plan not found." };
  const access = DEPARTMENT_ACCESS[plan.department];
  const permissions = await getUserPermissionSet(user);
  if (!access || !permissionSetHas(permissions, access.page, "manage-action-plans")) {
    return { ok: false, message: "You do not have permission to import tasks for this department." };
  }

  const parsed = await parseActionPlanTaskImport(file.name, new Uint8Array(await file.arrayBuffer()));
  if (!parsed.ok) return parsed;

  const signatures = new Set(plan.tasks.filter((task) => task.deadline).map((task) => actionPlanTaskSignature({
    activity: task.activity ?? task.taskName,
    targetMilestone: task.targetMilestone ?? "",
    deadline: task.deadline!,
  })));
  let duplicates = 0;
  const rows = parsed.rows.filter((row) => {
    const signature = actionPlanTaskSignature(row);
    if (signatures.has(signature)) { duplicates += 1; return false; }
    signatures.add(signature);
    return true;
  });
  if (!rows.length) {
    return { ok: false, message: `No new tasks were found. ${duplicates} duplicate task${duplicates === 1 ? " was" : "s were"} skipped.` };
  }

  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    await transaction.actionPlanTask.createMany({
      data: rows.map((row): Prisma.ActionPlanTaskCreateManyInput => ({
        actionPlanId: plan.id,
        taskName: row.activity,
        activity: row.activity,
        targetMilestone: row.targetMilestone,
        estimatedBudget: row.estimatedBudget,
        startDate: row.startDate,
        deadline: row.deadline,
        priority: row.priority,
        progress: row.progress,
        status: row.progress >= 100 ? "completed" : row.progress > 0 ? access.inProgressStatus : "pending",
        startedAt: row.progress > 0 ? now : null,
        completedAt: row.progress >= 100 ? now : null,
      })),
    });
    const aggregate = await transaction.actionPlanTask.aggregate({ where: { actionPlanId: plan.id }, _avg: { progress: true } });
    const progress = Math.round(aggregate._avg.progress ?? 0);
    const status = progress >= 100 ? "completed" : progress > 0 ? access.inProgressStatus : "pending";
    await transaction.actionPlan.update({ where: { id: plan.id }, data: { progress, status } });
    await transaction.activityLog.create({
      data: {
        userId: user.id,
        action: "action-plan.tasks.imported",
        module: plan.department,
        metadata: { actionPlanId: plan.id, actionPlanTitle: plan.title, imported: rows.length, duplicates, filename: file.name.slice(0, 200) },
      },
    });
  });

  revalidatePath(access.route);
  revalidatePath("/admin/action-plans");
  return {
    ok: true,
    message: `${rows.length} task${rows.length === 1 ? "" : "s"} imported successfully${duplicates ? `; ${duplicates} duplicate${duplicates === 1 ? " was" : "s were"} skipped` : ""}.`,
  };
}
