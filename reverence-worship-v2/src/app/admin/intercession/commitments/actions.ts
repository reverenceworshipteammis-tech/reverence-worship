"use server";

import { after } from "next/server";
import { requireAnyPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notifications";
import { kigaliDateKey } from "@/lib/calendar-date";
import { parseCommitmentSettings } from "@/lib/membership-commitment";
import { loadCommitmentReports, settingsObject } from "@/lib/membership-commitment-service";
import { intercessionFormAvailability, parseIntercessionFormSettings } from "@/lib/intercession-form-domain";

export async function sendCommitmentReminders(year: number) {
  const admin = await requireAnyPermission("intercession", ["manage-forms", "edit-forms"], "/admin/intercession");
  if (!Number.isInteger(year) || year < 2000 || year > 2200) return { ok: false, message: "Select a valid commitment year." };
  const report = await loadCommitmentReports(year);
  if (report.year !== year) return { ok: false, message: "No commitment form exists for this year." };
  const forms = await prisma.spiritualForm.findMany({ where: { id: { in: report.campaigns.map((form) => form.id) } }, include: { _count: { select: { submissions: { where: { deletedAt: null } } } } } });
  const available = forms.filter((form) => !intercessionFormAvailability(parseIntercessionFormSettings(form.settings), form.isActive, form._count.submissions));
  if (!available.length) return { ok: false, message: "Publish an open commitment form for this year before sending reminders." };
  const pendingIds = report.rows.filter((row) => row.status === "Pending").map((row) => row.id);
  const members = await prisma.user.findMany({ where: { id: { in: pendingIds }, status: "active" }, select: { id: true, membershipType: true } });
  const recipients = members.flatMap((member) => {
    const form = available.find((candidate) => {
      const config = parseCommitmentSettings(settingsObject(candidate.settings).commitment);
      return config && member.membershipType && config.membershipTypes.includes(member.membershipType);
    });
    return form ? [{ userId: member.id, formId: form.id }] : [];
  });
  if (!recipients.length) return { ok: true, message: "No pending members need a reminder." };
  await prisma.activityLog.create({ data: { userId: admin.id, action: "membership.commitment.reminders-requested", module: "intercession", metadata: { year, recipients: recipients.length } } });
  after(async () => {
    // Notifications use the existing in-app/email preferences and daily deduplication.
    const groups = available.map((form) => ({ form, ids: recipients.filter((recipient) => recipient.formId === form.id).map((recipient) => recipient.userId) })).filter((group) => group.ids.length);
    await Promise.allSettled(groups.map(({ form, ids }) => notifyUsers({
      userIds: ids, type: "form", title: `Membership commitment ${year}`, message: `Please review your information and accept your membership commitment for ${year}.`,
      link: `/admin/intercession/forms/${form.id}/take`, sourceType: "spiritual_form", sourceId: form.id, dedupeKey: `commitment:${year}:reminder:${kigaliDateKey()}`,
    })));
  });
  return { ok: true, message: `Reminders queued for ${recipients.length} pending member${recipients.length === 1 ? "" : "s"}. Reminders are limited to one per member per day.` };
}
