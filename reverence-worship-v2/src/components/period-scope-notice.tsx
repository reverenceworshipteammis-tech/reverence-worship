"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

function PeriodScopeNoticeInner({ showingAll, label }: { showingAll: boolean; label: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  if (showingAll) {
    params.delete("all");
    const query = params.toString();
    return (
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        <span>Showing all records.</span>
        <Link href={query ? `${pathname}?${query}` : pathname} className="font-semibold underline underline-offset-2 hover:text-blue-900">
          Limit to the current period ({label})
        </Link>
      </div>
    );
  }

  params.set("all", "1");
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
      <span>Showing records in the current period ({label}).</span>
      <Link href={`${pathname}?${params.toString()}`} className="font-semibold underline underline-offset-2 hover:text-blue-900">
        Show all records
      </Link>
    </div>
  );
}

export function PeriodScopeNotice(props: { showingAll: boolean; label: string }) {
  return (
    <Suspense fallback={null}>
      <PeriodScopeNoticeInner {...props} />
    </Suspense>
  );
}
