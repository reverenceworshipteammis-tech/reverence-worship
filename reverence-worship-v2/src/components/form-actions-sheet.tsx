"use client";
import { type ReactNode, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";

export function FormActionsSheet({ title, children, open, onClose }: { title: string; children: ReactNode; open: boolean; onClose: () => void }) {
  const setOpen = (value: boolean) => { if (!value) onClose(); };
  const titleId = useId();
  const dialogRef = useDialogFocusTrap<HTMLDivElement>(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  return (
    <>
      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl">
            <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-bold text-slate-900">Actions</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{title}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close actions" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X className="size-5" aria-hidden="true" /></button>
            </div>
            <div className="grid gap-2 overflow-y-auto overscroll-contain px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] [&>a]:h-auto [&>a]:min-h-12 [&>a]:justify-start [&>a]:gap-3 [&>a]:text-sm [&>button]:h-auto [&>button]:min-h-12 [&>button]:justify-start [&>button]:gap-3 [&>button]:text-sm [&>span]:h-auto [&>span]:min-h-12 [&>span]:whitespace-normal [&_svg]:size-4" onClick={(event) => { if ((event.target as Element).closest("button, a")) setOpen(false); }}>
              {children}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

