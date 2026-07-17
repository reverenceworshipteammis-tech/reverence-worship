"use server";

import { revalidatePath } from "next/cache";
import { getUserPermissionSet, permissionSetHas, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUsers, userIdsForRoles } from "@/lib/notifications";

type AttendanceRecordInput = {
  userId: number;
  status: string;
  onTime?: boolean;
  communicated?: boolean;
  disciplinePoints?: number;
  lateMinutes?: number;
  notes?: string;
  hasOfficialPermission?: boolean;
};

type DisciplineRecordInput = {
  userId: number;
  behaviour: "good" | "bad";
  description?: string;
  points?: number;
};

function boundedProgress(value: FormDataEntryValue | null) {
  const progress = Number(value ?? 0);
  return Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readAttendanceRecords(formData: FormData) {
  const value = readString(formData, "recordsJson");
  if (!value) return [];
  try {
    const records = JSON.parse(value) as AttendanceRecordInput[];
    return records.filter((record) => Number.isFinite(Number(record.userId)));
  } catch {
    return [];
  }
}

function dateOnly(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function readDisciplineRecords(formData: FormData) {
  const value = readString(formData, "recordsJson");
  if (!value) return [];
  try {
    const records = JSON.parse(value) as DisciplineRecordInput[];
    return records.filter((record) => Number.isFinite(Number(record.userId)));
  } catch {
    return [];
  }
}

async function writeAttendanceSession(formData: FormData, complete: boolean) {
  const user = await requirePermission("discipline", complete ? "complete-attendance" : "mark-attendance");
  const sessionDateValue = readString(formData, "sessionDate");
  const sessionType = readString(formData, "sessionType");
  const records = readAttendanceRecords(formData);

  if (!sessionDateValue || !sessionType) {
    return { ok: false, message: "Session date and name are required." };
  }

  if (records.length === 0) {
    return { ok: false, message: "Add at least one member attendance record." };
  }

  const sessionDate = dateOnly(sessionDateValue);
  const existingSession = await prisma.attendanceSession.findUnique({
    where: {
      sessionDate_sessionType: {
        sessionDate,
        sessionType,
      },
    },
    select: { isCompleted: true },
  });

  if (!existingSession) {
    const sessionOnDate = await prisma.attendanceSession.findFirst({
      where: { sessionDate },
      select: { sessionType: true },
    });
    if (sessionOnDate) {
      return { ok: false, message: `Only one attendance session is allowed per day. Reopen "${sessionOnDate.sessionType}" for this date.` };
    }
  }

  if (existingSession?.isCompleted && !complete) {
    return { ok: false, message: "This session is completed and cannot be edited." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (!existingSession) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`attendance:${sessionDateValue}`}))`;
        const sessionOnDate = await tx.attendanceSession.findFirst({
          where: { sessionDate },
          select: { sessionType: true },
        });
        if (sessionOnDate) throw new Error(`ATTENDANCE_SESSION_EXISTS:${sessionOnDate.sessionType}`);
      }

    await tx.attendanceSession.upsert({
      where: {
        sessionDate_sessionType: {
          sessionDate,
          sessionType,
        },
      },
      update: {
        isCompleted: complete,
        completedAt: complete ? new Date() : null,
        completedBy: complete ? user.id : null,
      },
      create: {
        sessionDate,
        sessionType,
        isCompleted: complete,
        completedAt: complete ? new Date() : null,
        completedBy: complete ? user.id : null,
      },
    });

    for (const record of records) {
      const status = record.status || "present";
      const hasOfficialPermission = Boolean(record.hasOfficialPermission);
      await tx.attendanceRecord.upsert({
        where: {
          userId_sessionDate_sessionType: {
            userId: Number(record.userId),
            sessionDate,
            sessionType,
          },
        },
        update: {
          status,
          onTime: hasOfficialPermission ? true : Boolean(record.onTime),
          communicated: hasOfficialPermission ? true : Boolean(record.communicated),
          disciplinePoints: hasOfficialPermission ? 1 : Number(record.disciplinePoints) || 0,
          lateMinutes: Number(record.lateMinutes) || 0,
          notes: record.notes?.trim() || null,
          markedBy: user.id,
        },
        create: {
          userId: Number(record.userId),
          sessionDate,
          sessionType,
          status,
          onTime: hasOfficialPermission ? true : Boolean(record.onTime),
          communicated: hasOfficialPermission ? true : Boolean(record.communicated),
          disciplinePoints: hasOfficialPermission ? 1 : Number(record.disciplinePoints) || 0,
          lateMinutes: Number(record.lateMinutes) || 0,
          notes: record.notes?.trim() || null,
          markedBy: user.id,
        },
      });
    }
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("ATTENDANCE_SESSION_EXISTS:")) {
      const existingName = error.message.slice("ATTENDANCE_SESSION_EXISTS:".length);
      return { ok: false, message: `Only one attendance session is allowed per day. Reopen "${existingName}" for this date.` };
    }
    throw error;
  }

  revalidatePath("/admin/discipline");

  return { ok: true, message: complete ? "Attendance session completed successfully." : "Attendance session saved successfully." };
}

export async function saveAttendanceSession(formData: FormData) {
  return writeAttendanceSession(formData, false);
}

export async function completeAttendanceSession(formData: FormData) {
  return writeAttendanceSession(formData, true);
}

export async function deleteAttendanceSession(sessionDateValue: string, sessionType: string) {
  await requirePermission("discipline", "delete-attendance");
  const sessionDate = dateOnly(sessionDateValue);

  await prisma.$transaction(async (tx) => {
    await tx.attendanceRecord.deleteMany({
      where: {
        sessionDate,
        sessionType,
      },
    });
    await tx.attendanceSession.deleteMany({
      where: {
        sessionDate,
        sessionType,
      },
    });
  });

  revalidatePath("/admin/discipline");

  return { ok: true, message: "Attendance session deleted." };
}

export async function savePermissionRequest(formData: FormData) {
  const user = await requirePermission("discipline", "create-permission-requests");
  const permissions = await getUserPermissionSet(user);
  const canManageRequests = permissionSetHas(permissions, "discipline", "approve-permission-requests");
  const id = Number(readString(formData, "id"));
  const requestedUserId = Number(readString(formData, "userId"));
  const userId = canManageRequests ? requestedUserId : user.id;
  const type = readString(formData, "type") ?? "General";
  const startDateValue = readString(formData, "startDate");
  const endDateValue = readString(formData, "endDate");
  const reason = readString(formData, "reason");

  if (!userId || !startDateValue || !endDateValue || !reason) {
    return { ok: false, message: "User, dates, and reason are required." };
  }

  const data = {
    userId,
    type,
    startDate: dateOnly(startDateValue),
    endDate: dateOnly(endDateValue),
    reason,
  };

  let request;
  if (Number.isFinite(id) && id > 0) {
    const existing = await prisma.permissionRequest.findFirst({
      where: { id, ...(canManageRequests ? {} : { userId: user.id, status: "pending" }) },
      select: { id: true },
    });
    if (!existing) return { ok: false, message: "You can only edit your own pending request." };
    request = await prisma.permissionRequest.update({
      where: { id },
      data,
    });
  } else {
    request = await prisma.permissionRequest.create({
      data: {
        ...data,
        status: "pending",
      },
    });
  }

  if (!(Number.isFinite(id) && id > 0)) {
    await notifyUsers({ userIds: await userIdsForRoles(["discipline-dpt"]), type: "permission", title: "Permission request submitted", message: `A new ${type} permission request is awaiting review.`, link: "/admin/discipline", sourceType: "permission_request", sourceId: request.id, dedupeKey: `permission:${request.id}:submitted` });
  }

  revalidatePath("/admin/discipline");

  return { ok: true, message: id ? "Permission request updated." : "Permission request created." };
}

export async function approvePermissionRequest(id: number) {
  const user = await requirePermission("discipline", "approve-permission-requests");

  const request = await prisma.permissionRequest.update({
    where: { id },
    data: {
      status: "approved",
      approvedBy: user.id,
      approvedAt: new Date(),
      rejectionReason: null,
    },
  });

  await notifyUsers({ userIds: [request.userId], type: "permission", title: "Permission request approved", message: `Your ${request.type} permission request was approved.`, link: "/admin/discipline", sourceType: "permission_request", sourceId: request.id, dedupeKey: `permission:${request.id}:approved` });

  revalidatePath("/admin/discipline");

  return { ok: true, message: "Permission request approved." };
}

export async function rejectPermissionRequest(id: number, reason: string) {
  const user = await requirePermission("discipline", "approve-permission-requests");
  const rejectionReason = reason.trim();

  if (!rejectionReason) {
    return { ok: false, message: "A rejection reason is required." };
  }

  const result = await prisma.permissionRequest.updateMany({
    where: { id, status: "pending" },
    data: {
      status: "rejected",
      approvedBy: user.id,
      approvedAt: new Date(),
      rejectionReason,
    },
  });

  if (result.count === 0) {
    return { ok: false, message: "This permission request is no longer pending." };
  }

  const request = await prisma.permissionRequest.findUnique({ where: { id }, select: { userId: true, type: true } });
  if (request) await notifyUsers({ userIds: [request.userId], type: "permission", title: "Permission request rejected", message: `Your ${request.type} permission request was rejected: ${rejectionReason}`, link: "/admin/discipline", sourceType: "permission_request", sourceId: id, dedupeKey: `permission:${id}:rejected` });

  revalidatePath("/admin/discipline");

  return { ok: true, message: "Permission request rejected." };
}

export async function deletePermissionRequest(id: number) {
  await requirePermission("discipline", "delete-permission-requests");

  await prisma.permissionRequest.delete({
    where: { id },
  });

  revalidatePath("/admin/discipline");

  return { ok: true, message: "Permission request deleted." };
}

export async function saveDisciplineSession(formData: FormData) {
  const user = await requirePermission("discipline", "record-discipline");
  const sessionDateValue = readString(formData, "sessionDate");
  const title = readString(formData, "title");
  const records = readDisciplineRecords(formData);

  if (!sessionDateValue || !title) {
    return { ok: false, message: "Session date and title are required." };
  }

  const createdAt = dateOnly(sessionDateValue);
  const dayStart = new Date(`${sessionDateValue}T00:00:00`);
  const dayEnd = new Date(`${sessionDateValue}T23:59:59`);

  const attendanceSession = await prisma.attendanceSession.findFirst({
    where: { sessionDate: { gte: dayStart, lte: dayEnd }, isCompleted: true },
    orderBy: { updatedAt: "desc" },
    select: { sessionType: true },
  });

  if (!attendanceSession) {
    return { ok: false, message: "Complete the Attendance session for this date before recording Discipline." };
  }

  const presentAttendance = await prisma.attendanceRecord.findMany({
    where: {
      sessionDate: { gte: dayStart, lte: dayEnd },
      sessionType: attendanceSession.sessionType,
      status: { equals: "present", mode: "insensitive" },
    },
    select: { userId: true },
  });
  const presentUserIds = new Set(presentAttendance.map((record) => record.userId));

  if (presentUserIds.size === 0) {
    return { ok: false, message: "No members are marked Present in Attendance for this date." };
  }

  if (records.length === 0) {
    return { ok: false, message: "Add at least one discipline record from the present members." };
  }

  if (records.some((record) => !presentUserIds.has(Number(record.userId)))) {
    return { ok: false, message: "Discipline records can only include members marked Present on this date. Refresh and try again." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.disciplineRecord.deleteMany({
      where: {
        title,
        createdAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    await tx.disciplineRecord.createMany({
      data: records.map((record) => {
        const isGood = record.behaviour === "good";
        return {
          userId: Number(record.userId),
          title,
          description: record.description?.trim() || (isGood ? "Good" : null),
          points: Number.isFinite(Number(record.points)) ? Number(record.points) : isGood ? 1 : 0,
          type: isGood ? "positive" : "warning",
          status: "active",
          recordedBy: user.id,
          createdAt,
        };
      }),
    });
  });

  revalidatePath("/admin/discipline");

  return { ok: true, message: "Discipline session saved successfully." };
}

export async function deleteDisciplineSession(sessionDateValue: string, title: string) {
  await requirePermission("discipline", "delete-discipline");
  const dayStart = new Date(`${sessionDateValue}T00:00:00`);
  const dayEnd = new Date(`${sessionDateValue}T23:59:59`);

  await prisma.disciplineRecord.deleteMany({
    where: {
      title,
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });

  revalidatePath("/admin/discipline");

  return { ok: true, message: "Discipline session deleted." };
}

export async function resolveDisciplineRecord(id: number, notes: string) {
  const user = await requirePermission("discipline", "resolve-discipline");

  await prisma.disciplineRecord.update({
    where: { id },
    data: {
      status: "resolved",
      resolvedBy: user.id,
      resolvedAt: new Date(),
      resolvedNotes: notes.trim() || null,
    },
  });

  revalidatePath("/admin/discipline");

  return { ok: true, message: "Discipline record resolved." };
}

async function syncDisciplineActionPlanProgress(actionPlanId: number) {
  const tasks = await prisma.actionPlanTask.findMany({
    where: { actionPlanId },
    select: { progress: true },
  });
  const progress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0;
  const status = progress === 100 ? "completed" : progress > 0 ? "in_progress" : "pending";

  await prisma.actionPlan.update({
    where: { id: actionPlanId },
    data: { progress, status },
  });
}

export async function saveDisciplineActionPlan(formData: FormData) {
  const user = await requirePermission("discipline", "manage-action-plans");
  const id = Number(readString(formData, "id"));
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const startDateValue = readString(formData, "startDate");
  const dueDateValue = readString(formData, "dueDate");

  if (!title || !startDateValue || !dueDateValue) {
    return { ok: false, message: "Action plan name, start date, and completion date are required." };
  }

  const data = {
    title,
    description,
    startDate: dateOnly(startDateValue),
    dueDate: dateOnly(dueDateValue),
    department: "discipline",
    year: new Date().getFullYear(),
    createdBy: user.id,
  };

  if (Number.isFinite(id) && id > 0) {
    await prisma.actionPlan.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        dueDate: data.dueDate,
      },
    });
  } else {
    await prisma.actionPlan.create({ data });
  }

  revalidatePath("/admin/discipline");
  return { ok: true, message: id ? "Action plan updated." : "Action plan created." };
}

export async function deleteDisciplineActionPlan(id: number) {
  await requirePermission("discipline", "manage-action-plans");
  await prisma.actionPlan.delete({ where: { id } });
  revalidatePath("/admin/discipline");
  return { ok: true, message: "Action plan deleted." };
}

export async function saveDisciplineActionPlanTask(formData: FormData) {
  await requirePermission("discipline", "manage-action-plans");
  const id = Number(readString(formData, "id"));
  const actionPlanId = Number(readString(formData, "actionPlanId"));
  const activity = readString(formData, "activity");
  const targetMilestone = readString(formData, "targetMilestone");
  const estimatedBudget = readString(formData, "estimatedBudget") ?? "0";
  const startDateValue = readString(formData, "startDate");
  const deadlineValue = readString(formData, "deadline");
  const priority = readString(formData, "priority") ?? "medium";
  const progress = boundedProgress(formData.get("progress"));

  if (!actionPlanId || !activity || !targetMilestone || !deadlineValue) {
    return { ok: false, message: "Action plan, activity, milestone, and deadline are required." };
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
      data: {
        taskName: data.taskName,
        activity: data.activity,
        targetMilestone: data.targetMilestone,
        estimatedBudget: data.estimatedBudget,
        startDate: data.startDate,
        deadline: data.deadline,
        priority: data.priority,
        progress: data.progress,
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
      },
    });
  } else {
    await prisma.actionPlanTask.create({ data });
  }

  await syncDisciplineActionPlanProgress(actionPlanId);
  revalidatePath("/admin/discipline");
  return { ok: true, message: id ? "Task updated successfully." : "Task created successfully." };
}

export async function deleteDisciplineActionPlanTask(id: number) {
  await requirePermission("discipline", "manage-action-plans");
  const task = await prisma.actionPlanTask.findUnique({
    where: { id },
    select: { actionPlanId: true },
  });
  if (!task) return { ok: false, message: "Task not found." };

  await prisma.actionPlanTask.delete({ where: { id } });
  await syncDisciplineActionPlanProgress(task.actionPlanId);
  revalidatePath("/admin/discipline");
  return { ok: true, message: "Task deleted successfully." };
}
