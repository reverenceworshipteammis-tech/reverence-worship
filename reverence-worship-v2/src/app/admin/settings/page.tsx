import { SettingsClient, type SettingsValues } from "@/components/settings-client";
import { requirePageAccess } from "@/lib/auth";
import { getEmailConfiguration } from "@/lib/email-config";
import { prisma } from "@/lib/prisma";
import { normalizeSessionLifetimeMinutes } from "@/lib/session-policy";
import { DEFAULT_BIRTHDAY_MESSAGE_TEMPLATE, DEFAULT_BIRTHDAY_TITLE_TEMPLATE } from "@/lib/birthday-rules";
import {
  ACCOUNT_NOTIFICATION_EVENTS,
  DEFAULT_ACCOUNT_EVENT_CHANNELS,
  DEFAULT_ACCOUNT_ROLE_MESSAGE_TEMPLATE,
  DEFAULT_ACCOUNT_STATUS_MESSAGE_TEMPLATE,
  NOTIFICATION_CATEGORIES,
  accountNotificationEventChannelSettingKey,
  accountNotificationEventSettingKey,
  parseNotificationRecipientSettings,
  type NotificationCategory,
} from "@/lib/notification-rules";

function boolValue(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "1" || value === "true";
  if (typeof value === "number") return value === 1;
  return fallback;
}

function numberValue(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export default async function SettingsPage() {
  await requirePageAccess("settings");

  const [rows, pendingEmails, failedEmails, notificationUsers, notificationRoles] = await Promise.all([
    prisma.systemSetting.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
    }),
    prisma.emailDelivery.count({ where: { status: "pending" } }),
    prisma.emailDelivery.count({ where: { status: "failed" } }),
    prisma.user.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.role.findMany({
      where: { name: { not: "super-admin" } },
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true },
    }),
  ]);

  const settings = new Map(rows.map((row) => [row.key, row.value]));
  const notificationRecipients = Object.fromEntries(NOTIFICATION_CATEGORIES.map((category) => {
    return [category, parseNotificationRecipientSettings(settings.get(`notification_${category}_recipients`))];
  })) as Record<NotificationCategory, SettingsValues["notifications"]["recipients"][NotificationCategory]>;
  const notificationTemplates = Object.fromEntries(NOTIFICATION_CATEGORIES.map((category) => [
    category,
    {
      title: stringValue(settings.get(`notification_${category}_title_template`), ""),
      message: stringValue(settings.get(`notification_${category}_message_template`), ""),
    },
  ])) as SettingsValues["notifications"]["templates"];
  const notificationChannels = Object.fromEntries([...NOTIFICATION_CATEGORIES, "birthday"].map((type) => [
    type,
    {
      inAppEnabled: boolValue(
        settings.get(`notification_${type}_in_app_enabled`),
        boolValue(settings.get("notification_in_app_enabled"), true),
      ),
      emailEnabled: boolValue(
        settings.get(`notification_${type}_email_enabled`),
        boolValue(settings.get("notification_email_enabled"), true),
      ),
    },
  ])) as SettingsValues["notifications"]["channels"];
  const emailConfiguration = getEmailConfiguration();
  const values: SettingsValues = {
    registrationEnabled: boolValue(settings.get("registration_enabled"), true),
    sessionLifetime: normalizeSessionLifetimeMinutes(settings.get("session_lifetime")),
    passwordMinLength: numberValue(settings.get("password_min_length"), 6),
    passwordMaxLength: numberValue(settings.get("password_max_length"), 32),
    passwordHistoryCount: numberValue(settings.get("password_history_count"), 3),
    passwordRepeatEnabled: boolValue(settings.get("password_repeat_enabled"), false),
    passwordRepeatMonths: numberValue(settings.get("password_repeat_months"), 3),
    passwordMinUsageEnabled: boolValue(settings.get("password_min_usage_enabled"), true),
    passwordMinUsageDays: numberValue(settings.get("password_min_usage_days"), 10),
    passwordExpirationEnabled: boolValue(settings.get("password_expiration_enabled"), true),
    passwordValidityDays: numberValue(settings.get("password_validity_days"), 90),
    passwordExpirationWarningDays: numberValue(settings.get("password_expiration_warning_days"), 10),
    forceLogoutOnPasswordReset: boolValue(settings.get("force_logout_on_password_reset"), true),
    probationDefaultDurationMonths: numberValue(settings.get("probation_default_duration_months"), 4),
    notifications: {
      accountEnabled: boolValue(settings.get("notification_account_enabled"), true),
      securityEnabled: boolValue(settings.get("notification_security_enabled"), true),
      announcementEnabled: boolValue(settings.get("notification_announcement_enabled"), true),
      permissionEnabled: boolValue(settings.get("notification_permission_enabled"), true),
      formEnabled: boolValue(settings.get("notification_form_enabled"), true),
      joinRequestEnabled: boolValue(settings.get("notification_join_request_enabled"), true),
      probationEnabled: boolValue(settings.get("notification_probation_enabled"), true),
      taskEnabled: boolValue(settings.get("notification_task_enabled"), true),
      financeEnabled: boolValue(settings.get("notification_finance_enabled"), true),
      systemEnabled: boolValue(settings.get("notification_system_enabled"), true),
      birthdayEnabled: boolValue(settings.get("notification_birthday_enabled"), true),
      birthdayTitleTemplate: stringValue(settings.get("notification_birthday_title_template"), DEFAULT_BIRTHDAY_TITLE_TEMPLATE),
      birthdayMessageTemplate: stringValue(settings.get("notification_birthday_message_template"), DEFAULT_BIRTHDAY_MESSAGE_TEMPLATE),
      accountStatusMessageTemplate: stringValue(
        settings.get("notification_account_status_message_template"),
        DEFAULT_ACCOUNT_STATUS_MESSAGE_TEMPLATE,
      ),
      accountRoleMessageTemplate: stringValue(
        settings.get("notification_account_role_message_template"),
        DEFAULT_ACCOUNT_ROLE_MESSAGE_TEMPLATE,
      ),
      accountEvents: Object.fromEntries(ACCOUNT_NOTIFICATION_EVENTS.map((event) => [
        event.id,
        {
          enabled: boolValue(settings.get(accountNotificationEventSettingKey(event.id)), true),
          inAppEnabled: boolValue(
            settings.get(accountNotificationEventChannelSettingKey(event.id, "inAppEnabled")),
            DEFAULT_ACCOUNT_EVENT_CHANNELS[event.id].inAppEnabled,
          ),
          emailEnabled: boolValue(
            settings.get(accountNotificationEventChannelSettingKey(event.id, "emailEnabled")),
            DEFAULT_ACCOUNT_EVENT_CHANNELS[event.id].emailEnabled,
          ),
        },
      ])) as SettingsValues["notifications"]["accountEvents"],
      channels: notificationChannels,
      recipients: notificationRecipients,
      templates: notificationTemplates,
    },
    notificationUsers,
    notificationRoles,
    emailInfrastructure: {
      configured: emailConfiguration.configured,
      issue: emailConfiguration.issue,
      appUrlConfigured: emailConfiguration.appUrlConfigured,
      cronSecretConfigured: emailConfiguration.cronSecretConfigured,
      pendingEmails,
      failedEmails,
    },
  };

  return <SettingsClient values={values} />;
}
