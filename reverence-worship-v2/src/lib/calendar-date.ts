export const APP_TIME_ZONE = "Africa/Kigali";

function dateParts(value: Date, includeTime = false) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/** A YYYY-MM-DD calendar key in the application's business timezone. */
export function kigaliDateKey(value = new Date()) {
  const parts = dateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** A year in the application's business timezone. */
export function currentKigaliYear(value = new Date()) {
  return Number(kigaliDateKey(value).slice(0, 4));
}

/** A stable Prisma value for a PostgreSQL DATE column. */
export function databaseDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

/** The calendar key returned from a PostgreSQL DATE column. */
export function databaseDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function addCalendarDays(value: string, days: number) {
  const date = databaseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return databaseDateKey(date);
}

/** Inclusive timestamp bounds for a Kigali calendar day. */
export function kigaliDayBounds(value: string) {
  return {
    start: new Date(`${value}T00:00:00.000+02:00`),
    end: new Date(`${value}T23:59:59.999+02:00`),
  };
}

/** Value suitable for an HTML datetime-local input in Kigali. */
export function kigaliDateTimeInputValue(value: Date) {
  const parts = dateParts(value, true);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
