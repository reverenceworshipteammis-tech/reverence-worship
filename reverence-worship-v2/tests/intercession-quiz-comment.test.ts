import assert from "node:assert/strict";
import test from "node:test";
import { parseIntercessionFormQuestions, scoreIntercessionQuiz } from "../src/lib/intercession-form-domain";
import { intercessionQuizComment, MAX_QUIZ_COMMENT_LENGTH, parseIntercessionQuizComment } from "../src/lib/intercession-response-data";

test("quiz comments are optional, preserve multiline text, and enforce their size limit", () => {
  assert.deepEqual(parseIntercessionQuizComment(null), { ok: true, comment: "" });
  assert.deepEqual(parseIntercessionQuizComment("  \n  "), { ok: true, comment: "" });
  assert.deepEqual(parseIntercessionQuizComment("  First line\nSecond line  "), { ok: true, comment: "First line\nSecond line" });
  assert.equal(parseIntercessionQuizComment("x".repeat(MAX_QUIZ_COMMENT_LENGTH)).ok, true);
  assert.equal(parseIntercessionQuizComment("x".repeat(MAX_QUIZ_COMMENT_LENGTH + 1)).ok, false);
  assert.equal(parseIntercessionQuizComment(new Blob(["not text"])).ok, false);
});

test("stored comments can be read without affecting quiz grading", () => {
  const questions = parseIntercessionFormQuestions([{ id: "q", type: "short_answer", label: "Question", correctAnswer: "Yes", points: 2 }]);
  const answers = { question_0: "Yes", __quizComment: "A comment\non the quiz" };
  assert.equal(intercessionQuizComment(answers), "A comment\non the quiz");
  assert.equal(intercessionQuizComment({ question_0: "Yes" }), "");
  assert.equal(intercessionQuizComment({ __quizComment: ["invalid"] }), "");
  assert.deepEqual(scoreIntercessionQuiz(questions, answers, new Set([0]), false), scoreIntercessionQuiz(questions, { question_0: "Yes" }, new Set([0]), false));
});
