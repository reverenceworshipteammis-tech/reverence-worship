import assert from "node:assert/strict";
import test from "node:test";
import { getEmailConfiguration } from "../src/lib/email-config";
import {
  ACCOUNT_NOTIFICATION_EVENTS,
  ACCOUNT_NOTIFICATION_PLACEHOLDERS,
  DEFAULT_ACCOUNT_EVENT_CHANNELS,
  DEFAULT_ACCOUNT_ROLE_MESSAGE_TEMPLATE,
  DEFAULT_ACCOUNT_STATUS_MESSAGE_TEMPLATE,
  accountNotificationEventChannelSettingKey,
  accountNotificationEventSettingKey,
  notificationCategory,
  parseNotificationRecipientSettings,
  renderNotificationContent,
  shouldIncludeConfiguredNotificationRecipients,
  unsupportedNotificationPlaceholders,
} from "../src/lib/notification-rules";
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

test("notification templates can customize text while retaining original event details", () => {
  assert.deepEqual(
    renderNotificationContent("Request received", "A request needs review.", {
      title: "Action required: {title}",
      message: "Please review this item.\n{message}",
    }),
    {
      title: "Action required: Request received",
      message: "Please review this item.\nA request needs review.",
    },
  );
  assert.deepEqual(
    renderNotificationContent("Original title", "Original message", { title: "", message: "" }),
    { title: "Original title", message: "Original message" },
  );
  assert.deepEqual(unsupportedNotificationPlaceholders("See {title} and {message}"), []);
  assert.deepEqual(unsupportedNotificationPlaceholders("Hello {name}"), ["{name}"]);
});

test("account notification templates render personalized status placeholders", () => {
  assert.equal(
    DEFAULT_ACCOUNT_STATUS_MESSAGE_TEMPLATE,
    "Dear {firstName}, your account status has changed from {old status} to {new status}.",
  );
  assert.deepEqual(
    renderNotificationContent(
      "Account status updated",
      "Your account status changed.",
      {
        title: "{title}",
        message: "Dear {firstName}, your Reverence Worship account status changed from {old status} to {newStatus}.",
      },
      { firstName: "Alice", oldStatus: "Pending", newStatus: "Active" },
    ),
    {
      title: "Account status updated",
      message: "Dear Alice, your Reverence Worship account status changed from Pending to Active.",
    },
  );
  assert.deepEqual(
    renderNotificationContent(
      "Role changed",
      "Your role was updated.",
      { title: "", message: "Dear {firstName}, status changed from {old status} to {new status}." },
      { firstName: "Alice" },
    ),
    { title: "Role changed", message: "Your role was updated." },
  );
});

test("account role change templates render previous and assigned roles", () => {
  assert.equal(
    DEFAULT_ACCOUNT_ROLE_MESSAGE_TEMPLATE,
    "Dear {firstName}, your account role has changed from {oldRole} to {newRole}.",
  );
  assert.deepEqual(
    renderNotificationContent(
      "Role changed",
      "Your role was updated.",
      { title: "", message: DEFAULT_ACCOUNT_ROLE_MESSAGE_TEMPLATE },
      { firstName: "Alice", oldRole: "Visitor", newRole: "Member, Treasurer" },
    ),
    {
      title: "Role changed",
      message: "Dear Alice, your account role has changed from Visitor to Member, Treasurer.",
    },
  );
});

test("only account templates accept account-specific placeholders", () => {
  assert.deepEqual(
    unsupportedNotificationPlaceholders(
      "Dear {firstName}, status changed from {old status} to {newStatus}.",
      ACCOUNT_NOTIFICATION_PLACEHOLDERS,
    ),
    [],
  );
  assert.deepEqual(
    unsupportedNotificationPlaceholders("Hello {name}", ACCOUNT_NOTIFICATION_PLACEHOLDERS),
    ["{name}"],
  );
  assert.deepEqual(unsupportedNotificationPlaceholders("Hello {firstName}"), ["{firstName}"]);
});

test("notification recipients support individuals, roles, and all active members", () => {
  assert.deepEqual(
    parseNotificationRecipientSettings({ mode: "roles", userIds: [], roleIds: [3, 4, 3, -1, "5"] }),
    { mode: "roles", userIds: [], roleIds: [3, 4] },
  );
  assert.deepEqual(
    parseNotificationRecipientSettings({ mode: "all", userIds: [8], roleIds: [2] }),
    { mode: "all", userIds: [8], roleIds: [2] },
  );
  assert.deepEqual(
    parseNotificationRecipientSettings([1, 2, "3", 0]),
    { mode: "individuals", userIds: [1, 2], roleIds: [] },
  );
  assert.deepEqual(
    parseNotificationRecipientSettings({ mode: "invalid", userIds: null, roleIds: [] }),
    { mode: "individuals", userIds: [], roleIds: [] },
  );
});

test("account notifications never add statically configured recipients", () => {
  assert.equal(shouldIncludeConfiguredNotificationRecipients("account", true), false);
  assert.equal(shouldIncludeConfiguredNotificationRecipients("account", false), false);
  assert.equal(shouldIncludeConfiguredNotificationRecipients("announcement", true), true);
  assert.equal(shouldIncludeConfiguredNotificationRecipients("announcement", false), false);
});

test("account event settings expose registration, status, and role controls", () => {
  assert.deepEqual(
    ACCOUNT_NOTIFICATION_EVENTS.map(({ id }) => id),
    ["registration", "status_change", "role_change"],
  );
  assert.equal(accountNotificationEventSettingKey("registration"), "notification_account_event_registration_enabled");
  assert.equal(accountNotificationEventSettingKey("status_change"), "notification_account_event_status_change_enabled");
  assert.equal(accountNotificationEventSettingKey("role_change"), "notification_account_event_role_change_enabled");
  assert.equal(
    accountNotificationEventChannelSettingKey("registration", "inAppEnabled"),
    "notification_account_event_registration_in_app_enabled",
  );
  assert.equal(
    accountNotificationEventChannelSettingKey("role_change", "emailEnabled"),
    "notification_account_event_role_change_email_enabled",
  );
  assert.deepEqual(DEFAULT_ACCOUNT_EVENT_CHANNELS, {
    registration: { inAppEnabled: true, emailEnabled: true },
    status_change: { inAppEnabled: true, emailEnabled: true },
    role_change: { inAppEnabled: true, emailEnabled: false },
  });
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
