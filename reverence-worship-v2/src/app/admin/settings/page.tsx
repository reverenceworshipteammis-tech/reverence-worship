import { SettingsClient, type SettingsValues } from "@/components/settings-client";
import { requirePageAccess } from "@/lib/auth";
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

  const rows = await prisma.systemSetting.findMany({
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });

  const settings = new Map(rows.map((row) => [row.key, row.value]));
  const values: SettingsValues = {
    registrationEnabled: boolValue(settings.get("registration_enabled"), true),
    sessionLifetime: Math.min(numberValue(settings.get("session_lifetime"), 10), 10),
    passwordMinLength: numberValue(settings.get("password_min_length"), 6),
    notifications: {
      inAppEnabled: boolValue(settings.get("notification_in_app_enabled"), true),
      emailEnabled: boolValue(settings.get("notification_email_enabled"), true),
      accountEnabled: boolValue(settings.get("notification_account_enabled"), true),
      securityEnabled: boolValue(settings.get("notification_security_enabled"), true),
      announcementEnabled: boolValue(settings.get("notification_announcement_enabled"), true),
      formEnabled: boolValue(settings.get("notification_form_enabled"), true),
      taskEnabled: boolValue(settings.get("notification_task_enabled"), true),
      financeEnabled: boolValue(settings.get("notification_finance_enabled"), true),
      systemEnabled: boolValue(settings.get("notification_system_enabled"), true),
    },
  };

  return <SettingsClient values={values} />;
}
