"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { importActionPlanTasks, type ActionPlanTaskImportActionResult } from "@/app/admin/action-plans/actions";

type Props = {
  planId: number;
  onResult: (result: ActionPlanTaskImportActionResult) => void;
  buttonClassName?: string;
  showLabels?: boolean;
  onAction?: () => void;
};

export function ActionPlanTaskTemplateButtons({ planId, onResult, buttonClassName = "rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50", showLabels = false, onAction }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function importFile(file: File | undefined) {
    if (!file) return;
    onAction?.();
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("actionPlanId", String(planId));
        formData.set("file", file);
        const result = await importActionPlanTasks(formData);
        onResult(result);
        if (result.ok) router.refresh();
      } catch {
        onResult({ ok: false, message: "The task file could not be imported. Please try again." });
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <>
      <a
        href={`/admin/action-plans/${planId}/task-template`}
        className={`inline-flex items-center justify-center text-emerald-700 ${buttonClassName}`}
        onClick={onAction}
        title="Download task import template"
        aria-label="Download task import template"
      >
        <FileSpreadsheet className="size-4" aria-hidden="true" />
        <span className={showLabels ? "" : "sr-only"}>Download task template</span>
      </a>
      <input ref={inputRef} type="file" accept=".xlsx,.csv" className="sr-only" onChange={(event) => importFile(event.target.files?.[0])} />
      <button
        type="button"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        className={`inline-flex items-center justify-center text-teal-700 disabled:cursor-wait disabled:opacity-50 ${buttonClassName}`}
        title="Import tasks from Excel or CSV"
        aria-label="Import tasks from Excel or CSV"
      >
        {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
        <span className={showLabels ? "" : "sr-only"}>{isPending ? "Importing tasks..." : "Import tasks"}</span>
      </button>
    </>
  );
}
