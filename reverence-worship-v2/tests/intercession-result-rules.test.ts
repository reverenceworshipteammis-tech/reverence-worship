import assert from "node:assert/strict";
import test from "node:test";
import {
  memberCanViewScore,
  memberResultState,
} from "../src/lib/intercession-result-rules";

test("non-quiz submissions are treated as submitted responses", () => {
  const input = { isQuiz: false, releaseGrade: "immediately", score: null, isReleased: false };
  assert.equal(memberResultState(input), "submitted");
  assert.equal(memberCanViewScore(input), false);
});

test("immediate quiz results are visible after grading", () => {
  const input = { isQuiz: true, releaseGrade: "immediately", score: 80, isReleased: false };
  assert.equal(memberResultState(input), "available");
  assert.equal(memberCanViewScore(input), true);
});

test("later quiz results remain hidden until released", () => {
  const pending = { isQuiz: true, releaseGrade: "later", score: 80, isReleased: false };
  const released = { ...pending, isReleased: true };
  assert.equal(memberResultState(pending), "pending_release");
  assert.equal(memberCanViewScore(pending), false);
  assert.equal(memberResultState(released), "available");
  assert.equal(memberCanViewScore(released), true);
});

test("private quiz results never expose the score", () => {
  const input = { isQuiz: true, releaseGrade: "never", score: 80, isReleased: true };
  assert.equal(memberResultState(input), "private");
  assert.equal(memberCanViewScore(input), false);
});
