import { AdminShell } from "@/components/admin-shell";
import { AppDialogProvider } from "@/components/app-dialog-provider";
import { getCurrentUser, getUserPermissionSet, isUserParent, needsGoogleProfileCompletion } from "@/lib/auth";
import { authPathWithReturnTo, safeAuthReturnPath } from "@/lib/auth-return-path";
import { normalizeSessionLifetimeMinutes } from "@/lib/session-policy";
import { getSystemSetting } from "@/lib/system-settings";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, requestHeaders] = await Promise.all([getCurrentUser(), headers()]);
  const returnTo = safeAuthReturnPath(requestHeaders.get("x-reverence-return-path"));
  if (!user) {
    redirect(authPathWithReturnTo("/login", returnTo));
  }
  if (user.mustChangePassword) {
    redirect(authPathWithReturnTo("/change-password", returnTo));
  }
  if (needsGoogleProfileCompletion(user)) {
    redirect(authPathWithReturnTo("/complete-profile", returnTo));
  }
  const roles = user.roles.map((userRole) => userRole.role.name);
  const [permissionSet, sessionLifetimeSetting, isParent] = await Promise.all([
    getUserPermissionSet(user),
    getSystemSetting("session_lifetime"),
    isUserParent(user.id),
  ]);
  const permissions = Array.from(permissionSet);
  const sessionLifetimeMinutes = normalizeSessionLifetimeMinutes(sessionLifetimeSetting);

  return (
    <AppDialogProvider>
      <AdminShell
        sessionLifetimeMinutes={sessionLifetimeMinutes}
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
