export const MIN_SESSION_LIFETIME_MINUTES = 1;
export const MAX_SESSION_LIFETIME_MINUTES = 60;
export const DEFAULT_SESSION_LIFETIME_MINUTES = 10;

export function normalizeSessionLifetimeMinutes(value: unknown) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return DEFAULT_SESSION_LIFETIME_MINUTES;

  return Math.max(
    MIN_SESSION_LIFETIME_MINUTES,
    Math.min(Math.round(minutes), MAX_SESSION_LIFETIME_MINUTES),
  );
}
