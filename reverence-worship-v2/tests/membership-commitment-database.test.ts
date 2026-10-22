import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { normalizePostgresSslMode } from "../src/lib/database-url";
import { defaultCommitmentSettings, type CommitmentSnapshot } from "../src/lib/membership-commitment";
import { recordMembershipCommitment } from "../src/lib/membership-commitment-record";

// Opt in explicitly: the test creates and removes an isolated schema, sends no
// notifications, and never writes to the application's tables.
test("commitment database transactions, concurrent acceptance, and immutable history", { skip: process.env.RUN_COMMITMENT_DATABASE_TEST !== "1", timeout: 120000 }, async (t) => {
  await import("dotenv/config");
  const connectionString = normalizePostgresSslMode(process.env.DIRECT_URL || process.env.DATABASE_URL);
  assert.ok(connectionString, "A test database connection is required.");
  const schema = `codex_commitment_test_${randomBytes(8).toString("hex")}`;
  assert.match(schema, /^codex_commitment_test_[a-f0-9]+$/);
  const database = new Client({ connectionString });
  await database.connect();
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 4 }, { schema }) });
  const transaction = <T,>(run: (tx: Prisma.TransactionClient) => Promise<T>) => client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path = "${schema}"`);
    return run(tx);
  }, { timeout: 30000, maxWait: 30000 });
  try {
    const generated = spawnSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "diff", "--from-empty", "--to-schema", "prisma/schema.prisma", "--script"], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    assert.equal(generated.status, 0, "The fixture schema could not be generated.");
    const ddl = generated.stdout.replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
    assert.doesNotMatch(ddl, /"public"\./);
    await database.query("BEGIN");
    await database.query(`CREATE SCHEMA "${schema}"`);
    await database.query(`SET LOCAL search_path = "${schema}"`);
    await database.query(ddl);
    await database.query('DROP TABLE "membership_commitments"');
    await database.query(await readFile("prisma/migrations/20261019140000_add_annual_membership_commitments/migration.sql", "utf8"));
    await database.query(await readFile("prisma/migrations/20261019153000_configurable_commitment_responses/migration.sql", "utf8"));
    await database.query("COMMIT");

    const member = await client.user.create({ data: { name: "Fixture Member", email: "member@fixture.invalid", phone: "0700000000", status: "active", membershipType: "permanent" } });
    const reviewer = await client.user.create({ data: { name: "Fixture Reviewer", email: "reviewer@fixture.invalid", status: "active", membershipType: "permanent" } });
    const config = { ...defaultCommitmentSettings(2027), terms: "Original annual terms.", profileFields: [
      { key: "name", editable: false, required: true, requiresApproval: false },
      { key: "phone", editable: true, required: true, requiresApproval: false },
      { key: "membershipType", editable: true, required: true, requiresApproval: false },
    ] };
    const form = await client.spiritualForm.create({ data: { title: "Commitment 2027", questions: [], settings: { commitment: config }, version: 2 } });
    const anotherForm = await client.spiritualForm.create({ data: { title: "Another commitment 2027", questions: [], settings: { commitment: config }, version: 2 } });
    async function accept(selectedForm = form, version = selectedForm.version, membershipType = "partner") {
      const data = new FormData(); data.set("commitment_version", String(version)); data.set("profile_phone", "0788888888"); data.set("profile_membershipType", membershipType);
      return transaction(async (tx) => {
        const response = await tx.formSubmission.create({ data: { formId: selectedForm.id, userId: member.id, answers: {} } });
        return recordMembershipCommitment(tx, { form: selectedForm, userId: member.id, submissionId: response.id, formData: data, answers: {} });
      });
    }
    await t.test("stale form versions roll back the response and profile update", async () => {
      await assert.rejects(accept(form, form.version - 1), /form has changed/);
      assert.equal(await client.formSubmission.count(), 0);
      assert.equal(await client.membershipCommitment.count(), 0);
      assert.equal((await client.user.findUniqueOrThrow({ where: { id: member.id } })).phone, "0700000000");
    });
    await t.test("simultaneous submissions on different forms create one annual acceptance", async () => {
      const results = await Promise.allSettled([accept(form), accept(anotherForm)]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(results.filter((result) => result.status === "rejected").length, 1);
      assert.equal(await client.formSubmission.count(), 1);
      assert.equal(await client.membershipCommitment.count(), 1);
    });
    const record = await client.membershipCommitment.findFirstOrThrow();
    const originalSnapshot = record.snapshot;
    await t.test("multiple accepted records can exist for one member and year", async () => {
      const repeated = await client.membershipCommitment.create({ data: { userId: member.id, formId: form.id, year: 2027, formVersion: 2, snapshot: {} } });
      assert.equal(repeated.userId, member.id);
    });
    await t.test("the migration prevents changing accepted terms, year, or member ownership", async () => {
      for (const sql of [
        `UPDATE "${schema}"."membership_commitments" SET "snapshot" = '{}'::jsonb WHERE "id" = ${record.id}`,
        `UPDATE "${schema}"."membership_commitments" SET "year" = 2028 WHERE "id" = ${record.id}`,
        `UPDATE "${schema}"."membership_commitments" SET "user_id" = ${reviewer.id} WHERE "id" = ${record.id}`,
      ]) await assert.rejects(database.query(sql), /immutable/);
      assert.deepEqual((await client.membershipCommitment.findUniqueOrThrow({ where: { id: record.id } })).snapshot, originalSnapshot);
    });
    await t.test("profile changes apply immediately without review", async () => {
      const before = await client.user.findUniqueOrThrow({ where: { id: member.id } });
      assert.equal(before.phone, "0788888888"); assert.equal(before.membershipType, "partner");
      assert.equal((await client.membershipCommitment.findUniqueOrThrow({ where: { id: record.id } })).reviewStatus, "none");
    });
    await t.test("later profile and form edits preserve evidence and prevent deleting its form", async () => {
      await client.user.update({ where: { id: member.id }, data: { name: "Future Name", phone: "0799999999" } });
      await client.spiritualForm.update({ where: { id: record.formId }, data: { settings: { commitment: { ...config, terms: "Revised terms for future acceptances." } }, version: { increment: 1 } } });
      const accepted = await client.membershipCommitment.findUniqueOrThrow({ where: { id: record.id } });
      assert.deepEqual(accepted.snapshot, originalSnapshot);
      assert.equal((accepted.snapshot as unknown as CommitmentSnapshot).terms, "Original annual terms.");
      assert.ok(accepted.acceptedAt instanceof Date);
      await assert.rejects(client.spiritualForm.delete({ where: { id: record.formId } }), /membership_commitments_form_id_fkey/);
    });
    await t.test("next-year renewals stay independent and update the profile immediately", async () => {
      const nextForm = await client.spiritualForm.create({ data: { title: "Commitment 2028", settings: { commitment: { ...config, year: 2028 } }, version: 1 } });
      const nextRecord = await accept(nextForm, nextForm.version, "permanent");
      assert.equal(nextRecord.year, 2028);
      assert.equal(await client.membershipCommitment.count(), 3);
      await client.user.update({ where: { id: member.id }, data: { membershipType: "temporary" } });
      assert.equal((await client.user.findUniqueOrThrow({ where: { id: member.id } })).membershipType, "temporary");
      assert.equal((await client.membershipCommitment.findUniqueOrThrow({ where: { id: nextRecord.id } })).reviewStatus, "none");
      assert.deepEqual((await client.membershipCommitment.findUniqueOrThrow({ where: { id: record.id } })).snapshot, originalSnapshot);
    });
    await t.test("mapped answers persist all three real account types and roll back with a failed commitment", async () => {
      const question = { id: "membership-choice", type: "multiple_choice", label: "Niyemeje kuba", required: true,
        options: ["Umunyamuryango uhoraho", "Umunyamuryango udahoraho", "Umufatanyabikorwa"], membershipTypeMapping: ["permanent", "temporary", "partner"] };
      const mappedForm = await client.spiritualForm.create({ data: { title: "Mapped commitment 2040", questions: [question], settings: { commitment: { ...config, year: 2040, terms: "" } }, version: 1 } });
      async function acceptMapped(userId: number, optionIndex: number, failAfterWrite = false) {
        const data = new FormData(); data.set("commitment_version", "1"); data.set("profile_phone", "0788888888"); data.set("profile_membershipType", "permanent");
        const answers = { question_0: question.options[optionIndex] };
        return transaction(async (tx) => {
          const response = await tx.formSubmission.create({ data: { formId: mappedForm.id, userId, answers } });
          const accepted = await recordMembershipCommitment(tx, { form: mappedForm, userId, submissionId: response.id, formData: data, answers });
          if (failAfterWrite) throw new Error("Fixture transaction failure");
          return accepted;
        });
      }
      for (const [index, membershipType] of (["permanent", "temporary", "partner"] as const).entries()) {
        const selectedMember = await client.user.create({ data: { name: `Mapped ${membershipType}`, email: `${membershipType}@fixture.invalid`, status: "active", membershipType: "permanent" } });
        const accepted = await acceptMapped(selectedMember.id, index);
        assert.equal((await client.user.findUniqueOrThrow({ where: { id: selectedMember.id } })).membershipType, membershipType);
        assert.equal(accepted.reviewStatus, "none");
        assert.equal((accepted.snapshot as unknown as CommitmentSnapshot).profile.find((field) => field.key === "membershipType")?.value, membershipType);
        const response = await client.formSubmission.findUniqueOrThrow({ where: { id: accepted.submissionId! } });
        assert.equal((response.answers as Record<string, string>).question_0, question.options[index]);
      }
      const rollbackMember = await client.user.create({ data: { name: "Rollback Member", email: "rollback@fixture.invalid", status: "active", membershipType: "permanent" } });
      const countBefore = await client.formSubmission.count();
      await assert.rejects(acceptMapped(rollbackMember.id, 2, true), /Fixture transaction failure/);
      assert.equal((await client.user.findUniqueOrThrow({ where: { id: rollbackMember.id } })).membershipType, "permanent");
      assert.equal(await client.membershipCommitment.count({ where: { userId: rollbackMember.id } }), 0);
      assert.equal(await client.formSubmission.count(), countBefore);
    });
    await t.test("permanently deleting a response also removes its accepted commitment", async () => {
      assert.ok(record.submissionId);
      await client.$transaction(async (tx) => {
        await tx.membershipCommitment.deleteMany({ where: { submissionId: record.submissionId! } });
        await tx.formSubmission.delete({ where: { id: record.submissionId! } });
      });
      assert.equal(await client.membershipCommitment.findUnique({ where: { id: record.id } }), null);
      assert.equal(await client.formSubmission.findUnique({ where: { id: record.submissionId! } }), null);
    });
  } finally {
    await client.$disconnect();
    await database.query("ROLLBACK");
    // Only this randomly named, validated fixture schema can be removed.
    assert.match(schema, /^codex_commitment_test_[a-f0-9]+$/);
    await database.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await database.end();
  }
});
