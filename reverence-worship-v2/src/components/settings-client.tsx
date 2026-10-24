"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ActionNotice } from "@/components/action-notice";
import { Bell, BrushCleaning, CalendarClock, CheckCircle2, MailCheck, RefreshCw, ShieldCheck, TriangleAlert, UserPlus, X } from "lucide-react";
import {
  clearSystemCache,
  retryQueuedEmails,
  sendTestEmail,
  updateAccessSettings,
  updateNotificationSettings,
  updateProbationSettings,
  updateSecuritySettings,
} from "@/app/admin/settings/actions";
import { MobileTabScroller } from "@/components/mobile-tab-scroller";
import {
  MAX_SESSION_LIFETIME_MINUTES,
  MIN_SESSION_LIFETIME_MINUTES,
} from "@/lib/session-policy";
import { renderBirthdayTemplate } from "@/lib/birthday-rules";
import {
  ACCOUNT_NOTIFICATION_EVENTS,
  DEFAULT_ACCOUNT_EVENT_CHANNELS,
  accountNotificationEventChannelSettingKey,
  accountNotificationEventSettingKey,
  renderNotificationContent,
  type AccountNotificationEvent,
  type NotificationCategory,
  type NotificationRecipientSettings,
} from "@/lib/notification-rules";

export type SettingsValues = {
  registrationEnabled: boolean;
  sessionLifetime: number;
  passwordMinLength: number;
  passwordMaxLength: number;
  passwordHistoryCount: number;
  passwordRepeatEnabled: boolean;
  passwordRepeatMonths: number;
  passwordMinUsageEnabled: boolean;
  passwordMinUsageDays: number;
  passwordExpirationEnabled: boolean;
  passwordValidityDays: number;
  passwordExpirationWarningDays: number;
  forceLogoutOnPasswordReset: boolean;
  probationDefaultDurationMonths: number;
  notifications: {
    accountEnabled: boolean;
    securityEnabled: boolean;
    announcementEnabled: boolean;
    permissionEnabled: boolean;
    formEnabled: boolean;
    joinRequestEnabled: boolean;
    probationEnabled: boolean;
    taskEnabled: boolean;
    financeEnabled: boolean;
    systemEnabled: boolean;
    birthdayEnabled: boolean;
    birthdayTitleTemplate: string;
    birthdayMessageTemplate: string;
    channels: Record<NotificationCategory | "birthday", { inAppEnabled: boolean; emailEnabled: boolean }>;
    accountStatusMessageTemplate: string;
    accountRoleMessageTemplate: string;
    accountEvents: Record<AccountNotificationEvent, {
      enabled: boolean;
      inAppEnabled: boolean;
      emailEnabled: boolean;
    }>;
    recipients: Record<NotificationCategory, NotificationRecipientSettings>;
    templates: Record<NotificationCategory, { title: string; message: string }>;
  };
  notificationUsers: Array<{ id: number; name: string; email: string }>;
  notificationRoles: Array<{ id: number; displayName: string }>;
  emailInfrastructure: {
    configured: boolean;
    issue: string | null;
    appUrlConfigured: boolean;
    cronSecretConfigured: boolean;
    pendingEmails: number;
    failedEmails: number;
  };
};

type Result = {
  ok: boolean;
  message: string;
};

type TabId = "access" | "security" | "probation" | "notifications" | "maintenance";

const tabs = [
  { id: "access" as const, label: "Access", icon: UserPlus },
  { id: "security" as const, label: "Security", icon: ShieldCheck },
  { id: "probation" as const, label: "Probation", icon: CalendarClock },
  { id: "notifications" as const, label: "Notifications", icon: Bell },
  { id: "maintenance" as const, label: "Maintenance", icon: BrushCleaning },
];

const notificationCategoryLabels: Record<NotificationCategory, string> = {
  account: "Account updates",
  security: "Security alerts",
  announcement: "Announcements",
  permission: "Permission requests",
  form: "Forms",
  join_request: "Join requests",
  probation: "Probation",
  task: "Tasks",
  finance: "Finance",
  system: "System alerts",
};

const birthdayNotificationLabel = "Birthday wishes";

function NotificationChannelFields({
  fieldPrefix,
  channels,
}: {
  fieldPrefix: string;
  channels: { inAppEnabled: boolean; emailEnabled: boolean };
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-gray-700">Delivery channels</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <CheckField
          name={`${fieldPrefix}_in_app_enabled`}
          label="In-app"
          note=""
          defaultChecked={channels.inAppEnabled}
        />
        <CheckField
          name={`${fieldPrefix}_email_enabled`}
          label="Email"
          note=""
          defaultChecked={channels.emailEnabled}
        />
      </div>
    </fieldset>
  );
}

function NotificationCategorySettings({
  category,
  enabledName,
  enabled,
  note,
  recipients,
  users,
  roles,
  template,
  channels,
  accountStatusMessageTemplate,
  setAccountStatusMessageTemplate,
  accountRoleMessageTemplate,
  setAccountRoleMessageTemplate,
  birthdayTitleTemplate,
  setBirthdayTitleTemplate,
  birthdayMessageTemplate,
  setBirthdayMessageTemplate,
  accountEvents,
}: {
  category: NotificationCategory | "birthday";
  enabledName: string;
  enabled: boolean;
  note: string;
  recipients: NotificationRecipientSettings;
  users: Array<{ id: number; name: string; email: string }>;
  roles: Array<{ id: number; displayName: string }>;
  template: { title: string; message: string };
  channels: { inAppEnabled: boolean; emailEnabled: boolean };
  accountStatusMessageTemplate?: string;
  setAccountStatusMessageTemplate?: (value: string) => void;
  accountRoleMessageTemplate?: string;
  setAccountRoleMessageTemplate?: (value: string) => void;
  birthdayTitleTemplate?: string;
  setBirthdayTitleTemplate?: (value: string) => void;
  birthdayMessageTemplate?: string;
  setBirthdayMessageTemplate?: (value: string) => void;
  accountEvents?: SettingsValues["notifications"]["accountEvents"];
}) {
  const [open, setOpen] = useState(false);
  const [accountEventSettings, setAccountEventSettings] = useState<AccountNotificationEvent | null>(null);
  const [recipientMode, setRecipientMode] = useState(recipients.mode);
  const [selectedUserIds, setSelectedUserIds] = useState(recipients.userIds);
  const [selectedRoleIds, setSelectedRoleIds] = useState(recipients.roleIds);
  const [accountEventChannels, setAccountEventChannels] = useState(() => Object.fromEntries(
    ACCOUNT_NOTIFICATION_EVENTS.map((event) => [event.id, accountEvents?.[event.id] ?? { enabled: true, ...DEFAULT_ACCOUNT_EVENT_CHANNELS[event.id] }]),
  ) as SettingsValues["notifications"]["accountEvents"]);
  const [search, setSearch] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const fieldPrefix = `notification_${category}`;
  const categoryLabel = category === "birthday" ? birthdayNotificationLabel : notificationCategoryLabels[category];
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleUsers = users.filter((user) =>
    `${user.name} ${user.email}`.toLocaleLowerCase().includes(normalizedSearch),
  );

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (accountEventSettings) setAccountEventSettings(null);
        else setOpen(false);
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )).filter((element) => element.getClientRects().length > 0);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => openerRef.current?.focus(), 0);
    };
  }, [accountEventSettings, open]);

  function showSettings(target: HTMLElement) {
    openerRef.current = target;
    setOpen(true);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        <input
          id={`${fieldPrefix}_enabled`}
          type="checkbox"
          name={enabledName}
          value="1"
          defaultChecked={enabled}
          onClick={(event) => showSettings(event.currentTarget)}
          className="mt-0.5 size-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${fieldPrefix}_settings`}
            onClick={(event) => showSettings(event.currentTarget)}
            className="text-left text-sm font-medium text-gray-700 hover:text-blue-700"
          >
            {categoryLabel}
          </button>
          <p className="mt-0.5 text-xs text-gray-500">{note}</p>
        </div>
        <span className="shrink-0 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600">
          {category === "birthday"
              ? "Members and followers"
              : recipientMode === "all"
                ? "All Members"
                : recipientMode === "roles"
                  ? `${selectedRoleIds.length} role${selectedRoleIds.length === 1 ? "" : "s"}`
                  : `${selectedUserIds.length} individual${selectedUserIds.length === 1 ? "" : "s"}`}
        </span>
      </div>
      <div
        className={open ? "fixed inset-0 z-[200] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-[1px]" : "hidden"}
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div
          ref={dialogRef}
          id={`${fieldPrefix}_settings`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${fieldPrefix}_settings_title`}
          className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
            <div>
              <h2 id={`${fieldPrefix}_settings_title`} className="text-lg font-semibold text-gray-900">{categoryLabel}</h2>
              {category !== "account" && <p className="mt-1 text-sm text-gray-500">{note}</p>}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close notification settings"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-4 overflow-y-auto p-5">
          {category === "birthday" ? (
            <div className="space-y-4">
              {ACCOUNT_NOTIFICATION_EVENTS.flatMap((event) => ([
                accountEventChannels[event.id].inAppEnabled ? <input key={`${event.id}-in-app`} type="hidden" name={accountNotificationEventChannelSettingKey(event.id, "inAppEnabled")} value="1" /> : null,
                accountEventChannels[event.id].emailEnabled ? <input key={`${event.id}-email`} type="hidden" name={accountNotificationEventChannelSettingKey(event.id, "emailEnabled")} value="1" /> : null,
              ]))}
              <input type="hidden" name={`${fieldPrefix}_recipient_mode`} value={recipientMode} />
              {selectedUserIds.map((id) => <input key={`account-recipient-${id}`} type="hidden" name={`${fieldPrefix}_recipient_users`} value={id} />)}
              {selectedRoleIds.map((id) => <input key={`account-role-${id}`} type="hidden" name={`${fieldPrefix}_recipient_roles`} value={id} />)}
              <input type="hidden" name="notification_account_status_message_template" value={accountStatusMessageTemplate ?? ""} />
              <input type="hidden" name="notification_account_role_message_template" value={accountRoleMessageTemplate ?? ""} />
              <NotificationChannelFields fieldPrefix={fieldPrefix} channels={channels} />
              <Field label="Notification title" note="Use {firstName} or {fullName} to personalize the greeting.">
                <input
                  name="notification_birthday_title_template"
                  value={birthdayTitleTemplate ?? ""}
                  onChange={(event) => setBirthdayTitleTemplate?.(event.target.value)}
                  maxLength={120}
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Birthday message" note="Use {firstName} or {fullName} to personalize the message.">
                <textarea
                  name="notification_birthday_message_template"
                  value={birthdayMessageTemplate ?? ""}
                  onChange={(event) => setBirthdayMessageTemplate?.(event.target.value)}
                  maxLength={1000}
                  rows={4}
                  required
                  className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm leading-6 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <div className="rounded-lg border border-pink-100 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-700">Preview for Alice Uwimana</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">{renderBirthdayTemplate(birthdayTitleTemplate ?? "", "Alice Uwimana")}</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-600">{renderBirthdayTemplate(birthdayMessageTemplate ?? "", "Alice Uwimana")}</p>
              </div>
            </div>
          ) : category === "account" ? (
            <div className="space-y-4">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-700">Notification events</legend>
                <div className="space-y-3">
                  {ACCOUNT_NOTIFICATION_EVENTS.map((event) => {
                    const eventChannels = accountEvents?.[event.id] ?? {
                      enabled: true,
                      ...DEFAULT_ACCOUNT_EVENT_CHANNELS[event.id],
                    };
                    return (
                      <div key={event.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            id={accountNotificationEventSettingKey(event.id)}
                            type="checkbox"
                            name={accountNotificationEventSettingKey(event.id)}
                            value="1"
                            defaultChecked={eventChannels.enabled}
                            aria-label={`Enable ${event.label}`}
                            className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            aria-controls={`${fieldPrefix}_${event.id}_settings`}
                            onClick={() => setAccountEventSettings(event.id)}
                            className="text-left text-sm font-medium text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-900 hover:decoration-blue-500"
                          >
                            {event.label}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
              <div
                className={accountEventSettings ? "fixed inset-0 z-[220] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-[1px]" : "hidden"}
                role="presentation"
                onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountEventSettings(null); }}
              >
                <section id={`${fieldPrefix}_${accountEventSettings ?? "registration"}_settings`} role="dialog" aria-modal="true" aria-labelledby={`${fieldPrefix}_event_settings_title`} className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                    <div>
                      <h3 id={`${fieldPrefix}_event_settings_title`} className="font-semibold text-slate-900">{ACCOUNT_NOTIFICATION_EVENTS.find((event) => event.id === accountEventSettings)?.label ?? "Account event settings"}</h3>
                      <p className="mt-1 text-xs text-slate-500">Choose delivery channels and configure this notification.</p>
                    </div>
                    <button type="button" onClick={() => setAccountEventSettings(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close account event settings"><X className="size-5" /></button>
                  </header>
                  <div className="space-y-5 overflow-y-auto p-5">
                    <fieldset>
                      <legend className="mb-2 text-sm font-medium text-gray-700">Delivery channels</legend>
                      <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {(["inAppEnabled", "emailEnabled"] as const).map((channel) => <label key={channel} className="flex items-center gap-3"><input type="checkbox" checked={accountEventChannels[accountEventSettings ?? "registration"][channel]} onChange={(event) => setAccountEventChannels((current) => ({ ...current, [accountEventSettings ?? "registration"]: { ...current[accountEventSettings ?? "registration"], [channel]: event.target.checked } }))} className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="text-sm text-gray-700">{channel === "inAppEnabled" ? "In-app" : "Email"}</span></label>)}
                      </div>
                    </fieldset>
                    {accountEventSettings === "registration" ? <>
                    <fieldset className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <legend className="px-1 text-sm font-medium text-gray-700">Who receives new registration alerts?</legend>
                      <p className="mb-3 mt-1 text-xs text-gray-500">These recipients are added to administrators who can approve accounts.</p>
                      <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
                        {(["individuals", "roles", "all"] as const).map((mode) => (
                          <label key={mode} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                            <input type="radio" value={mode} checked={recipientMode === mode} onChange={() => setRecipientMode(mode)} className="size-4 border-gray-300 text-blue-600 focus:ring-blue-500" />
                            {mode === "individuals" ? "Per Individuals" : mode === "roles" ? "Per Role" : "All Members"}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {recipientMode === "individuals" ? <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor={`${fieldPrefix}_recipient_search`}>Select individuals</label>
                      <input id={`${fieldPrefix}_recipient_search`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search active people by name or email" className={`${inputClass} mt-1`} />
                      <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
                        {users.map((user) => <label key={user.id} className={`${visibleUsers.some((visibleUser) => visibleUser.id === user.id) ? "flex" : "hidden"} items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50`}><input type="checkbox" value={user.id} checked={selectedUserIds.includes(user.id)} onChange={() => setSelectedUserIds((current) => current.includes(user.id) ? current.filter((id) => id !== user.id) : [...current, user.id])} className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /><span className="min-w-0 truncate">{user.name}</span></label>)}
                        {!visibleUsers.length ? <p className="px-2 py-3 text-sm text-gray-500">No active people match this search.</p> : null}
                      </div>
                    </div> : null}
                    {recipientMode === "roles" ? <div>
                      <p className="mb-1 text-sm font-medium text-gray-700">Select roles</p>
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
                        {roles.length ? roles.map((role) => <label key={role.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"><input type="checkbox" value={role.id} checked={selectedRoleIds.includes(role.id)} onChange={() => setSelectedRoleIds((current) => current.includes(role.id) ? current.filter((id) => id !== role.id) : [...current, role.id])} className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />{role.displayName}</label>) : <p className="px-2 py-3 text-sm text-gray-500">No roles are available.</p>}
                      </div>
                    </div> : null}
                    {recipientMode === "all" ? <p className="text-xs text-gray-500">This includes everyone with an active account.</p> : null}
                    </> : accountEventSettings === "status_change" ? <div className="space-y-4">
                      <Field label="Account status change message" note="Use {firstName}, {old status}, and {new status}.">
                        <textarea value={accountStatusMessageTemplate ?? ""} onChange={(event) => setAccountStatusMessageTemplate?.(event.target.value)} maxLength={1000} rows={4} required className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm leading-6 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                      </Field>
                      <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Status message preview</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">{renderNotificationContent("", "", { title: "", message: accountStatusMessageTemplate ?? "" }, { firstName: "Alice", oldStatus: "Pending", newStatus: "Active" }).message}</p></div>
                    </div> : accountEventSettings === "role_change" ? <div className="space-y-4">
                      <Field label="Account role change message" note="Use {firstName}, {oldRole}, and {newRole}.">
                        <textarea value={accountRoleMessageTemplate ?? ""} onChange={(event) => setAccountRoleMessageTemplate?.(event.target.value)} maxLength={1000} rows={4} required className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm leading-6 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                      </Field>
                      <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Role message preview</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">{renderNotificationContent("", "", { title: "", message: accountRoleMessageTemplate ?? "" }, { firstName: "Alice", oldRole: "Visitor", newRole: "Member" }).message}</p></div>
                    </div> : null}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <>
              <NotificationChannelFields fieldPrefix={fieldPrefix} channels={channels} />
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-700">Who receives this notification?</legend>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-5">
                  {([
                    ["individuals", "Per Individuals"],
                    ["roles", "Per Role"],
                    ["all", "All Members"],
                  ] as const).map(([mode, label]) => (
                    <label key={mode} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name={`${fieldPrefix}_recipient_mode`}
                        value={mode}
                        checked={recipientMode === mode}
                        onChange={() => setRecipientMode(mode)}
                        className="size-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {category !== "account" && category !== "birthday" && (
            <>
              <Field
                label="Notification title"
                note="Leave blank to keep the original title. The only supported placeholder is {title}."
              >
                <input
                  name={`${fieldPrefix}_title_template`}
                  defaultValue={template.title}
                  maxLength={120}
                  className={inputClass}
                />
              </Field>
              <p className="-mt-3 text-xs text-gray-500">
                Example: <code className="rounded bg-gray-100 px-1">Action required: {"{title}"}</code>
              </p>
              <Field
                label="Notification message"
                note="Supported placeholders: {title} for the original title and {message} for the original message. Other placeholders, such as {name}, are not supported."
              >
                <textarea
                  name={`${fieldPrefix}_message_template`}
                  defaultValue={template.message}
                  maxLength={1000}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm leading-6 text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <p className="-mt-3 text-xs text-gray-500">
                Example: <code className="rounded bg-gray-100 px-1">Please review this update: {"{message}"}</code>
              </p>
            </>
          )}
          {category !== "account" && category !== "birthday" && <div className={recipientMode === "individuals" ? "" : "hidden"}>
            <label className="block text-sm font-medium text-gray-700" htmlFor={`${fieldPrefix}_recipient_search`}>
              Select individuals
            </label>
            <input
              id={`${fieldPrefix}_recipient_search`}
              type="search"
              value={search}
              onChange={(event) => {
                event.stopPropagation();
                setSearch(event.target.value);
              }}
              placeholder="Search active people by name or email"
              className={`${inputClass} mt-1`}
            />
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
              {users.map((user) => (
                <label key={user.id} className={`${visibleUsers.some((visibleUser) => visibleUser.id === user.id) ? "flex" : "hidden"} items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50`}>
                  <input
                    type="checkbox"
                    name={`${fieldPrefix}_recipient_users`}
                    value={user.id}
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => setSelectedUserIds((current) =>
                      current.includes(user.id) ? current.filter((id) => id !== user.id) : [...current, user.id],
                    )}
                    className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{user.name}</span>
                  </span>
                </label>
              ))}
              {!visibleUsers.length ? <p className="px-2 py-3 text-sm text-gray-500">No active people match this search.</p> : null}
            </div>
          </div>}
          {category !== "account" && category !== "birthday" && <div className={recipientMode === "roles" ? "" : "hidden"}>
            <p className="mb-1 text-sm font-medium text-gray-700">Select roles</p>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2">
              {roles.length ? roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    name={`${fieldPrefix}_recipient_roles`}
                    value={role.id}
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => setSelectedRoleIds((current) =>
                      current.includes(role.id) ? current.filter((id) => id !== role.id) : [...current, role.id],
                    )}
                    className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {role.displayName}
                </label>
              )) : <p className="px-2 py-3 text-sm text-gray-500">No roles are available.</p>}
            </div>
          </div>}
          {category !== "account" && category !== "birthday" && recipientMode === "all" ? <p className="text-xs text-gray-500">This includes everyone with an active account.</p> : null}
        </div>
      </div>
    </div>
    </div>
  );
}

export function SettingsClient({ values }: { values: SettingsValues }) {
  const [activeTab, setActiveTab] = useState<TabId>("access");
  const [result, setResult] = useState<Result | null>(null);
  const [birthdayTitleTemplate, setBirthdayTitleTemplate] = useState(values.notifications.birthdayTitleTemplate);
  const [birthdayMessageTemplate, setBirthdayMessageTemplate] = useState(values.notifications.birthdayMessageTemplate);
  const [accountStatusMessageTemplate, setAccountStatusMessageTemplate] = useState(values.notifications.accountStatusMessageTemplate);
  const [accountRoleMessageTemplate, setAccountRoleMessageTemplate] = useState(values.notifications.accountRoleMessageTemplate);
  const [pending, startTransition] = useTransition();
  const accessRef = useRef<HTMLFormElement>(null);
  const securityRef = useRef<HTMLFormElement>(null);
  const probationRef = useRef<HTMLFormElement>(null);
  const notificationRef = useRef<HTMLFormElement>(null);
  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function runAction(action: (formData: FormData) => Promise<Result>, form: HTMLFormElement | null) {
    if (!form) return;
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await action(new FormData(form)));
      } catch (error) {
        console.error("Unable to save system settings.", error);
        setResult({
          ok: false,
          message: error instanceof Error ? error.message : "Unable to save system settings. Please try again.",
        });
      }
    });
  }

  function autoSave(key: string, action: (formData: FormData) => Promise<Result>, form: HTMLFormElement | null) {
    if (!form || !form.checkValidity()) return;
    clearTimeout(autoSaveTimers.current[key]);
    autoSaveTimers.current[key] = setTimeout(() => {
      runAction(action, form);
    }, 500);
  }

  function runButtonAction(action: () => Promise<Result>) {
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await action());
      } catch (error) {
        console.error("Unable to complete system settings action.", error);
        setResult({
          ok: false,
          message: error instanceof Error ? error.message : "Unable to complete this action. Please try again.",
        });
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-2 py-4 sm:px-4 sm:py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
       
      </div>

      {result ? (
        <ActionNotice message={result.message} tone={result.ok ? "success" : "error"} onClose={() => setResult(null)} />
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200">
          <div className="p-3 md:hidden">
            <MobileTabScroller tabs={tabs} value={activeTab} onChange={(tab) => setActiveTab(tab as TabId)} />
          </div>
          <nav className="hidden overflow-x-auto md:flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition ${
                    active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className={activeTab === "access" ? "block" : "hidden"}>
          <form ref={accessRef} onChange={() => autoSave("access", updateAccessSettings, accessRef.current)} className="p-4 sm:p-6">
            <div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 inline-flex size-10 items-center justify-center rounded-full ${values.registrationEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    <UserPlus className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">Public Registration</h3>

                    <div className="mt-4">
                      <CheckField
                        name="registration_enabled"
                        label="Enable public registration"
                        note="When off, the login page register link is removed, /register is blocked, and direct registration submissions fail."
                        defaultChecked={values.registrationEnabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <AutoSaveNote pending={pending} />
          </form>
        </div>

        <div className={activeTab === "security" ? "block" : "hidden"}>
          <form ref={securityRef} onChange={() => autoSave("security", updateSecuritySettings, securityRef.current)} className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Session Lifetime (minutes)" note="Maximum is 60 minutes. Active users are refreshed; idle users are logged out automatically.">
                <input
                  name="session_lifetime"
                  type="number"
                  min={MIN_SESSION_LIFETIME_MINUTES}
                  max={MAX_SESSION_LIFETIME_MINUTES}
                  required
                  defaultValue={values.sessionLifetime}
                  className={inputClass}
                />
              </Field>
              <Field label="Minimum Password Length" note="Affects new public registrations. Minimum allowed value is 6.">
                <input name="password_min_length" type="number" min={6} max={255} required defaultValue={values.passwordMinLength} className={inputClass} />
              </Field>
              <Field label="Maximum Password Length" note="Saved for future password-policy enforcement.">
                <input name="password_max_length" type="number" min={6} max={255} required defaultValue={values.passwordMaxLength} className={inputClass} />
              </Field>
              <Field label="Password History" note="Number of previous passwords to remember.">
                <input name="password_history_count" type="number" min={0} max={24} required defaultValue={values.passwordHistoryCount} className={inputClass} />
              </Field>
              <Field label="Prevent Password Reuse" note="Prevent reuse of a password within the selected period.">
                <div className="flex items-center gap-3">
                  <input
                    name="password_repeat_enabled"
                    type="checkbox"
                    value="1"
                    defaultChecked={values.passwordRepeatEnabled}
                    className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enable</span>
                  <input
                    name="password_repeat_months"
                    type="number"
                    min={1}
                    max={24}
                    required
                    defaultValue={values.passwordRepeatMonths}
                    aria-label="Password reuse interval in months"
                    className={`${inputClass} max-w-28`}
                  />
                  <span className="text-sm text-gray-600">months</span>
                </div>
              </Field>
              <Field label="Minimum Password Usage Period" note="Require a password to be used for a minimum number of days.">
                <div className="flex items-center gap-3">
                  <input
                    name="password_min_usage_enabled"
                    type="checkbox"
                    value="1"
                    defaultChecked={values.passwordMinUsageEnabled}
                    className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enable</span>
                  <input
                    name="password_min_usage_days"
                    type="number"
                    min={1}
                    max={365}
                    required
                    defaultValue={values.passwordMinUsageDays}
                    aria-label="Minimum password usage period in days"
                    className={`${inputClass} max-w-28`}
                  />
                  <span className="text-sm text-gray-600">days</span>
                </div>
              </Field>
              <Field label="Password Expiration" note="Set password validity and how early to warn users.">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    name="password_expiration_enabled"
                    type="checkbox"
                    value="1"
                    defaultChecked={values.passwordExpirationEnabled}
                    className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enable</span>
                  <input
                    name="password_validity_days"
                    type="number"
                    min={1}
                    max={3650}
                    required
                    defaultValue={values.passwordValidityDays}
                    aria-label="Password validity in days"
                    className={`${inputClass} max-w-28`}
                  />
                  <span className="text-sm text-gray-600">validity days</span>
                  <input
                    name="password_expiration_warning_days"
                    type="number"
                    min={1}
                    max={180}
                    required
                    defaultValue={values.passwordExpirationWarningDays}
                    aria-label="Password expiration warning in days"
                    className={`${inputClass} max-w-28`}
                  />
                  <span className="text-sm text-gray-600">warning days</span>
                </div>
              </Field>
              <div className="md:col-span-2">
                <CheckField
                  name="force_logout_on_password_reset"
                  label="Force logout after password reset"
                  defaultChecked={values.forceLogoutOnPasswordReset}
                />
              </div>
            </div>
            <p className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              Existing passwords are not affected. Minimum length applies to new public registrations; the other password policy options are saved for future enforcement and are not active yet.
            </p>
            <AutoSaveNote pending={pending} />
          </form>
        </div>

        <div className={activeTab === "notifications" ? "block" : "hidden"}>
          <form ref={notificationRef} onChange={() => autoSave("notifications", updateNotificationSettings, notificationRef.current)} className="p-4 sm:p-6">
            <div className={`mb-5 rounded-xl border p-4 ${
              values.emailInfrastructure.configured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
            }`}>
              <div className="flex items-start gap-3">
                {values.emailInfrastructure.configured
                  ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
                  : <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />}
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold ${values.emailInfrastructure.configured ? "text-emerald-900" : "text-amber-900"}`}>Email Delivery Health</h3>
                  <p className={`mt-1 text-sm ${values.emailInfrastructure.configured ? "text-emerald-800" : "text-amber-800"}`}>
                    {values.emailInfrastructure.configured ? "SMTP environment variables are present." : values.emailInfrastructure.issue}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                    <span className={`rounded-full px-2.5 py-1 ${values.emailInfrastructure.appUrlConfigured ? "bg-emerald-100 text-emerald-700" : "bg-white/70 text-amber-800"}`}>
                      Email links: {values.emailInfrastructure.appUrlConfigured ? "Configured" : "APP_URL missing"}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 ${values.emailInfrastructure.cronSecretConfigured ? "bg-emerald-100 text-emerald-700" : "bg-white/70 text-amber-800"}`}>
                      Retry job: {values.emailInfrastructure.cronSecretConfigured ? "Configured" : "CRON_SECRET missing"}
                    </span>
                    <span className="rounded-full bg-white/70 px-2.5 py-1 text-slate-700">Queued: {values.emailInfrastructure.pendingEmails}</span>
                    <span className="rounded-full bg-white/70 px-2.5 py-1 text-slate-700">Failed: {values.emailInfrastructure.failedEmails}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => runButtonAction(sendTestEmail)} disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                      <MailCheck className="size-4" aria-hidden="true" />
                      Send Test Email
                    </button>
                    <button type="button" onClick={() => runButtonAction(retryQueuedEmails)} disabled={pending || values.emailInfrastructure.pendingEmails + values.emailInfrastructure.failedEmails === 0} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                      <RefreshCw className="size-4" aria-hidden="true" />
                      Retry Unsent Emails
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <h3 className="font-semibold text-gray-900">Notification Types</h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <NotificationCategorySettings
                      category="account"
                      enabledName="notification_account_enabled"
                      enabled={values.notifications.accountEnabled}
                      note="Approvals, deactivations, and role changes."
                      recipients={values.notifications.recipients.account}
                      users={values.notificationUsers}
                      roles={values.notificationRoles}
                      template={values.notifications.templates.account}
                      channels={values.notifications.channels.account}
                      accountStatusMessageTemplate={accountStatusMessageTemplate}
                      setAccountStatusMessageTemplate={setAccountStatusMessageTemplate}
                      accountRoleMessageTemplate={accountRoleMessageTemplate}
                      setAccountRoleMessageTemplate={setAccountRoleMessageTemplate}
                      accountEvents={values.notifications.accountEvents}
                    />
                    <NotificationCategorySettings
                      category="security"
                      enabledName="notification_security_enabled"
                      enabled={values.notifications.securityEnabled}
                      note="Password resets and password or email changes."
                      recipients={values.notifications.recipients.security}
                      users={values.notificationUsers}
                      roles={values.notificationRoles}
                      template={values.notifications.templates.security}
                      channels={values.notifications.channels.security}
                    />
                    <NotificationCategorySettings
                      category="announcement"
                      enabledName="notification_announcement_enabled"
                      enabled={values.notifications.announcementEnabled}
                      note="Admin announcements and broadcasts."
                      recipients={values.notifications.recipients.announcement}
                      users={values.notificationUsers}
                      roles={values.notificationRoles}
                      template={values.notifications.templates.announcement}
                      channels={values.notifications.channels.announcement}
                    />
                    <NotificationCategorySettings
                      category="permission"
                      enabledName="notification_permission_enabled"
                      enabled={values.notifications.permissionEnabled}
                      note="New requests and approval or rejection decisions."
                      recipients={values.notifications.recipients.permission}
                      users={values.notificationUsers}
                      roles={values.notificationRoles}
                      template={values.notifications.templates.permission}
                      channels={values.notifications.channels.permission}
                    />
                    <NotificationCategorySettings
                      category="form"
                      enabledName="notification_form_enabled"
                      enabled={values.notifications.formEnabled}
                      note="Available forms and submission reminders."
                      recipients={values.notifications.recipients.form}
                      users={values.notificationUsers}
                      roles={values.notificationRoles}
                      template={values.notifications.templates.form}
                      channels={values.notifications.channels.form}
                    />
                    <NotificationCategorySettings
                      category="join_request"
                      enabledName="notification_join_request_enabled"
                      enabled={values.notifications.joinRequestEnabled}
                      note="Guest requests to join Reverence Worship."
                      recipients={values.notifications.recipients.join_request}
                      users={values.notificationUsers}
                      roles={values.notificationRoles}
                      template={values.notifications.templates.join_request}
                      channels={values.notifications.channels.join_request}
                    />
                    <NotificationCategorySettings
                      category="probation"
                      enabledName="notification_probation_enabled"
                      enabled={values.notifications.probationEnabled}
                      note="Probation enrollment, updates, reviews, and decisions."
                      recipients={values.notifications.recipients.probation}
                      users={values.notificationUsers}
                      roles={values.notificationRoles}
                      template={values.notifications.templates.probation}
                      channels={values.notifications.channels.probation}
                    />
                    <NotificationCategorySettings
                      category="task"
                      enabledName="notification_task_enabled"
                      enabled={values.notifications.taskEnabled}
                      note="Assigned tasks and overdue task reminders."
                      recipients={values.notifications.recipients.task}
                      users={values.notificationUsers}
                      roles={values.notificationRoles}
                      template={values.notifications.templates.task}
                      channels={values.notifications.channels.task}
                    />
                    <NotificationCategorySettings
                      category="finance"
                      enabledName="notification_finance_enabled"
                      enabled={values.notifications.financeEnabled}
                      note="Expense approvals, payments, and contributions."
                      recipients={values.notifications.recipients.finance}
                      users={values.notificationUsers}
                      roles={values.notificationRoles}
                      template={values.notifications.templates.finance}
                      channels={values.notifications.channels.finance}
                    />
                    <NotificationCategorySettings
                      category="system"
                      enabledName="notification_system_enabled"
                      enabled={values.notifications.systemEnabled}
                      note="System health and delivery failure alerts."
                      recipients={values.notifications.recipients.system}
                      users={values.notificationUsers}
                      roles={values.notificationRoles}
                      template={values.notifications.templates.system}
                      channels={values.notifications.channels.system}
                    />
                    <NotificationCategorySettings
                      category="birthday"
                      enabledName="notification_birthday_enabled"
                      enabled={values.notifications.birthdayEnabled}
                      note="Personal birthday greetings and member birthday notices."
                      recipients={values.notifications.recipients.account}
                      users={values.notificationUsers}
                      roles={values.notificationRoles}
                      template={{ title: "", message: "" }}
                      channels={values.notifications.channels.birthday}
                      birthdayTitleTemplate={birthdayTitleTemplate}
                      setBirthdayTitleTemplate={setBirthdayTitleTemplate}
                      birthdayMessageTemplate={birthdayMessageTemplate}
                      setBirthdayMessageTemplate={setBirthdayMessageTemplate}
                    />
                  </div>
                </div>
            </div>
            <AutoSaveNote pending={pending} />
          </form>
        </div>

        <div className={activeTab === "probation" ? "block" : "hidden"}>
          <form ref={probationRef} onChange={() => autoSave("probation", updateProbationSettings, probationRef.current)} className="p-4 sm:p-6">
            <div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <Field label="Default Probation Duration (months)" note="Used to suggest the expected end date in full calendar months. The leader can still choose a different date.">
                  <input name="probation_default_duration_months" type="number" min={1} max={24} required defaultValue={values.probationDefaultDurationMonths} className={inputClass} />
                </Field>
              </div>
            </div>
            <AutoSaveNote pending={pending} />
          </form>
        </div>

        <div className={activeTab === "maintenance" ? "block" : "hidden"}>
          <div className="p-4 sm:p-6">
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
              <h3 className="font-semibold text-yellow-900">Refresh cached pages</h3>
              <p className="mt-1 text-sm leading-6 text-yellow-800">
                Clears Next.js cached route data for the app layout so public and admin pages can pick up changed data.
              </p>
              <button
                type="button"
                onClick={() => runButtonAction(clearSystemCache)}
                disabled={pending}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-yellow-500 px-4 text-sm font-medium text-white transition hover:bg-yellow-600 disabled:opacity-60"
              >
                <BrushCleaning className="size-4" aria-hidden="true" />
                {pending ? "Working..." : "Clear Cache"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {note ? <span className="mt-1 block text-xs text-gray-500">{note}</span> : null}
    </label>
  );
}

function CheckField({ name, label, note, defaultChecked }: { name: string; label: string; note?: string; defaultChecked: boolean }) {
  return (
    <div>
      <label className="flex items-center gap-3">
        <input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
      {note ? <p className="ml-7 mt-1 text-xs text-gray-500">{note}</p> : null}
    </div>
  );
}

function AutoSaveNote({ pending }: { pending: boolean }) {
  return (
    <div className="mt-6 border-t border-gray-200 pt-4 text-xs font-medium text-gray-500">
      {pending ? "Saving changes..." : "Changes are saved automatically."}
    </div>
  );
}
