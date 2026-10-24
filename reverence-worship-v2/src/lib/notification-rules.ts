export const NOTIFICATION_CATEGORIES = [
  "account",
  "security",
  "announcement",
  "permission",
  "form",
  "join_request",
  "probation",
  "task",
  "finance",
  "system",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const ACCOUNT_NOTIFICATION_EVENTS = [
  { id: "registration", label: "Registration and approval" },
  { id: "status_change", label: "Account status changes" },
  { id: "role_change", label: "Account role changes" },
] as const;

export type AccountNotificationEvent = (typeof ACCOUNT_NOTIFICATION_EVENTS)[number]["id"];

export type NotificationChannels = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

export const DEFAULT_ACCOUNT_EVENT_CHANNELS: Record<AccountNotificationEvent, NotificationChannels> = {
  registration: { inAppEnabled: true, emailEnabled: true },
  status_change: { inAppEnabled: true, emailEnabled: true },
  role_change: { inAppEnabled: true, emailEnabled: false },
};

export type NotificationContentTemplate = {
  title: string;
  message: string;
};

export type NotificationTemplateVariables = {
  firstName?: string;
  oldStatus?: string;
  newStatus?: string;
  oldRole?: string;
  newRole?: string;
};

export const DEFAULT_ACCOUNT_STATUS_MESSAGE_TEMPLATE =
  "Dear {firstName}, your account status has changed from {old status} to {new status}.";
export const DEFAULT_ACCOUNT_ROLE_MESSAGE_TEMPLATE =
  "Dear {firstName}, your account role has changed from {oldRole} to {newRole}.";

export const ACCOUNT_NOTIFICATION_PLACEHOLDERS = [
  "{firstName}",
  "{old status}",
  "{new status}",
  "{oldStatus}",
  "{newStatus}",
  "{oldRole}",
  "{newRole}",
] as const;

export type NotificationRecipientSettings = {
  mode: "individuals" | "roles" | "all";
  userIds: number[];
  roleIds: number[];
};

function positiveUniqueIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is number =>
    typeof id === "number" && Number.isSafeInteger(id) && id > 0,
  ))];
}

export function parseNotificationRecipientSettings(value: unknown): NotificationRecipientSettings {
  if (Array.isArray(value)) {
    return {
      mode: "individuals",
      userIds: positiveUniqueIds(value),
      roleIds: [],
    };
  }
  if (!value || typeof value !== "object") return { mode: "individuals", userIds: [], roleIds: [] };

  const candidate = value as Record<string, unknown>;
  return {
    mode: candidate.mode === "roles" || candidate.mode === "all" ? candidate.mode : "individuals",
    userIds: positiveUniqueIds(candidate.userIds),
    roleIds: positiveUniqueIds(candidate.roleIds),
  };
}

export function renderNotificationContent(
  title: string,
  message: string,
  template: NotificationContentTemplate,
  variables: NotificationTemplateVariables = {},
) {
  const render = (value: string, original: string) => {
    const replacements: Record<string, string> = {
      "{title}": title,
      "{message}": message,
      "{firstName}": variables.firstName ?? "",
      "{old status}": variables.oldStatus ?? "",
      "{new status}": variables.newStatus ?? "",
      "{oldStatus}": variables.oldStatus ?? "",
      "{newStatus}": variables.newStatus ?? "",
      "{oldRole}": variables.oldRole ?? "",
      "{newRole}": variables.newRole ?? "",
    };
    const rendered = value.replace(/\{title\}|\{message\}|\{firstName\}|\{old status\}|\{new status\}|\{oldStatus\}|\{newStatus\}|\{oldRole\}|\{newRole\}/g, (placeholder) => {
      if ((placeholder === "{firstName}" && !variables.firstName)
        || (["{old status}", "{oldStatus}"].includes(placeholder) && !variables.oldStatus)
        || (["{new status}", "{newStatus}"].includes(placeholder) && !variables.newStatus)
        || (placeholder === "{oldRole}" && !variables.oldRole)
        || (placeholder === "{newRole}" && !variables.newRole)) {
        return placeholder;
      }
      return replacements[placeholder];
    });
    if (/\{(?:firstName|old status|new status|oldStatus|newStatus|oldRole|newRole)\}/.test(rendered)) return original;
    return rendered.trim() || original;
  };

  return {
    title: render(template.title, title),
    message: render(template.message, message),
  };
}

export function unsupportedNotificationPlaceholders(value: string, allowedPlaceholders: readonly string[] = []) {
  return [...new Set(value.match(/\{[^{}]*\}/g) ?? [])]
    .filter((placeholder) => placeholder !== "{title}"
      && placeholder !== "{message}"
      && !allowedPlaceholders.includes(placeholder));
}

export function shouldIncludeConfiguredNotificationRecipients(
  _category: NotificationCategory,
  explicitlyRequested: boolean,
) {
  return explicitlyRequested;
}

export function accountNotificationEventSettingKey(event: AccountNotificationEvent) {
  return `notification_account_event_${event}_enabled`;
}

export function accountNotificationEventChannelSettingKey(
  event: AccountNotificationEvent,
  channel: keyof NotificationChannels,
) {
  return `notification_account_event_${event}_${channel === "inAppEnabled" ? "in_app" : "email"}_enabled`;
}

export function notificationCategory(type: string): NotificationCategory {
  if (type === "join_request") return "join_request";
  if (type === "probation") return "probation";
  if (["expense", "expense_approval", "expense_status", "finance", "contribution", "payment", "gift", "sponsor"].includes(type)) return "finance";
  if (type === "permission") return "permission";
  if (type === "form") return "form";
  if (type === "task") return "task";
  if (type === "announcement") return "announcement";
  if (type === "security") return "security";
  if (type === "system") return "system";
  return "account";
}
