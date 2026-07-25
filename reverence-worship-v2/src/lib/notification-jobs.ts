import "server-only";

import { prisma } from "@/lib/prisma";
import { notifySuperAdmins, notifyUsers, processPendingEmailDeliveries, reconcilePendingPermissionNotifications, userIdsForAnnouncement, userIdsWithPermission } from "@/lib/notifications";

function dayBounds(offsetDays = 0) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + offsetDays);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "Africa/Kigali" }).format(date);
}

export async function runScheduledNotificationJobs() {
  const results = { emailsProcessed: 0, permissionRequestsChecked: 0, announcements: 0, formReminders: 0, taskReminders: 0, familyReminders: 0, systemAlerts: 0 };
  results.emailsProcessed = await processPendingEmailDeliveries();
  results.permissionRequestsChecked = (await reconcilePendingPermissionNotifications()).requests;

  const today = dayBounds();
  const scheduledAnnouncements = await prisma.announcement.findMany({
    where: { status: "scheduled", scheduledDate: { lte: today.end } },
  });
  for (const announcement of scheduledAnnouncements) {
    const updated = await prisma.announcement.update({ where: { id: announcement.id }, data: { status: "active", publishedAt: new Date() } });
    await notifyUsers({
      userIds: await userIdsForAnnouncement(updated.targetType, updated.targetRoles, updated.targetUsers),
      type: "announcement", title: updated.title, message: updated.content, link: "/admin/announcements",
      sourceType: "announcement", sourceId: updated.id, dedupeKey: `announcement:${updated.id}:scheduled`,
    });
    results.announcements += 1;
  }

  const forms = await prisma.spiritualForm.findMany({ where: { isActive: true }, select: { id: true, title: true, settings: true } });
  const submitterIds = await userIdsWithPermission("intercession", "submit-forms");
  for (const form of forms) {
    const settings = (form.settings as Record<string, unknown> | null) ?? {};
    if (settings.is_published !== true || typeof settings.submission_deadline !== "string" || !settings.submission_deadline) continue;
    const deadline = new Date(`${settings.submission_deadline}T23:59:59.999Z`);
    const daysRemaining = Math.ceil((deadline.getTime() - today.start.getTime()) / 86_400_000);
    if (daysRemaining < 0 || daysRemaining > 3) continue;
    const submissions = await prisma.formSubmission.findMany({ where: { formId: form.id, userId: { not: null } }, select: { userId: true } });
    const submitted = new Set(submissions.map((submission) => submission.userId));
    const recipients = submitterIds.filter((id) => !submitted.has(id));
    await notifyUsers({
      userIds: recipients, type: "form", title: "Form deadline approaching",
      message: `${form.title} is due ${dateLabel(deadline)}. Please submit it before the deadline.`,
      link: `/admin/intercession/forms/${form.id}/take`, sourceType: "spiritual_form", sourceId: form.id,
      dedupeKey: `form:${form.id}:deadline:${settings.submission_deadline}:${daysRemaining}`,
    });
    results.formReminders += recipients.length;
  }

  const tomorrow = dayBounds(1);
  const dueTasks = await prisma.actionPlanTask.findMany({
    where: { assignedTo: { not: null }, progress: { lt: 100 }, deadline: { not: null, lt: tomorrow.end } },
    select: { id: true, taskName: true, deadline: true, assignedTo: true, actionPlan: { select: { createdBy: true, department: true } } },
  });
  for (const task of dueTasks) {
    if (!task.deadline || !task.assignedTo) continue;
    const overdue = task.deadline < today.start;
    const userIds = overdue ? [task.assignedTo, ...(task.actionPlan.createdBy ? [task.actionPlan.createdBy] : [])] : [task.assignedTo];
    await notifyUsers({
      userIds, type: "task", title: overdue ? "Task overdue" : "Task due soon",
      message: `${task.taskName} ${overdue ? "was due" : "is due"} ${dateLabel(task.deadline)}.`,
      link: `/admin/${task.actionPlan.department === "social-fellowship" ? "social-fellowship" : task.actionPlan.department}`,
      sourceType: "action_plan_task", sourceId: task.id,
      dedupeKey: `action-task:${task.id}:${overdue ? `overdue:${today.start.toISOString().slice(0, 10)}` : "due-soon"}`,
    });
    results.taskReminders += userIds.length;
  }

  const familyTasks = await prisma.familyTask.findMany({
    where: { progress: { lt: 100 }, dueDate: { not: null, lt: tomorrow.end } },
    select: { id: true, title: true, dueDate: true, assignedTo: true, family: { select: { parentId: true } } },
  });
  for (const task of familyTasks) {
    if (!task.dueDate) continue;
    const overdue = task.dueDate < today.start;
    const userIds = [...new Set([task.assignedTo, task.family.parentId].filter((id): id is number => Boolean(id)))];
    await notifyUsers({
      userIds, type: "family", title: overdue ? "Family task overdue" : "Family task due soon",
      message: `${task.title} ${overdue ? "was due" : "is due"} ${dateLabel(task.dueDate)}.`, link: "/admin/family",
      sourceType: "family_task", sourceId: task.id,
      dedupeKey: `family-task:${task.id}:${overdue ? `overdue:${today.start.toISOString().slice(0, 10)}` : "due-soon"}`,
    });
    results.familyReminders += userIds.length;
  }

  const failedDeliveries = await prisma.emailDelivery.findMany({ where: { status: "failed", attempts: { gte: 3 } }, select: { id: true, recipient: true, lastError: true } });
  for (const delivery of failedDeliveries) {
    await notifySuperAdmins({ type: "system", title: "Email delivery repeatedly failed", message: `Email to ${delivery.recipient} failed after repeated attempts. ${delivery.lastError ?? ""}`.trim(), link: "/admin/settings", sourceType: "email_delivery", sourceId: delivery.id, dedupeKey: `email-delivery:${delivery.id}:failed`, sendEmail: false });
    results.systemAlerts += 1;
  }

  const hourStart = new Date(Date.now() - 60 * 60 * 1000);
  const sensitiveLogs = await prisma.activityLog.groupBy({
    by: ["userId"], where: { createdAt: { gte: hourStart }, userId: { not: null }, module: { in: ["users", "permissions", "settings", "system"] } }, _count: { _all: true }, having: { userId: { _count: { gte: 10 } } },
  });
  for (const activity of sensitiveLogs) {
    if (!activity.userId) continue;
    const hourKey = hourStart.toISOString().slice(0, 13);
    await notifySuperAdmins({ type: "security", title: "Unusual administrative activity", message: `User #${activity.userId} performed ${activity._count._all} sensitive administrative actions within one hour.`, link: "/admin/settings", sourceType: "user", sourceId: activity.userId, dedupeKey: `audit:${activity.userId}:${hourKey}` });
    results.systemAlerts += 1;
  }

  return results;
}
