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
