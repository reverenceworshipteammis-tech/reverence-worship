"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Filter,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  assignUserToSocialFamily,
  createSocialActionPlan,
  createSocialFamily,
  createSocialTask,
  deleteSocialActionPlan,
  deleteSocialFamily,
  deleteSocialTask,
  removeUserFromSocialFamily,
  toggleSocialActionPlanTask,
  toggleSocialSubtask,
  updateSocialActionPlan,
  updateSocialTask,
} from "@/app/admin/social-fellowship/actions";
import { MobileTabDropdown } from "@/components/mobile-tab-dropdown";

type FamilyMember = {
  id: number;
  role: string;
  status: string;
  joinedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
};

type SocialFamily = {
  id: number;
  name: string;
  parentName: string | null;
  description: string | null;
  motto: string | null;
  createdAt: string;
  membersCount: number;
  members: FamilyMember[];
};

type AvailableUser = {
  id: number;
  name: string;
  email: string;
};

type SocialUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  village: string | null;
  familyId: number | null;
  familyName: string | null;
  familyYear: number | null;
  role: string | null;
  isAssignedInYear: boolean;
};

type SocialTask = {
  id: number;
  title: string;
  description: string | null;
  familyId: number;
  familyName: string;
  dueDate: string | null;
  dueDateValue: string;
  status: string;
  progress: number;
  createdAt: string;
  subtasks: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    completedAt: string | null;
  }>;
};

type SocialActionPlanTask = {
  id: number;
  taskName: string;
  activity: string | null;
  targetMilestone: string | null;
  estimatedBudget: string;
  startDate: string | null;
  startDateValue: string;
  deadline: string | null;
  deadlineValue: string;
  priority: string;
  progress: number;
  status: string;
  assigneeId: number | null;
  assigneeName: string | null;
};

type SocialActionPlan = {
  id: number;
  title: string;
  description: string | null;
  familyId: number | null;
  familyName: string | null;
  startDate: string;
  startDateValue: string;
  dueDate: string;
  dueDateValue: string;
  status: string;
  priority: string;
  progress: number;
  createdAt: string;
  tasks: SocialActionPlanTask[];
};

type ActionPlanTaskDraft = {
  taskName: string;
  activity: string;
  targetMilestone: string;
  estimatedBudget: string;
  startDate: string;
  deadline: string;
  priority: string;
  progress: number;
  assignedTo: string;
};

type SocialNotice = {
  ok: boolean;
  message: string;
};

type ConfirmAction = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  action: () => Promise<{ ok: boolean; message: string }>;
};

function emptyActionPlanTask(): ActionPlanTaskDraft {
  return {
    taskName: "",
    activity: "",
    targetMilestone: "",
    estimatedBudget: "",
    startDate: "",
    deadline: "",
    priority: "medium",
    progress: 0,
    assignedTo: "",
  };
}

export function SocialFellowshipClient({
  selectedYear,
  families,
  availableUsers,
  users,
  tasks,
  actionPlans,
}: {
  selectedYear: number;
  families: SocialFamily[];
  availableUsers: AvailableUser[];
  users: SocialUser[];
  tasks: SocialTask[];
  actionPlans: SocialActionPlan[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("families");
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskFamilyFilter, setTaskFamilyFilter] = useState("all");
  const [taskDueFilter, setTaskDueFilter] = useState("all");
  const [actionPlanStatusFilter, setActionPlanStatusFilter] = useState("all");
  const [actionPlanFamilyFilter, setActionPlanFamilyFilter] = useState("all");
  const [actionPlanPriorityFilter, setActionPlanPriorityFilter] = useState("all");
  const [notice, setNotice] = useState<SocialNotice | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [modal, setModal] = useState<null | "family" | "members" | "assign" | "task" | "viewTask" | "actionPlan" | "viewActionPlan">(null);
  const [viewingFamily, setViewingFamily] = useState<SocialFamily | null>(null);
  const [viewingTask, setViewingTask] = useState<SocialTask | null>(null);
  const [editingTask, setEditingTask] = useState<SocialTask | null>(null);
  const [taskSubtasks, setTaskSubtasks] = useState<string[]>([""]);
  const [viewingActionPlan, setViewingActionPlan] = useState<SocialActionPlan | null>(null);
  const [editingActionPlan, setEditingActionPlan] = useState<SocialActionPlan | null>(null);
  const [actionPlanTasks, setActionPlanTasks] = useState<ActionPlanTaskDraft[]>([emptyActionPlanTask()]);
  const [assigningUser, setAssigningUser] = useState<SocialUser | null>(null);
  const [parentSearch, setParentSearch] = useState("");
  const [selectedParent, setSelectedParent] = useState<AvailableUser | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredFamilies = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return families;
    return families.filter((family) =>
      [family.name, family.parentName, family.description, family.motto]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [families, search]);

  const filteredParents = useMemo(() => {
    const normalized = parentSearch.trim().toLowerCase();
    if (!normalized) return availableUsers;
    return availableUsers.filter((user) => [user.name, user.email].some((value) => value.toLowerCase().includes(normalized)));
  }, [availableUsers, parentSearch]);

  const filteredUsers = useMemo(() => {
    const normalized = userSearch.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.name, user.email, user.familyName, user.province, user.district, user.sector]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [users, userSearch]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesStatus = taskStatusFilter === "all" || task.status === taskStatusFilter;
      const matchesFamily = taskFamilyFilter === "all" || String(task.familyId) === taskFamilyFilter;
      let matchesDue = true;
      if (taskDueFilter !== "all") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = task.dueDateValue ? new Date(`${task.dueDateValue}T00:00:00`) : null;
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);
        if (taskDueFilter === "today") matchesDue = Boolean(due && due.getTime() === today.getTime());
        if (taskDueFilter === "tomorrow") matchesDue = Boolean(due && due.getTime() === tomorrow.getTime());
        if (taskDueFilter === "week") matchesDue = Boolean(due && due >= today && due <= weekEnd);
        if (taskDueFilter === "overdue") matchesDue = Boolean(due && due < today && task.status !== "completed");
      }
      return matchesStatus && matchesFamily && matchesDue;
    });
  }, [tasks, taskStatusFilter, taskFamilyFilter, taskDueFilter]);

  const filteredActionPlans = useMemo(() => {
    return actionPlans.filter((plan) => {
      const matchesStatus = actionPlanStatusFilter === "all" || plan.status === actionPlanStatusFilter;
      const matchesFamily = actionPlanFamilyFilter === "all" || String(plan.familyId ?? "none") === actionPlanFamilyFilter;
      const matchesPriority = actionPlanPriorityFilter === "all" || plan.priority === actionPlanPriorityFilter;
      return matchesStatus && matchesFamily && matchesPriority;
    });
  }, [actionPlans, actionPlanStatusFilter, actionPlanFamilyFilter, actionPlanPriorityFilter]);

  function changeYear(year: number) {
    router.push(`/admin/social-fellowship?year=${year}`);
  }

  function runAction(action: () => Promise<{ ok: boolean; message: string }>, close?: () => void) {
    startTransition(async () => {
      const result = await action();
      setNotice(result);
      if (result.ok) {
        close?.();
        router.refresh();
      }
    });
  }

  function executeConfirm() {
    if (!confirmAction) return;
    runAction(confirmAction.action, () => setConfirmAction(null));
  }

  function askConfirm(confirm: ConfirmAction) {
    setConfirmAction(confirm);
  }

  function confirmDeleteTask(task: SocialTask) {
    askConfirm({
      title: "Delete Task",
      message: `Delete "${task.title}" and all of its subtasks? This action cannot be undone.`,
      confirmLabel: "Delete Task",
      action: () => deleteSocialTask(task.id),
    });
  }

  function confirmDeleteActionPlan(plan: SocialActionPlan) {
    askConfirm({
      title: "Delete Action Plan",
      message: `Delete "${plan.title}" and all of its tasks? This action cannot be undone.`,
      confirmLabel: "Delete Plan",
      action: () => deleteSocialActionPlan(plan.id),
    });
  }

  function confirmDeleteFamily(family: SocialFamily) {
    askConfirm({
      title: "Delete Family",
      message: `Delete "${family.name}" from Social Fellowship? This will remove the family record for this year.`,
      confirmLabel: "Delete Family",
      action: () => deleteSocialFamily(family.id),
    });
  }

  function confirmRemoveUser(user: SocialUser) {
    if (!user.familyId) return;
    askConfirm({
      title: "Remove User",
      message: `Remove ${user.name} from ${user.familyName ?? "this family"} for ${selectedYear}?`,
      confirmLabel: "Remove User",
      action: () => removeUserFromSocialFamily(user.id, user.familyId!),
    });
  }

  function submitFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (selectedParent) {
      formData.set("parentId", String(selectedParent.id));
      formData.set("parentName", selectedParent.name);
    }
    runAction(() => createSocialFamily(formData), () => {
      setModal(null);
      setSelectedParent(null);
      setParentSearch("");
      form.reset();
    });
  }

  function submitAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigningUser) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("userId", String(assigningUser.id));
    runAction(() => assignUserToSocialFamily(formData), () => {
      setModal(null);
      setAssigningUser(null);
      form.reset();
    });
  }

  function openTaskModal(task?: SocialTask) {
    setEditingTask(task ?? null);
    setTaskSubtasks(task?.subtasks.map((subtask) => subtask.title) ?? [""]);
    setModal("task");
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.delete("subtasks");
    taskSubtasks.forEach((subtask) => {
      if (subtask.trim()) formData.append("subtasks", subtask.trim());
    });
    runAction(() => editingTask ? updateSocialTask(editingTask.id, formData) : createSocialTask(formData), () => {
      setModal(null);
      setEditingTask(null);
      setTaskSubtasks([""]);
      form.reset();
    });
  }

  function openActionPlanModal(plan?: SocialActionPlan) {
    setEditingActionPlan(plan ?? null);
    setActionPlanTasks(
      plan?.tasks.length
        ? plan.tasks.map((task) => ({
            taskName: task.taskName,
            activity: task.activity ?? "",
            targetMilestone: task.targetMilestone ?? "",
            estimatedBudget: task.estimatedBudget === "0" ? "" : task.estimatedBudget,
            startDate: task.startDateValue,
            deadline: task.deadlineValue,
            priority: task.priority,
            progress: task.progress,
            assignedTo: task.assigneeId ? String(task.assigneeId) : "",
          }))
        : [emptyActionPlanTask()],
    );
    setModal("actionPlan");
  }

  function submitActionPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("year", String(selectedYear));
    formData.set("tasksJson", JSON.stringify(actionPlanTasks));
    runAction(() => editingActionPlan ? updateSocialActionPlan(editingActionPlan.id, formData) : createSocialActionPlan(formData), () => {
      setModal(null);
      setEditingActionPlan(null);
      setActionPlanTasks([emptyActionPlanTask()]);
      form.reset();
    });
  }

  const tabs = [
    { id: "families", label: "Families", icon: Users },
    { id: "users", label: "Users", icon: UserRound },
    { id: "tasks", label: "Tasks", icon: ClipboardList },
    { id: "actionPlans", label: "Action Plans", icon: ClipboardList },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 py-4 sm:px-4 sm:py-6">
      <div className="relative z-10 overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-3 md:hidden">
          <MobileTabDropdown tabs={tabs} value={activeTab} onChange={setActiveTab} tone="gray" />
        </div>
        <nav className="hidden flex-wrap border-b border-gray-200 md:flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition ${
                  selected ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {notice ? <SocialNoticeBanner notice={notice} onClose={() => setNotice(null)} /> : null}

      {activeTab === "tasks" ? (
        <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Family Tasks</h1>
             
            </div>
            <button
              type="button"
              onClick={() => openTaskModal()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus className="size-4" aria-hidden="true" />
              New Task
            </button>
          </div>

          <div className="mb-6 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Due Date</label>
              <select value={taskDueFilter} onChange={(event) => setTaskDueFilter(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="all">All Tasks</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">This Week</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
              <select value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Family</label>
              <select value={taskFamilyFilter} onChange={(event) => setTaskFamilyFilter(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="all">All Families</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setTaskDueFilter("all");
                setTaskStatusFilter("all");
                setTaskFamilyFilter("all");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
            >
              <Filter className="size-4" />
              Reset
            </button>
          </div>

          <div className="space-y-3">
            {filteredTasks.length ? (
              filteredTasks.map((task) => {
                const total = task.subtasks.length;
                const completed = task.subtasks.filter((subtask) => subtask.isCompleted).length;
                const statusText = task.progress === 100 ? "Completed" : task.progress > 0 ? "In Progress" : "Pending";
                const statusClass = task.progress === 100 ? "bg-green-100 text-green-700" : task.progress > 0 ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700";
                return (
                  <article key={task.id} className="rounded-xl border border-gray-200 p-4 transition hover:shadow-md">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-gray-800">{task.title}</h2>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass}`}>{statusText}</span>
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="size-3.5" />
                              Due: {task.dueDate}
                            </span>
                          )}
                        </div>
                        {task.description && <p className="mt-1 text-sm text-gray-600">{task.description}</p>}
                        {task.subtasks.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {task.subtasks.map((subtask) => (
                              <button
                                key={subtask.id}
                                type="button"
                                onClick={() => runAction(() => toggleSocialSubtask(subtask.id))}
                                className="flex items-center gap-2 text-sm"
                              >
                                {subtask.isCompleted ? <CheckCircle2 className="size-4 text-green-500" /> : <span className="size-4 rounded-full border border-gray-300" />}
                                <span className={subtask.isCompleted ? "text-gray-400 line-through" : "text-gray-700"}>{subtask.title}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="mt-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-full max-w-xs rounded-full bg-gray-200">
                              <div className="h-2 rounded-full bg-green-600" style={{ width: `${task.progress}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{task.progress}%</span>
                            {total > 0 && <span className="text-xs text-gray-400">{completed}/{total} subtasks done</span>}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          <Users className="mr-1 inline size-3.5" />
                          {task.familyName}
                        </div>
                      </div>
                      <div className="flex gap-2 sm:ml-4">
                        <button type="button" onClick={() => { setViewingTask(task); setModal("viewTask"); }} className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:text-gray-900" title="View">
                          <Eye className="size-4" />
                        </button>
                        <button type="button" onClick={() => openTaskModal(task)} className="rounded-lg border border-gray-200 px-3 py-2 text-gray-500 hover:text-blue-600" title="Edit">
                          <FileText className="size-4" />
                        </button>
                        <button type="button" onClick={() => confirmDeleteTask(task)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-500 hover:text-red-600" title="Delete">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
                <ClipboardList className="mx-auto mb-3 size-12 text-gray-300" />
                <p className="text-gray-500">No tasks yet</p>
                <button type="button" onClick={() => openTaskModal()} className="mt-3 text-sm text-blue-600 hover:text-blue-700">
                  Create your first task
                </button>
              </div>
            )}
          </div>
        </section>
      ) : activeTab === "actionPlans" ? (
        <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Action Plans</h1>
              
            </div>
            <button
              type="button"
              onClick={() => openActionPlanModal()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900"
            >
              <Plus className="size-4" aria-hidden="true" />
              Create New Action Plan
            </button>
          </div>

          <div className="mb-6 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
              <select value={actionPlanStatusFilter} onChange={(event) => setActionPlanStatusFilter(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Family</label>
              <select value={actionPlanFamilyFilter} onChange={(event) => setActionPlanFamilyFilter(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="all">All Families</option>
                <option value="none">No Family</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Priority</label>
              <select value={actionPlanPriorityFilter} onChange={(event) => setActionPlanPriorityFilter(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionPlanStatusFilter("all");
                setActionPlanFamilyFilter("all");
                setActionPlanPriorityFilter("all");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
            >
              <Filter className="size-4" />
              Reset
            </button>
          </div>

          <div className="space-y-4">
            {filteredActionPlans.length ? (
              filteredActionPlans.map((plan) => {
                const completed = plan.tasks.filter((task) => task.progress >= 100).length;
                const statusClass = plan.progress === 100 ? "bg-green-100 text-green-700" : plan.progress > 0 ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700";
                return (
                  <article key={plan.id} className="rounded-xl border border-gray-200 p-4 transition hover:shadow-md">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-gray-900">{plan.title}</h2>
                          <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusClass}`}>{plan.status.replace("-", " ")}</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">{plan.priority}</span>
                        </div>
                        {plan.description && <p className="mt-2 text-sm text-gray-600">{plan.description}</p>}
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="size-3.5" />
                            {plan.startDate} - {plan.dueDate}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5" />
                            {plan.familyName ?? "All families"}
                          </span>
                          <span>{completed}/{plan.tasks.length} tasks completed</span>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-full max-w-sm rounded-full bg-gray-200">
                              <div className="h-2 rounded-full bg-blue-700" style={{ width: `${plan.progress}%` }} />
                            </div>
                            <span className="text-xs font-medium text-gray-500">{plan.progress}%</span>
                          </div>
                        </div>
                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                              <tr className="text-left text-xs uppercase text-gray-400">
                                <th className="py-2 pr-3 font-medium">Task</th>
                                <th className="py-2 pr-3 font-medium">Milestone</th>
                                <th className="py-2 pr-3 font-medium">Deadline</th>
                                <th className="py-2 pr-3 font-medium">Progress</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {plan.tasks.slice(0, 3).map((task) => (
                                <tr key={task.id}>
                                  <td className="py-2 pr-3">
                                    <button type="button" onClick={() => runAction(() => toggleSocialActionPlanTask(task.id))} className="flex items-center gap-2 text-left">
                                      {task.progress >= 100 ? <CheckCircle2 className="size-4 text-green-500" /> : <span className="size-4 rounded-full border border-gray-300" />}
                                      <span className={task.progress >= 100 ? "text-gray-400 line-through" : "text-gray-700"}>{task.taskName}</span>
                                    </button>
                                  </td>
                                  <td className="py-2 pr-3 text-gray-500">{task.targetMilestone || "-"}</td>
                                  <td className="py-2 pr-3 text-gray-500">{task.deadline || "-"}</td>
                                  <td className="py-2 pr-3 text-gray-500">{task.progress}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {plan.tasks.length > 3 && <p className="mt-2 text-xs text-gray-400">+{plan.tasks.length - 3} more tasks</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setViewingActionPlan(plan); setModal("viewActionPlan"); }} className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:text-gray-900" title="View">
                          <Eye className="size-4" />
                        </button>
                        <button type="button" onClick={() => openActionPlanModal(plan)} className="rounded-lg border border-gray-200 px-3 py-2 text-gray-500 hover:text-blue-600" title="Edit">
                          <FileText className="size-4" />
                        </button>
                        <button type="button" onClick={() => confirmDeleteActionPlan(plan)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-500 hover:text-red-600" title="Delete">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
                <ClipboardList className="mx-auto mb-3 size-12 text-gray-300" />
                <p className="text-gray-500">No action plans found</p>
                <button type="button" onClick={() => openActionPlanModal()} className="mt-3 text-sm text-blue-600 hover:text-blue-700">
                  Create your first action plan
                </button>
              </div>
            )}
          </div>
        </section>
      ) : activeTab === "users" ? (
        <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Users</h1>
              <p className="mt-0.5 text-xs text-gray-400">Showing users for year: {selectedYear}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                Year:
                <select
                  value={selectedYear}
                  onChange={(event) => changeYear(Number(event.target.value))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {Array.from({ length: 9 }, (_, index) => new Date().getFullYear() - 4 + index).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <label className="relative mb-6 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search by name, email, or family..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
            />
          </label>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Family</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Residence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="transition hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <UserIdentity user={user} />
                    </td>
                    <td className="px-4 py-3">
                      {user.isAssignedInYear && user.familyName ? (
                        <div>
                          <p className="text-sm font-medium text-gray-800">{user.familyName}</p>
                          <p className="text-xs text-gray-500">Role: <span className="font-medium capitalize">{user.role ?? "member"}</span></p>
                          <p className="text-xs text-gray-400">Year: {user.familyYear ?? selectedYear}</p>
                        </div>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">Unassigned in {selectedYear}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{[user.province, user.district, user.sector].filter(Boolean).join(", ") || "Not specified"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">Active</span>
                    </td>
                    <td className="px-4 py-3">
                      {user.isAssignedInYear && user.familyId ? (
                        <button
                          type="button"
                          onClick={() => confirmRemoveUser(user)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"
                          title={`Remove from family in ${selectedYear}`}
                        >
                          <UserMinus className="size-4" />
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAssigningUser(user);
                            setModal("assign");
                          }}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          title={`Assign to family in ${selectedYear}`}
                        >
                          <UserPlus className="size-4" />
                          Assign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <UserIdentity user={user} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">Active</span>
                  {user.isAssignedInYear && user.familyName ? (
                    <>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">{user.familyName}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 capitalize">{user.role ?? "member"}</span>
                    </>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">Unassigned in {selectedYear}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">{[user.province, user.district, user.sector].filter(Boolean).join(", ") || "Not specified"}</p>
                <div className="mt-4">
                  {user.isAssignedInYear && user.familyId ? (
                    <button type="button" onClick={() => confirmRemoveUser(user)} className="w-full rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAssigningUser(user);
                        setModal("assign");
                      }}
                      className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                    >
                      Assign
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : activeTab !== "families" ? (
        <div className="rounded-xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <ClipboardList className="mx-auto mb-3 size-10 text-gray-300" aria-hidden="true" />
          <h2 className="text-lg font-bold text-gray-900">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
          <p className="mt-1 text-sm text-gray-500">We will build this tab next.</p>
        </div>
      ) : (
        <section className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Families</h1>
              <p className="mt-0.5 text-xs text-gray-400">Showing families for year: {selectedYear}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                Year:
                <select
                  value={selectedYear}
                  onChange={(event) => changeYear(Number(event.target.value))}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {Array.from({ length: 9 }, (_, index) => new Date().getFullYear() - 4 + index).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setModal("family")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add Family
              </button>
            </div>
          </div>

          <label className="relative mb-6 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search families..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFamilies.length ? (
              filteredFamilies.map((family) => (
                <article key={family.id} className="rounded-xl border border-gray-200 p-4 transition hover:shadow-lg">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h2 className="text-lg font-bold text-gray-800">{family.name}</h2>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{family.membersCount} members</span>
                  </div>
                  {family.parentName && (
                    <p className="mb-1 flex items-center gap-1 text-sm text-gray-500">
                      <UserCheck className="size-4" aria-hidden="true" />
                      Parent: {family.parentName}
                    </p>
                  )}
                  {family.description && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{family.description}</p>}
                  {family.motto && <p className="mt-2 text-xs font-medium italic text-gray-400">{family.motto}</p>}
                  <div className="mt-3 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="size-3.5" aria-hidden="true" />
                      {family.createdAt}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingFamily(family);
                          setModal("members");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <Eye className="size-4" aria-hidden="true" />
                        View Members
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteFamily(family)}
                        className="inline-flex items-center rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600 hover:text-red-700"
                        aria-label="Delete family"
                        title="Delete family"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <Users className="mx-auto mb-3 size-12 text-gray-300" aria-hidden="true" />
                <p className="font-medium text-gray-500">No families found</p>
                <p className="mt-1 text-sm text-gray-400">Click Add Family to create your first family</p>
              </div>
            )}
          </div>
        </section>
      )}

      {modal === "family" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-white p-4 shadow-lg sm:p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-800">Add New Family</h2>
              <button type="button" onClick={() => setModal(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={submitFamily} className="mt-4 space-y-3">
              <input type="hidden" name="year" value={selectedYear} />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Family Name *</label>
                <input name="name" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100" />
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <Calendar className="mr-2 inline size-4 text-gray-400" aria-hidden="true" />
                Year: <strong>{selectedYear}</strong>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Search Parent</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input
                    value={parentSearch}
                    onChange={(event) => setParentSearch(event.target.value)}
                    placeholder="Search for a parent by name or email..."
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Select Parent</label>
                <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-300 bg-white">
                  {filteredParents.length ? (
                    filteredParents.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedParent(user)}
                        className={`flex w-full items-center gap-3 border-b px-4 py-2 text-left transition hover:bg-gray-100 ${
                          selectedParent?.id === user.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <span className="flex size-8 items-center justify-center rounded-full bg-gray-200">
                          <UserRound className="size-4 text-gray-500" aria-hidden="true" />
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-gray-800">{user.name}</span>
                          <span className="text-xs text-gray-500">{user.email}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-4 py-6 text-center text-sm text-gray-500">No available users found</p>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">Only users not already in a family are shown</p>
              </div>
              {selectedParent && (
                <div className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
                  Selected parent: <strong>{selectedParent.name}</strong>
                  <button type="button" onClick={() => setSelectedParent(null)} className="float-right text-red-500 hover:text-red-700">
                    Clear
                  </button>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Motto</label>
                <input name="motto" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100" />
              </div>
              <div className="flex flex-col-reverse gap-3 border-t pt-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm">
                  Cancel
                </button>
                <button disabled={isPending} className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:opacity-60">
                  {isPending ? "Saving..." : "Save Family"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "members" && viewingFamily && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3 sm:p-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{viewingFamily.name}</h2>
                <p className="text-sm text-gray-500">{viewingFamily.membersCount} members</p>
              </div>
              <button type="button" onClick={() => setModal(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="divide-y">
              {viewingFamily.members.length ? (
                viewingFamily.members.map((member) => (
                  <div key={member.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{member.user.name}</p>
                      <p className="text-sm text-gray-500">{member.user.email}</p>
                      {member.user.phone && <p className="text-xs text-gray-400">{member.user.phone}</p>}
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{member.role}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-gray-500">No members in this family yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {modal === "assign" && assigningUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border bg-white p-4 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">Assign to Family</h2>
              <button type="button" onClick={() => setModal(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-blue-50 p-4">
              <UserIdentity user={assigningUser} />
            </div>
            <form onSubmit={submitAssign} className="mt-4 space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <Calendar className="mr-2 inline size-4 text-gray-400" aria-hidden="true" />
                Year: <strong>{selectedYear}</strong>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Select Family *</label>
                <select
                  name="familyId"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                >
                  <option value="">Select a family</option>
                  {families.map((family) => (
                    <option key={family.id} value={family.id}>
                      {family.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                <select
                  name="role"
                  defaultValue="member"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                >
                  <option value="member">Member</option>
                  <option value="parent">Parent</option>
                  <option value="secretary">Secretary</option>
                  <option value="coordinator">Coordinator</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 border-t pt-4">
                <button type="button" onClick={() => setModal(null)} className="rounded-lg bg-gray-100 px-5 py-2 text-sm text-gray-700 hover:bg-gray-200">
                  Cancel
                </button>
                <button disabled={isPending} className="rounded-lg bg-blue-800 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
                  {isPending ? "Assigning..." : "Assign to Family"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "task" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-white p-4 shadow-lg sm:p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-800">{editingTask ? "Edit Task" : "Create New Task"}</h2>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setEditingTask(null);
                  setTaskSubtasks([""]);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={submitTask} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Task Title *</label>
                <input
                  name="title"
                  required
                  defaultValue={editingTask?.title ?? ""}
                  placeholder="Enter task title"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Family *</label>
                  <select
                    name="familyId"
                    required
                    defaultValue={editingTask?.familyId ?? ""}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  >
                    <option value="">Select family</option>
                    {families.map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={editingTask?.dueDateValue ?? ""}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingTask?.description ?? ""}
                  placeholder="Write task details"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-gray-700">Subtasks *</label>
                  <button
                    type="button"
                    onClick={() => setTaskSubtasks((current) => [...current, ""])}
                    className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <Plus className="size-3.5" />
                    Add Subtask
                  </button>
                </div>
                <div className="space-y-2">
                  {taskSubtasks.map((subtask, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        name="subtasks"
                        value={subtask}
                        onChange={(event) =>
                          setTaskSubtasks((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                        }
                        placeholder={`Subtask ${index + 1}`}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => setTaskSubtasks((current) => (current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current))}
                        disabled={taskSubtasks.length === 1}
                        className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Remove subtask"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModal(null);
                    setEditingTask(null);
                    setTaskSubtasks([""]);
                  }}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button disabled={isPending} className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:opacity-60">
                  {isPending ? "Saving..." : editingTask ? "Update Task" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "viewTask" && viewingTask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3 sm:p-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-white shadow-lg">
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{viewingTask.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{viewingTask.familyName}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setViewingTask(null);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-5 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">Status</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-gray-800">{viewingTask.status.replace("-", " ")}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">Progress</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{viewingTask.progress}%</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">Due Date</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{viewingTask.dueDate ?? "No due date"}</p>
                </div>
              </div>
              {viewingTask.description && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-gray-800">Description</h3>
                  <p className="text-sm text-gray-600">{viewingTask.description}</p>
                </div>
              )}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-800">Subtasks</h3>
                <div className="space-y-2">
                  {viewingTask.subtasks.length ? (
                    viewingTask.subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                        <div className="flex items-center gap-2">
                          {subtask.isCompleted ? <CheckCircle2 className="size-4 text-green-500" /> : <span className="size-4 rounded-full border border-gray-300" />}
                          <span className={subtask.isCompleted ? "text-sm text-gray-400 line-through" : "text-sm text-gray-700"}>{subtask.title}</span>
                        </div>
                        {subtask.completedAt && <span className="text-xs text-gray-400">{subtask.completedAt}</span>}
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">No subtasks added.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setViewingTask(null);
                  openTaskModal(viewingTask);
                }}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
              >
                Edit Task
              </button>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setViewingTask(null);
                }}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "actionPlan" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg border bg-white p-4 shadow-lg sm:p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-800">{editingActionPlan ? "Edit Action Plan" : "Create Action Plan"}</h2>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setEditingActionPlan(null);
                  setActionPlanTasks([emptyActionPlanTask()]);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={submitActionPlan} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Action Plan Name *</label>
                <input
                  name="title"
                  required
                  defaultValue={editingActionPlan?.title ?? ""}
                  placeholder="Enter action plan name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Family</label>
                  <select
                    name="familyId"
                    defaultValue={editingActionPlan?.familyId ?? ""}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  >
                    <option value="">All families</option>
                    {families.map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Date *</label>
                  <input
                    name="startDate"
                    type="date"
                    required
                    defaultValue={editingActionPlan?.startDateValue ?? ""}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Due Date *</label>
                  <input
                    name="dueDate"
                    type="date"
                    required
                    defaultValue={editingActionPlan?.dueDateValue ?? ""}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                  <select name="priority" defaultValue={editingActionPlan?.priority ?? "medium"} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingActionPlan?.description ?? ""}
                  placeholder="Optional description"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                />
              </div>

              <div>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="block text-sm font-medium text-gray-700">Action Plan Tasks *</label>
                  <button
                    type="button"
                    onClick={() => setActionPlanTasks((current) => [...current, emptyActionPlanTask()])}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    <Plus className="size-3.5" />
                    Add Task
                  </button>
                </div>
                <div className="space-y-3">
                  {actionPlanTasks.map((task, index) => (
                    <div key={index} className="rounded-lg border border-gray-200 p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-800">Task {index + 1}</p>
                        <button
                          type="button"
                          onClick={() => setActionPlanTasks((current) => (current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current))}
                          disabled={actionPlanTasks.length === 1}
                          className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Remove action plan task"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-3">
                        <input
                          value={task.taskName}
                          onChange={(event) => setActionPlanTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, taskName: event.target.value } : item))}
                          required
                          placeholder="Task name"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                        />
                        <input
                          value={task.activity}
                          onChange={(event) => setActionPlanTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, activity: event.target.value } : item))}
                          placeholder="Activity"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                        />
                        <input
                          value={task.targetMilestone}
                          onChange={(event) => setActionPlanTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, targetMilestone: event.target.value } : item))}
                          placeholder="Target milestone"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                        />
                        <input
                          value={task.estimatedBudget}
                          onChange={(event) => setActionPlanTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, estimatedBudget: event.target.value } : item))}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Estimated budget"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                        />
                        <input
                          value={task.startDate}
                          onChange={(event) => setActionPlanTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, startDate: event.target.value } : item))}
                          type="date"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                        />
                        <input
                          value={task.deadline}
                          onChange={(event) => setActionPlanTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, deadline: event.target.value } : item))}
                          type="date"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                        />
                        <select
                          value={task.priority}
                          onChange={(event) => setActionPlanTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, priority: event.target.value } : item))}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <select
                          value={task.assignedTo}
                          onChange={(event) => setActionPlanTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, assignedTo: event.target.value } : item))}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 focus:ring-4 focus:ring-gray-100"
                        >
                          <option value="">Unassigned</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600">
                          Progress
                          <input
                            value={task.progress}
                            onChange={(event) => setActionPlanTasks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, progress: Number(event.target.value) } : item))}
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            className="min-w-0 flex-1"
                          />
                          <span className="w-9 text-right text-xs">{task.progress}%</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModal(null);
                    setEditingActionPlan(null);
                    setActionPlanTasks([emptyActionPlanTask()]);
                  }}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button disabled={isPending} className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:opacity-60">
                  {isPending ? "Saving..." : editingActionPlan ? "Update Action Plan" : "Create Action Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "viewActionPlan" && viewingActionPlan && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3 sm:p-6">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border bg-white shadow-lg">
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{viewingActionPlan.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{viewingActionPlan.familyName ?? "All families"} - {viewingActionPlan.startDate} - {viewingActionPlan.dueDate}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setViewingActionPlan(null);
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-5 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">Status</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-gray-800">{viewingActionPlan.status.replace("-", " ")}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">Priority</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-gray-800">{viewingActionPlan.priority}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">Progress</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{viewingActionPlan.progress}%</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">Tasks</p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">{viewingActionPlan.tasks.length}</p>
                </div>
              </div>
              {viewingActionPlan.description && (
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-gray-800">Description</h3>
                  <p className="text-sm text-gray-600">{viewingActionPlan.description}</p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Task</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Activity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Milestone</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Owner</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Budget</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Deadline</th>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewingActionPlan.tasks.map((task) => (
                      <tr key={task.id}>
                        <td className="px-3 py-2 font-medium text-gray-800">{task.taskName}</td>
                        <td className="px-3 py-2 text-gray-600">{task.activity || "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{task.targetMilestone || "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{task.assigneeName || "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{Number(task.estimatedBudget).toLocaleString()}</td>
                        <td className="px-3 py-2 text-gray-600">{task.deadline || "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{task.progress}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setViewingActionPlan(null);
                  openActionPlanModal(viewingActionPlan);
                }}
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
              >
                Edit Action Plan
              </button>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setViewingActionPlan(null);
                }}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction ? (
        <SocialConfirmModal
          confirm={confirmAction}
          pending={isPending}
          onCancel={() => setConfirmAction(null)}
          onConfirm={executeConfirm}
        />
      ) : null}
    </div>
  );
}

function SocialNoticeBanner({ notice, onClose }: { notice: SocialNotice; onClose: () => void }) {
  const Icon = notice.ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
        notice.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
      }`}
      role="status"
    >
      <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${notice.ok ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{notice.ok ? "Success" : "Notice"}</p>
        <p className="mt-0.5 leading-5">{notice.message}</p>
      </div>
      <button type="button" onClick={onClose} className="rounded-lg p-1 text-current opacity-60 transition hover:bg-white/70 hover:opacity-100" aria-label="Close notice">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function SocialConfirmModal({
  confirm,
  pending,
  onCancel,
  onConfirm,
}: {
  confirm: ConfirmAction;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const danger = confirm.tone !== "primary";

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className={`flex items-center gap-3 px-5 py-4 ${danger ? "bg-red-50" : "bg-blue-50"}`}>
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${danger ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
            {danger ? <AlertTriangle className="size-5" aria-hidden="true" /> : <CheckCircle2 className="size-5" aria-hidden="true" />}
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">{confirm.title}</h2>
            <p className="text-xs text-gray-500">Social Fellowship DPT</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-600">{confirm.message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-4">
          <button type="button" onClick={onCancel} disabled={pending} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
            {pending ? "Please wait..." : confirm.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserIdentity({ user }: { user: SocialUser }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-600">
        <span className="text-sm font-bold text-white">{user.name.slice(0, 2).toUpperCase()}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
        <p className="truncate text-xs text-gray-500">{user.email}</p>
      </div>
    </div>
  );
}
