export const NOTIFICATION_LIFETIME_DAYS = 7;
export const READ_NOTIFICATION_RETENTION_DAYS = 5;

// Kept as aliases for callers that still use the former configurable policy.
export const DEFAULT_NOTIFICATION_RETENTION_DAYS = READ_NOTIFICATION_RETENTION_DAYS;
export const MIN_NOTIFICATION_RETENTION_DAYS = READ_NOTIFICATION_RETENTION_DAYS;
export const MAX_NOTIFICATION_RETENTION_DAYS = READ_NOTIFICATION_RETENTION_DAYS;

const DAY_IN_MS = 86_400_000;

export function normalizeNotificationRetentionDays(value: unknown) {
  void value;
  return READ_NOTIFICATION_RETENTION_DAYS;
}

export function notificationLifetimeCutoff(now = new Date()) {
  return new Date(now.getTime() - NOTIFICATION_LIFETIME_DAYS * DAY_IN_MS);
}

export function readNotificationCutoff(now = new Date()) {
  return new Date(now.getTime() - READ_NOTIFICATION_RETENTION_DAYS * DAY_IN_MS);
}

export type NotificationSourceState = {
  exists: boolean;
  status?: string | null;
  available?: boolean;
  progress?: number | null;
  submitted?: boolean;
};

type SourceNotification = {
  sourceType: string | null;
  title: string;
  dedupeKey: string | null;
};

function isSubmittedAction(notification: SourceNotification) {
  return notification.dedupeKey?.includes(":submitted") === true ||
    notification.title.toLowerCase().includes("awaiting approval") ||
    notification.title.toLowerCase().includes("request submitted");
}

export function notificationActionGroup(notification: SourceNotification) {
  switch (notification.sourceType) {
    case "spiritual_form":
    case "action_plan_task":
    case "family_task":
      return notification.sourceType;
    case "permission_request":
    case "probation_decision_request":
      return isSubmittedAction(notification) ? `${notification.sourceType}:pending` : null;
    case "expense":
      if (notification.dedupeKey?.includes(":void-requested:") || notification.title.toLowerCase().includes("void requested")) {
        return "expense:void-pending";
      }
      return isSubmittedAction(notification) ? "expense:pending" : null;
    case "probation":
      return notification.dedupeKey?.includes(":review:") || notification.dedupeKey?.includes(":overdue:")
        ? "probation:review"
        : null;
    default:
      return null;
  }
}

export function notificationSourceIsCurrent(
  notification: SourceNotification,
  state: NotificationSourceState | undefined,
) {
  // Unknown source types are retained until their normal time limit.
  if (!state) return true;
  if (!state.exists) return false;

  switch (notification.sourceType) {
    case "spiritual_form":
      return state.available === true && state.submitted !== true;
    case "permission_request":
      return !isSubmittedAction(notification) || state.status === "pending";
    case "probation_decision_request":
      return !isSubmittedAction(notification) || state.status === "pending";
    case "expense":
      if (notification.dedupeKey?.includes(":void-requested:") || notification.title.toLowerCase().includes("void requested")) {
        return state.status === "void_pending";
      }
      return !isSubmittedAction(notification) || state.status === "pending";
    case "action_plan_task":
    case "family_task":
      return state.status !== "completed" && (state.progress ?? 0) < 100;
    case "probation":
      if (notification.dedupeKey?.includes(":review:") || notification.dedupeKey?.includes(":overdue:")) {
        return state.status === "active" || state.status === "extended";
      }
      return true;
    case "announcement":
      return state.status === "active";
    case "email_delivery":
      return state.status === "failed";
    default:
      return true;
  }
}
