"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { requirePageAccess } from "@/lib/auth";
import { getEmailConfiguration } from "@/lib/email-config";
import { notifyEmailAddress, processPendingEmailDeliveries, reconcilePendingPermissionNotifications, verifyEmailTransport } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SESSION_LIFETIME_MINUTES,
  MAX_SESSION_LIFETIME_MINUTES,
  MIN_SESSION_LIFETIME_MINUTES,
} from "@/lib/session-policy";
import { unsupportedBirthdayPlaceholders } from "@/lib/birthday-rules";
import {
  ACCOUNT_NOTIFICATION_EVENTS,
  accountNotificationEventChannelSettingKey,
  accountNotificationEventSettingKey,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  unsupportedNotificationPlaceholders,
} from "@/lib/notification-rules";

type ActionResult = {
  ok: boolean;
  message: string;
};

type SettingValue = Prisma.InputJsonValue;

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

function assertIntegerRange(value: number, min: number, max: number, label: string) {
  assertRange(value, min, max, label);
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be a whole number.`);
  }
}

async function saveSettings(
  group: string,
  values: Record<string, SettingValue>,
  message: string,
) {
  const user = await requirePageAccess("settings");

  await prisma.$transaction(async (tx) => {
    const entries = Object.entries(values);
    const existingSettings = await tx.systemSetting.findMany({
      where: { key: { in: entries.map(([key]) => key) } },
      select: { key: true, value: true },
    });
    const existingValues = new Map(existingSettings.map((setting) => [setting.key, setting.value]));
    const missingEntries = entries.filter(([key]) => !existingValues.has(key));
    const changedEntries = entries.filter(([key, value]) =>
      existingValues.has(key) && JSON.stringify(existingValues.get(key)) !== JSON.stringify(value),
    );

    if (missingEntries.length) {
      await tx.systemSetting.createMany({
        data: missingEntries.map(([key, value]) => ({ key, value, group })),
        skipDuplicates: true,
      });
    }
    for (const [key, value] of changedEntries) {
      await tx.systemSetting.update({
        where: { key },
        data: { value, group },
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
    return await saveSettings(
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
    const sessionLifetime = readNumber(formData, "session_lifetime", DEFAULT_SESSION_LIFETIME_MINUTES);
    const passwordMinLength = readNumber(formData, "password_min_length", 6);
    const passwordMaxLength = readNumber(formData, "password_max_length", 32);
    const passwordHistoryCount = readNumber(formData, "password_history_count", 3);
    const passwordRepeatMonths = readNumber(formData, "password_repeat_months", 3);
    const passwordMinUsageDays = readNumber(formData, "password_min_usage_days", 10);
    const passwordValidityDays = readNumber(formData, "password_validity_days", 90);
    const passwordExpirationWarningDays = readNumber(formData, "password_expiration_warning_days", 10);

    assertRange(
      sessionLifetime,
      MIN_SESSION_LIFETIME_MINUTES,
      MAX_SESSION_LIFETIME_MINUTES,
      "Session lifetime",
    );
    assertRange(passwordMinLength, 6, 255, "Minimum password length");
    assertIntegerRange(passwordMaxLength, 6, 255, "Maximum password length");
    if (passwordMaxLength < passwordMinLength) {
      throw new Error("Maximum password length cannot be less than minimum password length.");
    }
    assertIntegerRange(passwordHistoryCount, 0, 24, "Password history");
    assertIntegerRange(passwordRepeatMonths, 1, 24, "Password reuse interval");
    assertIntegerRange(passwordMinUsageDays, 1, 365, "Minimum password usage period");
    assertIntegerRange(passwordValidityDays, 1, 3650, "Password validity");
    assertIntegerRange(passwordExpirationWarningDays, 1, 180, "Password expiration warning period");

    return await saveSettings(
      "security",
      {
        session_lifetime: sessionLifetime,
        password_min_length: passwordMinLength,
        password_max_length: passwordMaxLength,
        password_history_count: passwordHistoryCount,
        password_repeat_enabled: readBoolean(formData, "password_repeat_enabled"),
        password_repeat_months: passwordRepeatMonths,
        password_min_usage_enabled: readBoolean(formData, "password_min_usage_enabled"),
        password_min_usage_days: passwordMinUsageDays,
        password_expiration_enabled: readBoolean(formData, "password_expiration_enabled"),
        password_validity_days: passwordValidityDays,
        password_expiration_warning_days: passwordExpirationWarningDays,
        force_logout_on_password_reset: readBoolean(formData, "force_logout_on_password_reset"),
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
    return await saveSettings(
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
    const accountStatusMessageTemplate = readString(formData, "notification_account_status_message_template");
    const accountRoleMessageTemplate = readString(formData, "notification_account_role_message_template");
    if (!accountStatusMessageTemplate || !accountRoleMessageTemplate) {
      throw new Error("Account status and role change messages are required.");
    }
    if (accountStatusMessageTemplate.length > 1_000) throw new Error("Account status change message must not exceed 1,000 characters.");
    if (accountRoleMessageTemplate.length > 1_000) throw new Error("Account role change message must not exceed 1,000 characters.");
    const unsupportedAccountStatusPlaceholders = unsupportedNotificationPlaceholders(
      accountStatusMessageTemplate,
      ["{firstName}", "{old status}", "{new status}", "{oldStatus}", "{newStatus}"],
    );
    if (unsupportedAccountStatusPlaceholders.length) {
      throw new Error(`Unsupported account status message placeholder${unsupportedAccountStatusPlaceholders.length === 1 ? "" : "s"}: ${unsupportedAccountStatusPlaceholders.join(", ")}.`);
    }
    const unsupportedAccountRolePlaceholders = unsupportedNotificationPlaceholders(
      accountRoleMessageTemplate,
      ["{firstName}", "{oldRole}", "{newRole}"],
    );
    if (unsupportedAccountRolePlaceholders.length) {
      throw new Error(`Unsupported account role message placeholder${unsupportedAccountRolePlaceholders.length === 1 ? "" : "s"}: ${unsupportedAccountRolePlaceholders.join(", ")}.`);
    }

    const birthdayTitleTemplate = readString(formData, "notification_birthday_title_template");
    const birthdayMessageTemplate = readString(formData, "notification_birthday_message_template");
    if (!birthdayTitleTemplate || !birthdayMessageTemplate) {
      throw new Error("Birthday notification title and message are required.");
    }
    if (birthdayTitleTemplate.length > 120) throw new Error("Birthday notification title must not exceed 120 characters.");
    if (birthdayMessageTemplate.length > 1_000) throw new Error("Birthday notification message must not exceed 1,000 characters.");
    const unsupported = unsupportedBirthdayPlaceholders(`${birthdayTitleTemplate}\n${birthdayMessageTemplate}`);
    if (unsupported.length) {
      throw new Error(`Unsupported birthday placeholder${unsupported.length === 1 ? "" : "s"}: ${unsupported.join(", ")}.`);
    }

    const notificationSettings: Record<string, SettingValue> = {
      notification_account_enabled: readBoolean(formData, "notification_account_enabled"),
      notification_security_enabled: readBoolean(formData, "notification_security_enabled"),
      notification_announcement_enabled: readBoolean(formData, "notification_announcement_enabled"),
      notification_permission_enabled: readBoolean(formData, "notification_permission_enabled"),
      notification_form_enabled: readBoolean(formData, "notification_form_enabled"),
      notification_join_request_enabled: readBoolean(formData, "notification_join_request_enabled"),
      notification_probation_enabled: readBoolean(formData, "notification_probation_enabled"),
      notification_task_enabled: readBoolean(formData, "notification_task_enabled"),
      notification_finance_enabled: readBoolean(formData, "notification_finance_enabled"),
      notification_system_enabled: readBoolean(formData, "notification_system_enabled"),
      notification_birthday_enabled: readBoolean(formData, "notification_birthday_enabled"),
      notification_birthday_in_app_enabled: readBoolean(formData, "notification_birthday_in_app_enabled"),
      notification_birthday_email_enabled: readBoolean(formData, "notification_birthday_email_enabled"),
      notification_birthday_title_template: birthdayTitleTemplate,
      notification_birthday_message_template: birthdayMessageTemplate,
      notification_account_status_message_template: accountStatusMessageTemplate,
      notification_account_role_message_template: accountRoleMessageTemplate,
    };
    for (const event of ACCOUNT_NOTIFICATION_EVENTS) {
      notificationSettings[accountNotificationEventSettingKey(event.id)] = readBoolean(
        formData,
        accountNotificationEventSettingKey(event.id),
      );
      notificationSettings[accountNotificationEventChannelSettingKey(event.id, "inAppEnabled")] = readBoolean(
        formData,
        accountNotificationEventChannelSettingKey(event.id, "inAppEnabled"),
      );
      notificationSettings[accountNotificationEventChannelSettingKey(event.id, "emailEnabled")] = readBoolean(
        formData,
        accountNotificationEventChannelSettingKey(event.id, "emailEnabled"),
      );
    }

    const selectedRecipientsByCategory = new Map<NotificationCategory, { mode: "individuals" | "roles" | "all"; userIds: number[]; roleIds: number[] }>();
    for (const category of NOTIFICATION_CATEGORIES) {
      const fieldPrefix = `notification_${category}`;
      notificationSettings[`${fieldPrefix}_in_app_enabled`] = readBoolean(formData, `${fieldPrefix}_in_app_enabled`);
      notificationSettings[`${fieldPrefix}_email_enabled`] = readBoolean(formData, `${fieldPrefix}_email_enabled`);
      const recipientMode = readString(formData, `${fieldPrefix}_recipient_mode`);
      if (!["individuals", "roles", "all"].includes(recipientMode)) {
        throw new Error(`Select a valid recipient type for ${category.replaceAll("_", " ")} notifications.`);
      }
      const readIds = (fieldName: string, description: string) => formData.getAll(fieldName).map((value) => {
        if (typeof value !== "string" || !/^\d+$/.test(value)) {
          throw new Error(`Invalid ${description} selected for ${category.replaceAll("_", " ")} notifications.`);
        }
        const id = Number(value);
        if (!Number.isSafeInteger(id) || id < 1) {
          throw new Error(`Invalid ${description} selected for ${category.replaceAll("_", " ")} notifications.`);
        }
        return id;
      });
      const selectedRecipients = {
        mode: recipientMode as "individuals" | "roles" | "all",
        userIds: [...new Set(readIds(`${fieldPrefix}_recipient_users`, "person"))],
        roleIds: [...new Set(readIds(`${fieldPrefix}_recipient_roles`, "role"))],
      };
      selectedRecipientsByCategory.set(category, selectedRecipients);

      if (category !== "account") {
        const titleTemplate = readString(formData, `notification_${category}_title_template`);
        const messageTemplate = readString(formData, `notification_${category}_message_template`);
        if (titleTemplate.length > 120) throw new Error(`${category.replaceAll("_", " ")} notification title must not exceed 120 characters.`);
        if (messageTemplate.length > 1_000) throw new Error(`${category.replaceAll("_", " ")} notification message must not exceed 1,000 characters.`);
        const unsupportedTemplatePlaceholders = unsupportedNotificationPlaceholders(`${titleTemplate}\n${messageTemplate}`);
        if (unsupportedTemplatePlaceholders.length) {
          throw new Error(`Unsupported ${category.replaceAll("_", " ")} notification placeholder${unsupportedTemplatePlaceholders.length === 1 ? "" : "s"}: ${unsupportedTemplatePlaceholders.join(", ")}.`);
        }
        notificationSettings[`notification_${category}_title_template`] = titleTemplate;
        notificationSettings[`notification_${category}_message_template`] = messageTemplate;
      }
      notificationSettings[`${fieldPrefix}_recipients`] = selectedRecipients;
    }

    const allSelectedRecipientIds = [...new Set([...selectedRecipientsByCategory.values()].flatMap((selection) => selection.userIds))];
    if (allSelectedRecipientIds.length) {
      const activeRecipients = await prisma.user.findMany({
        where: { id: { in: allSelectedRecipientIds }, status: "active" },
        select: { id: true },
      });
      if (activeRecipients.length !== allSelectedRecipientIds.length) {
        throw new Error("One or more selected notification recipients are no longer active. Refresh the page and try again.");
      }
    }
    const allSelectedRoleIds = [...new Set([...selectedRecipientsByCategory.values()].flatMap((selection) => selection.roleIds))];
    if (allSelectedRoleIds.length) {
      const activeRoles = await prisma.role.findMany({
        where: { id: { in: allSelectedRoleIds }, name: { not: "super-admin" } },
        select: { id: true },
      });
      if (activeRoles.length !== allSelectedRoleIds.length) {
        throw new Error("One or more selected roles are no longer available. Refresh the page and try again.");
      }
    }

    return await saveSettings(
      "notifications",
      notificationSettings,
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
    ? { ok: true, message: "Test email sent successfully." }
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
