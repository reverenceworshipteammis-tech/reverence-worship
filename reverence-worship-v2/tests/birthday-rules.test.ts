import assert from "node:assert/strict";
import test from "node:test";
import {
  birthdayFollowUpMessage,
  birthdayFollowUpNotificationKey,
  birthdayNotificationKey,
  calendarDateInTimeZone,
  isBirthdayOn,
  renderBirthdayTemplate,
  unsupportedBirthdayPlaceholders,
} from "../src/lib/birthday-rules";

test("birthdays use Kigali's calendar date", () => {
  const now = new Date("2026-08-11T22:30:00.000Z");
  const today = calendarDateInTimeZone(now);

  assert.deepEqual(today, { year: 2026, month: 8, day: 12 });
  assert.equal(isBirthdayOn(new Date("1995-08-12T00:00:00.000Z"), today), true);
  assert.equal(isBirthdayOn(new Date("1995-08-11T00:00:00.000Z"), today), false);
});

test("birthday notifications are deduplicated for each member and year", () => {
  assert.equal(birthdayNotificationKey(42, 2026), "birthday:42:2026");
  assert.notEqual(birthdayNotificationKey(42, 2026), birthdayNotificationKey(42, 2027));
  assert.notEqual(birthdayNotificationKey(42, 2026), birthdayNotificationKey(43, 2026));
});

test("birthday follow-up notifications use a separate yearly deduplication key", () => {
  assert.equal(birthdayFollowUpNotificationKey(42, 2026), "birthday-follow-up:42:2026");
  assert.notEqual(birthdayFollowUpNotificationKey(42, 2026), birthdayNotificationKey(42, 2026));
  assert.notEqual(birthdayFollowUpNotificationKey(42, 2026), birthdayFollowUpNotificationKey(42, 2027));
});

test("birthday follow-up messages use the member's recorded gender", () => {
  assert.equal(birthdayFollowUpMessage("Alice Uwimana", "female"), "Alice Uwimana is celebrating a birthday today! Celebrate with her.");
  assert.equal(birthdayFollowUpMessage("John Mugabo", "male"), "John Mugabo is celebrating a birthday today! Celebrate with him.");
  assert.equal(birthdayFollowUpMessage("Alex Member", null), "Alex Member is celebrating a birthday today! Celebrate with them.");
});

test("February 29 birthdays match only the actual calendar date", () => {
  const dateOfBirth = new Date("2000-02-29T00:00:00.000Z");
  assert.equal(isBirthdayOn(dateOfBirth, { year: 2028, month: 2, day: 29 }), true);
  assert.equal(isBirthdayOn(dateOfBirth, { year: 2027, month: 2, day: 28 }), false);
});

test("birthday templates substitute a member's first and full names", () => {
  assert.equal(
    renderBirthdayTemplate("Dear {fullName}, happy birthday {firstName}!", "Alice Uwimana"),
    "Dear Alice Uwimana, happy birthday Alice!",
  );
  assert.deepEqual(unsupportedBirthdayPlaceholders("Hello {firstName} in {year}"), ["{year}"]);
  assert.deepEqual(unsupportedBirthdayPlaceholders("Hello {firstName} and {fullName}"), []);
});
