import { UserManagementClient } from "@/components/user-management-client";
import { requireAdminUser } from "@/lib/auth";
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
  await requireAdminUser();

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

  const [users, roles, stats] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    }),
    prisma.role.findMany({
      where: { name: { not: "super-admin" } },
      orderBy: { displayName: "asc" },
      select: {
        id: true,
        name: true,
        displayName: true,
      },
    }),
    Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "active" } }),
      prisma.user.count({ where: { status: "inactive" } }),
      prisma.user.count({ where: { status: "pending" } }),
      prisma.user.count({ where: { membershipType: "permanent" } }),
      prisma.user.count({ where: { gender: "male" } }),
      prisma.user.count({ where: { gender: "female" } }),
    ]),
  ]);

  const [total, active, inactive, pending, permanent, male, female] = stats;

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
