import assert from "node:assert/strict";
import test from "node:test";
import { intercessionMobileSteps } from "../src/lib/intercession-mobile-steps";

test("long forms split after five questions without losing their order", () => {
  assert.deepEqual(intercessionMobileSteps(Array.from({ length: 12 }, () => ({ type: "short_answer" }))), [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2]);
});
test("explicit sections start a new step and display blocks do not count as answers", () => {
  assert.deepEqual(intercessionMobileSteps([{ type: "title_section" }, { type: "short_answer" }, { type: "section_break" }, { type: "paragraph" }]), [0, 0, 1, 1]);
  assert.deepEqual(intercessionMobileSteps([]), []);
});
