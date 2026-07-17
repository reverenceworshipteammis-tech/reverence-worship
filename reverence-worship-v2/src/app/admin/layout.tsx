import { AdminShell } from "@/components/admin-shell";
import { AppDialogProvider } from "@/components/app-dialog-provider";
import { getUserPermissionSet, needsGoogleProfileCompletion, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();
  if (user.mustChangePassword) {
    redirect("/change-password");
  }
  if (needsGoogleProfileCompletion(user)) {
    redirect("/complete-profile");
  }
  const roles = user.roles.map((userRole) => userRole.role.name);
  const permissions = Array.from(await getUserPermissionSet(user));

  // determine whether the current user is associated as a parent
  const parentMember = await prisma.familyMember.findFirst({ where: { userId: user.id, role: { equals: "parent", mode: "insensitive" } }, select: { id: true } });
  const parentByFamily = await prisma.family.findFirst({ where: { parentId: user.id }, select: { id: true } });
  const isParent = Boolean(parentMember || parentByFamily);

  return (
    <AppDialogProvider>
      <AdminShell
        user={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          roles,
          permissions,
          isParent,
          profile: {
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            status: user.status,
            roleLabels: user.roles.map((userRole) => userRole.role.displayName),
            phone: user.phone,
            gender: user.gender,
            dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
            maritalStatus: user.maritalStatus,
            membershipType: user.membershipType,
            occupation: user.occupation,
            province: user.province,
            district: user.district,
            sector: user.sector,
            cell: user.cell,
            village: user.village,
            emergencyName: user.emergencyName,
            emergencyPhone: user.emergencyPhone,
            notes: user.notes,
          },
        }}
      >
        {children}
      </AdminShell>
    </AppDialogProvider>
  );
}
