"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUserPermissionSet, permissionSetHas, requirePermission, requireUser } from "@/lib/auth";
import { notifyUsers, userIdsWithPermission } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

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
  return datePattern.test(value) && !Number.isNaN(dateAtNoon(value).getTime());
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
  const memberVisibleSummary = text(formData, "memberVisibleSummary");
  const confidentialComments = text(formData, "confidentialComments");
  if (!Number.isInteger(probationId) || probationId <= 0) {
    return { ok: false, message: "Select a valid probation record." };
  }

  const permissions = await getUserPermissionSet(actor);
  const canEditConfidential = permissionSetHas(permissions, "probation", "view-confidential-comments");
  const existing = await prisma.probation.findUnique({
    where: { id: probationId },
    select: {
      state: true,
      confidentialComments: true,
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
        updatedById: actor.id,
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: actor.id,
        action: "probation.updated",
        module: "probation",
        metadata: { probationId, confidentialCommentsUpdated: canEditConfidential },
      },
    }),
  ]);
  revalidateProbation();
  return { ok: true, message: "Probation details updated." };
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
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (newEndDate <= today) return { ok: false, message: "The extension end date must be in the future." };

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
    return { ok: false, message: "A Discipline leader, Admin, or Super Admin must submit completion and termination requests." };
  }
  const probationId = Number(text(formData, "probationId"));
  const approverId = Number(text(formData, "approverId"));
  const reason = text(formData, "reason");
  const comments = text(formData, "comments");
  if (!Number.isInteger(probationId) || probationId <= 0) return { ok: false, message: "Probation record not found." };
  if (!Number.isInteger(approverId) || approverId <= 0) return { ok: false, message: "Select an administrator to approve this decision." };
  if (approverId === actor.id) return { ok: false, message: "The requester and approver must be different users." };
  if (!reason) return { ok: false, message: "A decision reason is required." };
  if (!comments) return { ok: false, message: "Final decision comments are required." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [probation, approver] = await Promise.all([
        tx.probation.findFirst({
          where: { id: probationId, state: { in: [...openStates] } },
          select: {
            id: true,
            userId: true,
            member: { select: { name: true } },
            decisionRequests: { where: { status: "pending" }, select: { id: true }, take: 1 },
          },
        }),
        tx.user.findFirst({
          where: {
            id: approverId,
            status: "active",
            roles: { some: { role: { name: { in: ["admin", "super-admin"] } } } },
          },
          select: { id: true, name: true },
        }),
      ]);
      if (!probation) return { ok: false as const, message: "Only an active or extended probation can receive a final decision request." };
      if (!approver) return { ok: false as const, message: "Select an active user with Admin or Super Admin rights." };
      if (probation.decisionRequests.length) return { ok: false as const, message: "This probation already has a decision awaiting approval." };

      const request = await tx.probationDecisionRequest.create({
        data: {
          probationId,
          requestedState,
          reason,
          comments,
          requestedById: actor.id,
        },
      });
      await tx.probation.update({
        where: { id: probationId },
        data: { assignedAdminId: approver.id, updatedById: actor.id },
      });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: `probation.${requestedState}-requested`,
          module: "probation",
          metadata: { probationId, requestId: request.id, approverId: approver.id, reason },
        },
      });
      return {
        ok: true as const,
        requestId: request.id,
        approverId: approver.id,
        approverName: approver.name,
        memberName: probation.member.name,
      };
    }, { isolationLevel: "Serializable" });
    if (!result.ok) return result;

    await deliverProbationNotification(() => notifyUsers({
      userIds: [result.approverId],
      type: "probation",
      title: `Probation ${requestedState === "completed" ? "completion" : "termination"} awaiting approval`,
      message: `${actor.name} requested ${requestedState === "completed" ? "completion" : "termination"} of ${result.memberName}'s probation.`,
      link: `/admin/probation?record=${probationId}`,
      sourceType: "probation_decision_request",
      sourceId: result.requestId,
      dedupeKey: `probation-decision:${result.requestId}:submitted`,
    }));
    revalidateProbation();
    return { ok: true, message: `The ${requestedState === "completed" ? "completion" : "termination"} request was sent to ${result.approverName} for approval.` };
  } catch (error) {
    return { ok: false, message: errorMessage(error, "The decision request could not be submitted.") };
  }
}

async function assignedAdminForRequest(requestId: number, userId: number) {
  return prisma.probationDecisionRequest.findFirst({
    where: {
      id: requestId,
      status: "pending",
      requestedById: { not: userId },
      probation: { assignedAdminId: userId },
    },
    select: {
      id: true,
      requestedState: true,
      reason: true,
      comments: true,
      requestedById: true,
      probationId: true,
      probation: {
        select: {
          state: true,
          userId: true,
          member: { select: { name: true } },
        },
      },
    },
  });
}

export async function approveProbationDecision(requestId: number, reviewComments: string): Promise<ProbationActionResult> {
  const actor = await requireUser();
  const actorRoles = actor.roles.map((item) => item.role.name);
  if (!actorRoles.some((role) => role === "admin" || role === "super-admin")) {
    return { ok: false, message: "You are not authorized to approve this decision." };
  }
  if (!Number.isInteger(requestId) || requestId <= 0) return { ok: false, message: "Decision request not found." };
  const request = await assignedAdminForRequest(requestId, actor.id);
  if (!request) return { ok: false, message: "You are not authorized to approve this pending decision." };
  if (!openStates.includes(request.probation.state as (typeof openStates)[number])) {
    return { ok: false, message: "This probation is no longer open." };
  }

  const roles = await probationRoles();
  if (!roles.member || !roles.probation) return { ok: false, message: "Probation roles are not configured." };
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.probationDecisionRequest.updateMany({
        where: { id: requestId, status: "pending", probation: { assignedAdminId: actor.id, state: { in: [...openStates] } } },
        data: { status: "approved", reviewedById: actor.id, reviewedAt: now, reviewComments: reviewComments.trim() || null },
      });
      if (claimed.count !== 1) return { ok: false as const, message: "This request changed. Refresh and try again." };

      if (request.requestedState === "completed") {
        await tx.userRole.deleteMany({ where: { userId: request.probation.userId, roleId: roles.probation } });
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: request.probation.userId, roleId: roles.member! } },
          update: {},
          create: { userId: request.probation.userId, roleId: roles.member! },
        });
        await tx.user.update({ where: { id: request.probation.userId }, data: { status: "active" } });
      } else {
        await tx.user.update({
          where: { id: request.probation.userId },
          data: { status: "inactive", sessionVersion: { increment: 1 } },
        });
      }

      await tx.probation.update({
        where: { id: request.probationId },
        data: {
          state: request.requestedState,
          finalDecisionComments: request.comments,
          decisionDate: now,
          decidedById: actor.id,
          updatedById: actor.id,
        },
      });
      await tx.probationDecisionRequest.updateMany({
        where: { probationId: request.probationId, status: "pending", id: { not: requestId } },
        data: { status: "cancelled", reviewedById: actor.id, reviewedAt: now, reviewComments: "Cancelled because another final decision was approved." },
      });
      await tx.activityLog.create({
        data: {
          userId: actor.id,
          action: `probation.${request.requestedState}`,
          module: "probation",
          metadata: {
            probationId: request.probationId,
            requestId,
            memberId: request.probation.userId,
            requestedById: request.requestedById,
            accountDisabled: request.requestedState === "terminated",
            rolesChanged: request.requestedState === "completed",
          },
        },
      });
      return { ok: true as const };
    }, { isolationLevel: "Serializable" });
    if (!result.ok) return result;

    if (request.requestedState === "completed") {
      await deliverProbationNotification(() => notifyUsers({
        userIds: [request.probation.userId],
        type: "probation",
        title: "Probation completed",
        message: "Your probation was completed successfully. Your account is now a normal member account, and attendance and discipline performance start fresh from this decision.",
        link: "/admin/dashboard",
        sourceType: "probation",
        sourceId: request.probationId,
        dedupeKey: `probation:${request.probationId}:completed:member`,
      }));
    }
    await deliverProbationNotification(() => notifyProbationLeaders({
      type: "probation",
      title: `Probation ${request.requestedState}`,
      message: `${request.probation.member.name}'s probation was ${request.requestedState} by ${actor.name}.`,
      probationId: request.probationId,
      extraUserIds: [request.requestedById],
      dedupeKey: `probation:${request.probationId}:${request.requestedState}:leaders`,
    }));
    revalidateProbation();
    return {
      ok: true,
      message: request.requestedState === "completed"
        ? "Probation completed. The probation role was removed and the normal member role was assigned."
        : "Probation terminated. The account was disabled and existing sessions were revoked.",
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error, "The decision could not be approved.") };
  }
}

export async function rejectProbationDecision(requestId: number, reviewComments: string): Promise<ProbationActionResult> {
  const actor = await requireUser();
  const actorRoles = actor.roles.map((item) => item.role.name);
  if (!actorRoles.some((role) => role === "admin" || role === "super-admin")) {
    return { ok: false, message: "You are not authorized to reject this decision." };
  }
  const cleanComments = reviewComments.trim();
  if (cleanComments.length < 3) return { ok: false, message: "A rejection reason is required." };
  const request = await assignedAdminForRequest(requestId, actor.id);
  if (!request) return { ok: false, message: "You are not authorized to reject this pending decision." };

  const updated = await prisma.probationDecisionRequest.updateMany({
    where: { id: requestId, status: "pending", probation: { assignedAdminId: actor.id } },
    data: { status: "rejected", reviewedById: actor.id, reviewedAt: new Date(), reviewComments: cleanComments },
  });
  if (updated.count !== 1) return { ok: false, message: "This request changed. Refresh and try again." };
  await prisma.activityLog.create({
    data: {
      userId: actor.id,
      action: `probation.${request.requestedState}-rejected`,
      module: "probation",
      metadata: { probationId: request.probationId, requestId, requestedById: request.requestedById, reason: cleanComments },
    },
  });
  await deliverProbationNotification(() => notifyUsers({
    userIds: [request.requestedById],
    type: "probation",
    title: "Probation decision request rejected",
    message: `${actor.name} rejected the ${request.requestedState === "completed" ? "completion" : "termination"} request for ${request.probation.member.name}: ${cleanComments}`,
    link: `/admin/probation?record=${request.probationId}`,
    sourceType: "probation_decision_request",
    sourceId: requestId,
    dedupeKey: `probation-decision:${requestId}:rejected`,
  }));
  revalidateProbation();
  return { ok: true, message: "The decision request was rejected. The probation remains open." };
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
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (newEndDate <= today) return { ok: false, message: "The reopened probation must end on a future date." };
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
