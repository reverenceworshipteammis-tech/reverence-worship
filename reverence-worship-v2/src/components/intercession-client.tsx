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
  Eye,
  EyeOff,
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
  saveIntercessionActionPlan,
  saveIntercessionActionPlanTask,
  toggleSpiritualFormPublish,
} from "@/app/admin/intercession/actions";
import { MobileTabDropdown } from "@/components/mobile-tab-dropdown";
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
  canEditForms: boolean;
  canDeleteForms: boolean;
  canViewSubmissions: boolean;
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
  permissions,
  forms,
  mySubmissions,
  reportRows,
  actionPlans,
}: {
  permissions: IntercessionPermissions;
  forms: SpiritualForm[];
  mySubmissions: FormSubmission[];
  reportRows: ReportRow[];
  actionPlans: IntercessionActionPlan[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("forms");
  const [section, setSection] = useState<Section>("available");
  const [query, setQuery] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [selectedReportFormIds, setSelectedReportFormIds] = useState<number[]>([]);
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
  const [todayValue] = useState(() => new Date().toISOString().slice(0, 10));
  const [weekValue] = useState(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();

  const publishedForms = permissions.canSubmitForms ? forms.filter((form) => form.isPublished && form.isActive) : [];
  const filteredForms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return forms;
    return forms.filter((form) =>
      [form.title, form.description, form.createdBy].filter(Boolean).some((value) => value!.toLowerCase().includes(normalized)),
    );
  }, [forms, query]);

  const reportDisplayRows = useMemo(() => {
    if (selectedReportFormIds.length === 0) return [];

    const selectedSet = new Set(selectedReportFormIds);

    return reportRows.map((row) => {
      const selectedSubmissions = row.submissions.filter((submission) => selectedSet.has(submission.formId));
      const submittedFormCount = new Set(selectedSubmissions.map((submission) => submission.formId)).size;
      const scores = selectedSubmissions.map((submission) => submission.score).filter((score): score is number => typeof score === "number");
      const latestSubmittedAt = selectedSubmissions
        .map((submission) => submission.submittedAt)
        .sort()
        .reverse()[0] ?? null;
      const participation = selectedReportFormIds.length ? Math.round((submittedFormCount / selectedReportFormIds.length) * 1000) / 10 : 0;
      return {
        ...row,
        submitted: submittedFormCount,
        totalForms: selectedReportFormIds.length,
        participation,
        averageScore: scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : null,
        latestSubmittedAt,
        status: submittedFormCount === 0 ? "Not Started" : submittedFormCount === selectedReportFormIds.length ? "Complete" : "Partial",
      };
    });
  }, [reportRows, selectedReportFormIds]);

  const filteredReportRows = useMemo(() => {
    const normalized = reportSearch.trim().toLowerCase();
    return reportDisplayRows.filter((row) => {
      const matchesStatus = reportStatus === "all" || row.status === reportStatus;
      const matchesSearch = !normalized || [row.name, row.email].some((value) => value.toLowerCase().includes(normalized));
      const matchesFrom = !reportDateFrom || (row.latestSubmittedAt !== null && row.latestSubmittedAt >= reportDateFrom);
      const matchesTo = !reportDateTo || (row.latestSubmittedAt !== null && row.latestSubmittedAt <= reportDateTo);

      if (row.status === "Not Started" && (reportDateFrom || reportDateTo)) {
        return matchesStatus && matchesSearch && false;
      }

      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });
  }, [reportDisplayRows, reportSearch, reportStatus, reportDateFrom, reportDateTo]);

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

    return {
      totalPlans: actionPlans.length,
      completed: actionPlans.filter((plan) => plan.status === "completed").length,
      inProgress: actionPlans.filter((plan) => plan.status === "in_progress").length,
      totalTasks: tasks.length,
      overdueTasks: tasks.filter((task) => task.deadlineRaw && task.deadlineRaw < todayValue && task.progress < 100).length,
      dueSoonTasks: tasks.filter((task) => task.deadlineRaw && task.deadlineRaw >= todayValue && task.deadlineRaw <= weekValue && task.progress < 100).length,
      totalBudget: tasks.reduce((sum, task) => sum + task.estimatedBudget, 0),
    };
  }, [actionPlans, todayValue, weekValue]);
  const canManageForms =
    permissions.canCreateForms ||
    permissions.canEditForms ||
    permissions.canDeleteForms ||
    permissions.canViewSubmissions;
  const canViewReports = permissions.canViewSubmissions || permissions.canExportReports;

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
    setSelectedReportFormIds([]);
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

  const tabs = [
    { id: "forms", label: "Forms", mobileLabel: "Forms", icon: FileText },
    ...(permissions.canManageActionPlans ? [{ id: "actions", label: "Action Plans", mobileLabel: "Plans", icon: ListChecks }] : []),
    ...(permissions.canReadBible ? [{ id: "bible", label: "Read Bible", mobileLabel: "Bible", icon: BookOpen }] : []),
  ];
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
              <p className="text-sm text-gray-500">Track Intercession DPT plans, tasks, milestones, and progress.</p>
            </div>
            <button type="button" onClick={() => setPlanModal("new")} className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
              <Plus className="size-4" aria-hidden="true" />
              Create New Action Plan
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <ActionPlanStat label="Plans" value={actionPlanSummary.totalPlans} />
            <ActionPlanStat label="Completed" value={actionPlanSummary.completed} tone="green" />
            <ActionPlanStat label="In Progress" value={actionPlanSummary.inProgress} tone="blue" />
            <ActionPlanStat label="Tasks" value={actionPlanSummary.totalTasks} tone="purple" />
            <ActionPlanStat label="Overdue" value={actionPlanSummary.overdueTasks} tone="red" />
            <ActionPlanStat label="Budget" value={formatCurrency(actionPlanSummary.totalBudget)} tone="amber" />
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
                      <button type="button" onClick={() => setViewPlan(plan)} className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-gray-50" title="View"><Eye className="size-4" /></button>
                      <button type="button" onClick={() => setPlanModal(plan)} className="rounded-lg border border-gray-200 px-3 py-2 text-blue-600 hover:bg-blue-50" title="Edit"><Pencil className="size-4" /></button>
                      <button type="button" onClick={() => removeActionPlan(plan)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100" title="Delete"><Trash2 className="size-4" /></button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Activity</th>
                          <th className="px-3 py-2">Milestone</th>
                          <th className="px-3 py-2">Budget</th>
                          <th className="px-3 py-2">Deadline</th>
                          <th className="px-3 py-2">Progress</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {plan.tasks.length ? plan.tasks.map((task) => (
                          <tr key={task.id}>
                            <td className="px-3 py-2 font-medium text-gray-800">{task.activity || task.taskName}</td>
                            <td className="px-3 py-2 text-gray-600">{task.targetMilestone || "-"}</td>
                            <td className="px-3 py-2 text-gray-600">{task.estimatedBudget ? formatCurrency(task.estimatedBudget) : "-"}</td>
                            <td className="px-3 py-2 text-gray-600">{task.deadline || "-"}</td>
                            <td className="px-3 py-2 text-gray-600">{task.progress}%</td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setTaskModal({ plan, task })} className="text-blue-600 hover:text-blue-700">Edit</button>
                                <button type="button" onClick={() => removeActionPlanTask(task)} className="text-red-600 hover:text-red-700">Delete</button>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">No tasks yet</td></tr>
                        )}
                      </tbody>
                    </table>
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
              <div className="space-y-3">
                {publishedForms.length ? (
                  publishedForms.map((form) => (
                    <Link
                      key={form.id}
                      href={`/admin/intercession/forms/${form.id}/take`}
                      className="group w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-200 hover:shadow-md sm:p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-800 sm:text-lg">{form.title}</h3>
                            {form.hasSubmitted && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Completed</span>
                            )}
                            {form.limitOneResponse && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Limit 1</span>
                            )}
                          </div>
                          {form.description && <p className="mt-1 text-sm text-gray-500">{form.description}</p>}
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span className="rounded-full bg-gray-100 px-2 py-1">{form.createdAt}</span>
                            <span className="rounded-full bg-gray-100 px-2 py-1">{form.submissionsCount} response(s)</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                          <span className="text-sm font-medium text-blue-700">{form.questionCount} questions</span>
                          <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-blue-700">
                            <Send className="size-4" aria-hidden="true" />
                            Take Form
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
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
                  mySubmissions.map((submission) => (
                    <div key={submission.id} className="rounded-xl border border-gray-200 p-4 sm:p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{submission.formTitle}</h3>
                          {submission.formDescription && <p className="mt-1 text-sm text-gray-500">{submission.formDescription}</p>}
                          <p className="mt-2 text-xs font-medium text-gray-400">Submitted {submission.submittedAt}</p>
                        </div>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          {submission.score === null ? "Submitted" : `${submission.score} pts`}
                        </span>
                      </div>
                    </div>
                  ))
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

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Form</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Responses</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {filteredForms.map((form) => (
                      <tr key={form.id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{form.title}</div>
                          <div className="text-xs text-gray-500">{form.questionCount} questions · by {form.createdBy}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              form.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {form.isPublished ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{form.submissionsCount}</td>
                        <td className="px-4 py-3 text-gray-600">{form.createdAt}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {permissions.canEditForms && (
                              <>
                                <IconButton label={form.isPublished ? "Unpublish" : "Publish"} onClick={() => runAction(() => toggleSpiritualFormPublish(form.id))}>
                                  {form.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </IconButton>
                                <Link
                                  href={`/admin/intercession/forms/${form.id}/edit`}
                                  aria-label="Edit"
                                  title="Edit"
                                  className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                                >
                                  <Pencil className="size-4" />
                                </Link>
                              </>
                            )}
                            <IconButton label="Share" onClick={() => setShareTarget(form)}>
                              <Share2 className="size-4" />
                            </IconButton>
                            {permissions.canViewSubmissions && (
                              <Link
                                href={`/admin/intercession/forms/${form.id}/submissions`}
                                aria-label="Submissions"
                                title="Submissions"
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-purple-600 transition hover:bg-purple-50"
                              >
                                <Users className="size-4" />
                              </Link>
                            )}
                            {permissions.canDeleteForms && (
                              <IconButton label="Delete" danger onClick={() => runAction(() => deleteSpiritualForm(form.id))}>
                                <Trash2 className="size-4" />
                              </IconButton>
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

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Select Forms</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReportFormIds(publishedForms.map((form) => form.id))}
                        className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedReportFormIds([])}
                        className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {publishedForms.length ? (
                      publishedForms.map((form) => (
                        <label key={form.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-blue-50">
                          <input
                            type="checkbox"
                            checked={selectedReportFormIds.includes(form.id)}
                            onChange={(event) => {
                              setSelectedReportFormIds((current) =>
                                event.target.checked ? [...current, form.id] : current.filter((id) => id !== form.id),
                              );
                            }}
                            className="mt-0.5 size-4 rounded border-gray-300 text-blue-600"
                          />
                          <span>
                            <span className="block font-medium text-gray-800">{form.title}</span>
                            <span className="text-xs text-gray-400">{form.submissionsCount} response(s)</span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No published forms available.</p>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {selectedReportFormIds.length === 0
                      ? "No form ticked, no users shown."
                      : `${selectedReportFormIds.length} form(s) selected.`}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_1.2fr_auto_auto]">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">From</label>
                    <input
                      type="date"
                      value={reportDateFrom}
                      onChange={(event) => setReportDateFrom(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">To</label>
                    <input
                      type="date"
                      value={reportDateTo}
                      onChange={(event) => setReportDateTo(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
                    <select
                      value={reportStatus}
                      onChange={(event) => setReportStatus(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="all">All statuses</option>
                      <option value="Complete">Complete</option>
                      <option value="Partial">Partial</option>
                      <option value="Not Started">Not Started</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">Search user</label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                      <input
                        type="search"
                        value={reportSearch}
                        onChange={(event) => setReportSearch(event.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={resetReportFilters}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                    >
                      <RotateCcw className="size-4" aria-hidden="true" />
                      Reset
                    </button>
                  </div>
                  <div className="flex items-end">
                    {permissions.canExportReports ? (
                      <button
                        type="button"
                        onClick={exportReportCsv}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                      >
                        <Download className="size-4" aria-hidden="true" />
                        Export
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Showing <strong>{filteredReportRows.length}</strong> member(s)
                  {selectedReportFormIds.length > 0 ? (
                    <>
                      {" "}
                      for <strong>{selectedReportFormIds.length}</strong> selected form(s)
                    </>
                  ) : null}
                  {reportDateFrom || reportDateTo ? (
                    <>
                      {" "}
                      between <strong>{reportDateFrom || "start"}</strong> and <strong>{reportDateTo || "today"}</strong>
                    </>
                  ) : null}
                  .
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <ReportCard label="All Members" value={reportSummary.total} tone="blue" />
                <ReportCard label="100% Participation" value={reportSummary.complete} tone="green" />
                <ReportCard label="Partial Participation" value={reportSummary.partial} tone="amber" />
                <ReportCard label="0% Participation" value={reportSummary.notStarted} tone="red" />
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3 text-center">Submitted</th>
                      <th className="px-4 py-3 text-center">Participation</th>
                      <th className="px-4 py-3 text-center">Points</th>
                      <th className="px-4 py-3 text-center">Status</th>
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
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
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
        <IntercessionModal title={viewPlan.title} onClose={() => setViewPlan(null)} width="max-w-3xl">
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <PlanDetail label="Status" value={viewPlan.status.replace("_", " ")} />
              <PlanDetail label="Progress" value={`${viewPlan.progress}%`} />
              <PlanDetail label="Tasks" value={viewPlan.tasks.length} />
              <PlanDetail label="Budget" value={formatCurrency(viewPlan.tasks.reduce((sum, task) => sum + task.estimatedBudget, 0))} />
            </div>
            {viewPlan.description ? <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{viewPlan.description}</p> : null}
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr><th className="px-3 py-2">Activity</th><th className="px-3 py-2">Milestone</th><th className="px-3 py-2">Budget</th><th className="px-3 py-2">Deadline</th><th className="px-3 py-2">Progress</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewPlan.tasks.length ? viewPlan.tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-3 py-2 font-medium text-gray-800">{task.activity || task.taskName}</td>
                      <td className="px-3 py-2 text-gray-600">{task.targetMilestone || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{task.estimatedBudget ? formatCurrency(task.estimatedBudget) : "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{task.deadline || "-"}</td>
                      <td className="px-3 py-2 text-gray-600">{task.progress}%</td>
                    </tr>
                  )) : <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">No tasks yet</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => { setViewPlan(null); setPlanModal(viewPlan); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">Edit Plan</button>
              <button type="button" onClick={() => setViewPlan(null)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Close</button>
            </div>
          </div>
        </IntercessionModal>
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

    </div>
  );
}

function BibleReaderTab() {
  const [version, setVersion] = useState("kjv");
  const [compare, setCompare] = useState("");
  const [book, setBook] = useState("JHN");
  const [chapter, setChapter] = useState(3);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<BibleResult | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedBook = bibleBooks.find((item) => item.code === book) ?? bibleBooks[0];
  const canGoPrevious = selectedBook ? chapter > 1 : false;
  const canGoNext = selectedBook ? chapter < selectedBook.chapters : false;

  const filteredPrimary = useMemo(() => filterVerses(result?.primary.verses ?? [], search), [result, search]);
  const filteredCompare = useMemo(() => filterVerses(result?.compare?.verses ?? [], search), [result, search]);

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

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_36%),linear-gradient(180deg,_#ffffff,_#f8fbff)] px-4 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-7">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md">
            <BookOpen className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Read Bible</h2>
            <p className="text-sm text-slate-500">Choose a passage, compare translations, and search inside the chapter.</p>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-blue-100 bg-white/90 p-4 shadow-sm sm:p-6 lg:p-7">
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.3fr_0.6fr_auto]">
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-900">Translation</span>
              <select value={version} onChange={(event) => setVersion(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                {bibleVersions.map((item) => (
                  <option key={item.key} value={item.key}>{item.code} - {item.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-900">Compare</span>
              <select value={compare} onChange={(event) => setCompare(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                <option value="">None</option>
                {bibleVersions.filter((item) => item.key !== version).map((item) => (
                  <option key={item.key} value={item.key}>{item.code} - {item.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-900">Book</span>
              <select value={book} onChange={(event) => changeBook(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                {bibleBooks.map((item) => (
                  <option key={item.code} value={item.code}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-semibold text-slate-900">Chapter</span>
              <input type="number" min={1} max={selectedBook.chapters} value={chapter} onChange={(event) => setChapter(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              <span className="mt-1 block text-xs font-medium text-slate-400">This book has {selectedBook.chapters} chapter{selectedBook.chapters === 1 ? "" : "s"}.</span>
            </label>
            <div className="flex items-start pt-7">
              <button type="button" onClick={() => loadChapter()} disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60">
                <Search className="size-4" aria-hidden="true" />
                {loading ? "Loading..." : "Read"}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-5 w-full max-w-[calc(100%-1rem)] sm:max-w-[calc(100%-3rem)] lg:max-w-[calc(100%-5rem)]">
          <label className="sr-only" htmlFor="bibleSearchInput">Search within this chapter</label>
          <div className="flex w-full items-center gap-2 overflow-hidden rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-100 lg:px-5 lg:py-3">
            <Search className="size-4 text-blue-700" aria-hidden="true" />
            <input id="bibleSearchInput" value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder="Search within this chapter (min. 2 characters)..." className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
          </div>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-8 lg:px-10">
        {notice ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</div> : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">Loading chapter...</div>
        ) : result ? (
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedBook.name} {result.chapter}</h3>
                <p className="text-sm text-slate-500">
                  {result.primary.version.label}{result.compare ? ` vs ${result.compare.version.label}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => loadChapter(chapter - 1)} disabled={!canGoPrevious || loading} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Previous</button>
                <button type="button" onClick={() => loadChapter(chapter + 1)} disabled={!canGoNext || loading} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">Next</button>
              </div>
            </div>

            <div className={`grid gap-4 ${result.compare ? "xl:grid-cols-2" : "xl:grid-cols-1"}`}>
              <BibleChapterPanel chapter={result.primary} verses={filteredPrimary} badge="Primary" tone="blue" />
              {result.compare ? <BibleChapterPanel chapter={result.compare} verses={filteredCompare} badge="Compare" tone="amber" /> : null}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
              <BookOpen className="size-8" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Choose a passage to begin</h3>
            <p className="mt-2 text-sm text-slate-500">Pick a version, compare it if you want, then press Read.</p>
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
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-4 flex items-center justify-between gap-3 border-l-4 pl-3 ${border}`}>
        <div>
          <h4 className="text-lg font-bold text-slate-900">{chapter.version.code} - {chapter.version.label}</h4>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Translation</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStyle}`}>{badge}</span>
      </div>
      <div className="space-y-3">
        {verses.length ? verses.map((verse) => (
          <p key={verse.number} className="text-[20px] leading-8 text-slate-700">
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

function ReportCard({ label, value, tone }: { label: string; value: number; tone: "blue" | "green" | "amber" | "red" }) {
  const styles = {
    blue: "border-blue-200 bg-blue-50 text-blue-600",
    green: "border-green-200 bg-green-50 text-green-600",
    amber: "border-amber-200 bg-amber-50 text-amber-600",
    red: "border-red-200 bg-red-50 text-red-600",
  };

  return (
    <div className={`rounded-xl border p-3 ${styles[tone]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
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

function ActionPlanStat({ label, value, tone = "gray" }: { label: string; value: number | string; tone?: "gray" | "green" | "blue" | "purple" | "amber" | "red" }) {
  const colors = {
    gray: "bg-gray-50 text-gray-800",
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`rounded-lg border border-gray-100 p-3 ${colors[tone]}`}>
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function PlanDetail({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium capitalize text-gray-800">{value}</p>
    </div>
  );
}

function actionPlanStatusBadge(status: string) {
  if (status === "completed") return "bg-green-100 text-green-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-700";
  return "bg-yellow-100 text-yellow-700";
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

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex size-9 items-center justify-center rounded-lg border transition ${
        danger ? "border-red-100 text-red-600 hover:bg-red-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}
