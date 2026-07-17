"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  FileText,
  ListChecks,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  deleteIntercessionActionPlan,
  deleteIntercessionActionPlanTask,
  deleteSpiritualForm,
  duplicateSpiritualForm,
  saveIntercessionActionPlan,
  saveIntercessionActionPlanTask,
  toggleSpiritualFormPublish,
} from "@/app/admin/intercession/actions";
import { MobileTabScroller } from "@/components/mobile-tab-scroller";
import { bibleBooks, bibleVersions } from "@/lib/bible-data";

type Question = {
  type: string;
  label: string;
  required: boolean;
  options: string[];
};

type SpiritualForm = {
  id: number;
  title: string;
  description: string | null;
  questions: Question[];
  questionCount: number;
  isPublished: boolean;
  limitOneResponse: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  submissionsCount: number;
  hasSubmitted: boolean;
};

type FormSubmission = {
  id: number;
  formId: number;
  formTitle: string;
  formDescription: string | null;
  questionCount: number;
  submittedAt: string;
  score: number | null;
};

type ReportRow = {
  id: number;
  name: string;
  email: string;
  submissions: Array<{
    formId: number;
    score: number | null;
    submittedAt: string;
  }>;
  submitted: number;
  totalForms: number;
  participation: number;
  averageScore: number | null;
  latestSubmittedAt: string | null;
  status: string;
};

type IntercessionActionPlanTask = {
  id: number;
  actionPlanId: number;
  taskName: string;
  activity: string | null;
  targetMilestone: string | null;
  estimatedBudget: number;
  startDate: string;
  startDateRaw: string;
  deadline: string;
  deadlineRaw: string;
  priority: string;
  progress: number;
  status: string;
};

type IntercessionActionPlan = {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  startDateRaw: string;
  dueDate: string;
  dueDateRaw: string;
  status: string;
  progress: number;
  year: number;
  createdByName: string;
  createdAt: string;
  tasks: IntercessionActionPlanTask[];
};

type IntercessionNotice = {
  ok: boolean;
  message: string;
};

type IntercessionPermissions = {
  canSubmitForms: boolean;
  canCreateForms: boolean;
  canManageForms: boolean;
  canEditForms: boolean;
  canPublishForms: boolean;
  canDeleteForms: boolean;
  canViewSubmissions: boolean;
  canViewReports: boolean;
  canExportReports: boolean;
  canReadBible: boolean;
  canManageActionPlans: boolean;
};

type ConfirmAction = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  action: () => Promise<{ ok: boolean; message: string }>;
};

type ShareTarget = Pick<SpiritualForm, "id" | "title" | "description">;

type BibleVerse = {
  number: number;
  text: string;
};

type BibleChapter = {
  version: {
    key: string;
    code: string;
    label: string;
  };
  reference: string;
  verses: BibleVerse[];
};

type BibleResult = {
  book: string;
  chapter: number;
  primary: BibleChapter;
  compare: BibleChapter | null;
};

type Section = "available" | "results" | "manage" | "reports";

export function IntercessionClient({
  initialTab,
  showDepartmentNavigation,
  permissions,
  forms,
  mySubmissions,
  reportRows,
  actionPlans,
}: {
  initialTab: "forms" | "bible";
  showDepartmentNavigation: boolean;
  permissions: IntercessionPermissions;
  forms: SpiritualForm[];
  mySubmissions: FormSubmission[];
  reportRows: ReportRow[];
  actionPlans: IntercessionActionPlan[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [section, setSection] = useState<Section>("available");
  const [query, setQuery] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");
  const [actionPlanSearch, setActionPlanSearch] = useState("");
  const [actionPlanStatus, setActionPlanStatus] = useState("all");
  const [planModal, setPlanModal] = useState<IntercessionActionPlan | "new" | null>(null);
  const [taskModal, setTaskModal] = useState<{ plan: IntercessionActionPlan; task?: IntercessionActionPlanTask } | null>(null);
  const [viewPlan, setViewPlan] = useState<IntercessionActionPlan | null>(null);
  const [notice, setNotice] = useState<IntercessionNotice | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [reportDetail, setReportDetail] = useState<ReportRow | null>(null);
  const [todayValue] = useState(() => new Date().toISOString().slice(0, 10));
  const [weekValue] = useState(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();

  const reportForms = forms.filter((form) => form.isPublished && form.isActive);
  const publishedForms = permissions.canSubmitForms ? reportForms : [];
  const filteredForms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return forms;
    return forms.filter((form) =>
      [form.title, form.description, form.createdBy].filter(Boolean).some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [forms, query]);

  const filteredReportRows = useMemo(() => {
    const normalized = reportSearch.trim().toLowerCase();
    return reportRows.filter((row) => {
      const matchesStatus = reportStatus === "all" || row.status === reportStatus;
      const matchesSearch = !normalized || [row.name, row.email].some((value) => value.toLowerCase().includes(normalized));
      const matchesFrom = !reportDateFrom || (row.latestSubmittedAt !== null && row.latestSubmittedAt >= reportDateFrom);
      const matchesTo = !reportDateTo || (row.latestSubmittedAt !== null && row.latestSubmittedAt <= reportDateTo);

      if (row.status === "Not Started" && (reportDateFrom || reportDateTo)) {
        return matchesStatus && matchesSearch && false;
      }

      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });
  }, [reportRows, reportSearch, reportStatus, reportDateFrom, reportDateTo]);

  const reportSummary = useMemo(() => {
    return {
      total: filteredReportRows.length,
      complete: filteredReportRows.filter((row) => row.status === "Complete").length,
      partial: filteredReportRows.filter((row) => row.status === "Partial").length,
      notStarted: filteredReportRows.filter((row) => row.status === "Not Started").length,
    };
  }, [filteredReportRows]);

  const filteredActionPlans = useMemo(() => {
    const normalized = actionPlanSearch.trim().toLowerCase();
    return actionPlans.filter((plan) => {
      const matchesSearch = !normalized || `${plan.title} ${plan.description ?? ""} ${plan.createdByName}`.toLowerCase().includes(normalized);
      const matchesStatus = actionPlanStatus === "all" || plan.status === actionPlanStatus;
      return matchesSearch && matchesStatus;
    });
  }, [actionPlans, actionPlanSearch, actionPlanStatus]);

  const actionPlanSummary = useMemo(() => {
    const tasks = actionPlans.flatMap((plan) => plan.tasks);
    const myTodoTasks = tasks.filter((task) => task.progress < 100).length;

    return {
      totalPlans: actionPlans.length,
      completed: actionPlans.filter((plan) => plan.status === "completed").length,
      inProgress: actionPlans.filter((plan) => plan.status === "in_progress").length,
      totalTasks: tasks.length,
      overdueTasks: tasks.filter((task) => task.deadlineRaw && task.deadlineRaw < todayValue && task.progress < 100).length,
      dueSoonTasks: tasks.filter((task) => task.deadlineRaw && task.deadlineRaw >= todayValue && task.deadlineRaw <= weekValue && task.progress < 100).length,
      myTodoTasks,
      totalBudget: tasks.reduce((sum, task) => sum + task.estimatedBudget, 0),
    };
  }, [actionPlans, todayValue, weekValue]);
  const canManageForms =
    permissions.canManageForms ||
    permissions.canCreateForms ||
    permissions.canEditForms ||
    permissions.canPublishForms ||
    permissions.canDeleteForms ||
    permissions.canViewSubmissions;
  const canViewReports = permissions.canViewReports || permissions.canViewSubmissions || permissions.canExportReports;

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

  function duplicateForm(formId: number) {
    runAction(() => duplicateSpiritualForm(formId));
  }

  function formShareData(form: ShareTarget) {
    const url = `${window.location.origin}/admin/intercession/forms/${form.id}/take`;
    const text = [form.title, form.description].filter(Boolean).join("\n\n");

    return {
      url,
      title: form.title,
      text: text || form.title,
      message: `${text || form.title}\n\n${url}`,
    };
  }

  async function copyFormShare(form: ShareTarget) {
    const { message } = formShareData(form);
    await navigator.clipboard.writeText(message);
    setShareTarget(null);
    setNotice({ ok: true, message: "Form title, description, and link copied." });
  }

  async function nativeShareForm(form: ShareTarget) {
    const { title, text, url } = formShareData(form);
    if (!navigator.share) {
      await copyFormShare(form);
      return;
    }

    await navigator.share({ title, text, url });
    setShareTarget(null);
  }

  function openSharePlatform(form: ShareTarget, platform: "whatsapp" | "facebook" | "telegram" | "email") {
    const { url, title, message } = formShareData(form);
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedMessage = encodeURIComponent(message);
    const links = {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedMessage}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMessage}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedMessage}`,
    };

    window.open(links[platform], "_blank", "noopener,noreferrer");
    setShareTarget(null);
  }

  function resetReportFilters() {
    setReportSearch("");
    setReportStatus("all");
    setReportDateFrom("");
    setReportDateTo("");
  }

  function exportReportCsv() {
    const header = ["Name", "Email", "Submitted", "Total Forms", "Participation", "Points", "Status", "Latest Submitted"];
    const rows = filteredReportRows.map((row) => [
      row.name,
      row.email,
      String(row.submitted),
      String(row.totalForms),
      `${row.participation}%`,
      row.averageScore === null ? "" : `${row.averageScore}%`,
      row.status,
      row.latestSubmittedAt ?? "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "intercession-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function submitActionPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (planModal && planModal !== "new") formData.set("id", String(planModal.id));
    runAction(() => saveIntercessionActionPlan(formData), () => setPlanModal(null));
  }

  function submitActionPlanTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskModal) return;
    const formData = new FormData(event.currentTarget);
    formData.set("actionPlanId", String(taskModal.plan.id));
    if (taskModal.task) formData.set("id", String(taskModal.task.id));
    runAction(() => saveIntercessionActionPlanTask(formData), () => setTaskModal(null));
  }

  function removeActionPlan(plan: IntercessionActionPlan) {
    setConfirmAction({
      title: "Delete Action Plan",
      message: `Delete "${plan.title}" and all of its tasks? This action cannot be undone.`,
      confirmLabel: "Delete Plan",
      action: () => deleteIntercessionActionPlan(plan.id),
    });
  }

  function removeActionPlanTask(task: IntercessionActionPlanTask) {
    setConfirmAction({
      title: "Delete Task",
      message: `Delete "${task.activity || task.taskName}" from this action plan?`,
      confirmLabel: "Delete Task",
      action: () => deleteIntercessionActionPlanTask(task.id),
    });
  }

  function exportActionPlanTasks(plan: IntercessionActionPlan) {
    const header = ["Activity", "Milestone", "Budget", "Start Date", "Deadline", "Priority", "Progress", "Status"];
    const rows = plan.tasks.map((task) => [
      task.activity || task.taskName,
      task.targetMilestone || "",
      String(task.estimatedBudget),
      task.startDateRaw || "",
      task.deadlineRaw || "",
      task.priority || "medium",
      `${task.progress}%`,
      task.status.replace("_", " "),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-tasks.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const availableTabs = [
    ...((permissions.canSubmitForms || canManageForms || canViewReports)
      ? [{ id: "forms", label: "Forms", mobileLabel: "Forms", icon: FileText }]
      : []),
    ...(permissions.canManageActionPlans ? [{ id: "actions", label: "Action Plans", mobileLabel: "Plans", icon: ListChecks }] : []),
    ...(permissions.canReadBible ? [{ id: "bible", label: "Read Bible", mobileLabel: "Bible", icon: BookOpen }] : []),
  ];
  const tabs = showDepartmentNavigation
    ? availableTabs
    : availableTabs.filter((tab) => tab.id === initialTab);
  const formSections = [
    { id: "available" as const, label: "Available", mobileLabel: "Avail", icon: ClipboardList },
    { id: "results" as const, label: "My Results", mobileLabel: "Results", icon: CheckCircle2 },
    ...(canManageForms
      ? [
          { id: "manage" as const, label: "Manage", mobileLabel: "Manage", icon: SlidersHorizontal },
        ]
      : []),
    ...(canViewReports ? [{ id: "reports" as const, label: "Reports", mobileLabel: "Reports", icon: BarChart3 }] : []),
  ];
  const activeFormSection = canManageForms || section === "available" || section === "results" ? section : "available";

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-2 py-3 sm:px-4 sm:py-5 lg:px-6">
      <div className="border-b border-gray-200">
        <div className="px-3 py-3 md:hidden">
          <MobileTabScroller tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>
        <nav className="hidden gap-5 overflow-x-auto md:flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-1 py-2 text-sm font-medium transition ${
                  selected ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {notice ? <IntercessionNoticeBanner notice={notice} onClose={() => setNotice(null)} /> : null}

      {activeTab === "actions" ? (
        <div className="space-y-5 rounded-xl bg-white p-4 shadow-md sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Intercession Action Plans</h2>
             
            </div>
            <button type="button" onClick={() => setPlanModal("new")} className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
              <Plus className="size-4" aria-hidden="true" />
              Create New Action Plan
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <ActionPlanStat label="Overdue Tasks" mobileLabel="Overdue" value={actionPlanSummary.overdueTasks} tone="red" />
            <ActionPlanStat label="To-Be-Overdue Within 7 Days" mobileLabel="Due Soon" value={actionPlanSummary.dueSoonTasks} tone="amber" />
            <ActionPlanStat label="My TO DO" mobileLabel="To Do" value={actionPlanSummary.myTodoTasks} tone="blue" />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:flex-row md:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input value={actionPlanSearch} onChange={(event) => setActionPlanSearch(event.target.value)} placeholder="Search action plans..." className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </label>
            <select value={actionPlanStatus} onChange={(event) => setActionPlanStatus(event.target.value)} className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredActionPlans.length ? filteredActionPlans.map((plan) => {
              const totalBudget = plan.tasks.reduce((sum, task) => sum + task.estimatedBudget, 0);
              return (
                <article key={plan.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900">{plan.title}</h3>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${actionPlanStatusBadge(plan.status)}`}>{plan.status.replace("_", " ")}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{plan.description || "No description"}</p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>By {plan.createdByName}</span>
                        <span>Start: {plan.startDate}</span>
                        <span>Completion: {plan.dueDate}</span>
                        <span>Created: {plan.createdAt}</span>
                        <span>Tasks: {plan.tasks.length}</span>
                        {totalBudget > 0 ? <span>Budget: {formatCurrency(totalBudget)}</span> : null}
                      </div>
                      <div className="mt-4 flex max-w-md items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(plan.progress, 100)}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-600">{plan.progress}%</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setTaskModal({ plan })} className="rounded-lg bg-green-50 px-3 py-2 text-green-700 hover:bg-green-100" title="Create task"><Plus className="size-4" /></button>
                      <button type="button" onClick={() => exportActionPlanTasks(plan)} className="rounded-lg border border-gray-200 px-3 py-2 text-indigo-600 hover:bg-indigo-50" title="Export tasks"><Download className="size-4" /></button>
                      <button type="button" onClick={() => setViewPlan(plan)} className="rounded-lg border border-gray-200 px-3 py-2 text-purple-600 hover:bg-purple-50" title="View advanced plan"><FileText className="size-4" /></button>
                      <button type="button" onClick={() => setPlanModal(plan)} className="rounded-lg border border-gray-200 px-3 py-2 text-blue-600 hover:bg-blue-50" title="Edit"><Pencil className="size-4" /></button>
                      <button type="button" onClick={() => removeActionPlan(plan)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100" title="Delete"><Trash2 className="size-4" /></button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    <div className="hidden grid-cols-12 gap-2 border-b border-gray-100 bg-white px-4 py-3 text-xs font-semibold text-gray-600 md:grid">
                      <div className="col-span-2">Activity</div>
                      <div className="col-span-2">Milestone</div>
                      <div className="col-span-2">Budget</div>
                      <div className="col-span-2">Deadline</div>
                      <div className="col-span-1">Priority</div>
                      <div className="col-span-1">Progress</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    {plan.tasks.length ? plan.tasks.map((task) => (
                      <div key={task.id}>
                        <div className="border-b border-gray-100 bg-white p-3 last:border-b-0 md:hidden">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Activity</p>
                              <h4 className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-900">{task.activity || task.taskName}</h4>
                            </div>
                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium capitalize text-gray-700">{task.priority || "medium"}</span>
                          </div>
                          <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Milestone</p>
                            <p className="mt-0.5 text-xs text-gray-700">{task.targetMilestone || "-"}</p>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Budget</p>
                              <p className="mt-0.5 font-semibold text-gray-800">{task.estimatedBudget ? formatCurrency(task.estimatedBudget) : "-"}</p>
                            </div>
                            <div className="rounded-lg border border-gray-100 bg-white px-3 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Deadline</p>
                              <p className="mt-0.5 font-semibold text-gray-800">{task.deadline || "-"}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500">
                                <span>Progress</span>
                                <span className="font-semibold">{task.progress}%</span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(task.progress, 100)}%` }} />
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <button type="button" onClick={() => setTaskModal({ plan, task })} className="inline-flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-600" title="Edit task"><Pencil className="size-4" /></button>
                              <button type="button" onClick={() => removeActionPlanTask(task)} className="inline-flex size-8 items-center justify-center rounded-full bg-red-50 text-red-600" title="Delete task"><Trash2 className="size-4" /></button>
                            </div>
                          </div>
                        </div>

                        <div className="hidden grid-cols-12 items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0 md:grid">
                          <div className="col-span-2 font-medium text-gray-800">{task.activity || task.taskName}</div>
                          <div className="col-span-2 text-gray-600">{task.targetMilestone || "-"}</div>
                          <div className="col-span-2 text-gray-600">{task.estimatedBudget ? formatCurrency(task.estimatedBudget) : "-"}</div>
                          <div className="col-span-2 text-gray-600">{task.deadline || "-"}</div>
                          <div className="col-span-1">
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-700">{task.priority || "medium"}</span>
                          </div>
                          <div className="col-span-1">
                            <div className="mb-1 text-xs text-gray-500">{task.progress}%</div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(task.progress, 100)}%` }} />
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="flex items-center justify-end gap-2">
                              <button type="button" onClick={() => setTaskModal({ plan, task })} className="inline-flex size-8 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50" title="Edit task"><Pencil className="size-4" /></button>
                              <button type="button" onClick={() => removeActionPlanTask(task)} className="inline-flex size-8 items-center justify-center rounded-full text-red-600 hover:bg-red-50" title="Delete task"><Trash2 className="size-4" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">No tasks created yet. Use the green plus button to add one.</div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Total estimated amount</p>
                      <p className="text-sm text-gray-500">For this action plan only</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Budget</p>
                      <p className="text-lg font-bold text-gray-800">{formatCurrency(totalBudget)}</p>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                <FileText className="mx-auto mb-3 size-10 text-gray-300" aria-hidden="true" />
                <p className="text-sm text-gray-500">No action plans found</p>
                <button type="button" onClick={() => setPlanModal("new")} className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">Create your first action plan</button>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "bible" ? (
        <BibleReaderTab />
      ) : (
        <div className="rounded-xl bg-white p-4 shadow-md sm:p-6">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid w-full grid-cols-2 gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 sm:inline-grid sm:w-auto sm:grid-cols-4">
              {formSections.map((item) => {
                const Icon = item.icon;
                const selected = activeFormSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      selected ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-white"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {permissions.canCreateForms && (
              <Link
                href="/admin/intercession/forms/create"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="size-4" aria-hidden="true" />
                Create Form
              </Link>
            )}
          </div>

          {activeFormSection === "available" && (
            <section>
              <h2 className="mb-4 text-lg font-bold text-gray-900">Available Forms</h2>
              <div className="space-y-3 rounded-xl bg-gray-50 p-3">
                {publishedForms.length ? (
                  publishedForms.map((form) => {
                    const cardUrl = `/admin/intercession/forms/${form.id}/take`;
                    
                    return (
                      <Link
                        key={form.id}
                        href={cardUrl}
                        className="available-form-card group block w-full rounded-xl border border-gray-200 bg-gradient-to-br from-white to-blue-50/30 p-4 transition hover:border-blue-200 hover:shadow-md sm:p-5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-slate-800 sm:text-lg">{form.title}</h3>
                              {form.hasSubmitted && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                  <CheckCircle2 className="size-3" aria-hidden="true" />
                                  Completed
                                </span>
                              )}
                              {form.limitOneResponse && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                  </svg>
                                  Limit 1
                                </span>
                              )}
                            </div>
                            {form.description && (
                              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{form.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                                <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                  <line x1="16" y1="2" x2="16" y2="6" />
                                  <line x1="8" y1="2" x2="8" y2="6" />
                                  <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                                {form.createdAt}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <EmptyState title="No forms available" />
                )}
              </div>
            </section>
          )}

          {activeFormSection === "results" && (
            <section>
              <h2 className="mb-4 text-lg font-bold text-gray-900">My Results</h2>
              <div className="space-y-3">
                {mySubmissions.length ? (
                  mySubmissions.map((submission) => {
                    return (
                      <Link
                        key={submission.id}
                        href={`/admin/intercession/forms/${submission.formId}/take`}
                        className="block rounded-xl border border-gray-200 p-4 transition hover:shadow-md sm:p-5"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{submission.formTitle}</h3>
                            {submission.formDescription && <p className="mt-1 text-sm text-gray-500 line-clamp-2">{submission.formDescription}</p>}
                            <p className="mt-2 text-xs font-medium text-gray-400">
                              <svg className="inline-block size-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              Submitted {submission.submittedAt}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            <CheckCircle2 className="size-3" aria-hidden="true" />
                            {submission.score === null ? "Submitted" : `${submission.score} pts`}
                          </span>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <EmptyState title="No results yet" />
                )}
              </div>
            </section>
          )}

          {canManageForms && activeFormSection === "manage" && (
            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-gray-900">Manage Forms</h2>
                <label className="relative block sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Search forms..."
                  />
                </label>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredForms.length ? filteredForms.map((form) => (
                  <article key={form.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{form.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                          <span>{form.createdAt}</span>
                          <span className="size-1 rounded-full bg-gray-300" />
                          <span>{form.questionCount} questions</span>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                        form.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {form.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>

                    {form.description ? <p className="mt-2 line-clamp-2 text-xs text-gray-600">{form.description}</p> : null}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Submissions</p>
                        <p className="mt-0.5 text-sm font-bold text-gray-800">{form.submissionsCount}</p>
                      </div>
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Created By</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-gray-800">{form.createdBy}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {permissions.canEditForms && (
                        <Link href={`/admin/intercession/forms/${form.id}/edit`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700">
                          <Pencil className="size-3.5" />
                          Edit
                        </Link>
                      )}
                      {permissions.canPublishForms ? (
                        <button
                          type="button"
                          onClick={() => runAction(() => toggleSpiritualFormPublish(form.id))}
                          className={`inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold ${
                            form.isPublished ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700"
                          }`}
                        >
                          {form.isPublished ? "Unpublish" : "Publish"}
                        </button>
                      ) : null}
                      <button type="button" onClick={() => duplicateForm(form.id)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-sky-50 px-3 text-xs font-semibold text-sky-700">
                        <Copy className="size-3.5" />
                        Copy
                      </button>
                      {permissions.canViewSubmissions && (
                        <Link href={`/admin/intercession/forms/${form.id}/submissions`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-purple-50 px-3 text-xs font-semibold text-purple-700">
                          <Users className="size-3.5" />
                          Submissions
                        </Link>
                      )}
                      {permissions.canDeleteForms && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmAction({
                              title: "Delete Form",
                              message: `Delete "${form.title}" and all of its submissions? This action cannot be undone.`,
                              confirmLabel: "Delete Form",
                              tone: "danger",
                              action: () => deleteSpiritualForm(form.id),
                            });
                          }}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-semibold text-red-700"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                )) : (
                  <EmptyState title="No forms found" />
                )}
              </div>

              <div className="hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Form</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Submissions</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredForms.map((form) => (
                      <tr 
                        key={form.id} 
                        className="cursor-pointer transition hover:bg-gray-50"
                        onClick={() => window.location.href = `/admin/intercession/forms/${form.id}/edit`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{form.title}</div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <svg className="size-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              Created: {form.createdAt}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {permissions.canPublishForms ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                runAction(() => toggleSpiritualFormPublish(form.id));
                              }}
                              className={`rounded-full px-2 py-1 text-xs font-semibold transition whitespace-nowrap ${
                                form.isPublished 
                                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" 
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              }`}
                            >
                              {form.isPublished ? "Unpublish" : "Publish"}
                            </button>
                          ) : (
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                form.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {form.isPublished ? "Published" : "Draft"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500">{form.submissionsCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateForm(form.id);
                              }}
                              className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-sky-600 transition hover:bg-sky-50"
                              aria-label="Duplicate"
                              title="Duplicate form"
                            >
                              <Copy className="size-4" />
                            </button>

                            {permissions.canViewSubmissions && (
                              <Link
                                href={`/admin/intercession/forms/${form.id}/submissions`}
                                aria-label="Submissions"
                                title="Submissions"
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-purple-600 transition hover:bg-purple-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Users className="size-4" />
                              </Link>
                            )}
                            {permissions.canDeleteForms && (
                              <button
                                type="button"
                                aria-label="Delete"
                                title="Delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmAction({
                                    title: "Delete Form",
                                    message: `Delete "${form.title}" and all of its submissions? This action cannot be undone.`,
                                    confirmLabel: "Delete Form",
                                    tone: "danger",
                                    action: () => deleteSpiritualForm(form.id),
                                  });
                                }}
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:bg-red-50"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {canViewReports && activeFormSection === "reports" && (
            <section className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-gray-900">Reports</h2>
                <div className="text-sm text-gray-500">Participation across published forms</div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 sm:p-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[1fr_1fr_180px_1.2fr_auto_auto]">
                  <div>
                    <label className="mb-0.5 block text-[11px] font-medium text-gray-700 sm:mb-1 sm:text-xs">From</label>
                    <input
                      type="date"
                      value={reportDateFrom}
                      onChange={(event) => setReportDateFrom(event.target.value)}
                      className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:px-3 sm:py-2 sm:text-sm sm:focus:ring-4"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[11px] font-medium text-gray-700 sm:mb-1 sm:text-xs">To</label>
                    <input
                      type="date"
                      value={reportDateTo}
                      onChange={(event) => setReportDateTo(event.target.value)}
                      className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:px-3 sm:py-2 sm:text-sm sm:focus:ring-4"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[11px] font-medium text-gray-700 sm:mb-1 sm:text-xs">Status</label>
                    <select
                      value={reportStatus}
                      onChange={(event) => setReportStatus(event.target.value)}
                      className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:px-3 sm:py-2 sm:text-sm sm:focus:ring-4"
                    >
                      <option value="all">All statuses</option>
                      <option value="Complete">Complete</option>
                      <option value="Partial">Partial</option>
                      <option value="Not Started">Not Started</option>
                    </select>
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <label className="mb-0.5 block text-[11px] font-medium text-gray-700 sm:mb-1 sm:text-xs">Search user</label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400 sm:left-3 sm:size-4" aria-hidden="true" />
                      <input
                        type="search"
                        value={reportSearch}
                        onChange={(event) => setReportSearch(event.target.value)}
                        placeholder="Search by name or email..."
                        className="h-9 w-full rounded-lg border border-gray-300 py-0 pl-8 pr-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:py-2 sm:pl-9 sm:pr-3 sm:text-sm sm:focus:ring-4"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={resetReportFilters}
                      className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-200 sm:h-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                    >
                      <RotateCcw className="size-3.5 sm:size-4" aria-hidden="true" />
                      Reset
                    </button>
                  </div>
                  <div className="flex items-end">
                    {permissions.canExportReports ? (
                      <button
                        type="button"
                        onClick={exportReportCsv}
                        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white transition hover:bg-emerald-700 sm:h-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                      >
                        <Download className="size-3.5 sm:size-4" aria-hidden="true" />
                        Export
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Showing <strong>{filteredReportRows.length}</strong> member(s)
                  {reportDateFrom || reportDateTo ? (
                    <>
                      {" "}
                      between <strong>{reportDateFrom || "start"}</strong> and <strong>{reportDateTo || "today"}</strong>
                    </>
                  ) : null}
                  . <span className="ml-1">Forms found: <strong>{reportForms.length}</strong></span>
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                <ReportCard label="All Members" mobileLabel="All" value={reportSummary.total} tone="blue" />
                <ReportCard label="100% Participation" mobileLabel="100%" value={reportSummary.complete} tone="green" />
                <ReportCard label="Partial Participation" mobileLabel="Partial" value={reportSummary.partial} tone="amber" />
                <ReportCard label="0% Participation" mobileLabel="0%" value={reportSummary.notStarted} tone="red" />
              </div>

              <div className="space-y-3 md:hidden">
                {filteredReportRows.length ? (
                  filteredReportRows.map((row) => (
                    <article key={row.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-gray-900">{row.name}</h3>
                          <p className="truncate text-xs text-gray-400">{row.email}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                            row.status === "Complete"
                              ? "bg-green-100 text-green-700"
                              : row.status === "Partial"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-blue-50 px-2 py-2">
                          <p className="text-[10px] font-semibold uppercase text-blue-500">Submitted</p>
                          <p className="mt-0.5 text-sm font-bold text-blue-700">{row.submitted}/{row.totalForms}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2 py-2">
                          <p className="text-[10px] font-semibold uppercase text-slate-500">Part.</p>
                          <p className="mt-0.5 text-sm font-bold text-slate-800">{row.participation}%</p>
                        </div>
                        <div className="rounded-lg bg-purple-50 px-2 py-2">
                          <p className="text-[10px] font-semibold uppercase text-purple-500">Points</p>
                          <p className="mt-0.5 text-sm font-bold text-purple-700">{row.averageScore === null ? "-" : `${row.averageScore}%`}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReportDetail(row)}
                        className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 text-xs font-semibold text-blue-700"
                      >
                        <FileText className="size-3.5" aria-hidden="true" />
                        View Details
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                    No report data available
                  </div>
                )}
              </div>

              <div className="hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3 text-center">Submitted</th>
                      <th className="px-4 py-3 text-center">Participation</th>
                      <th className="px-4 py-3 text-center">Points</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredReportRows.length ? (
                      filteredReportRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{row.name}</div>
                            <div className="text-xs text-gray-400">{row.email}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-gray-700">
                            {row.submitted}/{row.totalForms}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-blue-600">{row.participation}%</td>
                          <td className="px-4 py-3 text-center font-medium text-purple-600">{row.averageScore === null ? "-" : `${row.averageScore}%`}</td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                row.status === "Complete"
                                  ? "bg-green-100 text-green-700"
                                  : row.status === "Partial"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setReportDetail(row)}
                              className="inline-flex items-center justify-center gap-1 text-sm font-medium text-blue-600 transition hover:text-blue-800"
                            >
                              <FileText className="size-4" aria-hidden="true" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                          No report data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {planModal ? (
        <IntercessionModal title={planModal === "new" ? "Create Action Plan" : "Edit Action Plan"} onClose={() => setPlanModal(null)} width="max-w-2xl">
          <form onSubmit={submitActionPlan} className="space-y-4 p-5">
            <input type="hidden" name="year" value={new Date().getFullYear()} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Action Plan Name *</label>
              <input name="title" defaultValue={planModal === "new" ? "" : planModal.title} required placeholder="Enter action plan name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Date *</label>
                <input name="startDate" type="date" defaultValue={planModal === "new" ? "" : planModal.startDateRaw} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Completion Date *</label>
                <input name="dueDate" type="date" defaultValue={planModal === "new" ? "" : planModal.dueDateRaw} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea name="description" rows={3} defaultValue={planModal === "new" ? "" : planModal.description ?? ""} placeholder="Optional description" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setPlanModal(null)} className="h-9 rounded-lg border border-gray-300 px-4 text-sm text-gray-700 transition hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isPending} className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">{isPending ? "Saving..." : planModal === "new" ? "Create Action Plan" : "Update Action Plan"}</button>
            </div>
          </form>
        </IntercessionModal>
      ) : null}

      {taskModal ? (
        <IntercessionModal title={taskModal.task ? `Edit Task for ${taskModal.plan.title}` : `Create Task for ${taskModal.plan.title}`} onClose={() => setTaskModal(null)} width="max-w-2xl">
          <form onSubmit={submitActionPlanTask} className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Action Plan</label>
              <input value={taskModal.plan.title} readOnly className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Activity *</label>
              <input name="activity" defaultValue={taskModal.task?.activity ?? taskModal.task?.taskName ?? ""} required placeholder="Enter activity" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Targeted Milestone *</label>
              <input name="targetMilestone" defaultValue={taskModal.task?.targetMilestone ?? ""} required placeholder="Enter targeted milestone" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                <input name="startDate" type="date" defaultValue={taskModal.task?.startDateRaw ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Estimated Budget *</label>
                <input name="estimatedBudget" type="number" min="0" step="0.01" defaultValue={taskModal.task?.estimatedBudget ?? ""} required placeholder="0.00" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Deadline *</label>
                <input name="deadline" type="date" defaultValue={taskModal.task?.deadlineRaw ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Priority *</label>
                <select name="priority" defaultValue={taskModal.task?.priority ?? "medium"} required className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                  <option value="">Select priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Progress *</label>
                <input name="progress" type="number" min="0" max="100" defaultValue={taskModal.task?.progress ?? 0} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setTaskModal(null)} className="h-9 rounded-lg border border-gray-300 px-4 text-sm text-gray-700 transition hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isPending} className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">{isPending ? "Saving..." : taskModal.task ? "Update Task" : "Save Task"}</button>
            </div>
          </form>
        </IntercessionModal>
      ) : null}

      {viewPlan ? (
        <AdvancedActionPlanModal plan={viewPlan} onClose={() => setViewPlan(null)} />
      ) : null}

      {confirmAction ? (
        <IntercessionConfirmModal
          confirm={confirmAction}
          pending={isPending}
          onCancel={() => setConfirmAction(null)}
          onConfirm={executeConfirm}
        />
      ) : null}

      {shareTarget ? (
        <ShareFormModal
          form={shareTarget}
          onClose={() => setShareTarget(null)}
          onCopy={() => copyFormShare(shareTarget)}
          onNativeShare={() => nativeShareForm(shareTarget)}
          onPlatform={(platform) => openSharePlatform(shareTarget, platform)}
        />
      ) : null}

      {reportDetail ? (
        <ReportDetailModal
          row={reportDetail}
          forms={reportForms}
          onClose={() => setReportDetail(null)}
        />
      ) : null}

    </div>
  );
}

function ReportDetailModal({
  row,
  forms,
  onClose,
}: {
  row: ReportRow;
  forms: SpiritualForm[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/50 px-3 py-6">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">User Progress</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{row.name}</h2>
            <p className="text-sm text-slate-500">{row.email}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-3 bg-slate-50 p-4 sm:grid-cols-4">
          <ReportCard label="Submitted" value={row.submitted} tone="blue" />
          <ReportCard label="Total Forms" value={row.totalForms} tone="green" />
          <ReportCard label="Participation" value={Math.round(row.participation)} tone="amber" />
          <ReportCard label="Points" value={row.averageScore === null ? 0 : Math.round(row.averageScore)} tone="red" />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="space-y-2">
            {forms.map((form) => {
              const submission = row.submissions.find((item) => item.formId === form.id);
              return (
                <div key={form.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{form.title}</p>
                    <p className="text-xs text-slate-400">{submission?.submittedAt ? `Submitted ${submission.submittedAt}` : "No submission"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${submission ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {submission ? "Submitted" : "Not Started"}
                    </span>
                    {submission?.score !== null && submission?.score !== undefined ? (
                      <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">{submission.score}%</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AdvancedActionPlanModal({ plan, onClose }: { plan: IntercessionActionPlan; onClose: () => void }) {
  const timeline = buildActionPlanTimeline(plan);
  const minWidth = Math.max(0, timeline.months.length * 52 + 250);

  function exportTimeline() {
    const monthHeaderCells = timeline.months
      .map((month) => `<th style="border:1px solid #d1d5db;background:#c4b5fd;color:#111827;padding:8px 6px;">${escapeHtml(`${month.month} ${month.year}`)}</th>`)
      .join("");
    const rows = timeline.rows
      .map((row) => {
        const cells = timeline.months.map((_, index) => {
          const active = index >= row.startIndex && index <= row.endIndex;
          return `<td style="border:1px solid #e5e7eb;padding:6px;background:${active ? "#4b5563" : "#fafafa"};color:${active ? "#fff" : "#111827"};">${active ? escapeHtml(row.activity) : ""}</td>`;
        }).join("");
        return `
          <tr>
            <td style="border:1px solid #e5e7eb;padding:8px;">${escapeHtml(row.activity)}</td>
            <td style="border:1px solid #e5e7eb;padding:8px;">${escapeHtml(row.milestone)}</td>
            <td style="border:1px solid #e5e7eb;padding:8px;">${escapeHtml(row.timeLabel)}</td>
            ${cells}
          </tr>
        `;
      })
      .join("");
    const html = `
      <html>
        <head><meta charset="utf-8" /></head>
        <body>
          <table>
            <tr><td colspan="${3 + timeline.months.length}" style="font-size:16px;font-weight:700;">${escapeHtml(plan.title)}</td></tr>
            <tr><td colspan="${3 + timeline.months.length}" style="color:#6b7280;">${escapeHtml(plan.description || "")}</td></tr>
            <tr><td colspan="${3 + timeline.months.length}">&nbsp;</td></tr>
            <tr>
              <th style="border:1px solid #d1d5db;background:#1d4ed8;color:#fff;padding:8px 6px;">Task</th>
              <th style="border:1px solid #d1d5db;background:#0ea5e9;color:#fff;padding:8px 6px;">Milestone</th>
              <th style="border:1px solid #d1d5db;background:#0ea5e9;color:#fff;padding:8px 6px;">Time</th>
              ${monthHeaderCells}
            </tr>
            ${rows || `<tr><td colspan="${3 + timeline.months.length}" style="border:1px solid #e5e7eb;padding:10px;text-align:center;">No tasks available.</td></tr>`}
          </table>
        </body>
      </html>`;
    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.title.replace(/[^a-z0-9]+/gi, "_")}_timeline.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-[130] overflow-y-auto bg-gray-900/60">
      <div className="relative top-6 mx-auto w-full max-w-6xl px-3 pb-8 sm:px-6">
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 pb-5 pt-8 sm:px-8">
            <div>
              <div className="mb-5 h-1 w-28 rounded-full bg-gradient-to-r from-fuchsia-500 to-orange-400" />
              <h3 className="text-xl font-bold leading-none tracking-tight sm:text-2xl">
                <span className="text-gray-700">Intercession DPT</span>
                <span className="text-purple-500"> ACTION PLAN</span>
              </h3>
              <p className="mt-4 text-sm text-gray-500 sm:text-base">
                {plan.title}
                {plan.startDate ? ` - Start ${plan.startDate}` : ""}
                {plan.dueDate ? ` - Completion ${plan.dueDate}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={exportTimeline} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700">
                <Download className="size-4" aria-hidden="true" />
                Export
              </button>
              <button type="button" onClick={onClose} className="mt-1 text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto p-4 sm:p-5">
            {plan.tasks.length ? (
              <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.06)]" style={{ minWidth }}>
                <div className="grid" style={{ gridTemplateColumns: "140px 100px minmax(0, 1fr)" }}>
                  <div className="flex items-center justify-center border-r border-white/20 bg-blue-600 px-4 py-4 text-sm font-semibold text-white">Task</div>
                  <div className="flex items-center justify-center border-r border-white/20 bg-sky-500 px-4 py-4 text-sm font-semibold text-white">Time</div>
                  <div className="grid text-gray-700" style={{ gridTemplateColumns: `repeat(${timeline.months.length}, minmax(3.25rem, 1fr))` }}>
                    {timeline.months.map((month) => (
                      <div key={`${month.month}-${month.year}`} className="flex flex-col items-center justify-center border-r border-purple-200 bg-purple-100 px-0.5 py-2 text-[10px] font-semibold leading-tight last:border-r-0">
                        <span>{month.month}</span>
                        <span className="text-[9px] text-gray-500">{month.year}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  {timeline.rows.map((row) => (
                    <div key={row.id} className="grid border-b border-gray-100 last:border-b-0" style={{ gridTemplateColumns: "140px 100px minmax(0, 1fr)" }}>
                      <div className="flex items-center gap-2 border-r border-gray-100 bg-white px-3 py-4">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">{String(row.index).padStart(2, "0")}</div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-gray-800">{row.activity}</div>
                          {row.milestone ? <div className="truncate text-xs text-gray-400">{row.milestone}</div> : null}
                        </div>
                      </div>
                      <div className="flex items-center border-r border-gray-100 bg-white px-3 py-4 text-sm text-gray-600">{row.timeLabel}</div>
                      <div className="bg-gray-50 px-3 py-4">
                        <div className="relative h-10 overflow-hidden rounded-lg border border-gray-100 bg-white">
                          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${timeline.months.length}, minmax(3.25rem, 1fr))` }}>
                            {timeline.months.map((month) => (
                              <div key={`${row.id}-${month.month}-${month.year}`} className="flex items-center justify-center border-r border-gray-200 bg-purple-50/70 px-0.5 text-[10px] font-semibold leading-tight text-gray-700 last:border-r-0">
                                <span>{month.month}</span>
                              </div>
                            ))}
                          </div>
                          <div className={`absolute top-1/2 flex h-8 -translate-y-1/2 items-center rounded-md px-2 text-[10px] font-semibold text-white shadow-sm ${row.overdue ? "bg-red-600" : "bg-gray-600"}`} style={{ left: `${row.left}%`, width: `${row.width}%` }}>
                            <span className="truncate">{row.activity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-gray-500">
                <FileText className="mx-auto mb-3 size-10 text-gray-300" aria-hidden="true" />
                <p>No tasks available for this action plan yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BibleReaderTab() {
  const [version, setVersion] = useState("bysb");
  const [compare, setCompare] = useState("");
  const [book, setBook] = useState("EXO");
  const [chapter, setChapter] = useState(27);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<BibleResult | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedBook = bibleBooks.find((item) => item.code === book) ?? bibleBooks[0];
  const canGoPrevious = selectedBook ? chapter > 1 : false;
  const canGoNext = selectedBook ? chapter < selectedBook.chapters : false;
  const primaryVersion = bibleVersions.find((item) => item.key === version) ?? bibleVersions[0];
  const useKinyarwanda = ["BYSB", "BIR"].includes(primaryVersion.code.toUpperCase());
  const copy = getBibleReaderCopy(useKinyarwanda);

  const filteredPrimary = useMemo(() => filterVerses(result?.primary.verses ?? [], search), [result, search]);
  const filteredCompare = useMemo(() => filterVerses(result?.compare?.verses ?? [], search), [result, search]);
  const mobileCompareRows = useMemo(() => {
    if (!result?.compare) return [];
    const compareByVerse = new Map(filteredCompare.map((verse) => [verse.number, verse]));
    return filteredPrimary.map((primaryVerse) => ({
      number: primaryVerse.number,
      primary: primaryVerse,
      compare: compareByVerse.get(primaryVerse.number),
    }));
  }, [filteredCompare, filteredPrimary, result]);

  async function loadChapter(nextChapter = chapter) {
    if (!selectedBook || nextChapter < 1 || nextChapter > selectedBook.chapters) {
      setNotice("Please choose a valid book and chapter.");
      return;
    }

    setLoading(true);
    setNotice("");
    try {
      const params = new URLSearchParams({
        version,
        book,
        chapter: String(nextChapter),
      });
      if (compare) params.set("compare", compare);

      const response = await fetch(`/api/bible/chapter?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      const data = (await response.json()) as (BibleResult & { ok?: boolean; message?: string });

      if (!response.ok || data.ok === false) {
        throw new Error(data.message || "Unable to load the selected chapter right now.");
      }

      setChapter(nextChapter);
      setResult(data);
    } catch (error) {
      setResult(null);
      setNotice(error instanceof Error ? error.message : "Unable to load the selected chapter right now.");
    } finally {
      setLoading(false);
    }
  }

  function changeBook(nextBook: string) {
    const selected = bibleBooks.find((item) => item.code === nextBook) ?? bibleBooks[0];
    setBook(selected.code);
    setChapter((current) => Math.min(current, selected.chapters));
  }

  function changeVersion(nextVersion: string) {
    setVersion(nextVersion);
    if (compare === nextVersion) {
      setCompare("");
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:rounded-[28px]">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_36%),linear-gradient(180deg,_#ffffff,_#f8fbff)] px-3 py-4 sm:px-8 sm:py-6 lg:px-10 lg:py-7">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md sm:size-10">
            <BookOpen className="size-4 sm:size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{copy.heading}</h2>
            <p className="text-sm text-slate-500"></p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-blue-100 bg-white/90 p-2.5 shadow-sm sm:mt-5 sm:rounded-3xl sm:p-6 lg:p-7">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-[1fr_1fr_1.3fr_0.6fr_auto]">
            <label>
              <span className="mb-0.5 block text-[11px] font-semibold text-slate-900 sm:mb-1 sm:text-sm">{useKinyarwanda ? "Bibiliya" : "Translation"}</span>
              <select value={version} onChange={(event) => changeVersion(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm sm:focus:ring-4">
                {bibleVersions.map((item) => (
                  <option key={item.key} value={item.key}>{item.code} ({item.label})</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-0.5 block text-[11px] font-semibold text-slate-900 sm:mb-1 sm:text-sm">{useKinyarwanda ? "Gereranya" : "Compare"}</span>
              <select value={compare} onChange={(event) => setCompare(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm sm:focus:ring-4">
                <option value="">None</option>
                {bibleVersions.filter((item) => item.key !== version).map((item) => (
                  <option key={item.key} value={item.key}>{item.code} ({item.label})</option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="mb-0.5 block text-[11px] font-semibold text-slate-900 sm:mb-1 sm:text-sm">{useKinyarwanda ? "Igitabo" : "Book"}</span>
              <select value={book} onChange={(event) => changeBook(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm sm:focus:ring-4">
                {bibleBooks.map((item) => (
                  <option key={item.code} value={item.code}>{useKinyarwanda ? item.nameRw : item.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-0.5 block text-[11px] font-semibold text-slate-900 sm:mb-1 sm:text-sm">{useKinyarwanda ? "Igice" : "Chapter"}</span>
              <input type="number" min={1} max={selectedBook.chapters} value={chapter} onChange={(event) => setChapter(Number(event.target.value))} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm sm:focus:ring-4" />
              <span className="mt-1 hidden text-xs font-medium text-slate-400 sm:block">
                {useKinyarwanda
                  ? selectedBook.chapters === 1 ? "Iki gitabo gifite igice 1." : `Iki gitabo gifite ibice ${selectedBook.chapters}.`
                  : selectedBook.chapters === 1 ? "This book has 1 chapter." : `This book has ${selectedBook.chapters} chapters.`}
              </span>
            </label>
            <div className="col-span-2 flex items-start sm:col-span-2 sm:pt-5 xl:col-span-1 xl:pt-7">
              <button type="button" onClick={() => loadChapter()} disabled={loading} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60 sm:h-auto sm:gap-2 sm:rounded-xl sm:px-5 sm:py-3 sm:text-sm">
                <Search className="size-3.5 sm:size-4" aria-hidden="true" />
                {loading ? copy.loading : copy.read}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-3 w-full sm:mt-5 sm:max-w-[calc(100%-3rem)] lg:max-w-[calc(100%-5rem)]">
          <label className="sr-only" htmlFor="bibleSearchInput">{copy.searchLabel}</label>
          <div className="flex h-9 w-full items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-white px-2.5 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-100 sm:h-auto sm:rounded-full sm:px-4 sm:py-2.5 lg:px-5 lg:py-3">
            <Search className="size-3.5 shrink-0 text-blue-700 sm:size-4" aria-hidden="true" />
            <input id="bibleSearchInput" value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder={copy.searchPlaceholder} className="min-w-0 flex-1 border-0 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 sm:text-sm" />
          </div>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-8 sm:py-6 lg:px-10">
        {notice ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div> : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">{copy.loading}</div>
        ) : result ? (
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{useKinyarwanda ? selectedBook.nameRw : selectedBook.name} {result.chapter}</h3>
                <p className="text-sm text-slate-500">
                  {result.primary.version.label}{result.compare ? ` vs ${result.compare.version.label}` : ""}
                </p>
              </div>
              <div className="hidden text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 sm:block">{useKinyarwanda ? "Igice" : "Chapter"} {result.chapter}</div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button type="button" onClick={() => loadChapter(chapter - 1)} disabled={!canGoPrevious || loading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:text-sm">Previous</button>
                <button type="button" onClick={() => loadChapter(chapter + 1)} disabled={!canGoNext || loading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:text-sm">Next</button>
              </div>
            </div>

            {result.compare ? (
              <div className="space-y-3 xl:hidden">
                {mobileCompareRows.length ? mobileCompareRows.map((row) => (
                  <BibleCompareVerseCard key={row.number} primary={row.primary} compare={row.compare} primaryLabel={result.primary.version.code} compareLabel={result.compare?.version.code ?? "Compare"} />
                )) : (
                  <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No verses match your search.</p>
                )}
              </div>
            ) : null}

            <div className={`grid gap-4 ${result.compare ? "hidden xl:grid xl:grid-cols-2" : "xl:grid-cols-1"}`}>
              <BibleChapterPanel chapter={result.primary} verses={filteredPrimary} badge="Primary" tone="blue" />
              {result.compare ? <BibleChapterPanel chapter={result.compare} verses={filteredCompare} badge="Compare" tone="amber" /> : null}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
              <BookOpen className="size-8" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">{copy.emptyTitle}</h3>
            <p className="mt-2 text-sm text-slate-500">{copy.emptyText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BibleChapterPanel({ chapter, verses, badge, tone }: { chapter: BibleChapter; verses: BibleVerse[]; badge: string; tone: "blue" | "amber" }) {
  const border = tone === "blue" ? "border-blue-500" : "border-amber-500";
  const badgeStyle = tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-4">
      <div className={`mb-4 flex items-center justify-between gap-3 border-l-4 pl-3 ${border}`}>
        <div className="min-w-0">
          <h4 className="truncate text-base font-bold text-slate-900 sm:text-lg">{chapter.version.code} - {chapter.version.label}</h4>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400 sm:tracking-[0.24em]">Translation</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:px-3 ${badgeStyle}`}>{badge}</span>
      </div>
      <div className="space-y-2.5 sm:space-y-3">
        {verses.length ? verses.map((verse) => (
          <p key={verse.number} className="text-[17px] leading-7 text-slate-700 sm:text-[20px] sm:leading-8">
            <span className="mr-2 font-bold text-slate-900">{verse.number}</span>
            {verse.text}
          </p>
        )) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No verses match your search.</p>
        )}
      </div>
    </section>
  );
}

function BibleCompareVerseCard({ primary, compare, primaryLabel, compareLabel }: { primary: BibleVerse; compare?: BibleVerse; primaryLabel: string; compareLabel: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{primary.number}</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">{primaryLabel}</p>
          <p className="text-[17px] leading-7 text-slate-800">{primary.text}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">{compareLabel}</p>
          <p className="text-[16px] leading-7 text-slate-700">{compare?.text ?? "No verse available in comparison."}</p>
        </div>
      </div>
    </article>
  );
}

function getBibleReaderCopy(useKinyarwanda: boolean) {
  if (useKinyarwanda) {
    return {
      heading: "Soma Bibiliya",
      read: "Soma",
      searchLabel: "Shakisha muri iki gice",
      searchPlaceholder: "Shakisha muri iki gice (nibura inyuguti 2)...",
      loading: "Ifungura igice...",
      emptyTitle: "Hitamo igice cyo gusoma",
      emptyText: "Hitamo Bibiliya, ugereranye niba ubishaka, hanyuma ukande Soma.",
    };
  }

  return {
    heading: "Read Bible",
    read: "Read",
    searchLabel: "Search within this chapter",
    searchPlaceholder: "Search within this chapter (min. 2 characters)...",
    loading: "Loading chapter...",
    emptyTitle: "Choose a passage to begin",
    emptyText: "Pick a version, compare it if you want, then press Read.",
  };
}

function filterVerses(verses: BibleVerse[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (normalized.length < 2) return verses;
  return verses.filter((verse) => `${verse.number} ${verse.text}`.toLowerCase().includes(normalized));
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
      <FileText className="mx-auto mb-3 size-10 text-gray-300" aria-hidden="true" />
      <p className="text-sm font-medium text-gray-500">{title}</p>
    </div>
  );
}

function ReportCard({ label, mobileLabel, value, tone }: { label: string; mobileLabel?: string; value: number; tone: "blue" | "green" | "amber" | "red" }) {
  const styles = {
    blue: "border-blue-200 bg-blue-50 text-blue-600",
    green: "border-green-200 bg-green-50 text-green-600",
    amber: "border-amber-200 bg-amber-50 text-amber-600",
    red: "border-red-200 bg-red-50 text-red-600",
  };

  return (
    <div className={`min-w-0 rounded-lg border px-2 py-2 text-center sm:rounded-xl sm:p-3 sm:text-left ${styles[tone]}`}>
      <p className="text-lg font-bold leading-none sm:text-2xl">{value}</p>
      <p className="mt-1 truncate text-[10px] text-gray-600 sm:hidden">{mobileLabel ?? label}</p>
      <p className="mt-1 hidden text-xs text-gray-600 sm:block">{label}</p>
    </div>
  );
}

function IntercessionModal({
  title,
  children,
  onClose,
  width = "max-w-2xl",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/50 px-3 py-6 backdrop-blur-sm">
      <div className={`mx-auto overflow-hidden rounded-2xl bg-white shadow-2xl ${width}`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" type="button" onClick={onClose} aria-label="Close">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ShareFormModal({
  form,
  onClose,
  onCopy,
  onNativeShare,
  onPlatform,
}: {
  form: ShareTarget;
  onClose: () => void;
  onCopy: () => void;
  onNativeShare: () => void;
  onPlatform: (platform: "whatsapp" | "facebook" | "telegram" | "email") => void;
}) {
  const options = [
    { label: "Copy message", icon: Copy, action: onCopy, className: "bg-gray-50 text-gray-700 hover:bg-gray-100" },
    { label: "WhatsApp", icon: MessageCircle, action: () => onPlatform("whatsapp"), className: "bg-green-50 text-green-700 hover:bg-green-100" },
    { label: "Facebook", icon: Share2, action: () => onPlatform("facebook"), className: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
    { label: "Telegram", icon: Send, action: () => onPlatform("telegram"), className: "bg-sky-50 text-sky-700 hover:bg-sky-100" },
    { label: "Email", icon: Mail, action: () => onPlatform("email"), className: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
  ];

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Share form</p>
            <h2 className="mt-1 truncate text-lg font-bold text-gray-900">{form.title}</h2>
            {form.description ? <p className="mt-1 line-clamp-2 text-sm text-gray-500">{form.description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-2 p-5">
          <button
            type="button"
            onClick={onNativeShare}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </button>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={option.action}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${option.className}`}
              >
                <option.icon className="size-4" aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionPlanStat({
  label,
  mobileLabel,
  value,
  tone = "gray",
}: {
  label: string;
  mobileLabel?: string;
  value: number | string;
  tone?: "gray" | "green" | "blue" | "purple" | "amber" | "red";
}) {
  const colors = {
    gray: "border-gray-100 bg-gradient-to-br from-white via-gray-50 to-slate-50 text-gray-800",
    green: "border-green-100 bg-gradient-to-br from-white via-green-50 to-emerald-50 text-green-700",
    blue: "border-sky-100 bg-gradient-to-br from-white via-sky-50 to-blue-50 text-sky-600",
    purple: "border-purple-100 bg-gradient-to-br from-white via-purple-50 to-fuchsia-50 text-purple-700",
    amber: "border-amber-100 bg-gradient-to-br from-white via-amber-50 to-yellow-50 text-amber-600",
    red: "border-rose-100 bg-gradient-to-br from-white via-rose-50 to-red-50 text-rose-600",
  };

  return (
    <div className={`min-w-0 rounded-lg border px-2 py-2 text-center shadow-sm md:rounded-xl md:p-4 md:text-left ${colors[tone]}`}>
      <p className="truncate text-[10px] font-semibold uppercase leading-tight text-gray-500 md:hidden">{mobileLabel ?? label}</p>
      <p className="hidden text-xs font-semibold uppercase text-gray-500 md:block">{label}</p>
      <p className="mt-0.5 text-xl font-bold leading-none md:mt-1 md:text-2xl">{value}</p>
    </div>
  );
}

function actionPlanStatusBadge(status: string) {
  if (status === "completed") return "bg-green-100 text-green-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-700";
  return "bg-yellow-100 text-yellow-700";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseActionPlanDate(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const displayMatch = normalized.match(/^([A-Za-z]{3})\s+(\d{2}),\s+(\d{4})$/);
  if (displayMatch) {
    const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(displayMatch[1]);
    if (monthIndex >= 0) {
      return new Date(Number(displayMatch[3]), monthIndex, Number(displayMatch[2]));
    }
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildTimelineMonths(startDate: Date, endDate: Date) {
  const months: Array<{ month: string; year: number }> = [];
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const limit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (cursor <= limit) {
    months.push({ month: names[cursor.getMonth()], year: cursor.getFullYear() });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months.length ? months : [{ month: names[startDate.getMonth()], year: startDate.getFullYear() }];
}

function getMonthOffset(startDate: Date, targetDate: Date) {
  return (targetDate.getFullYear() - startDate.getFullYear()) * 12 + (targetDate.getMonth() - startDate.getMonth());
}

function buildActionPlanTimeline(plan: IntercessionActionPlan) {
  const planStart = parseActionPlanDate(plan.startDateRaw) ?? parseActionPlanDate(plan.startDate);
  const planDue = parseActionPlanDate(plan.dueDateRaw) ?? parseActionPlanDate(plan.dueDate);
  const taskDates = plan.tasks.flatMap((task) => {
    const dates = [
      parseActionPlanDate(task.startDateRaw) ?? parseActionPlanDate(task.startDate),
      parseActionPlanDate(task.deadlineRaw) ?? parseActionPlanDate(task.deadline),
    ];
    return dates.filter((date): date is Date => date !== null);
  });
  const rangeStartCandidate = [planStart, ...taskDates].filter((date): date is Date => date !== null).sort((a, b) => a.getTime() - b.getTime())[0] ?? new Date();
  const rangeEndCandidate = [planDue, ...taskDates].filter((date): date is Date => date !== null).sort((a, b) => b.getTime() - a.getTime())[0] ?? rangeStartCandidate;
  const rangeStart = new Date(rangeStartCandidate.getFullYear(), rangeStartCandidate.getMonth(), 1);
  const rangeEnd = new Date(rangeEndCandidate.getFullYear(), rangeEndCandidate.getMonth(), 1);
  const months = buildTimelineMonths(rangeStart, rangeEnd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = plan.tasks.map((task, index) => {
    const taskStart = parseActionPlanDate(task.startDateRaw) ?? parseActionPlanDate(task.startDate) ?? planStart ?? rangeStart;
    const taskDeadline = parseActionPlanDate(task.deadlineRaw) ?? parseActionPlanDate(task.deadline);
    const taskBarStart = new Date(taskStart.getFullYear(), taskStart.getMonth(), 1);
    const taskBarEnd = taskDeadline ? new Date(taskDeadline.getFullYear(), taskDeadline.getMonth(), 1) : taskBarStart;
    const startIndex = Math.max(0, getMonthOffset(rangeStart, taskBarStart));
    const endIndex = Math.max(startIndex, getMonthOffset(rangeStart, taskBarEnd));
    const span = Math.max(1, endIndex - startIndex + 1);
    const left = Math.max(0, (startIndex / months.length) * 100);
    const width = Math.min(100 - left, (span / months.length) * 100);
    const remainingDays = taskDeadline ? Math.ceil((taskDeadline.getTime() - today.getTime()) / 86400000) : null;
    const timeLabel =
      remainingDays === null
        ? "-"
        : remainingDays > 0
          ? `${remainingDays} Days Left`
          : remainingDays === 0
            ? "Due Today"
            : `${Math.abs(remainingDays)} Days Overdue`;

    return {
      id: task.id,
      index: index + 1,
      activity: task.activity || task.taskName || "-",
      milestone: task.targetMilestone || "-",
      timeLabel,
      startIndex,
      endIndex,
      left,
      width,
      overdue: remainingDays !== null && remainingDays < 0,
    };
  });

  return { months, rows };
}

function formatCurrency(value: number) {
  return `RWF ${value.toLocaleString()}`;
}

function IntercessionNoticeBanner({ notice, onClose }: { notice: IntercessionNotice; onClose: () => void }) {
  const Icon = notice.ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
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

function IntercessionConfirmModal({
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
            <p className="text-xs text-gray-500">Intercession DPT</p>
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
