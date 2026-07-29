"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, Megaphone } from "lucide-react";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { markAdminNotificationRead } from "@/app/admin/notifications/actions";
import { ADMIN_NOTIFICATIONS_CHANGED_EVENT } from "@/lib/admin-notification-events";

export type DashboardBulletin = {
  id: string;
  kind: "announcement" | "notification";
  title: string;
  message: string;
  href: string;
  dateLabel: string;
  urgent: boolean;
  sourceId?: number;
};

export function DashboardBulletinCarousel({
  items,
  welcomeMessage,
}: {
  items: DashboardBulletin[];
  welcomeMessage: string;
}) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [openingNotification, setOpeningNotification] = useState(false);
  const remainingRotationMs = useRef(5_000);
  const rotationStartedAt = useRef<number | null>(null);
  const itemCount = items.length;
  const currentIndex = itemCount > 0 ? activeIndex % itemCount : 0;
  const activeItem = items[currentIndex];
  const isPaused = isHovered || isFocused;

  useEffect(() => {
    if (itemCount <= 1 || isPaused) return;

    rotationStartedAt.current = Date.now();
    const timeout = window.setTimeout(() => {
      remainingRotationMs.current = 5_000;
      rotationStartedAt.current = null;
      setActiveIndex((current) => (current + 1) % itemCount);
    }, remainingRotationMs.current);

    return () => {
      window.clearTimeout(timeout);
      if (rotationStartedAt.current !== null) {
        const elapsed = Date.now() - rotationStartedAt.current;
        remainingRotationMs.current = Math.max(0, remainingRotationMs.current - elapsed);
        rotationStartedAt.current = null;
      }
    };
  }, [activeIndex, isPaused, itemCount]);

  if (!activeItem) {
    return <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{welcomeMessage}</h1>;
  }

  const Icon = activeItem.kind === "announcement" ? Megaphone : Bell;
  const kindLabel = activeItem.kind === "announcement" ? "Announcement" : "Notification";
  const tone = activeItem.urgent
    ? {
        surface: "border-l-rose-500 bg-rose-50/65",
        icon: "bg-rose-100 text-rose-700",
        label: "text-rose-700",
        progress: "bg-rose-500",
        dot: "bg-rose-500",
      }
    : activeItem.kind === "announcement"
      ? {
          surface: "border-l-blue-600 bg-blue-50/55",
          icon: "bg-blue-100 text-blue-700",
          label: "text-blue-700",
          progress: "bg-blue-600",
          dot: "bg-blue-600",
        }
      : {
          surface: "border-l-[#d6b45a] bg-amber-50/45",
          icon: "bg-amber-100/65 text-amber-700",
          label: "text-amber-700",
          progress: "bg-[#d6b45a]",
          dot: "bg-[#d6b45a]",
        };

  function stopHoverPause() {
    setIsHovered(false);
  }

  function stopFocusPause() {
    setIsFocused(false);
  }

  async function openBulletin(event: MouseEvent<HTMLAnchorElement>) {
    if (activeItem.sourceId === undefined) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    if (openingNotification) return;
    setOpeningNotification(true);

    try {
      await markAdminNotificationRead(activeItem.kind, activeItem.sourceId);
      window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_CHANGED_EVENT));
    } catch {
      // Opening the destination remains available if read-state synchronization fails.
    } finally {
      router.push(activeItem.href);
      router.refresh();
      setOpeningNotification(false);
    }
  }

  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1.5 text-xs font-semibold text-slate-500">{welcomeMessage}</p>
      <div className="h-[120px]">
        <Link
          key={activeItem.id}
          href={activeItem.href}
          onClick={openBulletin}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={stopHoverPause}
          onFocus={() => setIsFocused(true)}
          onBlur={stopFocusPause}
          aria-busy={openingNotification}
          className={`dashboard-bulletin-enter group relative flex size-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border-l-4 px-3 py-3 transition-colors hover:bg-white/75 sm:gap-4 sm:px-4 ${tone.surface}`}
        >
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-11 ${tone.icon}`}
          >
            <Icon className="size-4.5 sm:size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 pb-3">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.08em] sm:text-[11px]">
              <span className={tone.label}>{kindLabel}</span>
              <span className="hidden font-medium normal-case tracking-normal text-slate-400 sm:inline">
                {activeItem.dateLabel}
              </span>
            </span>
            <span className="mt-1 flex min-w-0 items-center justify-between gap-3">
              <span className="truncate text-sm font-bold text-slate-900 sm:text-base">{activeItem.title}</span>
              <span className={`hidden shrink-0 items-center gap-1 text-xs font-semibold sm:inline-flex ${tone.label}`}>
                View details
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </span>
            <span className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">{activeItem.message}</span>
          </span>

          {itemCount > 1 ? (
            <>
              <span className="absolute bottom-2.5 right-3 flex items-center gap-1.5" aria-label={`Bulletin ${currentIndex + 1} of ${itemCount}`}>
                {items.map((item, index) => (
                  <span
                    key={item.id}
                    className={`block rounded-full transition-all ${
                      index === currentIndex ? `h-1.5 w-4 ${tone.dot}` : "size-1.5 bg-slate-300"
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </span>
              <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-slate-200/70" aria-hidden="true">
                <span
                  className={`dashboard-bulletin-progress block h-full ${tone.progress}`}
                  style={{ animationPlayState: isPaused ? "paused" : "running" }}
                />
              </span>
            </>
          ) : null}
        </Link>
      </div>
    </div>
  );
}
