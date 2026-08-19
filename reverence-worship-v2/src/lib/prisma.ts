import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

const PRISMA_SCHEMA_VERSION = "2026-08-19-database-pool-resilience";

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
  const configured = Number(process.env.DATABASE_POOL_MAX ?? 5);
  if (!Number.isInteger(configured)) return 5;
  return Math.min(10, Math.max(1, configured));
}

const adapter = new PrismaPg({
  connectionString: databaseUrl(),
  // Leave enough local capacity for the parallel queries used by authenticated
  // layouts while keeping the Neon pooled endpoint's connection usage bounded.
  max: databasePoolMax(),
  connectionTimeoutMillis: 30_000,
  idleTimeoutMillis: 60_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5_000,
});

const existingPrisma = globalForPrisma.prisma;
const canReusePrisma =
  existingPrisma &&
  globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION &&
  "formSummaryShare" in existingPrisma &&
  "familyMember" in existingPrisma &&
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
  "probationDecisionRequest" in existingPrisma;

export const prisma =
  canReusePrisma
    ? existingPrisma
    : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}
