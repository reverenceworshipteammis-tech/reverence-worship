import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../src/generated/prisma/client";
import {
  COMMITMENT_PROFILE_FIELDS, commitmentAcceptanceLabel, commitmentConfigurationIssue, commitmentProfileUpdate, commitmentProfileValues,
  defaultCommitmentSettings, parseCommitmentSettings, validateCommitmentProfile,
  type CommitmentSettings, type CommitmentSnapshot,
} from "../src/lib/membership-commitment";
import { recordMembershipCommitment } from "../src/lib/membership-commitment-record";
import { getIntercessionPublishingIssues } from "../src/lib/intercession-form-rules";
import { parseIntercessionFormSettings } from "../src/lib/intercession-form-domain";

function configuration(): CommitmentSettings {
  return { ...defaultCommitmentSettings(2027), terms: "Respect the annual membership responsibilities.", profileFields: [
    { key: "name", editable: false, required: true, requiresApproval: false },
    { key: "email", editable: false, required: true, requiresApproval: false },
    { key: "phone", editable: true, required: true, requiresApproval: false },
    { key: "membershipType", editable: true, required: true, requiresApproval: false },
  ] };
}

function harness(config = configuration()) {
  const member = { id: 12, name: "Member One", email: "member@example.test", status: "active", phone: "0700000000", membershipType: "permanent", dateOfBirth: new Date("2000-03-04T00:00:00Z") };
  const records: Array<{ id: number; userId: number | null; year: number; snapshot: CommitmentSnapshot; profileChanges: unknown; reviewStatus: string }> = [];
  const updates: unknown[] = [];
  const audits: unknown[] = [];
  const tx = {
    $queryRaw: async () => [],
    user: { findUnique: async ({ where }: { where: { id: number } }) => where.id === member.id ? member : null, update: async ({ data }: { data: object }) => { updates.push(data); Object.assign(member, data); return member; } },
    membershipCommitment: {
      findFirst: async ({ where }: { where: { userId: number; year: number } }) => records.find((record) => record.userId === where.userId && record.year === where.year) ?? null,
      create: async ({ data }: { data: Omit<typeof records[number], "id"> }) => { const record = structuredClone({ ...data, id: records.length + 1 }); records.push(record); return record; },
    },
    activityLog: { create: async ({ data }: { data: unknown }) => { audits.push(data); } },
  } as unknown as Prisma.TransactionClient;
  const form = { id: 9, title: "Membership commitment 2027", description: "Review your information.", version: 3, questions: [{ id: "extra", type: "paragraph", label: "Anything else?" }], settings: { commitment: config, limit_one_response: true } as unknown as Prisma.JsonValue };
  const data = new FormData();
  data.set("commitment_version", "3");
  data.set("profile_phone", "0788888888"); data.set("profile_membershipType", "partner");
  const input: { form: typeof form; userId: number | null; submissionId: number; formData: FormData; answers: Record<string, unknown> } = { form, userId: member.id, submissionId: 21, formData: data, answers: { question_0: "My answer" } };
  return { member, records, updates, audits, tx, input, data };
}

test("commitments can publish without terms or an acceptance statement, but require member fields", () => {
  const draft = defaultCommitmentSettings(2027);
  assert.equal(commitmentConfigurationIssue(draft), null);
  assert.equal(commitmentConfigurationIssue(draft, true), null);
  assert.equal(commitmentConfigurationIssue({ ...configuration(), acceptanceLabel: "" }, true), null);
  assert.match(commitmentConfigurationIssue({ ...configuration(), profileFields: [] }, true)!, /at least one/);
  assert.equal(getIntercessionPublishingIssues("Membership commitment", [], { commitment: configuration() }).length, 0);
  assert.equal(getIntercessionPublishingIssues("Membership commitment", [], { commitment: draft }).length, 0);
});

test("only allowed profile fields and membership types are configurable", () => {
  assert.ok(commitmentConfigurationIssue({ ...configuration(), profileFields: [{ key: "roles", editable: true, required: true, requiresApproval: false }] }));
  assert.ok(commitmentConfigurationIssue({ ...configuration(), membershipTypes: ["visitor"] }));
  assert.ok(commitmentConfigurationIssue({ ...configuration(), year: 2027.5 }));
  assert.ok(commitmentConfigurationIssue({ ...configuration(), profileFields: [configuration().profileFields[0], configuration().profileFields[0]] }));
});

test("removed emergency contact and skills fields are excluded from commitment forms", () => {
  const fields = defaultCommitmentSettings(2027).profileFields;
  assert.equal(fields.some(({ key }) => ["emergencyName", "emergencyPhone", "skills"].includes(key)), false);

  const legacy = {
    ...configuration(),
    profileFields: [
      ...configuration().profileFields,
      { key: "emergencyName" as const, editable: false, required: false, requiresApproval: false },
      { key: "emergencyPhone" as const, editable: false, required: false, requiresApproval: false },
      { key: "skills" as const, editable: false, required: false, requiresApproval: false },
    ],
  };
  const parsed = parseCommitmentSettings(legacy);
  assert.deepEqual(parsed?.profileFields.map(({ key }) => key), configuration().profileFields.map(({ key }) => key));
  assert.equal(commitmentConfigurationIssue(legacy), null);
});

test("legacy commitment audience selections no longer restrict the three membership types", () => {
  const stored = { ...configuration(), membershipTypes: ["permanent" as const] };
  const parsed = parseCommitmentSettings(stored);
  assert.deepEqual(parsed?.membershipTypes, ["permanent", "temporary", "partner"]);
  assert.deepEqual(stored.membershipTypes, ["permanent"]);
  assert.equal(commitmentConfigurationIssue(stored, true), null);
});

test("commitment response settings honor administrator choices", () => {
  const parsed = parseIntercessionFormSettings({
    commitment: configuration(),
    allow_view_response: false,
    limit_one_response: false,
    require_login: false,
  });
  assert.equal(parsed.allow_view_response, false);
  assert.equal(parsed.limit_one_response, false);
  assert.equal(parsed.require_login, false);
});

test("account email is read-only and editable commitment changes do not require approval", () => {
  const config = parseCommitmentSettings({ ...configuration(), profileFields: configuration().profileFields.map((field) => ({ ...field, editable: true, requiresApproval: false })) })!;
  assert.equal(config.profileFields.find((field) => field.key === "email")?.editable, false);
  assert.equal(config.profileFields.find((field) => field.key === "membershipType")?.requiresApproval, false);
});

test("prefilling normalizes database values without exposing unselected administrative fields", () => {
  const values = commitmentProfileValues({ name: "Member", dateOfBirth: new Date("2001-01-02T00:00:00Z"), passwordHash: "secret", notes: "private", sessionVersion: 10 });
  assert.equal(values.dateOfBirth, "2001-01-02");
  assert.equal(values.phone, "");
  assert.equal("passwordHash" in values, false); assert.equal("notes" in values, false); assert.equal("sessionVersion" in values, false);
});

test("education profile fields can be included and are formatted for commitment forms", () => {
  const config = defaultCommitmentSettings(2027);
  const educationKeys = [
    "highestEducationLevel",
    "educationFieldOfStudy",
  ] as const;
  assert.deepEqual(
    COMMITMENT_PROFILE_FIELDS.filter((field) => educationKeys.includes(field.key as (typeof educationKeys)[number])).map(({ key }) => key),
    educationKeys,
  );

  config.profileFields.push(
    { key: "highestEducationLevel", editable: false, required: false, requiresApproval: false },
    { key: "educationFieldOfStudy", editable: false, required: false, requiresApproval: false },
  );
  const values = commitmentProfileValues({
    highestEducationLevel: "bachelors_a0",
    educationFieldOfStudy: "Accounting",
  });
  assert.equal(values.highestEducationLevel, "bachelors_a0");
  const parsedConfig = parseCommitmentSettings(config);
  assert.equal(parsedConfig?.profileFields.length, config.profileFields.length);
  assert.equal(parsedConfig?.profileFields.some((field) => field.key === "educationFieldOfStudy"), true);
});

test("removed education fields saved in older commitment settings are ignored", () => {
  const parsed = parseCommitmentSettings({
    ...configuration(),
    profileFields: [
      { key: "highestEducationLevel", editable: true, required: false, requiresApproval: false },
      { key: "educationInstitution", editable: true, required: true, requiresApproval: false },
      { key: "educationCompletionYear", editable: true, required: true, requiresApproval: false },
    ],
  });
  assert.ok(parsed);
  assert.equal(parsed.profileFields.some((field) => ["educationInstitution", "educationCompletionYear"].includes(field.key)), false);
});

test("education level reveals and validates its dependent commitment fields", () => {
  const config = parseCommitmentSettings({
    ...configuration(),
    profileFields: [{ key: "highestEducationLevel", editable: true, required: true, requiresApproval: false }],
  })!;
  for (const field of config.profileFields) {
    if (field.key === "educationFieldOfStudy") {
      field.required = true;
    }
  }
  const h = harness(config);

  h.data.set("profile_highestEducationLevel", "bachelors_a0");
  assert.equal(validateCommitmentProfile(config, {}, h.data).ok, false);
  h.data.set("profile_educationFieldOfStudy", "Accounting");
  assert.equal(validateCommitmentProfile(config, {}, h.data).ok, true);

  h.data.set("profile_highestEducationLevel", "other");
  assert.equal(validateCommitmentProfile(config, {}, h.data).ok, true);

  h.data.set("profile_highestEducationLevel", "primary");
  h.data.delete("profile_educationFieldOfStudy");
  assert.equal(validateCommitmentProfile(config, {}, h.data).ok, true);
});

test("read-only tampering and arbitrary profile keys never change the accepted information", () => {
  const h = harness();
  h.data.set("profile_name", "Someone else"); h.data.set("profile_email", "another@example.test"); h.data.set("profile_roles", "super-admin");
  const result = validateCommitmentProfile(parseCommitmentSettings(configuration())!, commitmentProfileValues(h.member), h.data);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.values.name, "Member One"); assert.equal(result.values.email, "member@example.test");
  assert.equal("roles" in result.values, false);
  assert.deepEqual(result.changes.map((change) => [change.key, change.requiresApproval]), [["phone", false], ["membershipType", false]]);
});

test("required fields, valid membership values, birth dates, and lengths are checked on the server", () => {
  const h = harness();
  h.data.set("profile_phone", "");
  assert.equal(validateCommitmentProfile(configuration(), commitmentProfileValues(h.member), h.data).ok, false);
  h.data.set("profile_phone", "1".repeat(41));
  assert.equal(validateCommitmentProfile(configuration(), commitmentProfileValues(h.member), h.data).ok, false);
  h.data.set("profile_phone", "0788888888"); h.data.set("profile_membershipType", "visitor");
  assert.equal(validateCommitmentProfile(configuration(), commitmentProfileValues(h.member), h.data).ok, false);
  const config = { ...configuration(), profileFields: [{ key: "dateOfBirth" as const, editable: true, required: false, requiresApproval: false }] };
  for (const date of ["2000-02-30", "tomorrow", "2090-01-01"]) {
    h.data.set("profile_dateOfBirth", date);
    assert.equal(validateCommitmentProfile(config, commitmentProfileValues(h.member), h.data, new Date("2026-10-19")).ok, false);
  }
  h.data.set("profile_dateOfBirth", "2000-02-29");
  assert.equal(validateCommitmentProfile(config, commitmentProfileValues(h.member), h.data, new Date("2026-10-19")).ok, true);
});

test("commitment form submission needs no separate acceptance checkbox and rejects stale versions", async () => {
  for (const [field, value, message] of [["commitment_version", "2", /form has changed/], ["commitment_version", "", /form has changed/]] as const) {
    const h = harness(); h.data.set(field, value);
    await assert.rejects(recordMembershipCommitment(h.tx, h.input), message);
    assert.equal(h.records.length, 0); assert.equal(h.updates.length, 0);
  }
  const h = harness({ ...configuration(), acceptanceLabel: "" });
  await recordMembershipCommitment(h.tx, h.input);
  assert.equal(h.records.length, 1);
  assert.equal(h.records[0].snapshot.acceptanceLabel, "");
});

test("submission uses the signed-in member, applies permitted changes, and saves separate evidence", async () => {
  const h = harness(); h.data.set("userId", "44"); h.data.set("profile_email", "fake@example.test");
  await recordMembershipCommitment(h.tx, h.input);
  assert.equal(h.records.length, 1); assert.equal(h.records[0].userId, 12); assert.equal(h.records[0].year, 2027);
  assert.equal(h.records[0].reviewStatus, "none");
  assert.equal(h.member.membershipType, "partner");
  assert.equal(h.member.phone, "0788888888");
  assert.deepEqual(h.updates, [{ phone: "0788888888", membershipType: "partner" }]);
  assert.equal(h.records[0].snapshot.accepted, true); assert.equal(h.records[0].snapshot.acceptanceLabel, ""); assert.equal(h.records[0].snapshot.profile.find((field) => field.key === "membershipType")?.value, "partner");
  assert.equal(h.records[0].snapshot.profile.find((field) => field.key === "email")?.value, "member@example.test");
  assert.equal(h.audits.length, 1);
});

test("changing a later profile, question, or template cannot change previously accepted evidence", async () => {
  const h = harness(); await recordMembershipCommitment(h.tx, h.input);
  h.member.name = "Later Name"; h.member.phone = "0799999999";
  (h.input.form.settings as unknown as { commitment: CommitmentSettings }).commitment.terms = "New terms";
  h.input.form.questions[0].label = "Different question"; h.input.answers.question_0 = "Later answer";
  const snapshot = h.records[0].snapshot;
  assert.equal(snapshot.memberName, "Member One"); assert.equal(snapshot.terms, "Respect the annual membership responsibilities.");
  assert.equal(snapshot.profile.find((field) => field.key === "phone")?.value, "0788888888");
  assert.equal((snapshot.questions[0] as { label: string }).label, "Anything else?"); assert.equal(snapshot.answers.question_0, "My answer");
});

test("a member cannot accept twice in the same year even on another form, but can renew next year", async () => {
  const h = harness(); await recordMembershipCommitment(h.tx, h.input);
  h.input.form.id = 10;
  await assert.rejects(recordMembershipCommitment(h.tx, h.input), /already accepted.*2027/);
  assert.equal(h.records.length, 1);
  const config = (h.input.form.settings as unknown as { commitment: CommitmentSettings }).commitment;
  config.year = 2028; config.acceptanceLabel = commitmentAcceptanceLabel(2028);
  await recordMembershipCommitment(h.tx, h.input);
  assert.deepEqual(h.records.map((record) => record.year), [2027, 2028]);
  assert.equal(h.records[0].snapshot.acceptanceLabel, ""); assert.equal(h.records[1].snapshot.acceptanceLabel, "");
});

test("admins can allow repeated member submissions and retain anonymous commitment evidence", async () => {
  const h = harness();
  (h.input.form.settings as unknown as { limit_one_response: boolean }).limit_one_response = false;
  await recordMembershipCommitment(h.tx, h.input);
  h.input.submissionId = 22;
  await recordMembershipCommitment(h.tx, h.input);
  assert.equal(h.records.length, 2);

  const guest = harness();
  guest.input.userId = null;
  (guest.input.form.settings as unknown as { commitment: CommitmentSettings }).commitment.profileFields = [
    { key: "name", editable: true, required: true, requiresApproval: false },
    { key: "membershipType", editable: false, required: true, requiresApproval: false },
  ];
  guest.data.set("profile_name", "Guest Member");
  guest.data.set("profile_membershipType", "partner");
  (guest.input.form.settings as unknown as { limit_one_response: boolean }).limit_one_response = false;
  await recordMembershipCommitment(guest.tx, guest.input);
  assert.equal(guest.records.length, 1);
  assert.equal(guest.records[0].userId, null);
  assert.equal(guest.records[0].snapshot.memberId, null);
  assert.equal(guest.records[0].snapshot.memberName, "Guest Member");
  assert.equal(guest.records[0].snapshot.profile.find((field) => field.key === "membershipType")?.value, "partner");
  assert.deepEqual(guest.updates, []);
});

test("inactive accounts, ineligible membership types, and other member identities cannot submit", async () => {
  for (const alter of [(h: ReturnType<typeof harness>) => { h.member.status = "inactive"; }, (h: ReturnType<typeof harness>) => { h.member.membershipType = "unknown"; }, (h: ReturnType<typeof harness>) => { h.input.userId = 99; }]) {
    const h = harness(); alter(h);
    await assert.rejects(recordMembershipCommitment(h.tx, h.input), /not available/);
    assert.equal(h.records.length, 0); assert.equal(h.updates.length, 0);
  }
});

test("members of every current type can accept a legacy form saved for permanent members", async () => {
  for (const membershipType of ["permanent", "temporary", "partner"] as const) {
    const config = configuration(); config.membershipTypes = ["permanent"];
    const h = harness(config);
    h.member.membershipType = membershipType;
    h.data.set("profile_membershipType", membershipType);
    h.data.set("profile_phone", h.member.phone);
    await recordMembershipCommitment(h.tx, h.input);
    assert.equal(h.records.length, 1, membershipType);
    assert.equal(h.records[0].snapshot.profile.find((field) => field.key === "membershipType")?.value, membershipType);
    assert.equal(h.member.membershipType, membershipType);
    assert.deepEqual(h.updates, []);
  }
});

test("permitted profile values convert dates and optional cleared values for existing profiles", () => {
  assert.deepEqual(commitmentProfileUpdate([{ key: "dateOfBirth", label: "Date of birth", before: "", after: "2000-01-01", requiresApproval: false }, { key: "phone", label: "Phone", before: "123", after: "", requiresApproval: false }]), { dateOfBirth: new Date("2000-01-01T12:00:00Z"), phone: null });
});

const membershipQuestion = () => ({
  id: "membership-choice", type: "multiple_choice", label: "I commit to be", required: true,
  options: ["Umunyamuryango uhoraho", "Umunyamuryango udahoraho", "Umufatanyabikorwa"],
  membershipTypeMapping: ["permanent", "temporary", "partner"],
});

test("skipping an optional membership type question preserves the member's account type", async () => {
  const h = harness();
  const question = { ...membershipQuestion(), type: "membership_type", required: false };
  h.data.set("profile_phone", h.member.phone);
  // An editable profile field must not silently substitute for the skipped mapped answer.
  h.data.set("profile_membershipType", "partner");
  await recordMembershipCommitment(h.tx, {
    ...h.input, form: { ...h.input.form, questions: [question] }, answers: {},
  });
  assert.equal(h.member.membershipType, "permanent");
  assert.deepEqual(h.updates, []);
  assert.equal(h.records.length, 1);
  assert.equal(h.records[0].reviewStatus, "none");
  assert.deepEqual(h.records[0].profileChanges, []);
  assert.equal(h.records[0].snapshot.profile.find((field) => field.key === "membershipType")?.value, "permanent");
  assert.deepEqual(h.records[0].snapshot.answers, {});
  assert.equal("membershipQuestionId" in (h.audits[0] as { metadata: Record<string, unknown> }).metadata, false);
});

test("answering an optional membership type question updates the account and accepted record", async () => {
  const h = harness();
  const question = { ...membershipQuestion(), type: "membership_type", required: false };
  h.data.set("profile_phone", h.member.phone);
  h.data.set("profile_membershipType", "partner");
  await recordMembershipCommitment(h.tx, {
    ...h.input, form: { ...h.input.form, questions: [question] }, answers: { question_0: question.options[1] },
  });
  assert.equal(h.member.membershipType, "temporary");
  assert.deepEqual(h.updates, [{ membershipType: "temporary" }]);
  assert.equal(h.records[0].reviewStatus, "none");
  assert.equal(h.records[0].snapshot.profile.find((field) => field.key === "membershipType")?.value, "temporary");
  assert.equal(h.records[0].snapshot.answers.question_0, question.options[1]);
  assert.equal((h.audits[0] as { metadata: Record<string, unknown> }).metadata.membershipQuestionId, question.id);
});

test("a required membership type question still rejects an absent answer before any write", async () => {
  const h = harness();
  const question = { ...membershipQuestion(), type: "membership_type" };
  await assert.rejects(recordMembershipCommitment(h.tx, {
    ...h.input, form: { ...h.input.form, questions: [question] }, answers: {},
  }), /Select a valid answer/);
  assert.equal(h.member.membershipType, "permanent");
  assert.equal(h.records.length, 0);
  assert.equal(h.updates.length, 0);
});

test("a mapped commitment answer updates the signed-in member and preserves the decision and audit history", async () => {
  for (const [index, membershipType] of ["permanent", "temporary", "partner"].entries()) {
    const config = configuration(); config.membershipTypes = ["permanent"];
    const h = harness(config);
    const question = membershipQuestion();
    // The duplicate profile input must never override the mapped answer.
    h.data.set("profile_membershipType", "temporary");
    await recordMembershipCommitment(h.tx, { ...h.input, form: { ...h.input.form, questions: [question] }, answers: { question_0: question.options[index] } });
    assert.equal(h.member.membershipType, membershipType);
    assert.equal(h.records[0].reviewStatus, "none");
    assert.equal(h.records[0].snapshot.profile.find((field) => field.key === "membershipType")?.value, membershipType);
    const changes = h.records[0].profileChanges as Array<{ key: string; before: string; after: string; requiresApproval: boolean }>;
    const change = changes.find((item) => item.key === "membershipType");
    if (membershipType === "permanent") assert.equal(change, undefined);
    else assert.deepEqual(change, { key: "membershipType", label: "Membership type", before: "permanent", after: membershipType, requiresApproval: false });
    const audit = h.audits[0] as { metadata: { membershipQuestionId: string; membershipChange: unknown } };
    assert.equal(audit.metadata.membershipQuestionId, question.id);
    assert.deepEqual(audit.metadata.membershipChange, change ?? null);
    question.membershipTypeMapping[index] = "temporary";
    h.member.membershipType = "temporary";
    assert.equal(h.records[0].snapshot.profile.find((field) => field.key === "membershipType")?.value, membershipType);
  }
});

test("a mapped question works without a membership profile field and applies on form submission", async () => {
  const config = configuration(); config.terms = ""; config.profileFields = config.profileFields.filter((field) => field.key !== "membershipType");
  const question = membershipQuestion();
  const h = harness(config);
  const input = { ...h.input, form: { ...h.input.form, questions: [question] }, answers: { question_0: question.options[2] } };
  await recordMembershipCommitment(h.tx, input);
  assert.equal(h.member.membershipType, "partner");
  assert.equal(h.records[0].snapshot.profile.find((field) => field.key === "membershipType")?.value, "partner");
});

test("invalid mapped answers and incomplete mappings fail before any profile or commitment write", async () => {
  for (const invalidMapping of [false, true]) {
    const h = harness(); const question = membershipQuestion();
    if (invalidMapping) question.membershipTypeMapping[2] = "";
    await assert.rejects(recordMembershipCommitment(h.tx, { ...h.input, form: { ...h.input.form, questions: [question] }, answers: { question_0: invalidMapping ? question.options[2] : "partner" } }), /Map every|Select a valid answer/);
    assert.equal(h.member.membershipType, "permanent"); assert.equal(h.records.length, 0); assert.equal(h.updates.length, 0);
  }
});
