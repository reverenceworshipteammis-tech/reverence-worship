import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

const PRISMA_SCHEMA_VERSION = "2026-08-12-song-archiving";

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

function databasePoolMax() {
  const configured = Number(process.env.DATABASE_POOL_MAX ?? 2);
  if (!Number.isInteger(configured)) return 2;
  return Math.min(10, Math.max(1, configured));
}

const adapter = new PrismaPg({
  connectionString: databaseUrl(),
  // A small pool avoids opening several expensive remote connections during
  // the first authenticated request. The Neon endpoint already provides pooling.
  max: databasePoolMax(),
  connectionTimeoutMillis: 30_000,
  idleTimeoutMillis: 60_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5_000,
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
  "disciplineSession" in existingPrisma &&
  "disciplineRecord" in existingPrisma &&
  "financeTermSetting" in existingPrisma &&
  "contribution" in existingPrisma &&
  "payment" in existingPrisma &&
  "contributionEvent" in existingPrisma &&
  "eventContributionPayment" in existingPrisma &&
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
  "passwordResetToken" in existingPrisma &&
  "probation" in existingPrisma &&
  "probationExtension" in existingPrisma &&
  "probationDecisionRequest" in existingPrisma
    ? existingPrisma
    : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}
