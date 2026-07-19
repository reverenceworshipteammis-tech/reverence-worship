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

type ImportedAttendanceRecord = {
  userId: number;
  sessionDate: string;
  sessionType: string;
  status: "present" | "absent" | "excused";
  onTime: boolean;
  communicated: boolean;
  disciplinePoints: number;
  lateMinutes: number;
  notes: string | null;
};

type ImportedPermissionRequest = {
  userId: number;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approvedBy: number | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
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

function normalizeImportHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function decodeImportFile(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(buffer);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(buffer);
  return new TextDecoder("utf-8").decode(buffer);
}

function importDelimiter(text: string) {
  const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const directive = firstLine.match(/^sep=(.)$/i);
  if (directive?.[1]) return directive[1];
  return [",", "\t", ";"].sort((left, right) => firstLine.split(right).length - firstLine.split(left).length)[0] ?? ",";
}

function parseDelimitedRows(raw: string) {
  const text = raw.replace(/^\uFEFF/, "");
  const delimiter = importDelimiter(text);
  const content = /^sep=./i.test(text.split(/\r?\n/, 1)[0] ?? "") ? text.replace(/^sep=.\r?\n/i, "") : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '"') {
      if (quoted && content[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && content[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function importedDate(value: string) {
  const normalized = value.trim();
  const iso = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dayFirst = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  const parts = iso
    ? { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
    : dayFirst
      ? { year: Number(dayFirst[3].length === 2 ? `20${dayFirst[3]}` : dayFirst[3]), month: Number(dayFirst[2]), day: Number(dayFirst[1]) }
      : null;
  if (!parts) return null;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  return date.getUTCFullYear() === parts.year && date.getUTCMonth() === parts.month - 1 && date.getUTCDate() === parts.day
    ? `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
    : null;
}

function importedPermissionDate(value: string) {
  const normalized = value.trim();
  const iso = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const monthFirst = normalized.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  const parts = iso
    ? { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) }
    : monthFirst
      ? { year: Number(monthFirst[3].length === 2 ? `20${monthFirst[3]}` : monthFirst[3]), month: Number(monthFirst[1]), day: Number(monthFirst[2]) }
      : null;
  if (!parts) return null;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
  return date.getUTCFullYear() === parts.year && date.getUTCMonth() === parts.month - 1 && date.getUTCDate() === parts.day
    ? `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
    : null;
}

function importBoolean(value: string, fallback = false) {
  if (!value.trim()) return fallback;
  return ["1", "yes", "y", "true", "on", "present", "on time"].includes(value.trim().toLowerCase());
}

function importedStatus(value: string, presenceValue: string) {
  const normalized = value.trim().toLowerCase();
  if (["present", "p"].includes(normalized)) return "present" as const;
  if (["late", "l"].includes(normalized)) return "late" as const;
  if (["absent", "a"].includes(normalized)) return "absent" as const;
  if (["excused", "permission", "permitted"].includes(normalized)) return "excused" as const;
  if (!normalized) return importBoolean(presenceValue) ? "present" as const : "absent" as const;
  return null;
}

function importedValue(row: Record<string, string>, ...headers: string[]) {
  for (const header of headers.map(normalizeImportHeader)) {
    const value = row[header]?.trim();
    if (value) return value;
  }
  return "";
}

function isDatabaseConnectionFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /connection|timeout|timed out|terminated|ECONNRESET|ETIMEDOUT/i.test(message);
}

function attendanceImportDatabaseFailure(error: unknown) {
  console.error("Attendance import database operation failed", error);
  if (isDatabaseConnectionFailure(error)) {
    return "The database connection timed out before the import could finish. No partial import was saved. Please wait a moment and retry the same file.";
  }
  return "Attendance could not be saved because of a database error. No partial import was saved. Please retry.";
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
  const attendanceUsers = await prisma.user.findMany({
    where: { id: { in: records.map((record) => Number(record.userId)) } },
    select: { id: true, createdAt: true, membershipType: true },
  });
  const ineligibleUserIds = attendanceUsers
    .filter((attendanceUser) => attendanceUser.createdAt.toISOString().slice(0, 10) > sessionDateValue)
    .map((attendanceUser) => attendanceUser.id);
  if (ineligibleUserIds.length > 0) {
    return { ok: false, message: "Attendance can only include users who joined on or before the session date." };
  }
  if (attendanceUsers.some((attendanceUser) => attendanceUser.membershipType === "temporary")) {
    return { ok: false, message: "Temporary members are not included in attendance." };
  }

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

      const attendanceRows = records.map((record) => {
        const requestedStatus = (record.status || "present").trim().toLowerCase();
        const status = requestedStatus === "late"
          ? "present"
          : ["present", "absent", "excused"].includes(requestedStatus) ? requestedStatus : "present";
        const hasOfficialPermission = Boolean(record.hasOfficialPermission);
        const onTime = requestedStatus === "late" ? false : Boolean(record.onTime);
        return {
          userId: Number(record.userId),
          sessionDate,
          sessionType,
          status,
          onTime: hasOfficialPermission ? true : onTime,
          communicated: hasOfficialPermission ? true : Boolean(record.communicated),
          disciplinePoints: hasOfficialPermission ? 1 : Number(record.disciplinePoints) || 0,
          lateMinutes: Number(record.lateMinutes) || 0,
          notes: record.notes?.trim() || null,
          markedBy: user.id,
        };
      });

      // The modal submits the complete roster. Replacing it in two bulk queries keeps
      // remote database transactions short; one upsert per member can exceed the
      // interactive transaction timeout on larger rosters.
      await tx.attendanceRecord.deleteMany({
        where: { sessionDate, sessionType },
      });
      await tx.attendanceRecord.createMany({
        data: attendanceRows,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("ATTENDANCE_SESSION_EXISTS:")) {
      const existingName = error.message.slice("ATTENDANCE_SESSION_EXISTS:".length);
      return { ok: false, message: `Only one attendance session is allowed per day. Reopen "${existingName}" for this date.` };
    }
    console.error("Attendance session save failed", error);
    return {
      ok: false,
      message: isDatabaseConnectionFailure(error)
        ? "The database connection timed out before attendance could be saved. Please retry."
        : "Attendance could not be saved because of a database error. Please retry.",
    };
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

export async function importAttendanceCsv(formData: FormData) {
  let admin: Awaited<ReturnType<typeof requirePermission>>;
  try {
    admin = await requirePermission("discipline", "mark-attendance");
  } catch (error) {
    if (isDatabaseConnectionFailure(error)) {
      return { ok: false, message: attendanceImportDatabaseFailure(error) };
    }
    throw error;
  }
  const multipleFiles = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  const legacyFile = formData.get("file");
  const files = multipleFiles.length > 0
    ? multipleFiles
    : legacyFile instanceof File && legacyFile.size > 0 ? [legacyFile] : [];
  const completeSessions = formData.get("completeSessions") === "true";
  const fallbackSessionDate = importedDate(readString(formData, "fallbackSessionDate") ?? "");
  const fallbackSessionName = readString(formData, "fallbackSessionName") ?? "";

  if (files.length === 0) {
    return { ok: false, message: "Choose one or more CSV files to import." };
  }
  if (files.length > 100) {
    return { ok: false, message: "Import no more than 100 CSV files at once." };
  }
  const oversizedFile = files.find((file) => file.size > 20 * 1024 * 1024);
  if (oversizedFile) {
    return { ok: false, message: `${oversizedFile.name} is larger than the 20 MB per-file limit.` };
  }
  const excelFile = files.find((file) => /\.(xlsx|xls)$/i.test(file.name));
  if (excelFile) {
    return { ok: false, message: `Save ${excelFile.name} as CSV UTF-8 before importing it.` };
  }

  const sourceRows: Array<{ values: Record<string, string>; fileName: string; rowNumber: number }> = [];
  for (const file of files) {
    const table = parseDelimitedRows(decodeImportFile(await file.arrayBuffer()));
    if (table.length < 2) {
      return { ok: false, message: `${file.name} has no attendance rows.` };
    }
    const headers = table[0].map(normalizeImportHeader);
    table.slice(1).forEach((cells, index) => {
      sourceRows.push({
        values: Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""])),
        fileName: file.name,
        rowNumber: index + 2,
      });
    });
  }
  let users: Array<{ id: number; email: string; createdAt: Date; membershipType: string | null }>;
  try {
    users = await prisma.user.findMany({ select: { id: true, email: true, createdAt: true, membershipType: true } });
  } catch (error) {
    return { ok: false, message: attendanceImportDatabaseFailure(error) };
  }
  const usersByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));

  const parsedRecords = new Map<string, ImportedAttendanceRecord>();
  const failures: string[] = [];

  sourceRows.forEach(({ values: row, fileName, rowNumber }) => {
    const location = `${fileName}, row ${rowNumber}`;
    const sessionDate = importedDate(importedValue(row, "Session Date", "Date")) ?? fallbackSessionDate;
    const sessionType = importedValue(row, "Session Name", "Session", "Session Type") || fallbackSessionName;
    const email = importedValue(row, "Email", "Email Address").toLowerCase();
    const matchedUser = email ? usersByEmail.get(email) : undefined;
    const presence = importedValue(row, "Points of Presence", "Presence", "Present");
    const statusValue = importedValue(row, "Status", "Attendance Status");
    const permissionStatus = importedValue(row, "Permission Status", "Permission");
    const status = !statusValue && /approved permission|excused|permitted/i.test(permissionStatus)
      ? "excused" as const
      : importedStatus(statusValue, presence);

    if (!sessionDate) {
      failures.push(`${location}: invalid or missing Session Date`);
      return;
    }
    if (!sessionType) {
      failures.push(`${location}: missing Session Name`);
      return;
    }
    if (!matchedUser) {
      failures.push(email ? `${location}: no user has email ${email}` : `${location}: missing Email`);
      return;
    }
    if (matchedUser.createdAt.toISOString().slice(0, 10) > sessionDate) {
      failures.push(`${location}: ${email} joined after the session date`);
      return;
    }
    if (matchedUser.membershipType === "temporary") {
      failures.push(`${location}: ${email} is a temporary member`);
      return;
    }
    if (!status) {
      failures.push(`${location}: invalid Status`);
      return;
    }

    const timeliness = importedValue(row, "On Time", "Timeliness");
    const onTime = status === "late" ? false : importBoolean(timeliness, status === "present");
    // Presence and timeliness are separate dimensions. Legacy "Late" rows
    // remain accepted, but are stored as Present with On Time = false.
    const normalizedStatus = status === "late" ? "present" : status;
    const disciplineValue = importedValue(row, "Discipline Points", "Discipline");
    const numericDiscipline = Number(disciplineValue);
    const disciplinePoints = Number.isFinite(numericDiscipline) && disciplineValue.trim()
      ? Math.max(0, Math.round(numericDiscipline))
      : importBoolean(disciplineValue) ? 1 : 0;
    const lateMinutesValue = Number(importedValue(row, "Late Minutes", "Minutes Late"));
    const record: ImportedAttendanceRecord = {
      userId: matchedUser.id,
      sessionDate,
      sessionType,
      status: normalizedStatus,
      onTime,
      communicated: importBoolean(importedValue(row, "Communicated", "Communication")),
      disciplinePoints,
      lateMinutes: Number.isFinite(lateMinutesValue) ? Math.max(0, Math.round(lateMinutesValue)) : 0,
      notes: importedValue(row, "Notes", "Comment", "Comments") || null,
    };
    const recordKey = `${sessionDate}__${sessionType.toLowerCase()}__${matchedUser.id}`;
    if (parsedRecords.has(recordKey)) failures.push(`${location}: duplicate attendance record`);
    parsedRecords.set(recordKey, record);
  });

  if (parsedRecords.size === 0) {
    return { ok: false, message: `No attendance records were imported. ${failures.slice(0, 4).join("; ") || "Check the template columns."}` };
  }

  const grouped = new Map<string, ImportedAttendanceRecord[]>();
  for (const record of parsedRecords.values()) {
    const key = `${record.sessionDate}__${record.sessionType.toLowerCase()}`;
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }

  const dates = [...new Set([...parsedRecords.values()].map((record) => record.sessionDate))];
  let existingSessions: Array<{ sessionDate: Date; sessionType: string }>;
  try {
    existingSessions = await prisma.attendanceSession.findMany({
      where: { sessionDate: { in: dates.map(dateOnly) } },
      select: { sessionDate: true, sessionType: true },
    });
  } catch (error) {
    return { ok: false, message: attendanceImportDatabaseFailure(error) };
  }
  const blockedGroups = new Set<string>();
  for (const [key, records] of grouped) {
    const first = records[0];
    const conflict = existingSessions.find((session) => session.sessionDate.toISOString().slice(0, 10) === first.sessionDate && session.sessionType.toLowerCase() !== first.sessionType.toLowerCase());
    if (conflict) {
      blockedGroups.add(key);
      failures.push(`${first.sessionDate}: already has session “${conflict.sessionType}”`);
    }
  }

  let sessionsImported = 0;
  let recordsImported = 0;
  try {
    await prisma.$transaction(async (tx) => {
      for (const [key, records] of grouped) {
        if (blockedGroups.has(key)) continue;
        const first = records[0];
        const sessionDate = dateOnly(first.sessionDate);
        await tx.attendanceSession.upsert({
          where: { sessionDate_sessionType: { sessionDate, sessionType: first.sessionType } },
          update: {
            isImported: true,
            ...(completeSessions ? { isCompleted: true, completedAt: new Date(), completedBy: admin.id } : {}),
          },
        create: {
          sessionDate,
          sessionType: first.sessionType,
          isCompleted: completeSessions,
          isImported: true,
          completedAt: completeSessions ? new Date() : null,
          completedBy: completeSessions ? admin.id : null,
        },
        });
        sessionsImported += 1;

        // An imported file is authoritative for its session: replace the stored
        // roster so members omitted from the CSV are not displayed as attendees.
        await tx.attendanceRecord.deleteMany({ where: { sessionDate, sessionType: first.sessionType } });
        await tx.attendanceRecord.createMany({
          data: records.map((record) => ({
              userId: record.userId,
              sessionDate,
              sessionType: first.sessionType,
              status: record.status,
              onTime: record.onTime,
              communicated: record.communicated,
              disciplinePoints: record.disciplinePoints,
              lateMinutes: record.lateMinutes,
              notes: record.notes,
              markedBy: admin.id,
          })),
        });
        recordsImported += records.length;
      }
    }, { maxWait: 30_000, timeout: 120_000 });
  } catch (error) {
    return { ok: false, message: attendanceImportDatabaseFailure(error) };
  }

  revalidatePath("/admin/discipline");
  const skipped = sourceRows.length - recordsImported;
  if (recordsImported === 0) {
    return { ok: false, message: `No attendance records were imported. ${failures.slice(0, 4).join("; ")}` };
  }
  return {
    ok: true,
    message: `Imported ${recordsImported} attendance record(s) from ${files.length} file(s) across ${sessionsImported} session(s)${skipped > 0 ? `; skipped ${skipped} row(s): ${failures.slice(0, 3).join("; ")}` : ""}.`,
  };
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

export async function importPermissionRequestsCsv(formData: FormData) {
  const admin = await requirePermission("discipline", "approve-permission-requests");
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) return { ok: false, message: "Choose one or more CSV files to import." };
  if (files.length > 25) return { ok: false, message: "Import no more than 25 CSV files at once." };
  const oversizedFile = files.find((file) => file.size > 10 * 1024 * 1024);
  if (oversizedFile) return { ok: false, message: `${oversizedFile.name} is larger than the 10 MB per-file limit.` };
  const excelFile = files.find((file) => /\.(xlsx|xls)$/i.test(file.name));
  if (excelFile) return { ok: false, message: `Save ${excelFile.name} as CSV UTF-8 before importing it.` };

  const sourceRows: Array<{ values: Record<string, string>; location: string }> = [];
  for (const file of files) {
    const table = parseDelimitedRows(decodeImportFile(await file.arrayBuffer()));
    if (table.length < 2) return { ok: false, message: `${file.name} has no permission rows.` };
    const headers = table[0].map(normalizeImportHeader);
    table.slice(1).forEach((cells, index) => {
      sourceRows.push({
        values: Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""])),
        location: `${file.name}, row ${index + 2}`,
      });
    });
  }
  if (sourceRows.length > 10_000) return { ok: false, message: "Import no more than 10,000 permission rows at once." };

  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const usersByEmail = new Map(users.map((user) => [user.email.trim().toLowerCase(), user]));
  const failures: string[] = [];
  const parsed = new Map<string, ImportedPermissionRequest>();

  for (const { values: row, location } of sourceRows) {
    const email = importedValue(row, "Email", "Member Email", "Email Address").toLowerCase();
    const member = usersByEmail.get(email);
    const startDate = importedPermissionDate(importedValue(row, "Start Date", "From"));
    const endDate = importedPermissionDate(importedValue(row, "End Date", "To"));
    const reason = importedValue(row, "Reason");
    const type = importedValue(row, "Permission Type", "Type") || "General";
    const statusValue = importedValue(row, "Status").toLowerCase();
    const status = (["pending", "approved", "rejected", "cancelled"].includes(statusValue)
      ? statusValue
      : null) as ImportedPermissionRequest["status"] | null;

    if (!member) {
      failures.push(email ? `${location}: no user has email ${email}` : `${location}: missing Email`);
      continue;
    }
    if (!startDate || !endDate) {
      failures.push(`${location}: invalid or missing Start Date or End Date`);
      continue;
    }
    if (startDate > endDate) {
      failures.push(`${location}: End Date is before Start Date`);
      continue;
    }
    if (!reason) {
      failures.push(`${location}: missing Reason`);
      continue;
    }
    if (!status) {
      failures.push(`${location}: Status must be Pending, Approved, Rejected, or Cancelled`);
      continue;
    }

    const approverEmail = importedValue(row, "Approver Email", "Approved By Email").toLowerCase();
    const approver = approverEmail ? usersByEmail.get(approverEmail) : undefined;
    if (approverEmail && !approver) {
      failures.push(`${location}: no approver has email ${approverEmail}`);
      continue;
    }
    const decisionDateValue = importedValue(row, "Decision Date", "Approval Date", "Approved At");
    const decisionDate = decisionDateValue ? importedPermissionDate(decisionDateValue) : null;
    if (decisionDateValue && !decisionDate) {
      failures.push(`${location}: invalid Decision Date`);
      continue;
    }
    const recordedDateValue = importedValue(row, "Recorded Date", "Created Date", "Created At");
    const recordedDate = recordedDateValue ? importedPermissionDate(recordedDateValue) : startDate;
    if (!recordedDate) {
      failures.push(`${location}: invalid Recorded Date`);
      continue;
    }
    const rejectionReason = importedValue(row, "Rejection Reason", "Comment", "Comments") || null;
    if (status === "rejected" && !rejectionReason) {
      failures.push(`${location}: Rejection Reason is required for rejected records`);
      continue;
    }

    const decisionStatus = status === "approved" || status === "rejected";
    const record: ImportedPermissionRequest = {
      userId: member.id,
      type,
      startDate,
      endDate,
      reason,
      status,
      approvedBy: decisionStatus ? (approver?.id ?? admin.id) : null,
      approvedAt: decisionStatus ? dateOnly(decisionDate ?? recordedDate) : null,
      rejectionReason: status === "rejected" ? rejectionReason : null,
      createdAt: dateOnly(recordedDate),
    };
    const key = `${record.userId}__${startDate}__${endDate}__${type.toLowerCase()}__${reason.toLowerCase()}`;
    if (parsed.has(key)) failures.push(`${location}: duplicate row in import files`);
    else parsed.set(key, record);
  }

  if (parsed.size === 0) {
    return { ok: false, message: `No permission records were imported. ${failures.slice(0, 4).join("; ") || "Check the template columns."}` };
  }

  const candidateUserIds = [...new Set([...parsed.values()].map((record) => record.userId))];
  const existing = await prisma.permissionRequest.findMany({
    where: { userId: { in: candidateUserIds } },
    select: { userId: true, startDate: true, endDate: true, type: true, reason: true },
  });
  const existingKeys = new Set(existing.map((record) =>
    `${record.userId}__${record.startDate.toISOString().slice(0, 10)}__${record.endDate.toISOString().slice(0, 10)}__${record.type.toLowerCase()}__${record.reason.toLowerCase()}`,
  ));
  const records = [...parsed.entries()].filter(([key]) => !existingKeys.has(key)).map(([, record]) => record);
  const duplicates = parsed.size - records.length;

  if (records.length === 0) {
    return { ok: false, message: `No new permission records were imported; all ${duplicates} valid row(s) already exist.` };
  }

  await prisma.permissionRequest.createMany({
    data: records.map((record) => ({
      userId: record.userId,
      type: record.type,
      startDate: dateOnly(record.startDate),
      endDate: dateOnly(record.endDate),
      reason: record.reason,
      status: record.status,
      approvedBy: record.approvedBy,
      approvedAt: record.approvedAt,
      rejectionReason: record.rejectionReason,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
    })),
  });

  revalidatePath("/admin/discipline");
  const skipped = failures.length + duplicates;
  return {
    ok: true,
    message: `Imported ${records.length} historical permission record(s)${skipped ? `; skipped ${skipped} row(s)${duplicates ? ` (${duplicates} already existed)` : ""}${failures.length ? `: ${failures.slice(0, 3).join("; ")}` : ""}` : ""}.`,
  };
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
      status: { in: ["present", "late"], mode: "insensitive" },
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
