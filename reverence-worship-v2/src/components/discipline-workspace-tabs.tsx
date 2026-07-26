"use client";

import { useRouter } from "next/navigation";
import { BarChart3, BookOpen, CalendarCheck, ClipboardList, MailOpen, UserRoundCheck } from "lucide-react";
import { MobileTabScroller } from "@/components/mobile-tab-scroller";

const disciplineTabs = [
  { id: "overview", label: "Overview", mobileLabel: "Home", icon: BarChart3 },
  { id: "attendance", label: "Attendance", mobileLabel: "Attend", icon: CalendarCheck },
  { id: "permission", label: "Permission Requests", mobileLabel: "Requests", icon: MailOpen },
  { id: "discipline-records", label: "Discipline Records", mobileLabel: "Records", icon: BookOpen },
  { id: "action-plans", label: "Action Plans", mobileLabel: "Plans", icon: ClipboardList },
] as const;

const probationTab = {
  id: "probation",
  label: "Probation",
  mobileLabel: "Probation",
  icon: UserRoundCheck,
} as const;

export function DisciplineWorkspaceTabs({
  activeTab,
  mode = "manage",
  showProbation,
  onDisciplineTabChange,
}: {
  activeTab: string;
  mode?: "manage" | "permission-only" | "hidden";
  showProbation: boolean;
  onDisciplineTabChange?: (tab: string) => void;
}) {
  const router = useRouter();
  const visibleDisciplineTabs =
    mode === "manage"
      ? disciplineTabs
      : mode === "permission-only"
        ? disciplineTabs.filter((tab) => tab.id === "permission")
        : [];
  const tabs = [...visibleDisciplineTabs, ...(showProbation ? [probationTab] : [])];

  function changeTab(tab: string) {
    if (tab === "probation") {
      router.push("/admin/probation");
      return;
    }
    if (onDisciplineTabChange) {
      onDisciplineTabChange(tab);
      return;
    }
    router.push(`/admin/discipline?tab=${tab}`);
  }

  return (
    <>
      <div className="px-3 py-3 md:hidden">
        <MobileTabScroller tabs={tabs} value={activeTab} onChange={changeTab} />
      </div>
      <nav className="hidden flex-wrap border-b border-gray-200 md:flex">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => changeTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                selected ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </>
  );
}
