import Link from "next/link";
import { getUserPermissionSet, permissionSetHas, requireAnyPermission } from "@/lib/auth";
import { loadCommitmentReports } from "@/lib/membership-commitment-service";
import { CommitmentReports } from "@/components/commitment-reports";

export default async function CommitmentReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await requireAnyPermission("intercession", ["view-reports", "view-submissions", "view-results", "export-reports"], "/admin/intercession");
  const permissions = await getUserPermissionSet(user);
  const year = Number((await searchParams).year);
  const report = await loadCommitmentReports(Number.isInteger(year) ? year : undefined);
  return <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6"><div className="flex items-center gap-4"><Link href="/admin/intercession?section=reports" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-5 text-base font-bold text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">Back</Link><h1 className="text-2xl font-bold text-slate-900">Membership Commitment</h1></div><CommitmentReports {...report} canExport={permissionSetHas(permissions, "intercession", "export-reports")} /></main>;
}
