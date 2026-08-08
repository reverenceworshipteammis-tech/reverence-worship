"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionNotice } from "@/components/action-notice";
import {
  CheckCircle2,
  Download,
  History,
  Search,
  ShieldCheck,
  UserPlus,
  X,
  XCircle,
} from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  approveProbationDecision,
  enrollProbation,
  extendProbation,
  rejectProbationDecision,
  reopenProbation,
  requestProbationDecision,
  updateProbation,
  type ProbationActionResult,
} from "@/app/admin/probation/actions";
import { useAppDialog } from "@/components/app-dialog-provider";
import { DisciplineWorkspaceTabs } from "@/components/discipline-workspace-tabs";
import type { ProbationMonitoring } from "@/lib/probation-data";
import { addCalendarMonths, PROBATION_GOOD_THRESHOLD } from "@/lib/probation-rules";

type Person = { id: number; name: string; email: string };

export type ProbationRow = {
  id: number;
  member: Person & { phone: string | null; status: string };
  state: "active" | "extended" | "completed" | "terminated";
  originalStartDate: string;
  originalExpectedEndDate: string;
  currentExpectedEndDate: string;
  daysRemaining: number;
  isOverdue: boolean;
  dueWithin14Days: boolean;
  memberVisibleSummary: string | null;
  confidentialComments: string | null;
  finalDecisionComments: string | null;
  decisionDate: string | null;
  decisionMakerName: string | null;
  createdByName: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
  monitoring: ProbationMonitoring;
  canApprovePendingDecision: boolean;
  pendingApproverName: string | null;
  extensions: Array<{
    id: number;
    previousExpectedEndDate: string;
    newExpectedEndDate: string;
    reason: string;
    comments: string | null;
    extendedByName: string;
    extensionDate: string;
  }>;
  decisions: Array<{
    id: number;
    requestedState: "completed" | "terminated";
    reason: string;
    comments: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    requestedByName: string;
    requestedAt: string;
    reviewedByName: string | null;
    reviewedAt: string | null;
    reviewComments: string | null;
  }>;
};

type Props = {
  rows: ProbationRow[];
  eligibleMembers: Person[];
  decisionApprovers: Person[];
  defaultDurationMonths: number;
  initialRecordId: number | null;
  initialStatus: string;
  showDisciplineTabs: boolean;
  permissions: {
    enroll: boolean;
    update: boolean;
    viewConfidential: boolean;
    extend: boolean;
    complete: boolean;
    terminate: boolean;
    reopen: boolean;
    export: boolean;
  };
};

type Modal =
  | { type: "enroll" }
  | { type: "details"; row: ProbationRow }
  | { type: "edit"; row: ProbationRow }
  | { type: "extend"; row: ProbationRow }
  | { type: "decision"; row: ProbationRow; decision: "completed" | "terminated" }
  | { type: "reopen"; row: ProbationRow }
  | null;

const inputClass = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const textareaClass = "min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" }).format(new Date(value.length === 10 ? `${value}T12:00:00.000Z` : value));
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isOpen(row: ProbationRow) {
  return row.state === "active" || row.state === "extended";
}

function pendingDecision(row: ProbationRow) {
  return row.decisions.find((decision) => decision.status === "pending");
}

function StateBadge({ row }: { row: ProbationRow }) {
  const styles = row.isOverdue
    ? "bg-rose-100 text-rose-800 ring-rose-200"
    : row.state === "active"
      ? "bg-blue-100 text-blue-800 ring-blue-200"
      : row.state === "extended"
        ? "bg-amber-100 text-amber-800 ring-amber-200"
        : row.state === "completed"
          ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
          : "bg-slate-200 text-slate-800 ring-slate-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles}`}>
      {row.isOverdue ? "Review overdue" : titleCase(row.state)}
    </span>
  );
}

function Score({ label, rate, detail }: { label: string; rate: number; detail: string }) {
  const good = rate >= PROBATION_GOOD_THRESHOLD;
  return (
    <div className={`rounded-xl border p-3 ${good ? "border-emerald-100 bg-emerald-50" : "border-rose-100 bg-rose-50"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <span className={`text-lg font-black ${good ? "text-emerald-700" : "text-rose-700"}`}>{rate}%</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function MonitoringGrid({ monitoring }: { monitoring: ProbationMonitoring }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Score
        label="Attendance"
        rate={monitoring.attendance.rate}
        detail={`${monitoring.attendance.present}/${monitoring.attendance.total} present · ${monitoring.attendance.late} late`}
      />
      <Score
        label="Communication"
        rate={monitoring.communication.rate}
        detail={`${monitoring.communication.communicated}/${monitoring.communication.absences} absences communicated`}
      />
      <Score
        label="Discipline"
        rate={monitoring.discipline.rate}
        detail={`${monitoring.discipline.positive} positive · ${monitoring.discipline.unresolved} unresolved`}
      />
    </div>
  );
}

export function ProbationClient({
  rows,
  eligibleMembers,
  decisionApprovers,
  defaultDurationMonths,
  initialRecordId,
  initialStatus,
  showDisciplineTabs,
  permissions,
}: Props) {
  const router = useRouter();
  const dialog = useAppDialog();
  const [modal, setModal] = useState<Modal>(() => {
    if (!initialRecordId) return null;
    const row = rows.find((item) => item.id === initialRecordId);
    return row ? { type: "details", row } : null;
  });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(["all", "open", "active", "extended", "completed", "terminated", "overdue"].includes(initialStatus) ? initialStatus : "open");
  const [result, setResult] = useState<ProbationActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [enrollStartDate, setEnrollStartDate] = useState(todayValue());
  const [enrollMemberSearch, setEnrollMemberSearch] = useState("");
  const [enrollMemberId, setEnrollMemberId] = useState<number | null>(null);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);

  const filtered = useMemo(() => rows.filter((row) => {
    const needle = query.toLowerCase().trim();
    const matchesQuery = !needle || `${row.member.name} ${row.member.email}`.toLowerCase().includes(needle);
    const matchesStatus =
      status === "all"
      || (status === "open" && isOpen(row))
      || (status === "overdue" && row.isOverdue)
      || row.state === status;
    return matchesQuery && matchesStatus;
  }), [query, rows, status]);

  const filteredEnrollmentMembers = useMemo(() => {
    const needle = enrollMemberSearch.trim().toLowerCase();
    if (!needle) return eligibleMembers.slice(0, 8);
    return eligibleMembers
      .filter((member) => `${member.name} ${member.email}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [eligibleMembers, enrollMemberSearch]);

  function run(action: () => Promise<ProbationActionResult>, closeOnSuccess = true) {
    setResult(null);
    startTransition(async () => {
      const next = await action();
      setResult(next);
      if (next.ok) {
        if (closeOnSuccess) setModal(null);
        router.refresh();
      }
    });
  }

  function submitForm(event: FormEvent<HTMLFormElement>, action: (formData: FormData) => Promise<ProbationActionResult>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    run(() => action(formData));
  }

  async function submitDecision(event: FormEvent<HTMLFormElement>, row: ProbationRow, decision: "completed" | "terminated") {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const summary = `Attendance ${row.monitoring.attendance.rate}%, communication ${row.monitoring.communication.rate}%, discipline ${row.monitoring.discipline.rate}%, ${row.monitoring.discipline.unresolved} unresolved discipline record(s), ${row.monitoring.permissions.pending} pending permission(s), and ${row.extensions.length} extension(s).`;
    const confirmed = await dialog.confirm({
      title: decision === "terminated" ? "Request probation termination?" : "Request probation completion?",
      message: decision === "terminated"
        ? `${summary} An administrator will make the final decision. If approved, the member's account will be disabled and all sessions revoked.`
        : `${summary} An administrator will make the final decision. If approved, the probation role will be replaced with the normal member role.`,
      confirmLabel: decision === "terminated" ? "Request termination" : "Request completion",
      tone: decision === "terminated" ? "danger" : "primary",
    });
    if (!confirmed) return;
    run(() => requestProbationDecision(formData));
  }

  async function approveDecision(row: ProbationRow, request: ProbationRow["decisions"][number]) {
    const summary = `Attendance ${row.monitoring.attendance.rate}%, communication ${row.monitoring.communication.rate}%, discipline ${row.monitoring.discipline.rate}%, ${row.monitoring.discipline.unresolved} unresolved discipline record(s), ${row.monitoring.permissions.pending} pending permission(s), and ${row.extensions.length} extension(s).`;
    const confirmed = await dialog.confirm({
      title: request.requestedState === "terminated" ? "Approve termination?" : "Approve completion?",
      message: request.requestedState === "terminated"
        ? `${summary} This will disable ${row.member.name}'s account and revoke active sessions immediately. Historical records will be preserved.`
        : `${summary} This will remove only the probation role, add the normal member role, preserve other roles, and start normal attendance and discipline performance fresh from today.`,
      confirmLabel: request.requestedState === "terminated" ? "Disable account" : "Complete probation",
      tone: request.requestedState === "terminated" ? "danger" : "primary",
    });
    if (!confirmed) return;
    const comments = await dialog.prompt({
      title: "Approval comments",
      message: "Optionally record comments for the decision history.",
      inputLabel: "Comments",
      confirmLabel: "Approve",
    });
    if (comments === null) return;
    run(() => approveProbationDecision(request.id, comments));
  }

  async function rejectDecision(row: ProbationRow, request: ProbationRow["decisions"][number]) {
    const reason = await dialog.prompt({
      title: "Reject decision request",
      message: `Explain why the ${request.requestedState === "completed" ? "completion" : "termination"} request for ${row.member.name} is being rejected.`,
      inputLabel: "Rejection reason",
      confirmLabel: "Reject request",
      tone: "danger",
      required: true,
    });
    if (!reason) return;
    run(() => rejectProbationDecision(request.id, reason));
  }

  return (
    <div className="mx-auto max-w-7xl px-2 py-4 sm:px-4 sm:py-6">
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <DisciplineWorkspaceTabs
          activeTab="probation"
          mode={showDisciplineTabs ? "manage" : "hidden"}
          showProbation
        />
        <div className="space-y-5 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
       
        <div className="flex flex-wrap gap-2">
          {permissions.export ? (
            <a href="/admin/probation/export" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Download className="size-4" /> Export
            </a>
          ) : null}
          {permissions.enroll ? (
            <button type="button" onClick={() => { setResult(null); setEnrollMemberSearch(""); setEnrollMemberId(null); setMemberPickerOpen(false); setModal({ type: "enroll" }); }} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
              <UserPlus className="size-4" /> Enroll member
            </button>
          ) : null}
        </div>
      </div>

      {result ? (
        <ActionNotice message={result.message} tone={result.ok ? "success" : "error"} onClose={() => setResult(null)} />
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search member by name or email" className={`${inputClass} pl-9`} />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
            <option value="open">Open probation</option>
            <option value="all">All records</option>
            <option value="active">Active</option>
            <option value="extended">Extended</option>
            <option value="completed">Completed</option>
            <option value="terminated">Terminated</option>
            <option value="overdue">Review overdue</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[950px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Communication</th>
                <th className="px-4 py-3">Discipline</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={row.id} className="align-top hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900">{row.member.name}</p>
                    <p className="text-xs text-slate-500">{row.member.email}</p>
                    {pendingDecision(row) ? <p className="mt-1 text-xs font-semibold text-violet-700">Decision awaiting approval</p> : null}
                  </td>
                  <td className="px-4 py-4"><StateBadge row={row} /></td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    <p>{formatDate(row.originalStartDate)} – {formatDate(row.currentExpectedEndDate)}</p>
                    <p className={`mt-1 text-xs font-semibold ${row.isOverdue ? "text-rose-700" : "text-slate-500"}`}>
                      {row.isOverdue ? `${Math.abs(row.daysRemaining)} day(s) overdue` : isOpen(row) ? `${row.daysRemaining} day(s) remaining` : `Original end: ${formatDate(row.originalExpectedEndDate)}`}
                    </p>
                  </td>
                  <RateCell rate={row.monitoring.attendance.rate} />
                  <RateCell rate={row.monitoring.communication.rate} />
                  <RateCell rate={row.monitoring.discipline.rate} />
                  <td className="px-4 py-4">
                    <RowActions row={row} permissions={permissions} open={setModal} />
                  </td>
                </tr>
              ))}
              {!filtered.length ? <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-500">No probation records match these filters.</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {filtered.map((row) => (
            <div key={row.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-bold text-slate-900">{row.member.name}</p><p className="text-xs text-slate-500">{row.member.email}</p></div>
                <StateBadge row={row} />
              </div>
              <MonitoringGrid monitoring={row.monitoring} />
              <p className="text-xs text-slate-600">{formatDate(row.originalStartDate)} – {formatDate(row.currentExpectedEndDate)}</p>
              <RowActions row={row} permissions={permissions} open={setModal} />
            </div>
          ))}
          {!filtered.length ? <p className="p-10 text-center text-sm text-slate-500">No probation records match these filters.</p> : null}
        </div>
      </div>
        </div>
      </div>

      {modal ? (
        <ModalFrame title={modalTitle(modal)} onClose={() => setModal(null)}>
          {result && !result.ok ? (
            <div className="mb-4">
              <ActionNotice message={result.message} tone="error" onClose={() => setResult(null)} />
            </div>
          ) : null}

          {modal.type === "enroll" ? (
            <form onSubmit={(event) => submitForm(event, enrollProbation)} className="space-y-4">
              <Field label="Member">
                <div className="relative">
                  <input type="hidden" name="userId" value={enrollMemberId ?? ""} />
                  <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" aria-hidden="true" />
                  <input
                    value={enrollMemberSearch}
                    onChange={(event) => {
                      setEnrollMemberSearch(event.target.value);
                      setEnrollMemberId(null);
                      setMemberPickerOpen(true);
                    }}
                    onFocus={() => setMemberPickerOpen(true)}
                    onBlur={() => window.setTimeout(() => setMemberPickerOpen(false), 150)}
                    placeholder="Search active member by name or email"
                    autoComplete="off"
                    className={`${inputClass} pl-9 pr-9`}
                    aria-label="Search active member"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={memberPickerOpen}
                    aria-controls="enrollment-member-results"
                  />
                  {enrollMemberId ? (
                    <CheckCircle2 className="pointer-events-none absolute right-3 top-3 size-4 text-emerald-600" aria-label="Member selected" />
                  ) : null}
                  {memberPickerOpen ? (
                    <div id="enrollment-member-results" role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                      {filteredEnrollmentMembers.length ? filteredEnrollmentMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          role="option"
                          aria-selected={enrollMemberId === member.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => {
                            setEnrollMemberId(member.id);
                            setEnrollMemberSearch(member.name);
                            setMemberPickerOpen(false);
                          }}
                          className={`block w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-blue-50 ${
                            enrollMemberId === member.id ? "bg-blue-50" : ""
                          }`}
                        >
                          <span className="block text-sm font-semibold text-slate-900">{member.name}</span>
                          <span className="block text-xs text-slate-500">{member.email}</span>
                        </button>
                      )) : (
                        <p className="px-3 py-5 text-center text-sm text-slate-500">No eligible active member found.</p>
                      )}
                    </div>
                  ) : null}
                </div>
                {enrollMemberSearch && !enrollMemberId ? <span className="mt-1 block text-xs text-amber-700">Select a member from the search results.</span> : null}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date"><input name="startDate" required type="date" value={enrollStartDate} onChange={(event) => setEnrollStartDate(event.target.value)} className={inputClass} /></Field>
                <Field label="Expected end date" note={`Defaults to ${defaultDurationMonths} full calendar months after the start date.`}><input key={enrollStartDate} name="expectedEndDate" required type="date" min={enrollStartDate} defaultValue={addCalendarMonths(enrollStartDate, defaultDurationMonths)} className={inputClass} /></Field>
              </div>
              <Field label="Member-visible summary" note="This feedback is shown on the member's dashboard."><textarea name="memberVisibleSummary" className={textareaClass} /></Field>
              {permissions.viewConfidential ? <Field label="Confidential comments" note="Only leaders with confidential-comment access can read this."><textarea name="confidentialComments" className={textareaClass} /></Field> : null}
              <SubmitButtons pending={pending} disabled={!enrollMemberId} label="Enroll member" onCancel={() => setModal(null)} />
            </form>
          ) : null}

          {modal.type === "details" ? (
            <Details
              row={modal.row}
              permissions={permissions}
              pending={pending}
              onEdit={(row) => setModal({ type: "edit", row })}
              onExtend={(row) => setModal({ type: "extend", row })}
              onDecision={(row, decision) => setModal({ type: "decision", row, decision })}
              onReopen={(row) => setModal({ type: "reopen", row })}
              onApprove={approveDecision}
              onReject={rejectDecision}
            />
          ) : null}

          {modal.type === "edit" ? (
            <form onSubmit={(event) => submitForm(event, updateProbation)} className="space-y-4">
              <input type="hidden" name="probationId" value={modal.row.id} />
              <Field label="Member-visible summary"><textarea name="memberVisibleSummary" defaultValue={modal.row.memberVisibleSummary ?? ""} className={textareaClass} /></Field>
              {permissions.viewConfidential ? <Field label="Confidential comments"><textarea name="confidentialComments" defaultValue={modal.row.confidentialComments ?? ""} className={textareaClass} /></Field> : null}
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Original dates cannot be overwritten. Use Extend Probation to change the current expected end date and preserve history.</p>
              <SubmitButtons pending={pending} label="Save details" onCancel={() => setModal({ type: "details", row: modal.row })} />
            </form>
          ) : null}

          {modal.type === "extend" ? (
            <form onSubmit={(event) => submitForm(event, extendProbation)} className="space-y-4">
              <input type="hidden" name="probationId" value={modal.row.id} />
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Current expected end: <strong>{formatDate(modal.row.currentExpectedEndDate)}</strong>. The original expected end remains unchanged.</p>
              <Field label="New expected end date"><input name="newEndDate" required type="date" min={addDays(modal.row.currentExpectedEndDate, 1)} className={inputClass} /></Field>
              <Field label="Extension reason"><textarea name="reason" required className={textareaClass} /></Field>
              <Field label="Supporting comments"><textarea name="comments" className={textareaClass} /></Field>
              <SubmitButtons pending={pending} label="Extend probation" onCancel={() => setModal({ type: "details", row: modal.row })} />
            </form>
          ) : null}

          {modal.type === "decision" ? (
            <form onSubmit={(event) => submitDecision(event, modal.row, modal.decision)} className="space-y-4">
              <input type="hidden" name="probationId" value={modal.row.id} />
              <input type="hidden" name="requestedState" value={modal.decision} />
              <MonitoringGrid monitoring={modal.row.monitoring} />
              <DecisionSummary row={modal.row} />
              {modal.decision === "terminated" ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900">
                  Approval will disable the member’s account and revoke active sessions immediately. The account and historical records will not be deleted.
                </div>
              ) : null}
              <Field label="Administrator approver" note="">
                <select name="approverId" required className={inputClass} defaultValue="">
                  <option value="" disabled>Select an active administrator</option>
                  {decisionApprovers.map((approver) => (
                    <option key={approver.id} value={approver.id}>{approver.name} — {approver.email}</option>
                  ))}
                </select>
              </Field>
              {!decisionApprovers.length ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">No other active Admin or Super Admin is available to approve this decision.</p>
              ) : null}
              <Field label="Decision reason"><textarea name="reason" required className={textareaClass} /></Field>
              <Field label="Final decision comments"><textarea name="comments" required className={textareaClass} /></Field>
              <SubmitButtons pending={pending} disabled={!decisionApprovers.length} label={modal.decision === "terminated" ? "Request termination" : "Request completion"} danger={modal.decision === "terminated"} onCancel={() => setModal({ type: "details", row: modal.row })} />
            </form>
          ) : null}

          {modal.type === "reopen" ? (
            <form onSubmit={(event) => submitForm(event, reopenProbation)} className="space-y-4">
              <input type="hidden" name="probationId" value={modal.row.id} />
              <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Reopening does not require separate administrator approval. The record will return in the <strong>Extended</strong> state and the new period will be added to extension history.</p>
              <Field label="New expected end date"><input name="newEndDate" required type="date" min={addDays(modal.row.currentExpectedEndDate > todayValue() ? modal.row.currentExpectedEndDate : todayValue(), 1)} className={inputClass} /></Field>
              <Field label="Reopening reason"><textarea name="reason" required className={textareaClass} /></Field>
              <Field label="Supporting comments"><textarea name="comments" className={textareaClass} /></Field>
              <SubmitButtons pending={pending} label="Reopen probation" onCancel={() => setModal({ type: "details", row: modal.row })} />
            </form>
          ) : null}
        </ModalFrame>
      ) : null}
    </div>
  );
}

function RateCell({ rate }: { rate: number }) {
  const good = rate >= PROBATION_GOOD_THRESHOLD;
  return <td className={`px-4 py-4 text-sm font-black ${good ? "text-emerald-700" : "text-rose-700"}`}>{rate}%</td>;
}

function RowActions({ row, permissions, open }: { row: ProbationRow; permissions: Props["permissions"]; open: (modal: Modal) => void }) {
  const decision = pendingDecision(row);
  const actionClass = "text-xs font-semibold text-blue-600 transition hover:text-blue-800 hover:underline";
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 md:justify-end">
      <button type="button" onClick={() => open({ type: "details", row })} className={actionClass}>
        {decision ? row.canApprovePendingDecision ? "Review" : "Pending" : "Details"}
      </button>
      {permissions.update && isOpen(row) ? (
        <button type="button" onClick={() => open({ type: "edit", row })} className={actionClass}>Edit</button>
      ) : null}
      {permissions.extend && isOpen(row) && !decision ? (
        <button type="button" onClick={() => open({ type: "extend", row })} className={actionClass}>Extend</button>
      ) : null}
      {permissions.complete && isOpen(row) && !decision ? (
        <button type="button" onClick={() => open({ type: "decision", row, decision: "completed" })} className={actionClass}>Complete</button>
      ) : null}
      {permissions.terminate && isOpen(row) && !decision ? (
        <button type="button" onClick={() => open({ type: "decision", row, decision: "terminated" })} className={actionClass}>Terminate</button>
      ) : null}
      {permissions.reopen && !isOpen(row) ? (
        <button type="button" onClick={() => open({ type: "reopen", row })} className={actionClass}>Reopen</button>
      ) : null}
    </div>
  );
}

function Details({
  row,
  permissions,
  pending,
  onEdit,
  onExtend,
  onDecision,
  onReopen,
  onApprove,
  onReject,
}: {
  row: ProbationRow;
  permissions: Props["permissions"];
  pending: boolean;
  onEdit: (row: ProbationRow) => void;
  onExtend: (row: ProbationRow) => void;
  onDecision: (row: ProbationRow, decision: "completed" | "terminated") => void;
  onReopen: (row: ProbationRow) => void;
  onApprove: (row: ProbationRow, request: ProbationRow["decisions"][number]) => void;
  onReject: (row: ProbationRow, request: ProbationRow["decisions"][number]) => void;
}) {
  const pendingRequest = pendingDecision(row);
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-900">{row.member.name}</h3>
          <p className="text-sm text-slate-500">{row.member.email}{row.member.phone ? ` · ${row.member.phone}` : ""}</p>
        </div>
        <StateBadge row={row} />
      </div>

      <MonitoringGrid monitoring={row.monitoring} />
      {row.monitoring.attentionReasons.length ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <p className="font-bold">Needs attention</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">{row.monitoring.attentionReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">All measured probation scores meet the {PROBATION_GOOD_THRESHOLD}% threshold and no negative discipline record is unresolved.</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="Original period" value={`${formatDate(row.originalStartDate)} – ${formatDate(row.originalExpectedEndDate)}`} />
        <Info label="Current expected end" value={`${formatDate(row.currentExpectedEndDate)}${row.isOverdue ? ` (${Math.abs(row.daysRemaining)} days overdue)` : isOpen(row) ? ` (${row.daysRemaining} days remaining)` : ""}`} />
        <Info label="Permission requests" value={`${row.monitoring.permissions.approved} approved · ${row.monitoring.permissions.rejected} rejected · ${row.monitoring.permissions.pending} pending · ${row.monitoring.communication.uncommunicated} uncommunicated absences`} />
        <Info label="Audit" value={`Created by ${row.createdByName}; last updated by ${row.updatedByName} on ${formatDate(row.updatedAt, true)}`} />
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <h4 className="font-bold text-slate-900">Member-visible summary</h4>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{row.memberVisibleSummary || "No member-visible feedback has been recorded."}</p>
      </div>
      {permissions.viewConfidential ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <h4 className="font-bold text-violet-900">Confidential comments</h4>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-violet-800">{row.confidentialComments || "No confidential comments."}</p>
        </div>
      ) : null}

      {pendingRequest ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-black text-violet-950">{titleCase(pendingRequest.requestedState)} awaiting approval{row.pendingApproverName ? ` from ${row.pendingApproverName}` : ""}</p>
              <p className="mt-1 text-sm text-violet-800">Requested by {pendingRequest.requestedByName} on {formatDate(pendingRequest.requestedAt, true)}</p>
              <p className="mt-3 text-sm text-violet-900"><strong>Reason:</strong> {pendingRequest.reason}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-violet-900"><strong>Final comments:</strong> {pendingRequest.comments}</p>
            </div>
            {row.canApprovePendingDecision ? (
              <div className="flex shrink-0 gap-2">
                <button type="button" disabled={pending} onClick={() => onApprove(row, pendingRequest)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="size-4" /> Approve</button>
                <button type="button" disabled={pending} onClick={() => onReject(row, pendingRequest)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"><XCircle className="size-4" /> Reject</button>
              </div>
            ) : <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-800">Administrator review required</span>}
          </div>
        </div>
      ) : null}

      <HistorySection row={row} />

      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
        <Link href={`/admin/discipline?tab=attendance&member=${row.member.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Manage attendance</Link>
        <Link href={`/admin/discipline?tab=permission&member=${row.member.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Review permissions</Link>
        <Link href={`/admin/discipline?tab=discipline-records&member=${row.member.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Record discipline</Link>
        {permissions.update && isOpen(row) ? <button type="button" onClick={() => onEdit(row)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Edit details</button> : null}
        {permissions.extend && isOpen(row) && !pendingRequest ? <button type="button" onClick={() => onExtend(row)} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50">Extend</button> : null}
        {permissions.complete && isOpen(row) && !pendingRequest ? <button type="button" onClick={() => onDecision(row, "completed")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">Request completion</button> : null}
        {permissions.terminate && isOpen(row) && !pendingRequest ? <button type="button" onClick={() => onDecision(row, "terminated")} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700">Request termination</button> : null}
        {permissions.reopen && !isOpen(row) ? <button type="button" onClick={() => onReopen(row)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Reopen probation</button> : null}
      </div>
    </div>
  );
}

function HistorySection({ row }: { row: ProbationRow }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-4">
        <h4 className="flex items-center gap-2 font-bold text-slate-900"><History className="size-4" /> Extension history</h4>
        <div className="mt-3 space-y-3">
          {row.extensions.map((extension) => (
            <div key={extension.id} className="border-l-2 border-amber-300 pl-3 text-sm">
              <p className="font-semibold text-slate-800">{formatDate(extension.previousExpectedEndDate)} → {formatDate(extension.newExpectedEndDate)}</p>
              <p className="mt-1 text-slate-600">{extension.reason}</p>
              {extension.comments ? <p className="mt-1 whitespace-pre-wrap text-slate-500">{extension.comments}</p> : null}
              <p className="mt-1 text-xs text-slate-400">{extension.extendedByName} · {formatDate(extension.extensionDate, true)}</p>
            </div>
          ))}
          {!row.extensions.length ? <p className="text-sm text-slate-500">No extensions.</p> : null}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <h4 className="flex items-center gap-2 font-bold text-slate-900"><ShieldCheck className="size-4" /> Decision history</h4>
        <div className="mt-3 space-y-3">
          {row.decisions.map((decision) => (
            <div key={decision.id} className="border-l-2 border-violet-300 pl-3 text-sm">
              <p className="font-semibold text-slate-800">{titleCase(decision.requestedState)} · {titleCase(decision.status)}</p>
              <p className="mt-1 text-slate-600">{decision.reason}</p>
              <p className="mt-1 text-xs text-slate-400">Requested by {decision.requestedByName} · {formatDate(decision.requestedAt, true)}</p>
              {decision.reviewedByName ? <p className="mt-1 text-xs text-slate-500">Reviewed by {decision.reviewedByName} · {formatDate(decision.reviewedAt, true)}{decision.reviewComments ? ` · ${decision.reviewComments}` : ""}</p> : null}
            </div>
          ))}
          {!row.decisions.length ? <p className="text-sm text-slate-500">No final decision requests.</p> : null}
        </div>
        {row.decisionDate ? <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Final decision by <strong>{row.decisionMakerName}</strong> on {formatDate(row.decisionDate, true)}. {row.finalDecisionComments}</p> : null}
      </div>
    </div>
  );
}

function DecisionSummary({ row }: { row: ProbationRow }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 sm:grid-cols-4">
      <span><strong>{row.monitoring.permissions.pending}</strong><br />Pending permissions</span>
      <span><strong>{row.monitoring.discipline.unresolved}</strong><br />Unresolved discipline</span>
      <span><strong>{row.extensions.length}</strong><br />Extensions</span>
      <span><strong>{row.monitoring.communication.uncommunicated}</strong><br />Uncommunicated absences</span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-sm leading-6 text-slate-800">{value}</p></div>;
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>{children}{note ? <span className="mt-1 block text-xs text-slate-500">{note}</span> : null}</label>;
}

function SubmitButtons({ pending, disabled = false, label, danger = false, onCancel }: { pending: boolean; disabled?: boolean; label: string; danger?: boolean; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
      <button type="button" onClick={onCancel} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
      <button type="submit" disabled={pending || disabled} className={`h-10 rounded-lg px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"}`}>{pending ? "Saving..." : label}</button>
    </div>
  );
}

function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[1px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-5" /></button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function modalTitle(modal: Exclude<Modal, null>) {
  if (modal.type === "enroll") return "Enroll member in probation";
  if (modal.type === "details") return "Probation record";
  if (modal.type === "edit") return "Update probation details";
  if (modal.type === "extend") return "Extend probation";
  if (modal.type === "reopen") return "Reopen probation";
  return modal.decision === "terminated" ? "Request probation termination" : "Request probation completion";
}
