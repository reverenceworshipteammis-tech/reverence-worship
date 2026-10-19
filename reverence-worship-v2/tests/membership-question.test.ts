import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "../src/generated/prisma/client";
import { membershipQuestionConfigurationIssue, parseMembershipTypeMapping, resolveMembershipQuestion } from "../src/lib/membership-question";
import { defaultCommitmentSettings, type CommitmentSnapshot } from "../src/lib/membership-commitment";
import { recordMembershipCommitment } from "../src/lib/membership-commitment-record";
import { getIntercessionPublishingIssues } from "../src/lib/intercession-form-rules";
import { parseIntercessionFormQuestions } from "../src/lib/intercession-form-domain";

const question = () => ({
  id: "membership-choice", type: "multiple_choice", label: "Niyemeje kuba / I commit to be:", required: true,
  options: ["Umunyamuryango uhoraho / Permanent member", "Umunyamuryango udahoraho / Temporary", "Umufatanyabikorwa / Partner"],
  membershipTypeMapping: ["permanent", "temporary", "partner"], condition: null,
});

const dedicatedQuestion = () => ({ ...question(), type: "membership_type" });

test("a dedicated membership type question publishes and resolves all three account values", () => {
  const dedicated = dedicatedQuestion();
  const parsed = parseIntercessionFormQuestions([dedicated])[0];
  assert.equal(parsed.type, "membership_type");
  assert.deepEqual(parsed.membershipTypeMapping, dedicated.membershipTypeMapping);
  assert.equal(membershipQuestionConfigurationIssue([dedicated], true), null);
  assert.equal(membershipQuestionConfigurationIssue([question()], true), null); // Older mapped questions remain valid.
  const commitment = defaultCommitmentSettings(2027);
  assert.equal(getIntercessionPublishingIssues("Commitment", [dedicated], { commitment }).length, 0);
  for (const [index, membershipType] of dedicated.membershipTypeMapping.entries()) {
    assert.deepEqual(resolveMembershipQuestion([dedicated], { question_0: dedicated.options[index] }), {
      questionId: dedicated.id, membershipType,
    });
  }
});

test("an optional membership type question publishes and changes membership only when answered", () => {
  const commitment = defaultCommitmentSettings(2027);
  for (const type of ["membership_type", "multiple_choice"]) {
    const optional = { ...dedicatedQuestion(), type, required: false };
    assert.equal(membershipQuestionConfigurationIssue([optional], true), null);
    assert.deepEqual(getIntercessionPublishingIssues("Commitment", [optional], { commitment }), []);
    assert.equal(resolveMembershipQuestion([optional], {}), null);
    assert.equal(resolveMembershipQuestion([optional], { question_0: "" }), null);
    assert.deepEqual(resolveMembershipQuestion([optional], { question_0: optional.options[1] }), {
      questionId: optional.id, membershipType: "temporary",
    });
    assert.throws(() => resolveMembershipQuestion([optional], { question_0: "partner" }), /Select a valid answer/);
  }
  assert.throws(() => resolveMembershipQuestion([dedicatedQuestion()], {}), /Select a valid answer/);
});

test("a dedicated membership type question requires an explicit complete mapping", () => {
  const dedicated = dedicatedQuestion();
  const commitment = defaultCommitmentSettings(2027);
  for (const mapping of [null, [], ["", "", ""], ["permanent", "temporary"], ["permanent", "temporary", "visitor"]]) {
    const invalid = { ...dedicated, membershipTypeMapping: mapping };
    assert.match(membershipQuestionConfigurationIssue([invalid], true)!.message, /Map every/);
    assert.ok(getIntercessionPublishingIssues("Commitment", [invalid], { commitment }).some((issue) => issue.id === "membership-question"));
    assert.throws(() => resolveMembershipQuestion([invalid], { question_0: dedicated.options[0] }), /Map every/);
  }
  assert.match(membershipQuestionConfigurationIssue([dedicated], false)!.message, /annual commitment/);
  assert.match(membershipQuestionConfigurationIssue([question(), dedicated], true)!.message, /Only one/);
});

test("accepting a dedicated membership answer changes the member and saves the mapped decision", async () => {
  const member = { id: 42, status: "active", name: "Example Member", email: "member@example.test", membershipType: "permanent" };
  const stored: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  const audits: Array<Record<string, unknown>> = [];
  const tx = {
    $queryRaw: async () => [],
    user: {
      findUnique: async () => member,
      update: async ({ data }: { data: Record<string, unknown> }) => { updates.push(data); Object.assign(member, data); return member; },
    },
    membershipCommitment: {
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => { const record = structuredClone({ id: 1, ...data }); stored.push(record); return record; },
    },
    activityLog: { create: async ({ data }: { data: Record<string, unknown> }) => { audits.push(data); } },
  } as unknown as Prisma.TransactionClient;
  const selectedQuestion = dedicatedQuestion();
  const config = defaultCommitmentSettings(2027);
  config.profileFields = config.profileFields.filter((field) => ["name", "email"].includes(field.key));
  const form = {
    id: 9, title: "Annual commitment", version: 3,
    questions: [{ id: "intro", type: "paragraph", label: "Why?" }, selectedQuestion] as Prisma.JsonValue,
    settings: { commitment: config } as unknown as Prisma.JsonValue,
  };
  const formData = new FormData();
  formData.set("commitment_version", "3");
  formData.set("profile_name", member.name);
  const input = { form, userId: member.id, submissionId: 15, formData, answers: { question_0: "Ready", question_1: "partner" } };
  await assert.rejects(recordMembershipCommitment(tx, input), /Select a valid answer/);
  assert.equal(member.membershipType, "permanent");
  assert.equal(stored.length, 0);
  assert.equal(updates.length, 0);

  input.answers.question_1 = selectedQuestion.options[2];
  await recordMembershipCommitment(tx, input);
  assert.equal(member.membershipType, "partner");
  assert.deepEqual(updates, [{ membershipType: "partner" }]);
  assert.equal(stored.length, 1);
  const snapshot = stored[0].snapshot as CommitmentSnapshot;
  assert.equal(snapshot.profile.find((field) => field.key === "membershipType")?.value, "partner");
  assert.equal(snapshot.answers.question_1, selectedQuestion.options[2]);
  assert.deepEqual(stored[0].profileChanges, [{ key: "membershipType", label: "Membership type", before: "permanent", after: "partner", requiresApproval: false }]);
  assert.equal((audits[0].metadata as Record<string, unknown>).membershipQuestionId, selectedQuestion.id);
});

test("explicit membership mappings survive parsing, translation, and question reordering", () => {
  const mapped = question();
  const questions = [{ id: "intro", type: "paragraph", label: "Anything else?" }, mapped];
  assert.deepEqual(parseIntercessionFormQuestions(questions)[1].membershipTypeMapping, mapped.membershipTypeMapping);
  for (const [index, membershipType] of mapped.membershipTypeMapping.entries()) {
    assert.deepEqual(resolveMembershipQuestion(questions, { question_1: mapped.options[index] }), { questionId: mapped.id, membershipType });
  }
  mapped.options[0] = "New translated wording without a membership keyword";
  assert.equal(resolveMembershipQuestion([mapped], { question_0: mapped.options[0] })?.membershipType, "permanent");
  // Mapping, rather than an English keyword in the answer, controls the write.
  mapped.membershipTypeMapping[0] = "partner";
  assert.equal(resolveMembershipQuestion([mapped], { question_0: mapped.options[0] })?.membershipType, "partner");
});

test("membership mappings cannot publish on ordinary forms or with ambiguous choices", () => {
  assert.match(membershipQuestionConfigurationIssue([question()], false)!.message, /annual commitment/);
  assert.match(membershipQuestionConfigurationIssue([question(), { ...question(), id: "another" }], true)!.message, /Only one/);
  for (const patch of [
    { type: "checkboxes" }, { condition: { questionId: "previous", operator: "answered" } },
    { options: ["Same", " Same ", "Different"] }, { options: ["", "Two", "Three"] },
    { membershipTypeMapping: ["permanent", "temporary"] }, { membershipTypeMapping: ["permanent", "temporary", "visitor"] },
    { membershipTypeMapping: "partner" }, { membershipTypeMapping: ["permanent", "temporary", "admin"] },
  ]) assert.ok(membershipQuestionConfigurationIssue([{ ...question(), ...patch }], true));
  const commitment = { ...defaultCommitmentSettings(2027), terms: "Annual terms." };
  assert.equal(getIntercessionPublishingIssues("Commitment", [question()], { commitment }).length, 0);
  assert.ok(getIntercessionPublishingIssues("Commitment", [{ ...question(), membershipTypeMapping: ["", "", ""] }], { commitment }).some((issue) => issue.id === "membership-question"));
});

test("forged or missing membership answers never select an account type", () => {
  for (const answer of [undefined, "partner", "Unknown answer", [question().options[0]], { selected: "partner" }]) {
    assert.throws(() => resolveMembershipQuestion([question()], { question_0: answer }), /Select a valid answer/);
  }
  assert.equal(resolveMembershipQuestion([{ ...question(), membershipTypeMapping: null }], {}), null);
  assert.deepEqual(parseMembershipTypeMapping(["permanent", "visitor", "admin"]), ["permanent", "", ""]);
});
