import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isTransientDatabaseError, withDatabaseRetry } from "@/lib/database-retry";

const lastKnownSettings = new Map<string, unknown>();
const unavailableSettingDefaults: Record<string, unknown> = {
  registration_enabled: false,
  session_lifetime: 30,
  password_min_length: 6,
  probation_default_duration_months: 4,
};

export function settingToBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "1" || value === "true";
  if (typeof value === "number") return value === 1;
  return fallback;
}

export function settingToNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export const getSystemSetting = cache(async (key: string) => {
  try {
    const setting = await withDatabaseRetry(() => prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    }), 3);

    if (setting) lastKnownSettings.set(key, setting.value);
    return setting?.value;
  } catch (error) {
    if (!isTransientDatabaseError(error)) throw error;

    const hasLastKnownValue = lastKnownSettings.has(key);
    console.warn(`System setting "${key}" is temporarily unavailable; using ${hasLastKnownValue ? "its last known value" : "a safe default"}.`);
    return hasLastKnownValue ? lastKnownSettings.get(key) : unavailableSettingDefaults[key];
  }
});

export async function isRegistrationEnabled() {
  return settingToBoolean(await getSystemSetting("registration_enabled"), true);
}
