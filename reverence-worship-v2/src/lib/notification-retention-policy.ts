export const DEFAULT_NOTIFICATION_RETENTION_DAYS = 90;
export const MIN_NOTIFICATION_RETENTION_DAYS = 7;
export const MAX_NOTIFICATION_RETENTION_DAYS = 3650;

export function normalizeNotificationRetentionDays(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_NOTIFICATION_RETENTION_DAYS;
  return Math.min(MAX_NOTIFICATION_RETENTION_DAYS, Math.max(MIN_NOTIFICATION_RETENTION_DAYS, Math.round(numeric)));
}
