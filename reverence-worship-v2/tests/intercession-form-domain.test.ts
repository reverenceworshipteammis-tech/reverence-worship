import assert from "node:assert/strict";
import test from "node:test";
import {
  intercessionFormAvailability,
  intercessionLifecycleDate,
  intercessionGuestFieldConfigurationIssue,
  normalizeIntercessionRespondentName,
  parseIntercessionVisitorDetails,
  parseIntercessionVisitorFields,
  parseIntercessionFormQuestions,
  parseIntercessionFormSettings,
  scoreIntercessionQuiz,
  visibleIntercessionQuestions,
} from "../src/lib/intercession-form-domain";

test("anonymous respondent names are normalized and bounded", () => {
  assert.equal(normalizeIntercessionRespondentName("  Jean   Claude  "), "Jean Claude");
  assert.equal(normalizeIntercessionRespondentName("x".repeat(200)).length, 150);
  assert.equal(normalizeIntercessionRespondentName(null), "");
});

test("visitor fields always include a required full name and sanitize configurable fields", () => {
  const fields = parseIntercessionVisitorFields([
    { id: "phone", label: "Telephone", type: "phone", required: true },
    { id: "church", label: "Church", type: "select", options: [" One ", "Two"] },
  ]);
  assert.equal(fields[0].id, "full_name");
  assert.equal(fields[0].required, true);
  assert.deepEqual(fields[2].options, ["One", "Two"]);
});

test("visitor detail snapshots preserve labels and multi-value responses", () => {
  assert.deepEqual(parseIntercessionVisitorDetails([
    { fieldId: "phone", label: "Telephone", type: "phone", value: "+250788000000" },
    { fieldId: "interests", label: "Interests", type: "checkboxes", value: ["Music", "Prayer"] },
  ]), [
    { fieldId: "phone", label: "Telephone", type: "phone", value: "+250788000000" },
    { fieldId: "interests", label: "Interests", type: "checkboxes", value: ["Music", "Prayer"] },
  ]);
});

test("guest field configuration reports incomplete and duplicate fields", () => {
  assert.equal(intercessionGuestFieldConfigurationIssue([{ id: "full_name", label: "", type: "text" }]), "Guest field 1 needs a label.");
  assert.match(intercessionGuestFieldConfigurationIssue([
    { id: "full_name", label: "Name", type: "text" },
    { id: "another", label: "name", type: "text" },
  ]) ?? "", /must be unique/);
  assert.equal(intercessionGuestFieldConfigurationIssue([
    { id: "full_name", label: "Name", type: "text" },
    { id: "church", label: "Church", type: "select", options: [] },
  ]), "Church needs at least one option.");
});

test("conditional grid questions can target a row and value", () => {
  const questions = parseIntercessionFormQuestions([
    { id: "grid", type: "multiple_choice_grid", label: "Grid", rows: ["Service"], columns: ["Good", "Poor"] },
    { id: "follow", type: "paragraph", label: "Explain", condition: { questionId: "grid", rowIndex: 0, operator: "equals", value: "Poor" } },
  ]);
  assert.deepEqual(visibleIntercessionQuestions(questions, { grid: { row_0: "Good" } }).map((item) => item.question.id), ["grid"]);
  assert.deepEqual(visibleIntercessionQuestions(questions, { grid: { row_0: "Poor" } }).map((item) => item.question.id), ["grid", "follow"]);
});

test("quiz scoring supports exact and partial checkbox marks", () => {
  const questions = parseIntercessionFormQuestions([
    { id: "one", type: "multiple_choice", label: "One", points: 2, correctAnswer: "Yes" },
    { id: "two", type: "checkboxes", label: "Two", points: 2, correctAnswers: ["A", "B"] },
  ]);
  const result = scoreIntercessionQuiz(questions, { question_0: "yes", question_1: ["A"] }, new Set([0, 1]), true);
  assert.equal(result.score, 75);
  assert.equal(result.earnedPoints, 3);
});

test("checkbox partial grading rewards correct choices without subtracting for wrong choices", () => {
  const questions = parseIntercessionFormQuestions([
    { id: "check", type: "checkboxes", label: "Select", points: 4, correctAnswers: ["A", "B"] },
  ]);
  assert.equal(scoreIntercessionQuiz(questions, { question_0: ["A"] }, new Set([0]), true).earnedPoints, 2);
  assert.equal(scoreIntercessionQuiz(questions, { question_0: ["A", "C"] }, new Set([0]), true).earnedPoints, 2);
  assert.equal(scoreIntercessionQuiz(questions, { question_0: ["A"] }, new Set([0]), false).earnedPoints, 0);
  assert.equal(scoreIntercessionQuiz(questions, { question_0: ["A", "B"] }, new Set([0]), false).earnedPoints, 4);
});

test("duplicate checkbox values cannot inflate partial marks", () => {
  const questions = parseIntercessionFormQuestions([
    { id: "check", type: "checkboxes", label: "Select", points: 4, correctAnswers: ["A", "B"] },
  ]);
  assert.equal(scoreIntercessionQuiz(questions, { question_0: ["A", "A", "A"] }, new Set([0]), true).earnedPoints, 2);
});

test("checkbox grids combine all correct cells across the whole question", () => {
  const questions = parseIntercessionFormQuestions([
    {
      id: "grid", type: "checkbox_grid", label: "Grid", points: 6,
      rows: ["Row 1", "Row 2"], columns: ["A", "B", "C"],
      correctAnswers: { row_0: ["A", "B"], row_1: ["C"] },
    },
  ]);
  const partial = scoreIntercessionQuiz(questions, { question_0: { row_0: ["A"], row_1: ["C"] } }, new Set([0]), true);
  assert.equal(partial.earnedPoints, 4);
  assert.equal(partial.score, 66.7);
  assert.deepEqual(partial.grades[0], { questionIndex: 0, correct: false, points: 6, earnedPoints: 4 });
  assert.equal(scoreIntercessionQuiz(questions, { question_0: { row_0: ["A"], row_1: ["C"] } }, new Set([0]), false).earnedPoints, 0);
});

test("wrong checkbox-grid choices do not subtract credit for correct cells", () => {
  const questions = parseIntercessionFormQuestions([
    { id: "grid", type: "checkbox_grid", label: "Grid", points: 4, rows: ["Row"], columns: ["A", "B", "C"], correctAnswers: { row_0: ["A", "B"] } },
  ]);
  assert.equal(scoreIntercessionQuiz(questions, { question_0: { row_0: ["A", "C"] } }, new Set([0]), true).earnedPoints, 2);
  assert.equal(scoreIntercessionQuiz(questions, { question_0: { row_0: ["C"] } }, new Set([0]), true).earnedPoints, 0);
});

test("conditional questions use their assigned credits on each submission path", () => {
  const questions = parseIntercessionFormQuestions([
    { id: "branch", type: "multiple_choice", label: "Branch", points: 2, options: ["Yes", "No"], correctAnswer: "Yes" },
    { id: "yes-detail", type: "short_answer", label: "Yes detail", points: 8, correctAnswer: "Ready", condition: { questionId: "branch", operator: "equals", value: "Yes" } },
    { id: "no-detail", type: "short_answer", label: "No detail", points: 4, correctAnswer: "Wait", condition: { questionId: "branch", operator: "equals", value: "No" } },
  ]);

  const yesAnswers = { question_0: "Yes", question_1: "Ready" };
  const yesVisible = visibleIntercessionQuestions(questions, { branch: "Yes", "yes-detail": "Ready" });
  const yesResult = scoreIntercessionQuiz(questions, yesAnswers, new Set(yesVisible.map((item) => item.index)), true);
  assert.equal(yesResult.totalPoints, 10);
  assert.equal(yesResult.earnedPoints, 10);

  const noAnswers = { question_0: "No", question_2: "Wait" };
  const noVisible = visibleIntercessionQuestions(questions, { branch: "No", "no-detail": "Wait" });
  const noResult = scoreIntercessionQuiz(questions, noAnswers, new Set(noVisible.map((item) => item.index)), true);
  assert.equal(noResult.totalPoints, 6);
  assert.equal(noResult.earnedPoints, 4);
  assert.equal(noResult.score, 66.7);
  assert.deepEqual(noResult.grades.map((grade) => [grade.questionIndex, grade.points]), [[0, 2], [2, 4]]);
});

test("availability enforces publication, lifecycle, and response caps", () => {
  const base = parseIntercessionFormSettings({ is_published: true, max_responses: 2 });
  assert.equal(intercessionFormAvailability(base, true, 1, new Date("2026-08-13T10:00:00Z")), null);
  assert.equal(intercessionFormAvailability(base, true, 2), "This form has reached its response limit.");
  assert.equal(intercessionFormAvailability({ ...base, submission_opens_at: "2026-09-01T08:00" }, true, 0, new Date("2026-08-13T10:00:00Z"))?.startsWith("This form opens on"), true);
  assert.equal(intercessionFormAvailability(base, false, 0), "This form is archived.");
});

test("redirects accept only internal paths", () => {
  assert.equal(parseIntercessionFormSettings({ redirect_url: "/admin/intercession" }).redirect_url, "/admin/intercession");
  assert.equal(parseIntercessionFormSettings({ redirect_url: "https://example.com" }).redirect_url, "");
  assert.equal(parseIntercessionFormSettings({ redirect_url: "//example.com" }).redirect_url, "");
});

test("lifecycle date-times are interpreted in Kigali time", () => {
  assert.equal(intercessionLifecycleDate("2026-08-13T10:00")?.toISOString(), "2026-08-13T08:00:00.000Z");
  assert.equal(intercessionLifecycleDate("2026-08-13", true)?.toISOString(), "2026-08-13T21:59:59.999Z");
});
