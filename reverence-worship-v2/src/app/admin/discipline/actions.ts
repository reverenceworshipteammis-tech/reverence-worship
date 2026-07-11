"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const user = await requireUser();
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

  if (existingSession?.isCompleted && !complete) {
    return { ok: false, message: "This session is completed and cannot be edited." };
  }

  await prisma.$transaction(async (tx) => {
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
  await requireUser();
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
  await requireUser();
  const id = Number(readString(formData, "id"));
  const userId = Number(readString(formData, "userId"));
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

  if (Number.isFinite(id) && id > 0) {
    await prisma.permissionRequest.update({
      where: { id },
      data,
    });
  } else {
    await prisma.permissionRequest.create({
      data: {
        ...data,
        status: "pending",
      },
    });
  }

  revalidatePath("/admin/discipline");

  return { ok: true, message: id ? "Permission request updated." : "Permission request created." };
}

export async function approvePermissionRequest(id: number) {
  const user = await requireUser();

  await prisma.permissionRequest.update({
    where: { id },
    data: {
      status: "approved",
      approvedBy: user.id,
      approvedAt: new Date(),
      rejectionReason: null,
    },
  });

  revalidatePath("/admin/discipline");

  return { ok: true, message: "Permission request approved." };
}

export async function rejectPermissionRequest(id: number, reason: string) {
  const user = await requireUser();

  await prisma.permissionRequest.update({
    where: { id },
    data: {
      status: "rejected",
      approvedBy: user.id,
      approvedAt: new Date(),
      rejectionReason: reason.trim() || null,
    },
  });

  revalidatePath("/admin/discipline");

  return { ok: true, message: "Permission request rejected." };
}

export async function deletePermissionRequest(id: number) {
  await requireUser();

  await prisma.permissionRequest.delete({
    where: { id },
  });

  revalidatePath("/admin/discipline");

  return { ok: true, message: "Permission request deleted." };
}

export async function saveDisciplineSession(formData: FormData) {
  const user = await requireUser();
  const sessionDateValue = readString(formData, "sessionDate");
  const title = readString(formData, "title");
  const records = readDisciplineRecords(formData);

  if (!sessionDateValue || !title) {
    return { ok: false, message: "Session date and title are required." };
  }

  if (records.length === 0) {
    return { ok: false, message: "Add at least one discipline record." };
  }

  const createdAt = dateOnly(sessionDateValue);
  const dayStart = new Date(`${sessionDateValue}T00:00:00`);
  const dayEnd = new Date(`${sessionDateValue}T23:59:59`);

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
  await requireUser();
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
  const user = await requireUser();

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
