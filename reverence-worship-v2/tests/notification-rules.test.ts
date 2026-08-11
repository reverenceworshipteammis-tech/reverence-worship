import assert from "node:assert/strict";
import test from "node:test";
import { getEmailConfiguration } from "../src/lib/email-config";
import { notificationCategory } from "../src/lib/notification-rules";
import {
  normalizePermissionRequestNotificationMessage,
  permissionRequestRejectedMessage,
} from "../src/lib/permission-notification-copy";
import {
  DEFAULT_NOTIFICATION_RETENTION_DAYS,
  MAX_NOTIFICATION_RETENTION_DAYS,
  MIN_NOTIFICATION_RETENTION_DAYS,
  NOTIFICATION_LIFETIME_DAYS,
  READ_NOTIFICATION_RETENTION_DAYS,
  notificationLifetimeCutoff,
  notificationActionGroup,
  notificationSourceIsCurrent,
  normalizeNotificationRetentionDays,
  readNotificationCutoff,
} from "../src/lib/notification-retention-policy";

test("SMTP host and sender are required", () => {
  const configuration = getEmailConfiguration({});
  assert.equal(configuration.configured, false);
  assert.match(configuration.issue ?? "", /SMTP_HOST/);
  assert.match(configuration.issue ?? "", /SMTP_FROM/);
});

test("SMTP username and password must be configured together", () => {
  const configuration = getEmailConfiguration({
    SMTP_HOST: "smtp.example.com",
    SMTP_FROM: "Team <team@example.com>",
    SMTP_USER: "team@example.com",
  });
  assert.equal(configuration.configured, false);
  assert.match(configuration.issue ?? "", /SMTP_PASSWORD/);
});

test("valid SMTP configuration uses explicit transport options", () => {
  const configuration = getEmailConfiguration({
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "465",
    SMTP_SECURE: "true",
    SMTP_USER: "team@example.com",
    SMTP_PASSWORD: "secret",
    SMTP_FROM: "Team <team@example.com>",
    APP_URL: "https://example.com",
    CRON_SECRET: "cron-secret",
  });
  assert.equal(configuration.configured, true);
  assert.equal(configuration.issue, null);
  assert.equal(configuration.port, 465);
  assert.equal(configuration.secure, true);
  assert.equal(configuration.appUrlConfigured, true);
  assert.equal(configuration.cronSecretConfigured, true);
});

test("invalid SMTP ports are rejected", () => {
  const configuration = getEmailConfiguration({
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "invalid",
    SMTP_FROM: "Team <team@example.com>",
  });
  assert.equal(configuration.configured, false);
  assert.match(configuration.issue ?? "", /SMTP_PORT/);
});

test("permission notifications have an independent category", () => {
  assert.equal(notificationCategory("permission"), "permission");
  assert.equal(notificationCategory("form"), "form");
});

test("permission notification copy does not expose the legacy request type", () => {
  assert.equal(
    normalizePermissionRequestNotificationMessage(
      "permission_request",
      "Permission request submitted",
      "A new General permission request is awaiting review.",
    ),
    "A new permission request is awaiting review.",
  );
  assert.equal(
    normalizePermissionRequestNotificationMessage(
      "permission_request",
      "Permission request approved",
      "Your General permission request was approved.",
    ),
    "Your permission request was approved.",
  );
  assert.equal(
    normalizePermissionRequestNotificationMessage(
      "permission_request",
      "Permission request rejected",
      "Your General permission request was rejected: Dates overlap.",
    ),
    "Your permission request was rejected: Dates overlap.",
  );
  assert.equal(permissionRequestRejectedMessage("Dates overlap."), "Your permission request was rejected: Dates overlap.");
});

test("finance-related notification types use the finance category", () => {
  for (const type of ["expense", "expense_approval", "expense_status", "finance", "contribution", "payment"]) {
    assert.equal(notificationCategory(type), "finance");
  }
});

test("notification retention uses a fixed seven-day lifetime and five-day read cleanup", () => {
  assert.equal(NOTIFICATION_LIFETIME_DAYS, 7);
  assert.equal(READ_NOTIFICATION_RETENTION_DAYS, 5);
  assert.equal(normalizeNotificationRetentionDays(undefined), DEFAULT_NOTIFICATION_RETENTION_DAYS);
  assert.equal(normalizeNotificationRetentionDays(1), MIN_NOTIFICATION_RETENTION_DAYS);
  assert.equal(normalizeNotificationRetentionDays(120), READ_NOTIFICATION_RETENTION_DAYS);
  assert.equal(normalizeNotificationRetentionDays(99999), MAX_NOTIFICATION_RETENTION_DAYS);

  const now = new Date("2026-08-11T12:00:00.000Z");
  assert.equal(notificationLifetimeCutoff(now).toISOString(), "2026-08-04T12:00:00.000Z");
  assert.equal(readNotificationCutoff(now).toISOString(), "2026-08-06T12:00:00.000Z");
});

test("notifications for missing, unavailable, or completed resources are stale", () => {
  const base = { title: "New form published", dedupeKey: "form:42:published:1" };
  assert.equal(notificationSourceIsCurrent({ ...base, sourceType: "spiritual_form" }, { exists: false }), false);
  assert.equal(notificationSourceIsCurrent({ ...base, sourceType: "spiritual_form" }, { exists: true, available: false }), false);
  assert.equal(notificationSourceIsCurrent({ ...base, sourceType: "spiritual_form" }, { exists: true, available: true, submitted: true }), false);
  assert.equal(notificationSourceIsCurrent({ ...base, sourceType: "spiritual_form" }, { exists: true, available: true, submitted: false }), true);
  assert.equal(notificationSourceIsCurrent(
    { sourceType: "action_plan_task", title: "Task due soon", dedupeKey: "action-task:8:due-soon" },
    { exists: true, status: "completed", progress: 100 },
  ), false);
});

test("resolved approval alerts are cleared while outcome notifications remain", () => {
  const pendingAlert = {
    sourceType: "permission_request",
    title: "Permission request submitted",
    dedupeKey: "permission:9:submitted:user:2",
  };
  const outcome = {
    sourceType: "permission_request",
    title: "Permission request approved",
    dedupeKey: "permission:9:approved:user:4",
  };

  assert.equal(notificationSourceIsCurrent(pendingAlert, { exists: true, status: "pending" }), true);
  assert.equal(notificationSourceIsCurrent(pendingAlert, { exists: true, status: "approved" }), false);
  assert.equal(notificationSourceIsCurrent(outcome, { exists: true, status: "approved" }), true);
});

test("repeated actionable reminders share a deduplication group", () => {
  assert.equal(notificationActionGroup({
    sourceType: "action_plan_task",
    title: "Task overdue",
    dedupeKey: "action-task:4:overdue:2026-08-11",
  }), "action_plan_task");
  assert.equal(notificationActionGroup({
    sourceType: "permission_request",
    title: "Permission request submitted",
    dedupeKey: "permission:3:submitted:user:1",
  }), "permission_request:pending");
  assert.equal(notificationActionGroup({
    sourceType: "permission_request",
    title: "Permission request approved",
    dedupeKey: "permission:3:approved:user:2",
  }), null);
});
