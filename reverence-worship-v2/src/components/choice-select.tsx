"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ChoiceOption = { value: string; label: string };

type Props = {
  name: string;
  options: ChoiceOption[];
  placeholder: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className: string;
};

// A custom list is used because native option lists cannot be sized or wrapped on narrow screens.
export function ChoiceSelect({ name, options, placeholder, id, value, defaultValue = "", onChange, required, disabled, className }: Props) {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find((option) => option.value === current)?.label ?? "";

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function choose(next: string) {
    setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <select
        name={name}
        value={current}
        required={required}
        disabled={disabled}
        onChange={(event) => choose(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
        onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
        className={`${className} flex items-center justify-between gap-2 text-left`}
      >
        <span className={`min-w-0 flex-1 whitespace-normal break-words ${selectedLabel ? "" : "text-slate-500"}`}>{selectedLabel || placeholder}</span>
        <ChevronDown className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
      </button>
      {open ? (
        <ul role="listbox" className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {[{ value: "", label: placeholder }, ...options].map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === current}>
              <button
                type="button"
                onClick={() => choose(option.value)}
                className={`block w-full whitespace-normal break-words px-3 py-2.5 text-left text-sm text-slate-800 hover:bg-blue-50 ${option.value === current ? "bg-blue-50 font-semibold text-blue-700" : ""}`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
