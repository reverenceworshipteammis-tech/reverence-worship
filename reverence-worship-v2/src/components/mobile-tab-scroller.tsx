"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

type TabOption = {
  id: string;
  label: string;
  mobileLabel?: string;
  icon?: LucideIcon;
};

export function MobileTabScroller({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly TabOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const navRef = useRef<HTMLDivElement | null>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);

  useEffect(() => {
    const measure = () => {
      if (!navRef.current) {
        setCanScrollMore(false);
        return;
      }
      const { scrollWidth, clientWidth, scrollLeft } = navRef.current;
      const hasOverflow = scrollWidth > clientWidth + 4;
      const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 4;
      setCanScrollMore(hasOverflow && !isAtEnd);
    };

    measure();
    const nav = navRef.current;
    nav?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);

    return () => {
      nav?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [tabs.length, value]);

  function scrollNext() {
    if (!navRef.current) return;
    navRef.current.scrollBy({ left: 120, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={navRef}
        className="flex gap-1 overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = value === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex min-w-[68px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                selected ? "bg-blue-600 text-white shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
              <span className="leading-none whitespace-nowrap">{tab.mobileLabel ?? tab.label}</span>
            </button>
          );
        })}
      </div>
      {canScrollMore ? (
        <button
          type="button"
          onClick={scrollNext}
          className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-1.5 shadow-sm shadow-slate-300/50 ring-1 ring-slate-200 backdrop-blur-sm transition hover:bg-white"
          aria-label="Scroll tabs"
        >
          <ChevronRight className="size-4 text-gray-500" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
