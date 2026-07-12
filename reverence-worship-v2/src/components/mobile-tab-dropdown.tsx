"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { useState } from "react";

type TabOption = {
  id: string;
  label: string;
  icon?: LucideIcon;
};

export function MobileTabDropdown({
  tabs,
  value,
  onChange,
  tone = "blue",
}: {
  tabs: readonly TabOption[];
  value: string;
  onChange: (value: string) => void;
  tone?: "blue" | "gray" | "indigo";
}) {
  const [open, setOpen] = useState(false);
  const selected = tabs.find((tab) => tab.id === value) ?? tabs[0];
  const SelectedIcon = selected?.icon;
  const toneClass = {
    blue: "focus:border-blue-500 focus:ring-blue-100",
    gray: "focus:border-gray-500 focus:ring-gray-100",
    indigo: "focus:border-indigo-500 focus:ring-indigo-100",
  }[tone];

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-3 text-left text-sm font-medium text-gray-800 outline-none transition focus:ring-2 ${toneClass}`}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          {SelectedIcon ? <SelectedIcon className="size-4 shrink-0 text-gray-500" aria-hidden="true" /> : null}
          <span className="truncate">{selected?.label ?? "Select tab"}</span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-gray-400 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === value;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  onChange(tab.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition ${
                  active ? "bg-blue-50 font-semibold text-blue-700" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
