import Link from "next/link";
import { getUserPermissionSet, permissionSetHas, requireAnyPermission } from "@/lib/auth";
import { loadCommitmentReports } from "@/lib/membership-commitment-service";
import { CommitmentReports } from "@/components/commitment-reports";

export default async function CommitmentReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await requireAnyPermission("intercession", ["view-reports", "view-submissions", "view-results", "export-reports"], "/admin/intercession");
  const permissions = await getUserPermissionSet(user);
  const year = Number((await searchParams).year);
  const report = await loadCommitmentReports(Number.isInteger(year) ? year : undefined);
  return <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6"><Link href="/admin/intercession?section=reports" className="text-sm font-semibold text-blue-700">← Reports</Link><div><h1 className="text-2xl font-bold text-slate-900">Annual membership commitments</h1><p className="mt-1 text-sm text-slate-500">Track renewals and review the information members confirmed.</p></div><CommitmentReports {...report} canExport={permissionSetHas(permissions, "intercession", "export-reports")} canRemind={permissionSetHas(permissions, "intercession", "manage-forms") || permissionSetHas(permissions, "intercession", "edit-forms")} /></main>;
}
