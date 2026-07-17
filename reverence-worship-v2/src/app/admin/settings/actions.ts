"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
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
  const user = await requireUser();

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
  const user = await requireUser();

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
