import { ProbationClient, type ProbationRow } from "@/components/probation-client";
import { getUserPermissionSet, permissionSetHas, requirePageAccess } from "@/lib/auth";
import { getProbationMonitoring, probationDateSummary } from "@/lib/probation-data";
import { DEFAULT_PROBATION_DURATION_MONTHS } from "@/lib/probation-rules";
import { prisma } from "@/lib/prisma";
import { getSystemSetting, settingToNumber } from "@/lib/system-settings";

function dateValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function dateTimeValue(date: Date | null) {
  return date?.toISOString() ?? null;
}

export default async function ProbationPage({
  searchParams,
}: {
  searchParams: Promise<{ record?: string; status?: string }>;
}) {
  const user = await requirePageAccess("probation");
  const [params, permissions, defaultDurationSetting, probations, eligibleMembers, decisionApprovers] = await Promise.all([
    searchParams,
    getUserPermissionSet(user),
    getSystemSetting("probation_default_duration_months"),
    prisma.probation.findMany({
      orderBy: [{ state: "asc" }, { currentExpectedEndDate: "asc" }, { createdAt: "desc" }],
      include: {
        member: { select: { id: true, name: true, email: true, phone: true, status: true } },
        assignedAdmin: { select: { name: true } },
        creator: { select: { name: true } },
        updater: { select: { name: true } },
        decisionMaker: { select: { name: true } },
        extensions: {
          orderBy: { extensionDate: "desc" },
          include: { extender: { select: { name: true } } },
        },
        decisionRequests: {
          orderBy: { requestedAt: "desc" },
          include: {
            requester: { select: { name: true } },
            reviewer: { select: { name: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        status: "active",
        OR: [{ membershipType: null }, { membershipType: { not: "temporary" } }],
        probations: { none: { state: { in: ["active", "extended"] } } },
        roles: { none: { role: { name: { in: ["admin", "super-admin"] } } } },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.user.findMany({
      where: {
        id: { not: user.id },
        status: "active",
        roles: { some: { role: { name: { in: ["admin", "super-admin"] } } } },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, email: true },
    }),
  ]);

  const canViewConfidential = permissionSetHas(permissions, "probation", "view-confidential-comments");
  const canViewDiscipline = permissionSetHas(permissions, "discipline", "view");
  const isAdministrator = user.roles.some(({ role }) => role.name === "admin" || role.name === "super-admin");
  const isDisciplineLeader = user.roles.some(({ role }) => role.name === "discipline-dpt");
  const canRequestFinalDecision = isDisciplineLeader || user.roles.some(({ role }) => role.name === "super-admin");
  const rows: ProbationRow[] = await Promise.all(probations.map(async (probation) => {
    const monitoring = await getProbationMonitoring(probation);
    const dates = probationDateSummary(probation.currentExpectedEndDate);
    return {
      id: probation.id,
      member: probation.member,
      state: probation.state,
      originalStartDate: dateValue(probation.originalStartDate)!,
      originalExpectedEndDate: dateValue(probation.originalExpectedEndDate)!,
      currentExpectedEndDate: dateValue(probation.currentExpectedEndDate)!,
      daysRemaining: dates.daysRemaining,
      isOverdue: dates.isOverdue && (probation.state === "active" || probation.state === "extended"),
      dueWithin14Days: dates.dueWithin14Days && (probation.state === "active" || probation.state === "extended"),
      memberVisibleSummary: probation.memberVisibleSummary,
      confidentialComments: canViewConfidential ? probation.confidentialComments : null,
      finalDecisionComments: probation.finalDecisionComments,
      decisionDate: dateTimeValue(probation.decisionDate),
      decisionMakerName: probation.decisionMaker?.name ?? null,
      createdByName: probation.creator.name,
      updatedByName: probation.updater.name,
      createdAt: probation.createdAt.toISOString(),
      updatedAt: probation.updatedAt.toISOString(),
      monitoring,
      canApprovePendingDecision: isAdministrator && probation.assignedAdminId === user.id,
      pendingApproverName: probation.decisionRequests.some((decision) => decision.status === "pending")
        ? probation.assignedAdmin.name
        : null,
      extensions: probation.extensions.map((extension) => ({
        id: extension.id,
        previousExpectedEndDate: dateValue(extension.previousExpectedEndDate)!,
        newExpectedEndDate: dateValue(extension.newExpectedEndDate)!,
        reason: extension.reason,
        comments: extension.comments,
        extendedByName: extension.extender.name,
        extensionDate: extension.extensionDate.toISOString(),
      })),
      decisions: probation.decisionRequests.map((decision) => ({
        id: decision.id,
        requestedState: decision.requestedState,
        reason: decision.reason,
        comments: decision.comments,
        status: decision.status,
        requestedByName: decision.requester.name,
        requestedAt: decision.requestedAt.toISOString(),
        reviewedByName: decision.reviewer?.name ?? null,
        reviewedAt: dateTimeValue(decision.reviewedAt),
        reviewComments: decision.reviewComments,
      })),
    };
  }));

  const defaultDurationMonths = Math.max(
    1,
    Math.min(24, settingToNumber(defaultDurationSetting, DEFAULT_PROBATION_DURATION_MONTHS)),
  );

  return (
    <ProbationClient
      rows={rows}
      eligibleMembers={eligibleMembers}
      decisionApprovers={decisionApprovers}
      defaultDurationMonths={defaultDurationMonths}
      initialRecordId={Number(params.record) || null}
      initialStatus={params.status ?? "open"}
      showDisciplineTabs={canViewDiscipline}
      permissions={{
        enroll: permissionSetHas(permissions, "probation", "enroll"),
        update: permissionSetHas(permissions, "probation", "update"),
        viewConfidential: canViewConfidential,
        extend: permissionSetHas(permissions, "probation", "extend"),
        complete: canRequestFinalDecision && permissionSetHas(permissions, "probation", "complete"),
        terminate: canRequestFinalDecision && permissionSetHas(permissions, "probation", "terminate"),
        reopen: permissionSetHas(permissions, "probation", "reopen"),
        export: permissionSetHas(permissions, "probation", "export"),
      }}
    />
  );
}
