import assert from "node:assert/strict";
import test from "node:test";
import { syncSubmissionOptions } from "../src/lib/intercession-option-sync";

const question = (options: string[], mapping: string[]) => ({ id: "membership", type: "membership_type", label: "Commit", options, membershipTypeMapping: mapping });
const OLD = ["Permanent member", "Temporary member", "Partner"];
const MAPPING = ["permanent", "temporary", "partner"];

test("a renamed option updates stored answers and the submission snapshot", () => {
  const current = [question(["Permanent member", "Non-Permanent", "Partner"], MAPPING)];
  const result = syncSubmissionOptions([question(OLD, MAPPING)], { question_0: "Temporary member", __byQuestionId: { membership: "Temporary member" } }, current);
  assert.ok(result);
  assert.equal(result.answers.question_0, "Non-Permanent");
  assert.deepEqual(result.answers.__byQuestionId, { membership: "Non-Permanent" });
  assert.deepEqual((result.snapshot[0] as { options: string[] }).options, ["Permanent member", "Non-Permanent", "Partner"]);
});

test("the account type mapping finds the replacement even when positions moved", () => {
  const current = [question(["Partner", "Permanent member", "Non-Permanent"], ["partner", "permanent", "temporary"])];
  const result = syncSubmissionOptions([question(OLD, MAPPING)], { question_0: "Temporary member" }, current);
  assert.equal(result?.answers.question_0, "Non-Permanent");
});

test("deleting or adding options does not rewrite answers", () => {
  const plain = (options: string[]) => [{ id: "q", type: "multiple_choice", label: "Q", options }];
  assert.equal(syncSubmissionOptions(plain(["A", "B", "C"]), { question_0: "B" }, plain(["A", "C"])), null);
  assert.equal(syncSubmissionOptions(plain(["A", "B"]), { question_0: "B" }, plain(["A", "X", "B"])), null);
});

test("checkbox answers are renamed without duplicates", () => {
  const before = [{ id: "q", type: "checkboxes", label: "Q", options: ["A", "Old"] }];
  const after = [{ id: "q", type: "checkboxes", label: "Q", options: ["A", "New"] }];
  const result = syncSubmissionOptions(before, { question_0: ["A", "Old"] }, after);
  assert.deepEqual(result?.answers.question_0, ["A", "New"]);
});

test("legacy answers without a stored mapping are matched by membership type", () => {
  const plain = (options: string[]) => [{ id: "m", type: "multiple_choice", label: "Commit", options }];
  const current = [question(["Permanent member", "Partner", "Non-Permanent"], ["permanent", "partner", "temporary"])];
  const result = syncSubmissionOptions(plain(["Permanent member", "Temporary member", "Visitor"]).map((entry) => ({ ...entry, id: "membership" })), { question_0: "Temporary member" }, current);
  assert.equal(result?.answers.question_0, "Non-Permanent");
});
