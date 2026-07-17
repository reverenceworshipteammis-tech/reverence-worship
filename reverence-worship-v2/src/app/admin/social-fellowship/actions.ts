"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notifications";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(formData: FormData, key: string) {
  const value = readString(formData, key);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function createSocialFamily(formData: FormData) {
  const user = await requirePermission("social-fellowship", "manage-families");
  const name = readString(formData, "name");

  if (!name) {
    return { ok: false, message: "Family name is required." };
  }

  const year = readNumber(formData, "year") ?? new Date().getFullYear();
  const parentId = readNumber(formData, "parentId");

  if (parentId) {
    const existingMember = await prisma.familyMember.findUnique({
      where: { userId: parentId },
      select: { id: true },
    });

    if (existingMember) {
      return { ok: false, message: "Selected parent is already assigned to a family." };
    }
  }

  await prisma.$transaction(async (tx) => {
    const family = await tx.family.create({
      data: {
        name,
        year,
        parentId,
        parentName: readString(formData, "parentName"),
        description: readString(formData, "description"),
        motto: readString(formData, "motto"),
        createdBy: user.id,
      },
    });

    if (parentId) {
      await tx.familyMember.create({
        data: {
          familyId: family.id,
          userId: parentId,
          role: "parent",
          status: "active",
        },
      });
    }
  });

  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "Family created successfully." };
}

export async function deleteSocialFamily(familyId: number) {
  await requirePermission("social-fellowship", "delete-families");

  await prisma.family.delete({
    where: { id: familyId },
  });

  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "Family deleted." };
}

export async function assignUserToSocialFamily(formData: FormData) {
  await requirePermission("social-fellowship", "manage-family-members");
  const userId = readNumber(formData, "userId");
  const familyId = readNumber(formData, "familyId");
  const role = readString(formData, "role") ?? "member";

  if (!userId || !familyId) {
    return { ok: false, message: "Select a user and family." };
  }

  const existingMember = await prisma.familyMember.findUnique({
    where: { userId },
    include: { family: true },
  });

  if (existingMember) {
    return { ok: false, message: `User is already assigned to ${existingMember.family.name}.` };
  }

  await prisma.familyMember.create({
    data: {
      familyId,
      userId,
      role,
      status: "active",
    },
  });

  const family = await prisma.family.findUnique({ where: { id: familyId }, select: { name: true, parentId: true } });
  await notifyUsers({ userIds: [userId, ...(family?.parentId ? [family.parentId] : [])], type: "family", title: "Family assignment updated", message: `The user was assigned to ${family?.name ?? "a family"}.`, link: "/admin/family", sourceType: "family", sourceId: familyId, dedupeKey: `family:${familyId}:assigned:${userId}` });

  if (role === "parent") {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await prisma.family.update({
      where: { id: familyId },
      data: {
        parentId: userId,
        parentName: user?.name ?? null,
      },
    });
  }

  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "User assigned to family successfully." };
}

export async function removeUserFromSocialFamily(userId: number, familyId: number) {
  await requirePermission("social-fellowship", "manage-family-members");

  await prisma.familyMember.delete({
    where: { userId },
  });

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { parentId: true, name: true },
  });

  if (family?.parentId === userId) {
    await prisma.family.update({
      where: { id: familyId },
      data: {
        parentId: null,
        parentName: null,
      },
    });
  }

  await notifyUsers({ userIds: [userId, ...(family?.parentId ? [family.parentId] : [])], type: "family", title: "Family assignment removed", message: `The user was removed from ${family?.name ?? "the family"}.`, link: "/admin/family", sourceType: "family", sourceId: familyId, dedupeKey: `family:${familyId}:removed:${userId}:${Date.now()}` });

  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "User removed from family." };
}

export async function updateSocialFamilyParent(formData: FormData) {
  await requirePermission("social-fellowship", "manage-family-members");
  const familyId = readNumber(formData, "familyId");
  const parentId = readNumber(formData, "parentId");

  if (!familyId) return { ok: false, message: "Family is required." };

  const family = await prisma.family.findUnique({ where: { id: familyId }, select: { parentId: true } });

  if (parentId) {
    const existingMember = await prisma.familyMember.findUnique({ where: { userId: parentId } });
    if (existingMember && existingMember.familyId !== familyId) {
      return { ok: false, message: "Selected parent is already assigned to another family." };
    }

    // create member if not exists
    if (!existingMember) {
      await prisma.familyMember.create({ data: { familyId, userId: parentId, role: "parent", status: "active" } });
    } else if (existingMember.familyId === familyId) {
      // update role to parent if already in same family
      await prisma.familyMember.update({ where: { userId: parentId }, data: { role: "parent" } });
    }

    // demote old parent if different
    if (family?.parentId && family.parentId !== parentId) {
      await prisma.familyMember.updateMany({ where: { userId: family.parentId }, data: { role: "member" } });
    }

    const user = await prisma.user.findUnique({ where: { id: parentId }, select: { name: true } });
    await prisma.family.update({ where: { id: familyId }, data: { parentId, parentName: user?.name ?? null } });
  } else {
    // remove parent
    await prisma.family.update({ where: { id: familyId }, data: { parentId: null, parentName: null } });
    if (family?.parentId) {
      await prisma.familyMember.updateMany({ where: { userId: family.parentId }, data: { role: "member" } });
    }
  }

  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "Family parent updated." };
}

function readStringList(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

type ActionPlanTaskInput = {
  taskName?: string;
  activity?: string;
  targetMilestone?: string;
  estimatedBudget?: string;
  startDate?: string;
  deadline?: string;
  priority?: string;
  progress?: number;
  assignedTo?: string;
};

function readDate(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value ? new Date(value) : null;
}

function readActionPlanTasks(formData: FormData) {
  const value = readString(formData, "tasksJson");
  if (!value) return [];

  try {
    const tasks = JSON.parse(value) as ActionPlanTaskInput[];
    return tasks
      .filter((task) => task.taskName?.trim())
      .map((task) => {
        const progress = Number(task.progress ?? 0);
        const assignedTo = task.assignedTo ? Number(task.assignedTo) : null;
        return {
          taskName: task.taskName!.trim(),
          activity: task.activity?.trim() || null,
          targetMilestone: task.targetMilestone?.trim() || null,
          estimatedBudget: task.estimatedBudget?.trim() || "0",
          startDate: task.startDate ? new Date(task.startDate) : null,
          deadline: task.deadline ? new Date(task.deadline) : null,
          priority: task.priority || "medium",
          progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0,
          assignedTo: Number.isFinite(assignedTo) ? assignedTo : null,
          status: progress >= 100 ? "completed" : progress > 0 ? "in-progress" : "pending",
          startedAt: progress > 0 ? new Date() : null,
          completedAt: progress >= 100 ? new Date() : null,
        };
      });
  } catch {
    return [];
  }
}

async function syncActionPlanProgress(actionPlanId: number) {
  const tasks = await prisma.actionPlanTask.findMany({
    where: { actionPlanId },
    select: { progress: true },
  });
  const progress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0;
  const status = progress === 100 ? "completed" : progress > 0 ? "in-progress" : "pending";

  await prisma.actionPlan.update({
    where: { id: actionPlanId },
    data: { progress, status },
  });
}

async function syncTaskProgress(taskId: number) {
  const subtasks = await prisma.taskSubtask.findMany({
    where: { taskId },
    select: { isCompleted: true },
  });
  const completed = subtasks.filter((subtask) => subtask.isCompleted).length;
  const progress = subtasks.length ? Math.round((completed / subtasks.length) * 100) : 0;
  const status = progress === 100 ? "completed" : progress > 0 ? "in-progress" : "pending";

  await prisma.familyTask.update({
    where: { id: taskId },
    data: { progress, status },
  });
}

export async function createSocialTask(formData: FormData) {
  const user = await requirePermission("social-fellowship", "manage-family-tasks");
  const title = readString(formData, "title");
  const familyId = readNumber(formData, "familyId");
  const subtasks = readStringList(formData, "subtasks");

  if (!title || !familyId) {
    return { ok: false, message: "Task name and family are required." };
  }

  if (subtasks.length === 0) {
    return { ok: false, message: "Add at least one subtask." };
  }

  const task = await prisma.familyTask.create({
    data: {
      familyId,
      title,
      description: readString(formData, "description"),
      dueDate: readString(formData, "dueDate") ? new Date(readString(formData, "dueDate")!) : null,
      createdBy: user.id,
      status: "pending",
      progress: 0,
      subtasks: {
        create: subtasks.map((subtask) => ({ title: subtask })),
      },
    },
  });

  const familyRecipients = await prisma.familyMember.findMany({ where: { familyId, status: "active" }, select: { userId: true } });
  await notifyUsers({ userIds: familyRecipients.map((member) => member.userId), type: "family", title: "Family task assigned", message: `${title} was assigned to your family.`, link: "/admin/family", sourceType: "family_task", sourceId: task.id, dedupeKey: `family-task:${task.id}:assigned` });

  await syncTaskProgress(task.id);
  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "Task created successfully." };
}

export async function updateSocialTask(taskId: number, formData: FormData) {
  await requirePermission("social-fellowship", "manage-family-tasks");
  const title = readString(formData, "title");
  const familyId = readNumber(formData, "familyId");
  const subtasks = readStringList(formData, "subtasks");

  if (!title || !familyId) {
    return { ok: false, message: "Task name and family are required." };
  }

  if (subtasks.length === 0) {
    return { ok: false, message: "Add at least one subtask." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.familyTask.update({
      where: { id: taskId },
      data: {
        familyId,
        title,
        description: readString(formData, "description"),
        dueDate: readString(formData, "dueDate") ? new Date(readString(formData, "dueDate")!) : null,
      },
    });
    await tx.taskSubtask.deleteMany({ where: { taskId } });
    await tx.taskSubtask.createMany({
      data: subtasks.map((subtask) => ({ taskId, title: subtask })),
    });
  });

  await syncTaskProgress(taskId);
  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "Task updated successfully." };
}

export async function deleteSocialTask(taskId: number) {
  await requirePermission("social-fellowship", "delete-family-tasks");

  await prisma.familyTask.delete({
    where: { id: taskId },
  });

  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "Task deleted." };
}

export async function toggleSocialSubtask(subtaskIdValue: string) {
  await requirePermission("social-fellowship", "manage-family-tasks");
  const subtaskId = BigInt(subtaskIdValue);

  const subtask = await prisma.taskSubtask.findUnique({
    where: { id: subtaskId },
    select: { taskId: true, isCompleted: true },
  });

  if (!subtask) {
    return { ok: false, message: "Subtask not found." };
  }

  await prisma.taskSubtask.update({
    where: { id: subtaskId },
    data: {
      isCompleted: !subtask.isCompleted,
      completedAt: !subtask.isCompleted ? new Date() : null,
    },
  });

  await syncTaskProgress(subtask.taskId);
  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "Subtask updated." };
}

export async function createSocialActionPlan(formData: FormData) {
  const user = await requirePermission("social-fellowship", "manage-action-plans");
  const title = readString(formData, "title");
  const startDate = readDate(formData, "startDate");
  const dueDate = readDate(formData, "dueDate");
  const tasks = readActionPlanTasks(formData);

  if (!title || !startDate || !dueDate) {
    return { ok: false, message: "Action plan name, start date, and due date are required." };
  }

  if (tasks.length === 0) {
    return { ok: false, message: "Add at least one action plan task." };
  }

  const plan = await prisma.actionPlan.create({
    data: {
      title,
      familyId: readNumber(formData, "familyId"),
      description: readString(formData, "description"),
      startDate,
      dueDate,
      priority: readString(formData, "priority") ?? "medium",
      department: "social-fellowship",
      year: readNumber(formData, "year") ?? new Date().getFullYear(),
      createdBy: user.id,
      tasks: {
        create: tasks,
      },
    },
  });

  const assignedTasks = await prisma.actionPlanTask.findMany({ where: { actionPlanId: plan.id, assignedTo: { not: null } }, select: { id: true, assignedTo: true, taskName: true } });
  for (const task of assignedTasks) {
    if (task.assignedTo) await notifyUsers({ userIds: [task.assignedTo], type: "task", title: "Action plan task assigned", message: `${task.taskName} was assigned to you.`, link: "/admin/social-fellowship", sourceType: "action_plan_task", sourceId: task.id, dedupeKey: `action-task:${task.id}:assigned` });
  }

  await syncActionPlanProgress(plan.id);
  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "Action plan created successfully." };
}

export async function updateSocialActionPlan(actionPlanId: number, formData: FormData) {
  await requirePermission("social-fellowship", "manage-action-plans");
  const title = readString(formData, "title");
  const startDate = readDate(formData, "startDate");
  const dueDate = readDate(formData, "dueDate");
  const tasks = readActionPlanTasks(formData);

  if (!title || !startDate || !dueDate) {
    return { ok: false, message: "Action plan name, start date, and due date are required." };
  }

  if (tasks.length === 0) {
    return { ok: false, message: "Add at least one action plan task." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.actionPlan.update({
      where: { id: actionPlanId },
      data: {
        title,
        familyId: readNumber(formData, "familyId"),
        description: readString(formData, "description"),
        startDate,
        dueDate,
        priority: readString(formData, "priority") ?? "medium",
      },
    });
    await tx.actionPlanTask.deleteMany({ where: { actionPlanId } });
    await tx.actionPlanTask.createMany({
      data: tasks.map((task) => ({ ...task, actionPlanId })),
    });
  });

  const assignedTasks = await prisma.actionPlanTask.findMany({ where: { actionPlanId, assignedTo: { not: null } }, select: { id: true, assignedTo: true, taskName: true, updatedAt: true } });
  for (const task of assignedTasks) {
    if (task.assignedTo) await notifyUsers({ userIds: [task.assignedTo], type: "task", title: "Action plan task assigned or updated", message: `${task.taskName} is assigned to you.`, link: "/admin/social-fellowship", sourceType: "action_plan_task", sourceId: task.id, dedupeKey: `action-task:${task.id}:updated:${task.updatedAt.getTime()}` });
  }

  await syncActionPlanProgress(actionPlanId);
  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "Action plan updated successfully." };
}

export async function deleteSocialActionPlan(actionPlanId: number) {
  await requirePermission("social-fellowship", "manage-action-plans");

  await prisma.actionPlan.delete({
    where: { id: actionPlanId },
  });

  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "Action plan deleted." };
}

export async function toggleSocialActionPlanTask(taskId: number) {
  await requirePermission("social-fellowship", "manage-action-plans");

  const task = await prisma.actionPlanTask.findUnique({
    where: { id: taskId },
    select: { actionPlanId: true, progress: true },
  });

  if (!task) {
    return { ok: false, message: "Action plan task not found." };
  }

  const progress = task.progress >= 100 ? 0 : 100;

  await prisma.actionPlanTask.update({
    where: { id: taskId },
    data: {
      progress,
      status: progress === 100 ? "completed" : "pending",
      startedAt: progress === 100 ? new Date() : null,
      completedAt: progress === 100 ? new Date() : null,
    },
  });

  await syncActionPlanProgress(task.actionPlanId);
  revalidatePath("/admin/social-fellowship");

  return { ok: true, message: "Action plan task updated." };
}
