"use client";

import { FormEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Download,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteDepartmentActionPlan,
  deleteDepartmentActionPlanTask,
  saveDepartmentActionPlan,
  saveDepartmentActionPlanTask,
  type ActionPlanTaskImportActionResult,
} from "@/app/admin/action-plans/actions";
import { ActionNotice } from "@/components/action-notice";
import { ActionPlanTaskTemplateButtons } from "@/components/action-plan-task-template-buttons";

export type DepartmentActionPlanTask = {
  id: number;
  actionPlanId?: number;
  taskName: string;
  activity: string | null;
  targetMilestone: string | null;
  estimatedBudget: number | string;
  startDate: string | null;
  startDateRaw?: string;
  startDateValue?: string;
  deadline: string | null;
  deadlineRaw?: string;
  deadlineValue?: string;
  priority: string;
  progress: number;
  status: string;
};

export type DepartmentActionPlan = {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  startDateRaw?: string;
  startDateValue?: string;
  dueDate: string;
  dueDateRaw?: string;
  dueDateValue?: string;
  status: string;
  progress: number;
  year?: number;
  createdByName?: string;
  createdAt: string;
  tasks: DepartmentActionPlanTask[];
};

type Props = {
  department: string;
  departmentLabel: string;
  currentYear: number;
  actionPlans: DepartmentActionPlan[];
  canManage: boolean;
};

type ConfirmTarget =
  | { kind: "plan"; id: number; title: string }
  | { kind: "task"; id: number; title: string };

export function DepartmentActionPlanManager({ department, departmentLabel, currentYear, actionPlans, canManage }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [planModal, setPlanModal] = useState<DepartmentActionPlan | "new" | null>(null);
  const [taskModal, setTaskModal] = useState<{ plan: DepartmentActionPlan; task?: DepartmentActionPlanTask } | null>(null);
  const [viewPlan, setViewPlan] = useState<DepartmentActionPlan | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [notice, setNotice] = useState<ActionPlanTaskImportActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return actionPlans.filter((plan) => {
      const normalizedStatus = normalizeStatus(plan.status);
      const matchesStatus = status === "all" || normalizedStatus === status;
      const matchesSearch = !query || [plan.title, plan.description ?? "", plan.createdByName ?? "", ...plan.tasks.flatMap((task) => [task.activity ?? task.taskName, task.targetMilestone ?? ""])]
        .some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [actionPlans, search, status]);

  const summary = useMemo(() => {
    const tasks = actionPlans.flatMap((plan) => plan.tasks);
    const today = new Date().toISOString().slice(0, 10);
    const dueSoonDate = new Date(`${today}T12:00:00Z`);
    dueSoonDate.setUTCDate(dueSoonDate.getUTCDate() + 7);
    const dueSoon = dueSoonDate.toISOString().slice(0, 10);
    return {
      overdue: tasks.filter((task) => taskDeadlineRaw(task) && taskDeadlineRaw(task) < today && task.progress < 100).length,
      dueSoon: tasks.filter((task) => taskDeadlineRaw(task) >= today && taskDeadlineRaw(task) <= dueSoon && task.progress < 100).length,
      todo: tasks.filter((task) => task.progress < 100).length,
    };
  }, [actionPlans]);

  function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("year", String(currentYear));
    if (planModal && planModal !== "new") formData.set("id", String(planModal.id));
    run(() => saveDepartmentActionPlan(department, formData), () => setPlanModal(null));
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskModal) return;
    const formData = new FormData(event.currentTarget);
    formData.set("actionPlanId", String(taskModal.plan.id));
    if (taskModal.task) formData.set("id", String(taskModal.task.id));
    run(() => saveDepartmentActionPlanTask(department, formData), () => setTaskModal(null));
  }

  function run(action: () => Promise<ActionPlanTaskImportActionResult>, onSuccess?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        setNotice(result);
        if (result.ok) {
          onSuccess?.();
          router.refresh();
        }
      } catch {
        setNotice({ ok: false, message: "The action plan could not be updated. Please try again." });
      }
    });
  }

  function executeDelete() {
    if (!confirmTarget) return;
    const target = confirmTarget;
    run(
      () => target.kind === "plan"
        ? deleteDepartmentActionPlan(department, target.id)
        : deleteDepartmentActionPlanTask(department, target.id),
      () => setConfirmTarget(null),
    );
  }

  return (
    <div className="space-y-5 rounded-xl bg-white p-4 shadow-md sm:p-6">
      {notice ? <ActionNotice message={notice.message} tone={notice.ok ? "success" : "error"} onClose={() => setNotice(null)} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{departmentLabel} Action Plans</h2>
        </div>
        {canManage ? (
          <button type="button" onClick={() => setPlanModal("new")} className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
            <Plus className="size-4" aria-hidden="true" />
            Create New Action Plan
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <SummaryCard label="Overdue Tasks" mobileLabel="Overdue" value={summary.overdue} tone="red" />
        <SummaryCard label="To-Be-Overdue Within 7 Days" mobileLabel="Due Soon" value={summary.dueSoon} tone="amber" />
        <SummaryCard label="My TO DO" mobileLabel="To Do" value={summary.todo} tone="blue" />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <span className="sr-only">Search action plans</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action plans..." className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </label>
        <select aria-label="Filter action plans by status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredPlans.length ? filteredPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            canManage={canManage}
            onAddTask={() => setTaskModal({ plan })}
            onImportResult={setNotice}
            onExport={() => exportTasks(plan)}
            onView={() => setViewPlan(plan)}
            onEdit={() => setPlanModal(plan)}
            onDelete={() => setConfirmTarget({ kind: "plan", id: plan.id, title: plan.title })}
            onEditTask={(task) => setTaskModal({ plan, task })}
            onDeleteTask={(task) => setConfirmTarget({ kind: "task", id: task.id, title: task.activity ?? task.taskName })}
          />
        )) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
            <FileText className="mx-auto mb-3 size-10 text-gray-300" aria-hidden="true" />
            <p className="text-sm text-gray-500">No action plans found</p>
            {canManage ? <button type="button" onClick={() => setPlanModal("new")} className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">Create your first action plan</button> : null}
          </div>
        )}
      </div>

      {planModal ? (
        <Modal title={planModal === "new" ? "Create Action Plan" : "Edit Action Plan"} onClose={() => setPlanModal(null)}>
          <form onSubmit={submitPlan} className="space-y-4 p-5">
            <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Action Plan Name *</span><input name="title" defaultValue={planModal === "new" ? "" : planModal.title} required placeholder="Enter action plan name" className={inputClass} /></label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label><span className="mb-1 block text-sm font-medium text-gray-700">Start Date *</span><input name="startDate" type="date" defaultValue={planModal === "new" ? "" : planStartRaw(planModal)} required className={inputClass} /></label>
              <label><span className="mb-1 block text-sm font-medium text-gray-700">Completion Date *</span><input name="dueDate" type="date" defaultValue={planModal === "new" ? "" : planDueRaw(planModal)} required className={inputClass} /></label>
            </div>
            <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Description</span><textarea name="description" rows={3} defaultValue={planModal === "new" ? "" : planModal.description ?? ""} placeholder="Optional description" className={inputClass} /></label>
            <ModalActions pending={pending} onCancel={() => setPlanModal(null)} submitLabel={planModal === "new" ? "Create Action Plan" : "Update Action Plan"} />
          </form>
        </Modal>
      ) : null}

      {taskModal ? (
        <Modal title={taskModal.task ? `Edit Task for ${taskModal.plan.title}` : `Create Task for ${taskModal.plan.title}`} onClose={() => setTaskModal(null)}>
          <form onSubmit={submitTask} className="space-y-4 p-5">
            <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Action Plan</span><input value={taskModal.plan.title} readOnly className={`${inputClass} bg-gray-50 text-gray-700`} /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Activity *</span><input name="activity" defaultValue={taskModal.task?.activity ?? taskModal.task?.taskName ?? ""} required placeholder="Enter activity" className={inputClass} /></label>
            <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Targeted Milestone *</span><input name="targetMilestone" defaultValue={taskModal.task?.targetMilestone ?? ""} required placeholder="Enter targeted milestone" className={inputClass} /></label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label><span className="mb-1 block text-sm font-medium text-gray-700">Start Date</span><input name="startDate" type="date" defaultValue={taskModal.task ? taskStartRaw(taskModal.task) : ""} className={inputClass} /></label>
              <label><span className="mb-1 block text-sm font-medium text-gray-700">Estimated Budget *</span><input name="estimatedBudget" type="number" min="0" step="0.01" defaultValue={taskModal.task?.estimatedBudget ?? 0} required placeholder="0.00" className={inputClass} /></label>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label><span className="mb-1 block text-sm font-medium text-gray-700">Deadline *</span><input name="deadline" type="date" defaultValue={taskModal.task ? taskDeadlineRaw(taskModal.task) : ""} required className={inputClass} /></label>
              <label><span className="mb-1 block text-sm font-medium text-gray-700">Priority *</span><select name="priority" defaultValue={taskModal.task?.priority ?? "medium"} required className={`${inputClass} bg-white`}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            </div>
            <label className="block md:w-1/2"><span className="mb-1 block text-sm font-medium text-gray-700">Progress *</span><input name="progress" type="number" min="0" max="100" defaultValue={taskModal.task?.progress ?? 0} required className={inputClass} /></label>
            <ModalActions pending={pending} onCancel={() => setTaskModal(null)} submitLabel={taskModal.task ? "Update Task" : "Save Task"} />
          </form>
        </Modal>
      ) : null}

      {viewPlan ? <PlanDetailsModal plan={viewPlan} onClose={() => setViewPlan(null)} /> : null}

      {confirmTarget ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-action-plan-title" className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 bg-red-50 px-5 py-4"><span className="flex size-10 items-center justify-center rounded-full bg-red-100 text-red-600"><AlertTriangle className="size-5" /></span><h2 id="delete-action-plan-title" className="font-bold text-gray-900">Delete {confirmTarget.kind === "plan" ? "Action Plan" : "Task"}</h2></div>
            <p className="px-5 py-5 text-sm leading-6 text-gray-600">Delete “{confirmTarget.title}”? {confirmTarget.kind === "plan" ? "All tasks inside this plan will also be deleted." : "This task will be removed from the plan."}</p>
            <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-4"><button type="button" disabled={pending} onClick={() => setConfirmTarget(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Cancel</button><button type="button" disabled={pending} onClick={executeDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Deleting..." : "Delete"}</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function PlanCard({ plan, canManage, onAddTask, onImportResult, onExport, onView, onEdit, onDelete, onEditTask, onDeleteTask }: {
  plan: DepartmentActionPlan;
  canManage: boolean;
  onAddTask: () => void;
  onImportResult: (result: ActionPlanTaskImportActionResult) => void;
  onExport: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditTask: (task: DepartmentActionPlanTask) => void;
  onDeleteTask: (task: DepartmentActionPlanTask) => void;
}) {
  const totalBudget = plan.tasks.reduce((sum, task) => sum + taskBudget(task), 0);
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold text-gray-900">{plan.title}</h3><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusBadge(plan.status)}`}>{statusLabel(plan.status)}</span></div>
          <p className="mt-2 text-sm text-gray-600">{plan.description || "No description"}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500"><span>By {plan.createdByName ?? "System"}</span><span>Start: {plan.startDate}</span><span>Completion: {plan.dueDate}</span><span>Created: {plan.createdAt}</span><span>Tasks: {plan.tasks.length}</span>{totalBudget > 0 ? <span>Budget: {formatCurrency(totalBudget)}</span> : null}</div>
          <div className="mt-4 flex max-w-md items-center gap-2"><div className="h-2 flex-1 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(plan.progress, 100)}%` }} /></div><span className="text-xs font-semibold text-gray-600">{plan.progress}%</span></div>
        </div>
        <PlanActionsMenu
          plan={plan}
          canManage={canManage}
          onAddTask={onAddTask}
          onImportResult={onImportResult}
          onExport={onExport}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
        <div className="hidden grid-cols-12 gap-2 border-b border-gray-100 bg-white px-4 py-3 text-xs font-semibold text-gray-600 md:grid"><div className="col-span-2">Activity</div><div className="col-span-2">Milestone</div><div className="col-span-2">Budget</div><div className="col-span-2">Deadline</div><div className="col-span-1">Priority</div><div className="col-span-1">Progress</div><div className="col-span-2 text-right">Actions</div></div>
        {plan.tasks.length ? plan.tasks.map((task) => (
          <div key={task.id}>
            <div className="border-b border-gray-100 bg-white p-3 last:border-b-0 md:hidden">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Activity</p><h4 className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-900">{task.activity || task.taskName}</h4></div><span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium capitalize text-gray-700">{task.priority || "medium"}</span></div>
              <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Milestone</p><p className="mt-0.5 text-xs text-gray-700">{task.targetMilestone || "-"}</p></div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><Metric label="Budget" value={taskBudget(task) ? formatCurrency(taskBudget(task)) : "-"} /><Metric label="Deadline" value={task.deadline || "-"} /></div>
              <div className="mt-3 flex items-center gap-3"><TaskProgress progress={task.progress} />{canManage ? <div className="flex shrink-0 gap-1"><button type="button" onClick={() => onEditTask(task)} className="inline-flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-600" title="Edit task"><Pencil className="size-4" /></button><button type="button" onClick={() => onDeleteTask(task)} className="inline-flex size-8 items-center justify-center rounded-full bg-red-50 text-red-600" title="Delete task"><Trash2 className="size-4" /></button></div> : null}</div>
            </div>
            <div className="hidden grid-cols-12 items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0 md:grid"><div className="col-span-2 font-medium text-gray-800">{task.activity || task.taskName}</div><div className="col-span-2 text-gray-600">{task.targetMilestone || "-"}</div><div className="col-span-2 text-gray-600">{taskBudget(task) ? formatCurrency(taskBudget(task)) : "-"}</div><div className="col-span-2 text-gray-600">{task.deadline || "-"}</div><div className="col-span-1"><span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-700">{task.priority || "medium"}</span></div><div className="col-span-1"><TaskProgress progress={task.progress} /></div><div className="col-span-2"><div className="flex justify-end gap-2">{canManage ? <><button type="button" onClick={() => onEditTask(task)} className="inline-flex size-8 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50" title="Edit task"><Pencil className="size-4" /></button><button type="button" onClick={() => onDeleteTask(task)} className="inline-flex size-8 items-center justify-center rounded-full text-red-600 hover:bg-red-50" title="Delete task"><Trash2 className="size-4" /></button></> : null}</div></div></div>
          </div>
        )) : <div className="px-4 py-6 text-center text-sm text-gray-500">No tasks created yet.{canManage ? " Use the green plus button to add one." : ""}</div>}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3"><div><p className="text-xs uppercase tracking-wide text-gray-500">Total estimated amount</p><p className="text-sm text-gray-500">For this action plan only</p></div><div className="text-right"><p className="text-xs uppercase tracking-wide text-gray-500">Budget</p><p className="text-lg font-bold text-gray-800">{formatCurrency(totalBudget)}</p></div></div>
    </article>
  );
}

function PlanActionsMenu({ plan, canManage, onAddTask, onImportResult, onExport, onView, onEdit, onDelete }: {
  plan: DepartmentActionPlan;
  canManage: boolean;
  onAddTask: () => void;
  onImportResult: (result: ActionPlanTaskImportActionResult) => void;
  onExport: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 min-w-28 items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
      >
        Action
        <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          {canManage ? <MenuButton icon={<Plus className="size-4 text-green-600" />} label="Create task" onClick={() => choose(onAddTask)} /> : null}
          {canManage ? (
            <ActionPlanTaskTemplateButtons
              planId={plan.id}
              onResult={onImportResult}
              onAction={() => setOpen(false)}
              showLabels
              buttonClassName={menuItemClass}
            />
          ) : null}
          <MenuButton icon={<Download className="size-4 text-indigo-600" />} label="Export tasks" onClick={() => choose(onExport)} />
          <MenuButton icon={<CalendarDays className="size-4 text-purple-600" />} label="View timeline" onClick={() => choose(onView)} />
          {canManage ? <MenuButton icon={<Pencil className="size-4 text-blue-600" />} label="Edit action plan" onClick={() => choose(onEdit)} /> : null}
          {canManage ? <div className="my-1 border-t border-gray-100" /> : null}
          {canManage ? <MenuButton icon={<Trash2 className="size-4 text-red-600" />} label="Delete action plan" danger onClick={() => choose(onDelete)} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuButton({ icon, label, danger = false, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return <button type="button" role="menuitem" onClick={onClick} className={`${menuItemClass} ${danger ? "text-red-700 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}>{icon}<span>{label}</span></button>;
}

function PlanDetailsModal({ plan, onClose }: { plan: DepartmentActionPlan; onClose: () => void }) {
  const timeline = useMemo(() => buildTimeline(plan), [plan]);

  return (
    <Modal title={plan.title} onClose={onClose} width="max-w-7xl">
      <div className="p-4 sm:p-5">
        <ActionPlanTimeline plan={plan} timeline={timeline} />
      </div>
    </Modal>
  );
}

type TimelineMonth = {
  key: string;
  label: string;
  left: number;
  width: number;
};

type TimelineModel = {
  start: Date;
  end: Date;
  totalDays: number;
  chartWidth: number;
  months: TimelineMonth[];
  todayPosition: number | null;
};

function ActionPlanTimeline({ plan, timeline }: { plan: DepartmentActionPlan; timeline: TimelineModel | null }) {
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [activityWidth, setActivityWidth] = useState<number | null>(null);
  const orderedTasks = [...plan.tasks].sort(compareTasksByStartDate);

  if (!orderedTasks.length) return <EmptyPlanTasks />;
  if (!timeline) return <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">Add plan or task dates to build the timeline.</div>;

  const minimumChartWidth = timeline.chartWidth;
  const defaultActivityWidthCss = `min(420px, max(220px, calc(100% - ${minimumChartWidth}px)))`;
  const activityWidthCss = activityWidth === null ? defaultActivityWidthCss : `${activityWidth}px`;
  const chartWidthCss = activityWidth === null ? `max(${minimumChartWidth}px, calc(100% - ${defaultActivityWidthCss}))` : `max(${minimumChartWidth}px, calc(100% - ${activityWidth}px))`;
  const contentWidthCss = activityWidth === null ? `max(100%, ${220 + minimumChartWidth}px)` : `max(100%, ${activityWidth + minimumChartWidth}px)`;

  function resizeActivityColumn(clientX: number) {
    const container = timelineContainerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const maximum = Math.max(220, bounds.width - 280);
    setActivityWidth(Math.min(maximum, Math.max(180, clientX - bounds.left)));
  }

  function startResize(event: ReactPointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeActivityColumn(event.clientX);
  }

  function continueResize(event: ReactPointerEvent<HTMLSpanElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) resizeActivityColumn(event.clientX);
  }

  function stopResize(event: ReactPointerEvent<HTMLSpanElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function resizeWithKeyboard(event: ReactKeyboardEvent<HTMLSpanElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const container = timelineContainerRef.current;
    if (!container) return;
    const currentWidth = activityWidth ?? Math.min(420, Math.max(220, container.clientWidth - minimumChartWidth));
    const maximum = Math.max(220, container.clientWidth - 280);
    const nextWidth = currentWidth + (event.key === "ArrowRight" ? 20 : -20);
    setActivityWidth(Math.min(maximum, Math.max(180, nextWidth)));
  }

  const resizeHandleProps = { onPointerDown: startResize, onPointerMove: continueResize, onPointerUp: stopResize, onPointerCancel: stopResize, onKeyDown: resizeWithKeyboard };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
        <TimelineLegend color="bg-blue-600" label="In progress" />
        <TimelineLegend color="bg-emerald-600" label="Completed" />
        <TimelineLegend color="bg-rose-600" label="Overdue" />
        <TimelineLegend color="bg-amber-500" label="Not started" />
        <span className="text-gray-400">A diamond marks a task without a start date.</span>
      </div>

      <div className="space-y-3 md:hidden">
        {orderedTasks.map((task) => <TimelineTaskCard key={task.id} task={task} />)}
      </div>

      <div ref={timelineContainerRef} className="hidden max-h-[calc(92vh-150px)] overflow-auto rounded-xl border border-gray-200 bg-white md:block">
        <div style={{ width: contentWidthCss }}>
          <div className="sticky top-0 z-40 flex border-b border-gray-200 bg-gray-50">
            <div className="sticky left-0 z-40 flex shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-gray-500 shadow-[5px_0_10px_-8px_rgba(15,23,42,0.45)]" style={{ width: activityWidthCss }}>Activity<ActivityResizeHandle {...resizeHandleProps} /></div>
            <div className="relative flex h-12 shrink-0" style={{ width: chartWidthCss }}>
              {timeline.months.map((month) => <div key={month.key} className="flex shrink-0 items-center justify-center border-r border-gray-200 px-1 text-[10px] font-semibold text-gray-600" style={{ width: `${month.width}%` }}>{month.label}</div>)}
              {timeline.todayPosition !== null ? <div className="absolute inset-y-0 z-10 w-px bg-rose-500" style={{ left: `${timeline.todayPosition}%` }}><span className="absolute left-1 top-1 text-[9px] font-bold uppercase text-rose-600">Today</span></div> : null}
            </div>
          </div>

          {orderedTasks.map((task) => <TimelineRow key={task.id} task={task} timeline={timeline} activityWidth={activityWidthCss} chartWidth={chartWidthCss} resizeHandleProps={resizeHandleProps} />)}
        </div>
      </div>
    </div>
  );
}

type ActivityResizeHandleProps = {
  onPointerDown: (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLSpanElement>) => void;
};

function ActivityResizeHandle(props: ActivityResizeHandleProps) {
  return (
    <span
      role="separator"
      aria-label="Resize activity column"
      aria-orientation="vertical"
      tabIndex={0}
      title="Drag to resize the activity column"
      className="group absolute -right-1 top-0 z-50 flex h-full w-2 touch-none cursor-col-resize items-center justify-center outline-none"
      {...props}
    >
      <span className="h-full w-px bg-gray-200 transition group-hover:w-0.5 group-hover:bg-blue-500 group-focus:w-0.5 group-focus:bg-blue-500" aria-hidden="true" />
    </span>
  );
}

function TimelineRow({ task, timeline, activityWidth, chartWidth, resizeHandleProps }: { task: DepartmentActionPlanTask; timeline: TimelineModel; activityWidth: string; chartWidth: string; resizeHandleProps: ActivityResizeHandleProps }) {
  const placement = taskPlacement(task, timeline);
  const tone = taskTimelineTone(task);
  const label = task.activity || task.taskName;

  return (
    <div className="flex min-h-12 border-b border-gray-100 last:border-b-0">
      <div className="sticky left-0 z-30 flex shrink-0 flex-col justify-center border-r border-gray-200 bg-white px-3 py-2 shadow-[5px_0_10px_-8px_rgba(15,23,42,0.45)]" style={{ width: activityWidth }}>
        <p className="truncate text-sm font-semibold text-gray-800" title={label}>{label}</p>
        <ActivityResizeHandle {...resizeHandleProps} />
      </div>
      <div className="relative h-12 shrink-0 bg-white" style={{ width: chartWidth }}>
        {timeline.months.map((month) => <span key={month.key} className="absolute inset-y-0 border-r border-gray-100" style={{ left: `${month.left + month.width}%` }} />)}
        {timeline.todayPosition !== null ? <span className="absolute inset-y-0 z-10 w-px bg-rose-300" style={{ left: `${timeline.todayPosition}%` }} /> : null}
        {placement ? (
          <div
            className={`absolute top-1/2 z-20 -translate-y-1/2 overflow-hidden border shadow-sm ${placement.point ? `size-4 rotate-45 rounded-sm ${tone.track}` : `h-7 rounded-full ${tone.track}`}`}
            style={{ left: `${placement.left}%`, width: placement.point ? undefined : `max(${placement.width}%, 20px)`, transform: placement.point ? "translate(-50%, -50%) rotate(45deg)" : undefined }}
            title={timelineTaskTitle(task)}
            aria-label={timelineTaskTitle(task)}
          >
            {!placement.point ? <><span className={`absolute inset-y-0 left-0 ${tone.fill}`} style={{ width: `${clampProgress(task.progress)}%` }} /><span className="relative z-10 block truncate px-3 py-1 text-[11px] font-semibold text-gray-800">{task.progress}%</span></> : null}
          </div>
        ) : <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs italic text-gray-400">No task dates</span>}
      </div>
    </div>
  );
}

function TimelineTaskCard({ task }: { task: DepartmentActionPlanTask }) {
  const tone = taskTimelineTone(task);
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">{task.activity || task.taskName}</h3>
        <span className={`size-2.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500"><span>Start: {task.startDate || "Not set"}</span><span>Deadline: {task.deadline || "Not set"}</span></div>
      <div className="mt-3"><TaskProgress progress={task.progress} /></div>
    </article>
  );
}

function EmptyPlanTasks() {
  return <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center"><CalendarDays className="mx-auto size-9 text-gray-300" aria-hidden="true" /><p className="mt-2 text-sm font-medium text-gray-600">No tasks created yet.</p></div>;
}

function TimelineLegend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${color}`} aria-hidden="true" />{label}</span>;
}

function Modal({ title, onClose, width = "max-w-2xl", children }: { title: string; onClose: () => void; width?: string; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4"><button type="button" className="absolute inset-0" onClick={onClose} aria-label="Close dialog" /><section role="dialog" aria-modal="true" aria-labelledby="department-plan-modal-title" className={`relative max-h-[92vh] w-full ${width} overflow-y-auto rounded-xl bg-white shadow-2xl`}><div className="flex items-center justify-between border-b px-5 py-4"><h2 id="department-plan-modal-title" className="text-lg font-bold text-gray-900">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close"><X className="size-5" /></button></div>{children}</section></div>;
}

function ModalActions({ pending, onCancel, submitLabel }: { pending: boolean; onCancel: () => void; submitLabel: string }) {
  return <div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" onClick={onCancel} className="h-9 rounded-lg border border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={pending} className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{pending ? "Saving..." : submitLabel}</button></div>;
}

function SummaryCard({ label, mobileLabel, value, tone }: { label: string; mobileLabel: string; value: number; tone: "red" | "amber" | "blue" }) {
  const colors = tone === "red" ? "border-red-100 bg-red-50 text-red-700" : tone === "amber" ? "border-amber-100 bg-amber-50 text-amber-700" : "border-blue-100 bg-blue-50 text-blue-700";
  return <div className={`rounded-lg border p-3 text-center sm:p-4 ${colors}`}><p className="text-xl font-bold sm:text-2xl">{value}</p><p className="mt-1 hidden text-xs font-medium sm:block">{label}</p><p className="mt-1 text-[11px] font-medium sm:hidden">{mobileLabel}</p></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-gray-100 bg-white px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p><p className="mt-0.5 font-semibold text-gray-800">{value}</p></div>;
}

function TaskProgress({ progress }: { progress: number }) {
  return <div className="min-w-0 flex-1"><div className="mb-1 flex items-center justify-between text-[11px] text-gray-500"><span>Progress</span><span className="font-semibold">{progress}%</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-gray-200"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(progress, 100)}%` }} /></div></div>;
}

function exportTasks(plan: DepartmentActionPlan) {
  const rows = [["No.", "Activity", "Target / Milestone", "Estimated Budget (RWF)", "Start Date", "Deadline", "Priority", "Progress", "Status"], ...plan.tasks.map((task, index) => [index + 1, task.activity || task.taskName, task.targetMilestone || "", taskBudget(task), taskStartRaw(task), taskDeadlineRaw(task), task.priority, task.progress, statusLabel(task.status)])];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${plan.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "action-plan"}-tasks.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const DAY_IN_MS = 86_400_000;

function buildTimeline(plan: DepartmentActionPlan): TimelineModel | null {
  const planStart = parseDateKey(planStartRaw(plan));
  const planEnd = parseDateKey(planDueRaw(plan));
  const taskDates = plan.tasks.flatMap((task) => [parseDateKey(taskStartRaw(task)), parseDateKey(taskDeadlineRaw(task))]).filter((date): date is Date => date !== null);
  const dates = [planStart, planEnd, ...taskDates].filter((date): date is Date => date !== null);
  if (!dates.length) return null;

  const firstDate = new Date(Math.min(...dates.map((date) => date.getTime())));
  const lastDate = new Date(Math.max(...dates.map((date) => date.getTime())));
  const start = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), 1));
  const end = new Date(Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth() + 1, 0));
  const totalDays = daysBetween(start, end) + 1;
  const months: TimelineMonth[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))) {
    const nextMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const days = daysBetween(cursor, nextMonth);
    months.push({
      key: cursor.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(cursor),
      left: percentage(daysBetween(start, cursor), totalDays),
      width: percentage(days, totalDays),
    });
  }

  const today = parseDateKey(currentKigaliDateKey());
  const todayPosition = today && today >= start && today <= end ? percentage(daysBetween(start, today), totalDays) : null;
  return {
    start,
    end,
    totalDays,
    chartWidth: Math.max(480, months.length * 56),
    months,
    todayPosition,
  };
}

function taskPlacement(task: DepartmentActionPlanTask, timeline: TimelineModel) {
  const start = parseDateKey(taskStartRaw(task));
  const end = parseDateKey(taskDeadlineRaw(task));
  if (!start && !end) return null;
  if (!start || !end) {
    const pointDate = start ?? end!;
    return { left: clampPercentage(percentage(daysBetween(timeline.start, pointDate), timeline.totalDays)), width: 0, point: true };
  }
  const first = start <= end ? start : end;
  const last = start <= end ? end : start;
  return {
    left: clampPercentage(percentage(daysBetween(timeline.start, first), timeline.totalDays)),
    width: Math.max(0, percentage(daysBetween(first, last) + 1, timeline.totalDays)),
    point: false,
  };
}

function taskTimelineTone(task: DepartmentActionPlanTask) {
  const completed = task.progress >= 100 || normalizeStatus(task.status) === "completed";
  const overdue = Boolean(taskDeadlineRaw(task) && taskDeadlineRaw(task) < currentKigaliDateKey() && !completed);
  if (completed) return { track: "border-emerald-300 bg-emerald-100", fill: "bg-emerald-500", dot: "bg-emerald-600" };
  if (overdue) return { track: "border-rose-300 bg-rose-100", fill: "bg-rose-500", dot: "bg-rose-600" };
  if (task.progress > 0 || normalizeStatus(task.status) === "in_progress") return { track: "border-blue-300 bg-blue-100", fill: "bg-blue-500", dot: "bg-blue-600" };
  return { track: "border-amber-300 bg-amber-100", fill: "bg-amber-400", dot: "bg-amber-500" };
}

function compareTasksByStartDate(first: DepartmentActionPlanTask, second: DepartmentActionPlanTask) {
  const firstStart = taskStartRaw(first) || taskDeadlineRaw(first) || "9999-12-31";
  const secondStart = taskStartRaw(second) || taskDeadlineRaw(second) || "9999-12-31";
  return firstStart.localeCompare(secondStart)
    || (taskDeadlineRaw(first) || "9999-12-31").localeCompare(taskDeadlineRaw(second) || "9999-12-31")
    || (first.activity || first.taskName).localeCompare(second.activity || second.taskName);
}

function timelineTaskTitle(task: DepartmentActionPlanTask) {
  const start = task.startDate || "Start date not set";
  const deadline = task.deadline || "Deadline not set";
  return `${task.activity || task.taskName} · ${start} – ${deadline} · ${clampProgress(task.progress)}% complete`;
}

function parseDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function currentKigaliDateKey() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Africa/Kigali", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function daysBetween(start: Date, end: Date) { return Math.round((end.getTime() - start.getTime()) / DAY_IN_MS); }
function percentage(value: number, total: number) { return total > 0 ? (value / total) * 100 : 0; }
function clampPercentage(value: number) { return Math.min(100, Math.max(0, value)); }
function clampProgress(value: number) { return Math.min(100, Math.max(0, value)); }

function planStartRaw(plan: DepartmentActionPlan) { return plan.startDateRaw ?? plan.startDateValue ?? ""; }
function planDueRaw(plan: DepartmentActionPlan) { return plan.dueDateRaw ?? plan.dueDateValue ?? ""; }
function taskStartRaw(task: DepartmentActionPlanTask) { return task.startDateRaw ?? task.startDateValue ?? ""; }
function taskDeadlineRaw(task: DepartmentActionPlanTask) { return task.deadlineRaw ?? task.deadlineValue ?? ""; }
function taskBudget(task: DepartmentActionPlanTask) { const value = Number(task.estimatedBudget); return Number.isFinite(value) ? value : 0; }
function normalizeStatus(value: string) { return value.replace(/-/g, "_").toLowerCase(); }
function statusLabel(value: string) { return normalizeStatus(value).split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function statusBadge(value: string) { const status = normalizeStatus(value); return status === "completed" ? "bg-green-100 text-green-800" : status === "in_progress" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"; }
function formatCurrency(value: number) { return `RWF ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }

const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const menuItemClass = "flex w-full items-center justify-start gap-3 px-4 py-2.5 text-left text-sm font-medium transition hover:bg-gray-50";
