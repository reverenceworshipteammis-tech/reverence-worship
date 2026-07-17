import { AnnouncementsClient } from "@/components/announcements-client";
import { getUserPermissionSet, permissionSetHas, requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date);
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
      select: { id: true, name: true, email: true },
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

  const recipientCounts = await Promise.all(
    announcements.map(async (announcement) => {
      if (!canManage) return 1;
      if (announcement.targetType === "all") return users.length;
      if (announcement.targetType === "users") {
        const ids = parseIdList(announcement.targetUsers);
        return ids.filter((id) => userById.has(id)).length;
      }
      if (announcement.targetType === "roles") {
        const ids = parseIdList(announcement.targetRoles);
        if (!ids.length) return 0;
        return prisma.user.count({
          where: {
            status: "active",
            roles: { some: { roleId: { in: ids } } },
          },
        });
      }
      return 0;
    }),
  );

  const now = new Date();
  const total = announcements.length;
  const active = announcements.filter((item) => item.status === "active").length;
  const scheduled = announcements.filter((item) => item.status === "scheduled").length;
  const draft = announcements.filter((item) => item.status === "draft").length;
  const expired = announcements.filter((item) => item.expiryDate && item.expiryDate < now).length;

  return (
    <AnnouncementsClient
      stats={{ total, active, scheduled, draft, expired }}
      readOnly={!canManage}
      roles={roles}
      users={users}
      announcements={announcements.map((announcement, index) => {
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
          recipientCount: recipientCounts[index] ?? 0,
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
