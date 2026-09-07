import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

const PRISMA_SCHEMA_VERSION = "2026-09-07-postgres-direct-development-v5";

function databaseUrl() {
  const directUrl = process.env.DIRECT_URL?.trim();
  const value = directUrl || process.env.DATABASE_URL;
  if (!value || directUrl || process.env.NODE_ENV === "production") return value;

  try {
    const url = new URL(value);
    if (url.hostname.includes("neon.tech") && url.hostname.includes("-pooler.")) {
      url.hostname = url.hostname.replace("-pooler.", ".");
      return url.toString();
    }
  } catch {
    // Prisma will report a useful configuration error for malformed URLs.
  }

  return value;
}

function databasePoolMax() {
  const defaultPoolMax = process.env.NODE_ENV === "production" ? 5 : 1;
  const configured = Number(process.env.DATABASE_POOL_MAX ?? defaultPoolMax);
  if (!Number.isInteger(configured)) return defaultPoolMax;
  return Math.min(10, Math.max(1, configured));
}

const adapter = new PrismaPg({
  connectionString: databaseUrl(),
  max: databasePoolMax(),
  connectionTimeoutMillis: 30_000,
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
