"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAppDialog } from "@/components/app-dialog-provider";
import { ActionNotice } from "@/components/action-notice";
import { ADMIN_NOTIFICATIONS_CHANGED_EVENT } from "@/lib/admin-notification-events";
import { BarChart3, CheckCircle2, ChevronLeft, ChevronRight, FileSearch2, MailCheck, Megaphone, Pencil, Plus, RefreshCw, Search, Send, Trash2, Upload, X } from "lucide-react";
import {
  deleteAnnouncement,
  saveAnnouncement,
  sendAnnouncementEmail,
  toggleAnnouncementStatus,
} from "@/app/admin/announcements/actions";

type RoleOption = {
  id: number;
  name: string;
  displayName: string;
};

type UserOption = {
  id: number;
  name: string;
  email: string;
};

type Announcement = {
  id: number;
  title: string;
  content: string;
  type: string;
  status: string;
  scheduledDate: string;
  scheduledDateRaw: string;
  expiryDate: string;
  expiryDateRaw: string;
  targetType: string;
  targetRoles: number[];
  targetUsers: number[];
  recipientLabel: string;
  recipientCount: number;
  deliveredCount: number;
  readCount: number;
  readRate: number;
  readers: Array<{
    id: number;
    name: string;
    email: string;
    readAt: string;
  }>;
  unreadRecipients: Array<{
    id: number;
    name: string;
    email: string;
  }>;
  emailSent: boolean;
  createdByName: string;
  publishedByName: string | null;
  publishedAt: string;
  createdAt: string;
};

type Result = {
  ok: boolean;
  message: string;
};

const ANNOUNCEMENTS_PER_PAGE = 5;

export function AnnouncementsClient({
  announcements,
  roles,
  users,
  readOnly,
}: {
  announcements: Announcement[];
  roles: RoleOption[];
  users: UserOption[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const { confirm } = useAppDialog();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"compose" | "edit" | "view" | "analytics" | null>(null);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [analyticsAudience, setAnalyticsAudience] = useState<"read" | "unread">("read");
  const [targetType, setTargetType] = useState<"all" | "roles" | "users">("all");
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!result?.ok) return;
    const timeout = window.setTimeout(() => setResult(null), 5_000);
    return () => window.clearTimeout(timeout);
  }, [result]);

  const filteredAnnouncements = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return announcements.filter((announcement) => {
      const matchesSearch = !needle || `${announcement.title} ${announcement.content} ${announcement.recipientLabel}`.toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || announcement.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [announcements, query, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / ANNOUNCEMENTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * ANNOUNCEMENTS_PER_PAGE;
  const visibleAnnouncements = filteredAnnouncements.slice(pageStart, pageStart + ANNOUNCEMENTS_PER_PAGE);

  const filteredUsers = useMemo(() => {
    const needle = userSearch.trim().toLowerCase();
    return users
      .filter((user) => !needle || user.name.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [users, userSearch]);
  const selectedRoleLabels = roles.filter((role) => selectedRoles.includes(role.id)).map((role) => role.displayName);
  const selectedUserLabels = users.filter((user) => selectedUsers.includes(user.id)).map((user) => user.name);
  const recipientCount = targetType === "all" ? users.length : targetType === "roles" ? selectedRoles.length : selectedUsers.length;

  function openCompose() {
    setSelected(null);
    setTargetType("all");
    setSelectedRoles([]);
    setSelectedUsers([]);
    setUserSearch("");
    setResult(null);
    setModal("compose");
  }

  function openEdit(announcement: Announcement) {
    setSelected(announcement);
    setTargetType(announcement.targetType === "roles" ? "roles" : announcement.targetType === "users" ? "users" : "all");
    setSelectedRoles(announcement.targetRoles);
    setSelectedUsers(announcement.targetUsers);
    setUserSearch("");
    setResult(null);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setSelected(null);
  }

  function submitAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("targetType", targetType);
    formData.set("targetRoles", JSON.stringify(selectedRoles));
    formData.set("targetUsers", JSON.stringify(selectedUsers));
    if (selected) formData.set("id", String(selected.id));

    setResult(null);
    startTransition(async () => {
      const response = await saveAnnouncement(formData);
      setResult(response);
      if (response.ok) {
        closeModal();
        router.refresh();
        window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_CHANGED_EVENT));
      }
    });
  }

  function runAction(action: () => Promise<Result>) {
    setResult(null);
    startTransition(async () => {
      const response = await action();
      setResult(response);
      if (response.ok) {
        router.refresh();
        window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_CHANGED_EVENT));
      }
    });
  }

  async function removeAnnouncement(announcement: Announcement) {
    if (!await confirm({ title: "Delete Announcement", message: `Delete "${announcement.title}"? This action cannot be undone.`, confirmLabel: "Delete Announcement", tone: "danger" })) return;
    runAction(() => deleteAnnouncement(announcement.id));
  }

  function toggleRole(roleId: number) {
    setSelectedRoles((current) => current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]);
  }

  function toggleUser(userId: number) {
    setSelectedUsers((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-2 py-4 sm:px-4 sm:py-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{readOnly ? "Announcements" : "Announcement Management"}</h1>
        
        </div>
        {!readOnly && <button type="button" onClick={openCompose} className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
          <Plus className="size-4" />
          Compose
        </button>}
      </div>

      {result && (
        <ActionNotice message={result.message} tone={result.ok ? "success" : "error"} onClose={() => setResult(null)} />
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="size-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Sent Messages</h2>
            <span className="text-sm text-gray-500">({filteredAnnouncements.length} message{filteredAnnouncements.length === 1 ? "" : "s"})</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search messages..." className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72" />
            </div>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <button type="button" onClick={() => router.refresh()} className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-gray-500 hover:bg-gray-50" title="Refresh">
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {visibleAnnouncements.length ? visibleAnnouncements.map((announcement) => (
            <article key={announcement.id} className="group flex flex-col gap-3 px-4 py-4 transition hover:bg-gray-50 lg:flex-row lg:items-center lg:justify-between">
              <button type="button" onClick={() => { setSelected(announcement); setModal("view"); }} className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusBadge(announcement.status)}`}>{announcement.status}</span>
                  {announcement.emailSent && <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700"><CheckCircle2 className="size-3" /> Email sent</span>}
                  <span className="text-xs text-gray-400">To: {announcement.recipientLabel}</span>
                </div>
                <h3 className="mt-2 truncate text-sm font-semibold text-gray-900">{announcement.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">{announcement.content}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                  <span>{announcement.recipientCount} recipient(s)</span>
                  {!readOnly ? <span>{announcement.deliveredCount} delivered</span> : null}
                  {!readOnly ? <span>{announcement.readCount} read ({announcement.readRate}%)</span> : null}
                  <span>Created: {announcement.createdAt}</span>
                  <span>By {announcement.createdByName}</span>
                  {announcement.publishedAt !== "-" && <span>Published: {announcement.publishedAt}</span>}
                </div>
              </button>
              <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(announcement);
                      setAnalyticsAudience("read");
                      setModal("analytics");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50 lg:w-[270px]"
                    title="View announcement analytics"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-blue-700 shadow-sm">
                      <BarChart3 className="size-4" aria-hidden="true" />
                    </span>
                    <span className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-blue-100">
                      <span className="px-2 first:pl-0"><strong className="block text-sm text-slate-900">{announcement.deliveredCount}</strong><small className="text-[10px] text-slate-500">Delivered</small></span>
                      <span className="px-2"><strong className="block text-sm text-slate-900">{announcement.readCount}</strong><small className="text-[10px] text-slate-500">Read</small></span>
                      <span className="px-2 pr-0"><strong className="block text-sm text-blue-700">{announcement.readRate}%</strong><small className="text-[10px] text-slate-500">Rate</small></span>
                    </span>
                  </button>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setSelected(announcement); setModal("view"); }} className="rounded-lg border border-gray-200 px-3 py-2 text-gray-600 hover:bg-white" title="View">
                    <FileSearch2 className="size-4" />
                  </button>
                  {!readOnly && <><button type="button" onClick={() => openEdit(announcement)} className="rounded-lg border border-gray-200 px-3 py-2 text-blue-600 hover:bg-blue-50" title="Edit">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" onClick={() => runAction(() => toggleAnnouncementStatus(announcement.id))} disabled={pending} className="rounded-lg border border-gray-200 px-3 py-2 text-indigo-600 hover:bg-indigo-50" title={announcement.status === "active" ? "Unpublish" : "Publish"} aria-label={announcement.status === "active" ? "Unpublish announcement" : "Publish announcement"}>
                    {announcement.status === "active" ? (
                      <span className="relative inline-flex size-4">
                        <Upload className="size-4" />
                        <span className="absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current shadow-[0_0_0_1px_white]" aria-hidden="true" />
                      </span>
                    ) : (
                      <Upload className="size-4" />
                    )}
                  </button>
                  {announcement.status === "active" && !announcement.emailSent && (
                    <button type="button" onClick={() => runAction(() => sendAnnouncementEmail(announcement.id))} disabled={pending} className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-green-700 hover:bg-green-100" title="Send email" aria-label="Send announcement by email">
                      <MailCheck className="size-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => removeAnnouncement(announcement)} disabled={pending} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100" title="Delete">
                    <Trash2 className="size-4" />
                  </button></>}
                </div>
              </div>
            </article>
          )) : (
            <div className="py-14 text-center">
              <Megaphone className="mx-auto mb-3 size-10 text-gray-300" />
              <p className="text-sm text-gray-500">No announcements found</p>
              {!readOnly && <button type="button" onClick={openCompose} className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">Create your first announcement</button>}
            </div>
          )}
        </div>
        {filteredAnnouncements.length > ANNOUNCEMENTS_PER_PAGE ? (
          <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-gray-500">
              Showing {pageStart + 1}–{Math.min(pageStart + ANNOUNCEMENTS_PER_PAGE, filteredAnnouncements.length)} of {filteredAnnouncements.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous announcements page"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <span className="min-w-20 text-center font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next announcements page"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {(modal === "compose" || modal === "edit") && (
        <div className="fixed inset-0 z-[80] grid place-items-start bg-gray-600/50 p-3 pt-8 sm:place-items-center sm:pt-3">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-xl border bg-white shadow-2xl">
            <div className="flex items-center justify-between rounded-t-xl border-b bg-gray-50 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <Pencil className="size-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">{selected ? "Edit Message" : "New Message"}</h3>
              </div>
              <button type="button" onClick={closeModal} className="text-gray-400 transition hover:text-gray-600" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={submitAnnouncement} className="max-h-[calc(92vh-72px)] overflow-y-auto p-4 sm:p-6">
              <div className="mb-2">
                <div className="flex flex-col gap-1 border-b border-gray-200 pb-2 sm:flex-row sm:items-start sm:gap-0">
                  <span className="w-full text-sm font-medium text-gray-600 sm:w-12 sm:pt-1.5">To</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <select value={targetType} onChange={(event) => setTargetType(event.target.value as "all" | "roles" | "users")} className="w-full border-0 bg-transparent px-1 py-1.5 text-sm font-medium text-gray-800 outline-none focus:ring-0">
                      <option value="all">All Users</option>
                      <option value="roles">Select Roles...</option>
                      <option value="users">Select Users...</option>
                    </select>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 sm:pt-1.5">{recipientCount ? `${recipientCount} selected` : ""}</span>
                </div>
              </div>

              {targetType === "roles" && (
                <div className="mb-3">
                  <div className="ml-0 sm:ml-12">
                    {selectedRoleLabels.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {selectedRoleLabels.map((label) => (
                          <span key={label} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{label}</span>
                        ))}
                      </div>
                    )}
                    <div className="max-h-40 overflow-y-auto rounded-lg border bg-gray-50">
                      {roles.map((role) => (
                        <label key={role.id} className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm last:border-0 hover:bg-white">
                          <input type="checkbox" checked={selectedRoles.includes(role.id)} onChange={() => toggleRole(role.id)} className="rounded border-gray-300" />
                          {role.displayName}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {targetType === "users" && (
                <div className="mb-3">
                  <div className="ml-0 sm:ml-12">
                    {selectedUserLabels.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {selectedUserLabels.slice(0, 8).map((label) => (
                          <span key={label} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{label}</span>
                        ))}
                        {selectedUserLabels.length > 8 && <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">+{selectedUserLabels.length - 8}</span>}
                      </div>
                    )}
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
                      <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search by name..." className="w-full rounded-lg border bg-gray-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                    </div>
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border bg-white shadow-lg">
                      {filteredUsers.map((user) => (
                        <label key={user.id} className="flex cursor-pointer items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 last:border-0 hover:bg-gray-50">
                          <span>
                            <span className="block text-sm font-medium text-gray-800">{user.name}</span>
                          </span>
                          <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggleUser(user.id)} className="rounded border-gray-300" />
                        </label>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">{selectedUsers.length} user(s) selected</p>
                  </div>
                </div>
              )}

              <div className="mb-2">
                <div className="flex flex-col gap-1 border-b border-gray-200 pb-2 sm:flex-row sm:items-start sm:gap-0">
                  <span className="w-full text-sm font-medium text-gray-600 sm:w-12 sm:pt-1.5">Subject</span>
                  <input name="title" defaultValue={selected?.title ?? ""} required placeholder="Enter subject..." className="flex-1 border-0 px-1 py-1.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0" />
                </div>
              </div>

              <div className="mb-3 mt-1 flex">
                <span className="hidden w-12 pt-1 text-sm font-medium text-gray-600 sm:block" />
                <textarea name="content" defaultValue={selected?.content ?? ""} rows={8} required placeholder="Write your message here..." className="w-full resize-none border-0 px-1 py-2 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:ring-0" />
              </div>

              {selected ? (
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="space-y-1">
                    <span className="block text-sm font-medium text-gray-700">Status</span>
                    <select name="status" defaultValue={selected.status} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                      <option value="active">Active</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="block text-sm font-medium text-gray-700">Scheduled Date</span>
                    <input name="scheduledDate" type="date" defaultValue={selected.scheduledDateRaw} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-sm font-medium text-gray-700">Expiry Date</span>
                    <input name="expiryDate" type="date" defaultValue={selected.expiryDateRaw} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </label>
                </div>
              ) : (
                <input type="hidden" name="status" value="active" />
              )}

              <input type="hidden" name="type" value="general" />

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">One-way announcement - replies are not monitored.</p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <button type="button" onClick={closeModal} className="rounded-lg px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100">Discard</button>
                  <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
                    <Send className="size-4" />
                    {pending ? "Saving..." : selected ? "Update" : "Send"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === "view" && selected && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 p-3">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-xs text-gray-500">To: {selected.recipientLabel}</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">{selected.title}</h3>
              </div>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[calc(92vh-150px)] overflow-y-auto p-5">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusBadge(selected.status)}`}>{selected.status}</span>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{selected.recipientCount} recipient(s)</span>
                {selected.emailSent && <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Email sent</span>}
              </div>
              {!readOnly ? (
                <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-center">
                  <div><p className="text-lg font-bold text-slate-900">{selected.deliveredCount}</p><p className="text-[11px] text-slate-500">Delivered</p></div>
                  <div><p className="text-lg font-bold text-slate-900">{selected.readCount}</p><p className="text-[11px] text-slate-500">Read</p></div>
                  <div><p className="text-lg font-bold text-blue-700">{selected.readRate}%</p><p className="text-[11px] text-slate-500">Read rate</p></div>
                </div>
              ) : null}
              <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{selected.content}</p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
              {!readOnly && <button type="button" onClick={() => openEdit(selected)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">Edit</button>}
              <button type="button" onClick={closeModal} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {modal === "analytics" && selected && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 p-3">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                  <BarChart3 className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Announcement analytics</p>
                  <h3 className="mt-1 truncate text-lg font-semibold text-gray-900">{selected.title}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">{selected.recipientLabel} · {selected.recipientCount} recipient(s)</p>
                </div>
              </div>
              <button type="button" onClick={closeModal} className="shrink-0 text-gray-400 hover:text-gray-600" aria-label="Close analytics">
                <X className="size-5" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-145px)] overflow-y-auto p-5">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{selected.deliveredCount}</p>
                  <p className="text-[11px] font-medium text-slate-500">In-app delivered</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-center">
                  <p className="text-xl font-bold text-slate-900">{selected.readCount}</p>
                  <p className="text-[11px] font-medium text-slate-500">Users who read</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
                  <p className="text-xl font-bold text-emerald-700">{selected.readRate}%</p>
                  <p className="text-[11px] font-medium text-slate-500">Read rate</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setAnalyticsAudience("read")}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      analyticsAudience === "read"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Read ({selected.readers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsAudience("unread")}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      analyticsAudience === "unread"
                        ? "bg-white text-amber-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Delivered, not yet read ({selected.unreadRecipients.length})
                  </button>
                </div>

                {analyticsAudience === "read" ? (
                  selected.readers.length > 0 ? (
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                      {selected.readers.map((reader) => (
                        <div key={reader.id} className="flex items-center gap-3 px-3 py-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold uppercase text-slate-600">
                            {reader.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">{reader.name}</span>
                          </span>
                          <span className="shrink-0 text-right text-[11px] text-slate-400">
                            <span className="block font-medium text-emerald-700">Read</span>
                            {reader.readAt}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <FileSearch2 className="mx-auto mb-2 size-7 text-slate-300" aria-hidden="true" />
                      <p className="text-sm font-medium text-slate-600">No recipients have read this announcement yet.</p>
                    </div>
                  )
                ) : selected.unreadRecipients.length > 0 ? (
                  <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                    {selected.unreadRecipients.map((recipient) => (
                      <div key={recipient.id} className="flex items-center gap-3 px-3 py-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-50 text-xs font-bold uppercase text-amber-700">
                          {recipient.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{recipient.name}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          Not read
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-8 text-center">
                    <CheckCircle2 className="mx-auto mb-2 size-7 text-emerald-500" aria-hidden="true" />
                    <p className="text-sm font-medium text-emerald-800">Everyone who received this announcement has read it.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t bg-slate-50 px-5 py-4">
              <button type="button" onClick={closeModal} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusBadge(status: string) {
  if (status === "active") return "bg-green-100 text-green-700";
  if (status === "scheduled") return "bg-blue-100 text-blue-700";
  if (status === "draft") return "bg-yellow-100 text-yellow-700";
  if (status === "expired") return "bg-red-100 text-red-700";
  if (status === "archived") return "bg-slate-100 text-slate-600";
  return "bg-gray-100 text-gray-700";
}
