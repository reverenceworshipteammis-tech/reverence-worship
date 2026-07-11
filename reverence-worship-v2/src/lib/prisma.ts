import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const existingPrisma = globalForPrisma.prisma;

export const prisma =
  existingPrisma &&
  "actionPlan" in existingPrisma &&
  "actionPlanTask" in existingPrisma &&
  "attendanceRecord" in existingPrisma &&
  "attendanceSession" in existingPrisma &&
  "permissionRequest" in existingPrisma &&
  "disciplineRecord" in existingPrisma
    ? existingPrisma
    : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
