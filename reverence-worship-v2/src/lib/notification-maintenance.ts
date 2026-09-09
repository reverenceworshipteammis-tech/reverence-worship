import "server-only";

import { prisma } from "@/lib/prisma";
import {
  NOTIFICATION_LIFETIME_DAYS,
  READ_NOTIFICATION_RETENTION_DAYS,
  notificationLifetimeCutoff,
  readNotificationCutoff,
} from "@/lib/notification-retention-policy";
import { databaseDate, kigaliDateKey } from "@/lib/calendar-date";

export async function maintainNotificationArchive(now = new Date()) {
  const today = databaseDate(kigaliDateKey(now));

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
        OR: [
          { createdAt: { lt: notificationLifetimeCutoff(now) } },
          { readAt: { not: null, lt: readNotificationCutoff(now) } },
        ],
      },
    }),
  ]);

  return {
    archivedAnnouncements: archivedAnnouncements.count,
    deletedNotifications: deletedNotifications.count,
    retentionDays: READ_NOTIFICATION_RETENTION_DAYS,
    lifetimeDays: NOTIFICATION_LIFETIME_DAYS,
  };
}
