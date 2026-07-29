import assert from "node:assert/strict";
import test from "node:test";
import { getEmailConfiguration } from "../src/lib/email-config";
import { notificationCategory } from "../src/lib/notification-rules";
import {
  DEFAULT_NOTIFICATION_RETENTION_DAYS,
  MAX_NOTIFICATION_RETENTION_DAYS,
  MIN_NOTIFICATION_RETENTION_DAYS,
  normalizeNotificationRetentionDays,
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

test("finance-related notification types use the finance category", () => {
  for (const type of ["expense", "expense_approval", "expense_status", "finance", "contribution", "payment"]) {
    assert.equal(notificationCategory(type), "finance");
  }
});

test("notification retention stays within the supported range", () => {
  assert.equal(normalizeNotificationRetentionDays(undefined), DEFAULT_NOTIFICATION_RETENTION_DAYS);
  assert.equal(normalizeNotificationRetentionDays(1), MIN_NOTIFICATION_RETENTION_DAYS);
  assert.equal(normalizeNotificationRetentionDays(120), 120);
  assert.equal(normalizeNotificationRetentionDays(99999), MAX_NOTIFICATION_RETENTION_DAYS);
});
