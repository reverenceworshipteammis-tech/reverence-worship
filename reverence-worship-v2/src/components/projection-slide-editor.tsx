"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, GripVertical, Plus, Redo2, Save, Scissors, Undo2, X } from "lucide-react";
import { ProjectionFrame } from "@/components/projection-frame";
import { ProjectionViewportPreview } from "@/components/projection-viewport-preview";
import type { ProjectionViewport } from "@/lib/projection-layout";
import {
  PROJECTION_TEXT_SIZE_MAX_PERCENT,
  PROJECTION_TEXT_SIZE_MIN_PERCENT,
  projectionTextSizePx,
  type ProjectionOutputState,
} from "@/lib/projection-runtime";
import type { SongProjectionSlide } from "@/lib/song-projection";

export type ProjectionSlideEditorItem = {
  id: string;
  slide: SongProjectionSlide;
  fontSize: number | null;
};

type EditorSnapshot = {
  items: ProjectionSlideEditorItem[];
  activeId: string;
  selectedIds: string[];
};

type EditorHistory = {
  past: EditorSnapshot[];
  present: EditorSnapshot;
  future: EditorSnapshot[];
};

function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return {
    activeId: snapshot.activeId,
    selectedIds: [...snapshot.selectedIds],
    items: snapshot.items.map((item) => ({
      ...item,
      slide: { ...item.slide, sections: item.slide.sections?.map((section) => ({ ...section })) },
    })),
  };
}

export function ProjectionSlideEditor({
  title,
  initialItems,
  initialActiveIndex,
  defaultFontSize,
  previewState,
  viewport,
  canSaveToSong,
  onClose,
  onApply,
  onSaveToSong,
}: {
  title: string;
  initialItems: ProjectionSlideEditorItem[];
  initialActiveIndex: number;
  defaultFontSize: number;
  previewState: ProjectionOutputState;
  viewport: ProjectionViewport;
  canSaveToSong: boolean;
  onClose: () => void;
  onApply: (items: ProjectionSlideEditorItem[], activeIndex: number) => void;
  onSaveToSong?: (items: ProjectionSlideEditorItem[]) => Promise<{ ok: boolean; message?: string }>;
}) {
  const initialActive = initialItems[Math.min(initialActiveIndex, Math.max(0, initialItems.length - 1))]?.id ?? "";
  const [history, setHistory] = useState<EditorHistory>(() => ({
    past: [],
    present: { items: initialItems, activeId: initialActive, selectedIds: initialActive ? [initialActive] : [] },
    future: [],
  }));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [fittedFontSize, setFittedFontSize] = useState<number | null>(null);
  const [fontSizeInput, setFontSizeInput] = useState<{ slideId: string; value: string } | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const snapshot = history.present;
  const activeIndex = Math.max(0, snapshot.items.findIndex((item) => item.id === snapshot.activeId));
  const active = snapshot.items[activeIndex] ?? null;
  const activeFontSize = active?.fontSize ?? defaultFontSize;
  const maximumPreviewFontSize = projectionTextSizePx(activeFontSize);
  const crowded = fittedFontSize !== null && fittedFontSize < maximumPreviewFontSize - 2;
  const allSelected = snapshot.items.length > 0 && snapshot.selectedIds.length === snapshot.items.length;

  const selectedCountLabel = useMemo(() => `${snapshot.selectedIds.length} selected`, [snapshot.selectedIds.length]);

  function previewForItem(item: ProjectionSlideEditorItem): ProjectionOutputState {
    return {
      ...previewState,
      blanked: false,
      slide: item.slide,
      fontSize: item.fontSize ?? defaultFontSize,
      uniformTextSize: false,
      uniformTextViewport: undefined,
    };
  }

  function commit(transform: (current: EditorSnapshot) => EditorSnapshot) {
    setNotice(null);
    setHistory((current) => {
      const next = transform(cloneSnapshot(current.present));
      if (JSON.stringify(next) === JSON.stringify(current.present)) return current;
      return { past: [...current.past.slice(-49), current.present], present: next, future: [] };
    });
  }

  function undo() {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] };
    });
  }

  function redo() {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: current.future.slice(1) };
    });
  }

  function activate(id: string) {
    setFittedFontSize(null);
    setHistory((current) => ({ ...current, present: { ...current.present, activeId: id } }));
  }

  function toggleSelection(id: string) {
    setHistory((current) => {
      const selectedIds = current.present.selectedIds.includes(id)
        ? current.present.selectedIds.filter((selectedId) => selectedId !== id)
        : [...current.present.selectedIds, id];
      return { ...current, present: { ...current.present, selectedIds } };
    });
  }

  function updateActiveSlide(update: (slide: SongProjectionSlide) => SongProjectionSlide) {
    if (!active) return;
    commit((current) => ({
      ...current,
      items: current.items.map((item) => item.id === active.id ? { ...item, slide: update(item.slide) } : item),
    }));
  }

  function setActiveFontSize(value: number) {
    if (!active || !Number.isFinite(value)) return;
    const fontSize = Math.min(PROJECTION_TEXT_SIZE_MAX_PERCENT, Math.max(PROJECTION_TEXT_SIZE_MIN_PERCENT, Math.round(value)));
    commit((current) => ({
      ...current,
      items: current.items.map((item) => item.id === active.id && (item.fontSize ?? defaultFontSize) !== fontSize ? { ...item, fontSize } : item),
    }));
  }

  function adjustActiveFontSize(amount: number) {
    if (!active) return;
    commit((current) => ({
      ...current,
      items: current.items.map((item) => item.id === active.id ? {
        ...item,
        fontSize: Math.min(PROJECTION_TEXT_SIZE_MAX_PERCENT, Math.max(PROJECTION_TEXT_SIZE_MIN_PERCENT, (item.fontSize ?? defaultFontSize) + amount)),
      } : item),
    }));
  }

  function moveByDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    commit((current) => {
      const from = current.items.findIndex((item) => item.id === draggingId);
      const to = current.items.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const items = [...current.items];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...current, items };
    });
    setDraggingId(null);
  }

  function duplicateActive() {
    if (!active) return;
    const duplicateId = `${active.id}-copy-${Date.now()}`;
    commit((current) => {
      const index = current.items.findIndex((item) => item.id === active.id);
      const duplicate = { ...active, id: duplicateId, slide: { ...active.slide, sections: active.slide.sections?.map((section) => ({ ...section })) } };
      const items = [...current.items];
      items.splice(index + 1, 0, duplicate);
      return { ...current, items, activeId: duplicateId, selectedIds: [duplicateId] };
    });
  }

  function addSlide() {
    const id = `new-slide-${Date.now()}`;
    commit((current) => {
      const index = Math.max(0, current.items.findIndex((item) => item.id === current.activeId));
      const items = [...current.items];
      items.splice(index + 1, 0, { id, fontSize: null, slide: { label: null, text: "New slide" } });
      return { ...current, items, activeId: id, selectedIds: [id] };
    });
  }

  function splitActive() {
    if (!active || active.slide.sections?.length) return;
    const text = active.slide.text;
    const selection = textAreaRef.current?.selectionStart ?? 0;
    let splitAt = selection > 0 && selection < text.length ? selection : Math.floor(text.length / 2);
    if (!text.slice(0, splitAt).trim() || !text.slice(splitAt).trim()) return;
    const previousBreak = text.lastIndexOf("\n", splitAt);
    const nextBreak = text.indexOf("\n", splitAt);
    if (selection <= 0 || selection >= text.length) splitAt = previousBreak > 0 ? previousBreak : nextBreak > 0 ? nextBreak : splitAt;
    const firstText = text.slice(0, splitAt).trim();
    const secondText = text.slice(splitAt).trim();
    if (!firstText || !secondText) return;
    const secondId = `${active.id}-split-${Date.now()}`;
    commit((current) => {
      const index = current.items.findIndex((item) => item.id === active.id);
      const items = [...current.items];
      items.splice(index, 1,
        { ...active, slide: { ...active.slide, text: firstText } },
        { ...active, id: secondId, slide: { ...active.slide, label: active.slide.label ? `${active.slide.label} 2` : null, text: secondText } },
      );
      return { ...current, items, activeId: secondId, selectedIds: [secondId] };
    });
  }

  function mergeWithNext() {
    const next = snapshot.items[activeIndex + 1];
    if (!active || !next || active.slide.sections?.length || next.slide.sections?.length) return;
    commit((current) => {
      const index = current.items.findIndex((item) => item.id === active.id);
      const items = [...current.items];
      items.splice(index, 2, { ...active, slide: { ...active.slide, text: `${active.slide.text.trim()}\n${next.slide.text.trim()}` } });
      return { ...current, items, activeId: active.id, selectedIds: [active.id] };
    });
  }

  async function saveToSong() {
    if (!onSaveToSong || saving) return;
    setSaving(true);
    setNotice(null);
    const result = await onSaveToSong(snapshot.items);
    setSaving(false);
    if (!result.ok) setNotice(result.message ?? "Unable to save the song.");
  }

  return (
    <div className="fixed inset-0 z-[140] bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4" role="presentation">
      <section className="mx-auto flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label={`Edit slides for ${title}`}>
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
          <div className="min-w-0"><h2 className="truncate text-sm font-extrabold text-slate-950">Edit slides · {title}</h2><p className="text-[10px] font-semibold text-slate-400">{snapshot.items.length} slides · {selectedCountLabel}</p></div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={undo} disabled={!history.past.length} className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30" aria-label="Undo"><Undo2 className="size-4" /></button>
            <button type="button" onClick={redo} disabled={!history.future.length} className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30" aria-label="Redo"><Redo2 className="size-4" /></button>
            {canSaveToSong ? <button type="button" onClick={() => void saveToSong()} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-[10px] font-extrabold text-blue-700 disabled:opacity-40"><Save className="size-3.5" />{saving ? "Saving…" : "Save to song"}</button> : null}
            <button type="button" onClick={() => onApply(snapshot.items, activeIndex)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[10px] font-extrabold text-white"><Check className="size-3.5" />Apply to preview</button>
            <button type="button" onClick={onClose} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close slide editor"><X className="size-4" /></button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[270px_minmax(0,1fr)_270px]">
          <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2"><button type="button" onClick={() => setHistory((current) => ({ ...current, present: { ...current.present, selectedIds: allSelected ? [] : current.present.items.map((item) => item.id) } }))} className="text-[10px] font-extrabold text-blue-700">{allSelected ? "Select none" : "Select all"}</button><button type="button" onClick={addSlide} className="inline-flex h-8 items-center gap-1 rounded-md bg-blue-600 px-2 text-[9px] font-bold text-white"><Plus className="size-3" /> Add</button></div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
              {snapshot.items.map((item, index) => {
                const selected = snapshot.selectedIds.includes(item.id);
                const isActive = item.id === active?.id;
                return <article key={item.id} draggable onDragStart={() => setDraggingId(item.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveByDrop(item.id)} className={`group overflow-hidden rounded-lg border bg-white shadow-sm ${isActive ? "border-blue-500 ring-2 ring-blue-100" : selected ? "border-violet-400" : "border-slate-200"}`}>
                  <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-1"><GripVertical className="size-3 cursor-grab text-slate-300" /><input type="checkbox" checked={selected} onChange={() => toggleSelection(item.id)} aria-label={`Select slide ${index + 1}`} className="accent-blue-600" /><button type="button" onClick={() => activate(item.id)} className="min-w-0 flex-1 truncate text-left text-[9px] font-extrabold text-slate-700">{index + 1}. {item.slide.label || "Slide"}</button><span className="text-[8px] font-bold text-blue-600">{item.fontSize ?? defaultFontSize}%</span></div>
                  <button type="button" onClick={() => activate(item.id)} className="relative block w-full overflow-hidden bg-black" aria-label={`Preview slide ${index + 1}`}>
                    <ProjectionViewportPreview viewport={viewport}>
                      <ProjectionFrame state={previewForItem(item)} playVideo={false} animateBackground={false} />
                    </ProjectionViewportPreview>
                  </button>
                </article>;
              })}
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto bg-slate-100/70 p-4 sm:p-6">
            {active ? <div className="mx-auto max-w-4xl space-y-4">
              <div className="relative isolate overflow-hidden rounded-xl border border-slate-700 bg-black shadow-xl">
                <ProjectionViewportPreview viewport={viewport} label="Active slide projector preview">
                  <ProjectionFrame state={previewForItem(active)} onFontSizeFit={setFittedFontSize} />
                </ProjectionViewportPreview>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Slide heading<input value={active.slide.label ?? ""} onChange={(event) => updateActiveSlide((slide) => ({ ...slide, label: event.target.value || null }))} placeholder="Optional heading" className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-semibold normal-case tracking-normal outline-none focus:border-blue-500" /></label>
                {active.slide.sections?.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{active.slide.sections.map((section, sectionIndex) => <label key={sectionIndex} className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{section.label}<textarea value={section.text} onChange={(event) => updateActiveSlide((slide) => ({ ...slide, sections: slide.sections?.map((value, index) => index === sectionIndex ? { ...value, text: event.target.value } : value), text: slide.sections?.map((value, index) => index === sectionIndex ? event.target.value : value.text).join("\n\n") ?? slide.text }))} rows={8} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm font-semibold leading-6 normal-case tracking-normal outline-none focus:border-blue-500" /></label>)}</div> : <label className="mt-3 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Slide text<textarea ref={textAreaRef} value={active.slide.text} onChange={(event) => updateActiveSlide((slide) => ({ ...slide, text: event.target.value }))} rows={8} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 p-3 text-base font-semibold leading-7 normal-case tracking-normal outline-none focus:border-blue-500" /></label>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={splitActive} disabled={Boolean(active.slide.sections?.length)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-[9px] font-bold text-slate-600 disabled:opacity-30"><Scissors className="size-3" /> Split at cursor</button>
                  <button type="button" onClick={mergeWithNext} disabled={!snapshot.items[activeIndex + 1] || Boolean(active.slide.sections?.length || snapshot.items[activeIndex + 1]?.slide.sections?.length)} className="h-8 rounded-md border border-slate-200 px-2 text-[9px] font-bold text-slate-600 disabled:opacity-30">Merge next</button>
                  <button type="button" onClick={duplicateActive} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2 text-[9px] font-bold text-slate-600"><Copy className="size-3" /> Duplicate</button>
                </div>
              </div>
            </div> : null}
          </main>

          <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-4 lg:border-l lg:border-t-0">
            <div className={`rounded-lg px-3 py-2 text-[10px] font-bold ${crowded ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"}`}>{crowded ? "AutoFit reduced this crowded slide." : "This slide fits at its chosen size."}</div>
            <section className="mt-4 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3" role="group" aria-label="Active slide size">
                <label className="block text-[10px] font-extrabold text-slate-700">
                  Active slide size
                  <span className="mt-1 flex items-center gap-1 text-xl font-semibold tabular-nums text-slate-800">
                    <input
                      type="number"
                      min={PROJECTION_TEXT_SIZE_MIN_PERCENT}
                      max={PROJECTION_TEXT_SIZE_MAX_PERCENT}
                      step={1}
                      disabled={!active}
                      value={fontSizeInput && fontSizeInput.slideId === active?.id ? fontSizeInput.value : activeFontSize}
                      onFocus={(event) => {
                        if (!active) return;
                        setFontSizeInput({ slideId: active.id, value: String(activeFontSize) });
                        event.currentTarget.select();
                      }}
                      onChange={(event) => {
                        if (!active) return;
                        const value = event.currentTarget.value;
                        setFontSizeInput({ slideId: active.id, value });
                        const size = Number(value);
                        if (value.trim() && Number.isInteger(size) && size >= PROJECTION_TEXT_SIZE_MIN_PERCENT && size <= PROJECTION_TEXT_SIZE_MAX_PERCENT) setActiveFontSize(size);
                      }}
                      onBlur={(event) => {
                        if (event.currentTarget.value.trim()) setActiveFontSize(Number(event.currentTarget.value));
                        setFontSizeInput(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                      }}
                      aria-label="Active slide size percentage"
                      className="h-9 w-16 rounded-md border border-slate-200 bg-white px-1.5 outline-none [appearance:textfield] focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span aria-hidden="true">%</span>
                  </span>
                </label>
                <div className="flex shrink-0 flex-col divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200">
                  <button type="button" onClick={() => adjustActiveFontSize(1)} disabled={!active || activeFontSize >= PROJECTION_TEXT_SIZE_MAX_PERCENT} aria-label="Increase active slide size" title="Increase font size" className="flex h-6 w-8 items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-30"><ChevronUp className="size-4" aria-hidden="true" /></button>
                  <button type="button" onClick={() => adjustActiveFontSize(-1)} disabled={!active || activeFontSize <= PROJECTION_TEXT_SIZE_MIN_PERCENT} aria-label="Decrease active slide size" title="Decrease font size" className="flex h-6 w-8 items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-30"><ChevronDown className="size-4" aria-hidden="true" /></button>
                </div>
              </div>
              <button type="button" onClick={() => { if (!active) return; commit((current) => ({ ...current, items: current.items.map((item) => item.id === active.id ? { ...item, fontSize: null } : item) })); }} className="mt-2 h-8 w-full rounded-md bg-slate-100 text-[9px] font-bold text-slate-600">Use default ({defaultFontSize}%)</button>
            </section>
            {notice ? <p className="mt-3 rounded-lg bg-red-50 p-2 text-[9px] font-semibold text-red-700 ring-1 ring-red-200">{notice}</p> : null}
          </aside>
        </div>
      </section>
    </div>
  );
}
