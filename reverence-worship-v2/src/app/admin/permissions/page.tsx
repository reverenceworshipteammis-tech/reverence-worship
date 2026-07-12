import { PermissionManagerClient } from "@/components/permission-manager-client";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PermissionManagerPage() {
  await requireAdminUser();

  const [roles, pages, assignments] = await Promise.all([
    prisma.role.findMany({
      where: { name: { not: "super-admin" } },
      orderBy: [{ isSystem: "desc" }, { displayName: "asc" }],
      include: {
        users: true,
        permissions: { select: { pageId: true, featureId: true } },
      },
    }),
    prisma.page.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      include: { features: { orderBy: { name: "asc" } } },
    }),
    prisma.rolePageFeature.findMany({
      select: { roleId: true, pageId: true, featureId: true },
    }),
  ]);

  return (
    <PermissionManagerClient
      roles={roles.map((role) => ({
        id: role.id,
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
        usersCount: role.users.length,
        modulesCount: new Set(role.permissions.map((permission) => permission.pageId)).size,
      }))}
      pages={pages.map((page) => ({
        id: page.id,
        name: page.name,
        label: page.label,
        icon: page.icon,
        features: page.features.map((feature) => ({
          id: feature.id,
          pageId: feature.pageId,
          name: feature.name,
          label: feature.label,
          description: feature.description,
        })),
      }))}
      assignments={assignments}
    />
  );
}
