"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maintainNotificationArchive } from "@/lib/notification-maintenance";

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
  await maintainNotificationArchive().catch((error) => {
    console.error("Unable to maintain notification archive", error);
  });
  const roleNames = user.roles.map((userRole) => userRole.role.name);
  const roleIds = user.roles.map((userRole) => userRole.role.id);
  const workspaceUser = hasWorkspaceRole(roleNames);
  const notifications: AdminNotification[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [storedNotifications, announcements] = await Promise.all([
    safeRead(prisma.notification.findMany({
      where: { userId: user.id, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 30,
    }), []),
    safeRead(prisma.announcement.findMany({
      where: {
        status: "active",
        OR: [{ expiryDate: null }, { expiryDate: { gte: today } }],
      },
      include: { reads: { where: { userId: user.id }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }), []),
  ]);

  for (const notification of storedNotifications) {
    // Announcement visibility is governed by AnnouncementUserRead below.
    if (notification.type === "announcement" || notification.sourceType === "announcement") continue;

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
