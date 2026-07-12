"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getParentFamilyId() {
  const user = await requireAdminUser();
  const membership = await prisma.familyMember.findFirst({
    where: {
      userId: user.id,
      role: { equals: "parent", mode: "insensitive" },
    },
    select: { familyId: true },
  });

  if (membership) return { userId: user.id, familyId: membership.familyId };

  const family = await prisma.family.findFirst({
    where: { parentId: user.id },
    select: { id: true },
  });

  return family ? { userId: user.id, familyId: family.id } : null;
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function subtaskTitles(formData: FormData) {
  return formData.getAll("subtasks").map(String).map((value) => value.trim()).filter(Boolean);
}

export async function createParentTask(formData: FormData) {
  const parent = await getParentFamilyId();
  if (!parent) return { ok: false, message: "You are not associated with any family as a parent." };

  const title = readString(formData, "title");
  if (!title) return { ok: false, message: "Task title is required." };

  const subtasks = subtaskTitles(formData);
  if (subtasks.length === 0) return { ok: false, message: "You need at least one subtask." };

  await prisma.familyTask.create({
    data: {
      familyId: parent.familyId,
      title,
      description: readString(formData, "description") || null,
      dueDate: readString(formData, "dueDate") ? new Date(readString(formData, "dueDate")) : null,
      createdBy: parent.userId,
      subtasks: {
        create: subtasks.map((subtask) => ({ title: subtask })),
      },
    },
  });

  revalidatePath("/admin/parent");
  return { ok: true, message: "Task created successfully." };
}

export async function updateParentTask(formData: FormData) {
  const parent = await getParentFamilyId();
  if (!parent) return { ok: false, message: "You are not associated with any family as a parent." };

  const taskId = Number(formData.get("taskId"));
  const title = readString(formData, "title");
  if (!Number.isFinite(taskId) || !title) return { ok: false, message: "Invalid task details." };

  const task = await prisma.familyTask.findFirst({ where: { id: taskId, familyId: parent.familyId } });
  if (!task) return { ok: false, message: "Task not found." };

  const subtasks = subtaskTitles(formData);
  if (subtasks.length === 0) return { ok: false, message: "You need at least one subtask." };

  await prisma.$transaction([
    prisma.familyTask.update({
      where: { id: taskId },
      data: {
        title,
        description: readString(formData, "description") || null,
        dueDate: readString(formData, "dueDate") ? new Date(readString(formData, "dueDate")) : null,
      },
    }),
    prisma.taskSubtask.deleteMany({ where: { taskId } }),
    prisma.taskSubtask.createMany({
      data: subtasks.map((subtask) => ({ taskId, title: subtask })),
    }),
  ]);

  revalidatePath("/admin/parent");
  return { ok: true, message: "Task updated successfully." };
}

export async function deleteParentTask(formData: FormData) {
  const parent = await getParentFamilyId();
  if (!parent) return { ok: false, message: "You are not associated with any family as a parent." };

  const taskId = Number(formData.get("taskId"));
  const task = Number.isFinite(taskId) ? await prisma.familyTask.findFirst({ where: { id: taskId, familyId: parent.familyId } }) : null;
  if (!task) return { ok: false, message: "Task not found." };

  await prisma.familyTask.delete({ where: { id: taskId } });
  revalidatePath("/admin/parent");
  return { ok: true, message: "Task deleted successfully." };
}

export async function completeParentTask(formData: FormData) {
  const parent = await getParentFamilyId();
  if (!parent) return { ok: false, message: "You are not associated with any family as a parent." };

  const taskId = Number(formData.get("taskId"));
  const task = Number.isFinite(taskId) ? await prisma.familyTask.findFirst({ where: { id: taskId, familyId: parent.familyId } }) : null;
  if (!task) return { ok: false, message: "Task not found." };

  await prisma.familyTask.update({
    where: { id: taskId },
    data: {
      status: "completed",
      progress: 100,
      subtasks: { updateMany: { where: {}, data: { isCompleted: true, completedAt: new Date() } } },
    },
  });

  revalidatePath("/admin/parent");
  return { ok: true, message: "Task completed successfully." };
}

export async function toggleParentSubtask(formData: FormData) {
  const parent = await getParentFamilyId();
  if (!parent) return { ok: false, message: "You are not associated with any family as a parent." };

  const subtaskId = Number(formData.get("subtaskId"));
  const subtask = Number.isFinite(subtaskId)
    ? await prisma.taskSubtask.findFirst({ where: { id: BigInt(subtaskId), task: { familyId: parent.familyId } } })
    : null;
  if (!subtask) return { ok: false, message: "Subtask not found." };

  const next = !subtask.isCompleted;
  await prisma.taskSubtask.update({
    where: { id: subtask.id },
    data: { isCompleted: next, completedAt: next ? new Date() : null },
  });

  const all = await prisma.taskSubtask.findMany({ where: { taskId: subtask.taskId }, select: { isCompleted: true } });
  const completed = all.filter((item) => item.isCompleted).length;
  const progress = all.length > 0 ? Math.round((completed / all.length) * 100) : 0;
  await prisma.familyTask.update({
    where: { id: subtask.taskId },
    data: { progress, status: progress === 100 ? "completed" : progress > 0 ? "in-progress" : "pending" },
  });

  revalidatePath("/admin/parent");
  return { ok: true, message: "Subtask updated." };
}
