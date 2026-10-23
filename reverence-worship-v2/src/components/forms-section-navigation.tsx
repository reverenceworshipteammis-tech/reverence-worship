"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, ClipboardList, FileText, SlidersHorizontal } from "lucide-react";

type FormSection = "available" | "results" | "manage" | "reports";

const sections: Array<{ id: FormSection; label: string; icon: typeof FileText }> = [
  { id: "available", label: "Available", icon: ClipboardList },
  { id: "results", label: "My Results", icon: BarChart3 },
  { id: "manage", label: "Manage", icon: SlidersHorizontal },
  { id: "reports", label: "Reports", icon: FileText },
];

export function FormsSectionNavigation({
  canManage,
  canViewReports,
}: {
  canManage: boolean;
  canViewReports: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allowedSections = sections.filter((section) =>
    (section.id !== "manage" || canManage) && (section.id !== "reports" || canViewReports),
  );
  const querySection = searchParams.get("section");
  const currentSection: FormSection =
    pathname === "/admin/forms"
      ? isFormSection(querySection) ? querySection : "available"
      : pathname === "/admin/forms/commitments/mine"
        ? "results"
        : pathname === "/admin/forms/commitments" || pathname.startsWith("/admin/forms/commitments/")
          ? "reports"
          : pathname.endsWith("/take")
            ? "available"
            : "manage";

  return (
    <aside className="forms-sticky-navigation sticky top-[var(--admin-header-height,72px)] z-30 h-fit self-start rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <nav aria-label="Forms sections" className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap lg:flex-col">
        {allowedSections.map(({ id, label, icon: Icon }) => {
          const selected = currentSection === id;
          return (
            <Link
              key={id}
              href={`/admin/forms?section=${id}`}
              aria-current={selected ? "page" : undefined}
              className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition sm:justify-start lg:w-full ${
                selected ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function isFormSection(value: string | null): value is FormSection {
  return value === "available" || value === "results" || value === "manage" || value === "reports";
}
