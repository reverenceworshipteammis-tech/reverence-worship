import { prisma } from "@/lib/prisma";

type UserExportFilters = {
  search?: string | null;
  role?: string | null;
  status?: string | null;
};

export type UserExportRow = {
  index: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  roles: string;
  status: string;
  joinedDate: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  family: string;
  occupation: string;
  membershipType: string;
  profileComplete: string;
  approvalStatus: string;
};

function formatDate(date: Date | null | undefined) {
  if (!date) return "N/A";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function titleCase(value: string | null | undefined) {
  if (!value) return "N/A";
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function approvalStatus(status: string) {
  if (status === "active") return "approved";
  if (status === "inactive") return "rejected";
  return "pending";
}

function profileComplete(user: {
  phone: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  maritalStatus: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
}) {
  return [
    user.phone,
    user.dateOfBirth,
    user.gender,
    user.maritalStatus,
    user.province,
    user.district,
    user.sector,
    user.cell,
    user.village,
  ].every(Boolean)
    ? "Yes"
    : "No";
}

export async function getUserExportRows(filters: UserExportFilters) {
  const search = filters.search?.trim();
  const roleId = filters.role ? Number(filters.role) : undefined;
  const status = filters.status;

  const users = await prisma.user.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status === "active" || status === "pending" || status === "inactive"
        ? { status }
        : {}),
      ...(Number.isFinite(roleId)
        ? {
            roles: {
              some: { roleId },
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
      familyMembership: {
        include: {
          family: true,
        },
      },
    },
  });

  return users.map<UserExportRow>((user, index) => {
    return {
      index: index + 1,
      fullName: user.name,
      email: user.email,
      phoneNumber: user.phone || "N/A",
      roles: user.roles.map(({ role }) => role.displayName).join(", ") || "N/A",
      status: titleCase(user.status),
      joinedDate: formatDate(user.createdAt),
      dateOfBirth: formatDate(user.dateOfBirth),
      gender: titleCase(user.gender),
      maritalStatus: user.maritalStatus || "N/A",
      province: user.province || "N/A",
      district: user.district || "N/A",
      sector: user.sector || "N/A",
      cell: user.cell || "N/A",
      village: user.village || "N/A",
      family: user.familyMembership?.family.name || "N/A",
      occupation: user.occupation || "N/A",
      membershipType: titleCase(user.membershipType),
      profileComplete: profileComplete(user),
      approvalStatus: approvalStatus(user.status),
    };
  });
}
