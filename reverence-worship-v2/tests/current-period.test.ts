import assert from "node:assert/strict";
import test from "node:test";
import { isPeriodDateKey, resolveCurrentPeriod, resolvePeriodRange } from "../src/lib/current-period-rules";

test("period date keys must be real calendar dates", () => {
  assert.equal(isPeriodDateKey("2026-01-01"), true);
  assert.equal(isPeriodDateKey("2026-02-30"), false);
  assert.equal(isPeriodDateKey("2026-1-1"), false);
  assert.equal(isPeriodDateKey("not-a-date"), false);
  assert.equal(isPeriodDateKey(undefined), false);
});

test("disabled period falls back to the reference calendar year", () => {
  const period = resolveCurrentPeriod(false, "2025-11-01", "2026-10-31", 2026);
  assert.equal(period.enabled, false);
  assert.equal(period.from, "2026-01-01");
  assert.equal(period.to, "2026-12-31");
  assert.equal(period.year, 2026);
});

test("enabled period keeps the configured range until changed", () => {
  const period = resolveCurrentPeriod(true, "2025-11-01", "2026-10-31", 2027);
  assert.equal(period.enabled, true);
  assert.equal(period.from, "2025-11-01");
  assert.equal(period.to, "2026-10-31");
  assert.equal(period.label, "Nov 1, 2025 - Oct 31, 2026");
});

test("period working year is the year of its end date", () => {
  assert.equal(resolveCurrentPeriod(true, "2026-11-01", "2027-10-31", 2026).year, 2027);
  assert.equal(resolveCurrentPeriod(true, "2026-01-01", "2026-12-31", 2026).year, 2026);
  assert.equal(resolveCurrentPeriod(false, null, null, 2026).year, 2026);
});

test("enabled period with missing dates falls back to the reference year", () => {
  const period = resolveCurrentPeriod(true, undefined, "bad", 2026);
  assert.equal(period.from, "2026-01-01");
  assert.equal(period.to, "2026-12-31");
});

test("reversed dates are swapped into a valid range", () => {
  const period = resolveCurrentPeriod(true, "2026-10-31", "2025-11-01", 2026);
  assert.equal(period.from, "2025-11-01");
  assert.equal(period.to, "2026-10-31");
});

test("period bounds cover whole Kigali days", () => {
  const period = resolveCurrentPeriod(true, "2026-01-01", "2026-12-31", 2026);
  assert.equal(period.fromDate.toISOString(), "2025-12-31T22:00:00.000Z");
  assert.equal(period.toDate.toISOString(), "2026-12-31T21:59:59.999Z");
  assert.equal(period.databaseFromDate.toISOString(), "2026-01-01T12:00:00.000Z");
  assert.equal(period.databaseToDate.toISOString(), "2026-12-31T12:00:00.000Z");
});

test("period range defaults to the full period without clamping to a calendar year", () => {
  const period = resolveCurrentPeriod(true, "2026-11-01", "2027-10-31", 2026);
  const range = resolvePeriodRange(period, undefined, undefined);
  assert.equal(range.from, "2026-11-01");
  assert.equal(range.to, "2027-10-31");
  assert.equal(range.label, "Nov 1, 2026 - Oct 31, 2027");
});

test("period range accepts user dates beyond the period", () => {
  const period = resolveCurrentPeriod(true, "2026-11-01", "2027-10-31", 2026);
  const range = resolvePeriodRange(period, "2024-05-01", "2028-02-01");
  assert.equal(range.from, "2024-05-01");
  assert.equal(range.to, "2028-02-01");
});

test("period range swaps reversed dates and ignores invalid ones", () => {
  const period = resolveCurrentPeriod(true, "2026-11-01", "2027-10-31", 2026);
  const swapped = resolvePeriodRange(period, "2027-01-10", "2027-01-01");
  assert.equal(swapped.from, "2027-01-01");
  assert.equal(swapped.to, "2027-01-10");
  const invalid = resolvePeriodRange(period, "bad", "2026-11-15");
  assert.equal(invalid.from, "2026-11-01");
  assert.equal(invalid.to, "2026-11-15");
});
