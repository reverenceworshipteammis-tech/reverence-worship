import assert from "node:assert/strict";
import test from "node:test";
import {
  getIntercessionPublishingIssues,
  intercessionConditionMatches,
  parseIntercessionQuestionCondition,
} from "../src/lib/intercession-form-rules";

test("publishing checklist catches incomplete options and image descriptions", () => {
  const issues = getIntercessionPublishingIssues("Example", [{
    id: "q1",
    type: "multiple_choice",
    label: "Choose one",
    options: ["Only one"],
    images: [{ path: "/uploads/forms/example.png", alt: "" }],
  }]);
  assert.deepEqual(issues.map((issue) => issue.id), ["q1-options", "q1-image-1-description"]);
});

test("conditions match scalar and checkbox answers", () => {
  const equals = parseIntercessionQuestionCondition({ questionId: "q1", operator: "equals", value: "Yes" });
  assert.equal(intercessionConditionMatches(equals, { q1: "Yes" }), true);
  assert.equal(intercessionConditionMatches(equals, { q1: ["No", "Yes"] }), true);
  assert.equal(intercessionConditionMatches({ questionId: "q1", operator: "not_equals", value: "Yes" }, { q1: "No" }), true);
});

test("quiz publishing requires valid positive marks and a correct answer for every grid row", () => {
  const issues = getIntercessionPublishingIssues("Grid quiz", [{
    id: "grid",
    type: "checkbox_grid",
    label: "Choose",
    points: 0,
    rows: ["First", "Second"],
    columns: ["A", "B"],
    correctAnswers: { row_0: ["A"], row_1: ["Outside"] },
  }], { is_quiz: true });
  assert.deepEqual(issues.map((issue) => issue.id), ["grid-points", "grid-correct-row-option-1"]);
});

test("quiz publishing rejects checkbox answer keys outside the options", () => {
  const issues = getIntercessionPublishingIssues("Checkbox quiz", [{
    id: "check",
    type: "checkboxes",
    label: "Choose",
    points: 2,
    options: ["A", "B"],
    correctAnswers: ["A", "C"],
  }], { is_quiz: true });
  assert.deepEqual(issues.map((issue) => issue.id), ["check-correct-options"]);
});

test("one-click forms can publish without answerable questions when explicitly enabled", () => {
  const displayOnlyQuestions = [{ id: "attendance", type: "title_section", label: "Mark your attendance" }];
  assert.deepEqual(getIntercessionPublishingIssues("Meeting attendance", displayOnlyQuestions).map((issue) => issue.id), ["no-questions"]);
  assert.deepEqual(getIntercessionPublishingIssues("Meeting attendance", displayOnlyQuestions, { allow_empty_submission: true }), []);
});

test("attendance forms require a valid recording window before publication", () => {
  const attendance = { allow_empty_submission: true, submit_button_label: "Mark Attendance", submit_button_style: "attendance" };
  assert.deepEqual(
    getIntercessionPublishingIssues("Meeting attendance", [], attendance).map((issue) => issue.id),
    ["attendance-opens-at", "attendance-closes-at"],
  );
  assert.deepEqual(getIntercessionPublishingIssues("Meeting attendance", [], {
    ...attendance,
    submission_opens_at: "2026-09-04T18:00",
    submission_deadline: "2026-09-04T20:00",
  }), []);
  assert.deepEqual(
    getIntercessionPublishingIssues("Meeting attendance", [], {
      ...attendance,
      submission_opens_at: "2026-09-04T20:00",
      submission_deadline: "2026-09-04T18:00",
    }).map((issue) => issue.id),
    ["attendance-window-order"],
  );
});
