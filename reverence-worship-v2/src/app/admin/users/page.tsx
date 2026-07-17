import { UserManagementClient } from "@/components/user-management-client";
import { requirePageAccess } from "@/lib/auth";
import { withDatabaseRetry } from "@/lib/database-retry";
import { prisma } from "@/lib/prisma";

type UsersPageProps = {
  searchParams: Promise<{
    search?: string;
    role?: string;
    status?: "active" | "pending" | "inactive";
  }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  await requirePageAccess("users");

  const params = await searchParams;
  const search = params.search?.trim();
  const roleId = params.role ? Number(params.role) : undefined;
  const status = params.status;

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(Number.isFinite(roleId)
      ? {
          roles: {
            some: {
              roleId,
            },
          },
        }
      : {}),
  };

  const users = await withDatabaseRetry(() =>
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    }),
  );

  const [roles, total, statusCounts, membershipCounts, genderCounts] = await withDatabaseRetry(() =>
    Promise.all([
      prisma.role.findMany({
        where: { name: { not: "super-admin" } },
        orderBy: { displayName: "asc" },
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      }),
      prisma.user.count(),
      prisma.user.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.user.groupBy({ by: ["membershipType"], _count: { _all: true } }),
      prisma.user.groupBy({ by: ["gender"], _count: { _all: true } }),
    ]),
  );

  const statusMap = new Map(statusCounts.map((item) => [item.status, item._count._all]));
  const membershipMap = new Map(membershipCounts.map((item) => [item.membershipType, item._count._all]));
  const genderMap = new Map(genderCounts.map((item) => [item.gender, item._count._all]));
  const active = statusMap.get("active") ?? 0;
  const inactive = statusMap.get("inactive") ?? 0;
  const pending = statusMap.get("pending") ?? 0;
  const permanent = membershipMap.get("permanent") ?? 0;
  const male = genderMap.get("male") ?? 0;
  const female = genderMap.get("female") ?? 0;

  return (
    <UserManagementClient
      roles={roles}
      stats={{ total, active, inactive, pending, permanent, male, female }}
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : "",
        province: user.province,
        district: user.district,
        sector: user.sector,
        village: user.village,
        maritalStatus: user.maritalStatus,
        membershipType: user.membershipType,
        occupation: user.occupation,
        skills: user.skills,
        status: user.status,
        createdAt: formatDate(user.createdAt),
        roles: user.roles.map(({ role }) => ({
          id: role.id,
          name: role.name,
          displayName: role.displayName,
        })),
      }))}
    />
  );
}
