import { AnnouncementsClient } from "@/components/announcements-client";
import { getUserPermissionSet, permissionSetHas, requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { excludeSuperAdminUserWhere } from "@/lib/system-account-rules";
import { databaseDate, kigaliDateKey } from "@/lib/calendar-date";

function formatDate(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric", timeZone: "Africa/Kigali" }).format(date);
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

type RecipientFilters = {
  statuses: string[];
  genders: string[];
  maritalStatuses: string[];
  membershipTypes: string[];
};

const emptyRecipientFilters: RecipientFilters = { statuses: [], genders: [], maritalStatuses: [], membershipTypes: [] };

function parseRecipientFilters(value: string | null): RecipientFilters {
  if (!value?.startsWith("{")) return emptyRecipientFilters;
  try {
    const parsed = JSON.parse(value) as Partial<RecipientFilters>;
    return {
      statuses: Array.isArray(parsed.statuses) ? parsed.statuses.filter((item): item is string => typeof item === "string") : [],
      genders: Array.isArray(parsed.genders) ? parsed.genders.filter((item): item is string => typeof item === "string") : [],
      maritalStatuses: Array.isArray(parsed.maritalStatuses) ? parsed.maritalStatuses.filter((item): item is string => typeof item === "string") : [],
      membershipTypes: Array.isArray(parsed.membershipTypes) ? parsed.membershipTypes.filter((item): item is string => typeof item === "string") : [],
    };
  } catch {
    return emptyRecipientFilters;
  }
}

function recipientFilterLabel(filters: RecipientFilters) {
  const labels = [...filters.statuses, ...filters.genders, ...filters.maritalStatuses, ...filters.membershipTypes];
  return labels.length ? `Filtered: ${labels.map((label) => label.slice(0, 1).toUpperCase() + label.slice(1)).join(", ")}` : "Filtered users";
}

export default async function AnnouncementsPage() {
  const user = await requirePageAccess("announcements");
  const permissions = await getUserPermissionSet(user);
  const canManage = ["create", "edit", "delete", "publish"].some((feature) => permissionSetHas(permissions, "announcements", feature));
  const roleIds = user.roles.map((userRole) => userRole.roleId);

  const [allAnnouncements, roles, users, deliveryRows] = await Promise.all([
    prisma.announcement.findMany({
      where: canManage ? undefined : { status: "active", OR: [{ expiryDate: null }, { expiryDate: { gte: databaseDate(kigaliDateKey()) } }] },
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
      where: excludeSuperAdminUserWhere(),
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        gender: true,
        maritalStatus: true,
        membershipType: true,
        roles: { select: { roleId: true } },
      },
    }) : Promise.resolve([]),
    canManage ? prisma.notification.findMany({
      where: { sourceType: "announcement" },
      select: { sourceId: true, userId: true },
      distinct: ["sourceId", "userId"],
    }) : Promise.resolve([]),
  ]);

  const announcements = canManage
    ? allAnnouncements
    : allAnnouncements.filter((announcement) => {
        if (announcement.targetType === "all") return true;
        if (announcement.targetType === "users" || announcement.targetType === "filters") return parseIdList(announcement.targetUsers).includes(user.id);
        if (announcement.targetType === "roles") return parseIdList(announcement.targetRoles).some((id) => roleIds.includes(id));
        return false;
      });

  const roleNameById = new Map(roles.map((role) => [role.id, role.displayName]));
  const userById = new Map(users.map((user) => [user.id, user]));
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
      recipientIds = users.filter((recipient) => recipient.status === "active").map((recipient) => recipient.id);
    } else if (announcement.targetType === "users") {
      const ids = parseIdList(announcement.targetUsers);
      recipientIds = ids.filter((id) => userById.get(id)?.status === "active");
    } else if (announcement.targetType === "filters") {
      const ids = parseIdList(announcement.targetUsers);
      recipientIds = ids.filter((id) => userById.has(id));
    } else if (announcement.targetType === "roles") {
      const ids = parseIdList(announcement.targetRoles);
      if (ids.length) {
        recipientIds = users
          .filter((recipient) => recipient.status === "active" && recipient.roles.some((role) => ids.includes(role.roleId)))
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
      users={users.map((recipient) => ({
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
        status: recipient.status,
        gender: recipient.gender,
        maritalStatus: recipient.maritalStatus,
        membershipType: recipient.membershipType,
        roleIds: recipient.roles.map((role) => role.roleId),
      }))}
      announcements={announcements.map((announcement, index) => {
        const analytics = announcementAnalytics[index] ?? { recipientCount: 0, deliveredCount: 0, readCount: 0, readRate: 0, readers: [], unreadRecipients: [] };
        const targetRoleIds = parseIdList(announcement.targetRoles);
        const targetUserIds = parseIdList(announcement.targetUsers);
        const targetFilters = parseRecipientFilters(announcement.targetAudience);
        const roleNames = targetRoleIds.map((id) => roleNameById.get(id)).filter(Boolean) as string[];
        const userNames = targetUserIds.map((id) => userById.get(id)?.name).filter(Boolean) as string[];
        const recipientLabel = !canManage
          ? "For you"
          :
          announcement.targetType === "all"
            ? "All Users"
            : announcement.targetType === "roles"
              ? roleNames.join(", ") || "Selected roles"
              : announcement.targetType === "filters"
                ? recipientFilterLabel(targetFilters)
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
          targetFilters,
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
