import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

const PRISMA_SCHEMA_VERSION = "2026-10-05-pooled-database-url-v7";

function databaseUrl() {
  // The application should use the pooled URL. DIRECT_URL is reserved for
  // tools that explicitly need a direct database connection (such as migrations).
  return process.env.DATABASE_URL?.trim() || process.env.DIRECT_URL?.trim();
}

function databasePoolMax() {
  const defaultPoolMax = 5;
  const configured = Number(process.env.DATABASE_POOL_MAX ?? defaultPoolMax);
  if (!Number.isInteger(configured)) return defaultPoolMax;
  return Math.min(10, Math.max(1, configured));
}

const adapter = new PrismaPg({
  connectionString: databaseUrl(),
  max: databasePoolMax(),
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 60_000,
  keepAlive: true,
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
