import { UserManagementClient } from "@/components/user-management-client";
import { requirePageAccess } from "@/lib/auth";
import { withDatabaseRetry } from "@/lib/database-retry";
import { prisma } from "@/lib/prisma";
import { excludeSuperAdminUserWhere } from "@/lib/system-account-rules";

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

type UserStatsRow = {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  permanent: number;
  male: number;
  female: number;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  await requirePageAccess("users");

  const params = await searchParams;
  const search = params.search?.trim();
  const inProbation = params.role === "in-probation";
  const roleId = params.role && !inProbation ? Number(params.role) : undefined;
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
    roles: {
      ...excludeSuperAdminUserWhere().roles,
      ...(Number.isFinite(roleId) ? { some: { roleId } } : {}),
    },
    ...(inProbation
      ? { probations: { some: { state: { in: ["active" as const, "extended" as const] } } } }
      : {}),
  };

  const [users, roles, statsRows] = await withDatabaseRetry(() =>
    Promise.all([
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
          probations: {
            where: { state: { in: ["active", "extended"] } },
            select: { id: true },
            take: 1,
          },
        },
      }),
      prisma.role.findMany({
        where: { name: { notIn: ["super-admin", "probation-member", "probation"] } },
        orderBy: { displayName: "asc" },
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      }),
      prisma.$queryRaw<UserStatsRow[]>`
        SELECT
          COUNT(*)::int AS "total",
          COUNT(*) FILTER (WHERE "status" = 'active')::int AS "active",
          COUNT(*) FILTER (WHERE "status" = 'inactive')::int AS "inactive",
          COUNT(*) FILTER (WHERE "status" = 'pending')::int AS "pending",
          COUNT(*) FILTER (WHERE "membership_type" = 'permanent')::int AS "permanent",
          COUNT(*) FILTER (WHERE "gender" = 'male')::int AS "male",
          COUNT(*) FILTER (WHERE "gender" = 'female')::int AS "female"
        FROM "users"
        WHERE NOT EXISTS (
          SELECT 1
          FROM "role_user" system_role
          INNER JOIN "roles" role ON role."id" = system_role."role_id"
          WHERE system_role."user_id" = "users"."id" AND role."name" = 'super-admin'
        )
      `,
    ]),
  );
  const stats = statsRows[0] ?? { total: 0, active: 0, inactive: 0, pending: 0, permanent: 0, male: 0, female: 0 };

  return (
    <UserManagementClient
      roles={roles}
      stats={stats}
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
        cell: user.cell,
        village: user.village,
        maritalStatus: user.maritalStatus,
        membershipType: user.membershipType,
        occupation: user.occupation,
        skills: user.skills,
        status: user.status,
        createdAt: formatDate(user.createdAt),
        createdAtValue: user.createdAt.toISOString(),
        inProbation: user.probations.length > 0,
        roles: user.roles.map(({ role }) => ({
          id: role.id,
          name: role.name,
          displayName: role.displayName,
        })),
      }))}
    />
  );
}
