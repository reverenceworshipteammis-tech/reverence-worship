import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_PLAN_TASK_TEMPLATE_HEADERS,
  actionPlanTaskSignature,
  parseActionPlanTaskImport,
} from "../src/lib/action-plan-task-import";
import { createXlsxWorkbook } from "../src/lib/xlsx-workbook";

const encoder = new TextEncoder();

test("parses task rows from CSV and applies optional defaults", async () => {
  const csv = `${ACTION_PLAN_TASK_TEMPLATE_HEADERS.join(",")}\n"Train the choir, phase 1",Training delivered,"125,000",,2026-10-31,high,25`;
  const result = await parseActionPlanTaskImport("tasks.csv", encoder.encode(csv));

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.rows.map((row) => ({
    activity: row.activity,
    milestone: row.targetMilestone,
    budget: row.estimatedBudget,
    startDate: row.startDate,
    deadline: row.deadline.toISOString().slice(0, 10),
    priority: row.priority,
    progress: row.progress,
  })), [{
    activity: "Train the choir, phase 1",
    milestone: "Training delivered",
    budget: 125000,
    startDate: null,
    deadline: "2026-10-31",
    priority: "high",
    progress: 25,
  }]);
});

test("reads the generated Excel format including Excel date cells", async () => {
  const workbook = await createXlsxWorkbook([{
    name: "Tasks",
    rows: [
      [...ACTION_PLAN_TASK_TEMPLATE_HEADERS],
      ["Community visit", "20 families visited", 50000, new Date("2026-09-01T12:00:00Z"), new Date("2026-09-30T12:00:00Z"), "medium", 0],
    ],
  }]);
  const result = await parseActionPlanTaskImport("tasks.xlsx", workbook);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.rows[0].startDate?.toISOString().slice(0, 10), "2026-09-01");
  assert.equal(result.rows[0].deadline.toISOString().slice(0, 10), "2026-09-30");
  assert.equal(result.rows[0].estimatedBudget, 50000);
});

test("rejects the entire import when any row is invalid", async () => {
  const csv = `${ACTION_PLAN_TASK_TEMPLATE_HEADERS.join(",")}\nValid task,Valid milestone,0,,2026-10-31,medium,0\nInvalid task,,0,,not-a-date,urgent,101`;
  const result = await parseActionPlanTaskImport("tasks.csv", encoder.encode(csv));

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.message, /Row 3/);
  assert.match(result.message, /No tasks were imported/);
});

test("uses activity, milestone, and deadline as the duplicate signature", () => {
  const deadline = new Date("2026-10-31T12:00:00Z");
  assert.equal(
    actionPlanTaskSignature({ activity: "  Choir Training ", targetMilestone: "DONE", deadline }),
    actionPlanTaskSignature({ activity: "choir training", targetMilestone: "done", deadline }),
  );
});
