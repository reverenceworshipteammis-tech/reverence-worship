import { currentKigaliYear, databaseDate, kigaliDayBounds } from "@/lib/calendar-date";

export const CURRENT_PERIOD_ENABLED_SETTING_KEY = "current_period_enabled";
export const CURRENT_PERIOD_START_SETTING_KEY = "current_period_start";
export const CURRENT_PERIOD_END_SETTING_KEY = "current_period_end";

export type CurrentPeriodRange = {
  /** First included calendar day (YYYY-MM-DD). */
  from: string;
  /** Last included calendar day (YYYY-MM-DD). */
  to: string;
  /** Inclusive Kigali timestamp bounds for timestamp columns. */
  fromDate: Date;
  toDate: Date;
  /** Stable Prisma values for PostgreSQL DATE columns. */
  databaseFromDate: Date;
  databaseToDate: Date;
  label: string;
};

export type CurrentPeriod = CurrentPeriodRange & {
  enabled: boolean;
  /**
   * Working year of the period: the calendar year of its end date. A period
   * like Nov 2026 - Oct 2027 is treated as working year 2027, so year-based
   * records (contributions, payments, action plans) resolve against it.
   */
  year: number;
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isPeriodDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "1" || value === "true";
  if (typeof value === "number") return value === 1;
  return fallback;
}

function buildRange(from: string, to: string): CurrentPeriodRange {
  const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return {
    from,
    to,
    fromDate: kigaliDayBounds(from).start,
    toDate: kigaliDayBounds(to).end,
    databaseFromDate: databaseDate(from),
    databaseToDate: databaseDate(to),
    label: `${formatter.format(new Date(`${from}T00:00:00.000Z`))} - ${formatter.format(new Date(`${to}T00:00:00.000Z`))}`,
  };
}

/**
 * Resolves the admin-configured working period. When disabled or unset, falls
 * back to the current Kigali calendar year. A configured period is kept as-is
 * until an admin changes it (no automatic rollover).
 */
export function resolveCurrentPeriod(
  enabledValue: unknown,
  startValue: unknown,
  endValue: unknown,
  referenceYear = currentKigaliYear(),
): CurrentPeriod {
  const enabled = toBoolean(enabledValue, false);
  let from = enabled && isPeriodDateKey(startValue) ? startValue : `${referenceYear}-01-01`;
  let to = enabled && isPeriodDateKey(endValue) ? endValue : `${referenceYear}-12-31`;
  if (from > to) [from, to] = [to, from];

  return { enabled, ...buildRange(from, to), year: Number(to.slice(0, 4)) };
}

/**
 * Resolves the date range shown on period-aware pages. Defaults to the period
 * bounds and, unlike year-based ranges, never clamps to a calendar year, so
 * cross-year periods and user-expanded ranges keep working.
 */
export function resolvePeriodRange(period: CurrentPeriod, fromValue?: string, toValue?: string): CurrentPeriodRange {
  let from = isPeriodDateKey(fromValue) ? fromValue : period.from;
  let to = isPeriodDateKey(toValue) ? toValue : period.to;
  if (from > to) [from, to] = [to, from];
  return buildRange(from, to);
}
