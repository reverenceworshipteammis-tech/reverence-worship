import {
  ClipboardList,
  Download,
} from "lucide-react";
import { ActionPlanFilters } from "@/components/action-plan-filters";
import { DepartmentActionPlanDetailsButton, type DepartmentPlanDetails } from "@/components/department-action-plan-details-button";
import { OrganizationActionPlanTimeline, type OrganizationTimelinePlan } from "@/components/organization-action-plan-timeline";
import { getUserPermissionSet, permissionSetHas, requirePermission } from "@/lib/auth";
import {
  ACTION_PLAN_DEPARTMENTS,
  getActionPlanPortfolio,
  normalizeActionPlanPortfolioFilters,
} from "@/lib/action-plan-portfolio";

type SearchParams = {
  year?: string | string[];
  department?: string | string[];
  status?: string | string[];
  deadline?: string | string[];
  q?: string | string[];
};

export default async function ConsolidatedActionPlansPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requirePermission("reports", "view");
  const [params, permissions] = await Promise.all([searchParams, getUserPermissionSet(user)]);
  const filters = normalizeActionPlanPortfolioFilters({
    year: firstValue(params.year),
    department: firstValue(params.department),
    status: firstValue(params.status),
    deadline: firstValue(params.deadline),
    q: firstValue(params.q),
  });
  const portfolio = await getActionPlanPortfolio(filters);
  const canExport = permissionSetHas(permissions, "reports", "export");
  const exportSearch = new URLSearchParams();
  exportSearch.set("year", filters.year === null ? "all" : String(filters.year));
  if (filters.department) exportSearch.set("department", filters.department);
  if (filters.status) exportSearch.set("status", filters.status);
  if (filters.deadline) exportSearch.set("deadline", filters.deadline);
  if (filters.query) exportSearch.set("q", filters.query);
  const planDetails: DepartmentPlanDetails[] = portfolio.plans.map((plan) => ({
    id: plan.id,
    department: plan.department,
    title: plan.title,
    year: plan.year,
    status: plan.status,
    priority: plan.priority,
    progress: plan.progress,
    startDate: plan.startDate.toISOString(),
    dueDate: plan.dueDate.toISOString(),
    creatorName: plan.creatorName,
    completedTaskCount: plan.completedTaskCount,
    taskCount: plan.taskCount,
    overdueTaskCount: plan.overdueTaskCount,
    plannedBudget: plan.plannedBudget,
    tasks: plan.tasks.map((task) => ({
      id: task.id,
      taskName: task.taskName,
      activity: task.activity,
      targetMilestone: task.targetMilestone,
      status: task.status,
      progress: task.progress,
      priority: task.priority,
      deadline: task.deadline?.toISOString() ?? null,
      overdue: task.overdue,
      dueSoon: task.dueSoon,
      estimatedBudget: task.estimatedBudget,
    })),
  }));
  const timelinePlans: OrganizationTimelinePlan[] = portfolio.plans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    departmentLabel: plan.departmentLabel,
    startDate: plan.startDate.toISOString(),
    dueDate: plan.dueDate.toISOString(),
    progress: plan.progress,
    status: plan.status,
    tasks: plan.tasks.filter((task) => {
      if (filters.deadline === "overdue") return task.overdue;
      if (filters.deadline === "due-soon") return task.dueSoon;
      if (filters.deadline === "no-deadline") return !task.deadline;
      return true;
    }).map((task) => ({
      id: task.id,
      activity: task.activity || task.taskName,
      startDate: task.startDate?.toISOString() ?? null,
      deadline: task.deadline?.toISOString() ?? null,
      progress: task.progress,
      status: task.status,
    })),
  }));

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:px-4 sm:py-6 lg:px-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex sm:items-start sm:justify-between sm:gap-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <ClipboardList className="size-6" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">All Action Plans</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Read-only portfolio</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
          <OrganizationActionPlanTimeline plans={timelinePlans} scopeLabel={filters.department ? ACTION_PLAN_DEPARTMENTS.find((department) => department.value === filters.department)?.label ?? "Selected department" : "All departments"} />
          {canExport ? (
            <a href={`/admin/action-plans/export?${exportSearch.toString()}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <Download className="size-4" aria-hidden="true" />
              Export Excel
            </a>
          ) : null}
        </div>
      </header>

      <ActionPlanFilters
        query={filters.query}
        year={filters.year === null ? "all" : String(filters.year)}
        department={filters.department ?? "all"}
        status={filters.status ?? "all"}
        deadline={filters.deadline ?? "all"}
        yearOptions={[["all", "All years"], ...portfolio.availableYears.map((year) => [String(year), String(year)] as [string, string])]}
        departmentOptions={[["all", "All departments"], ...ACTION_PLAN_DEPARTMENTS.map((department) => [department.value, department.label] as [string, string])]}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <h2 className="font-bold text-slate-950">Department Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1020px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-3 py-3 text-center font-semibold">Plans</th>
                <th className="px-3 py-3 text-center font-semibold">Tasks</th>
                <th className="px-3 py-3 text-center font-semibold">Completed</th>
                <th className="px-3 py-3 font-semibold">Progress</th>
                <th className="px-3 py-3 text-center font-semibold">Overdue</th>
                <th className="px-4 py-3 text-right font-semibold">Planned Budget</th>
                <th className="px-4 py-3 text-right font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {portfolio.departments.map((department) => (
                <tr key={department.department} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold text-slate-800">{department.label}</td>
                  <td className="px-3 py-3 text-center text-slate-600">{department.planCount}</td>
                  <td className="px-3 py-3 text-center text-slate-600">{department.taskCount}</td>
                  <td className="px-3 py-3 text-center text-slate-600">{department.completedTaskCount}</td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-36 items-center gap-2">
                      <ProgressBar value={department.progress} />
                      <span className="w-9 text-right text-xs font-semibold text-slate-600">{department.progress}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center"><span className={department.overdueTaskCount ? "font-bold text-rose-600" : "text-slate-400"}>{department.overdueTaskCount}</span></td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(department.plannedBudget)}</td>
                  <td className="px-4 py-3 text-right">
                    <DepartmentActionPlanDetailsButton department={department} plans={planDetails.filter((plan) => plan.department === department.department)} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
              <tr>
                <td className="px-4 py-3">Total</td>
                <td className="px-3 py-3 text-center">{portfolio.summary.planCount}</td>
                <td className="px-3 py-3 text-center">{portfolio.summary.taskCount}</td>
                <td className="px-3 py-3 text-center">{portfolio.summary.completedTaskCount}</td>
                <td className="px-3 py-3">{portfolio.summary.progress}%</td>
                <td className="px-3 py-3 text-center text-rose-600">{portfolio.summary.overdueTaskCount}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(portfolio.summary.plannedBudget)}</td>
                <td className="px-4 py-3" aria-label="No details action for total" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

    </main>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return <span className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${safeValue}% complete`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeValue}><span className="block h-full rounded-full bg-blue-600" style={{ width: `${safeValue}%` }} /></span>;
}

function formatCurrency(value: number) {
  return `RWF ${Math.round(value).toLocaleString("en-RW")}`;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
