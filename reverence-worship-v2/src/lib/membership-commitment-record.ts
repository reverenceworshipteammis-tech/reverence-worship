import type { Prisma } from "@/generated/prisma/client";
import { hasMembershipQuestion, resolveMembershipQuestion } from "@/lib/membership-question";
import { COMMITMENT_PROFILE_FIELDS, commitmentConfigurationIssue, commitmentProfileUpdate, commitmentProfileValues, parseCommitmentSettings, validateCommitmentProfile, type CommitmentSnapshot } from "@/lib/membership-commitment";

export async function recordMembershipCommitment(tx: Prisma.TransactionClient, input: {
  form: { id: number; title: string; description?: string | null; version: number; questions: Prisma.JsonValue; settings: Prisma.JsonValue };
  userId: number | null; submissionId: number; formData: FormData; answers: Record<string, unknown>;
}) {
  const config = parseCommitmentSettings((input.form.settings as Record<string, unknown> | null)?.commitment);
  if (!config) throw new Error("The commitment configuration has changed. Reload this form.");
  if (Number(input.formData.get("commitment_version")) !== input.form.version) throw new Error("This commitment form has changed. Reload it before submitting.");
  const issue = commitmentConfigurationIssue(config, true);
  if (issue) throw new Error(issue);
  const settings = input.form.settings as Record<string, unknown> | null;
  const limitOneResponse = settings?.limit_one_response !== false;
  if (input.userId) await tx.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${input.userId} FOR UPDATE`;
  const member = input.userId ? await tx.user.findUnique({ where: { id: input.userId } }) : null;
  if (input.userId && (!member || member.status !== "active" || !member.membershipType || !config.membershipTypes.includes(member.membershipType))) throw new Error("This commitment is not available for your membership type.");
  if (limitOneResponse && member && await tx.membershipCommitment.findFirst({ where: { userId: member.id, year: config.year } })) throw new Error(`You have already accepted the membership commitment for ${config.year}.`);
  const membershipSelection = resolveMembershipQuestion(input.form.questions, input.answers);
  const membershipQuestionLinked = hasMembershipQuestion(input.form.questions);
  const configuredProfileFields = membershipQuestionLinked && !config.profileFields.some((field) => field.key === "membershipType")
    ? [...config.profileFields, { key: "membershipType" as const, editable: false, required: false, requiresApproval: false }]
    : config.profileFields;
  const profileFields = member
    ? configuredProfileFields
    : [...configuredProfileFields, ...(["name", "membershipType"] as const)
      .filter((key) => !configuredProfileFields.some((field) => field.key === key))
      .map((key) => ({ key, editable: true, required: true, requiresApproval: false }))];
  const profileConfig = member
    ? { ...config, profileFields: membershipQuestionLinked ? profileFields.map((field) => field.key === "membershipType" ? { ...field, editable: false } : field) : profileFields }
    : {
      ...config,
      profileFields: profileFields.map((field) => ({
        ...field,
        editable: true,
        required: field.required || field.key === "name" || field.key === "membershipType",
        requiresApproval: false,
      })),
    };
  const validated = validateCommitmentProfile(profileConfig, member ? commitmentProfileValues(member) : {}, input.formData);
  if (!validated.ok) throw new Error(validated.message);
  if (membershipSelection) {
    if (!member && validated.values.membershipType && validated.values.membershipType !== membershipSelection.membershipType) throw new Error("The membership type in your profile information must match your membership type answer.");
    validated.values.membershipType = membershipSelection.membershipType;
    if (member && membershipSelection.membershipType !== member.membershipType) validated.changes.push({
      key: "membershipType", label: "Membership type", before: member.membershipType!, after: membershipSelection.membershipType, requiresApproval: false,
    });
  }
  if (membershipQuestionLinked && member) validated.values.membershipType ??= member.membershipType ?? "";
  if (!validated.values.name || validated.values.name.length < 2) throw new Error("Full name must contain at least 2 characters.");
  if (!validated.values.membershipType || !config.membershipTypes.includes(validated.values.membershipType as typeof config.membershipTypes[number])) throw new Error("Select a valid membership type.");
  const snapshot: CommitmentSnapshot = {
    formTitle: input.form.title, formDescription: input.form.description ?? "", memberId: member?.id ?? null, memberName: validated.values.name || member?.name || "",
    terms: config.terms, acceptanceLabel: "", accepted: true,
    profile: profileFields.map((field) => ({ key: field.key, label: COMMITMENT_PROFILE_FIELDS.find((item) => item.key === field.key)!.label, value: validated.values[field.key] ?? "" })),
    questions: Array.isArray(input.form.questions) ? input.form.questions : [], answers: input.answers,
  };
  const recordedChanges = member ? validated.changes.map((change) => ({ ...change, requiresApproval: false })) : [];
  if (member && recordedChanges.length) await tx.user.update({ where: { id: member.id }, data: commitmentProfileUpdate(recordedChanges) as Prisma.UserUpdateInput });
  const commitment = await tx.membershipCommitment.create({ data: {
    userId: member?.id ?? null, formId: input.form.id, submissionId: input.submissionId, year: config.year, formVersion: input.form.version,
    snapshot: snapshot as unknown as Prisma.InputJsonObject, profileChanges: recordedChanges,
    reviewStatus: "none",
  } });
  if (member) await tx.activityLog.create({ data: { userId: member.id, action: "membership.commitment.accepted", module: "intercession", metadata: {
    commitmentId: commitment.id, year: config.year, formId: input.form.id, formVersion: input.form.version,
    updatedFields: recordedChanges.map((change) => change.key),
    ...(membershipSelection ? { membershipQuestionId: membershipSelection.questionId, membershipChange: validated.changes.find((change) => change.key === "membershipType") ?? null } : {}),
  } } });
  return commitment;
}
