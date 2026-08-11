import "server-only";

import type { NotificationSourceState } from "@/lib/notification-retention-policy";
import { notificationActionGroup, notificationSourceIsCurrent } from "@/lib/notification-retention-policy";
import { prisma } from "@/lib/prisma";

type StoredNotification = {
  id: number;
  userId: number;
  sourceType: string | null;
  sourceId: number | null;
  title: string;
  dedupeKey: string | null;
  createdAt: Date;
};

function sourceIds(notifications: StoredNotification[], sourceType: string) {
  return [...new Set(notifications
    .filter((notification) => notification.sourceType === sourceType && notification.sourceId !== null)
    .map((notification) => notification.sourceId as number))];
}

function stateKey(sourceType: string, sourceId: number, userId?: number) {
  return `${sourceType}:${sourceId}${userId === undefined ? "" : `:user:${userId}`}`;
}

export async function filterCurrentNotifications<T extends StoredNotification>(
  notifications: T[],
  options: { deleteStale?: boolean } = {},
): Promise<T[]> {
  if (notifications.length === 0) return notifications;

  const ids = (sourceType: string) => sourceIds(notifications, sourceType);
  const formIds = ids("spiritual_form");
  const permissionIds = ids("permission_request");
  const actionTaskIds = ids("action_plan_task");
  const familyTaskIds = ids("family_task");
  const expenseIds = ids("expense");
  const probationIds = ids("probation");
  const probationDecisionIds = ids("probation_decision_request");
  const probationExtensionIds = ids("probation_extension");
  const announcementIds = ids("announcement");
  const familyIds = ids("family");
  const contributionIds = ids("contribution");
  const paymentIds = ids("payment");
  const eventPaymentIds = ids("event_contribution_payment");
  const roleIds = ids("role");
  const userIds = ids("user");
  const deliveryIds = ids("email_delivery");

  const [
    forms,
    submissions,
    permissions,
    actionTasks,
    familyTasks,
    expenses,
    probations,
    probationDecisions,
    probationExtensions,
    announcements,
    families,
    contributions,
    payments,
    eventPayments,
    roles,
    users,
    deliveries,
  ] = await Promise.all([
    formIds.length ? prisma.spiritualForm.findMany({ where: { id: { in: formIds } }, select: { id: true, isActive: true, settings: true } }) : [],
    formIds.length ? prisma.formSubmission.findMany({
      where: {
        formId: { in: formIds },
        OR: notifications
          .filter((notification) => notification.sourceType === "spiritual_form" && notification.sourceId !== null)
          .map((notification) => ({ formId: notification.sourceId as number, userId: notification.userId })),
      },
      select: { formId: true, userId: true },
    }) : [],
    permissionIds.length ? prisma.permissionRequest.findMany({ where: { id: { in: permissionIds } }, select: { id: true, status: true } }) : [],
    actionTaskIds.length ? prisma.actionPlanTask.findMany({ where: { id: { in: actionTaskIds } }, select: { id: true, status: true, progress: true } }) : [],
    familyTaskIds.length ? prisma.familyTask.findMany({ where: { id: { in: familyTaskIds } }, select: { id: true, status: true, progress: true } }) : [],
    expenseIds.length ? prisma.expense.findMany({ where: { id: { in: expenseIds } }, select: { id: true, status: true } }) : [],
    probationIds.length ? prisma.probation.findMany({ where: { id: { in: probationIds } }, select: { id: true, state: true } }) : [],
    probationDecisionIds.length ? prisma.probationDecisionRequest.findMany({ where: { id: { in: probationDecisionIds } }, select: { id: true, status: true } }) : [],
    probationExtensionIds.length ? prisma.probationExtension.findMany({ where: { id: { in: probationExtensionIds } }, select: { id: true } }) : [],
    announcementIds.length ? prisma.announcement.findMany({ where: { id: { in: announcementIds } }, select: { id: true, status: true } }) : [],
    familyIds.length ? prisma.family.findMany({ where: { id: { in: familyIds } }, select: { id: true } }) : [],
    contributionIds.length ? prisma.contribution.findMany({ where: { id: { in: contributionIds } }, select: { id: true } }) : [],
    paymentIds.length ? prisma.payment.findMany({ where: { id: { in: paymentIds } }, select: { id: true } }) : [],
    eventPaymentIds.length ? prisma.eventContributionPayment.findMany({ where: { id: { in: eventPaymentIds } }, select: { id: true } }) : [],
    roleIds.length ? prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true } }) : [],
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } }) : [],
    deliveryIds.length ? prisma.emailDelivery.findMany({ where: { id: { in: deliveryIds } }, select: { id: true, status: true } }) : [],
  ]);

  const states = new Map<string, NotificationSourceState>();
  const submittedForms = new Set(submissions.filter((item) => item.userId !== null).map((item) => stateKey("spiritual_form", item.formId, item.userId!)));

  for (const form of forms) {
    const settings = (form.settings as Record<string, unknown> | null) ?? {};
    const available = form.isActive && settings.is_published === true;
    for (const notification of notifications.filter((item) => item.sourceType === "spiritual_form" && item.sourceId === form.id)) {
      states.set(stateKey("spiritual_form", form.id, notification.userId), {
        exists: true,
        available,
        submitted: settings.limit_one_response !== false && submittedForms.has(stateKey("spiritual_form", form.id, notification.userId)),
      });
    }
  }
  for (const item of permissions) states.set(stateKey("permission_request", item.id), { exists: true, status: item.status });
  for (const item of actionTasks) states.set(stateKey("action_plan_task", item.id), { exists: true, status: item.status, progress: item.progress });
  for (const item of familyTasks) states.set(stateKey("family_task", item.id), { exists: true, status: item.status, progress: item.progress });
  for (const item of expenses) states.set(stateKey("expense", item.id), { exists: true, status: item.status });
  for (const item of probations) states.set(stateKey("probation", item.id), { exists: true, status: item.state });
  for (const item of probationDecisions) states.set(stateKey("probation_decision_request", item.id), { exists: true, status: item.status });
  for (const item of probationExtensions) states.set(stateKey("probation_extension", item.id), { exists: true });
  for (const item of announcements) states.set(stateKey("announcement", item.id), { exists: true, status: item.status });
  for (const item of families) states.set(stateKey("family", item.id), { exists: true });
  for (const item of contributions) states.set(stateKey("contribution", item.id), { exists: true });
  for (const item of payments) states.set(stateKey("payment", item.id), { exists: true });
  for (const item of eventPayments) states.set(stateKey("event_contribution_payment", item.id), { exists: true });
  for (const item of roles) states.set(stateKey("role", item.id), { exists: true });
  for (const item of users) states.set(stateKey("user", item.id), { exists: true });
  for (const item of deliveries) states.set(stateKey("email_delivery", item.id), { exists: true, status: item.status });

  const supportedSources = new Set([
    "spiritual_form", "permission_request", "action_plan_task", "family_task", "expense", "probation",
    "probation_decision_request", "probation_extension", "announcement", "family", "contribution", "payment",
    "event_contribution_payment", "role", "user", "email_delivery",
  ]);
  const staleIds: number[] = [];
  const current = notifications.filter((notification) => {
    if (!notification.sourceType || notification.sourceId === null || !supportedSources.has(notification.sourceType)) return true;
    const key = stateKey(
      notification.sourceType,
      notification.sourceId,
      notification.sourceType === "spiritual_form" ? notification.userId : undefined,
    );
    const state = states.get(key) ?? { exists: false };
    const keep = notificationSourceIsCurrent(notification, state);
    if (!keep) staleIds.push(notification.id);
    return keep;
  });

  // Daily reminders and republished resources can otherwise fill the feed with
  // several alerts for the same outstanding action. Keep only the newest one.
  const seenActionGroups = new Set<string>();
  const currentIds = new Set<number>();
  for (const notification of [...current].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) {
    const group = notificationActionGroup(notification);
    if (!group || notification.sourceId === null) {
      currentIds.add(notification.id);
      continue;
    }
    const key = `${notification.userId}:${notification.sourceType}:${notification.sourceId}:${group}`;
    if (seenActionGroups.has(key)) staleIds.push(notification.id);
    else {
      seenActionGroups.add(key);
      currentIds.add(notification.id);
    }
  }

  if (options.deleteStale && staleIds.length > 0) {
    await prisma.notification.deleteMany({ where: { id: { in: staleIds } } });
  }

  return current.filter((notification) => currentIds.has(notification.id));
}

export async function reconcileNotificationSources(limit = 1_000) {
  const notifications = await prisma.notification.findMany({
    where: { readAt: null, sourceType: { not: null }, sourceId: { not: null } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      userId: true,
      sourceType: true,
      sourceId: true,
      title: true,
      dedupeKey: true,
      createdAt: true,
    },
  });
  const current = await filterCurrentNotifications(notifications, { deleteStale: true });
  return { checked: notifications.length, deleted: notifications.length - current.length };
}
