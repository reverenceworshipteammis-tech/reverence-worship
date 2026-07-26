import assert from "node:assert/strict";
import test from "node:test";
import {
  PROBATION_GOOD_THRESHOLD,
  addCalendarMonths,
  calendarDaysRemaining,
  percentage,
  probationAttentionReasons,
} from "../src/lib/probation-rules";

test("probation dates use complete calendar months", () => {
  assert.equal(addCalendarMonths("2026-07-26", 4), "2026-11-26");
  assert.equal(addCalendarMonths("2026-10-31", 4), "2027-02-28");
  assert.equal(addCalendarMonths("2023-10-31", 4), "2024-02-29");
});

test("probation date calculation tolerates incomplete date input", () => {
  assert.equal(addCalendarMonths("", 4), "");
  assert.equal(addCalendarMonths("2026-07", 4), "");
  assert.equal(addCalendarMonths("2026-02-30", 4), "");
});

test("probation good threshold is inclusive at 70 percent", () => {
  assert.equal(PROBATION_GOOD_THRESHOLD, 70);
  assert.deepEqual(probationAttentionReasons({
    attendanceRate: 70,
    communicationRate: 70,
    disciplineRate: 70,
    unresolvedDiscipline: 0,
  }), []);
});

test("probation monitoring explains every score below threshold", () => {
  assert.deepEqual(probationAttentionReasons({
    attendanceRate: 69,
    communicationRate: 50,
    disciplineRate: 20,
    unresolvedDiscipline: 2,
  }), [
    "Attendance is below 70%",
    "Communication is below 70%",
    "Discipline is below 70%",
    "2 discipline records unresolved",
  ]);
});

test("percentage supports explicit empty-data behavior", () => {
  assert.equal(percentage(7, 10), 70);
  assert.equal(percentage(0, 0), 0);
  assert.equal(percentage(0, 0, 100), 100);
  assert.equal(percentage(12, 10), 100);
});

test("calendar day calculations ignore time of day", () => {
  const now = new Date("2026-07-26T22:00:00.000Z");
  assert.equal(calendarDaysRemaining(new Date("2026-07-27T01:00:00.000Z"), now), 1);
  assert.equal(calendarDaysRemaining(new Date("2026-07-25T20:00:00.000Z"), now), -1);
});
