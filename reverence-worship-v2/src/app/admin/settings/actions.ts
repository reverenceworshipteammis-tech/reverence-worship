"use server";

import { revalidatePath } from "next/cache";
import { requirePageAccess } from "@/lib/auth";
import { getEmailConfiguration } from "@/lib/email-config";
import { notifyEmailAddress, processPendingEmailDeliveries, reconcilePendingPermissionNotifications, verifyEmailTransport } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

type ActionResult = {
  ok: boolean;
  message: string;
};

type SettingValue = string | number | boolean;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "1" || formData.get(key) === "on";
}

function readNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function assertRange(value: number, min: number, max: number, label: string) {
  if (value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
}

async function saveSettings(
  group: string,
  values: Record<string, SettingValue>,
  message: string,
) {
  const user = await requirePageAccess("settings");

  await prisma.$transaction(async (tx) => {
    for (const [key, value] of Object.entries(values)) {
      await tx.systemSetting.upsert({
        where: { key },
        update: { value, group },
        create: { key, value, group },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: user.id,
        action: "settings_updated",
        module: "settings",
        metadata: {
          group,
          keys: Object.keys(values),
        },
      },
    });
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/login");
  revalidatePath("/register");
  revalidatePath("/admin/probation");
  return { ok: true, message } satisfies ActionResult;
}

export async function updateAccessSettings(formData: FormData) {
  try {
    return saveSettings(
      "access",
      {
        registration_enabled: readBoolean(formData, "registration_enabled"),
      },
      readBoolean(formData, "registration_enabled")
        ? "Public registration enabled. The register link is visible again."
        : "Public registration disabled. The register link is removed and new registrations are blocked.",
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to update access settings.",
    };
  }
}

export async function updateSecuritySettings(formData: FormData) {
  try {
    const sessionLifetime = readNumber(formData, "session_lifetime", 10);
    const passwordMinLength = readNumber(formData, "password_min_length", 6);

    assertRange(sessionLifetime, 1, 10, "Session lifetime");
    assertRange(passwordMinLength, 6, 255, "Minimum password length");

    return saveSettings(
      "security",
      {
        session_lifetime: sessionLifetime,
        password_min_length: passwordMinLength,
      },
      "Security settings updated successfully.",
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to update security settings.",
    };
  }
}

export async function updateProbationSettings(formData: FormData) {
  try {
    const durationMonths = readNumber(formData, "probation_default_duration_months", 4);
    assertRange(durationMonths, 1, 24, "Default probation duration");
    return saveSettings(
      "probation",
      { probation_default_duration_months: Math.round(durationMonths) },
      "Default probation duration updated successfully.",
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to update probation settings.",
    };
  }
}

export async function updateNotificationSettings(formData: FormData) {
  try {
    return saveSettings(
      "notifications",
      {
        notification_in_app_enabled: readBoolean(formData, "notification_in_app_enabled"),
        notification_email_enabled: readBoolean(formData, "notification_email_enabled"),
        notification_account_enabled: readBoolean(formData, "notification_account_enabled"),
        notification_security_enabled: readBoolean(formData, "notification_security_enabled"),
        notification_announcement_enabled: readBoolean(formData, "notification_announcement_enabled"),
        notification_permission_enabled: readBoolean(formData, "notification_permission_enabled"),
        notification_form_enabled: readBoolean(formData, "notification_form_enabled"),
        notification_task_enabled: readBoolean(formData, "notification_task_enabled"),
        notification_finance_enabled: readBoolean(formData, "notification_finance_enabled"),
        notification_system_enabled: readBoolean(formData, "notification_system_enabled"),
      },
      "Notification settings updated successfully.",
    );
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to update notification settings.",
    };
  }
}

export async function clearSystemCache() {
  const user = await requirePageAccess("settings");

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "cache_cleared",
      module: "settings",
      metadata: { route: "/admin/settings" },
    },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "System cache cleared successfully." } satisfies ActionResult;
}

export async function sendTestEmail() {
  const user = await requirePageAccess("settings");
  const configuration = getEmailConfiguration();
  if (!configuration.configured) {
    return { ok: false, message: configuration.issue ?? "SMTP is not configured." } satisfies ActionResult;
  }

  const verification = await verifyEmailTransport();
  if (!verification.ok) {
    return { ok: false, message: `SMTP verification failed: ${verification.message}` } satisfies ActionResult;
  }

  const result = await notifyEmailAddress(
    user.email,
    "Reverence Worship email test",
    "Email delivery is configured correctly. This test was requested from System Settings.",
  );
  return result.status === "sent"
    ? { ok: true, message: `Test email sent successfully to ${user.email}.` }
    : { ok: false, message: result.error ?? "The test email was not sent." };
}

export async function retryQueuedEmails() {
  await requirePageAccess("settings");
  const configuration = getEmailConfiguration();
  if (!configuration.configured) {
    return { ok: false, message: configuration.issue ?? "SMTP is not configured." } satisfies ActionResult;
  }

  const verification = await verifyEmailTransport();
  if (!verification.ok) {
    return { ok: false, message: `SMTP verification failed: ${verification.message}` } satisfies ActionResult;
  }

  const requeued = await prisma.emailDelivery.updateMany({
    where: { status: "failed" },
    data: { status: "pending", attempts: 0, nextAttemptAt: null },
  });
  const reconciled = await reconcilePendingPermissionNotifications();
  const processed = await processPendingEmailDeliveries(100, true);
  revalidatePath("/admin/settings");
  return {
    ok: true,
    message: processed
      ? `Processed ${processed} unsent email${processed === 1 ? "" : "s"}${requeued.count ? `, including ${requeued.count} previously failed` : ""}, and checked ${reconciled.requests} pending permission request${reconciled.requests === 1 ? "" : "s"}.`
      : `No unsent emails remained after checking ${reconciled.requests} pending permission request${reconciled.requests === 1 ? "" : "s"}.`,
  } satisfies ActionResult;
}
