import "server-only";

import { prisma } from "@/lib/prisma";
import { getSystemSetting } from "@/lib/system-settings";
import { normalizeNotificationRetentionDays } from "@/lib/notification-retention-policy";

export async function maintainNotificationArchive(now = new Date()) {
  const retentionDays = normalizeNotificationRetentionDays(await getSystemSetting("notification_retention_days"));
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const retentionCutoff = new Date(now.getTime() - retentionDays * 86_400_000);

  const [archivedAnnouncements, deletedNotifications] = await Promise.all([
    prisma.announcement.updateMany({
      where: {
        status: { in: ["active", "scheduled"] },
        expiryDate: { not: null, lt: today },
      },
      data: { status: "archived" },
    }),
    prisma.notification.deleteMany({
      where: {
        readAt: { not: null, lt: retentionCutoff },
      },
    }),
  ]);

  return {
    archivedAnnouncements: archivedAnnouncements.count,
    deletedNotifications: deletedNotifications.count,
    retentionDays,
  };
}
