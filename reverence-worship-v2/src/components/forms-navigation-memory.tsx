"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function FormsNavigationMemory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.toString();

  useEffect(() => {
    const key = `forms-scroll:${pathname}?${query}`;
    try {
      const section = searchParams.get("section");
      if (pathname === "/admin/forms") {
        if (section && ["available", "results", "manage", "reports"].includes(section)) sessionStorage.setItem("forms-last-section", section);
        else if (!section) {
          const saved = sessionStorage.getItem("forms-last-section");
          if (saved && ["available", "results", "manage", "reports"].includes(saved)) {
            router.replace(`/admin/forms?section=${saved}`, { scroll: false });
            return;
          }
        }
      }
    } catch { /* Navigation remains usable when browser storage is unavailable. */ }
    let secondFrame = 0;
    const frame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        try { const saved = sessionStorage.getItem(key); if (saved !== null) window.scrollTo(0, Number(saved) || 0); } catch { /* Storage is optional. */ }
      });
    });
    function save() { try { sessionStorage.setItem(key, String(window.scrollY)); } catch { /* Storage is optional. */ } }
    document.addEventListener("click", save, true);
    window.addEventListener("pagehide", save);
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(secondFrame); document.removeEventListener("click", save, true); window.removeEventListener("pagehide", save); };
  }, [pathname, query, router, searchParams]);
  return null;
}
