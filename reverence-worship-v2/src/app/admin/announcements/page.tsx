import { AnnouncementsClient } from "@/components/announcements-client";
import { getUserPermissionSet, permissionSetHas, requirePageAccess } from "@/lib/auth";
import { maintainNotificationArchive } from "@/lib/notification-maintenance";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Kigali",
  }).format(date);
}

function dateValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function parseIdList(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(Number).filter((item) => Number.isInteger(item) && item > 0) : [];
  } catch {
    return [];
  }
}

export default async function AnnouncementsPage() {
  const user = await requirePageAccess("announcements");
  await maintainNotificationArchive();
  const permissions = await getUserPermissionSet(user);
  const canManage = ["create", "edit", "delete", "publish"].some((feature) => permissionSetHas(permissions, "announcements", feature));
  const roleIds = user.roles.map((userRole) => userRole.roleId);

  const [allAnnouncements, roles, users] = await Promise.all([
    prisma.announcement.findMany({
      where: canManage ? undefined : { status: "active", OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] },
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, name: true } },
        publisher: { select: { id: true, name: true } },
        reads: {
          select: {
            userId: true,
            readAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
    canManage ? prisma.role.findMany({
      where: { name: { not: "super-admin" } },
      orderBy: { displayName: "asc" },
      select: { id: true, name: true, displayName: true },
    }) : Promise.resolve([]),
    canManage ? prisma.user.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        roles: { select: { roleId: true } },
      },
    }) : Promise.resolve([]),
  ]);

  const announcements = canManage
    ? allAnnouncements
    : allAnnouncements.filter((announcement) => {
        if (announcement.targetType === "all") return true;
        if (announcement.targetType === "users") return parseIdList(announcement.targetUsers).includes(user.id);
        if (announcement.targetType === "roles") return parseIdList(announcement.targetRoles).some((id) => roleIds.includes(id));
        return false;
      });

  const roleNameById = new Map(roles.map((role) => [role.id, role.displayName]));
  const userById = new Map(users.map((user) => [user.id, user]));
  const deliveryRows = canManage && announcements.length > 0
    ? await prisma.notification.findMany({
        where: {
          sourceType: "announcement",
          sourceId: { in: announcements.map((announcement) => announcement.id) },
        },
        select: { sourceId: true, userId: true },
        distinct: ["sourceId", "userId"],
      })
    : [];
  const deliveredUserIdsByAnnouncement = new Map<number, number[]>();
  for (const delivery of deliveryRows) {
    if (delivery.sourceId === null) continue;
    deliveredUserIdsByAnnouncement.set(delivery.sourceId, [
      ...(deliveredUserIdsByAnnouncement.get(delivery.sourceId) ?? []),
      delivery.userId,
    ]);
  }

  const announcementAnalytics = announcements.map((announcement) => {
    if (!canManage) return { recipientCount: 1, deliveredCount: 0, readCount: 0, readRate: 0, readers: [], unreadRecipients: [] };

    let recipientIds: number[] = [];
    if (announcement.targetType === "all") {
      recipientIds = users.map((recipient) => recipient.id);
    } else if (announcement.targetType === "users") {
      const ids = parseIdList(announcement.targetUsers);
      recipientIds = ids.filter((id) => userById.has(id));
    } else if (announcement.targetType === "roles") {
      const ids = parseIdList(announcement.targetRoles);
      if (ids.length) {
        recipientIds = users
          .filter((recipient) => recipient.roles.some((role) => ids.includes(role.roleId)))
          .map((recipient) => recipient.id);
      }
    }

    const recipientSet = new Set(recipientIds);
    const readerIds = new Set(
      announcement.reads
        .map((read) => read.userId)
        .filter((readerId) => recipientSet.has(readerId)),
    );
    const deliveredIds = new Set([
      ...(deliveredUserIdsByAnnouncement.get(announcement.id) ?? []).filter((recipientId) => recipientSet.has(recipientId)),
      ...readerIds,
    ]);
    const readCount = readerIds.size;
    const recipientCount = recipientIds.length;
    const readers = announcement.reads
      .filter((read) => recipientSet.has(read.userId))
      .sort((a, b) => b.readAt.getTime() - a.readAt.getTime())
      .map((read) => ({
        id: read.user.id,
        name: read.user.name,
        email: read.user.email,
        readAt: formatDateTime(read.readAt),
      }));
    const unreadRecipients = Array.from(deliveredIds)
      .filter((recipientId) => !readerIds.has(recipientId))
      .map((recipientId) => userById.get(recipientId))
      .filter((recipient): recipient is NonNullable<typeof recipient> => Boolean(recipient))
      .map((recipient) => ({
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      recipientCount,
      deliveredCount: deliveredIds.size,
      readCount,
      readRate: recipientCount > 0 ? Math.round((readCount / recipientCount) * 100) : 0,
      readers,
      unreadRecipients,
    };
  });

  return (
    <AnnouncementsClient
      readOnly={!canManage}
      roles={roles}
      users={users}
      announcements={announcements.map((announcement, index) => {
        const analytics = announcementAnalytics[index] ?? { recipientCount: 0, deliveredCount: 0, readCount: 0, readRate: 0, readers: [], unreadRecipients: [] };
        const targetRoleIds = parseIdList(announcement.targetRoles);
        const targetUserIds = parseIdList(announcement.targetUsers);
        const roleNames = targetRoleIds.map((id) => roleNameById.get(id)).filter(Boolean) as string[];
        const userNames = targetUserIds.map((id) => userById.get(id)?.name).filter(Boolean) as string[];
        const recipientLabel = !canManage
          ? "For you"
          :
          announcement.targetType === "all"
            ? "All Users"
            : announcement.targetType === "roles"
              ? roleNames.join(", ") || "Selected roles"
              : userNames.join(", ") || "Selected users";

        return {
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          type: announcement.type,
          status: announcement.status,
          scheduledDate: formatDate(announcement.scheduledDate),
          scheduledDateRaw: dateValue(announcement.scheduledDate),
          expiryDate: formatDate(announcement.expiryDate),
          expiryDateRaw: dateValue(announcement.expiryDate),
          targetType: announcement.targetType,
          targetRoles: targetRoleIds,
          targetUsers: targetUserIds,
          recipientLabel,
          recipientCount: analytics.recipientCount,
          deliveredCount: analytics.deliveredCount,
          readCount: analytics.readCount,
          readRate: analytics.readRate,
          readers: analytics.readers,
          unreadRecipients: analytics.unreadRecipients,
          emailSent: announcement.emailSent,
          createdByName: announcement.creator?.name ?? "System",
          publishedByName: announcement.publisher?.name ?? null,
          publishedAt: formatDate(announcement.publishedAt),
          createdAt: formatDate(announcement.createdAt),
        };
      })}
    />
  );
}
