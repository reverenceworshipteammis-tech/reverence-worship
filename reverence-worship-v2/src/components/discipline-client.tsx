"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, BookOpen, CalendarCheck, CheckCircle2, ClipboardList, Clock, Edit, FileText, Filter, Gavel, MailOpen, Play, Plus, Save, Search, Smile, Trash2, X, XCircle } from "lucide-react";
import {
  approvePermissionRequest,
  completeAttendanceSession,
  deleteAttendanceSession,
  deleteDisciplineSession,
  deletePermissionRequest,
  rejectPermissionRequest,
  resolveDisciplineRecord,
  saveAttendanceSession,
  saveDisciplineSession,
  savePermissionRequest,
} from "@/app/admin/discipline/actions";

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
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [from, setFrom] = useState(startDate);
  const [to, setTo] = useState(endDate);
  const [attendanceFrom, setAttendanceFrom] = useState(startDate);
  const [attendanceTo, setAttendanceTo] = useState(endDate);
  const [attendanceSessionFilter, setAttendanceSessionFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sessionModal, setSessionModal] = useState(false);
  const [permissionReviewModal, setPermissionReviewModal] = useState<null | "pending" | "rejected">(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessionType, setSessionType] = useState("");
  const [attendanceDrafts, setAttendanceDrafts] = useState<AttendanceDraft[]>([]);
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

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "permission", label: "Permission Requests", icon: MailOpen },
    { id: "discipline-records", label: "Discipline Records", icon: BookOpen },
    { id: "action-plans", label: "Action Plans", icon: ClipboardList },
    { id: "reports", label: "Reports", icon: FileText },
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

  function openAttendanceSession(date = new Date().toISOString().slice(0, 10), type = "") {
    const completed = attendanceSessionStates.some((item) => item.sessionDate === date && item.sessionType === type && item.isCompleted);
    if (completed) {
      setMessage("This session is completed and cannot be edited.");
      return;
    }
    const existing = attendanceRecords.filter((record) => record.sessionDate === date && record.sessionType === type);
    const pendingPermissionsForDate = permissions.filter((permission) => permission.status === "pending" && permission.startDateValue <= date && permission.endDateValue >= date);
    setSessionDate(date);
    setSessionType(type);
    setAttendanceDrafts(
      users.map((user) => {
        const record = existing.find((item) => item.userId === user.id);
        const permission = permissions.find((item) => item.userId === user.id && item.startDateValue <= date && item.endDateValue >= date);
        const hasApprovedPermission = permission?.status === "approved";
        const present = record ? ["present", "late"].includes(record.status) : true;
        const discipline = record ? record.disciplinePoints > 0 : true;
        return {
          userId: user.id,
          present,
          status: present ? "present" : "absent",
          onTime: record?.onTime ?? true,
          communicated: record?.communicated ?? true,
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
    setPermissionReviewModal(pendingPermissionsForDate.length > 0 ? "pending" : null);
  }

  function updateDraft(userId: number, patch: Partial<AttendanceDraft>) {
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
    if (!sessionDate || !sessionType.trim()) {
      setMessage("Session date and name are required.");
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
    if (!sessionDate || !sessionType.trim()) {
      setMessage("Session date and name are required.");
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
    if (!window.confirm(`Delete "${type}" on ${date}?`)) return;
    const result = await deleteAttendanceSession(date, type);
    setMessage(result.message);
    if (result.ok) router.refresh();
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
    if (!disciplineDate || !disciplineTitle.trim()) {
      setMessage("Session date and title are required.");
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
    if (!window.confirm(`Delete "${title}" on ${date}?`)) return;
    const result = await deleteDisciplineSession(date, title);
    setMessage(result.message);
    if (result.ok) router.refresh();
  }

  async function resolveBadRecord(record: DisciplineRecord) {
    const notes = window.prompt("Resolution notes?") ?? "";
    const result = await resolveDisciplineRecord(record.id, notes);
    setMessage(result.message);
    if (result.ok) router.refresh();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-2 py-4 sm:px-4 sm:py-6">
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <nav className="flex flex-wrap border-b border-gray-200">
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
                              {session.isCompleted ? (
                                <span className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-400">Locked</span>
                              ) : (
                                <button type="button" onClick={() => openAttendanceSession(session.date, session.session)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50">View</button>
                              )}
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

              <div className="space-y-3 md:hidden">
                {attendanceSessions.length ? attendanceSessions.map((session) => {
                  const present = session.present + session.late;
                  const absent = session.absent + session.excused;
                  const rate = session.total ? Math.round((present / session.total) * 100) : 0;
                  return (
                    <div key={session.key} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{session.session}</p>
                          {session.isCompleted && <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Completed</span>}
                          <p className="text-sm text-slate-500">{session.dateLabel}</p>
                        </div>
                        <span className="text-lg font-bold text-emerald-600">{rate}%</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><span className="block text-xs">Present</span><strong>{present}</strong></div>
                        <div className="rounded-lg bg-rose-50 p-2 text-rose-700"><span className="block text-xs">Absent</span><strong>{absent}</strong></div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {session.isCompleted ? (
                          <span className="rounded-lg border border-gray-200 px-3 py-2 text-center text-sm font-medium text-gray-400">Locked</span>
                        ) : (
                          <button type="button" onClick={() => openAttendanceSession(session.date, session.session)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">View</button>
                        )}
                        <button type="button" onClick={() => removeAttendanceSession(session.date, session.session)} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">Delete</button>
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
                        <button onClick={() => { if (window.confirm("Delete this permission request?")) runPermissionAction(() => deletePermissionRequest(permission.id)); }} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100" title="Delete">
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
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white p-10 text-center">
              <ClipboardList className="mx-auto mb-3 size-10 text-gray-300" aria-hidden="true" />
              <h2 className="text-lg font-bold text-gray-900">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
              <p className="mt-1 text-sm text-gray-500">We will build this tab next.</p>
            </div>
          )}
        </div>
      </div>

      {sessionModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mark Attendance</h2>
                <p className="text-sm text-gray-500">{sessionType || "New Session"} • {sessionDate}</p>
              </div>
              <button type="button" onClick={() => setSessionModal(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Session Date</label>
                  <input value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} type="date" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Session Name</label>
                  <input value={sessionType} onChange={(event) => setSessionType(event.target.value)} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
              </div>

              {(sessionPermissionStats.approved > 0 || sessionPermissionStats.pending > 0 || sessionPermissionStats.rejected > 0) && (
                <div className="mb-6">
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">Permission Status for This Date</h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {sessionPermissionStats.approved > 0 && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-green-700">{sessionPermissionStats.approved}</p>
                            <p className="text-xs text-green-600">Approved</p>
                          </div>
                          <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle2 className="size-4 text-green-600" />
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-green-600">Auto-marked as On Time</p>
                      </div>
                    )}
                    {sessionPermissionStats.pending > 0 && (
                      <button type="button" onClick={() => setPermissionReviewModal("pending")} className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-left transition hover:shadow-md">
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
                      <button type="button" onClick={() => setPermissionReviewModal("rejected")} className="rounded-lg border border-red-200 bg-red-50 p-3 text-left transition hover:shadow-md">
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

              <div className="overflow-hidden rounded-xl border border-gray-100">
                <div className="border-b bg-gray-50 px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Members Attendance</span>
                  </div>
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-gray-200 rounded-xl">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">User</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">Permission</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-500">Present</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-500">On Time</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-500">Communicated</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-500">Discipline</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-gray-500">Total Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {users.map((user) => {
                        const draft = attendanceDrafts.find((item) => item.userId === user.id);
                        if (!draft) return null;
                        const permission = permissionsForSessionDate.find((item) => item.userId === user.id && item.status === "approved");
                        const totalPoints = Number(draft.present) + Number(draft.onTime) + Number(draft.communicated) + Number(draft.discipline);
                        return (
                          <tr key={user.id} className={draft.hasOfficialPermission ? "bg-green-50" : ""}>
                            <td className="px-5 py-4 text-sm text-gray-800">{user.name}</td>
                            <td className="px-5 py-4 text-sm text-gray-400">
                              {permission ? (
                                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Approved permission</span>
                              ) : (
                                "No approved permission"
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <YesNoButton
                                value={draft.present}
                                disabled={draft.disabled}
                                onToggle={() => updateDraft(user.id, { present: !draft.present, status: !draft.present ? "present" : "absent" })}
                              />
                            </td>
                            <td className="px-5 py-4 text-center">
                              <YesNoButton value={draft.onTime} disabled={draft.disabled} onToggle={() => updateDraft(user.id, { onTime: !draft.onTime })} />
                            </td>
                            <td className="px-5 py-4 text-center">
                              <YesNoButton value={draft.communicated} onToggle={() => updateDraft(user.id, { communicated: !draft.communicated })} />
                            </td>
                            <td className="px-5 py-4 text-center">
                              <YesNoButton
                                value={draft.discipline}
                                disabled={draft.disabled}
                                onToggle={() => updateDraft(user.id, { discipline: !draft.discipline, disciplinePoints: !draft.discipline ? 1 : 0 })}
                              />
                            </td>
                            <td className="px-5 py-4 text-center text-base font-bold text-black">{totalPoints}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 p-3 md:hidden">
                  {users.map((user) => {
                    const draft = attendanceDrafts.find((item) => item.userId === user.id);
                    if (!draft) return null;
                    return (
                      <div key={user.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {user.name}
                            {draft.hasOfficialPermission && <span className="ml-2 rounded-full bg-green-100 px-1.5 py-0.5 text-xs text-green-700">Permission</span>}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <ToggleField label="Present" value={draft.present} disabled={draft.disabled} onToggle={() => updateDraft(user.id, { present: !draft.present, status: !draft.present ? "present" : "absent" })} />
                          <ToggleField label="On Time" value={draft.onTime} disabled={draft.disabled} onToggle={() => updateDraft(user.id, { onTime: !draft.onTime })} />
                          <ToggleField label="Communicated" value={draft.communicated} onToggle={() => updateDraft(user.id, { communicated: !draft.communicated })} />
                          <ToggleField label="Discipline" value={draft.discipline} disabled={draft.disabled} onToggle={() => updateDraft(user.id, { discipline: !draft.discipline, disciplinePoints: !draft.discipline ? 1 : 0 })} />
                          <div className="col-span-2 rounded-lg bg-gray-50 p-2 text-center font-bold">Total Points: {Number(draft.present) + Number(draft.onTime) + Number(draft.communicated) + Number(draft.discipline)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setSessionModal(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700">
                Close
              </button>
              <button type="button" disabled={isSaving} onClick={completeSession} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                <CheckCircle2 className="size-4" />
                {isSaving ? "Saving..." : "Complete Session"}
              </button>
              <button type="button" disabled={isSaving} onClick={() => submitAttendanceSession(false)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                <Save className="size-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
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

      {disciplineModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">Record Discipline</h3>
              <button onClick={() => setDisciplineModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[calc(92vh-140px)] overflow-y-auto p-6">
              <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <div className="border-b bg-gray-50 px-4 py-2">
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
                        <th className="px-4 py-2 text-left">Member</th>
                        <th className="w-28 px-4 py-2 text-center">Behaviour</th>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="w-20 px-4 py-2 text-center">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDisciplineUsers.length ? filteredDisciplineUsers.map((user) => {
                        const draft = disciplineDrafts.find((item) => item.userId === user.id);
                        if (!draft) return null;
                        return (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <p className="font-medium text-gray-800">{user.name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </td>
                            <td className="px-4 py-2 text-center">
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
                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                              >
                                <option value="good">Good</option>
                                <option value="bad">Bad</option>
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                value={draft.description}
                                onChange={(event) => updateDisciplineDraft(user.id, { description: event.target.value })}
                                readOnly={draft.behaviour === "good"}
                                placeholder={draft.behaviour === "good" ? "Good" : "Enter description..."}
                                className={`w-full rounded border border-gray-300 px-2 py-1 text-sm ${draft.behaviour === "good" ? "bg-gray-100" : ""}`}
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <input
                                value={draft.points}
                                onChange={(event) => updateDisciplineDraft(user.id, { points: Number(event.target.value) })}
                                type="number"
                                className={`w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm font-semibold ${draft.behaviour === "good" ? "text-green-600" : "text-red-600"}`}
                              />
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
            <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
              <button onClick={() => setDisciplineModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100">Cancel</button>
              <button disabled={isSaving} onClick={submitDisciplineSession} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60">
                <Save className="mr-1 inline size-4" />
                {isSaving ? "Saving..." : "Save Records"}
              </button>
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
      className={`min-w-12 rounded-md px-3 py-2 text-xs font-bold text-white transition ${
        value ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 hover:bg-gray-400"
      } ${disabled ? "cursor-not-allowed opacity-80" : ""}`}
    >
      {value ? "Yes" : "No"}
    </button>
  );
}

function ToggleField({ label, value, disabled = false, onToggle }: { label: string; value: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
      <span className="text-gray-600">{label}</span>
      <YesNoButton value={value} disabled={disabled} onToggle={onToggle} />
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
