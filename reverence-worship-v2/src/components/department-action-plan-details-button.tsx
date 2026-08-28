"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Eye, ListChecks, Target, TriangleAlert, WalletCards, X } from "lucide-react";

export type DepartmentPlanDetails = {
  id: number;
  department: string;
  title: string;
  description: string | null;
  year: number;
  status: string;
  priority: string;
  progress: number;
  startDate: string;
  dueDate: string;
  creatorName: string | null;
  completedTaskCount: number;
  taskCount: number;
  overdueTaskCount: number;
  plannedBudget: number;
  tasks: Array<{
    id: number;
    taskName: string;
    activity: string | null;
    targetMilestone: string | null;
    assigneeName: string | null;
    status: string;
    progress: number;
    priority: string;
    deadline: string | null;
    overdue: boolean;
    dueSoon: boolean;
    estimatedBudget: number;
  }>;
};

type Props = {
  department: {
    label: string;
    planCount: number;
    taskCount: number;
    completedTaskCount: number;
    progress: number;
    overdueTaskCount: number;
    plannedBudget: number;
  };
  plans: DepartmentPlanDetails[];
};

export function DepartmentActionPlanDetailsButton({ department, plans }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
        <Eye className="size-3.5" aria-hidden="true" />
        View details
      </button>

      {open ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/55 p-3 sm:p-5">
          <button type="button" onClick={() => setOpen(false)} className="absolute inset-0" aria-label="Close department details" />
          <section role="dialog" aria-modal="true" aria-labelledby="department-details-title" className="relative max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Department action plans</p>
                <h2 id="department-details-title" className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{department.label}</h2>
                <p className="mt-1 text-sm text-slate-500">Consolidated plan, task, deadline, progress, and budget details.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close">
                <X className="size-5" aria-hidden="true" />
              </button>
            </header>

            <div className="max-h-[calc(94vh-94px)] overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <DetailMetric label="Plans" value={department.planCount} icon={CalendarDays} tone="blue" />
                <DetailMetric label="Tasks" value={department.taskCount} icon={ListChecks} tone="violet" />
                <DetailMetric label="Completed" value={department.completedTaskCount} icon={Target} tone="emerald" />
                <DetailMetric label="Progress" value={`${department.progress}%`} icon={Target} tone="sky" />
                <DetailMetric label="Overdue" value={department.overdueTaskCount} icon={TriangleAlert} tone="rose" />
                <DetailMetric label="Planned Budget" value={formatCurrency(department.plannedBudget)} icon={WalletCards} tone="amber" compact />
              </div>

              <div className="mt-5 space-y-3">
                {plans.length ? plans.map((plan) => (
                  <details key={plan.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <summary className="cursor-pointer list-none p-4 marker:hidden [&::-webkit-details-marker]:hidden sm:p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><StatusBadge status={plan.status} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600">{plan.priority} priority</span></div>
                          <h3 className="mt-2 text-base font-bold text-slate-950 sm:text-lg">{plan.title}</h3>
                          <p className="mt-1 text-xs text-slate-500">{plan.year} · {formatDate(plan.startDate)} – {formatDate(plan.dueDate)}{plan.creatorName ? ` · Created by ${plan.creatorName}` : ""}</p>
                        </div>
                        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[510px]">
                          <PlanMetric label="Tasks" value={`${plan.completedTaskCount}/${plan.taskCount}`} />
                          <PlanMetric label="Progress" value={`${plan.progress}%`} />
                          <PlanMetric label="Overdue" value={String(plan.overdueTaskCount)} danger={plan.overdueTaskCount > 0} />
                          <PlanMetric label="Budget" value={formatCurrency(plan.plannedBudget)} />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3"><ProgressBar value={plan.progress} /><span className="text-[11px] font-semibold text-blue-700 group-open:hidden">Show tasks</span><span className="hidden text-[11px] font-semibold text-blue-700 group-open:inline">Hide tasks</span></div>
                    </summary>
                    <div className="border-t border-slate-200 bg-slate-50 p-3 sm:p-4">
                      {plan.description ? <p className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{plan.description}</p> : null}
                      {plan.tasks.length ? (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="min-w-[960px] w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Activity</th><th className="px-3 py-3">Milestone</th><th className="px-3 py-3">Assignee</th><th className="px-3 py-3">Deadline</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Progress</th><th className="px-3 py-3 text-right">Budget</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{plan.tasks.map((task) => <tr key={task.id}><td className="max-w-64 px-3 py-3 font-semibold text-slate-800">{task.activity || task.taskName}</td><td className="max-w-64 px-3 py-3 text-slate-600">{task.targetMilestone || "—"}</td><td className="px-3 py-3 text-slate-600">{task.assigneeName || "Unassigned"}</td><td className={`px-3 py-3 font-medium ${task.overdue ? "text-rose-600" : task.dueSoon ? "text-amber-600" : "text-slate-600"}`}>{task.deadline ? formatDate(task.deadline) : "No deadline"}{task.overdue ? " · Overdue" : task.dueSoon ? " · Due soon" : ""}</td><td className="px-3 py-3"><StatusBadge status={task.progress >= 100 ? "completed" : task.status} /></td><td className="px-3 py-3"><div className="flex min-w-32 items-center gap-2"><ProgressBar value={task.progress} /><span className="text-xs font-semibold text-slate-600">{task.progress}%</span></div></td><td className="px-3 py-3 text-right font-semibold text-slate-800">{formatCurrency(task.estimatedBudget)}</td></tr>)}</tbody>
                          </table>
                        </div>
                      ) : <div className="rounded-lg border border-dashed border-slate-300 bg-white py-8 text-center text-sm text-slate-500">No tasks have been added to this plan.</div>}
                    </div>
                  </details>
                )) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center"><CalendarDays className="mx-auto size-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">No action plans match the current report filters.</p></div>}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function DetailMetric({ label, value, icon: Icon, tone, compact = false }: { label: string; value: string | number; icon: typeof CalendarDays; tone: "blue" | "violet" | "emerald" | "sky" | "rose" | "amber"; compact?: boolean }) {
  const colors = { blue: "bg-blue-50 text-blue-700", violet: "bg-violet-50 text-violet-700", emerald: "bg-emerald-50 text-emerald-700", sky: "bg-sky-50 text-sky-700", rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-700" };
  return <div className="rounded-xl border border-slate-200 p-3"><span className={`inline-flex size-8 items-center justify-center rounded-lg ${colors[tone]}`}><Icon className="size-4" /></span><p className={`mt-2 truncate font-bold text-slate-950 ${compact ? "text-sm" : "text-xl"}`}>{value}</p><p className="mt-0.5 text-[11px] font-semibold text-slate-500">{label}</p></div>;
}

function PlanMetric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-0.5 truncate text-sm font-bold ${danger ? "text-rose-600" : "text-slate-800"}`}>{value}</p></div>;
}

function ProgressBar({ value }: { value: number }) {
  const safe = Math.min(100, Math.max(0, value));
  return <span className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100}><span className="block h-full rounded-full bg-blue-600" style={{ width: `${safe}%` }} /></span>;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.replace(/-/g, "_");
  const colors = normalized === "completed" ? "bg-emerald-50 text-emerald-700" : normalized === "in_progress" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${colors}`}>{normalized.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")}</span>;
}

function formatCurrency(value: number) { return `RWF ${Math.round(value).toLocaleString("en-RW")}`; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "Africa/Kigali" }).format(new Date(value)); }
