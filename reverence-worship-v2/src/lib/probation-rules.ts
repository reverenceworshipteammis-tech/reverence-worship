export const PROBATION_GOOD_THRESHOLD = 70;
export const DEFAULT_PROBATION_DURATION_MONTHS = 4;

export function addCalendarMonths(value: string, months: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isInteger(months)) return "";
  const [year, month, day] = value.split("-").map(Number);
  const sourceDate = new Date(Date.UTC(year, month - 1, day));
  if (
    sourceDate.getUTCFullYear() !== year
    || sourceDate.getUTCMonth() !== month - 1
    || sourceDate.getUTCDate() !== day
  ) return "";
  const targetMonth = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDayOfTargetMonth = new Date(Date.UTC(
    targetMonth.getUTCFullYear(),
    targetMonth.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  const result = new Date(Date.UTC(
    targetMonth.getUTCFullYear(),
    targetMonth.getUTCMonth(),
    Math.min(day, lastDayOfTargetMonth),
  ));
  return result.toISOString().slice(0, 10);
}

export type ProbationScoreInput = {
  attendanceRate: number;
  communicationRate: number;
  disciplineRate: number;
  unresolvedDiscipline: number;
};

export function percentage(part: number, total: number, emptyValue = 0) {
  if (total <= 0) return emptyValue;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}

export function probationAttentionReasons(input: ProbationScoreInput) {
  const reasons: string[] = [];
  if (input.attendanceRate < PROBATION_GOOD_THRESHOLD) reasons.push(`Attendance is below ${PROBATION_GOOD_THRESHOLD}%`);
  if (input.communicationRate < PROBATION_GOOD_THRESHOLD) reasons.push(`Communication is below ${PROBATION_GOOD_THRESHOLD}%`);
  if (input.disciplineRate < PROBATION_GOOD_THRESHOLD) reasons.push(`Discipline is below ${PROBATION_GOOD_THRESHOLD}%`);
  if (input.unresolvedDiscipline > 0) reasons.push(`${input.unresolvedDiscipline} discipline record${input.unresolvedDiscipline === 1 ? "" : "s"} unresolved`);
  return reasons;
}

export function calendarDaysRemaining(endDate: Date, now = new Date()) {
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((end - today) / 86_400_000);
}

export function isOpenProbationState(state: string) {
  return state === "active" || state === "extended";
}
