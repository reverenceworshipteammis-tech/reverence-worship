import { databaseDate, kigaliDateKey, kigaliDayBounds } from "@/lib/calendar-date";

export function getPerformanceDateRange(year: number, fromValue?: string, toValue?: string) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const today = kigaliDateKey();
  const defaultTo = today.startsWith(`${year}-`) ? today : yearEnd;
  const validDate = (value: string | undefined) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= yearStart && value <= yearEnd);
  let from = validDate(fromValue) ? fromValue! : yearStart;
  let to = validDate(toValue) ? toValue! : defaultTo;

  if (from > to) {
    from = yearStart;
    to = defaultTo;
  }

  const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const fromBounds = kigaliDayBounds(from);
  const toBounds = kigaliDayBounds(to);
  return {
    from,
    to,
    fromDate: fromBounds.start,
    toDate: toBounds.end,
    databaseFromDate: databaseDate(from),
    databaseToDate: databaseDate(to),
    label: `${formatter.format(new Date(`${from}T00:00:00.000Z`))} - ${formatter.format(new Date(`${to}T00:00:00.000Z`))}`,
  };
}
