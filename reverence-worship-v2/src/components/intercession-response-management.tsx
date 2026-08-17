"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, BellRing, Copy, FileSpreadsheet, Link2, PauseCircle, PlayCircle, Settings2, Share2, X } from "lucide-react";
import { createFormSummaryShare, revokeFormSummaryShare, sendFormResponseReminders, setFormAcceptingResponses, setSpiritualFormArchived, updateFormResponsePreferences } from "@/app/admin/intercession/actions";
import { useAppDialog } from "@/components/app-dialog-provider";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";
import { intercessionRichTextToPlainText } from "@/lib/intercession-rich-text";

export type ResponseManagementForm = {
  id: number;
  isActive: boolean;
  isPublished: boolean;
  acceptingResponses: boolean;
  requireLogin: boolean;
  notifyOnSubmit: boolean;
  sendResponseReceipt: boolean;
  allowResponseEditing: boolean;
  responseEditHours: number;
  responseClosedMessage: string;
  canManageResponses: boolean;
  allowExport: boolean;
  summaryQuestions: Array<{ id: string; label: string }>;
  activeSummaryShares: Array<{ id: number; expiresAt: string | null; createdAt: string }>;
};

export function IntercessionResponseManagement({ form, onNotice }: { form: ResponseManagementForm; onNotice: (notice: { ok: boolean; message: string }) => void }) {
  const router = useRouter();
  const { confirm } = useAppDialog();
  const [pending, startTransition] = useTransition();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [createdShareUrl, setCreatedShareUrl] = useState("");

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      onNotice(result);
      if (result.ok) router.refresh();
    });
  }

  async function copyFormLink() {
    const path = form.requireLogin ? `/admin/intercession/forms/${form.id}/take` : `/forms/${form.id}`;
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    onNotice({ ok: true, message: "Form link copied." });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3 sm:px-5">
        {form.canManageResponses ? (
          <button type="button" disabled={pending || !form.isPublished} onClick={() => run(() => setFormAcceptingResponses(form.id, !form.acceptingResponses))} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${form.acceptingResponses ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}`}>
            {form.acceptingResponses ? <PlayCircle className="size-4" aria-hidden="true" /> : <PauseCircle className="size-4" aria-hidden="true" />}
            {form.acceptingResponses ? "Accepting responses" : "Responses paused"}
          </button>
        ) : null}
        <button type="button" onClick={() => void copyFormLink()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><Copy className="size-4" aria-hidden="true" />Copy form link</button>
        <Link href={`/admin/intercession/forms/${form.id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Preview / edit</Link>
        {form.allowExport ? <a href={`/admin/intercession/forms/${form.id}/submissions/export`} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"><FileSpreadsheet className="size-4" aria-hidden="true" />Download Excel</a> : null}
        {form.canManageResponses ? <button type="button" disabled={pending} onClick={() => run(() => sendFormResponseReminders(form.id))} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"><BellRing className="size-4" aria-hidden="true" />Send reminders</button> : null}
        <button type="button" onClick={() => setShareOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"><Share2 className="size-4" aria-hidden="true" />Share summary</button>
        {form.canManageResponses ? <button type="button" onClick={() => setPreferencesOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"><Settings2 className="size-4" aria-hidden="true" />Response settings</button> : null}
        {form.canManageResponses ? <button type="button" disabled={pending} onClick={async () => { if (await confirm({ title: form.isActive ? "Archive form" : "Restore form", message: form.isActive ? "Archive this form and stop new responses? Existing responses will remain available." : "Restore this form?", confirmLabel: form.isActive ? "Archive" : "Restore", tone: form.isActive ? "danger" : "primary" })) run(() => setSpiritualFormArchived(form.id, form.isActive)); }} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"><Archive className="size-4" aria-hidden="true" />{form.isActive ? "Archive" : "Restore"}</button> : null}
      </div>

      {preferencesOpen ? <PreferencesModal form={form} pending={pending} onClose={() => setPreferencesOpen(false)} onSave={(data) => run(async () => { const result = await updateFormResponsePreferences(form.id, data); if (result.ok) setPreferencesOpen(false); return result; })} /> : null}
      {shareOpen ? <ShareModal form={form} pending={pending} createdShareUrl={createdShareUrl} onClose={() => { setShareOpen(false); setCreatedShareUrl(""); }} onCreate={(days, questionIds) => startTransition(async () => { const result = await createFormSummaryShare(form.id, days, questionIds); onNotice(result); if (result.ok && result.url) { const url = `${window.location.origin}${result.url}`; setCreatedShareUrl(url); await navigator.clipboard.writeText(url); router.refresh(); } })} onRevoke={(id) => run(() => revokeFormSummaryShare(id))} /> : null}
    </>
  );
}

function PreferencesModal({ form, pending, onClose, onSave }: { form: ResponseManagementForm; pending: boolean; onClose: () => void; onSave: (data: FormData) => void }) {
  const dialogRef = useDialogFocusTrap<HTMLFormElement>(true, onClose);
  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/50 p-3" role="presentation">
      <form ref={dialogRef} action={onSave} role="dialog" aria-modal="true" aria-labelledby="response-settings-title" className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="response-settings-title" className="font-bold text-slate-900">Response settings</h2><p className="text-xs text-slate-500">Notifications, receipts, and editing</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-5" aria-hidden="true" /></button></div>
        <div className="space-y-4 p-5">
          <PreferenceToggle name="notifyOnSubmit" defaultChecked={form.notifyOnSubmit} label="Notify administrators for every response" />
          <PreferenceToggle name="sendResponseReceipt" defaultChecked={form.sendResponseReceipt} label="Send respondents a receipt" />
          <PreferenceToggle name="allowResponseEditing" defaultChecked={form.allowResponseEditing} label="Allow secure response editing" />
          <label className="block text-sm font-semibold text-slate-700">Editing window (hours)<input type="number" name="responseEditHours" min="1" max="720" defaultValue={form.responseEditHours} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="block text-sm font-semibold text-slate-700">Message when responses are paused<textarea name="responseClosedMessage" rows={3} defaultValue={form.responseClosedMessage} maxLength={500} className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Save settings</button></div>
      </form>
    </div>
  );
}

function PreferenceToggle({ name, defaultChecked, label }: { name: string; defaultChecked: boolean; label: string }) {
  return <label className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700"><span>{label}</span><input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 rounded border-slate-300 text-blue-600" /></label>;
}

function ShareModal({ form, pending, createdShareUrl, onClose, onCreate, onRevoke }: { form: ResponseManagementForm; pending: boolean; createdShareUrl: string; onClose: () => void; onCreate: (days: number, questionIds: string[]) => void; onRevoke: (id: number) => void }) {
  const [days, setDays] = useState(7);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(() => new Set(form.summaryQuestions.map((question) => question.id)));
  const dialogRef = useDialogFocusTrap<HTMLElement>(true, onClose);
  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/50 p-3" role="presentation">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="Share response summary" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold text-slate-900">Share response summary</h2><p className="text-xs text-slate-500">Respondent identities are always hidden</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="size-5" aria-hidden="true" /></button></div>
        <div className="space-y-4 p-5">
          <div className="flex gap-2"><label className="flex-1 text-sm font-semibold text-slate-700">Link expires in<input type="number" min="1" max="90" value={days} onChange={(event) => setDays(Number(event.target.value) || 7)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label><span className="self-end pb-2 text-sm text-slate-500">days</span><button type="button" disabled={pending || selectedQuestionIds.size === 0} onClick={() => onCreate(days, [...selectedQuestionIds])} className="self-end rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Link2 className="mr-1 inline size-4" aria-hidden="true" />Create link</button></div>
          <fieldset><div className="flex items-center justify-between gap-3"><legend className="text-xs font-bold uppercase tracking-wide text-slate-500">Questions to share</legend><button type="button" onClick={() => setSelectedQuestionIds(selectedQuestionIds.size === form.summaryQuestions.length ? new Set() : new Set(form.summaryQuestions.map((question) => question.id)))} className="text-xs font-semibold text-blue-700">{selectedQuestionIds.size === form.summaryQuestions.length ? "Clear all" : "Select all"}</button></div><div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">{form.summaryQuestions.map((question, index) => <label key={question.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={selectedQuestionIds.has(question.id)} onChange={(event) => setSelectedQuestionIds((current) => { const next = new Set(current); if (event.target.checked) next.add(question.id); else next.delete(question.id); return next; })} className="mt-0.5 size-4 rounded border-slate-300 text-blue-600" /><span>{index + 1}. {intercessionRichTextToPlainText(question.label)}</span></label>)}</div>{selectedQuestionIds.size === 0 ? <p className="mt-1 text-xs text-red-600">Select at least one question.</p> : null}</fieldset>
          {createdShareUrl ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-800">Link created and copied</p><p className="mt-1 break-all text-xs text-emerald-700">{createdShareUrl}</p></div> : null}
          <div><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Active links</h3><div className="mt-2 space-y-2">{form.activeSummaryShares.length ? form.activeSummaryShares.map((share) => <div key={share.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><div><p className="text-sm font-semibold text-slate-700">Summary link #{share.id}</p><p className="text-xs text-slate-500">Expires {share.expiresAt ? new Date(share.expiresAt).toLocaleString() : "never"}</p></div><button type="button" disabled={pending} onClick={() => onRevoke(share.id)} className="text-xs font-semibold text-red-600 hover:underline">Revoke</button></div>) : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No active summary links.</p>}</div></div>
        </div>
      </section>
    </div>
  );
}
