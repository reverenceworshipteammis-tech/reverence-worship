"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, DollarSign, Eye, Plus, Search, Trash2, Users, X } from "lucide-react";
import {
  completeParentTask,
  createParentTask,
  deleteParentTask,
  toggleParentSubtask,
  updateParentTask,
} from "@/app/admin/parent/actions";
import { MobileTabScroller } from "@/components/mobile-tab-scroller";

type ChildRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  location: string;
  createdAt: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  province: string;
  district: string;
  sector: string;
  village: string;
  occupation: string;
  membershipType: string;
  ministryRole: string;
  emergencyName: string;
  emergencyPhone: string;
};

type TaskRow = {
  id: number;
  title: string;
  description: string | null;
  dueDate: string;
  status: string;
  progress: number;
  subtasks: Array<{ id: number; title: string; isCompleted: boolean }>;
};

type ContributionRow = {
  childId: number;
  childName: string;
  email: string;
  annualAmount: number;
  totalPaid: number;
  progress: number;
  terms: Array<{ term: number; target: number; paid: number }>;
};

type ParentDashboardClientProps = {
  accessDenied?: boolean;
  parentName: string;
  familyName: string | null;
  childRows: ChildRow[];
  tasks: TaskRow[];
  contributions: ContributionRow[];
};

type ParentTab = "children" | "tasks" | "contributions";

const parentTabs = [
  { id: "children", label: "My Children", icon: Users },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "contributions", label: "Contributions", icon: DollarSign },
] as const;

function rwf(value: number) {
  return `RWF ${Math.round(value).toLocaleString()}`;
}

function statusBadge(progress: number) {
  if (progress >= 100) return "bg-green-100 text-green-700";
  if (progress >= 75) return "bg-blue-100 text-blue-700";
  if (progress >= 50) return "bg-yellow-100 text-yellow-700";
  if (progress > 0) return "bg-orange-100 text-orange-700";
  return "bg-gray-100 text-gray-500";
}

export function ParentDashboardClient({ accessDenied, parentName, familyName, childRows, tasks, contributions }: ParentDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<ParentTab>("children");
  const [selectedChild, setSelectedChild] = useState<ChildRow | null>(null);
  const [taskModal, setTaskModal] = useState<TaskRow | "new" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatus, setTaskStatus] = useState("all");
  const [contributionSearch, setContributionSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchesStatus = taskStatus === "all" || task.status === taskStatus;
    const normalized = taskSearch.trim().toLowerCase();
    const matchesSearch = !normalized || [task.title, task.description ?? ""].some((value) => value.toLowerCase().includes(normalized));
    return matchesStatus && matchesSearch;
  }), [tasks, taskSearch, taskStatus]);

  const filteredContributions = useMemo(() => {
    const normalized = contributionSearch.trim().toLowerCase();
    return contributions.filter((item) => !normalized || item.childName.toLowerCase().includes(normalized) || item.email.toLowerCase().includes(normalized));
  }, [contributions, contributionSearch]);

  const totals = useMemo(() => filteredContributions.reduce((acc, item) => ({
    expected: acc.expected + item.annualAmount,
    collected: acc.collected + item.totalPaid,
  }), { expected: 0, collected: 0 }), [filteredContributions]);

  function submitTask(formData: FormData) {
    startTransition(async () => {
      const result = taskModal === "new" ? await createParentTask(formData) : await updateParentTask(formData);
      setMessage({ ok: result.ok, text: result.message ?? "" });
      if (result.ok) setTaskModal(null);
    });
  }

  function runTaskAction(action: (formData: FormData) => Promise<{ ok: boolean; message?: string }>, taskId: number) {
    const formData = new FormData();
    formData.set("taskId", String(taskId));
    startTransition(async () => {
      const result = await action(formData);
      setMessage({ ok: result.ok, text: result.message ?? "" });
    });
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-7xl px-3 py-4">
        <div className="rounded-xl border-l-4 border-red-500 bg-red-50 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="size-6 text-red-600" aria-hidden />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-700">Access Denied</h3>
              <p className="text-sm text-red-600">You are not associated with any family as a parent. Please contact an administrator.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 py-4 sm:px-4 sm:py-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-lg sm:p-6">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 sm:size-16 sm:rounded-full">
            <Users className="size-7" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-lg font-bold leading-tight sm:text-2xl">Parent, {parentName}</h1>
            <p className="mt-1 break-words text-sm text-blue-100">Family: {familyName}</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${message.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          <span className="flex items-center gap-2">{message.ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}{message.text}</span>
          <button type="button" onClick={() => setMessage(null)}><X className="size-4" /></button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-3 md:hidden">
          <MobileTabScroller tabs={parentTabs} value={activeTab} onChange={(tab) => setActiveTab(tab as ParentTab)} />
        </div>
        <nav className="-mb-px hidden gap-1 overflow-x-auto border-b border-gray-200 px-2 sm:px-0 md:flex">
          {parentTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium sm:px-6 ${activeTab === id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 sm:p-6">
          {activeTab === "children" && (
            <ChildrenTab childRows={childRows} onView={setSelectedChild} />
          )}

          {activeTab === "tasks" && (
            <section>
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <h3 className="text-lg font-semibold text-gray-800">Family Tasks</h3>
                <button type="button" onClick={() => setTaskModal("new")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
                  <Plus className="size-4" /> Add Task
                </button>
              </div>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Search tasks..." className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-3 text-sm focus:ring-2 focus:ring-purple-500" />
                </div>
                <select value={taskStatus} onChange={(event) => setTaskStatus(event.target.value)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <TaskCard key={task.id} task={task} pending={pending} onEdit={setTaskModal} onComplete={(id) => runTaskAction(completeParentTask, id)} onDelete={(id) => runTaskAction(deleteParentTask, id)} onToggle={(subtaskId) => {
                    const formData = new FormData();
                    formData.set("subtaskId", String(subtaskId));
                    startTransition(async () => {
                      await toggleParentSubtask(formData);
                    });
                  }} />
                ))}
                {filteredTasks.length === 0 && <div className="rounded-2xl border border-dashed border-gray-200 py-8 text-center text-gray-500">No tasks found</div>}
              </div>
            </section>
          )}

          {activeTab === "contributions" && (
            <ContributionsTab contributions={filteredContributions} search={contributionSearch} setSearch={setContributionSearch} totals={totals} />
          )}
        </div>
      </div>

      {selectedChild && <ChildModal child={selectedChild} onClose={() => setSelectedChild(null)} />}
      {taskModal && <TaskModal task={taskModal} pending={pending} onClose={() => setTaskModal(null)} action={submitTask} />}
    </div>
  );
}

function ChildrenTab({ childRows, onView }: { childRows: ChildRow[]; onView: (child: ChildRow) => void }) {
  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-gray-800">My Children</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {childRows.map((child) => (
          <article key={child.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900">{child.name}</h4>
                <p className="truncate text-xs text-gray-500">{child.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs capitalize text-blue-700">{child.role}</span>
                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs capitalize text-gray-600">{child.membershipType}</span>
                </div>
              </div>
              <button type="button" onClick={() => onView(child)} className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700" aria-label="View child details">
                <Eye className="size-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-2 rounded-xl bg-gray-50 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Phone</span>
                <strong className="text-right text-gray-800">{child.phone || "N/A"}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Residence</span>
                <strong className="text-right text-gray-800">{child.location}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Occupation</span>
                <strong className="text-right text-gray-800">{child.occupation}</strong>
              </div>
            </div>
          </article>
        ))}
        {childRows.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-gray-200 py-8 text-center text-gray-500">No children found in your family.</div>}
      </div>
    </section>
  );
}

function TaskCard({ task, pending, onEdit, onComplete, onDelete, onToggle }: { task: TaskRow; pending: boolean; onEdit: (task: TaskRow) => void; onComplete: (id: number) => void; onDelete: (id: number) => void; onToggle: (id: number) => void }) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-bold text-gray-900">{task.title}</h4>
          {task.description && <p className="mt-1 text-sm text-gray-500">{task.description}</p>}
          <p className="mt-1 text-xs text-gray-400">{task.dueDate ? `Due ${task.dueDate}` : "No due date"}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onEdit(task)} disabled={pending} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Edit</button>
          <button type="button" onClick={() => onComplete(task.id)} disabled={pending || task.status === "completed"} className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">Complete</button>
          <button type="button" onClick={() => onDelete(task.id)} disabled={pending} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"><Trash2 className="size-4" /></button>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500"><span>Progress</span><span>{task.progress}%</span></div>
        <div className="mt-2 h-2 rounded-full bg-gray-200"><div className="h-2 rounded-full bg-purple-600" style={{ width: `${Math.min(task.progress, 100)}%` }} /></div>
      </div>
      <div className="mt-3 grid gap-2">
        {task.subtasks.map((subtask) => (
          <label key={subtask.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <input type="checkbox" checked={subtask.isCompleted} onChange={() => onToggle(subtask.id)} className="rounded border-gray-300 text-purple-600" />
            <span className={subtask.isCompleted ? "text-gray-400 line-through" : "text-gray-700"}>{subtask.title}</span>
          </label>
        ))}
      </div>
    </article>
  );
}

function ContributionsTab({ contributions, search, setSearch, totals }: { contributions: ContributionRow[]; search: string; setSearch: (value: string) => void; totals: { expected: number; collected: number } }) {
  const rate = totals.expected > 0 ? Math.round((totals.collected / totals.expected) * 1000) / 10 : 0;
  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-gray-800">Children&apos;s Contributions</h3>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Summary label="Total Expected" value={rwf(totals.expected)} className="bg-blue-50 text-blue-600" />
        <Summary label="Total Collected" value={rwf(totals.collected)} className="bg-green-50 text-green-600" />
        <Summary label="Collection Rate" value={`${rate}%`} className="bg-purple-50 text-purple-600" />
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by child's name..." className="w-full rounded-xl border border-gray-300 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Child</th>
              {[1, 2, 3].map((term) => <th key={term} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Term {term}</th>)}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Total Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contributions.map((item) => (
              <tr key={item.childId} className="hover:bg-gray-50">
                <td className="px-4 py-3"><p className="font-medium text-gray-800">{item.childName}</p><p className="text-xs text-gray-500">{item.email}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs ${statusBadge(item.progress)}`}>{item.progress >= 100 ? "Completed" : item.progress > 0 ? "In Progress" : "Not Started"}</span></td>
                {item.terms.map((term) => <td key={term.term} className="px-4 py-3 text-sm"><p><span className="text-gray-500">To pay:</span> <strong>{rwf(term.target)}</strong></p><p><span className="text-gray-500">Paid:</span> <strong className="text-green-700">{rwf(term.paid)}</strong></p></td>)}
                <td className="px-4 py-3 text-sm"><strong className="text-purple-600">{rwf(item.totalPaid)}</strong><span className="text-gray-400"> / {rwf(item.annualAmount)}</span><p className="text-xs text-gray-500">{item.progress}% complete</p></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {contributions.map((item) => (
          <article key={item.childId} className="rounded-2xl border border-gray-200 p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.childName}</p><p className="text-xs text-gray-500">{item.email}</p></div><span className={`rounded-full px-2.5 py-1 text-xs ${statusBadge(item.progress)}`}>{item.progress}%</span></div>
            <div className="mt-3 rounded-xl bg-purple-50 px-3 py-2 text-sm"><strong className="text-purple-700">Paid {rwf(item.totalPaid)}</strong><span className="text-gray-400"> / {rwf(item.annualAmount)}</span></div>
            <div className="mt-3 rounded-xl border border-gray-100 px-2">{item.terms.map((term) => <div key={term.term} className="grid grid-cols-[4.5rem_1fr_1fr] gap-2 border-t border-gray-100 py-2 first:border-t-0"><strong>Term {term.term}</strong><span>{rwf(term.target)}</span><span className="text-right text-green-700">{rwf(term.paid)}</span></div>)}</div>
          </article>
        ))}
      </div>
      {contributions.length === 0 && <div className="rounded-2xl border border-dashed border-gray-200 py-8 text-center text-gray-500">No contributions found</div>}
    </section>
  );
}

function Summary({ label, value, className }: { label: string; value: string; className: string }) {
  return <div className={`rounded-2xl p-4 ${className}`}><p className="text-sm text-gray-600">{label}</p><p className="text-2xl font-bold">{value}</p></div>;
}

function ChildModal({ child, onClose }: { child: ChildRow; onClose: () => void }) {
  const detailGroups = [
    {
      title: "Contact",
      items: [["Email", child.email], ["Phone", child.phone || "N/A"], ["Emergency Name", child.emergencyName], ["Emergency Phone", child.emergencyPhone]],
    },
    {
      title: "Personal Details",
      items: [["Gender", child.gender], ["Date of Birth", child.dateOfBirth || "N/A"], ["Marital Status", child.maritalStatus], ["Occupation", child.occupation]],
    },
    {
      title: "Residence",
      items: [["Province", child.province], ["District", child.district], ["Sector", child.sector], ["Village", child.village]],
    },
    {
      title: "Membership",
      items: [["Family Role", child.role], ["Membership Type", child.membershipType], ["Ministry Role", child.ministryRole], ["Member Since", child.createdAt]],
    },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b pb-4"><h3 className="text-xl font-bold text-gray-800">{child.name} - Details</h3><button onClick={onClose}><X className="size-5" /></button></div>
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-900">Residence</p>
          <p className="mt-1 text-sm text-blue-800">{child.location}</p>
        </div>
        <div className="mt-4 grid gap-4">
          {detailGroups.map((group) => (
            <section key={group.title} className="rounded-xl border border-gray-100">
              <h4 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-800">{group.title}</h4>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {group.items.map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="break-words font-medium text-gray-800">{value || "N/A"}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="mt-5 flex justify-end border-t pt-4"><button onClick={onClose} className="rounded-lg bg-blue-600 px-5 py-2 text-sm text-white">Close</button></div>
      </div>
    </div>
  );
}

function TaskModal({ task, pending, onClose, action }: { task: TaskRow | "new"; pending: boolean; onClose: () => void; action: (formData: FormData) => void }) {
  const subtasks = task === "new" ? [""] : task.subtasks.map((subtask) => subtask.title);
  const [items, setItems] = useState(subtasks.length ? subtasks : [""]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b pb-4"><h3 className="text-xl font-bold text-gray-800">{task === "new" ? "Add New Task" : "Edit Task"}</h3><button onClick={onClose}><X className="size-5" /></button></div>
        <form action={action} className="mt-4 space-y-4">
          {task !== "new" && <input type="hidden" name="taskId" value={task.id} />}
          <input name="title" defaultValue={task === "new" ? "" : task.title} required placeholder="Task Title *" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500" />
          <textarea name="description" defaultValue={task === "new" ? "" : task.description ?? ""} rows={3} placeholder="Description" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500" />
          <input name="dueDate" defaultValue={task === "new" ? "" : task.dueDate} type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500" />
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Subtasks</label>
            <div className="space-y-2">
              {items.map((item, index) => <div key={index} className="flex gap-2"><input name="subtasks" defaultValue={item} required placeholder="Enter subtask..." className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500" /><button type="button" onClick={() => setItems((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current)} className="text-red-500"><X className="size-4" /></button></div>)}
            </div>
            <button type="button" onClick={() => setItems((current) => [...current, ""])} className="mt-2 text-sm font-semibold text-purple-600">+ Add Another Subtask</button>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={pending} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white">{pending ? "Saving..." : task === "new" ? "Create Task" : "Update Task"}</button></div>
        </form>
      </div>
    </div>
  );
}
