"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserPermissionSet, permissionSetHas, requirePermission } from "@/lib/auth";
import { notifyUsers, userIdsWithPermission } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { kigaliDateKey } from "@/lib/calendar-date";

export type ProbationActionResult = {
  ok: boolean;
  message: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const openStates = ["active", "extended"] as const;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function validDate(value: string) {
  if (!datePattern.test(value)) return false;
  const date = dateAtNoon(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function errorMessage(error: unknown, fallback: string) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "P2002") return "This member already has an open probation record or a decision is already pending.";
  if (code === "P2034") return "The probation record changed while you were working. Refresh and try again.";
  console.error(fallback, error);
  return fallback;
}

function revalidateProbation() {
  revalidatePath("/admin/probation");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/discipline");
  revalidatePath("/admin/performance");
}

async function deliverProbationNotification(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    console.error("Probation notification delivery failed after the underlying action succeeded.", error);
  }
}

async function probationRoles() {
  const roles = await prisma.role.findMany({
    where: { name: { in: ["member", "probation-member"] } },
    select: { id: true, name: true },
  });
  return {
    member: roles.find((role) => role.name === "member")?.id,
    probation: roles.find((role) => role.name === "probation-member")?.id,
  };
}

async function notifyProbationLeaders(input: {
  type: string;
  title: string;
  message: string;
  probationId: number;
  extraUserIds?: number[];
  dedupeKey: string;
}) {
  const leaderIds = await userIdsWithPermission("probation", "view");
  return notifyUsers({
    userIds: [...leaderIds, ...(input.extraUserIds ?? [])],
    type: input.type,
    title: input.title,
    message: input.message,
    link: `/admin/probation?record=${input.probationId}`,
    sourceType: "probation",
    sourceId: input.probationId,
    dedupeKey: input.dedupeKey,
    includeConfiguredRecipients: true,
  });
}

export async function enrollProbation(formData: FormData): Promise<ProbationActionResult> {
  const actor = await requirePermission("probation", "enroll", "/admin/probation");
  const parsed = z.object({
    userId: z.coerce.number().int().positive(),
    startDate: z.string().regex(datePattern),
    expectedEndDate: z.string().regex(datePattern),
    memberVisibleSummary: z.string().trim().max(5000).optional(),
    confidentialComments: z.string().trim().max(10000).optional(),
  }).safeParse({
    userId: text(formData, "userId"),
    startDate: text(formData, "startDate"),
    expectedEndDate: text(formData, "expectedEndDate"),
    memberVisibleSummary: text(formData, "memberVisibleSummary"),
    confidentialComments: text(formData, "confidentialComments"),
  });

  if (!parsed.success || !validDate(parsed.data?.startDate ?? "") || !validDate(parsed.data?.expectedEndDate ?? "")) {
    return { ok: false, message: "Select a member and valid probation dates." };
  }

  const startDate = dateAtNoon(parsed.data.startDate);
  const expectedEndDate = dateAtNoon(parsed.data.expectedEndDate);
  if (expectedEndDate < startDate) return { ok: false, message: "The expected end date cannot be before the start date." };

  const [member, assignedAdmin, roles] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: parsed.data.userId,
        status: "active",
        OR: [{ membershipType: null }, { membershipType: { not: "temporary" } }],
      },
      select: { id: true, name: true },
    }),
    prisma.user.findFirst({
      where: {
        id: { not: actor.id },
        status: "active",
        roles: { some: { role: { name: { in: ["admin", "super-admin"] } } } },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
    probationRoles(),
  ]);
  if (!member) return { ok: false, message: "Only an active non-temporary member can be enrolled in probation." };
  if (!assignedAdmin) return { ok: false, message: "Another active administrator is required to approve future final decisions." };
  if (!roles.member || !roles.probation) return { ok: false, message: "Probation roles are not configured. Run the latest migration or seed." };

  try {
    const probation = await prisma.$transaction(async (tx) => {
      const existing = await tx.probation.findFirst({
        where: { userId: member.id, state: { in: [...openStates] } },
        select: { id: true },
      });
      if (existing) throw new Error("OPEN_PROBATION");

      const memberRole = await tx.userRole.findUnique({
        where: { userId_roleId: { userId: member.id, roleId: roles.member! } },
        select: { userId: true },
      });

      if (memberRole) {
        await tx.userRole.delete({ where: { userId_roleId: { userId: member.id, roleId: roles.member! } } });
      }
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: member.id, roleId: roles.probation! } },
        update: {},
        create: { userId: member.id, roleId: roles.probation! },
      });

      const created = await tx.probation.create({
        data: {
          userId: member.id,
          originalStartDate: startDate,
          originalExpectedEndDate: expectedEndDate,
          currentExpectedEndDate: expectedEndDate,
          assignedAdminId: assignedAdmin.id,
          memberVisibleSummary: parsed.data.memberVisibleSummary || null,
          confidentialComments: parsed.data.confidentialComments || null,
          createdById: actor.id,
          updatedById: actor.id,
          memberRoleRemovedOnEnrollment: Boolean(memberRole),
        },
      });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "probation.enrolled",
          module: "probation",
          metadata: {
            probationId: created.id,
            memberId: member.id,
            assignedAdminId: assignedAdmin.id,
            startDate: parsed.data.startDate,
            expectedEndDate: parsed.data.expectedEndDate,
            memberRoleRemoved: Boolean(memberRole),
          },
        },
      });
      return created;
    }, { isolationLevel: "Serializable" });

    await deliverProbationNotification(() => notifyUsers({
      userIds: [member.id],
      type: "probation",
      title: "Probation period started",
      message: `Your probation period is active through ${parsed.data.expectedEndDate}.`,
      link: "/admin/dashboard",
      sourceType: "probation",
      sourceId: probation.id,
      dedupeKey: `probation:${probation.id}:enrolled:member`,
    }));
    await deliverProbationNotification(() => notifyProbationLeaders({
      type: "probation",
      title: "Member enrolled in probation",
      message: `${member.name} entered probation.`,
      probationId: probation.id,
      extraUserIds: [assignedAdmin.id],
      dedupeKey: `probation:${probation.id}:enrolled:leaders`,
    }));
    revalidateProbation();
    return { ok: true, message: `${member.name} was enrolled in probation.` };
  } catch (error) {
    if (error instanceof Error && error.message === "OPEN_PROBATION") {
      return { ok: false, message: "This member already has an active or extended probation record." };
    }
    return { ok: false, message: errorMessage(error, "The probation record could not be created.") };
  }
}

export async function updateProbation(formData: FormData): Promise<ProbationActionResult> {
  const actor = await requirePermission("probation", "update", "/admin/probation");
  const probationId = Number(text(formData, "probationId"));
  const startDateValue = text(formData, "startDate");
  const endDateValue = text(formData, "endDate");
  const memberVisibleSummary = text(formData, "memberVisibleSummary");
  const confidentialComments = text(formData, "confidentialComments");
  if (!Number.isInteger(probationId) || probationId <= 0 || !validDate(startDateValue) || !validDate(endDateValue)) {
    return { ok: false, message: "Select a valid probation record and dates." };
  }
  const startDate = dateAtNoon(startDateValue);
  const endDate = dateAtNoon(endDateValue);
  if (endDate < startDate) return { ok: false, message: "The end date cannot be before the start date." };

  const permissions = await getUserPermissionSet(actor);
  const canEditConfidential = permissionSetHas(permissions, "probation", "view-confidential-comments");
  const existing = await prisma.probation.findUnique({
    where: { id: probationId },
    select: {
      state: true,
      confidentialComments: true,
      originalStartDate: true,
      originalExpectedEndDate: true,
      currentExpectedEndDate: true,
      extensions: { select: { id: true }, take: 1 },
    },
  });
  if (!existing) return { ok: false, message: "Probation record not found." };
  if (!openStates.includes(existing.state as (typeof openStates)[number])) {
    return { ok: false, message: "Closed probation details cannot be changed. Reopen the record first." };
  }

  await prisma.$transaction([
    prisma.probation.update({
      where: { id: probationId },
      data: {
        memberVisibleSummary: memberVisibleSummary || null,
        confidentialComments: canEditConfidential ? confidentialComments || null : existing.confidentialComments,
        originalStartDate: startDate,
        currentExpectedEndDate: endDate,
        ...(!existing.extensions.length ? { originalExpectedEndDate: endDate } : {}),
        updatedById: actor.id,
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: actor.id,
        action: "probation.updated",
        module: "probation",
        metadata: {
          probationId,
          confidentialCommentsUpdated: canEditConfidential,
          previousStartDate: existing.originalStartDate.toISOString().slice(0, 10),
          previousOriginalExpectedEndDate: existing.originalExpectedEndDate.toISOString().slice(0, 10),
          previousEndDate: existing.currentExpectedEndDate.toISOString().slice(0, 10),
          startDate: startDateValue,
          endDate: endDateValue,
          originalExpectedEndAdjusted: !existing.extensions.length,
        },
      },
    }),
  ]);
  revalidateProbation();
  return { ok: true, message: "Probation dates and details updated." };
}

export async function extendProbation(formData: FormData): Promise<ProbationActionResult> {
  const actor = await requirePermission("probation", "extend", "/admin/probation");
  const probationId = Number(text(formData, "probationId"));
  const newEndDateValue = text(formData, "newEndDate");
  const reason = text(formData, "reason");
  const comments = text(formData, "comments");
  if (!Number.isInteger(probationId) || probationId <= 0 || !validDate(newEndDateValue)) {
    return { ok: false, message: "Select a valid probation record and new end date." };
  }
  if (reason.length < 3) return { ok: false, message: "An extension reason is required." };
  const newEndDate = dateAtNoon(newEndDateValue);
  if (newEndDateValue <= kigaliDateKey()) return { ok: false, message: "The extension end date must be in the future." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const probation = await tx.probation.findFirst({
        where: { id: probationId, state: { in: [...openStates] } },
        select: {
          id: true,
          userId: true,
          currentExpectedEndDate: true,
          member: { select: { name: true } },
          decisionRequests: { where: { status: "pending" }, select: { id: true }, take: 1 },
        },
      });
      if (!probation) return { ok: false as const, message: "Only an active or extended probation can be extended." };
      if (probation.decisionRequests.length) return { ok: false as const, message: "Resolve the pending completion or termination request before extending probation." };
      if (newEndDate <= probation.currentExpectedEndDate) return { ok: false as const, message: "The new end date must be after the current expected end date." };

      const extension = await tx.probationExtension.create({
        data: {
          probationId,
          previousExpectedEndDate: probation.currentExpectedEndDate,
          newExpectedEndDate: newEndDate,
          reason,
          comments: comments || null,
          extendedById: actor.id,
        },
      });
      await tx.probation.update({
        where: { id: probationId },
        data: { state: "extended", currentExpectedEndDate: newEndDate, updatedById: actor.id },
      });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "probation.extended",
          module: "probation",
          metadata: { probationId, extensionId: extension.id, newEndDate: newEndDateValue, reason },
        },
      });
      return { ok: true as const, memberId: probation.userId, memberName: probation.member.name, extensionId: extension.id };
    }, { isolationLevel: "Serializable" });
    if (!result.ok) return result;

    await deliverProbationNotification(() => notifyUsers({
      userIds: [result.memberId],
      type: "probation",
      title: "Probation period extended",
      message: `Your probation period was extended through ${newEndDateValue}. Reason: ${reason}`,
      link: "/admin/dashboard",
      sourceType: "probation_extension",
      sourceId: result.extensionId,
      dedupeKey: `probation:${probationId}:extension:${result.extensionId}:member`,
    }));
    await deliverProbationNotification(() => notifyProbationLeaders({
      type: "probation",
      title: "Probation extended",
      message: `${result.memberName}'s probation was extended through ${newEndDateValue}.`,
      probationId,
      dedupeKey: `probation:${probationId}:extension:${result.extensionId}:leaders`,
    }));
    revalidateProbation();
    return { ok: true, message: "Probation extended and the extension history was preserved." };
  } catch (error) {
    return { ok: false, message: errorMessage(error, "The probation period could not be extended.") };
  }
}

export async function requestProbationDecision(formData: FormData): Promise<ProbationActionResult> {
  const requestedState = text(formData, "requestedState");
  if (requestedState !== "completed" && requestedState !== "terminated") {
    return { ok: false, message: "Select completion or termination." };
  }
  const actor = await requirePermission("probation", requestedState === "completed" ? "complete" : "terminate", "/admin/probation");
  if (!actor.roles.some(({ role }) => role.name === "discipline-dpt" || role.name === "admin" || role.name === "super-admin")) {
    return { ok: false, message: "A Discipline leader, Admin, or Super Admin must record completion and termination decisions." };
  }
  const probationId = Number(text(formData, "probationId"));
  const reason = text(formData, "reason");
  const comments = text(formData, "comments");
  if (!Number.isInteger(probationId) || probationId <= 0) return { ok: false, message: "Probation record not found." };
  if (!reason) return { ok: false, message: "A decision reason is required." };
  if (!comments) return { ok: false, message: "Final decision comments are required." };

  const roles = await probationRoles();
  if (!roles.member || !roles.probation) return { ok: false, message: "Probation roles are not configured." };
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const probation = await tx.probation.findFirst({
        where: { id: probationId, state: { in: [...openStates] } },
        select: {
          id: true,
          userId: true,
          member: { select: { name: true } },
          decisionRequests: { where: { status: "pending" }, select: { id: true }, take: 1 },
        },
      });
      if (!probation) return { ok: false as const, message: "Only an active or extended probation can receive a final decision." };
      if (probation.decisionRequests.length) return { ok: false as const, message: "This probation already has a decision awaiting approval." };

      const request = await tx.probationDecisionRequest.create({
        data: {
          probationId,
          requestedState,
          reason,
          comments,
          requestedById: actor.id,
          status: "approved",
          reviewedById: actor.id,
          reviewedAt: now,
        },
      });

      if (requestedState === "completed") {
        await tx.userRole.deleteMany({ where: { userId: probation.userId, roleId: roles.probation } });
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: probation.userId, roleId: roles.member! } },
          update: {},
          create: { userId: probation.userId, roleId: roles.member! },
        });
        await tx.user.update({ where: { id: probation.userId }, data: { status: "active" } });
      } else {
        await tx.user.update({
          where: { id: probation.userId },
          data: { status: "inactive", sessionVersion: { increment: 1 } },
        });
      }

      await tx.probation.update({
        where: { id: probationId },
        data: {
          state: requestedState,
          finalDecisionComments: comments,
          decisionDate: now,
          decidedById: actor.id,
          updatedById: actor.id,
        },
      });
      await tx.probationDecisionRequest.updateMany({
        where: { probationId, status: "pending", id: { not: request.id } },
        data: { status: "cancelled", reviewedById: actor.id, reviewedAt: now, reviewComments: "Cancelled because a final decision was recorded." },
      });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: `probation.${requestedState}`,
          module: "probation",
          metadata: {
            probationId,
            requestId: request.id,
            memberId: probation.userId,
            reason,
            accountDisabled: requestedState === "terminated",
            rolesChanged: requestedState === "completed",
          },
        },
      });
      return { ok: true as const, memberId: probation.userId, memberName: probation.member.name };
    }, { isolationLevel: "Serializable" });
    if (!result.ok) return result;

    if (requestedState === "completed") {
      await deliverProbationNotification(() => notifyUsers({
        userIds: [result.memberId],
        type: "probation",
        title: "Probation completed",
        message: "Your probation was completed successfully. Your account is now a normal member account, and attendance and discipline performance start fresh from this decision.",
        link: "/admin/dashboard",
        sourceType: "probation",
        sourceId: probationId,
        dedupeKey: `probation:${probationId}:completed:member`,
      }));
    }
    await deliverProbationNotification(() => notifyProbationLeaders({
      type: "probation",
      title: `Probation ${requestedState}`,
      message: `${result.memberName}'s probation was ${requestedState} by ${actor.name}.`,
      probationId,
      dedupeKey: `probation:${probationId}:${requestedState}:leaders`,
    }));
    revalidateProbation();
    return {
      ok: true,
      message: requestedState === "completed"
        ? "Probation completed. The probation role was removed and the normal member role was assigned."
        : "Probation terminated. The account was disabled and existing sessions were revoked.",
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error, "The decision could not be recorded.") };
  }
}

export async function reopenProbation(formData: FormData): Promise<ProbationActionResult> {
  const actor = await requirePermission("probation", "reopen", "/admin/probation");
  const probationId = Number(text(formData, "probationId"));
  const newEndDateValue = text(formData, "newEndDate");
  const reason = text(formData, "reason");
  const comments = text(formData, "comments");
  if (!Number.isInteger(probationId) || probationId <= 0 || !validDate(newEndDateValue)) {
    return { ok: false, message: "Select a valid closed probation and new expected end date." };
  }
  if (reason.length < 3) return { ok: false, message: "A reopening reason is required." };
  const newEndDate = dateAtNoon(newEndDateValue);
  if (newEndDateValue <= kigaliDateKey()) return { ok: false, message: "The reopened probation must end on a future date." };
  const roles = await probationRoles();
  if (!roles.member || !roles.probation) return { ok: false, message: "Probation roles are not configured." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const probation = await tx.probation.findFirst({
        where: { id: probationId, state: { in: ["completed", "terminated"] } },
        select: { id: true, userId: true, currentExpectedEndDate: true, member: { select: { name: true } } },
      });
      if (!probation) return { ok: false as const, message: "Only a completed or terminated probation can be reopened." };
      if (newEndDate <= probation.currentExpectedEndDate) {
        return { ok: false as const, message: "The new end date must be after the previous expected end date." };
      }
      const anotherOpen = await tx.probation.findFirst({
        where: { userId: probation.userId, state: { in: [...openStates] }, id: { not: probationId } },
        select: { id: true },
      });
      if (anotherOpen) return { ok: false as const, message: "This member already has another open probation record." };

      await tx.userRole.deleteMany({ where: { userId: probation.userId, roleId: roles.member } });
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: probation.userId, roleId: roles.probation! } },
        update: {},
        create: { userId: probation.userId, roleId: roles.probation! },
      });
      await tx.user.update({ where: { id: probation.userId }, data: { status: "active" } });
      const extension = await tx.probationExtension.create({
        data: {
          probationId,
          previousExpectedEndDate: probation.currentExpectedEndDate,
          newExpectedEndDate: newEndDate,
          reason: `Reopened: ${reason}`,
          comments: comments || null,
          extendedById: actor.id,
        },
      });
      await tx.probation.update({
        where: { id: probationId },
        data: {
          state: "extended",
          currentExpectedEndDate: newEndDate,
          finalDecisionComments: null,
          decisionDate: null,
          decidedById: null,
          updatedById: actor.id,
        },
      });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: "probation.reopened",
          module: "probation",
          metadata: { probationId, memberId: probation.userId, extensionId: extension.id, newEndDate: newEndDateValue, reason },
        },
      });
      return { ok: true as const, memberId: probation.userId, memberName: probation.member.name, extensionId: extension.id };
    }, { isolationLevel: "Serializable" });
    if (!result.ok) return result;

    await deliverProbationNotification(() => notifyUsers({
      userIds: [result.memberId],
      type: "probation",
      title: "Probation reopened",
      message: `Your probation was reopened through ${newEndDateValue}.`,
      link: "/admin/dashboard",
      sourceType: "probation_extension",
      sourceId: result.extensionId,
      dedupeKey: `probation:${probationId}:reopened:member:${result.extensionId}`,
    }));
    await deliverProbationNotification(() => notifyProbationLeaders({
      type: "probation",
      title: "Probation reopened",
      message: `${result.memberName}'s probation was reopened through ${newEndDateValue}.`,
      probationId,
      dedupeKey: `probation:${probationId}:reopened:leaders:${result.extensionId}`,
    }));
    revalidateProbation();
    return { ok: true, message: "Probation reopened in the extended state without a separate approval." };
  } catch (error) {
    return { ok: false, message: errorMessage(error, "The probation record could not be reopened.") };
  }
}
