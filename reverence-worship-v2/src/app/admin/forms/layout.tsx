import { FormsSectionNavigation } from "@/components/forms-section-navigation";
import { getUserPermissionSet, permissionSetHas, requireUser } from "@/lib/auth";

export default async function FormsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const permissions = await getUserPermissionSet(user);
  const canManage =
    permissionSetHas(permissions, "intercession", "manage-forms") ||
    permissionSetHas(permissions, "intercession", "create-forms") ||
    permissionSetHas(permissions, "intercession", "edit-forms") ||
    permissionSetHas(permissions, "intercession", "publish-forms") ||
    permissionSetHas(permissions, "intercession", "delete-forms") ||
    permissionSetHas(permissions, "intercession", "view-submissions");
  const canViewReports =
    permissionSetHas(permissions, "intercession", "view-reports") ||
    permissionSetHas(permissions, "intercession", "view-submissions") ||
    permissionSetHas(permissions, "intercession", "view-results") ||
    permissionSetHas(permissions, "intercession", "export-reports");

  return (
    <div className="-mt-6 grid w-full grid-cols-1 gap-3 px-2 pb-3 sm:px-4 sm:pb-5 lg:grid-cols-[9rem_minmax(0,1fr)]">
      <FormsSectionNavigation canManage={canManage} canViewReports={canViewReports} />
      <div className="min-w-0 [&>*]:mx-0 [&>*]:mt-0 [&>*]:max-w-none [&>*]:px-0 [&>*]:pt-0 [&>div>form>.mx-auto]:mx-0 [&>div>form>.mx-auto]:max-w-none">{children}</div>
    </div>
  );
}
