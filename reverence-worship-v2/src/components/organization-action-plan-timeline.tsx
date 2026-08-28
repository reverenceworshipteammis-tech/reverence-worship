"use client";

import { type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";

export type OrganizationTimelinePlan = {
  id: number;
  title: string;
  departmentLabel: string;
  startDate: string;
  dueDate: string;
  progress: number;
  status: string;
  tasks: Array<{
    id: number;
    activity: string;
    startDate: string | null;
    deadline: string | null;
    progress: number;
    status: string;
  }>;
};

type TimelineRow = {
  key: string;
  activity: string;
  context: string;
  startDate: string | null;
  deadline: string | null;
  progress: number;
  status: string;
};

type TimelineModel = {
  start: Date;
  end: Date;
  totalDays: number;
  chartWidth: number;
  months: Array<{ key: string; label: string; left: number; width: number }>;
  todayPosition: number | null;
};

export function OrganizationActionPlanTimeline({ plans, scopeLabel }: { plans: OrganizationTimelinePlan[]; scopeLabel: string }) {
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => compileRows(plans), [plans]);
  const timeline = useMemo(() => buildTimeline(plans, rows), [plans, rows]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
        <CalendarDays className="size-4" aria-hidden="true" />
        View timeline
      </button>

      {open ? (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/55 p-3 sm:p-5">
          <button type="button" onClick={() => setOpen(false)} className="absolute inset-0" aria-label="Close organization timeline" />
          <section role="dialog" aria-modal="true" aria-labelledby="organization-timeline-title" className="relative max-h-[95vh] w-full max-w-7xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{scopeLabel}</p><h2 id="organization-timeline-title" className="mt-1 text-lg font-bold text-slate-950 sm:text-xl">Organization Action Plan Timeline</h2></div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Close"><X className="size-5" aria-hidden="true" /></button>
            </header>
            <div className="max-h-[calc(95vh-82px)] overflow-y-auto p-4 sm:p-5">
              <CompiledTimeline rows={rows} timeline={timeline} />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function CompiledTimeline({ rows, timeline }: { rows: TimelineRow[]; timeline: TimelineModel | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activityWidth, setActivityWidth] = useState<number | null>(null);
  if (!rows.length) return <EmptyTimeline message="No action plans or tasks match the current filters." />;
  if (!timeline) return <EmptyTimeline message="Add plan or task dates to build the timeline." />;

  const minimumChartWidth = timeline.chartWidth;
  const defaultActivityWidthCss = `min(440px, max(260px, calc(100% - ${minimumChartWidth}px)))`;
  const activityWidthCss = activityWidth === null ? defaultActivityWidthCss : `${activityWidth}px`;
  const chartWidthCss = activityWidth === null ? `max(${minimumChartWidth}px, calc(100% - ${defaultActivityWidthCss}))` : `max(${minimumChartWidth}px, calc(100% - ${activityWidth}px))`;
  const contentWidthCss = activityWidth === null ? `max(100%, ${260 + minimumChartWidth}px)` : `max(100%, ${activityWidth + minimumChartWidth}px)`;

  function resize(clientX: number) {
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    setActivityWidth(Math.min(Math.max(260, bounds.width - 280), Math.max(200, clientX - bounds.left)));
  }
  function startResize(event: ReactPointerEvent<HTMLSpanElement>) { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); resize(event.clientX); }
  function continueResize(event: ReactPointerEvent<HTMLSpanElement>) { if (event.currentTarget.hasPointerCapture(event.pointerId)) resize(event.clientX); }
  function stopResize(event: ReactPointerEvent<HTMLSpanElement>) { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }
  function resizeWithKeyboard(event: ReactKeyboardEvent<HTMLSpanElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const current = activityWidth ?? Math.min(440, Math.max(260, container.clientWidth - minimumChartWidth));
    const maximum = Math.max(260, container.clientWidth - 280);
    setActivityWidth(Math.min(maximum, Math.max(200, current + (event.key === "ArrowRight" ? 20 : -20))));
  }
  const handleProps = { onPointerDown: startResize, onPointerMove: continueResize, onPointerUp: stopResize, onPointerCancel: stopResize, onKeyDown: resizeWithKeyboard };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500"><Legend color="bg-blue-600" label="In progress" /><Legend color="bg-emerald-600" label="Completed" /><Legend color="bg-rose-600" label="Overdue" /><Legend color="bg-amber-500" label="Not started" /><span className="text-slate-400">A diamond marks a row without a start date.</span></div>
      <div className="space-y-3 md:hidden">{rows.map((row) => <MobileRow key={row.key} row={row} />)}</div>
      <div ref={containerRef} className="hidden max-h-[calc(95vh-180px)] overflow-auto rounded-xl border border-slate-200 bg-white md:block">
        <div style={{ width: contentWidthCss }}>
          <div className="sticky top-0 z-40 flex border-b border-slate-200 bg-slate-50">
            <div className="sticky left-0 z-40 flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 shadow-[5px_0_10px_-8px_rgba(15,23,42,0.45)]" style={{ width: activityWidthCss }}>Department / activity<ResizeHandle {...handleProps} /></div>
            <div className="relative flex h-12 shrink-0" style={{ width: chartWidthCss }}>
              {timeline.months.map((month) => <div key={month.key} className="flex shrink-0 items-center justify-center border-r border-slate-200 px-1 text-[10px] font-semibold text-slate-600" style={{ width: `${month.width}%` }}>{month.label}</div>)}
              {timeline.todayPosition !== null ? <div className="absolute inset-y-0 z-10 w-px bg-rose-500" style={{ left: `${timeline.todayPosition}%` }}><span className="absolute left-1 top-1 text-[9px] font-bold uppercase text-rose-600">Today</span></div> : null}
            </div>
          </div>
          {rows.map((row) => <DesktopRow key={row.key} row={row} timeline={timeline} activityWidth={activityWidthCss} chartWidth={chartWidthCss} handleProps={handleProps} />)}
        </div>
      </div>
    </div>
  );
}

type ResizeHandleProps = {
  onPointerDown: (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLSpanElement>) => void;
};

function ResizeHandle(props: ResizeHandleProps) {
  return <span role="separator" aria-label="Resize department and activity column" aria-orientation="vertical" tabIndex={0} title="Drag to resize this column" className="group absolute -right-1 top-0 z-50 flex h-full w-2 touch-none cursor-col-resize items-center justify-center outline-none" {...props}><span className="h-full w-px bg-slate-200 transition group-hover:w-0.5 group-hover:bg-blue-500 group-focus:w-0.5 group-focus:bg-blue-500" aria-hidden="true" /></span>;
}

function DesktopRow({ row, timeline, activityWidth, chartWidth, handleProps }: { row: TimelineRow; timeline: TimelineModel; activityWidth: string; chartWidth: string; handleProps: ResizeHandleProps }) {
  const placement = getPlacement(row, timeline);
  const tone = getTone(row);
  return (
    <div className="flex min-h-14 border-b border-slate-100 last:border-b-0">
      <div className="sticky left-0 z-30 flex shrink-0 flex-col justify-center border-r border-slate-200 bg-white px-3 py-2 shadow-[5px_0_10px_-8px_rgba(15,23,42,0.45)]" style={{ width: activityWidth }}><p className="truncate text-sm font-semibold text-slate-800" title={row.activity}>{row.activity}</p><p className="mt-0.5 truncate text-[11px] text-slate-500" title={row.context}>{row.context}</p><ResizeHandle {...handleProps} /></div>
      <div className="relative h-14 shrink-0 bg-white" style={{ width: chartWidth }}>
        {timeline.months.map((month) => <span key={month.key} className="absolute inset-y-0 border-r border-slate-100" style={{ left: `${month.left + month.width}%` }} />)}
        {timeline.todayPosition !== null ? <span className="absolute inset-y-0 z-10 w-px bg-rose-300" style={{ left: `${timeline.todayPosition}%` }} /> : null}
        {placement ? <div className={`absolute top-1/2 z-20 -translate-y-1/2 overflow-hidden border shadow-sm ${placement.point ? `size-4 rotate-45 rounded-sm ${tone.track}` : `h-7 rounded-full ${tone.track}`}`} style={{ left: `${placement.left}%`, width: placement.point ? undefined : `max(${placement.width}%, 20px)`, transform: placement.point ? "translate(-50%, -50%) rotate(45deg)" : undefined }} title={rowTitle(row)}><>{!placement.point ? <><span className={`absolute inset-y-0 left-0 ${tone.fill}`} style={{ width: `${clamp(row.progress)}%` }} /><span className="relative z-10 block truncate px-3 py-1 text-[11px] font-semibold text-slate-800">{clamp(row.progress)}%</span></> : null}</></div> : <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs italic text-slate-400">No dates</span>}
      </div>
    </div>
  );
}

function MobileRow({ row }: { row: TimelineRow }) {
  const tone = getTone(row);
  return <article className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">{row.activity}</h3><p className="mt-1 text-xs text-slate-500">{row.context}</p></div><span className={`size-2.5 shrink-0 rounded-full ${tone.dot}`} /></div><p className="mt-3 text-xs text-slate-500">{row.startDate || "Start not set"} – {row.deadline || "Deadline not set"}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${tone.fill}`} style={{ width: `${clamp(row.progress)}%` }} /></div></article>;
}

function EmptyTimeline({ message }: { message: string }) { return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center"><CalendarDays className="mx-auto size-10 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-600">{message}</p></div>; }
function Legend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${color}`} />{label}</span>; }

function compileRows(plans: OrganizationTimelinePlan[]): TimelineRow[] {
  return plans
    .flatMap((plan) => plan.tasks.length ? plan.tasks.map((task) => ({ key: `task-${task.id}`, activity: task.activity, context: `${plan.departmentLabel} · ${plan.title}`, startDate: dateKey(task.startDate), deadline: dateKey(task.deadline), progress: task.progress, status: task.status })) : [{ key: `plan-${plan.id}`, activity: plan.title, context: `${plan.departmentLabel} · Plan has no tasks`, startDate: dateKey(plan.startDate), deadline: dateKey(plan.dueDate), progress: plan.progress, status: plan.status }])
    .sort((first, second) => {
      const firstStart = first.startDate ?? first.deadline ?? "9999-12-31";
      const secondStart = second.startDate ?? second.deadline ?? "9999-12-31";
      return firstStart.localeCompare(secondStart)
        || (first.deadline ?? "9999-12-31").localeCompare(second.deadline ?? "9999-12-31")
        || first.activity.localeCompare(second.activity);
    });
}

const DAY_MS = 86_400_000;
function buildTimeline(plans: OrganizationTimelinePlan[], rows: TimelineRow[]): TimelineModel | null {
  const dates = [...plans.flatMap((plan) => [parseDate(plan.startDate), parseDate(plan.dueDate)]), ...rows.flatMap((row) => [parseDate(row.startDate), parseDate(row.deadline)])].filter((date): date is Date => date !== null);
  if (!dates.length) return null;
  const first = new Date(Math.min(...dates.map((date) => date.getTime())));
  const last = new Date(Math.max(...dates.map((date) => date.getTime())));
  const start = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
  const end = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0));
  const totalDays = daysBetween(start, end) + 1;
  const months = [];
  for (let cursor = new Date(start); cursor <= end; cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))) {
    const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const days = daysBetween(cursor, next);
    months.push({ key: cursor.toISOString().slice(0, 7), label: new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(cursor), left: percent(daysBetween(start, cursor), totalDays), width: percent(days, totalDays) });
  }
  const today = parseDate(kigaliToday());
  return { start, end, totalDays, chartWidth: Math.max(480, months.length * 56), months, todayPosition: today && today >= start && today <= end ? percent(daysBetween(start, today), totalDays) : null };
}

function getPlacement(row: TimelineRow, timeline: TimelineModel) {
  const start = parseDate(row.startDate); const end = parseDate(row.deadline);
  if (!start && !end) return null;
  if (!start || !end) return { left: clamp(percent(daysBetween(timeline.start, start ?? end!), timeline.totalDays)), width: 0, point: true };
  const first = start <= end ? start : end; const last = start <= end ? end : start;
  return { left: clamp(percent(daysBetween(timeline.start, first), timeline.totalDays)), width: Math.max(0, percent(daysBetween(first, last) + 1, timeline.totalDays)), point: false };
}

function getTone(row: TimelineRow) {
  const completed = row.progress >= 100 || normalize(row.status) === "completed";
  const overdue = Boolean(row.deadline && row.deadline < kigaliToday() && !completed);
  if (completed) return { track: "border-emerald-300 bg-emerald-100", fill: "bg-emerald-500", dot: "bg-emerald-600" };
  if (overdue) return { track: "border-rose-300 bg-rose-100", fill: "bg-rose-500", dot: "bg-rose-600" };
  if (row.progress > 0 || normalize(row.status) === "in_progress") return { track: "border-blue-300 bg-blue-100", fill: "bg-blue-500", dot: "bg-blue-600" };
  return { track: "border-amber-300 bg-amber-100", fill: "bg-amber-400", dot: "bg-amber-500" };
}

function rowTitle(row: TimelineRow) { return `${row.activity} · ${row.context} · ${row.startDate || "Start not set"} – ${row.deadline || "Deadline not set"} · ${clamp(row.progress)}% complete`; }
function dateKey(value: string | null) { if (!value) return null; const key = value.slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null; }
function parseDate(value: string | null) { const key = dateKey(value); if (!key) return null; const date = new Date(`${key}T00:00:00Z`); return Number.isNaN(date.getTime()) ? null : date; }
function kigaliToday() { const parts = new Intl.DateTimeFormat("en", { timeZone: "Africa/Kigali", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); const values = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${values.year}-${values.month}-${values.day}`; }
function normalize(value: string) { return value.replace(/-/g, "_").toLowerCase(); }
function daysBetween(start: Date, end: Date) { return Math.round((end.getTime() - start.getTime()) / DAY_MS); }
function percent(value: number, total: number) { return total > 0 ? (value / total) * 100 : 0; }
function clamp(value: number) { return Math.min(100, Math.max(0, value)); }
