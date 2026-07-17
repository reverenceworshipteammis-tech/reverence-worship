import { AdminShell } from "@/components/admin-shell";
import { AppDialogProvider } from "@/components/app-dialog-provider";
import { getUserPermissionSet, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  const roles = user.roles.map((userRole) => userRole.role.name);
  const permissions = Array.from(await getUserPermissionSet(user));

  // determine whether the current user is associated as a parent
  const parentMember = await prisma.familyMember.findFirst({ where: { userId: user.id, role: { equals: "parent", mode: "insensitive" } }, select: { id: true } });
  const parentByFamily = await prisma.family.findFirst({ where: { parentId: user.id }, select: { id: true } });
  const isParent = Boolean(parentMember || parentByFamily);

  return (
    <AppDialogProvider>
      <AdminShell user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl, roles, permissions, isParent }}>
        {children}
      </AdminShell>
    </AppDialogProvider>
  );
}
