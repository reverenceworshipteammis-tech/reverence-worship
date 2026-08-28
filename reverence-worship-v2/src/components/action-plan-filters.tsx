"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

type FilterOption = [value: string, label: string];

type Props = {
  query: string;
  year: string;
  department: string;
  status: string;
  deadline: string;
  yearOptions: FilterOption[];
  departmentOptions: FilterOption[];
};

export function ActionPlanFilters({ query, year, department, status, deadline, yearOptions, departmentOptions }: Props) {
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  function submit(form: HTMLFormElement) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    form.requestSubmit();
  }

  function submitSearch(form: HTMLFormElement) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => form.requestSubmit(), 400);
  }

  return (
    <form method="get" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.25fr_repeat(4,minmax(135px,0.7fr))_auto] xl:items-end">
        <label className="text-xs font-semibold text-slate-600">
          Search
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input name="q" defaultValue={query} onChange={(event) => submitSearch(event.currentTarget.form!)} placeholder="Plan, activity, milestone, person" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </span>
        </label>
        <FilterSelect name="year" label="Year" defaultValue={year} options={yearOptions} onChange={submit} />
        <FilterSelect name="department" label="Department" defaultValue={department} options={departmentOptions} onChange={submit} />
        <FilterSelect name="status" label="Plan status" defaultValue={status} options={[["all", "All statuses"], ["pending", "Pending"], ["in_progress", "In progress"], ["completed", "Completed"]]} onChange={submit} />
        <FilterSelect name="deadline" label="Deadline" defaultValue={deadline} options={[["all", "All deadlines"], ["overdue", "Overdue"], ["due-soon", "Due within 7 days"], ["no-deadline", "No task deadline"]]} onChange={submit} />
        <Link href="/admin/action-plans" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Reset</Link>
      </div>
    </form>
  );
}

function FilterSelect({ name, label, defaultValue, options, onChange }: { name: string; label: string; defaultValue: string; options: FilterOption[]; onChange: (form: HTMLFormElement) => void }) {
  return (
    <label className="text-xs font-semibold text-slate-600">
      {label}
      <select name={name} defaultValue={defaultValue} onChange={(event) => onChange(event.currentTarget.form!)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
        {options.map(([value, optionLabel]) => <option key={value} value={value}>{optionLabel}</option>)}
      </select>
    </label>
  );
}
