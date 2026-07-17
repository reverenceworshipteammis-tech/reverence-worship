import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

const PRISMA_SCHEMA_VERSION = "2026-07-15-password-reset-notifications";

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) return value;

  try {
    const url = new URL(value);
    if (url.hostname.includes("neon.tech") && url.searchParams.get("sslmode") === "require") {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    return value;
  }
}

const adapter = new PrismaPg({
  connectionString: databaseUrl(),
  max: 5,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

const existingPrisma = globalForPrisma.prisma;

export const prisma =
  existingPrisma &&
  globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION &&
  "actionPlan" in existingPrisma &&
  "actionPlanTask" in existingPrisma &&
  "attendanceRecord" in existingPrisma &&
  "attendanceSession" in existingPrisma &&
  "permissionRequest" in existingPrisma &&
  "disciplineRecord" in existingPrisma &&
  "financeTermSetting" in existingPrisma &&
  "contribution" in existingPrisma &&
  "payment" in existingPrisma &&
  "gift" in existingPrisma &&
  "expense" in existingPrisma &&
  "financeReconciliation" in existingPrisma &&
  "sponsor" in existingPrisma &&
  "sponsorPayment" in existingPrisma &&
  "announcement" in existingPrisma &&
  "announcementUserRead" in existingPrisma &&
  "systemSetting" in existingPrisma &&
  "activityLog" in existingPrisma &&
  "notification" in existingPrisma &&
  "emailDelivery" in existingPrisma &&
  "passwordResetToken" in existingPrisma
    ? existingPrisma
    : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}
