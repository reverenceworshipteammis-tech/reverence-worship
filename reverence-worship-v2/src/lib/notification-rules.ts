export const NOTIFICATION_CATEGORIES = [
  "account",
  "security",
  "announcement",
  "permission",
  "form",
  "task",
  "finance",
  "system",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export function notificationCategory(type: string): NotificationCategory {
  if (["expense", "expense_approval", "expense_status", "finance", "contribution", "payment", "gift", "sponsor"].includes(type)) return "finance";
  if (type === "permission") return "permission";
  if (type === "form") return "form";
  if (type === "task") return "task";
  if (type === "announcement") return "announcement";
  if (type === "security") return "security";
  if (type === "system") return "system";
  return "account";
}
