"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, HelpCircle, X } from "lucide-react";

type DialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  inputLabel?: string;
  inputPlaceholder?: string;
  required?: boolean;
};

type DialogState = DialogOptions & { kind: "confirm" | "prompt" };
type DialogApi = {
  confirm: (options: DialogOptions) => Promise<boolean>;
  prompt: (options: DialogOptions) => Promise<string | null>;
};

const AppDialogContext = createContext<DialogApi | null>(null);

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [value, setValue] = useState("");
  const resolver = useRef<((result: boolean | string | null) => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const open = useCallback((state: DialogState) => {
    resolver.current?.(state.kind === "confirm" ? false : null);
    setValue("");
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialog(state);
    return new Promise<boolean | string | null>((resolve) => { resolver.current = resolve; });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const activeDialog = dialog;
    const container = dialogRef.current;
    const focusable = () => Array.from(container?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    focusable()[0]?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); close(activeDialog.kind === "confirm" ? false : null); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0]; const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); window.setTimeout(() => returnFocusRef.current?.focus(), 0); };
  }, [dialog]);

  const confirm = useCallback((options: DialogOptions) => open({ ...options, kind: "confirm" }) as Promise<boolean>, [open]);
  const prompt = useCallback((options: DialogOptions) => open({ ...options, kind: "prompt" }) as Promise<string | null>, [open]);

  function close(result: boolean | string | null) {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
    setValue("");
  }

  return <AppDialogContext.Provider value={{ confirm, prompt }}>
    {children}
    {dialog ? <div className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-[1px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(dialog.kind === "confirm" ? false : null); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${dialog.tone === "danger" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>{dialog.tone === "danger" ? <AlertTriangle className="size-5" /> : <HelpCircle className="size-5" />}</span>
          <div className="min-w-0 flex-1"><h2 id="app-dialog-title" className="text-lg font-bold text-slate-900">{dialog.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{dialog.message}</p></div>
          <button type="button" onClick={() => close(dialog.kind === "confirm" ? false : null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X className="size-5" /></button>
        </div>
        {dialog.kind === "prompt" ? <div className="px-5 pt-4"><label className="mb-1 block text-sm font-medium text-slate-700">{dialog.inputLabel ?? "Reason"}</label><textarea autoFocus rows={3} value={value} onChange={(event) => setValue(event.target.value)} placeholder={dialog.inputPlaceholder} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div> : null}
        <div className="flex justify-end gap-2 px-5 py-4">
          <button type="button" onClick={() => close(dialog.kind === "confirm" ? false : null)} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">{dialog.cancelLabel ?? "Cancel"}</button>
          <button type="button" disabled={dialog.kind === "prompt" && dialog.required && !value.trim()} onClick={() => close(dialog.kind === "confirm" ? true : value.trim())} className={`h-10 rounded-lg px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${dialog.tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>{dialog.confirmLabel ?? "Confirm"}</button>
        </div>
      </div>
    </div> : null}
  </AppDialogContext.Provider>;
}

export function useAppDialog() {
  const context = useContext(AppDialogContext);
  if (!context) throw new Error("useAppDialog must be used inside AppDialogProvider");
  return context;
}
