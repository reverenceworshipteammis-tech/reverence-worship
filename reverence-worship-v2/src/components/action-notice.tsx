"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ActionNoticeTone = "success" | "error" | "warning" | "info";

export function ActionNotice({
  message,
  onClose,
  tone = "info",
  title,
  duration = 5000,
  className = "",
}: {
  message: string;
  onClose: () => void;
  tone?: ActionNoticeTone;
  title?: string;
  duration?: number;
  className?: string;
}) {
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timeout = window.setTimeout(() => closeRef.current(), duration);
    return () => window.clearTimeout(timeout);
  }, [duration, message]);

  const styles = {
    success: {
      surface: "border-emerald-200 bg-emerald-50 text-emerald-800",
      icon: "bg-emerald-100 text-emerald-600",
      label: "Success",
      Icon: CheckCircle2,
    },
    error: {
      surface: "border-red-200 bg-red-50 text-red-800",
      icon: "bg-red-100 text-red-600",
      label: "Notice",
      Icon: AlertTriangle,
    },
    warning: {
      surface: "border-amber-200 bg-amber-50 text-amber-900",
      icon: "bg-amber-100 text-amber-700",
      label: "Warning",
      Icon: AlertTriangle,
    },
    info: {
      surface: "border-blue-200 bg-blue-50 text-blue-800",
      icon: "bg-blue-100 text-blue-600",
      label: "Notice",
      Icon: Info,
    },
  }[tone];
  const Icon = styles.Icon;

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${styles.surface} ${className}`} role={tone === "error" || tone === "warning" ? "alert" : "status"}>
      <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title ?? styles.label}</p>
        <p className="mt-0.5 leading-5">{message}</p>
      </div>
      <button type="button" onClick={onClose} className="rounded-lg p-1 text-current opacity-60 transition hover:bg-white/70 hover:opacity-100" aria-label="Close notification">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
