"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AdminNotification = {
  id: string;
  sourceId: number;
  type: "announcement" | "form" | "pending_user" | "task" | "permission" | "expense_approval";
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  link: string;
};

function isSuperAdmin(roleNames: string[]) {
  return roleNames.includes("super-admin");
}

function hasWorkspaceRole(roleNames: string[]) {
  const workspaceRoles = new Set([
    "super-admin",
    "admin",
    "music-dpt",
    "social-dpt",
    "discipline-dpt",
    "intercession-dpt",
  ]);

  return roleNames.some((roleName) => workspaceRoles.has(roleName));
}

function isPublishedForm(settings: unknown) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return false;
  return (settings as { is_published?: unknown }).is_published === true;
}

function announcementIsForUser(
  announcement: { targetType: string; targetRoles: string | null; targetUsers: string | null },
  userId: number,
  roleNames: string[],
) {
  if (announcement.targetType === "all") return true;

  if (announcement.targetType === "roles") {
    try {
      const roles = JSON.parse(announcement.targetRoles ?? "[]") as string[];
      return roles.some((role) => roleNames.includes(role));
    } catch {
      return false;
    }
  }

  if (announcement.targetType === "users") {
    try {
      const users = JSON.parse(announcement.targetUsers ?? "[]") as Array<number | string>;
      return users.some((id) => Number(id) === userId);
    } catch {
      return false;
    }
  }

  return false;
}

export async function getAdminNotifications() {
  const user = await requireUser();
  const roleNames = user.roles.map((userRole) => userRole.role.name);
  const superAdmin = isSuperAdmin(roleNames);
  const workspaceUser = hasWorkspaceRole(roleNames);
  const notifications: AdminNotification[] = [];

  const [announcements, activeForms, userFormSubmissions, assignedTasks, expenses] = await Promise.all([
    prisma.announcement.findMany({
      where: { status: "active" },
      include: { reads: { where: { userId: user.id }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.spiritualForm.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.formSubmission.findMany({
      where: { userId: user.id },
      select: { formId: true },
    }),
    prisma.actionPlanTask.findMany({
      where: { assignedTo: user.id, NOT: { status: "completed" } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.expense.findMany({
      where: {
        status: "pending",
        OR: [{ approverId1: user.id }, { approverId2: user.id }],
      },
      include: { creator: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  for (const announcement of announcements) {
    if (!announcementIsForUser(announcement, user.id, roleNames)) continue;

    const readAt = announcement.reads[0]?.readAt ?? null;
    if (readAt) continue;

    notifications.push({
      id: `announcement-${announcement.id}`,
      sourceId: announcement.id,
      type: "announcement",
      title: announcement.title,
      message: announcement.content,
      createdAt: announcement.createdAt.toISOString(),
      readAt: null,
      link: workspaceUser ? "/admin/announcements" : "/admin/dashboard",
    });
  }

  const submittedFormIds = new Set(userFormSubmissions.map((submission) => submission.formId));
  for (const form of activeForms) {
    if (!isPublishedForm(form.settings) || submittedFormIds.has(form.id)) continue;

    notifications.push({
      id: `form-${form.id}`,
      sourceId: form.id,
      type: "form",
      title: "Form to Complete",
      message: form.title,
      createdAt: form.createdAt.toISOString(),
      readAt: null,
      link: `/admin/intercession/forms/${form.id}/take`,
    });
  }

  if (superAdmin) {
    const [pendingUsers, permissionRequests] = await Promise.all([
      prisma.user.findMany({
        where: { status: "pending", createdById: null, emailVerifiedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.permissionRequest.findMany({
        where: { status: "pending" },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    for (const pendingUser of pendingUsers) {
      notifications.push({
        id: `pending_user-${pendingUser.id}`,
        sourceId: pendingUser.id,
        type: "pending_user",
        title: "New User Registration",
        message: `${pendingUser.name} (${pendingUser.email}) needs approval`,
        createdAt: pendingUser.createdAt.toISOString(),
        readAt: null,
        link: "/admin/users?status=pending",
      });
    }

    for (const permission of permissionRequests) {
      notifications.push({
        id: `permission-${permission.id}`,
        sourceId: permission.id,
        type: "permission",
        title: "Permission Request",
        message: `${permission.user.name} requested permission (${permission.type})`,
        createdAt: permission.createdAt.toISOString(),
        readAt: null,
        link: "/admin/discipline?tab=permission&status=pending",
      });
    }
  }

  for (const task of assignedTasks) {
    notifications.push({
      id: `task-${task.id}`,
      sourceId: task.id,
      type: "task",
      title: "Pending Task",
      message: task.taskName,
      createdAt: task.createdAt.toISOString(),
      readAt: null,
      link: "/admin/social-fellowship?tab=tasks",
    });
  }

  for (const expense of expenses) {
    notifications.push({
      id: `expense_approval-${expense.id}`,
      sourceId: expense.id,
      type: "expense_approval",
      title: "Expense Approval Required",
      message: `${expense.creator?.name ?? "A member"} submitted an expense of RWF ${expense.amount.toString()}`,
      createdAt: expense.createdAt.toISOString(),
      readAt: null,
      link: "/admin/finance?tab=expenses",
    });
  }

  notifications.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const limited = notifications.slice(0, 20);
  return {
    ok: true,
    notifications: limited,
    unreadCount: limited.filter((notification) => !notification.readAt).length,
  };
}

export async function markAdminNotificationRead(type: AdminNotification["type"], sourceId: number) {
  const user = await requireUser();

  if (type === "announcement") {
    await prisma.announcementUserRead.upsert({
      where: { announcementId_userId: { announcementId: sourceId, userId: user.id } },
      create: { announcementId: sourceId, userId: user.id },
      update: { readAt: new Date() },
    });
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function markAllAdminNotificationsRead() {
  const user = await requireUser();
  const roleNames = user.roles.map((userRole) => userRole.role.name);
  const announcements = await prisma.announcement.findMany({
    where: { status: "active" },
    select: { id: true, targetType: true, targetRoles: true, targetUsers: true },
  });
  const readRows = announcements
    .filter((announcement) => announcementIsForUser(announcement, user.id, roleNames))
    .map((announcement) => ({
      announcementId: announcement.id,
      userId: user.id,
      readAt: new Date(),
    }));

  if (readRows.length > 0) {
    await prisma.announcementUserRead.createMany({
      data: readRows,
      skipDuplicates: true,
    });

    await Promise.all(
      readRows.map((row) =>
        prisma.announcementUserRead.update({
          where: { announcementId_userId: { announcementId: row.announcementId, userId: row.userId } },
          data: { readAt: row.readAt },
        }),
      ),
    );
  }

  revalidatePath("/admin");
  return { ok: true };
}
