"use client";

import { FormEvent, TouchEvent as ReactTouchEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionNotice } from "@/components/action-notice";
import { IntercessionRichText } from "@/components/intercession-rich-text";
import { intercessionRichTextToPlainText } from "@/lib/intercession-rich-text";
import {
  AlertTriangle,
  BarChart3,
  Bookmark,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Highlighter,
  Hash,
  LayoutGrid,
  Link2,
  ListChecks,
  Layers,
  Mail,
  MessageCircle,
  Monitor,
  Pencil,
  Plus,
  Presentation,
  RotateCcw,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Smartphone,
  StickyNote,
  Trash2,
  Type,
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
  setSpiritualFormArchived,
} from "@/app/admin/intercession/actions";
import { MobileTabScroller } from "@/components/mobile-tab-scroller";
import { IntercessionTakeForm } from "@/components/intercession-take-form";
import { bibleBooks, bibleVersions } from "@/lib/bible-data";
import type { IntercessionQuestionImage } from "@/lib/intercession-question-images";
import type { IntercessionQuestionCondition } from "@/lib/intercession-form-rules";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";

type Question = {
  id: string;
  type: string;
  label: string;
  description: string;
  required: boolean;
  options: string[];
  rows: string[];
  columns: string[];
  min: number;
  max: number;
  images: IntercessionQuestionImage[];
  condition: IntercessionQuestionCondition | null;
};

type FormPreviewSettings = {
  limit_one_response: boolean;
  show_progress_bar: boolean;
  shuffle_questions: boolean;
  show_question_numbers: boolean;
  is_quiz: boolean;
  release_grade: string;
  require_login: boolean;
  allow_export: boolean;
  include_timestamps: boolean;
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
  availabilityMessage: string | null;
  createdAt: string;
  createdBy: string;
  submissionsCount: number;
  hasSubmitted: boolean;
  previewSettings: FormPreviewSettings;
};

type FormSubmission = {
  id: number;
  formId: number;
  formTitle: string;
  formDescription: string | null;
  questionCount: number;
  submittedAt: string;
  score: number | null;
  resultStatus: string;
};

type ReportRow = {
  id: number;
  name: string;
  membershipType: string | null;
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

type BibleSearchResult = {
  book: string;
  bookName: string;
  bookNameRw: string;
  chapter: number;
  verse: number;
  text: string;
  previousText?: string;
  nextText?: string;
};

type BibleReaderPreferences = {
  fontSize: number;
  lineHeight: "compact" | "comfortable" | "spacious";
  theme: "light" | "sepia" | "dark";
  width: "focused" | "wide";
};

type BibleSavedVerse = {
  id: string;
  version: string;
  versionCode: string;
  book: string;
  bookName: string;
  bookNameRw: string;
  chapter: number;
  verse: number;
  text: string;
  bookmarked: boolean;
  highlighted: boolean;
  note: string;
  updatedAt: string;
};

const BIBLE_PREFERENCES_KEY = "reverence:bible:preferences";
const BIBLE_SAVED_KEY = "reverence:bible:saved";
const BIBLE_SEARCH_HISTORY_KEY = "reverence:bible:search-history";
const defaultBiblePreferences: BibleReaderPreferences = { fontSize: 20, lineHeight: "comfortable", theme: "light", width: "wide" };

type Section = "available" | "results" | "manage" | "reports";

export function IntercessionClient({
  initialTab,
  initialSection,
  showDepartmentNavigation,
  permissions,
  forms,
  mySubmissions,
  reportRows,
  actionPlans,
}: {
  initialTab: "forms" | "bible";
  initialSection: Section;
  showDepartmentNavigation: boolean;
  permissions: IntercessionPermissions;
  forms: SpiritualForm[];
  mySubmissions: FormSubmission[];
  reportRows: ReportRow[];
  actionPlans: IntercessionActionPlan[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [section, setSection] = useState<Section>(initialSection);
  const [query, setQuery] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [reportMembershipType, setReportMembershipType] = useState("all");
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
  const [previewForm, setPreviewForm] = useState<SpiritualForm | null>(null);
  const [manageStatus, setManageStatus] = useState<"active" | "archived">("active");
  const [todayValue] = useState(() => new Date().toISOString().slice(0, 10));
  const [weekValue] = useState(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [isPending, startTransition] = useTransition();

  const reportForms = forms.filter((form) => form.isPublished && form.isActive);
  const publishedForms = permissions.canSubmitForms ? reportForms.filter((form) => !form.availabilityMessage) : [];
  const filteredForms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const byStatus = forms.filter((form) => form.isActive === (manageStatus === "active"));
    if (!normalized) return byStatus;
    return byStatus.filter((form) =>
      [intercessionRichTextToPlainText(form.title), intercessionRichTextToPlainText(form.description ?? ""), form.createdBy]
        .some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [forms, manageStatus, query]);

  const filteredReportRows = useMemo(() => {
    const normalized = reportSearch.trim().toLowerCase();
    return reportRows.filter((row) => {
      const matchesStatus = reportStatus === "all" || row.status === reportStatus;
      const membershipType = row.membershipType ?? "unspecified";
      const matchesMembershipType = reportMembershipType === "all" || membershipType === reportMembershipType;
      const matchesSearch = !normalized || row.name.toLowerCase().includes(normalized);
      const matchesFrom = !reportDateFrom || (row.latestSubmittedAt !== null && row.latestSubmittedAt >= reportDateFrom);
      const matchesTo = !reportDateTo || (row.latestSubmittedAt !== null && row.latestSubmittedAt <= reportDateTo);

      if (row.status === "Not Started" && (reportDateFrom || reportDateTo)) {
        return matchesStatus && matchesMembershipType && matchesSearch && false;
      }

      return matchesStatus && matchesMembershipType && matchesSearch && matchesFrom && matchesTo;
    });
  }, [reportRows, reportSearch, reportStatus, reportMembershipType, reportDateFrom, reportDateTo]);

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

  function formUrl(formId: number) {
    const selected = forms.find((form) => form.id === formId);
    const path = selected?.previewSettings.require_login === false
      ? `/forms/${formId}`
      : `/admin/intercession/forms/${formId}/take`;

    return `${window.location.origin}${path}`;
  }

  function formShareData(form: ShareTarget) {
    const url = formUrl(form.id);
    const plainTitle = intercessionRichTextToPlainText(form.title);
    const plainDescription = intercessionRichTextToPlainText(form.description ?? "");
    const text = [plainTitle, plainDescription].filter(Boolean).join("\n\n");

    return {
      url,
      title: plainTitle,
      text: text || plainTitle,
      message: `${text || plainTitle}\n\n${url}`,
    };
  }

  async function copyFormLink(formId: number) {
    try {
      await navigator.clipboard.writeText(formUrl(formId));
      setNotice({ ok: true, message: "Form link copied. It is ready to share." });
    } catch {
      setNotice({ ok: false, message: "Could not copy the form link. Please try again." });
    }
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
    setReportMembershipType("all");
    setReportDateFrom("");
    setReportDateTo("");
  }

  function exportReportCsv() {
    const header = ["Name", "Membership Type", "Submitted", "Total Forms", "Participation", "Points", "Status", "Latest Submitted"];
    const rows = filteredReportRows.map((row) => [
      row.name,
      membershipTypeLabel(row.membershipType),
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
                      <article
                        key={form.id}
                        className="available-form-card group flex w-full items-start gap-2 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-blue-50/30 p-4 transition hover:border-blue-200 hover:shadow-md sm:p-5"
                      >
                        <Link href={cardUrl} className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-slate-800 sm:text-lg"><IntercessionRichText value={form.title} /></h3>
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
                              <p className="mt-1 text-sm text-gray-500 line-clamp-2"><IntercessionRichText value={form.description} /></p>
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
                        <button
                          type="button"
                          onClick={() => copyFormLink(form.id)}
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-600 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          aria-label={`Copy link to ${intercessionRichTextToPlainText(form.title)}`}
                          title="Copy form link"
                        >
                          <Link2 className="size-4" aria-hidden="true" />
                        </button>
                      </article>
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
                        href={`/admin/intercession/submissions/${submission.id}`}
                        className="block rounded-xl border border-gray-200 p-4 transition hover:shadow-md sm:p-5"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900"><IntercessionRichText value={submission.formTitle} /></h3>
                            {submission.formDescription && <p className="mt-1 text-sm text-gray-500 line-clamp-2"><IntercessionRichText value={submission.formDescription} /></p>}
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
                            {submission.score === null ? submission.resultStatus : `${submission.score}%`}
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
                <div><h2 className="text-lg font-bold text-gray-900">Manage Forms</h2><div className="mt-2 flex gap-1 rounded-lg bg-slate-100 p-1">{(["active", "archived"] as const).map((status) => <button key={status} type="button" onClick={() => setManageStatus(status)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${manageStatus === status ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white"}`}>{status}{status === "archived" ? ` (${forms.filter((form) => !form.isActive).length})` : ""}</button>)}</div></div>
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
                        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900"><IntercessionRichText value={form.title} /></h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                          <span>{form.createdAt}</span>
                          <span className="size-1 rounded-full bg-gray-300" />
                          <span>{form.questionCount} questions</span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">
                        {form.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>

                    {form.description ? <p className="mt-2 line-clamp-2 text-xs text-gray-600"><IntercessionRichText value={form.description} /></p> : null}

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
                      <button type="button" onClick={() => copyFormLink(form.id)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
                        <Link2 className="size-3.5" aria-hidden="true" />
                        Copy link
                      </button>
                      <button type="button" onClick={() => setPreviewForm(form)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
                        <Presentation className="size-3.5" />
                        Preview
                      </button>
                      {permissions.canEditForms && (
                        <Link href={`/admin/intercession/forms/${form.id}/edit`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700">
                          <Pencil className="size-3.5" />
                          Edit
                        </Link>
                      )}
                      {permissions.canPublishForms && form.isActive ? (
                        <button
                          type="button"
                          onClick={() => runAction(() => toggleSpiritualFormPublish(form.id))}
                          className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          {form.isPublished ? "Unpublish" : "Publish"}
                        </button>
                      ) : null}
                      {permissions.canManageForms || permissions.canEditForms ? <button type="button" onClick={() => runAction(() => setSpiritualFormArchived(form.id, form.isActive))} className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700">{form.isActive ? "Archive" : "Restore"}</button> : null}
                      <button type="button" onClick={() => duplicateForm(form.id)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
                        <Copy className="size-3.5" />
                        Copy
                      </button>
                      {permissions.canViewSubmissions && (
                        <Link href={`/admin/intercession/forms/${form.id}/submissions`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
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
                              message: `Delete "${intercessionRichTextToPlainText(form.title)}" and all of its submissions? This action cannot be undone.`,
                              confirmLabel: "Delete Form",
                              tone: "danger",
                              action: () => deleteSpiritualForm(form.id),
                            });
                          }}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
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
                          <div className="font-semibold text-gray-900"><IntercessionRichText value={form.title} /></div>
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
                          {permissions.canPublishForms && form.isActive ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                runAction(() => toggleSpiritualFormPublish(form.id));
                              }}
                              className="whitespace-nowrap rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-200"
                            >
                              {form.isPublished ? "Unpublish" : "Publish"}
                            </button>
                          ) : (
                            <span
                              className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700"
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
                              onClick={(event) => {
                                event.stopPropagation();
                                copyFormLink(form.id);
                              }}
                              className="inline-flex size-9 items-center justify-center rounded-lg border border-blue-200 text-blue-600 transition hover:bg-blue-50"
                              aria-label={`Copy link to ${intercessionRichTextToPlainText(form.title)}`}
                              title="Copy form link"
                            >
                              <Link2 className="size-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label="Preview form"
                              title="Preview form"
                              className="inline-flex size-9 items-center justify-center rounded-lg border border-blue-200 text-blue-600 transition hover:bg-blue-50"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPreviewForm(form);
                              }}
                            >
                              <Presentation className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateForm(form.id);
                              }}
                              className="inline-flex size-9 items-center justify-center rounded-lg border border-blue-200 text-blue-600 transition hover:bg-blue-50"
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
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-blue-200 text-blue-600 transition hover:bg-blue-50"
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
                                    message: `Delete "${intercessionRichTextToPlainText(form.title)}" and all of its submissions? This action cannot be undone.`,
                                    confirmLabel: "Delete Form",
                                    tone: "danger",
                                    action: () => deleteSpiritualForm(form.id),
                                  });
                                }}
                                className="inline-flex size-9 items-center justify-center rounded-lg border border-blue-200 text-blue-600 transition hover:bg-blue-50"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                            {permissions.canManageForms || permissions.canEditForms ? <button type="button" aria-label={form.isActive ? "Archive form" : "Restore form"} title={form.isActive ? "Archive form" : "Restore form"} onClick={(event) => { event.stopPropagation(); runAction(() => setSpiritualFormArchived(form.id, form.isActive)); }} className="inline-flex size-9 items-center justify-center rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"><Layers className="size-4" /></button> : null}
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
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-[1fr_1fr_180px_180px_1.2fr_auto_auto]">
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
                    <label className="mb-0.5 block text-[11px] font-medium text-gray-700 sm:mb-1 sm:text-xs">Membership type</label>
                    <select
                      value={reportMembershipType}
                      onChange={(event) => setReportMembershipType(event.target.value)}
                      className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:px-3 sm:py-2 sm:text-sm sm:focus:ring-4"
                    >
                      <option value="all">All membership types</option>
                      <option value="permanent">Permanent</option>
                      <option value="temporary">Temporary Member</option>
                      <option value="visitor">Partner</option>
                      <option value="unspecified">Not specified</option>
                    </select>
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
                        placeholder="Search by name..."
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
                          <p className="mt-0.5 text-xs text-gray-500">{membershipTypeLabel(row.membershipType)}</p>
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
                      <th className="px-4 py-3 text-center">Membership Type</th>
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
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{membershipTypeLabel(row.membershipType)}</td>
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
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
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

      {previewForm ? (
        <FormPreviewModal form={previewForm} onClose={() => setPreviewForm(null)} />
      ) : null}

    </div>
  );
}

function FormPreviewModal({ form, onClose }: { form: SpiritualForm; onClose: () => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const dialogRef = useDialogFocusTrap<HTMLElement>(true, onClose);
  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Form preview" className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Presentation className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900">Form Preview</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close form preview">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="flex shrink-0 items-center justify-center gap-1 border-b border-slate-200 bg-slate-50 p-2" role="group" aria-label="Preview device">
          <button type="button" onClick={() => setDevice("desktop")} aria-pressed={device === "desktop"} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${device === "desktop" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white"}`}><Monitor className="size-4" aria-hidden="true" /> Desktop</button>
          <button type="button" onClick={() => setDevice("mobile")} aria-pressed={device === "mobile"} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${device === "mobile" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white"}`}><Smartphone className="size-4" aria-hidden="true" /> Mobile</button>
        </div>
        <div className="overflow-y-auto bg-slate-100 p-2 sm:p-4">
          <div className={`mx-auto transition-all ${device === "mobile" ? "max-w-[390px]" : "max-w-5xl"}`}>
          <IntercessionTakeForm
            form={{ id: form.id, title: form.title, description: form.description }}
            questions={form.questions}
            settings={form.previewSettings}
            alreadySubmitted={false}
            requireRespondentName={!form.previewSettings.require_login}
            preview
            embedded
            onPreviewClose={onClose}
          />
          </div>
        </div>
      </section>
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
            <p className="mt-0.5 text-sm text-slate-500">{membershipTypeLabel(row.membershipType)}</p>
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
                    <p className="text-sm font-semibold text-slate-900"><IntercessionRichText value={form.title} /></p>
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
  const [book, setBook] = useState("");
  const [chapterInput, setChapterInput] = useState("");
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [readingStarted, setReadingStarted] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [verseSearchResults, setVerseSearchResults] = useState<BibleSearchResult[]>([]);
  const [verseSearchTotal, setVerseSearchTotal] = useState(0);
  const [searchingBible, setSearchingBible] = useState(false);
  const [bibleSearchError, setBibleSearchError] = useState("");
  const [searchScope, setSearchScope] = useState<"all" | "old" | "new" | "book">("all");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showBookPicker, setShowBookPicker] = useState(true);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showVersePicker, setShowVersePicker] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [activeVerseNumber, setActiveVerseNumber] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [readerPreferences, setReaderPreferences] = useState<BibleReaderPreferences>(defaultBiblePreferences);
  const [savedVerses, setSavedVerses] = useState<BibleSavedVerse[]>([]);
  const [mobileCompareView, setMobileCompareView] = useState<"primary" | "compare" | "both">("both");
  const [readerAnnouncement, setReaderAnnouncement] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<BibleResult | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const readerScrollRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const readerDialogRef = useDialogFocusTrap<HTMLElement>(showReader && !showAppearance && activeVerseNumber === null, closeReaderToBookSelection);

  const selectedBook = bibleBooks.find((item) => item.code === book) ?? null;
  const chapter = Number(chapterInput) || 0;
  const canGoPrevious = Boolean(selectedBook && chapter > 1);
  const canGoNext = Boolean(selectedBook && chapter >= 1 && chapter < selectedBook.chapters);
  const primaryVersion = bibleVersions.find((item) => item.key === version) ?? bibleVersions[0];
  const useKinyarwanda = ["BYSB", "BIR"].includes(primaryVersion.code.toUpperCase());
  const copy = getBibleReaderCopy(useKinyarwanda);
  const normalizedBookSearch = bookSearch.trim().toLowerCase();
  const scopedBookCode = book;
  const matchingBooks = bibleBooks.filter((item, index) => {
    const matchesScope = searchScope === "all" || (searchScope === "old" && index < 39) || (searchScope === "new" && index >= 39) || (searchScope === "book" && item.code === scopedBookCode);
    return matchesScope && (!normalizedBookSearch || `${item.name} ${item.nameRw}`.toLowerCase().includes(normalizedBookSearch));
  });
  const oldTestamentBooks = matchingBooks.filter((item) => bibleBooks.indexOf(item) < 39);
  const newTestamentBooks = matchingBooks.filter((item) => bibleBooks.indexOf(item) >= 39);

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
  const currentBookmarkedVerses = useMemo(() => new Set(savedVerses.filter((item) => item.version === version && item.book === book && item.chapter === chapter && item.bookmarked).map((item) => item.verse)), [book, chapter, savedVerses, version]);
  const currentHighlightedVerses = useMemo(() => new Set(savedVerses.filter((item) => item.version === version && item.book === book && item.chapter === chapter && item.highlighted).map((item) => item.verse)), [book, chapter, savedVerses, version]);
  const activeVerse = activeVerseNumber === null ? null : result?.primary.verses.find((item) => item.number === activeVerseNumber) ?? null;
  const activeSavedVerse = activeVerseNumber === null ? null : savedVerses.find((item) => item.id === bibleSavedVerseId(version, book, chapter, activeVerseNumber)) ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReaderPreferences(readBibleStorage(BIBLE_PREFERENCES_KEY, defaultBiblePreferences));
      setSavedVerses(readBibleStorage<BibleSavedVerse[]>(BIBLE_SAVED_KEY, []));
      setSearchHistory(readBibleStorage<string[]>(BIBLE_SEARCH_HISTORY_KEY, []));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const query = bookSearch.trim();
    if (query.length < 3) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingBible(true);
      setBibleSearchError("");
      try {
        const params = new URLSearchParams({ version, q: query, scope: searchScope });
        if (searchScope === "book" && scopedBookCode) params.set("book", scopedBookCode);
        const response = await fetch(`/api/bible/search?${params.toString()}`, {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        const data = (await response.json()) as { ok?: boolean; results?: BibleSearchResult[]; total?: number; message?: string };
        if (!response.ok || data.ok === false) throw new Error(data.message || "Unable to search this Bible version right now.");
        setVerseSearchResults(data.results ?? []);
        setVerseSearchTotal(data.total ?? 0);
        if ((data.total ?? 0) > 0) {
          setSearchHistory((current) => {
            const next = [query, ...current.filter((item) => item.toLocaleLowerCase() !== query.toLocaleLowerCase())].slice(0, 6);
            writeBibleStorage(BIBLE_SEARCH_HISTORY_KEY, next);
            return next;
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setVerseSearchResults([]);
        setVerseSearchTotal(0);
        setBibleSearchError(error instanceof Error ? error.message : "Unable to search this Bible version right now.");
      } finally {
        if (!controller.signal.aborted) setSearchingBible(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [bookSearch, scopedBookCode, searchScope, version]);

  useEffect(() => {
    if (!showReader || !result) return;
    const timeout = window.setTimeout(() => {
      if (!selectedVerse) return;
      const isMobileComparison = result.compare && window.matchMedia("(max-width: 1279px)").matches;
      const targetId = isMobileComparison
        ? mobileCompareView === "both" ? `bible-mobile-verse-${selectedVerse}` : `bible-mobile-${mobileCompareView}-verse-${selectedVerse}`
        : `bible-primary-verse-${selectedVerse}`;
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return () => window.clearTimeout(timeout);
  }, [mobileCompareView, result, selectedVerse, showReader]);

  useEffect(() => {
    if (!showChapterPicker && !showVersePicker && !showReader && !showAppearance && activeVerseNumber === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeVerseNumber, showAppearance, showChapterPicker, showVersePicker, showReader]);

  useEffect(() => {
    if (!showAppearance && activeVerseNumber === null) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (activeVerseNumber !== null) setActiveVerseNumber(null);
      else setShowAppearance(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeVerseNumber, showAppearance]);

  async function loadChapter(
    nextChapter: number,
    overrides: { book?: string; version?: string; compare?: string; preserveReading?: boolean; openVersePicker?: boolean } = {},
  ) {
    const targetBookCode = overrides.book ?? book;
    const targetBook = bibleBooks.find((item) => item.code === targetBookCode);
    const targetVersion = overrides.version ?? version;
    const targetCompare = overrides.compare ?? compare;
    if (!targetBook || nextChapter < 1 || nextChapter > targetBook.chapters) {
      setNotice("Please choose a valid book and chapter.");
      return false;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setNotice("");
    if (!overrides.preserveReading) {
      setSelectedVerse(null);
      setReadingStarted(false);
    }
    try {
      const params = new URLSearchParams({
        version: targetVersion,
        book: targetBookCode,
        chapter: String(nextChapter),
      });
      if (targetCompare) params.set("compare", targetCompare);

      const response = await fetch(`/api/bible/chapter?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      const data = (await response.json()) as (BibleResult & { ok?: boolean; message?: string });

      if (!response.ok || data.ok === false) {
        throw new Error(data.message || "Unable to load the selected chapter right now.");
      }

      if (requestId !== requestIdRef.current) return false;
      setBook(targetBookCode);
      setChapterInput(String(nextChapter));
      setSearch("");
      setResult(data);
      setReaderAnnouncement(`${targetBook.name} ${nextChapter} loaded.`);
      if (overrides.openVersePicker !== false) setShowVersePicker(true);
      return true;
    } catch (error) {
      if (requestId !== requestIdRef.current) return false;
      setResult(null);
      setNotice(error instanceof Error ? error.message : "Unable to load the selected chapter right now.");
      return false;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  function changeBook(nextBook: string) {
    const selected = bibleBooks.find((item) => item.code === nextBook);
    if (!selected) return;
    requestIdRef.current += 1;
    setBook(selected.code);
    setChapterInput("");
    setSelectedVerse(null);
    setReadingStarted(false);
    setResult(null);
    setNotice("");
    setSearch("");
    setShowBookPicker(false);
    setShowChapterPicker(true);
    setShowVersePicker(false);
    setShowReader(false);
  }

  function changeBookSearch(nextSearch: string) {
    setBookSearch(nextSearch);
    if (nextSearch.trim().length >= 3) return;
    setVerseSearchResults([]);
    setVerseSearchTotal(0);
    setSearchingBible(false);
    setBibleSearchError("");
  }

  function updateReaderPreferences(next: Partial<BibleReaderPreferences>) {
    setReaderPreferences((current) => {
      const updated = { ...current, ...next };
      writeBibleStorage(BIBLE_PREFERENCES_KEY, updated);
      return updated;
    });
  }

  function openVerseActions(verseNumber: number) {
    const verse = result?.primary.verses.find((item) => item.number === verseNumber);
    if (!verse) return;
    const id = bibleSavedVerseId(version, result?.book ?? book, result?.chapter ?? chapter, verseNumber);
    setSelectedVerse(verseNumber);
    setActiveVerseNumber(verseNumber);
    setReaderAnnouncement("");
    setNoteDraft(savedVerses.find((item) => item.id === id)?.note ?? "");
  }

  function updateSavedVerse(verseNumber: number, change: Partial<Pick<BibleSavedVerse, "bookmarked" | "highlighted" | "note">>) {
    const verse = result?.primary.verses.find((item) => item.number === verseNumber);
    if (!verse || !selectedBook || !result) return;
    const id = bibleSavedVerseId(version, selectedBook.code, result.chapter, verseNumber);
    setSavedVerses((current) => {
      const existing = current.find((item) => item.id === id);
      const updated: BibleSavedVerse = {
        id,
        version,
        versionCode: result.primary.version.code,
        book: selectedBook.code,
        bookName: selectedBook.name,
        bookNameRw: selectedBook.nameRw,
        chapter: result.chapter,
        verse: verseNumber,
        text: verse.text,
        bookmarked: false,
        highlighted: false,
        note: "",
        updatedAt: new Date().toISOString(),
        ...existing,
        ...change,
      };
      const next = !updated.bookmarked && !updated.highlighted && !updated.note.trim()
        ? current.filter((item) => item.id !== id)
        : [updated, ...current.filter((item) => item.id !== id)];
      writeBibleStorage(BIBLE_SAVED_KEY, next);
      return next;
    });
  }

  async function copyActiveVerse() {
    if (!activeVerse || !selectedBook || !result) return;
    await navigator.clipboard.writeText(`${useKinyarwanda ? selectedBook.nameRw : selectedBook.name} ${result.chapter}:${activeVerse.number} — ${activeVerse.text} (${result.primary.version.code})`);
    setReaderAnnouncement(copy.copiedVerse);
  }

  async function shareActiveVerse() {
    if (!activeVerse || !selectedBook || !result) return;
    const shareText = `${useKinyarwanda ? selectedBook.nameRw : selectedBook.name} ${result.chapter}:${activeVerse.number} — ${activeVerse.text} (${result.primary.version.code})`;
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); } catch { return; }
    } else {
      await navigator.clipboard.writeText(shareText);
      setReaderAnnouncement(copy.copiedVerse);
    }
  }

  function handleReaderTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleReaderTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 80 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;
    if (deltaX < 0 && canGoNext) void navigateReaderChapter(chapter + 1);
    if (deltaX > 0 && canGoPrevious) void navigateReaderChapter(chapter - 1);
  }

  function changeVersion(nextVersion: string) {
    requestIdRef.current += 1;
    setVersion(nextVersion);
    if (compare === nextVersion) {
      setCompare("");
    }
    setBook("");
    setChapterInput("");
    setSelectedVerse(null);
    setReadingStarted(false);
    changeBookSearch("");
    setShowBookPicker(true);
    setShowChapterPicker(false);
    setShowVersePicker(false);
    setShowReader(false);
    setSearch("");
    setResult(null);
    setNotice("");
    setLoading(false);
  }

  function changeCompare(nextCompare: string) {
    setCompare(nextCompare);
    if (result && selectedBook && chapter) void loadChapter(chapter, { compare: nextCompare, preserveReading: true, openVersePicker: false });
  }

  function jumpToVerse(verseNumber: number | null) {
    setSearch("");
    setSelectedVerse(verseNumber);
    setReadingStarted(true);
    setShowVersePicker(false);
    setShowReader(true);
  }

  function closeReaderToBookSelection() {
    requestIdRef.current += 1;
    setShowReader(false);
    setShowAppearance(false);
    setActiveVerseNumber(null);
    setShowVersePicker(false);
    setShowChapterPicker(false);
    setShowBookPicker(true);
    setBook("");
    setChapterInput("");
    setSelectedVerse(null);
    setReadingStarted(false);
    changeBookSearch("");
    setSearch("");
    setResult(null);
    setNotice("");
    setLoading(false);
  }

  async function navigateReaderChapter(nextChapter: number) {
    setSelectedVerse(null);
    setReadingStarted(true);
    setSearch("");
    const loaded = await loadChapter(nextChapter, { preserveReading: true, openVersePicker: false });
    if (loaded) readerScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openBibleSearchResult(match: BibleSearchResult) {
    setShowBookPicker(false);
    setShowChapterPicker(false);
    setShowVersePicker(false);
    setShowReader(false);
    setBook(match.book);
    changeBookSearch("");
    setSelectedVerse(match.verse);
    setReadingStarted(true);
    const loaded = await loadChapter(match.chapter, { book: match.book, preserveReading: true, openVersePicker: false });
    if (!loaded) {
      setShowBookPicker(true);
      return;
    }
    setSelectedVerse(match.verse);
    setReadingStarted(true);
    setShowReader(true);
  }

  async function openSavedBibleVerse(item: BibleSavedVerse) {
    setVersion(item.version);
    setBook(item.book);
    setShowSaved(false);
    setShowBookPicker(false);
    const loaded = await loadChapter(item.chapter, { book: item.book, version: item.version, preserveReading: true, openVersePicker: false });
    if (!loaded) return;
    setSelectedVerse(item.verse);
    setReadingStarted(true);
    setShowReader(true);
  }

  return (
    <>
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

        <div className="mt-3 rounded-xl border border-blue-100 bg-white/90 p-3 shadow-sm sm:mt-5 sm:rounded-3xl sm:p-6 lg:p-7">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-900 sm:text-sm">{useKinyarwanda ? "Bibiliya" : "Translation"}</span>
              <select value={version} onChange={(event) => changeVersion(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm sm:focus:ring-4">
                {bibleVersions.map((item) => (
                  <option key={item.key} value={item.key}>{item.code} ({item.label})</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-900 sm:text-sm">{useKinyarwanda ? "Gereranya (ntabwo ari ngombwa)" : "Compare (optional)"}</span>
              <select value={compare} onChange={(event) => changeCompare(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm sm:focus:ring-4">
                <option value="">None</option>
                {bibleVersions.filter((item) => item.key !== version).map((item) => (
                  <option key={item.key} value={item.key}>{item.code} ({item.label})</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700">{primaryVersion.code}</span>
            <span aria-hidden="true">›</span>
            <span className={`rounded-full px-3 py-1.5 ${selectedBook ? "bg-indigo-100 text-indigo-700" : "bg-slate-100"}`}>{selectedBook ? useKinyarwanda ? selectedBook.nameRw : selectedBook.name : copy.chooseBook}</span>
            {chapter ? <><span aria-hidden="true">›</span><span className="rounded-full bg-violet-100 px-3 py-1.5 text-violet-700">{copy.chapter} {chapter}</span></> : null}
            {selectedVerse ? <><span aria-hidden="true">›</span><span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700">{copy.verse} {selectedVerse}</span></> : null}
          </div>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-8 sm:py-6 lg:px-10">
        {notice ? <ActionNotice message={notice} tone="warning" onClose={() => setNotice("")} className="mb-4" /> : null}

        {showBookPicker || !selectedBook ? (
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:rounded-3xl sm:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{copy.stepTwo}</p><div className="mt-2 flex gap-2"><button type="button" aria-pressed={!showSaved} onClick={() => setShowSaved(false)} className={`rounded-lg px-3 py-2 text-sm font-bold ${!showSaved ? "bg-blue-700 text-white" : "bg-white text-slate-600"}`}>{copy.books}</button><button type="button" aria-pressed={showSaved} onClick={() => setShowSaved(true)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${showSaved ? "bg-blue-700 text-white" : "bg-white text-slate-600"}`}><BookMarked className="size-4" aria-hidden="true" />{copy.saved} ({savedVerses.length})</button></div></div>
              {!showSaved ? <label className="relative w-full sm:max-w-sm"><span className="sr-only">{copy.searchBible}</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={bookSearch} onChange={(event) => changeBookSearch(event.target.value)} placeholder={copy.searchBible} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label> : null}
            </div>
            {!showSaved ? <div className="mt-3 flex flex-wrap items-center gap-2"><select value={searchScope} onChange={(event) => setSearchScope(event.target.value as typeof searchScope)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"><option value="all">{copy.allBible}</option><option value="old">{copy.oldTestament}</option><option value="new">{copy.newTestament}</option><option value="book" disabled={!scopedBookCode}>{copy.currentBook}</option></select>{!bookSearch && searchHistory.map((item) => <button key={item} type="button" onClick={() => changeBookSearch(item)} className="rounded-full bg-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-blue-100 hover:text-blue-700">{item}</button>)}</div> : null}
            <div className="mt-4 max-h-[430px] space-y-5 overflow-y-auto pr-1">
              {showSaved ? savedVerses.length ? (
                <section>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{copy.savedVerses}</h4>
                  <div className="space-y-2">
                    {savedVerses.map((item) => (
                      <button key={item.id} type="button" onClick={() => void openSavedBibleVerse(item)} className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300">
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-bold text-blue-700">{useKinyarwanda ? item.bookNameRw : item.bookName} {item.chapter}:{item.verse}</span>
                          <span className="flex gap-1">
                            {item.bookmarked ? <Bookmark className="size-4 fill-blue-600 text-blue-600" aria-label={copy.bookmarked} /> : null}
                            {item.highlighted ? <Highlighter className="size-4 text-amber-500" aria-label={copy.highlighted} /> : null}
                            {item.note ? <StickyNote className="size-4 text-violet-600" aria-label={copy.hasNote} /> : null}
                          </span>
                        </span>
                        <span className="mt-1 block line-clamp-2 text-sm text-slate-600">{item.text}</span>
                        {item.note ? <span className="mt-2 block rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700">{item.note}</span> : null}
                      </button>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">{copy.noSavedVerses}</div>
              ) : null}
              {!showSaved ? <>
              {normalizedBookSearch.length >= 3 ? (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{copy.verseResults}</h4>
                    {searchingBible ? <span className="text-xs text-slate-400">{copy.searching}</span> : verseSearchTotal > 0 ? <span className="text-xs text-slate-400">{verseSearchTotal} {copy.matches}</span> : null}
                  </div>
                  {bibleSearchError ? <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{bibleSearchError}</p> : verseSearchResults.length ? (
                    <div className="space-y-2">
                      {verseSearchResults.map((match) => (
                        <button key={`${match.book}-${match.chapter}-${match.verse}`} type="button" onClick={() => void openBibleSearchResult(match)} className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:px-4">
                          <span className="flex items-center justify-between gap-3">
                            <span className="font-bold text-blue-700">{useKinyarwanda ? match.bookNameRw : match.bookName} {match.chapter}:{match.verse}</span>
                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600">{primaryVersion.code}</span>
                          </span>
                          {match.previousText ? <span className="mt-2 block line-clamp-1 text-xs text-slate-400">← {match.previousText}</span> : null}
                          <span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-600">{highlightBibleSearchTerms(match.text, bookSearch)}</span>
                          {match.nextText ? <span className="mt-1 block line-clamp-1 text-xs text-slate-400">→ {match.nextText}</span> : null}
                        </button>
                      ))}
                      {verseSearchTotal > verseSearchResults.length ? <p className="px-2 text-xs text-slate-400">{copy.showingFirst} {verseSearchResults.length} {copy.matches}.</p> : null}
                    </div>
                  ) : !searchingBible ? <p className="rounded-xl bg-white px-4 py-4 text-sm text-slate-500">{copy.noVerseResults}</p> : <div className="rounded-xl bg-white px-4 py-6 text-center text-sm text-slate-400">{copy.searching}</div>}
                </section>
              ) : null}
              <BibleBookButtonGroup title={copy.oldTestament} books={oldTestamentBooks} selectedBook={book} useKinyarwanda={useKinyarwanda} onSelect={changeBook} />
              <BibleBookButtonGroup title={copy.newTestament} books={newTestamentBooks} selectedBook={book} useKinyarwanda={useKinyarwanda} onSelect={changeBook} />
              {!matchingBooks.length && normalizedBookSearch.length < 3 ? <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-500">{copy.noBooks}</p> : null}
              </> : null}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 sm:rounded-3xl sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">{copy.selectedPassage}</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {useKinyarwanda ? selectedBook.nameRw : selectedBook.name}{chapter ? ` ${chapter}` : ""}{selectedVerse ? `:${selectedVerse}` : ""}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{chapter ? result?.primary.version.label ?? primaryVersion.label : `${selectedBook.chapters} ${selectedBook.chapters === 1 ? copy.chapter.toLowerCase() : copy.chapters.toLowerCase()}`}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                <button type="button" onClick={() => { setShowBookPicker(true); setShowChapterPicker(false); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">{copy.changeBook}</button>
                <button type="button" onClick={() => setShowChapterPicker(true)} className="rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">{chapter ? copy.changeChapter : copy.chooseChapter}</button>
                {result ? <button type="button" onClick={() => setShowVersePicker(true)} className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">{selectedVerse ? copy.changeVerse : copy.chooseVerse}</button> : null}
                {readingStarted && result ? <button type="button" onClick={() => setShowReader(true)} className="rounded-xl bg-blue-700 px-3 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-800">{copy.openReader}</button> : null}
              </div>
            </div>
            {loading ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">{copy.loading}</div> : !chapter ? <div className="mt-4 rounded-2xl border border-dashed border-indigo-200 bg-white/70 px-5 py-8 text-center text-sm text-slate-500">{copy.chapterPrompt}</div> : !readingStarted ? <div className="mt-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 px-5 py-8 text-center text-sm text-slate-600">{copy.chooseStartingVersePrompt}</div> : null}
          </section>
        )}
      </div>
    </div>
    {showChapterPicker && selectedBook ? (
      <BibleNumberPickerModal
        eyebrow={copy.stepThree}
        title={`${useKinyarwanda ? selectedBook.nameRw : selectedBook.name} · ${copy.chooseChapter}`}
        subtitle={`${selectedBook.chapters} ${selectedBook.chapters === 1 ? copy.chapter.toLowerCase() : copy.chapters.toLowerCase()}`}
        numbers={Array.from({ length: selectedBook.chapters }, (_, index) => index + 1)}
        selected={chapter || null}
        tone="indigo"
        onClose={() => setShowChapterPicker(false)}
        onSelect={(number) => { setShowChapterPicker(false); void loadChapter(number); }}
      />
    ) : null}
    {showVersePicker && result ? (
      <BibleNumberPickerModal
        eyebrow={copy.stepFour}
        title={`${useKinyarwanda ? selectedBook?.nameRw : selectedBook?.name} ${result.chapter} · ${copy.chooseVerse}`}
        subtitle={copy.versePickerHint}
        numbers={result.primary.verses.map((verse) => verse.number)}
        selected={selectedVerse}
        tone="amber"
        startLabel={copy.fromBeginning}
        onStart={() => jumpToVerse(null)}
        onClose={() => setShowVersePicker(false)}
        onSelect={jumpToVerse}
      />
    ) : null}
    {showReader && result && selectedBook ? (
      <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
        <button type="button" className="absolute inset-0 cursor-default" aria-label={copy.closeReader} onClick={closeReaderToBookSelection} />
        <section ref={readerDialogRef} role="dialog" aria-modal="true" aria-busy={loading} aria-label={`${useKinyarwanda ? selectedBook.nameRw : selectedBook.name} ${result.chapter}`} className={`relative flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl ${readerPreferences.theme === "dark" ? "bg-slate-950 text-slate-100" : readerPreferences.theme === "sepia" ? "bg-[#f6edda]" : "bg-slate-50"}`}>
          <header className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 sm:py-4 ${readerPreferences.theme === "dark" ? "border-slate-700 bg-slate-900" : readerPreferences.theme === "sepia" ? "border-amber-200 bg-[#fff8e8]" : "border-slate-200 bg-white"}`}>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{copy.fullChapter}</p>
              <h3 className={`truncate text-lg font-bold sm:text-xl ${readerPreferences.theme === "dark" ? "text-white" : "text-slate-900"}`}>{useKinyarwanda ? selectedBook.nameRw : selectedBook.name} {result.chapter}{selectedVerse ? `:${selectedVerse}` : ""}</h3>
            </div>
            <button type="button" onClick={closeReaderToBookSelection} aria-label={copy.closeReader} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="size-5" aria-hidden="true" /></button>
          </header>
          <div className={`shrink-0 border-b px-3 py-3 sm:px-6 sm:py-4 ${readerPreferences.theme === "dark" ? "border-slate-700 bg-slate-900" : readerPreferences.theme === "sepia" ? "border-amber-200 bg-[#f6edda]" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { setShowReader(false); setShowChapterPicker(true); }} aria-label={copy.changeChapter} title={copy.changeChapter} className="inline-flex size-10 items-center justify-center rounded-xl border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"><LayoutGrid className="size-4" aria-hidden="true" /></button>
              <button type="button" onClick={() => { setShowReader(false); setShowVersePicker(true); }} aria-label={copy.changeVerse} title={copy.changeVerse} className="inline-flex size-10 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700 hover:bg-amber-50"><Hash className="size-4" aria-hidden="true" /></button>
              <button type="button" onClick={() => void navigateReaderChapter(chapter - 1)} disabled={!canGoPrevious || loading} aria-label={copy.previous} title={copy.previous} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="size-5" aria-hidden="true" /></button>
              <button type="button" onClick={() => void navigateReaderChapter(chapter + 1)} disabled={!canGoNext || loading} aria-label={copy.next} title={copy.next} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="size-5" aria-hidden="true" /></button>
              <button type="button" onClick={() => setShowAppearance(true)} aria-label={copy.readingAppearance} title={copy.readingAppearance} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"><Type className="size-4" aria-hidden="true" /></button>
            </div>
            {result.compare ? <div className="mt-3 flex rounded-xl border border-slate-200 bg-white p-1 xl:hidden">{(["primary", "compare", "both"] as const).map((mode) => <button key={mode} type="button" aria-pressed={mobileCompareView === mode} onClick={() => setMobileCompareView(mode)} className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-semibold ${mobileCompareView === mode ? "bg-blue-700 text-white" : "text-slate-600"}`}>{mode === "primary" ? result.primary.version.code : mode === "compare" ? result.compare?.version.code : copy.both}</button>)}</div> : null}
            <label className="mt-3 block"><span className="sr-only">{copy.searchLabel}</span><div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"><Search className="size-4 shrink-0 text-blue-700" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder={copy.searchPlaceholder} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" /></div></label>
          </div>
          <div ref={readerScrollRef} onTouchStart={handleReaderTouchStart} onTouchEnd={handleReaderTouchEnd} className="overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6">
            <div className={readerPreferences.width === "focused" ? "mx-auto max-w-3xl" : "mx-auto max-w-6xl"}>
            {result.compare && mobileCompareView === "both" ? (
              <div className="space-y-3 xl:hidden">
                {mobileCompareRows.length ? mobileCompareRows.map((row) => <BibleCompareVerseCard key={row.number} primary={row.primary} compare={row.compare} primaryLabel={result.primary.version.code} compareLabel={result.compare?.version.code ?? "Compare"} selected={selectedVerse === row.number} highlighted={currentHighlightedVerses.has(row.number)} preferences={readerPreferences} onSelect={openVerseActions} />) : <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-500">{copy.noMatchingVerses}</p>}
              </div>
            ) : null}
            {result.compare && mobileCompareView !== "both" ? <div className="xl:hidden"><BibleChapterPanel chapter={mobileCompareView === "primary" ? result.primary : result.compare} verses={mobileCompareView === "primary" ? filteredPrimary : filteredCompare} badge={mobileCompareView === "primary" ? "Primary" : "Compare"} tone={mobileCompareView === "primary" ? "blue" : "amber"} selectedVerse={selectedVerse} idPrefix={`bible-mobile-${mobileCompareView}`} bookmarkedVerses={currentBookmarkedVerses} highlightedVerses={currentHighlightedVerses} preferences={readerPreferences} onVerseSelect={openVerseActions} /></div> : null}
            <div className={`grid gap-4 ${result.compare ? "hidden xl:grid xl:grid-cols-2" : "xl:grid-cols-1"}`}>
              <BibleChapterPanel chapter={result.primary} verses={filteredPrimary} badge="Primary" tone="blue" selectedVerse={selectedVerse} idPrefix="bible-primary" bookmarkedVerses={currentBookmarkedVerses} highlightedVerses={currentHighlightedVerses} preferences={readerPreferences} onVerseSelect={openVerseActions} />
              {result.compare ? <BibleChapterPanel chapter={result.compare} verses={filteredCompare} badge="Compare" tone="amber" selectedVerse={selectedVerse} idPrefix="bible-compare" bookmarkedVerses={currentBookmarkedVerses} highlightedVerses={currentHighlightedVerses} preferences={readerPreferences} onVerseSelect={openVerseActions} /> : null}
            </div>
            </div>
          </div>
        </section>
      </div>
    ) : null}
    {showAppearance ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-5"><button type="button" className="absolute inset-0" aria-label={copy.closeAppearance} onClick={() => setShowAppearance(false)} /><section role="dialog" aria-modal="true" aria-label={copy.readingAppearance} className="relative w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">{copy.readingAppearance}</h3><button type="button" onClick={() => setShowAppearance(false)} className="flex size-10 items-center justify-center rounded-full border border-slate-200"><X className="size-5" /></button></div><div className="mt-5 space-y-5"><div><p className="mb-2 text-sm font-semibold text-slate-700">{copy.fontSize}</p><div className="flex items-center gap-3"><button type="button" onClick={() => updateReaderPreferences({ fontSize: Math.max(16, readerPreferences.fontSize - 1) })} className="size-11 rounded-xl border border-slate-200 text-lg font-bold">−</button><div className="flex-1 text-center text-lg font-bold">{readerPreferences.fontSize}px</div><button type="button" onClick={() => updateReaderPreferences({ fontSize: Math.min(28, readerPreferences.fontSize + 1) })} className="size-11 rounded-xl border border-slate-200 text-lg font-bold">+</button></div></div><BibleSettingButtons label={copy.lineSpacing} values={["compact", "comfortable", "spacious"]} selected={readerPreferences.lineHeight} onSelect={(value) => updateReaderPreferences({ lineHeight: value as BibleReaderPreferences["lineHeight"] })} /><BibleSettingButtons label={copy.readerTheme} values={["light", "sepia", "dark"]} selected={readerPreferences.theme} onSelect={(value) => updateReaderPreferences({ theme: value as BibleReaderPreferences["theme"] })} /><BibleSettingButtons label={copy.textWidth} values={["focused", "wide"]} selected={readerPreferences.width} onSelect={(value) => updateReaderPreferences({ width: value as BibleReaderPreferences["width"] })} /></div></section></div> : null}
    {activeVerse && result && selectedBook ? <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-5"><button type="button" className="absolute inset-0" aria-label={copy.closeVerseActions} onClick={() => setActiveVerseNumber(null)} /><section role="dialog" aria-modal="true" aria-label={`${copy.verse} ${activeVerse.number}`} className="relative w-full max-w-xl rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{useKinyarwanda ? selectedBook.nameRw : selectedBook.name} {result.chapter}:{activeVerse.number}</p><p className="mt-2 text-lg leading-8 text-slate-800">{activeVerse.text}</p></div><button type="button" onClick={() => setActiveVerseNumber(null)} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200"><X className="size-5" /></button></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><button type="button" onClick={() => void copyActiveVerse()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold"><Copy className="size-4" />{copy.copyVerse}</button><button type="button" onClick={() => void shareActiveVerse()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold"><Share2 className="size-4" />{copy.shareVerse}</button><button type="button" onClick={() => updateSavedVerse(activeVerse.number, { bookmarked: !activeSavedVerse?.bookmarked })} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${activeSavedVerse?.bookmarked ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200"}`}><Bookmark className={`size-4 ${activeSavedVerse?.bookmarked ? "fill-current" : ""}`} />{copy.bookmark}</button><button type="button" onClick={() => updateSavedVerse(activeVerse.number, { highlighted: !activeSavedVerse?.highlighted })} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${activeSavedVerse?.highlighted ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200"}`}><Highlighter className="size-4" />{copy.highlight}</button></div><label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-slate-700">{copy.personalNote}</span><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={3} placeholder={copy.notePlaceholder} className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><button type="button" onClick={() => { updateSavedVerse(activeVerse.number, { note: noteDraft.trim() }); setActiveVerseNumber(null); }} className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white">{copy.saveNote}</button>{readerAnnouncement ? <p className="mt-3 text-center text-xs font-semibold text-green-700">{readerAnnouncement}</p> : null}</section></div> : null}
    <p className="sr-only" aria-live="polite">{readerAnnouncement}</p>
    </>
  );
}

function BibleNumberPickerModal({
  eyebrow,
  title,
  subtitle,
  numbers,
  selected,
  tone,
  startLabel,
  onStart,
  onClose,
  onSelect,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  numbers: number[];
  selected: number | null;
  tone: "indigo" | "amber";
  startLabel?: string;
  onStart?: () => void;
  onClose: () => void;
  onSelect: (number: number) => void;
}) {
  const dialogRef = useDialogFocusTrap<HTMLElement>(true, onClose);
  const selectedStyle = tone === "indigo" ? "bg-indigo-700 text-white shadow-md" : "bg-amber-500 text-white shadow-md";
  const idleStyle = tone === "indigo" ? "border-indigo-100 bg-white text-indigo-800 hover:border-indigo-300 hover:bg-indigo-50" : "border-amber-200 bg-white text-amber-800 hover:bg-amber-50";
  const eyebrowStyle = tone === "indigo" ? "text-indigo-600" : "text-amber-700";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close selection" onClick={onClose} />
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className="relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[82dvh] sm:rounded-3xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${eyebrowStyle}`}>{eyebrow}</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close selection" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="size-5" aria-hidden="true" /></button>
        </header>
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-6">
          {startLabel && onStart ? <button type="button" onClick={onStart} className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">{startLabel}</button> : null}
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {numbers.map((number) => (
              <button key={number} type="button" aria-pressed={selected === number} onClick={() => onSelect(number)} className={`aspect-square min-h-11 rounded-xl border text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${selected === number ? selectedStyle : idleStyle}`}>{number}</button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function BibleBookButtonGroup({ title, books, selectedBook, useKinyarwanda, onSelect }: { title: string; books: typeof bibleBooks; selectedBook: string; useKinyarwanda: boolean; onSelect: (bookCode: string) => void }) {
  if (!books.length) return null;
  return (
    <section>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{title}</h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {books.map((item) => (
          <button key={item.code} type="button" aria-pressed={selectedBook === item.code} onClick={() => onSelect(item.code)} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${selectedBook === item.code ? "border-blue-700 bg-blue-700 text-white shadow-md" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"}`}>
            <span className="block truncate">{useKinyarwanda ? item.nameRw : item.name}</span>
            <span className={`mt-0.5 block text-[10px] font-medium ${selectedBook === item.code ? "text-blue-100" : "text-slate-400"}`}>{item.chapters} ch.</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function BibleSettingButtons({ label, values, selected, onSelect }: { label: string; values: string[]; selected: string; onSelect: (value: string) => void }) {
  return <div><p className="mb-2 text-sm font-semibold text-slate-700">{label}</p><div className="grid grid-cols-3 gap-2">{values.map((value) => <button key={value} type="button" aria-pressed={selected === value} onClick={() => onSelect(value)} className={`min-h-11 rounded-xl border px-2 text-xs font-semibold capitalize ${selected === value ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{value}</button>)}</div></div>;
}

function BibleChapterPanel({ chapter, verses, badge, tone, selectedVerse, idPrefix, bookmarkedVerses, highlightedVerses, preferences, onVerseSelect }: { chapter: BibleChapter; verses: BibleVerse[]; badge: string; tone: "blue" | "amber"; selectedVerse: number | null; idPrefix: string; bookmarkedVerses: Set<number>; highlightedVerses: Set<number>; preferences: BibleReaderPreferences; onVerseSelect: (verse: number) => void }) {
  const border = tone === "blue" ? "border-blue-500" : "border-amber-500";
  const badgeStyle = tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
  const panelStyle = preferences.theme === "dark" ? "border-slate-700 bg-slate-900 text-slate-100" : preferences.theme === "sepia" ? "border-amber-200 bg-[#fff8e8]" : "border-slate-200 bg-white";
  const textStyle = preferences.theme === "dark" ? "text-slate-200" : "text-slate-700";
  const lineHeight = preferences.lineHeight === "compact" ? 1.5 : preferences.lineHeight === "spacious" ? 2 : 1.75;

  return (
    <section className={`rounded-2xl border p-3 shadow-sm sm:rounded-3xl sm:p-4 ${panelStyle}`}>
      <div className={`mb-4 flex items-center justify-between gap-3 border-l-4 pl-3 ${border}`}>
        <div className="min-w-0">
          <h4 className={`truncate text-base font-bold sm:text-lg ${preferences.theme === "dark" ? "text-white" : "text-slate-900"}`}>{chapter.version.code} - {chapter.version.label}</h4>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400 sm:tracking-[0.24em]">Translation</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:px-3 ${badgeStyle}`}>{badge}</span>
      </div>
      <div className="space-y-2.5 sm:space-y-3">
        {verses.length ? verses.map((verse) => (
          <button key={verse.number} type="button" id={`${idPrefix}-verse-${verse.number}`} onClick={() => onVerseSelect(verse.number)} style={{ fontSize: preferences.fontSize, lineHeight }} className={`block w-full scroll-mt-24 rounded-xl px-2 py-1 text-left transition motion-reduce:scroll-auto ${textStyle} ${highlightedVerses.has(verse.number) ? "bg-yellow-200/80" : ""} ${selectedVerse === verse.number ? tone === "blue" ? "ring-2 ring-amber-300" : "ring-2 ring-amber-200" : ""}`}>
            <span className={`mr-2 font-bold ${preferences.theme === "dark" ? "text-white" : "text-slate-900"}`}>{verse.number}</span>
            {verse.text}
            {bookmarkedVerses.has(verse.number) ? <Bookmark className="ml-2 inline size-3.5 fill-blue-600 text-blue-600" aria-label="Bookmarked" /> : null}
          </button>
        )) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No verses match your search.</p>
        )}
      </div>
    </section>
  );
}

function BibleCompareVerseCard({ primary, compare, primaryLabel, compareLabel, selected, highlighted, preferences, onSelect }: { primary: BibleVerse; compare?: BibleVerse; primaryLabel: string; compareLabel: string; selected: boolean; highlighted: boolean; preferences: BibleReaderPreferences; onSelect: (verse: number) => void }) {
  const lineHeight = preferences.lineHeight === "compact" ? 1.5 : preferences.lineHeight === "spacious" ? 2 : 1.75;
  return (
    <button type="button" onClick={() => onSelect(primary.number)} id={`bible-mobile-verse-${primary.number}`} className={`block w-full scroll-mt-24 rounded-2xl border p-3 text-left shadow-sm transition ${preferences.theme === "dark" ? "border-slate-700 bg-slate-900" : preferences.theme === "sepia" ? "border-amber-200 bg-[#fff8e8]" : "border-slate-200 bg-white"} ${highlighted ? "bg-yellow-100" : ""} ${selected ? "ring-2 ring-amber-200" : ""}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{primary.number}</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">{primaryLabel}</p>
          <p style={{ fontSize: preferences.fontSize, lineHeight }} className={preferences.theme === "dark" ? "text-slate-200" : "text-slate-800"}>{primary.text}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">{compareLabel}</p>
          <p style={{ fontSize: Math.max(16, preferences.fontSize - 1), lineHeight }} className="text-slate-700">{compare?.text ?? "No verse available in comparison."}</p>
        </div>
      </div>
    </button>
  );
}

function getBibleReaderCopy(useKinyarwanda: boolean) {
  if (useKinyarwanda) {
    return {
      heading: "Soma Bibiliya",
      searchLabel: "Shakisha muri iki gice",
      searchPlaceholder: "Shakisha muri iki gice (nibura inyuguti 2)...",
      loading: "Tegereza...",
      emptyTitle: "Hitamo igice cyo gusoma",
      emptyText: "Hitamo igice hejuru kugira ngo gitangire gusomwa.",
      stepTwo: "",
      chooseBook: "Hitamo igitabo",
      searchBooks: "Shakisha igitabo...",
      searchBible: "Shakisha igitabo, umurongo cyangwa amagambo...",
      verseResults: "Imirongo yabonetse",
      searching: "Birashakishwa...",
      matches: "ibyabonetse",
      showingFirst: "Herekanwa gusa ibya mbere",
      noVerseResults: "Nta gitabo cyangwa umurongo bihuye n'ishakisha muri iyi Bibiliya.",
      oldTestament: "Isezerano rya Kera",
      newTestament: "Isezerano Rishya",
      noBooks: "Nta gitabo gihuye n'ishakisha.",
      stepThree: "Intambwe ya 3 · Hitamo igice",
      chapter: "Igice",
      chapters: "Ibice",
      changeBook: "Hindura igitabo",
      previous: "Igice kibanza",
      next: "Igice gikurikira",
      stepFour: "Intambwe ya 4 · Umurongo",
      verse: "Umurongo",
      chooseVerse: "Hitamo umurongo",
      fromBeginning: "Tangira ku ntangiriro",
      chooseStartingVersePrompt: "Hitamo umurongo",
      selectedPassage: "Ahatoranyijwe",
      chooseChapter: "Hitamo igice",
      changeChapter: "Hindura igice",
      changeVerse: "Hindura umurongo",
      openReader: "Fungura igice",
      chapterPrompt: "Kanda Hitamo igice kugira ngo ukomeze.",
      versePickerHint: "",
      closeReader: "Funga igice",
      fullChapter: "Igice cyose",
      noMatchingVerses: "Nta mirongo ihuye n'ishakisha.",
      books: "Ibitabo",
      saved: "Ibyabitswe",
      allBible: "Bibiliya yose",
      currentBook: "Igitabo giheruka",
      bookmarked: "Byashyizwe mu bubiko",
      highlighted: "Byagaragajwe",
      hasNote: "Bifite inyandiko",
      noSavedVerses: "Nta mirongo urabika, ugaragaza cyangwa wandikaho.",
      savedVerses: "Imirongo yabitswe",
      copiedVerse: "Umurongo wandukuwe.",
      both: "Byombi",
      closeAppearance: "Funga uburyo bwo gusoma",
      readingAppearance: "Uburyo bwo gusoma",
      fontSize: "Ingano y'inyuguti",
      lineSpacing: "Intera y'imirongo",
      readerTheme: "Ibara ryo gusomeramo",
      textWidth: "Ubugari bw'inyandiko",
      closeVerseActions: "Funga ibikorwa by'umurongo",
      copyVerse: "Copy",
      shareVerse: "Share",
      bookmark: "Save",
      highlight: "Highlight",
      personalNote: "Notes",
      notePlaceholder: "Andika icyo wibutse kuri uyu murongo...",
      saveNote: "Bika inyandiko",
    };
  }

  return {
    heading: "Read Bible",
    searchLabel: "Search within this chapter",
    searchPlaceholder: "Search within this chapter (min. 2 characters)...",
    loading: "Loading chapter...",
    emptyTitle: "Choose a passage to begin",
    emptyText: "Choose a chapter above and it will load automatically.",
    stepTwo: "",
    chooseBook: "Choose a book",
    searchBooks: "Search books...",
    searchBible: "Search a book, reference, or verse text...",
    verseResults: "Verse results",
    searching: "Searching...",
    matches: "matches",
    showingFirst: "Showing the first",
    noVerseResults: "No book or verse matches this search in the selected Bible.",
    oldTestament: "Old Testament",
    newTestament: "New Testament",
    noBooks: "No books match your search.",
    stepThree: "Step 3 · Choose a chapter",
    chapter: "Chapter",
    chapters: "Chapters",
    changeBook: "Change book",
    previous: "Previous chapter",
    next: "Next chapter",
    stepFour: "Step 4 · Verse",
    verse: "Verse",
    chooseVerse: "Choose where to start reading",
    fromBeginning: "Start from beginning",
    chooseStartingVersePrompt: "Choose a starting verse above to display the chapter.",
    selectedPassage: "Selected passage",
    chooseChapter: "Choose chapter",
    changeChapter: "Change chapter",
    changeVerse: "Change starting verse",
    openReader: "Open chapter",
    chapterPrompt: "Tap Choose chapter to continue.",
    versePickerHint: "Choose where the chapter should open. Every verse will remain available.",
    closeReader: "Close chapter",
    fullChapter: "Full chapter",
    noMatchingVerses: "No verses match your search.",
    books: "Books",
    saved: "Saved",
    allBible: "Entire Bible",
    currentBook: "Current book",
    bookmarked: "Bookmarked",
    highlighted: "Highlighted",
    hasNote: "Has a note",
    noSavedVerses: "No bookmarked, highlighted, or noted verses yet.",
    savedVerses: "Saved verses",
    copiedVerse: "Verse copied.",
    both: "Both",
    closeAppearance: "Close reading appearance",
    readingAppearance: "Reading appearance",
    fontSize: "Font size",
    lineSpacing: "Line spacing",
    readerTheme: "Reading theme",
    textWidth: "Text width",
    closeVerseActions: "Close verse actions",
    copyVerse: "Copy",
    shareVerse: "Share",
    bookmark: "Bookmark",
    highlight: "Highlight",
    personalNote: "Personal note",
    notePlaceholder: "Write what you want to remember about this verse...",
    saveNote: "Save note",
  };
}

function filterVerses(verses: BibleVerse[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (normalized.length < 2) return verses;
  return verses.filter((verse) => `${verse.number} ${verse.text}`.toLowerCase().includes(normalized));
}

function readBibleStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeBibleStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browser storage may be unavailable. */ }
}

function bibleSavedVerseId(version: string, book: string, chapter: number, verse: number) {
  return `${version}:${book}:${chapter}:${verse}`;
}

function highlightBibleSearchTerms(text: string, query: string) {
  const terms = Array.from(new Set(
    query
      .trim()
      .split(/\s+/)
      .map((term) => term.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
      .filter((term) => term.length > 0),
  )).sort((left, right) => right.length - left.length);

  if (!terms.length) return text;
  const escapedTerms = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const matcher = new RegExp(`(${escapedTerms.join("|")})`, "giu");
  const normalizedTerms = new Set(terms.map((term) => term.toLocaleLowerCase()));

  return text.split(matcher).map((part, index) => normalizedTerms.has(part.toLocaleLowerCase()) ? (
    <mark key={`${part}-${index}`} className="rounded bg-amber-200 px-0.5 font-semibold text-slate-900">{part}</mark>
  ) : part);
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
      <FileText className="mx-auto mb-3 size-10 text-gray-300" aria-hidden="true" />
      <p className="text-sm font-medium text-gray-500">{title}</p>
    </div>
  );
}

function membershipTypeLabel(value: string | null) {
  if (value === "permanent") return "Permanent";
  if (value === "temporary") return "Temporary Member";
  if (value === "visitor") return "Partner";
  return "Not specified";
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
            <h2 className="mt-1 truncate text-lg font-bold text-gray-900"><IntercessionRichText value={form.title} /></h2>
            {form.description ? <p className="mt-1 line-clamp-2 text-sm text-gray-500"><IntercessionRichText value={form.description} /></p> : null}
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
  return <ActionNotice message={notice.message} tone={notice.ok ? "success" : "error"} onClose={onClose} className="mb-4" />;
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
