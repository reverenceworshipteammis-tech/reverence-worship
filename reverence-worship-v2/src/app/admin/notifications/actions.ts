"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AdminNotification = {
  id: string;
  sourceId: number;
  type: "notification" | "announcement" | "form" | "pending_user" | "task" | "permission" | "expense_approval" | "expense_status";
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
    "finance-dpt",
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
  roleIds: number[],
) {
  if (announcement.targetType === "all") return true;

  if (announcement.targetType === "roles") {
    try {
      const roles = JSON.parse(announcement.targetRoles ?? "[]") as Array<string | number>;
      return roles.some((role) => roleIds.includes(Number(role)) || roleNames.includes(String(role)));
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

async function safeRead<T>(promise: Promise<T>, fallback: T) {
  try {
    return await promise;
  } catch (error) {
    console.error("Unable to read notification data", error);
    return fallback;
  }
}

export async function getAdminNotifications() {
  const user = await requireUser();
  const roleNames = user.roles.map((userRole) => userRole.role.name);
  const roleIds = user.roles.map((userRole) => userRole.role.id);
  const superAdmin = isSuperAdmin(roleNames);
  const workspaceUser = hasWorkspaceRole(roleNames);
  const notifications: AdminNotification[] = [];

  const [storedNotifications, announcements, activeForms, userFormSubmissions, assignedTasks, expenses, expenseDecisions] = await Promise.all([
    safeRead(prisma.notification.findMany({
      where: { userId: user.id, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 30,
    }), []),
    safeRead(prisma.announcement.findMany({
      where: { status: "active" },
      include: { reads: { where: { userId: user.id }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }), []),
    safeRead(prisma.spiritualForm.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }), []),
    safeRead(prisma.formSubmission.findMany({
      where: { userId: user.id },
      select: { formId: true },
    }), []),
    safeRead(prisma.actionPlanTask.findMany({
      where: { assignedTo: user.id, NOT: { status: "completed" } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }), []),
    safeRead(prisma.expense.findMany({
      where: {
        status: { in: ["pending", "void_pending"] },
        OR: [{ approverId1: user.id }, { approverId2: user.id }],
      },
      include: { creator: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }), []),
    safeRead(prisma.expense.findMany({
      where: { OR: [{ createdBy: user.id }, { voidRequestedBy: user.id }], status: { in: ["approved", "rejected", "voided"] }, updatedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
      include: { approver: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }), []),
  ]);

  for (const notification of storedNotifications) {
    notifications.push({
      id: `notification-${notification.id}`,
      sourceId: notification.id,
      type: "notification",
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() ?? null,
      link: notification.link ?? "/admin/dashboard",
    });
  }

  for (const announcement of announcements) {
    if (!announcementIsForUser(announcement, user.id, roleNames, roleIds)) continue;

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
      title: expense.status === "void_pending" ? "Expense Void Approval Required" : "Expense Approval Required",
      message: expense.status === "void_pending"
        ? `A void request for RWF ${expense.amount.toString()} needs your approval`
        : `${expense.creator?.name ?? "A member"} submitted an expense of RWF ${expense.amount.toString()}`,
      createdAt: expense.createdAt.toISOString(),
      readAt: null,
      link: "/admin/finance/approvals",
    });
  }

  for (const expense of expenseDecisions) {
    const voidRejected = expense.status === "approved" && expense.rejectionReason?.startsWith("Void request rejected:");
    const decisionTitle = expense.status === "voided" ? "Expense Void Approved" : voidRejected ? "Expense Void Rejected" : expense.status === "approved" ? "Expense Approved" : "Expense Rejected";
    notifications.push({
      id: `expense_status-${expense.id}-${expense.status}`,
      sourceId: expense.id,
      type: "expense_status",
      title: decisionTitle,
      message: `${expense.approver?.name ?? "The approver"} ${expense.status === "voided" ? "approved voiding" : voidRejected ? "rejected voiding" : expense.status} the expense of RWF ${expense.amount.toString()}${expense.rejectionReason ? `: ${expense.rejectionReason}` : "."}`,
      createdAt: expense.updatedAt.toISOString(),
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

  if (type === "notification") {
    await prisma.notification.updateMany({ where: { id: sourceId, userId: user.id }, data: { readAt: new Date() } });
  }

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
  const roleIds = user.roles.map((userRole) => userRole.role.id);
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  const announcements = await prisma.announcement.findMany({
    where: { status: "active" },
    select: { id: true, targetType: true, targetRoles: true, targetUsers: true },
  });
  const readRows = announcements
    .filter((announcement) => announcementIsForUser(announcement, user.id, roleNames, roleIds))
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
