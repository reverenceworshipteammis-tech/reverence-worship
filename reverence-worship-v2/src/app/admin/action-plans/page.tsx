import Link from "next/link";
import {
  Banknote,
  Building2,
  ClipboardList,
  Download,
  ListChecks,
  Search,
  Target,
  TriangleAlert,
} from "lucide-react";
import { DepartmentActionPlanDetailsButton, type DepartmentPlanDetails } from "@/components/department-action-plan-details-button";
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
    description: plan.description,
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
      assigneeName: task.assigneeName,
      status: task.status,
      progress: task.progress,
      priority: task.priority,
      deadline: task.deadline?.toISOString() ?? null,
      overdue: task.overdue,
      dueSoon: task.dueSoon,
      estimatedBudget: task.estimatedBudget,
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
            <p className="mt-1 max-w-2xl text-sm text-slate-500">Consolidated plans, tasks, progress, deadlines, and planned budgets from every department.</p>
          </div>
        </div>
        {canExport ? (
          <a href={`/admin/action-plans/export?${exportSearch.toString()}`} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 sm:mt-0">
            <Download className="size-4" aria-hidden="true" />
            Export Excel
          </a>
        ) : null}
      </header>

      <form method="get" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.25fr_repeat(4,minmax(135px,0.7fr))_auto] xl:items-end">
          <label className="text-xs font-semibold text-slate-600">
            Search
            <span className="relative mt-1 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input name="q" defaultValue={filters.query} placeholder="Plan, activity, milestone, person" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </span>
          </label>
          <FilterSelect name="year" label="Year" defaultValue={filters.year === null ? "all" : String(filters.year)} options={[["all", "All years"], ...portfolio.availableYears.map((year) => [String(year), String(year)] as [string, string])]} />
          <FilterSelect name="department" label="Department" defaultValue={filters.department ?? "all"} options={[["all", "All departments"], ...ACTION_PLAN_DEPARTMENTS.map((department) => [department.value, department.label] as [string, string])]} />
          <FilterSelect name="status" label="Plan status" defaultValue={filters.status ?? "all"} options={[["all", "All statuses"], ["pending", "Pending"], ["in_progress", "In progress"], ["completed", "Completed"]]} />
          <FilterSelect name="deadline" label="Deadline" defaultValue={filters.deadline ?? "all"} options={[["all", "All deadlines"], ["overdue", "Overdue"], ["due-soon", "Due within 7 days"], ["no-deadline", "No task deadline"]]} />
          <div className="flex gap-2 md:col-span-2 xl:col-span-1">
            <button type="submit" className="h-10 flex-1 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">Apply</button>
            <Link href="/admin/action-plans" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Reset</Link>
          </div>
        </div>
      </form>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Organization action plan summary">
        <SummaryCard label="Departments" value={portfolio.summary.departmentCount} note="Represented in results" icon={Building2} tone="blue" />
        <SummaryCard label="Action Plans" value={portfolio.summary.planCount} note={`${portfolio.summary.completedPlanCount} completed`} icon={ClipboardList} tone="violet" />
        <SummaryCard label="Tasks" value={portfolio.summary.taskCount} note={`${portfolio.summary.completedTaskCount} completed`} icon={ListChecks} tone="sky" />
        <SummaryCard label="Overall Progress" value={`${portfolio.summary.progress}%`} note="Average task progress" icon={Target} tone="emerald" />
        <SummaryCard label="Overdue Tasks" value={portfolio.summary.overdueTaskCount} note={`${portfolio.summary.dueSoonTaskCount} due within 7 days`} icon={TriangleAlert} tone="rose" />
        <SummaryCard label="Planned Budget" value={formatCurrency(portfolio.summary.plannedBudget)} note="Estimated, not actual spending" icon={Banknote} tone="amber" compact />
      </section>

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

function FilterSelect({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: Array<[string, string]> }) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <select name={name} defaultValue={defaultValue} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function SummaryCard({ label, value, note, icon: Icon, tone, compact = false }: { label: string; value: string | number; note: string; icon: typeof Building2; tone: "blue" | "violet" | "sky" | "emerald" | "rose" | "amber"; compact?: boolean }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`inline-flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="size-4" aria-hidden="true" /></div>
      <p className={`mt-3 font-bold text-slate-950 ${compact ? "text-lg" : "text-2xl"}`}>{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-[11px] leading-4 text-slate-400">{note}</p>
    </article>
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
