"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppDialog } from "@/components/app-dialog-provider";
import { ActionNotice } from "@/components/action-notice";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, FileSpreadsheet, HandCoins, Pencil, PlusCircle, Search, Trash2, UsersRound, X } from "lucide-react";
import {
  recordEventContributionPayment,
  saveContributionEvent,
  voidEventContributionPayment,
} from "@/app/admin/finance/actions";

export type EventContributionPayment = {
  id: number;
  eventId: number;
  userId: number | null;
  userName: string;
  userEmail: string;
  amount: number;
  paymentDateRaw: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  status: string;
  createdByName: string;
  createdAt: string;
};

export type FinanceContributionEvent = {
  id: number;
  title: string;
  description: string | null;
  startDateRaw: string;
  startDate: string;
  endDateRaw: string;
  endDate: string;
  status: string;
  year: number;
  createdByName: string;
  payments: EventContributionPayment[];
};

type EventUser = { id: number; name: string; email: string };
type EventPermissions = { manageContributions: boolean; managePayments: boolean; deletePayments: boolean; export: boolean };
type EventSortField = "title" | "startDate" | "raised" | "participation" | "status";
type SortDirection = "asc" | "desc";

export function EventContributionsClient({ events, users, permissions, onShowAnnual }: { events: FinanceContributionEvent[]; users: EventUser[]; permissions: EventPermissions; onShowAnnual: () => void }) {
  const router = useRouter();
  const { confirm } = useAppDialog();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<EventSortField>("startDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [requestedPage, setRequestedPage] = useState(1);
  const [editingEvent, setEditingEvent] = useState<FinanceContributionEvent | "new" | null>(null);
  const [paymentEvent, setPaymentEvent] = useState<FinanceContributionEvent | null>(null);
  const [historyEvent, setHistoryEvent] = useState<FinanceContributionEvent | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const today = localDateValue(new Date());
  const normalizedSearch = search.trim().toLowerCase();
  const visibleEvents = events
    .filter((event) => !normalizedSearch || event.title.toLowerCase().includes(normalizedSearch))
    .filter((event) => statusFilter === "all" || contributionStatus(event, today) === statusFilter)
    .sort((firstEvent, secondEvent) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const firstValue = eventSortValue(firstEvent, sortField, users.length, today);
      const secondValue = eventSortValue(secondEvent, sortField, users.length, today);
      if (typeof firstValue === "number" && typeof secondValue === "number") return (firstValue - secondValue) * direction;
      return String(firstValue).localeCompare(String(secondValue)) * direction;
    });
  const recordsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(visibleEvents.length / recordsPerPage));
  const currentPage = Math.min(requestedPage, totalPages);
  const firstRecordIndex = (currentPage - 1) * recordsPerPage;
  const paginatedEvents = visibleEvents.slice(firstRecordIndex, firstRecordIndex + recordsPerPage);

  function changeSort(field: EventSortField) {
    if (sortField === field) {
      setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "title" || field === "status" ? "asc" : "desc");
    }
    setRequestedPage(1);
  }

  function submitForm(action: (formData: FormData) => Promise<{ ok: boolean; message: string }>, formData: FormData, close: () => void) {
    setNotice(null);
    startTransition(async () => {
      const result = await action(formData);
      setNotice(result);
      if (result.ok) {
        close();
        router.refresh();
      }
    });
  }

  function exportMembers(event: FinanceContributionEvent) {
    const rows = users.map((user) => {
      const payments = event.payments.filter((payment) => payment.userId === user.id);
      const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
      return {
        name: user.name,
        status: payments.length ? "Contributed" : "Not Started",
        total,
        paymentCount: payments.length,
        lastPaymentDate: payments[0]?.paymentDate ?? "-",
      };
    }).sort((firstUser, secondUser) => {
      if (firstUser.status !== secondUser.status) return firstUser.status === "Contributed" ? -1 : 1;
      return firstUser.name.localeCompare(secondUser.name);
    });
    const csvRows = [
      ["Member", "Status", "Total Contributed", "Payment Count", "Last Payment Date"],
      ...rows.map((row) => [row.name, row.status, row.total, row.paymentCount, row.lastPaymentDate]),
    ];
    const blob = new Blob([`\uFEFF${csvRows.map((row) => row.map(csvCell).join(",")).join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event"}-member-contributions.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function voidPayment(payment: EventContributionPayment) {
    const confirmed = await confirm({
      title: "Void Other Contribution Payment?",
      message: `Void ${formatCurrency(payment.amount)} from ${payment.userName}? This payment will no longer count toward the event total.`,
      confirmLabel: "Void Payment",
      cancelLabel: "Keep Payment",
      tone: "danger",
    });
    if (!confirmed) return;
    setNotice(null);
    startTransition(async () => {
      const result = await voidEventContributionPayment(payment.id);
      setNotice(result);
      if (result.ok) {
        setHistoryEvent(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="inline-flex w-fit rounded-lg bg-gray-100 p-1">
          <button type="button" onClick={onShowAnnual} className="rounded-md px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:text-gray-900">Annual Contributions</button>
          <button type="button" className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-blue-600 shadow-sm">Other Contributions</button>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-2">
          <label className="min-w-52 flex-1 sm:flex-none">
            <span className="mb-1 block text-xs font-medium text-gray-600">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setRequestedPage(1); }} placeholder="Search contribution..." className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
            </span>
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-gray-600">Status</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setRequestedPage(1); }} className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500">
              <option value="all">All contributions</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <label className="sm:hidden">
            <span className="mb-1 block text-xs font-medium text-gray-600">Sort</span>
            <select value={sortField} onChange={(event) => changeSort(event.target.value as EventSortField)} className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500">
              <option value="title">Title</option>
              <option value="startDate">Start date</option>
              <option value="raised">Amount raised</option>
              <option value="participation">Participation</option>
              <option value="status">Status</option>
            </select>
          </label>
          {permissions.manageContributions ? (
            <button type="button" onClick={() => setEditingEvent("new")} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700">
              <PlusCircle className="size-4" aria-hidden="true" />
              New Contribution
            </button>
          ) : null}
        </div>
      </div>

      {notice ? <ActionNotice message={notice.message} tone={notice.ok ? "success" : "error"} onClose={() => setNotice(null)} /> : null}

      <div className="hidden overflow-hidden rounded-xl border border-gray-200 sm:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader label="Contribution" field="title" activeField={sortField} direction={sortDirection} onSort={changeSort} />
                <SortHeader label="Contribution Window" field="startDate" activeField={sortField} direction={sortDirection} onSort={changeSort} />
                <SortHeader label="Raised" field="raised" activeField={sortField} direction={sortDirection} onSort={changeSort} />
                <SortHeader label="Participation" field="participation" activeField={sortField} direction={sortDirection} onSort={changeSort} />
                <SortHeader label="Status" field="status" activeField={sortField} direction={sortDirection} onSort={changeSort} />
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedEvents.length ? paginatedEvents.map((event) => <EventRow key={event.id} event={event} totalMembers={users.length} today={today} permissions={permissions} onEdit={() => setEditingEvent(event)} onPay={() => setPaymentEvent(event)} onHistory={() => setHistoryEvent(event)} onExport={() => exportMembers(event)} />) : <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No other contributions found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 sm:hidden">
        {paginatedEvents.length ? paginatedEvents.map((event) => <EventCard key={event.id} event={event} totalMembers={users.length} today={today} permissions={permissions} onEdit={() => setEditingEvent(event)} onPay={() => setPaymentEvent(event)} onHistory={() => setHistoryEvent(event)} onExport={() => exportMembers(event)} />) : <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-gray-400">No other contributions found.</div>}
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">Showing {firstRecordIndex + 1}–{Math.min(firstRecordIndex + recordsPerPage, visibleEvents.length)} of {visibleEvents.length} contributions</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setRequestedPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
            <span className="text-xs font-semibold text-gray-600">Page {currentPage} of {totalPages}</span>
            <button type="button" onClick={() => setRequestedPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
          </div>
        </div>
      ) : null}

      {editingEvent ? <EventModal event={editingEvent === "new" ? null : editingEvent} pending={pending} onClose={() => setEditingEvent(null)} onSubmit={(formData) => submitForm(saveContributionEvent, formData, () => setEditingEvent(null))} /> : null}
      {paymentEvent ? <EventPaymentModal event={paymentEvent} users={users} pending={pending} onClose={() => setPaymentEvent(null)} onSubmit={(formData) => submitForm(recordEventContributionPayment, formData, () => setPaymentEvent(null))} /> : null}
      {historyEvent ? <EventHistoryModal event={historyEvent} users={users} canVoid={permissions.deletePayments} pending={pending} onClose={() => setHistoryEvent(null)} onVoid={voidPayment} /> : null}
    </div>
  );
}

function SortHeader({ label, field, activeField, direction, onSort }: { label: string; field: EventSortField; activeField: EventSortField; direction: SortDirection; onSort: (field: EventSortField) => void }) {
  const active = activeField === field;
  return <th aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500"><button type="button" onClick={() => onSort(field)} className={`inline-flex items-center gap-1 transition hover:text-blue-600 ${active ? "text-blue-600" : "text-gray-500"}`}>{label}{active ? direction === "asc" ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" /> : <ArrowUpDown className="size-3.5 text-gray-400" aria-hidden="true" />}</button></th>;
}

function contributorCount(event: FinanceContributionEvent) {
  return new Set(event.payments.map((payment) => payment.userId).filter((userId): userId is number => userId !== null)).size;
}

function contributionStatus(event: FinanceContributionEvent, today: string) {
  if (event.status === "active" && event.endDateRaw && event.endDateRaw < today) return "expired";
  return event.status;
}

function eventSortValue(event: FinanceContributionEvent, field: EventSortField, totalMembers: number, today: string) {
  if (field === "raised") return event.payments.reduce((sum, payment) => sum + payment.amount, 0);
  if (field === "participation") return totalMembers > 0 ? contributorCount(event) / totalMembers : 0;
  if (field === "startDate") return event.startDateRaw;
  if (field === "status") return contributionStatus(event, today);
  return event.title;
}

function localDateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function EventRow({ event, totalMembers, today, permissions, onEdit, onPay, onHistory, onExport }: { event: FinanceContributionEvent; totalMembers: number; today: string; permissions: EventPermissions; onEdit: () => void; onPay: () => void; onHistory: () => void; onExport: () => void }) {
  const raised = event.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const status = contributionStatus(event, today);
  return <tr className="hover:bg-gray-50"><td className="min-w-56 px-3 py-3"><p className="font-semibold text-gray-900">{event.title}</p>{event.description ? <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{event.description}</p> : null}</td><td className="whitespace-nowrap px-3 py-3 text-xs text-gray-600">{event.startDate}<br />{event.endDateRaw ? `to ${event.endDate}` : "No deadline"}</td><td className="whitespace-nowrap px-3 py-3 font-semibold text-emerald-600">{formatCurrency(raised)}</td><td className="min-w-36 px-3 py-3"><Participation event={event} totalMembers={totalMembers} /></td><td className="px-3 py-3"><StatusBadge status={status} /></td><td className="px-3 py-3"><EventActions status={status} permissions={permissions} onEdit={onEdit} onPay={onPay} onHistory={onHistory} onExport={onExport} /></td></tr>;
}

function EventCard({ event, totalMembers, today, permissions, onEdit, onPay, onHistory, onExport }: { event: FinanceContributionEvent; totalMembers: number; today: string; permissions: EventPermissions; onEdit: () => void; onPay: () => void; onHistory: () => void; onExport: () => void }) {
  const raised = event.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const status = contributionStatus(event, today);
  return <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-gray-900">{event.title}</h3>{event.description ? <p className="mt-1 line-clamp-2 text-xs text-gray-500">{event.description}</p> : null}<p className="mt-1 text-xs text-gray-500">{event.startDate}{event.endDateRaw ? ` – ${event.endDate}` : ""}</p></div><StatusBadge status={status} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-gray-500">Raised</p><p className="font-semibold text-emerald-600">{formatCurrency(raised)}</p></div><div><p className="text-xs text-gray-500">Participation</p><Participation event={event} totalMembers={totalMembers} /></div></div><div className="mt-4 flex justify-end"><EventActions status={status} permissions={permissions} onEdit={onEdit} onPay={onPay} onHistory={onHistory} onExport={onExport} /></div></article>;
}

function EventActions({ status, permissions, onEdit, onPay, onHistory, onExport }: { status: string; permissions: EventPermissions; onEdit: () => void; onPay: () => void; onHistory: () => void; onExport: () => void }) {
  return <div className="flex items-center gap-1"><IconAction label="View member contribution status" icon={UsersRound} onClick={onHistory} />{permissions.managePayments && status === "active" ? <IconAction label="Record payment" icon={HandCoins} onClick={onPay} tone="green" /> : null}{permissions.manageContributions ? <IconAction label="Edit contribution" icon={Pencil} onClick={onEdit} /> : null}{permissions.export ? <IconAction label="Export contributed and not started members" icon={FileSpreadsheet} onClick={onExport} tone="green" /> : null}</div>;
}

function IconAction({ label, icon: Icon, onClick, tone = "blue" }: { label: string; icon: typeof HandCoins; onClick: () => void; tone?: "blue" | "green" | "amber" }) {
  const colors = { blue: "text-blue-600 hover:bg-blue-50", green: "text-emerald-600 hover:bg-emerald-50", amber: "text-amber-600 hover:bg-amber-50" };
  return <button type="button" onClick={onClick} title={label} aria-label={label} className={`inline-flex size-8 items-center justify-center rounded-lg transition ${colors[tone]}`}><Icon className="size-4" aria-hidden="true" /></button>;
}

function Participation({ event, totalMembers }: { event: FinanceContributionEvent; totalMembers: number }) {
  const contributors = contributorCount(event);
  const percentage = totalMembers > 0 ? Math.round((contributors / totalMembers) * 1000) / 10 : 0;
  return <div><p className="text-xs font-semibold text-violet-600">{contributors} of {totalMembers} · {percentage}%</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.min(100, percentage)}%` }} /></div></div>;
}

function StatusBadge({ status }: { status: string }) {
  const colors = status === "active" ? "bg-emerald-100 text-emerald-700" : status === "draft" ? "bg-amber-100 text-amber-700" : status === "expired" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600";
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${colors}`}>{status}</span>;
}

function EventStat({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "purple" }) {
  const colors = { blue: "border-blue-100 bg-blue-50 text-blue-700", green: "border-emerald-100 bg-emerald-50 text-emerald-700", purple: "border-violet-100 bg-violet-50 text-violet-700" };
  return <div className={`rounded-xl border p-4 ${colors[tone]}`}><p className="text-xs opacity-75">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>;
}

function EventModal({ event, pending, onClose, onSubmit }: { event: FinanceContributionEvent | null; pending: boolean; onClose: () => void; onSubmit: (formData: FormData) => void }) {
  return <EventDialog title={event ? "Edit Other Contribution" : "Create Other Contribution"} onClose={onClose}><form onSubmit={(formEvent) => { formEvent.preventDefault(); onSubmit(new FormData(formEvent.currentTarget)); }} className="space-y-4">{event ? <input type="hidden" name="id" value={event.id} /> : null}<EventField label="Contribution title"><input name="title" required minLength={3} defaultValue={event?.title ?? ""} className={fieldClass} /></EventField><EventField label="Description"><textarea name="description" rows={3} defaultValue={event?.description ?? ""} className={`${fieldClass} h-auto py-2`} /></EventField><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><EventField label="Contributions open"><input name="start_date" type="date" required defaultValue={event?.startDateRaw ?? new Date().toISOString().slice(0, 10)} className={fieldClass} /></EventField><EventField label="Deadline"><input name="end_date" type="date" defaultValue={event?.endDateRaw ?? ""} className={fieldClass} /></EventField></div><EventField label="Status"><select name="status" defaultValue={event?.status ?? "active"} className={fieldClass}><option value="draft">Draft</option><option value="active">Active</option><option value="closed">Closed</option></select></EventField><DialogFooter pending={pending} label={event ? "Save Changes" : "Create Contribution"} onClose={onClose} /></form></EventDialog>;
}

function EventPaymentModal({ event, users, pending, onClose, onSubmit }: { event: FinanceContributionEvent; users: EventUser[]; pending: boolean; onClose: () => void; onSubmit: (formData: FormData) => void }) {
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [resultsOpen, setResultsOpen] = useState(false);
  const normalizedSearch = memberSearch.trim().toLowerCase();
  const filteredUsers = users
    .filter((user) => !normalizedSearch || `${user.name} ${user.email}`.toLowerCase().includes(normalizedSearch))
    .slice(0, 10);
  const selectedContribution = selectedUserId
    ? event.payments.filter((payment) => payment.userId === Number(selectedUserId)).reduce((sum, payment) => sum + payment.amount, 0)
    : 0;

  function selectMember(user: EventUser) {
    setSelectedUserId(String(user.id));
    setMemberSearch(`${user.name} · ${user.email}`);
    setResultsOpen(false);
  }

  return (
    <EventDialog title={`Record Payment · ${event.title}`} onClose={onClose}>
      <form onSubmit={(formEvent) => { formEvent.preventDefault(); onSubmit(new FormData(formEvent.currentTarget)); }} className="space-y-4">
        <input type="hidden" name="event_id" value={event.id} />
        <input type="hidden" name="user_id" value={selectedUserId} />
        <EventField label="Member">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              value={memberSearch}
              onChange={(changeEvent) => {
                setMemberSearch(changeEvent.target.value);
                setSelectedUserId("");
                setResultsOpen(true);
              }}
              onFocus={() => setResultsOpen(true)}
              onBlur={() => window.setTimeout(() => setResultsOpen(false), 100)}
              placeholder="Search member by name or email..."
              autoComplete="off"
              required
              aria-autocomplete="list"
              aria-controls="event-member-results"
              className={`${fieldClass} pl-9`}
            />
            {resultsOpen ? (
              <div id="event-member-results" role="listbox" className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
                {filteredUsers.length ? filteredUsers.map((user) => {
                  const contributed = event.payments.filter((payment) => payment.userId === user.id).reduce((sum, payment) => sum + payment.amount, 0);
                  return (
                  <button
                    key={user.id}
                    type="button"
                    role="option"
                    aria-selected={selectedUserId === String(user.id)}
                    onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                    onClick={() => selectMember(user)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-blue-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-gray-900">{user.name}</span>
                      <span className="block truncate text-xs text-gray-500">{user.email}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${contributed > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{contributed > 0 ? `${formatCurrency(contributed)} contributed` : "Not Started"}</span>
                      {selectedUserId === String(user.id) ? <Check className="size-4 text-blue-600" aria-hidden="true" /> : null}
                    </span>
                  </button>
                  );
                }) : <p className="px-3 py-5 text-center text-sm text-gray-500">No matching member found.</p>}
              </div>
            ) : null}
          </div>
        </EventField>
        {selectedContribution > 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">This member has already contributed {formatCurrency(selectedContribution)}. A new payment will be added to that amount.</div> : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><EventField label="Amount (RWF)"><input name="amount" type="number" min="1" step="0.01" required className={fieldClass} /></EventField><EventField label="Payment date"><input name="payment_date" type="date" required defaultValue={localDateValue(new Date())} min={event.startDateRaw} max={event.endDateRaw || undefined} className={fieldClass} /></EventField></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><EventField label="Payment method"><select name="payment_method" defaultValue="cash" className={fieldClass}><option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="bank_transfer">Bank Transfer</option><option value="card">Card</option><option value="other">Other</option></select></EventField><EventField label="Reference"><input name="reference_number" className={fieldClass} /></EventField></div>
        <EventField label="Notes"><textarea name="notes" rows={2} className={`${fieldClass} h-auto py-2`} /></EventField>
        <DialogFooter pending={pending} label="Record Payment" onClose={onClose} />
      </form>
    </EventDialog>
  );
}

function EventHistoryModal({ event, users, canVoid, pending, onClose, onVoid }: { event: FinanceContributionEvent; users: EventUser[]; canVoid: boolean; pending: boolean; onClose: () => void; onVoid: (payment: EventContributionPayment) => void }) {
  const [activeList, setActiveList] = useState<"contributors" | "pending">("contributors");
  const raised = event.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const contributorIds = new Set(event.payments.map((payment) => payment.userId).filter((userId): userId is number => userId !== null));
  const nonContributors = users.filter((user) => !contributorIds.has(user.id));

  return (
    <EventDialog title={event.title} onClose={onClose} width="max-w-5xl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <EventStat label="Raised" value={formatCurrency(raised)} tone="green" />
        <EventStat label="Contributors" value={String(contributorIds.size)} tone="blue" />
        <EventStat label="Not Yet Contributed" value={String(nonContributors.length)} tone="purple" />
      </div>

      <div className="mt-4 inline-flex rounded-lg bg-gray-100 p-1">
        <button type="button" onClick={() => setActiveList("contributors")} className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${activeList === "contributors" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600"}`}>Contributors ({contributorIds.size})</button>
        <button type="button" onClick={() => setActiveList("pending")} className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${activeList === "pending" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600"}`}>Not Yet Contributed ({nonContributors.length})</button>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
        <div className="max-h-[50vh] overflow-auto">
          {activeList === "contributors" ? (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 bg-gray-50"><tr>{["Member", "Amount", "Date", "Method", "Recorded by", ""].map((header, index) => <th key={`${header}-${index}`} className="px-3 py-2 text-left text-xs uppercase text-gray-500">{header}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">{event.payments.length ? event.payments.map((payment) => <tr key={payment.id}><td className="px-3 py-3"><p className="font-medium text-gray-900">{payment.userName}</p><p className="text-xs text-gray-500">{payment.userEmail}</p></td><td className="whitespace-nowrap px-3 py-3 font-semibold text-emerald-600">{formatCurrency(payment.amount)}</td><td className="whitespace-nowrap px-3 py-3 text-gray-600">{payment.paymentDate}</td><td className="px-3 py-3 capitalize text-gray-600">{payment.paymentMethod.replaceAll("_", " ")}</td><td className="px-3 py-3 text-gray-600">{payment.createdByName}</td><td className="px-3 py-3">{canVoid ? <button type="button" disabled={pending} onClick={() => onVoid(payment)} title="Void payment" aria-label="Void payment" className="inline-flex size-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="size-4" /></button> : null}</td></tr>) : <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No payments recorded.</td></tr>}</tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs uppercase text-gray-500">Member</th><th className="px-4 py-2 text-left text-xs uppercase text-gray-500">Status</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{nonContributors.length ? nonContributors.map((user) => <tr key={user.id}><td className="px-4 py-3 font-medium text-gray-900">{user.name}</td><td className="px-4 py-3"><span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">Not Started</span></td></tr>) : <tr><td colSpan={2} className="px-4 py-10 text-center text-emerald-600">All active members have contributed.</td></tr>}</tbody>
            </table>
          )}
        </div>
      </div>
    </EventDialog>
  );
}

function EventDialog({ title, children, onClose, width = "max-w-2xl" }: { title: string; children: ReactNode; onClose: () => void; width?: string }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${width}`} onMouseDown={(event) => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4"><h2 className="text-lg font-bold text-gray-900">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Close"><X className="size-5" /></button></div><div className="p-5">{children}</div></section></div>;
}

function EventField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>{children}</label>;
}

function DialogFooter({ pending, label, onClose }: { pending: boolean; label: string; onClose: () => void }) {
  return <div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" onClick={onClose} disabled={pending} className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-600">Cancel</button><button type="submit" disabled={pending} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{pending ? "Saving..." : label}</button></div>;
}

const fieldClass = "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function formatCurrency(value: number) {
  const amount = Math.round(value * 100) / 100;
  return `RWF ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}
