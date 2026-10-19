import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { excludeSuperAdminUserWhere } from "@/lib/system-account-rules";
import { userIdsWithPermission } from "@/lib/notifications";
import { MEMBERSHIP_TYPES } from "@/lib/membership-types";
import {
  commitmentConfigurationIssue, parseCommitmentAudience, parseCommitmentSettings,
  type CommitmentSnapshot,
} from "@/lib/membership-commitment";

export function settingsObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function hadRestrictedMembershipAudience(value: unknown) {
  const types = settingsObject(value).membershipTypes;
  return Array.isArray(types) && MEMBERSHIP_TYPES.some((type) => !types.includes(type));
}

export async function prepareCommitmentFormSettings(incoming: Record<string, unknown>, previous: unknown = {}, formId?: number) {
  const current = settingsObject(previous);
  const publishing = Boolean(incoming.is_published || incoming.submission_opens_at);
  const issue = commitmentConfigurationIssue(incoming.commitment, publishing);
  if (issue) return { ok: false as const, message: issue };
  const config = parseCommitmentSettings(incoming.commitment);
  const oldConfig = parseCommitmentSettings(current.commitment);
  if (formId && config && !oldConfig && await prisma.formSubmission.count({ where: { formId } })) return { ok: false as const, message: "This form already has responses. Create a new annual commitment form to preserve its history." };
  if (formId && oldConfig && (!config || config.year !== oldConfig.year)) {
    if (await prisma.membershipCommitment.count({ where: { formId } })) return { ok: false as const, message: "This form already has accepted commitments. Duplicate it to start a different year." };
  }
  const { commitment_audience: _untrustedAudience, ...settings } = incoming;
  void _untrustedAudience;
  if (!config) return { ok: true as const, settings: { ...settings, commitment: null } as Prisma.InputJsonObject };
  let audience = oldConfig?.year === config.year ? parseCommitmentAudience(current.commitment_audience) : [];
  const previouslyRestricted = hadRestrictedMembershipAudience(current.commitment);
  if (publishing && (!audience.length || previouslyRestricted)) {
    const eligibleIds = await userIdsWithPermission("intercession", "submit-forms");
    const eligibleMembers = await prisma.user.findMany({
      where: { id: { in: eligibleIds }, status: "active", membershipType: { in: [...config.membershipTypes] }, ...excludeSuperAdminUserWhere() },
      select: { id: true, name: true, membershipType: true }, orderBy: { name: "asc" },
    });
    audience = [...new Map([...audience, ...eligibleMembers].map((member) => [member.id, member])).values()];
  }
  return { ok: true as const, settings: {
    ...settings, commitment: config as unknown as Prisma.InputJsonObject, commitment_audience: audience,
    allow_response_editing: false, is_quiz: false,
    allow_empty_submission: true, submit_button_style: "default", submit_button_label: "Confirm and Accept Commitment",
    max_responses: 0, redirect_url: "",
    thank_you_message: typeof incoming.thank_you_message === "string" && incoming.thank_you_message.trim() ? incoming.thank_you_message.slice(0, 1000) : `Your membership commitment for ${config.year} has been successfully submitted.`,
  } as Prisma.InputJsonObject };
}

export type CommitmentReportRow = { id: number; name: string; membershipType: string | null; year: number; status: "Accepted" | "Pending"; acceptedAt: string | null; commitmentId: number | null; changes: number };

export async function loadCommitmentReports(requestedYear?: number) {
  const [forms, recordYears] = await Promise.all([
    prisma.spiritualForm.findMany({ select: { id: true, title: true, settings: true, isActive: true } }),
    prisma.membershipCommitment.findMany({ distinct: ["year"], select: { year: true } }),
  ]);
  const campaigns = forms.flatMap((form) => {
    const settings = settingsObject(form.settings);
    const config = parseCommitmentSettings(settings.commitment);
    return config ? [{ ...form, config, audience: parseCommitmentAudience(settings.commitment_audience), previouslyRestricted: hadRestrictedMembershipAudience(settings.commitment) }] : [];
  });
  const years = [...new Set([...campaigns.map((form) => form.config.year), ...recordYears.map((record) => record.year)])].sort((a, b) => b - a);
  const year = requestedYear && years.includes(requestedYear) ? requestedYear : years[0] ?? new Date().getUTCFullYear();
  const records = await prisma.membershipCommitment.findMany({ where: { year }, orderBy: { acceptedAt: "desc" } });
  const yearCampaigns = campaigns.filter((form) => form.config.year === year);
  const people = new Map(yearCampaigns.flatMap((form) => form.audience.map((member) => [member.id, member] as const)));
  if (yearCampaigns.some((form) => form.previouslyRestricted)) {
    const eligibleIds = await userIdsWithPermission("intercession", "submit-forms");
    const eligibleMembers = await prisma.user.findMany({
      where: { id: { in: eligibleIds }, status: "active", membershipType: { in: [...MEMBERSHIP_TYPES] }, ...excludeSuperAdminUserWhere() },
      select: { id: true, name: true, membershipType: true }, orderBy: { name: "asc" },
    });
    for (const member of eligibleMembers) if (!people.has(member.id)) people.set(member.id, member);
  }
  const acceptedIds = new Set<number>();
  const rows: CommitmentReportRow[] = records.map((record) => {
    const snapshot = record.snapshot as unknown as CommitmentSnapshot;
    if (record.userId !== null) acceptedIds.add(record.userId);
    const membership = snapshot.profile.find((field) => field.key === "membershipType")?.value ?? people.get(record.userId ?? 0)?.membershipType ?? null;
    return { id: record.userId ?? -record.id, name: snapshot.memberName, membershipType: membership, year, status: "Accepted", acceptedAt: record.acceptedAt.toISOString(), commitmentId: record.id, changes: Array.isArray(record.profileChanges) ? record.profileChanges.length : 0 };
  });
  for (const member of people.values()) {
    if (!acceptedIds.has(member.id)) rows.push({ ...member, year, status: "Pending", acceptedAt: null, commitmentId: null, changes: 0 });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return { years, year, rows, campaigns: campaigns.filter((form) => form.config.year === year).map((form) => ({ id: form.id, title: form.title })) };
}
