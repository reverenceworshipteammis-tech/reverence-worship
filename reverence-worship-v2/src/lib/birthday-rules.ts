export const BIRTHDAY_TIME_ZONE = "Africa/Kigali";
export const DEFAULT_BIRTHDAY_TITLE_TEMPLATE = "Happy Birthday, {firstName}! \u{1F389}";
export const DEFAULT_BIRTHDAY_MESSAGE_TEMPLATE =
  "The Reverence Worship family wishes you a joyful birthday filled with God's blessings, love, and happiness.";
export const BIRTHDAY_TEMPLATE_PLACEHOLDERS = ["{firstName}", "{fullName}"] as const;

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export function calendarDateInTimeZone(date: Date, timeZone = BIRTHDAY_TIME_ZONE): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: "year" | "month" | "day") => Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
}

export function isBirthdayOn(dateOfBirth: Date, today: CalendarDate) {
  return dateOfBirth.getUTCMonth() + 1 === today.month && dateOfBirth.getUTCDate() === today.day;
}

export function birthdayNotificationKey(userId: number, year: number) {
  return `birthday:${userId}:${year}`;
}

export function renderBirthdayTemplate(template: string, fullName: string) {
  const normalizedName = fullName.trim();
  const firstName = normalizedName.split(/\s+/)[0] || "there";
  return template
    .replaceAll("{firstName}", firstName)
    .replaceAll("{fullName}", normalizedName || firstName);
}

export function unsupportedBirthdayPlaceholders(template: string) {
  const supported = new Set<string>(BIRTHDAY_TEMPLATE_PLACEHOLDERS);
  return [...new Set(template.match(/\{[^{}]+\}/g) ?? [])].filter((placeholder) => !supported.has(placeholder));
}
