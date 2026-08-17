import assert from "node:assert/strict";
import test from "node:test";
import { buildIntercessionResponseSummaries, normalizeIntercessionResponseValue } from "../src/lib/intercession-response-summary";

const questions = [
  { questionId: "family", questionIndex: 0, label: "Family", type: "multiple_choice", options: ["Peace", "Recovery", "Freedom"], rows: [], columns: [], min: 1, max: 5 },
  { questionId: "needs", questionIndex: 1, label: "Needs", type: "checkboxes", options: ["Prayer", "Visit", "Call"], rows: [], columns: [], min: 1, max: 5 },
  { questionId: "rating", questionIndex: 2, label: "Rating", type: "rating", options: [], rows: [], columns: [], min: 1, max: 5 },
  { questionId: "matrix", questionIndex: 3, label: "Matrix", type: "multiple_choice_grid", options: [], rows: ["Morning", "Evening"], columns: ["Yes", "No"], min: 1, max: 5 },
  { questionId: "comment", questionIndex: 4, label: "Comment", type: "paragraph", options: [], rows: [], columns: [], min: 1, max: 5 },
];

const submissions = [
  { answers: [
    { questionId: "family", questionIndex: 0, value: "Peace" },
    { questionId: "needs", questionIndex: 1, value: ["Prayer", "Call"] },
    { questionId: "rating", questionIndex: 2, value: "5" },
    { questionId: "matrix", questionIndex: 3, value: { row_0: "Yes", row_1: "No" } },
    { questionId: "comment", questionIndex: 4, value: "Thank you" },
  ] },
  { answers: [
    { questionId: "family", questionIndex: 0, value: "Recovery" },
    { questionId: "needs", questionIndex: 1, value: ["Prayer"] },
    { questionId: "rating", questionIndex: 2, value: "3" },
    { questionId: "matrix", questionIndex: 3, value: { row_0: "Yes", row_1: "" } },
    { questionId: "comment", questionIndex: 4, value: null },
  ] },
];

test("summarizes single and multi-select questions with respondent percentages", () => {
  const summaries = buildIntercessionResponseSummaries(questions, submissions);
  assert.deepEqual(summaries[0].series.map(({ label, count, percentage }) => ({ label, count, percentage })), [
    { label: "Peace", count: 1, percentage: 50 },
    { label: "Recovery", count: 1, percentage: 50 },
    { label: "Freedom", count: 0, percentage: 0 },
  ]);
  assert.deepEqual(summaries[1].series.map(({ label, count, percentage }) => ({ label, count, percentage })), [
    { label: "Prayer", count: 2, percentage: 100 },
    { label: "Visit", count: 0, percentage: 0 },
    { label: "Call", count: 1, percentage: 50 },
  ]);
});

test("summarizes scales, grids, and text answers", () => {
  const summaries = buildIntercessionResponseSummaries(questions, submissions);
  assert.equal(summaries[2].average, 4);
  assert.equal(summaries[2].series.find((item) => item.label === "5")?.count, 1);
  assert.equal(summaries[3].gridRows[0].responseCount, 2);
  assert.equal(summaries[3].gridRows[0].series.find((item) => item.label === "Yes")?.percentage, 100);
  assert.equal(summaries[3].gridRows[1].responseCount, 1);
  assert.deepEqual(summaries[4].textResponses, ["Thank you"]);
});

test("normalizes database JSON into serializable analytics values", () => {
  assert.deepEqual(normalizeIntercessionResponseValue([" Prayer ", ""]), ["Prayer"]);
  assert.deepEqual(normalizeIntercessionResponseValue({ row_0: " Yes ", row_1: ["No", ""] }), { row_0: "Yes", row_1: ["No"] });
  assert.equal(normalizeIntercessionResponseValue(5), "5");
});
