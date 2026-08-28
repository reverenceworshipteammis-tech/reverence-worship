"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Eye,
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
          <p className="mt-1 text-sm text-gray-500">Create plans first, then add and manage their tasks separately.</p>
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
          <MenuButton icon={<Eye className="size-4 text-purple-600" />} label="View action plan" onClick={() => choose(onView)} />
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
  const totalBudget = plan.tasks.reduce((sum, task) => sum + taskBudget(task), 0);
  return <Modal title={plan.title} onClose={onClose} width="max-w-4xl"><div className="space-y-5 p-5"><div className="grid gap-3 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-4"><Metric label="Start" value={plan.startDate} /><Metric label="Completion" value={plan.dueDate} /><Metric label="Progress" value={`${plan.progress}%`} /><Metric label="Total budget" value={formatCurrency(totalBudget)} /></div>{plan.description ? <p className="text-sm leading-6 text-gray-600">{plan.description}</p> : null}<div className="overflow-x-auto rounded-lg border"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-3 py-3">Activity</th><th className="px-3 py-3">Milestone</th><th className="px-3 py-3">Deadline</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Progress</th><th className="px-3 py-3">Budget</th></tr></thead><tbody className="divide-y">{plan.tasks.length ? plan.tasks.map((task) => <tr key={task.id}><td className="px-3 py-3 font-medium">{task.activity || task.taskName}</td><td className="px-3 py-3 text-gray-600">{task.targetMilestone || "-"}</td><td className="px-3 py-3 text-gray-600">{task.deadline || "-"}</td><td className="px-3 py-3 capitalize text-gray-600">{task.priority}</td><td className="px-3 py-3 text-gray-600">{task.progress}%</td><td className="px-3 py-3 text-gray-600">{formatCurrency(taskBudget(task))}</td></tr>) : <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">No tasks created yet.</td></tr>}</tbody></table></div></div></Modal>;
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
