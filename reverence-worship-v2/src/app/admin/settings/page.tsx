import { SettingsClient, type SettingsValues } from "@/components/settings-client";
import { requirePageAccess } from "@/lib/auth";
import { getEmailConfiguration } from "@/lib/email-config";
import { prisma } from "@/lib/prisma";

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

export default async function SettingsPage() {
  await requirePageAccess("settings");

  const [rows, pendingEmails, failedEmails] = await Promise.all([
    prisma.systemSetting.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
    }),
    prisma.emailDelivery.count({ where: { status: "pending" } }),
    prisma.emailDelivery.count({ where: { status: "failed" } }),
  ]);

  const settings = new Map(rows.map((row) => [row.key, row.value]));
  const emailConfiguration = getEmailConfiguration();
  const values: SettingsValues = {
    registrationEnabled: boolValue(settings.get("registration_enabled"), true),
    sessionLifetime: Math.min(numberValue(settings.get("session_lifetime"), 10), 10),
    passwordMinLength: numberValue(settings.get("password_min_length"), 6),
    probationDefaultDurationMonths: numberValue(settings.get("probation_default_duration_months"), 4),
    notifications: {
      inAppEnabled: boolValue(settings.get("notification_in_app_enabled"), true),
      emailEnabled: boolValue(settings.get("notification_email_enabled"), true),
      accountEnabled: boolValue(settings.get("notification_account_enabled"), true),
      securityEnabled: boolValue(settings.get("notification_security_enabled"), true),
      announcementEnabled: boolValue(settings.get("notification_announcement_enabled"), true),
      permissionEnabled: boolValue(settings.get("notification_permission_enabled"), true),
      formEnabled: boolValue(settings.get("notification_form_enabled"), true),
      taskEnabled: boolValue(settings.get("notification_task_enabled"), true),
      financeEnabled: boolValue(settings.get("notification_finance_enabled"), true),
      systemEnabled: boolValue(settings.get("notification_system_enabled"), true),
    },
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
