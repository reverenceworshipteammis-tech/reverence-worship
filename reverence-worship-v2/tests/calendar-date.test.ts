import assert from "node:assert/strict";
import test from "node:test";
import {
  addCalendarDays,
  databaseDate,
  kigaliDateKey,
  kigaliDateTimeInputValue,
  kigaliDayBounds,
} from "../src/lib/calendar-date";

test("Kigali calendar keys do not fall back to UTC before 2 AM", () => {
  const instant = new Date("2026-09-01T00:30:00+02:00");
  assert.equal(instant.toISOString().slice(0, 10), "2026-08-31");
  assert.equal(kigaliDateKey(instant), "2026-09-01");
});

test("database dates remain on the selected calendar date", () => {
  assert.equal(databaseDate("2026-09-01").toISOString(), "2026-09-01T12:00:00.000Z");
});

test("Kigali day bounds are explicit instants", () => {
  const bounds = kigaliDayBounds("2026-09-01");
  assert.equal(bounds.start.toISOString(), "2026-08-31T22:00:00.000Z");
  assert.equal(bounds.end.toISOString(), "2026-09-01T21:59:59.999Z");
});

test("calendar arithmetic and datetime-local values retain Kigali dates", () => {
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
  assert.equal(kigaliDateTimeInputValue(new Date("2026-09-08T23:15:00.000Z")), "2026-09-09T01:15");
});
