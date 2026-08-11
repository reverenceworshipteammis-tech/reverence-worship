import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";

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
  const setting = await prisma.systemSetting.findUnique({
    where: { key },
    select: { value: true },
  });

  return setting?.value;
});

export async function isRegistrationEnabled() {
  return settingToBoolean(await getSystemSetting("registration_enabled"), true);
}
