"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, BookOpen, CalendarCheck, CheckCircle2, ClipboardList, Clock, Edit, FileText, Filter, Gavel, Info, MailOpen, Play, Plus, Save, Search, Smile, Trash2, TriangleAlert, X, XCircle } from "lucide-react";
import {
  approvePermissionRequest,
  completeAttendanceSession,
  deleteDisciplineActionPlan,
  deleteDisciplineActionPlanTask,
  deleteAttendanceSession,
  deleteDisciplineSession,
  deletePermissionRequest,
  rejectPermissionRequest,
  resolveDisciplineRecord,
  saveDisciplineActionPlan,
  saveDisciplineActionPlanTask,
  saveAttendanceSession,
  saveDisciplineSession,
  savePermissionRequest,
} from "@/app/admin/discipline/actions";
import { MobileTabDropdown } from "@/components/mobile-tab-dropdown";

type DisciplineStats = {
  permissionRequests: number;
  attendanceSessions: number;
  disciplineSessions: number;
  avgGoodBehavior: number;
};

type RecentAttendanceSession = {
  sessionDate: string;
  sessionDateLabel: string;
  sessionType: string;
  isCompleted: boolean;
};

type RecentPermission = {
  id: number;
  userName: string;
  userEmail: string;
  type: string;
  reason: string;
  status: string;
  createdAt: string;
};

type AttendanceRecord = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  sessionDate: string;
  sessionDateLabel: string;
  sessionType: string;
  status: string;
  onTime: boolean;
  communicated: boolean;
  disciplinePoints: number;
  lateMinutes: number;
  notes: string | null;
};

type AttendanceSessionState = {
  sessionDate: string;
  sessionType: string;
  isCompleted: boolean;
};

type AttendanceUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
};

type AttendanceDraft = {
  userId: number;
  present: boolean;
  status: string;
  onTime: boolean;
  communicated: boolean;
  discipline: boolean;
  disciplinePoints: number;
  lateMinutes: number;
  notes: string;
  disabled: boolean;
  hasOfficialPermission: boolean;
};

type Permission = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  type: string;
  startDate: string;
  startDateValue: string;
  endDate: string;
  endDateValue: string;
  reason: string;
  status: string;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  createdAtValue: string;
};

type DisciplineRecord = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  title: string;
  description: string | null;
  points: number;
  type: string | null;
  status: string;
  recordedByName: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  resolvedNotes: string | null;
  createdAt: string;
  createdAtValue: string;
};

type DisciplineActionPlanTask = {
  id: number;
  taskName: string;
  activity: string | null;
  targetMilestone: string | null;
  estimatedBudget: number;
  startDate: string | null;
  startDateValue: string;
  deadline: string | null;
  deadlineValue: string;
  priority: string;
  progress: number;
  status: string;
};

type DisciplineActionPlan = {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  startDateValue: string;
  dueDate: string;
  dueDateValue: string;
  status: string;
  priority: string;
  progress: number;
  createdByName: string;
  createdAt: string;
  tasks: DisciplineActionPlanTask[];
};

type DisciplineDraft = {
  userId: number;
  behaviour: "good" | "bad";
  description: string;
  points: number;
};

export function DisciplineClient({
  startDate,
  endDate,
  stats,
  recentAttendanceSessions,
  recentPermissions,
  attendanceRecords,
  attendanceSessionStates,
  users,
  permissions,
  disciplineRecords,
  actionPlans,
}: {
  startDate: string;
  endDate: string;
  stats: DisciplineStats;
  recentAttendanceSessions: RecentAttendanceSession[];
  recentPermissions: RecentPermission[];
  attendanceRecords: AttendanceRecord[];
  attendanceSessionStates: AttendanceSessionState[];
  users: AttendanceUser[];
  permissions: Permission[];
  disciplineRecords: DisciplineRecord[];
  actionPlans: DisciplineActionPlan[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [from, setFrom] = useState(startDate);
  const [to, setTo] = useState(endDate);
  const [attendanceFrom, setAttendanceFrom] = useState(startDate);
  const [attendanceTo, setAttendanceTo] = useState(endDate);
  const [attendanceSessionFilter, setAttendanceSessionFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; confirmText: string; onConfirm: () => Promise<void> | void } | null>(null);
  const [sessionModal, setSessionModal] = useState(false);
  const [sessionReadOnly, setSessionReadOnly] = useState(false);
  const [permissionReviewModal, setPermissionReviewModal] = useState<null | "pending" | "rejected">(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessionType, setSessionType] = useState("");
  const [attendanceDrafts, setAttendanceDrafts] = useState<AttendanceDraft[]>([]);
  const [sessionUserSearch, setSessionUserSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [permissionStatus, setPermissionStatus] = useState("all");
  const [permissionFrom, setPermissionFrom] = useState("");
  const [permissionTo, setPermissionTo] = useState("");
  const [permissionModal, setPermissionModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [selectedPermissionUser, setSelectedPermissionUser] = useState<AttendanceUser | null>(null);
  const [permissionUserSearch, setPermissionUserSearch] = useState("");
  const [permissionType, setPermissionType] = useState("General");
  const [permissionStartDate, setPermissionStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [permissionEndDate, setPermissionEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [permissionReason, setPermissionReason] = useState("");
  const [disciplineFrom, setDisciplineFrom] = useState(startDate);
  const [disciplineTo, setDisciplineTo] = useState(endDate);
  const [disciplineModal, setDisciplineModal] = useState(false);
  const [disciplineDate, setDisciplineDate] = useState(new Date().toISOString().slice(0, 10));
  const [disciplineTitle, setDisciplineTitle] = useState("");
  const [disciplineSearch, setDisciplineSearch] = useState("");
  const [disciplineDrafts, setDisciplineDrafts] = useState<DisciplineDraft[]>([]);
  const [actionPlanModal, setActionPlanModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [editingActionPlan, setEditingActionPlan] = useState<DisciplineActionPlan | null>(null);
  const [editingActionTask, setEditingActionTask] = useState<DisciplineActionPlanTask | null>(null);
  const [taskPlan, setTaskPlan] = useState<DisciplineActionPlan | null>(null);

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "permission", label: "Permission Requests", icon: MailOpen },
    { id: "discipline-records", label: "Discipline Records", icon: BookOpen },
    { id: "action-plans", label: "Action Plans", icon: ClipboardList },
    
  ];

  function applyRange() {
    const params = new URLSearchParams();
    if (from) params.set("start_date", from);
    if (to) params.set("end_date", to);
    router.push(`/admin/discipline?${params.toString()}`);
  }

  const filteredAttendance = attendanceRecords.filter((record) => {
    const matchesFrom = !attendanceFrom || record.sessionDate >= attendanceFrom;
    const matchesTo = !attendanceTo || record.sessionDate <= attendanceTo;
    const matchesSession = !attendanceSessionFilter || record.sessionType === attendanceSessionFilter;
    return matchesFrom && matchesTo && matchesSession;
  });

  const sessionTypes = Array.from(new Set(attendanceRecords.map((record) => record.sessionType))).sort();
  const attendanceSessions = Array.from(
    filteredAttendance
      .reduce((map, record) => {
        const key = `${record.sessionDate}__${record.sessionType}`;
        const session = map.get(key) ?? {
          key,
          date: record.sessionDate,
          dateLabel: record.sessionDateLabel,
          session: record.sessionType,
          present: 0,
          late: 0,
          absent: 0,
          excused: 0,
          total: 0,
          isCompleted: attendanceSessionStates.some((item) => item.sessionDate === record.sessionDate && item.sessionType === record.sessionType && item.isCompleted),
        };
        if (record.status === "present") session.present += 1;
        if (record.status === "late") session.late += 1;
        if (record.status === "absent") session.absent += 1;
        if (record.status === "excused") session.excused += 1;
        session.total += 1;
        map.set(key, session);
        return map;
      }, new Map<string, { key: string; date: string; dateLabel: string; session: string; present: number; late: number; absent: number; excused: number; total: number; isCompleted: boolean }>())
      .values(),
  );
  const presentCount = filteredAttendance.filter((record) => record.status === "present").length;
  const lateCount = filteredAttendance.filter((record) => record.status === "late").length;
  const absentCount = filteredAttendance.filter((record) => record.status === "absent").length;
  const attendanceTotal = filteredAttendance.length;
  const presentAvg = attendanceTotal ? Math.round((presentCount / attendanceTotal) * 100) : 0;
  const lateAvg = attendanceTotal ? Math.round((lateCount / attendanceTotal) * 100) : 0;
  const absentAvg = attendanceTotal ? Math.round((absentCount / attendanceTotal) * 100) : 0;
  const permissionsForSessionDate = permissions.filter((permission) => permission.startDateValue <= sessionDate && permission.endDateValue >= sessionDate);
  const sessionPermissionStats = {
    approved: permissionsForSessionDate.filter((permission) => permission.status === "approved").length,
    pending: permissionsForSessionDate.filter((permission) => permission.status === "pending").length,
    rejected: permissionsForSessionDate.filter((permission) => permission.status === "rejected").length,
  };
  const pendingSessionPermissions = permissionsForSessionDate.filter((permission) => permission.status === "pending");
  const rejectedSessionPermissions = permissionsForSessionDate.filter((permission) => permission.status === "rejected");

  function permissionForUser(userId: number) {
    const userPermissions = permissionsForSessionDate.filter((permission) => permission.userId === userId);
    return (
      userPermissions.find((permission) => permission.status === "approved") ??
      userPermissions.find((permission) => permission.status === "pending") ??
      userPermissions.find((permission) => permission.status === "rejected") ??
      null
    );
  }

  function permissionStatusClass(status: string) {
    if (status === "approved") return "bg-green-100 text-green-700";
    if (status === "pending") return "bg-yellow-100 text-yellow-700";
    if (status === "rejected") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  }

  function totalAttendancePoints(draft: AttendanceDraft) {
    if (draft.hasOfficialPermission) return 3;
    return Number(draft.present) + Number(draft.onTime) + Number(draft.communicated) + Number(draft.discipline);
  }

  const filteredSessionUsers = users.filter((user) => {
    const query = sessionUserSearch.trim().toLowerCase();
    if (!query) return true;
    return user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query);
  });
  const sessionDraftSummary = {
    present: attendanceDrafts.filter((draft) => draft.present).length,
    late: attendanceDrafts.filter((draft) => draft.present && !draft.onTime).length,
    absent: attendanceDrafts.filter((draft) => !draft.present && !draft.hasOfficialPermission).length,
    permission: attendanceDrafts.filter((draft) => draft.hasOfficialPermission).length,
  };

  function exportSessionAttendance() {
    if (attendanceDrafts.length === 0) {
      setNotice({ title: "Notice", message: "No session data to export." });
      return;
    }

    const headers = ["No", "Names", "Permission Status", "Points of Presence", "Timeliness", "Communication", "Discipline", "Total Points"];
    const rows = users.map((user, index) => {
      const draft = attendanceDrafts.find((item) => item.userId === user.id);
      const permission = permissionForUser(user.id);
      return [
        index + 1,
        user.name,
        permission ? `${permission.status} permission ${permission.startDate} - ${permission.endDate}` : "No approved permission",
        draft?.present ? 1 : 0,
        draft?.onTime ? 1 : 0,
        draft?.communicated ? 1 : 0,
        draft?.discipline ? 1 : 0,
        draft ? totalAttendancePoints(draft) : 0,
      ];
    });

    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_session_${sessionDate}_${sessionType.replace(/[^a-zA-Z0-9]+/g, "_") || "attendance"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function openAttendanceSession(date = new Date().toISOString().slice(0, 10), type = "") {
    if (!date || !type.trim()) {
      setNotice({ title: "Notice", message: "Please enter session date and name" });
      return;
    }
    const completed = attendanceSessionStates.some((item) => item.sessionDate === date && item.sessionType === type && item.isCompleted);
    const existing = attendanceRecords.filter((record) => record.sessionDate === date && record.sessionType === type);
    const pendingPermissionsForDate = permissions.filter((permission) => permission.status === "pending" && permission.startDateValue <= date && permission.endDateValue >= date);
    setSessionDate(date);
    setSessionType(type);
    setSessionReadOnly(completed);
    setSessionUserSearch("");
    setAttendanceDrafts(
      users.map((user) => {
        const record = existing.find((item) => item.userId === user.id);
        const permission = permissions.find((item) => item.userId === user.id && item.startDateValue <= date && item.endDateValue >= date);
        const hasApprovedPermission = permission?.status === "approved";
        const present = hasApprovedPermission ? false : record ? ["present", "late"].includes(record.status) : true;
        const discipline = hasApprovedPermission ? true : record ? record.disciplinePoints > 0 : true;
        return {
          userId: user.id,
          present,
          status: present ? "present" : "absent",
          onTime: hasApprovedPermission ? true : record?.onTime ?? true,
          communicated: hasApprovedPermission ? true : record?.communicated ?? true,
          discipline,
          disciplinePoints: discipline ? 1 : 0,
          lateMinutes: record?.lateMinutes ?? 0,
          notes: record?.notes ?? "",
          disabled: hasApprovedPermission,
          hasOfficialPermission: hasApprovedPermission,
        };
      }),
    );
    setSessionModal(true);
    setPermissionReviewModal(!completed && pendingPermissionsForDate.length > 0 ? "pending" : null);
    if (completed) setMessage("This session is completed. You can view it, but editing is locked.");
  }

  function updateDraft(userId: number, patch: Partial<AttendanceDraft>) {
    if (sessionReadOnly) return;
    setAttendanceDrafts((current) => current.map((draft) => (draft.userId === userId ? { ...draft, ...patch } : draft)));
  }

  function buildAttendanceFormData() {
    const formData = new FormData();
    formData.set("sessionDate", sessionDate);
    formData.set("sessionType", sessionType.trim());
    formData.set(
      "recordsJson",
      JSON.stringify(
        attendanceDrafts.map((draft) => ({
          ...draft,
          status: draft.present ? (draft.onTime ? "present" : "late") : draft.status === "excused" ? "excused" : "absent",
          disciplinePoints: draft.discipline ? 1 : 0,
        })),
      ),
    );
    return formData;
  }

  async function submitAttendanceSession(closeAfterSave = false) {
    if (sessionReadOnly) {
      setNotice({ title: "Notice", message: "This session is completed and cannot be edited." });
      return;
    }
    if (!sessionDate || !sessionType.trim()) {
      setNotice({ title: "Notice", message: "Please enter session date and name" });
      return;
    }
    setIsSaving(true);
    const result = await saveAttendanceSession(buildAttendanceFormData());
    setMessage(result.message);
    setIsSaving(false);
    if (result.ok) {
      if (closeAfterSave) setSessionModal(false);
      router.refresh();
    }
  }

  async function completeSession() {
    if (sessionReadOnly) {
      setNotice({ title: "Notice", message: "This session is completed and cannot be edited." });
      return;
    }
    if (!sessionDate || !sessionType.trim()) {
      setNotice({ title: "Notice", message: "Please enter session date and name" });
      return;
    }
    setIsSaving(true);
    const result = await completeAttendanceSession(buildAttendanceFormData());
    setMessage(result.message);
    setIsSaving(false);
    if (result.ok) {
      setSessionModal(false);
      router.refresh();
    }
  }

  async function removeAttendanceSession(date: string, type: string) {
    setConfirmDialog({
      title: "Delete session",
      message: `Delete "${type}" on ${date}?`,
      confirmText: "Delete",
      onConfirm: async () => {
        const result = await deleteAttendanceSession(date, type);
        setMessage(result.message);
        if (result.ok) router.refresh();
      },
    });
  }

  const filteredPermissions = permissions.filter((permission) => {
    const normalized = permissionSearch.trim().toLowerCase();
    const matchesSearch =
      !normalized ||
      [permission.userName, permission.userEmail, permission.reason, permission.type].some((value) => value.toLowerCase().includes(normalized));
    const matchesStatus = permissionStatus === "all" || permission.status === permissionStatus;
    const matchesFrom = !permissionFrom || permission.createdAtValue >= permissionFrom;
    const matchesTo = !permissionTo || permission.createdAtValue <= permissionTo;
    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
  });
  const permissionStats = {
    total: filteredPermissions.length,
    pending: filteredPermissions.filter((permission) => permission.status === "pending").length,
    approved: filteredPermissions.filter((permission) => permission.status === "approved").length,
    rejected: filteredPermissions.filter((permission) => permission.status === "rejected").length,
  };
  const filteredPermissionUsers = users.filter((user) => {
    const normalized = permissionUserSearch.trim().toLowerCase();
    if (normalized.length < 2) return false;
    return [user.name, user.email].some((value) => value.toLowerCase().includes(normalized));
  });

  function openPermissionModal(permission?: Permission) {
    setEditingPermission(permission ?? null);
    const selectedUser = permission ? users.find((user) => user.id === permission.userId) ?? null : null;
    setSelectedPermissionUser(selectedUser);
    setPermissionUserSearch(selectedUser?.name ?? "");
    setPermissionType(permission?.type ?? "General");
    setPermissionStartDate(permission?.startDateValue ?? new Date().toISOString().slice(0, 10));
    setPermissionEndDate(permission?.endDateValue ?? new Date().toISOString().slice(0, 10));
    setPermissionReason(permission?.reason ?? "");
    setPermissionModal(true);
  }

  async function submitPermission() {
    if (!selectedPermissionUser || !permissionStartDate || !permissionEndDate || !permissionReason.trim()) {
      setMessage("User, dates, and reason are required.");
      return;
    }
    setIsSaving(true);
    const formData = new FormData();
    if (editingPermission) formData.set("id", String(editingPermission.id));
    formData.set("userId", String(selectedPermissionUser.id));
    formData.set("type", permissionType);
    formData.set("startDate", permissionStartDate);
    formData.set("endDate", permissionEndDate);
    formData.set("reason", permissionReason);
    const result = await savePermissionRequest(formData);
    setMessage(result.message);
    setIsSaving(false);
    if (result.ok) {
      setPermissionModal(false);
      router.refresh();
    }
  }

  async function runPermissionAction(action: () => Promise<{ ok: boolean; message: string }>) {
    const result = await action();
    setMessage(result.message);
    if (result.ok) router.refresh();
  }

  const filteredDisciplineRecords = disciplineRecords.filter((record) => {
    const matchesFrom = !disciplineFrom || record.createdAtValue >= disciplineFrom;
    const matchesTo = !disciplineTo || record.createdAtValue <= disciplineTo;
    return matchesFrom && matchesTo;
  });

  const disciplineSessions = Array.from(
    filteredDisciplineRecords
      .reduce((map, record) => {
        const key = `${record.createdAtValue}__${record.title}`;
        const session = map.get(key) ?? {
          key,
          date: record.createdAtValue,
          dateLabel: record.createdAt,
          title: record.title,
          good: 0,
          bad: 0,
          records: [] as DisciplineRecord[],
        };
        if (record.type === "positive") session.good += 1;
        else session.bad += 1;
        session.records.push(record);
        map.set(key, session);
        return map;
      }, new Map<string, { key: string; date: string; dateLabel: string; title: string; good: number; bad: number; records: DisciplineRecord[] }>())
      .values(),
  );

  const filteredDisciplineUsers = users.filter((user) => {
    const normalized = disciplineSearch.trim().toLowerCase();
    if (!normalized) return true;
    return [user.name, user.email].some((value) => value.toLowerCase().includes(normalized));
  });

  function openDisciplineSession(date = new Date().toISOString().slice(0, 10), title = "") {
    const existing = disciplineRecords.filter((record) => record.createdAtValue === date && record.title === title);
    setDisciplineDate(date);
    setDisciplineTitle(title || `Discipline Session - ${date}`);
    setDisciplineSearch("");
    setDisciplineDrafts(
      users.map((user) => {
        const record = existing.find((item) => item.userId === user.id);
        const isGood = !record || record.type === "positive";
        return {
          userId: user.id,
          behaviour: isGood ? "good" : "bad",
          description: record?.description ?? (isGood ? "Good" : ""),
          points: record?.points ?? (isGood ? 1 : 0),
        };
      }),
    );
    setDisciplineModal(true);
  }

  function updateDisciplineDraft(userId: number, patch: Partial<DisciplineDraft>) {
    setDisciplineDrafts((current) => current.map((draft) => (draft.userId === userId ? { ...draft, ...patch } : draft)));
  }

  function setAllDiscipline(behaviour: "good" | "bad") {
    setDisciplineDrafts((current) =>
      current.map((draft) => ({
        ...draft,
        behaviour,
        description: behaviour === "good" ? "Good" : "",
        points: behaviour === "good" ? 1 : 0,
      })),
    );
  }

  async function submitDisciplineSession() {
    if (!disciplineTitle.trim()) {
      setNotice({ title: "Notice", message: "Please enter a session title" });
      return;
    }
    if (!disciplineDate) {
      setNotice({ title: "Notice", message: "Please select a date" });
      return;
    }
    setIsSaving(true);
    const formData = new FormData();
    formData.set("sessionDate", disciplineDate);
    formData.set("title", disciplineTitle.trim());
    formData.set("recordsJson", JSON.stringify(disciplineDrafts));
    const result = await saveDisciplineSession(formData);
    setMessage(result.message);
    setIsSaving(false);
    if (result.ok) {
      setDisciplineModal(false);
      router.refresh();
    }
  }

  async function removeDisciplineSession(date: string, title: string) {
    setConfirmDialog({
      title: "Delete session",
      message: `Delete "${title}" on ${date}?`,
      confirmText: "Delete",
      onConfirm: async () => {
        const result = await deleteDisciplineSession(date, title);
        setMessage(result.message);
        if (result.ok) router.refresh();
      },
    });
  }

  async function resolveBadRecord(record: DisciplineRecord) {
    const notes = window.prompt("Resolution notes?") ?? "";
    const result = await resolveDisciplineRecord(record.id, notes);
    setMessage(result.message);
    if (result.ok) router.refresh();
  }

  const actionSummary = {
    overdueTasks: actionPlans.reduce((count, plan) => count + plan.tasks.filter((task) => task.deadlineValue && task.deadlineValue < new Date().toISOString().slice(0, 10) && task.progress < 100).length, 0),
    dueSoonTasks: actionPlans.reduce((count, plan) => {
      const today = new Date();
      const soon = new Date();
      soon.setDate(today.getDate() + 7);
      const todayValue = today.toISOString().slice(0, 10);
      const soonValue = soon.toISOString().slice(0, 10);
      return count + plan.tasks.filter((task) => task.deadlineValue >= todayValue && task.deadlineValue <= soonValue && task.progress < 100).length;
    }, 0),
    myTodoTasks: actionPlans.reduce((count, plan) => count + plan.tasks.filter((task) => task.progress < 100).length, 0),
  };

  function openActionPlan(plan?: DisciplineActionPlan) {
    setEditingActionPlan(plan ?? null);
    setActionPlanModal(true);
  }

  function openTaskModal(plan: DisciplineActionPlan, task?: DisciplineActionPlanTask) {
    setTaskPlan(plan);
    setEditingActionTask(task ?? null);
    setTaskModal(true);
  }

  async function submitActionPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    if (editingActionPlan) formData.set("id", String(editingActionPlan.id));
    const result = await saveDisciplineActionPlan(formData);
    setIsSaving(false);
    if (result.ok) {
      setActionPlanModal(false);
      setEditingActionPlan(null);
      router.refresh();
    }
    setMessage(result.message);
  }

  async function submitActionPlanTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskPlan) return;
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    formData.set("actionPlanId", String(taskPlan.id));
    if (editingActionTask) formData.set("id", String(editingActionTask.id));
    const result = await saveDisciplineActionPlanTask(formData);
    setIsSaving(false);
    if (result.ok) {
      setTaskModal(false);
      setTaskPlan(null);
      setEditingActionTask(null);
      router.refresh();
    }
    setMessage(result.message);
  }

  function removeActionPlan(plan: DisciplineActionPlan) {
    setConfirmDialog({
      title: "Delete action plan",
      message: `Delete "${plan.title}"?`,
      confirmText: "Delete",
      onConfirm: async () => {
        const result = await deleteDisciplineActionPlan(plan.id);
        setMessage(result.message);
        if (result.ok) router.refresh();
      },
    });
  }

  function removeActionPlanTask(task: DisciplineActionPlanTask) {
    setConfirmDialog({
      title: "Delete task",
      message: "Are you sure you want to delete this task?",
      confirmText: "Delete",
      onConfirm: async () => {
        const result = await deleteDisciplineActionPlanTask(task.id);
        setMessage(result.message);
        if (result.ok) router.refresh();
      },
    });
  }

  function exportActionPlanTasks(plan: DisciplineActionPlan) {
    const headers = ["No", "Activity", "Milestone", "Budget", "Deadline"];
    const rows = plan.tasks.map((task, index) => [
      index + 1,
      task.activity ?? task.taskName,
      task.targetMilestone ?? "",
      task.estimatedBudget ? `RWF ${task.estimatedBudget.toLocaleString()}` : "",
      task.deadline ?? "",
    ]);
    const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.title.replace(/[^a-zA-Z0-9]+/g, "_")}_tasks.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 py-4 sm:px-4 sm:py-6">
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-3 md:hidden">
          <MobileTabDropdown tabs={tabs} value={activeTab} onChange={setActiveTab} />
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
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  selected ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 sm:p-6">
          {message && <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">{message}</div>}

          {activeTab === "overview" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Permission Requests" value={stats.permissionRequests} icon={MailOpen} color="indigo" />
                <StatCard label="Attendance Sessions" value={stats.attendanceSessions} icon={CalendarCheck} color="purple" />
                <StatCard label="Discipline Sessions" value={stats.disciplineSessions} icon={Gavel} color="blue" />
                <StatCard label="Avg Good Behavior" value={`${stats.avgGoodBehavior}%`} icon={Smile} color="green" />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <ManagementCard title="Attendance Management" button="Manage Attendance" icon={CalendarCheck} color="sky" onClick={() => setActiveTab("attendance")} />
                <ManagementCard title="Permission Requests" button="Manage Requests" icon={MailOpen} color="emerald" onClick={() => setActiveTab("permission")} />
                <ManagementCard title="Discipline Records" button="Manage Discipline" icon={BookOpen} color="indigo" onClick={() => setActiveTab("discipline-records")} />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gradient-to-r from-white via-slate-50 to-white p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,170px))_auto] sm:items-end">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">From</label>
                    <input value={from} onChange={(event) => setFrom(event.target.value)} type="date" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">To</label>
                    <input value={to} onChange={(event) => setTo(event.target.value)} type="date" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                  <button type="button" onClick={applyRange} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-200">
                    <Filter className="size-4" />
                    Apply Range
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <Gavel className="size-4 text-blue-500" />
                      Recent Attendance Sessions
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {recentAttendanceSessions.length ? (
                      recentAttendanceSessions.map((session) => (
                        <div key={`${session.sessionDate}-${session.sessionType}`} className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-gray-50">
                          <div>
                            <h4 className="text-sm font-medium text-gray-800">{session.sessionType}</h4>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                              <CalendarCheck className="size-3.5" />
                              {session.sessionDateLabel}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs ${session.isCompleted ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {session.isCompleted ? "Completed" : "Open"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <EmptyList label="No attendance sessions found" />
                    )}
                  </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <MailOpen className="size-4 text-green-500" />
                      Recent Permission Requests
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {recentPermissions.length ? (
                      recentPermissions.map((permission) => (
                        <div key={permission.id} className="px-4 py-3 transition hover:bg-gray-50">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <h4 className="truncate text-sm font-medium text-gray-800">{permission.userName}</h4>
                                <StatusBadge status={permission.status} />
                              </div>
                              <p className="line-clamp-1 text-xs text-gray-500">{permission.reason}</p>
                              <p className="mt-1 text-xs text-gray-400">{permission.type} • {permission.createdAt}</p>
                            </div>
                            <button type="button" onClick={() => setActiveTab("permission")} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                              View
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyList label="No permission requests found" />
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : activeTab === "attendance" ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-2xl font-bold text-gray-800">Attendance Management</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <AttendanceStat label="Total Sessions" value={attendanceSessions.length} icon={CalendarCheck} tone="sky" />
                <AttendanceStat label="Timeliness" value={`${presentAvg}%`} icon={CheckCircle2} tone="emerald" />
                <AttendanceStat label="Late Avg" value={`${lateAvg}%`} icon={Clock} tone="amber" />
                <AttendanceStat label="Absent Avg" value={`${absentAvg}%`} icon={XCircle} tone="rose" />
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_minmax(220px,1fr)_auto] md:items-end">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Session Date</label>
                    <input value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} type="date" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Session Name</label>
                    <input value={sessionType} onChange={(event) => setSessionType(event.target.value)} placeholder="Sunday Service" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                  <button type="button" onClick={() => openAttendanceSession(sessionDate, sessionType)} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 md:w-auto">
                    <Play className="mr-2 size-4" />
                    Start Session
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">From</label>
                  <input value={attendanceFrom} onChange={(event) => setAttendanceFrom(event.target.value)} type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">To</label>
                  <input value={attendanceTo} onChange={(event) => setAttendanceTo(event.target.value)} type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">Session</label>
                  <select value={attendanceSessionFilter} onChange={(event) => setAttendanceSessionFilter(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                    <option value="">All Sessions</option>
                    {sessionTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={() => setAttendanceSessionFilter("")} className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-200">
                  Reset
                </button>
                <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-100 px-4 py-2 text-sm text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-200">
                  <FileText className="size-4" />
                  Export
                </button>
              </div>

              <div className="hidden overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm md:block">
                <table className="w-full">
                  <thead className="border-b border-sky-100 bg-sky-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-500">Session</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">Present</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">Absent</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">Rate</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceSessions.length ? attendanceSessions.map((session) => {
                      const present = session.present + session.late;
                      const absent = session.absent + session.excused;
                      const rate = session.total ? Math.round((present / session.total) * 100) : 0;
                      const rateColor = rate >= 75 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-rose-600";
                      return (
                        <tr key={session.key} className="border-b border-gray-100 transition hover:bg-sky-50/50">
                          <td className="px-5 py-3 text-sm text-slate-600">{session.dateLabel}</td>
                          <td className="px-5 py-3 text-sm font-medium text-slate-800">
                            {session.session}
                            {session.isCompleted && <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Completed</span>}
                          </td>
                          <td className="px-5 py-3 text-center text-sm font-semibold text-emerald-600">{present}</td>
                          <td className="px-5 py-3 text-center text-sm text-rose-500">{absent}</td>
                          <td className={`px-5 py-3 text-center text-sm font-semibold ${rateColor}`}>{rate}%</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button type="button" onClick={() => openAttendanceSession(session.date, session.session)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50">View</button>
                              {session.isCompleted && <span className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-400">Completed</span>}
                              <button type="button" onClick={() => removeAttendanceSession(session.date, session.session)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600 hover:bg-red-100">
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400">No attendance records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 md:hidden">
                {attendanceSessions.length ? attendanceSessions.map((session) => {
                  const present = session.present + session.late;
                  const absent = session.absent + session.excused;
                  const rate = session.total ? Math.round((present / session.total) * 100) : 0;
                  return (
                    <div key={session.key} className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{session.session}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {session.isCompleted && <span className="inline-block rounded-full bg-green-100 px-1.5 py-0.5 text-[11px] text-green-700">Completed</span>}
                            <p className="text-xs text-slate-500">{session.dateLabel}</p>
                          </div>
                        </div>
                        <span className="text-base font-bold text-emerald-600">{rate}%</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                        <div className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700"><span className="mr-1">Present</span><strong>{present}</strong></div>
                        <div className="rounded-md bg-rose-50 px-2 py-1 text-rose-700"><span className="mr-1">Absent</span><strong>{absent}</strong></div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <button type="button" onClick={() => openAttendanceSession(session.date, session.session)} className="rounded-md bg-blue-600 px-2 py-1.5 text-xs font-medium text-white">View</button>
                        <button type="button" onClick={() => removeAttendanceSession(session.date, session.session)} className="rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700">Delete</button>
                      </div>
                    </div>
                  );
                }) : <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">No attendance records found</div>}
              </div>
            </div>
          ) : activeTab === "permission" ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <h3 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Permission Management</h3>
                <button onClick={() => openPermissionModal()} className="inline-flex items-center gap-2 self-start rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-200 transition hover:from-blue-700 hover:to-indigo-700">
                  <Plus className="size-4" />
                  New Request
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <AttendanceStat label="Total Requests" value={permissionStats.total} icon={MailOpen} tone="sky" />
                <AttendanceStat label="Pending" value={permissionStats.pending} icon={Clock} tone="amber" />
                <AttendanceStat label="Approved" value={permissionStats.approved} icon={CheckCircle2} tone="emerald" />
                <AttendanceStat label="Rejected" value={permissionStats.rejected} icon={XCircle} tone="rose" />
              </div>

              <div className="grid grid-cols-1 items-end gap-3 rounded-2xl border border-gray-100 bg-white/90 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs text-gray-600">Search</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <input value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} placeholder="Search by name or reason..." className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">Status</label>
                  <select value={permissionStatus} onChange={(event) => setPermissionStatus(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">From</label>
                  <input value={permissionFrom} onChange={(event) => setPermissionFrom(event.target.value)} type="date" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">To</label>
                  <input value={permissionTo} onChange={(event) => setPermissionTo(event.target.value)} type="date" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
                <button onClick={() => { setPermissionSearch(""); setPermissionStatus("all"); setPermissionFrom(""); setPermissionTo(""); }} className="w-full rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200">
                  Reset
                </button>
              </div>

              <div className="space-y-3">
                {filteredPermissions.length ? filteredPermissions.map((permission) => (
                  <article key={permission.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{permission.userName}</h4>
                          <StatusBadge status={permission.status} />
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{permission.type}</span>
                        </div>
                        <p className="text-sm text-gray-500">{permission.userEmail}</p>
                        <p className="mt-2 text-sm text-gray-700">{permission.reason}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                          <span>{permission.startDate} - {permission.endDate}</span>
                          <span>Created {permission.createdAt}</span>
                          {permission.approvedByName && <span>By {permission.approvedByName}</span>}
                          {permission.rejectionReason && <span className="text-red-600">Reason: {permission.rejectionReason}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => openPermissionModal(permission)} className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:text-blue-600" title="Edit">
                          <Edit className="size-4" />
                        </button>
                        {permission.status === "pending" && (
                          <>
                            <button onClick={() => runPermissionAction(() => approvePermissionRequest(permission.id))} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100">Approve</button>
                            <button onClick={() => { const reason = window.prompt("Reject reason?") ?? ""; runPermissionAction(() => rejectPermissionRequest(permission.id, reason)); }} className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100">Reject</button>
                          </>
                        )}
                        <button
                          onClick={() =>
                            setConfirmDialog({
                              title: "Delete permission",
                              message: "Delete this permission request?",
                              confirmText: "Delete",
                              onConfirm: () => runPermissionAction(() => deletePermissionRequest(permission.id)),
                            })
                          }
                          className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                )) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white py-12 text-center">
                    <MailOpen className="mx-auto mb-2 size-10 text-gray-300" />
                    <p className="text-gray-500">No permission requests found</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "discipline-records" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-indigo-50/40 p-3 shadow-sm">
                <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[180px_minmax(220px,1fr)_auto]">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Session Date</label>
                    <input value={disciplineDate} onChange={(event) => setDisciplineDate(event.target.value)} type="date" className="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-gray-800 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Session Title</label>
                    <input value={disciplineTitle} onChange={(event) => setDisciplineTitle(event.target.value)} placeholder="Discipline Session" className="w-full rounded-lg border border-sky-100 bg-white px-3 py-2 text-gray-800 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
                  </div>
                  <button onClick={() => openDisciplineSession(disciplineDate, disciplineTitle)} type="button" className="w-full rounded-lg bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-200">
                    <Play className="mr-2 inline size-4" />
                    Start Discipline Session
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[260px] flex-1">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Time Range</label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input value={disciplineFrom} onChange={(event) => setDisciplineFrom(event.target.value)} type="date" className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500" />
                      <input value={disciplineTo} onChange={(event) => setDisciplineTo(event.target.value)} type="date" className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500" />
                    </div>
                  </div>
                  <button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
                    <FileText className="mr-1 inline size-4" />
                    Export
                  </button>
                </div>
              </div>

              <div className="hidden overflow-hidden rounded-xl bg-white shadow-md md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Session</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Good Behavior</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Bad Behavior</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Good Behavior %</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disciplineSessions.length ? disciplineSessions.map((session) => {
                        const total = session.good + session.bad;
                        const percent = total ? Math.round((session.good / total) * 100) : 100;
                        const badRecords = session.records.filter((record) => record.type !== "positive");
                        return (
                          <tr key={session.key} className="border-b hover:bg-gray-50">
                            <td className="px-6 py-3 text-sm text-gray-600">{session.dateLabel}</td>
                            <td className="px-6 py-3 text-sm font-semibold text-gray-900">{session.title}</td>
                            <td className="px-6 py-3 text-center text-sm font-semibold text-green-600">{session.good}</td>
                            <td className="px-6 py-3 text-center text-sm font-semibold text-red-600">{session.bad}</td>
                            <td className="px-6 py-3 text-center text-sm font-semibold text-blue-600">{percent}%</td>
                            <td className="px-6 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => openDisciplineSession(session.date, session.title)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50">View</button>
                                {badRecords[0] && badRecords[0].status !== "resolved" && (
                                  <button onClick={() => resolveBadRecord(badRecords[0])} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Resolve</button>
                                )}
                                <button onClick={() => removeDisciplineSession(session.date, session.title)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100">
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500">No discipline sessions found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-3 md:hidden">
                {disciplineSessions.length ? disciplineSessions.map((session) => {
                  const total = session.good + session.bad;
                  const percent = total ? Math.round((session.good / total) * 100) : 100;
                  return (
                    <div key={session.key} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{session.title}</p>
                          <p className="text-sm text-slate-500">{session.dateLabel}</p>
                        </div>
                        <span className="text-lg font-bold text-blue-600">{percent}%</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><span className="block text-xs">Good</span><strong>{session.good}</strong></div>
                        <div className="rounded-lg bg-rose-50 p-2 text-rose-700"><span className="block text-xs">Bad</span><strong>{session.bad}</strong></div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button onClick={() => openDisciplineSession(session.date, session.title)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">View</button>
                        <button onClick={() => removeDisciplineSession(session.date, session.title)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">Delete</button>
                      </div>
                    </div>
                  );
                }) : <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">No discipline sessions found</div>}
              </div>
            </div>
          ) : activeTab === "action-plans" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Action Plans</h3>
                </div>
                <button type="button" onClick={() => openActionPlan()} className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition hover:bg-blue-700">
                  <Plus className="size-4" />
                  Create New Action Plan
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <ActionSummaryCard label="Overdue Tasks" value={actionSummary.overdueTasks} tone="rose" />
                <ActionSummaryCard label="To-Be-Overdue Within 7 Days" value={actionSummary.dueSoonTasks} tone="amber" />
                <ActionSummaryCard label="My TO DO" value={actionSummary.myTodoTasks} tone="sky" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {actionPlans.length ? actionPlans.map((plan) => {
                  const totalBudget = plan.tasks.reduce((sum, task) => sum + task.estimatedBudget, 0);
                  const statusColor = plan.status === "completed" ? "bg-green-100 text-green-800" : plan.status === "in_progress" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800";
                  return (
                    <article key={plan.id} className="rounded-lg border bg-white p-4 transition hover:shadow-md">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-gray-800">{plan.title}</h4>
                            <span className={`rounded-full px-2 py-1 text-xs capitalize ${statusColor}`}>{plan.status.replace("_", " ")}</span>
                          </div>
                          <p className="text-sm text-gray-600">{plan.description || "No description"}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                            <span>By {plan.createdByName}</span>
                            <span>Start: {plan.startDate}</span>
                            <span>Completion: {plan.dueDate}</span>
                            <span>Created: {plan.createdAt}</span>
                            {totalBudget > 0 && <span>Budget: RWF {totalBudget.toLocaleString()}</span>}
                          </div>
                          <div className="mt-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-full max-w-sm rounded-full bg-gray-200">
                                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${plan.progress}%` }} />
                              </div>
                              <span className="text-xs font-medium text-gray-500">{plan.progress}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openTaskModal(plan)} className="rounded-lg bg-green-50 px-3 py-2 text-green-700 hover:bg-green-100" title="Create task">
                            <Plus className="size-4" />
                          </button>
                          <button type="button" onClick={() => exportActionPlanTasks(plan)} className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-700 hover:bg-indigo-100" title="Export tasks">
                            <FileText className="size-4" />
                          </button>
                          <button type="button" onClick={() => openActionPlan(plan)} className="rounded-lg border border-gray-200 px-3 py-2 text-blue-600 hover:bg-blue-50" title="Edit">
                            <Edit className="size-4" />
                          </button>
                          <button type="button" onClick={() => removeActionPlan(plan)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100" title="Delete">
                            <Trash2 className="size-4" />
                          </button>
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
                                <td className="px-3 py-2 text-gray-600">{task.estimatedBudget ? `RWF ${task.estimatedBudget.toLocaleString()}` : "-"}</td>
                                <td className="px-3 py-2 text-gray-600">{task.deadline || "-"}</td>
                                <td className="px-3 py-2 text-gray-600">{task.progress}%</td>
                                <td className="px-3 py-2">
                                  <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => openTaskModal(plan, task)} className="text-blue-600 hover:text-blue-700">Edit</button>
                                    <button type="button" onClick={() => removeActionPlanTask(task)} className="text-red-600 hover:text-red-700">Delete</button>
                                  </div>
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">No tasks yet</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="rounded-lg bg-gray-50 py-12 text-center">
                    <ClipboardList className="mx-auto mb-3 size-10 text-gray-300" />
                    <p className="text-gray-500">No action plans found</p>
                    <button type="button" onClick={() => openActionPlan()} className="mt-3 text-sm text-blue-600 hover:text-blue-700">
                      Create your first action plan
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white p-10 text-center">
              <ClipboardList className="mx-auto mb-3 size-10 text-gray-300" aria-hidden="true" />
              <h2 className="text-lg font-bold text-gray-900">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
              <p className="mt-1 text-sm text-gray-500">We will build this tab next.</p>
            </div>
          )}
        </div>
      </div>

      {notice && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-[0_35px_100px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/80">
            <div className="border-b border-slate-100 px-8 pb-5 pt-8 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <Info className="size-8" />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{notice.title}</h3>
            </div>
            <div className="px-8 py-6">
              <p className="text-center text-sm leading-6 text-slate-600">{notice.message}</p>
            </div>
            <div className="border-t border-slate-100 px-8 py-6">
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/25 transition hover:bg-sky-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-[0_35px_100px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/80">
            <div className="border-b border-slate-100 px-8 pb-5 pt-8 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <TriangleAlert className="size-8" />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{confirmDialog.title}</h3>
            </div>
            <div className="px-8 py-6">
              <p className="text-center text-sm leading-6 text-slate-600">{confirmDialog.message}</p>
            </div>
            <div className="border-t border-slate-100 px-8 py-6">
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    await action();
                  }}
                  className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-700"
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sessionModal && (
        <div className="fixed inset-0 z-50 grid place-items-stretch bg-black/40 p-0 sm:place-items-center sm:p-6">
          <div className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:border">
            <div className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  Mark Attendance
                  {sessionReadOnly && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Completed</span>}
                </h2>
                <p className="text-sm text-gray-500">{sessionType || "New Session"} • {sessionDate}</p>
              </div>
              <button type="button" onClick={() => setSessionModal(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3 sm:bg-white sm:p-4">
              {sessionReadOnly && (
                <div className="rounded-lg bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-700">
                  This session is completed and cannot be edited.
                </div>
              )}

              <div className="grid grid-cols-4 gap-1.5 sm:hidden">
                <div className="rounded-lg bg-blue-50 px-2 py-2 text-center">
                  <p className="text-xs text-gray-600">Present</p>
                  <p className="text-base font-bold text-blue-600">{sessionDraftSummary.present}</p>
                </div>
                <div className="rounded-lg bg-amber-50 px-2 py-2 text-center">
                  <p className="text-xs text-gray-600">Late</p>
                  <p className="text-base font-bold text-amber-600">{sessionDraftSummary.late}</p>
                </div>
                <div className="rounded-lg bg-rose-50 px-2 py-2 text-center">
                  <p className="text-xs text-gray-600">Absent</p>
                  <p className="text-base font-bold text-rose-600">{sessionDraftSummary.absent}</p>
                </div>
                <div className="rounded-lg bg-green-50 px-2 py-2 text-center">
                  <p className="text-xs text-gray-600">Permission</p>
                  <p className="text-base font-bold text-green-600">{sessionDraftSummary.permission}</p>
                </div>
              </div>

              <div className="hidden grid-cols-2 gap-3 sm:grid">
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-xs text-gray-600">Total Users</p>
                  <p className="text-xl font-bold text-blue-600">{users.length}</p>
                </div>
                <div className="rounded-xl bg-green-50 p-3">
                  <p className="text-xs text-gray-600">Approved Permissions</p>
                  <p className="text-xl font-bold text-green-600">{sessionPermissionStats.approved}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Session Date</label>
                  <input value={sessionDate} disabled={sessionReadOnly} onChange={(event) => setSessionDate(event.target.value)} type="date" className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Session Name</label>
                  <input value={sessionType} disabled={sessionReadOnly} onChange={(event) => setSessionType(event.target.value)} className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500" />
                </div>
              </div>

              {(sessionPermissionStats.pending > 0 || sessionPermissionStats.rejected > 0) && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700">Permission Status for This Date</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {sessionPermissionStats.pending > 0 && (
                      <button type="button" onClick={() => setPermissionReviewModal("pending")} className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-left transition hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-yellow-700">{sessionPermissionStats.pending}</p>
                            <p className="text-xs text-yellow-600">Pending</p>
                          </div>
                          <div className="flex size-8 items-center justify-center rounded-full bg-yellow-100">
                            <Clock className="size-4 text-yellow-600" />
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-yellow-600">Click to review</p>
                      </button>
                    )}
                    {sessionPermissionStats.rejected > 0 && (
                      <button type="button" onClick={() => setPermissionReviewModal("rejected")} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left transition hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-red-700">{sessionPermissionStats.rejected}</p>
                            <p className="text-xs text-red-600">Rejected</p>
                          </div>
                          <div className="flex size-8 items-center justify-center rounded-full bg-red-100">
                            <XCircle className="size-4 text-red-600" />
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-red-600">Click to view</p>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="relative w-full sm:max-w-sm">
                  <label htmlFor="session_user_search" className="sr-only">Search users</label>
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="session_user_search"
                    type="search"
                    value={sessionUserSearch}
                    onChange={(event) => setSessionUserSearch(event.target.value)}
                    placeholder="Search user..."
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <button type="button" onClick={exportSessionAttendance} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto">
                  <FileText className="size-4" />
                  Export
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-100">
                <div className="border-b bg-gray-50 px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Members Attendance</span>
                  </div>
                </div>
                <div className="hidden max-h-[42vh] overflow-auto md:block">
                  <table className="min-w-full divide-y divide-gray-200 rounded-xl">
                    <thead className="sticky top-0 z-10 bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">User</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Permission</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-gray-500">Present</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-gray-500">On Time</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-gray-500">Communicated</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-gray-500">Discipline</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-gray-500">Total Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredSessionUsers.map((user) => {
                        const draft = attendanceDrafts.find((item) => item.userId === user.id);
                        if (!draft) return null;
                        const permission = permissionForUser(user.id);
                        const totalPoints = totalAttendancePoints(draft);
                        return (
                          <tr key={user.id} className={draft.hasOfficialPermission ? "bg-green-50" : ""}>
                            <td className="px-4 py-3 text-sm text-gray-800">{user.name}</td>
                            <td className="px-4 py-3 text-sm">
                              {permission ? (
                                <div className="space-y-1">
                                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${permissionStatusClass(permission.status)}`}>
                                    {permission.status} permission
                                  </span>
                                  <p className="text-xs font-medium text-gray-700">{permission.startDate} - {permission.endDate}</p>
                                  <p className="text-xs text-gray-500">
                                    {permission.approvedByName ? `Approved by ${permission.approvedByName}` : "Not approved yet"}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-gray-400">No permission</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {sessionReadOnly ? (
                                <ReadonlyYesNo value={draft.present} />
                              ) : (
                                <YesNoButton
                                  value={draft.present}
                                  disabled={draft.disabled}
                                  onToggle={() => updateDraft(user.id, { present: !draft.present, status: !draft.present ? "present" : "absent" })}
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {sessionReadOnly ? <ReadonlyYesNo value={draft.onTime} /> : <YesNoButton value={draft.onTime} disabled={draft.disabled} onToggle={() => updateDraft(user.id, { onTime: !draft.onTime })} />}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {sessionReadOnly ? <ReadonlyYesNo value={draft.communicated} /> : <YesNoButton value={draft.communicated} onToggle={() => updateDraft(user.id, { communicated: !draft.communicated })} />}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {sessionReadOnly ? (
                                <ReadonlyYesNo value={draft.discipline} />
                              ) : (
                                <YesNoButton
                                  value={draft.discipline}
                                  disabled={draft.disabled}
                                  onToggle={() => updateDraft(user.id, { discipline: !draft.discipline, disciplinePoints: !draft.discipline ? 1 : 0 })}
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-base font-bold text-black">{totalPoints}</td>
                          </tr>
                        );
                      })}
                      {filteredSessionUsers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-sm text-gray-500">No users match your search.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 p-2 md:hidden">
                  {filteredSessionUsers.map((user) => {
                    const draft = attendanceDrafts.find((item) => item.userId === user.id);
                    if (!draft) return null;
                    const permission = permissionForUser(user.id);
                    return (
                      <div key={user.id} className="rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm">
                        <div className="mb-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {user.name}
                            {draft.hasOfficialPermission && <span className="ml-2 rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-700">Permission</span>}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          {permission && (
                            <div className="mt-1.5 rounded-lg bg-gray-50 p-1.5 text-xs">
                              <span className={`inline-flex rounded-full px-2 py-0.5 font-medium capitalize ${permissionStatusClass(permission.status)}`}>
                                {permission.status} permission
                              </span>
                              <p className="mt-1 font-medium text-gray-700">{permission.startDate} - {permission.endDate}</p>
                              <p className="text-gray-500">{permission.approvedByName ? `Approved by ${permission.approvedByName}` : "Not approved yet"}</p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-sm">
                          <ToggleField label="Present" value={draft.present} readOnly={sessionReadOnly} disabled={draft.disabled} onToggle={() => updateDraft(user.id, { present: !draft.present, status: !draft.present ? "present" : "absent" })} />
                          <ToggleField label="On Time" value={draft.onTime} readOnly={sessionReadOnly} disabled={draft.disabled} onToggle={() => updateDraft(user.id, { onTime: !draft.onTime })} />
                          <ToggleField label="Communicated" value={draft.communicated} readOnly={sessionReadOnly} onToggle={() => updateDraft(user.id, { communicated: !draft.communicated })} />
                          <ToggleField label="Discipline" value={draft.discipline} readOnly={sessionReadOnly} disabled={draft.disabled} onToggle={() => updateDraft(user.id, { discipline: !draft.discipline, disciplinePoints: !draft.discipline ? 1 : 0 })} />
                          <div className="col-span-2 rounded-lg bg-gray-50 px-2 py-1.5 text-center text-sm font-bold">Total Points: {totalAttendancePoints(draft)}</div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredSessionUsers.length === 0 && <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">No users match your search.</div>}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] sm:flex-row sm:justify-end sm:gap-3 sm:px-5 sm:shadow-none">
              <button type="button" onClick={() => setSessionModal(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700">
                Close
              </button>
              {!sessionReadOnly && (
                <>
                  <button type="button" disabled={isSaving} onClick={completeSession} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    <CheckCircle2 className="size-4" />
                    {isSaving ? "Saving..." : "Complete Session"}
                  </button>
                  <button type="button" disabled={isSaving} onClick={() => submitAttendanceSession(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                    <Save className="size-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {permissionReviewModal && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-3 sm:p-6">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className={`flex items-center justify-between border-b px-6 py-4 ${permissionReviewModal === "pending" ? "bg-yellow-50" : "bg-red-50"}`}>
              <h3 className={`text-lg font-semibold ${permissionReviewModal === "pending" ? "text-yellow-800" : "text-red-800"}`}>
                {permissionReviewModal === "pending" ? "Pending Permission Requests" : "Rejected Permission Requests"}
              </h3>
              <button onClick={() => setPermissionReviewModal(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[calc(80vh-80px)] overflow-y-auto p-6">
              {(permissionReviewModal === "pending" ? pendingSessionPermissions : rejectedSessionPermissions).length ? (
                (permissionReviewModal === "pending" ? pendingSessionPermissions : rejectedSessionPermissions).map((permission) => (
                  <div key={permission.id} className="mb-3 rounded-lg border p-4 transition hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{permission.userName}</h4>
                        <p className="text-xs text-gray-500">{permission.userEmail}</p>
                      </div>
                      <StatusBadge status={permission.status} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      {permission.type.trim().toLowerCase() !== "general" && (
                        <div><span className="text-gray-500">Type:</span> <span className="font-medium">{permission.type}</span></div>
                      )}
                      <div><span className="text-gray-500">Dates:</span> <span className="font-medium">{permission.startDate} - {permission.endDate}</span></div>
                      <div className="col-span-2"><span className="text-gray-500">Reason:</span> {permission.reason}</div>
                    </div>
                    {permission.rejectionReason && (
                      <div className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">
                        <span className="font-medium">Rejection reason:</span> {permission.rejectionReason}
                      </div>
                    )}
                    {permissionReviewModal === "pending" && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button onClick={() => runPermissionAction(() => approvePermissionRequest(permission.id))} className="rounded-lg bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700">Approve</button>
                        <button onClick={() => { const reason = window.prompt("Reject reason?") ?? ""; runPermissionAction(() => rejectPermissionRequest(permission.id, reason)); }} className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">Reject</button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <MailOpen className="mx-auto mb-2 size-8 text-gray-300" />
                  <p>No {permissionReviewModal} permission requests for this date</p>
                </div>
              )}
            </div>
            <div className="flex justify-end border-t bg-gray-50 px-6 py-4">
              <button onClick={() => setPermissionReviewModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100">Close</button>
            </div>
          </div>
        </div>
      )}

      {permissionModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-gray-600/50 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg border bg-white p-4 shadow-lg sm:p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">{editingPermission ? "Edit Permission Request" : "New Permission Request"}</h3>
              <button onClick={() => setPermissionModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">User *</label>
                <div className="relative">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <input
                      value={permissionUserSearch}
                      onChange={(event) => {
                        setPermissionUserSearch(event.target.value);
                        setSelectedPermissionUser(null);
                      }}
                      placeholder="Search by name or email..."
                      className={`w-full rounded-lg border py-2 pl-9 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                        !selectedPermissionUser && permissionUserSearch.length > 0 && permissionUserSearch.length < 2 ? "border-red-300" : "border-gray-300"
                      }`}
                      autoComplete="off"
                    />
                    {selectedPermissionUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPermissionUser(null);
                          setPermissionUserSearch("");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="Clear user"
                      >
                        <XCircle className="size-4" />
                      </button>
                    )}
                  </div>
                  {permissionUserSearch.trim().length >= 2 && !selectedPermissionUser && (
                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {filteredPermissionUsers.length ? (
                        filteredPermissionUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedPermissionUser(user);
                              setPermissionUserSearch(user.name);
                            }}
                            className="flex w-full cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2 text-left transition last:border-0 hover:bg-blue-50"
                          >
                            <span className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
                              {user.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-gray-800">{user.name}</span>
                              <span className="block truncate text-xs text-gray-500">{user.email}</span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">
                          <XCircle className="mx-auto mb-1 size-5 text-gray-300" />
                          <p>No users found</p>
                          <p className="mt-1 text-xs">Try a different name or email</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">Type at least 2 characters to search</p>
              </div>

              <input type="hidden" value={permissionType} readOnly />

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Date *</label>
                <input value={permissionStartDate} onChange={(event) => setPermissionStartDate(event.target.value)} type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">End Date *</label>
                <input value={permissionEndDate} onChange={(event) => setPermissionEndDate(event.target.value)} type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Reason *</label>
                <textarea value={permissionReason} onChange={(event) => setPermissionReason(event.target.value)} rows={4} placeholder="Provide detailed reason for the request..." className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPermissionModal(false)} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={isSaving} onClick={submitPermission} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {isSaving ? "Saving..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionPlanModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-gray-600/50 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-white p-4 shadow-lg sm:p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">{editingActionPlan ? "Edit Action Plan" : "Create Action Plan"}</h3>
              <button type="button" onClick={() => { setActionPlanModal(false); setEditingActionPlan(null); }} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={submitActionPlan} className="mt-4 space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Action Plan Name *</label>
                  <input name="title" defaultValue={editingActionPlan?.title ?? ""} required placeholder="Enter action plan name" className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Date *</label>
                  <input name="startDate" type="date" defaultValue={editingActionPlan?.startDateValue ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Completion Date *</label>
                  <input name="dueDate" type="date" defaultValue={editingActionPlan?.dueDateValue ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea name="description" rows={3} defaultValue={editingActionPlan?.description ?? ""} placeholder="Optional description" className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => { setActionPlanModal(false); setEditingActionPlan(null); }} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">{isSaving ? "Saving..." : "Save Plan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskModal && taskPlan && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-gray-600/50 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-white p-4 shadow-lg sm:p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">{editingActionTask ? `Edit Task for ${taskPlan.title}` : `Create Task for ${taskPlan.title}`}</h3>
              <button type="button" onClick={() => { setTaskModal(false); setTaskPlan(null); setEditingActionTask(null); }} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={submitActionPlanTask} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Action Plan</label>
                <input value={taskPlan.title} readOnly className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Activity *</label>
                <input name="activity" defaultValue={editingActionTask?.activity ?? editingActionTask?.taskName ?? ""} required placeholder="Enter activity" className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Targeted Milestone *</label>
                <input name="targetMilestone" defaultValue={editingActionTask?.targetMilestone ?? ""} required placeholder="Enter targeted milestone" className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                  <input name="startDate" type="date" defaultValue={editingActionTask?.startDateValue ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Estimated Budget *</label>
                  <input name="estimatedBudget" type="number" step="0.01" min="0" defaultValue={editingActionTask?.estimatedBudget ?? ""} required placeholder="0.00" className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Deadline *</label>
                  <input name="deadline" type="date" defaultValue={editingActionTask?.deadlineValue ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Priority *</label>
                  <select name="priority" defaultValue={editingActionTask?.priority ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
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
                  <input name="progress" type="number" min="0" max="100" defaultValue={editingActionTask?.progress ?? 0} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => { setTaskModal(false); setTaskPlan(null); setEditingActionTask(null); }} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">{isSaving ? "Saving..." : editingActionTask ? "Update Task" : "Save Task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {disciplineModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-900/50" onClick={() => setDisciplineModal(false)} />
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-lg font-semibold text-gray-800">Record Discipline</h3>
              <button onClick={() => setDisciplineModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-108px)] overflow-y-auto p-4">
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Session Date *</label>
                  <input value={disciplineDate} onChange={(event) => setDisciplineDate(event.target.value)} type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Session Title *</label>
                  <input value={disciplineTitle} onChange={(event) => setDisciplineTitle(event.target.value)} placeholder="e.g., Sunday Service, Bible Study" className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500" />
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <div className="border-b bg-gray-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Members Discipline</span>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setAllDiscipline("good")} className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200">All Good</button>
                      <button type="button" onClick={() => setAllDiscipline("bad")} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200">All Bad</button>
                    </div>
                  </div>
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <input value={disciplineSearch} onChange={(event) => setDisciplineSearch(event.target.value)} placeholder="Search member by name or email..." className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 border-b bg-white">
                      <tr>
                        <th className="px-2 py-2 text-left">Member</th>
                        <th className="w-24 px-2 py-2 text-center">Behaviour</th>
                        <th className="px-2 py-2 text-left">Description</th>
                        <th className="w-14 px-2 py-2 text-center">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDisciplineUsers.length ? filteredDisciplineUsers.map((user) => {
                        const draft = disciplineDrafts.find((item) => item.userId === user.id);
                        if (!draft) return null;
                        return (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="px-2 py-2 font-medium text-gray-800">{user.name}</td>
                            <td className="px-2 py-2 text-center">
                              <select
                                value={draft.behaviour}
                                onChange={(event) => {
                                  const behaviour = event.target.value as "good" | "bad";
                                  updateDisciplineDraft(user.id, {
                                    behaviour,
                                    description: behaviour === "good" ? "Good" : "",
                                    points: behaviour === "good" ? 1 : 0,
                                  });
                                }}
                                className="w-full rounded border border-gray-300 px-1.5 py-1 text-sm"
                              >
                                <option value="good">Good</option>
                                <option value="bad">Bad</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                value={draft.description}
                                onChange={(event) => updateDisciplineDraft(user.id, { description: event.target.value })}
                                readOnly={draft.behaviour === "good"}
                                placeholder={draft.behaviour === "good" ? "Good" : "Enter description..."}
                                className={`w-full rounded border border-gray-300 px-2 py-1 text-sm ${draft.behaviour === "good" ? "bg-gray-100" : ""}`}
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <span className={`font-semibold ${draft.behaviour === "good" ? "text-green-600" : "text-red-600"}`}>{draft.points}</span>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400">No members found matching your search</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t bg-gray-50 px-4 py-3">
              <button onClick={() => setDisciplineModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100">Cancel</button>
              <button disabled={isSaving} onClick={submitDisciplineSession} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60">
                <Save className="mr-1 inline size-4" />
                {isSaving ? "Saving..." : "Save Records"}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: typeof MailOpen; color: "indigo" | "purple" | "blue" | "green" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-500",
    purple: "bg-purple-50 text-purple-500",
    blue: "bg-blue-50 text-blue-500",
    green: "bg-green-50 text-green-500",
  };
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-lg ${colors[color]}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function ActionSummaryCard({ label, value, tone }: { label: string; value: number; tone: "rose" | "amber" | "sky" }) {
  const colors = {
    rose: "border-rose-100 from-white via-rose-50 to-red-50/40 text-rose-600 bg-rose-100 ring-rose-200",
    amber: "border-amber-100 from-white via-amber-50 to-yellow-50/50 text-amber-600 bg-amber-100 ring-amber-200",
    sky: "border-sky-100 from-white via-sky-50 to-blue-50/40 text-sky-600 bg-sky-100 ring-sky-200",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm ${colors[tone]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-lg ring-1 ${colors[tone]}`}>
          <ClipboardList className="size-5" />
        </div>
      </div>
    </div>
  );
}

function AttendanceStat({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: typeof MailOpen; tone: "sky" | "emerald" | "amber" | "rose" }) {
  const colors = {
    sky: "border-sky-100 from-white via-sky-50 to-blue-50/40 text-sky-700 bg-sky-100 ring-sky-200",
    emerald: "border-emerald-100 from-white via-emerald-50 to-teal-50/40 text-emerald-700 bg-emerald-100 ring-emerald-200",
    amber: "border-amber-100 from-white via-amber-50 to-yellow-50/50 text-amber-700 bg-amber-100 ring-amber-200",
    rose: "border-rose-100 from-white via-rose-50 to-red-50/40 text-rose-700 bg-rose-100 ring-rose-200",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-3 shadow-sm sm:p-4 ${colors[tone]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-bold text-slate-900 sm:text-2xl">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-lg ring-1 ${colors[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function YesNoButton({ value, disabled = false, onToggle }: { value: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`min-h-8 min-w-12 rounded-md px-2.5 py-1.5 text-xs font-bold text-white transition sm:min-h-10 sm:min-w-16 sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm ${
        value ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 hover:bg-gray-400"
      } ${disabled ? "cursor-not-allowed opacity-80" : ""}`}
    >
      {value ? "Yes" : "No"}
    </button>
  );
}

function ReadonlyYesNo({ value }: { value: boolean }) {
  return <span className="text-sm font-medium text-gray-700">{value ? "Yes" : "No"}</span>;
}

function ToggleField({ label, value, disabled = false, readOnly = false, onToggle }: { label: string; value: boolean; disabled?: boolean; readOnly?: boolean; onToggle: () => void }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-gray-100 px-2 py-1.5 sm:min-h-12 sm:gap-3 sm:px-3 sm:py-2">
      <span className="text-xs font-medium text-gray-700 sm:text-sm">{label}</span>
      {readOnly ? <ReadonlyYesNo value={value} /> : <YesNoButton value={value} disabled={disabled} onToggle={onToggle} />}
    </div>
  );
}

function ManagementCard({ title, button, icon: Icon, color, onClick }: { title: string; button: string; icon: typeof MailOpen; color: "sky" | "emerald" | "indigo"; onClick: () => void }) {
  const colors = {
    sky: "border-sky-100 from-white via-sky-50 to-cyan-50/40 text-sky-700 bg-sky-100 ring-sky-200 hover:bg-sky-200",
    emerald: "border-emerald-100 from-white via-emerald-50 to-teal-50/40 text-emerald-700 bg-emerald-100 ring-emerald-200 hover:bg-emerald-200",
    indigo: "border-indigo-100 from-white via-indigo-50 to-violet-50/30 text-indigo-700 bg-indigo-100 ring-indigo-200 hover:bg-indigo-200",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ${colors[color]}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex size-11 items-center justify-center rounded-xl ring-1 ${colors[color]}`}>
          <Icon className="size-4" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <button type="button" onClick={onClick} className={`w-full rounded-xl py-2 text-sm font-medium ring-1 transition ${colors[color]}`}>
        {button}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === "approved" ? "bg-green-100 text-green-700" : status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${color}`}>{status}</span>;
}

function EmptyList({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-sm text-gray-400">
      <XCircle className="mx-auto mb-2 size-7" />
      <p>{label}</p>
    </div>
  );
}
