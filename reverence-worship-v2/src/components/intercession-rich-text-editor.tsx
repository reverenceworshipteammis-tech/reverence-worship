"use client";

import { ClipboardEvent, KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bold, Italic } from "lucide-react";
import {
  intercessionRichTextToPlainText,
  intercessionRichTextToSafeHtml,
  intercessionFonts,
  richTextStyle,
} from "@/lib/intercession-rich-text";
import { serializeIntercessionEditor } from "@/lib/intercession-editor-serialization";

export function IntercessionRichTextEditor({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  maxLength,
  multiline = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  className: string;
  maxLength?: number;
  multiline?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const lastValueRef = useRef(value);
  const selectionRef = useRef<Range | null>(null);
  const toolbarInteractionRef = useRef(false);
  const [font, setFont] = useState("");
  const [size, setSize] = useState(16);
  const [toolbarPosition, setToolbarPosition] = useState({ left: 0, top: 0, above: true });

  const positionToolbar = useCallback((range = selectionRef.current) => {
    if (!range) return;
    const selectionRect = range.getBoundingClientRect();
    if (!selectionRect.width && !selectionRect.height) return;
    const toolbarWidth = toolbarRef.current?.offsetWidth ?? Math.min(520, window.innerWidth - 16);
    const toolbarHeight = toolbarRef.current?.offsetHeight ?? 48;
    const edgeGap = 8;
    const above = selectionRect.top >= toolbarHeight + edgeGap;
    const centeredLeft = selectionRect.left + selectionRect.width / 2 - toolbarWidth / 2;
    setToolbarPosition({
      left: Math.max(edgeGap, Math.min(centeredLeft, window.innerWidth - toolbarWidth - edgeGap)),
      top: above ? selectionRect.top - toolbarHeight - edgeGap : selectionRect.bottom + edgeGap,
      above,
    });
  }, []);

  const rememberSelection = useCallback(() => {
    const selection = window.getSelection();
    if (toolbarInteractionRef.current || toolbarRef.current?.contains(document.activeElement)) return;
    if (!selection?.rangeCount || selection.isCollapsed || !selection.toString().length || !editorRef.current?.contains(selection.anchorNode) || !editorRef.current.contains(selection.focusNode)) {
      setShowToolbar(false);
      return;
    }
    const range = selection.getRangeAt(0).cloneRange();
    selectionRef.current = range;
    setShowToolbar(true);
    positionToolbar(range);
    const element = selection.anchorNode instanceof HTMLElement ? selection.anchorNode : selection.anchorNode?.parentElement;
    if (element) {
      setSize(Math.round(parseFloat(getComputedStyle(element).fontSize)));
      const selectedFont = element.closest<HTMLElement>("[data-font]")?.dataset.font;
      setFont(selectedFont === "default" ? "" : selectedFont ?? "");
    }
  }, [positionToolbar]);

  useEffect(() => {
    function repositionToolbar() {
      positionToolbar();
    }
    function dismissOutside(event: Event) {
      if (!(event.target instanceof Node) || toolbarRef.current?.contains(event.target) || editorRef.current?.contains(event.target)) return;
      setShowToolbar(false);
      selectionRef.current = null;
    }
    document.addEventListener("selectionchange", rememberSelection);
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    window.addEventListener("resize", repositionToolbar);
    window.addEventListener("scroll", repositionToolbar, true);
    return () => {
      document.removeEventListener("selectionchange", rememberSelection);
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
      window.removeEventListener("resize", repositionToolbar);
      window.removeEventListener("scroll", repositionToolbar, true);
    };
  }, [positionToolbar, rememberSelection]);

  useLayoutEffect(() => {
    if (showToolbar) positionToolbar();
  }, [showToolbar, positionToolbar]);

  function restoreSelection() {
    const editor = editorRef.current;
    if (!editor) return null;
    const range = selectionRef.current?.cloneRange() ?? document.createRange();
    editor.focus();
    if (!editor.contains(range.commonAncestorContainer) || range.collapsed) range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return range;
  }

  function formatText(next: { font?: string; size?: number; case?: string }) {
    const range = restoreSelection();
    if (!range) return;
    const fragment = range.extractContents();
    if (next.case) {
      const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode;
        text.textContent = next.case === "upper" ? text.textContent?.toLocaleUpperCase() ?? "" : next.case === "lower" ? text.textContent?.toLocaleLowerCase() ?? "" : (text.textContent ?? "").toLocaleLowerCase().replace(/(^|\s)(\S)/gu, (_, gap: string, letter: string) => gap + letter.toLocaleUpperCase());
      }
    }
    fragment.querySelectorAll<HTMLElement>("[data-size], [data-font]").forEach((element) => {
      if (next.size !== undefined) { element.removeAttribute("data-size"); element.style.removeProperty("font-size"); }
      if (next.font !== undefined) { element.removeAttribute("data-font"); element.style.removeProperty("font-family"); }
    });
    const span = document.createElement("span");
    if (next.font !== undefined) span.dataset.font = next.font || "default";
    if (next.size) span.dataset.size = String(next.size);
    Object.assign(span.style, richTextStyle(next.font === "" ? "default" : next.font, next.size));
    span.append(fragment);
    range.insertNode(span);
    range.selectNodeContents(span);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    selectionRef.current = range.cloneRange();
    if (next.font !== undefined) setFont(next.font);
    if (next.size !== undefined) setSize(next.size);
    syncValue();
  }

  function toggleStyle(command: "bold" | "italic") {
    restoreSelection();
    document.execCommand(command, false);
    syncValue();
    rememberSelection();
  }

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor || lastValueRef.current === value && editor.childNodes.length > 0) return;
    editor.innerHTML = intercessionRichTextToSafeHtml(value);
    lastValueRef.current = value;
  }, [value]);

  function syncValue() {
    const editor = editorRef.current;
    if (!editor) return;
    let nextValue = serializeIntercessionEditor(editor).replace(/\n+$/, "");
    if (maxLength && intercessionRichTextToPlainText(nextValue).length > maxLength) {
      editor.innerHTML = intercessionRichTextToSafeHtml(lastValueRef.current);
      return;
    }
    if (!multiline) nextValue = nextValue.replace(/\r?\n/g, " ");
    lastValueRef.current = nextValue;
    onChange(nextValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!multiline && event.key === "Enter") {
      event.preventDefault();
      return;
    }
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key !== "b" && key !== "i") return;

    event.preventDefault();
    document.execCommand(key === "b" ? "bold" : "italic", false);
    requestAnimationFrame(syncValue);
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, multiline ? pastedText : pastedText.replace(/\r?\n/g, " "));
    requestAnimationFrame(syncValue);
  }

  return (
    <div className="min-w-0">
      {showToolbar && <div
        ref={toolbarRef}
        role="group"
        aria-label={`${ariaLabel} formatting`}
        onPointerDownCapture={() => { toolbarInteractionRef.current = true; }}
        onPointerUpCapture={() => { requestAnimationFrame(() => { toolbarInteractionRef.current = false; }); }}
        style={{ left: toolbarPosition.left, top: toolbarPosition.top }}
        className={`fixed z-[80] flex max-h-[min(14rem,calc(100dvh-1rem))] max-w-[calc(100vw-1rem)] flex-wrap items-center gap-1 overflow-y-auto rounded-lg border border-slate-300 bg-white p-1 text-slate-600 shadow-xl ${toolbarPosition.above ? "origin-bottom" : "origin-top"}`}
      >
        <select aria-label="Font family" value={font} onChange={(event) => formatText({ font: event.target.value })} className="min-h-9 max-w-40 rounded border border-slate-200 bg-white px-2 text-xs">
          <option value="">Default font</option>
          {Object.keys(intercessionFonts).filter((key) => key !== "default").map((key) => <option key={key} value={key}>{({ aptos: "Aptos", "aptos-narrow": "Aptos Narrow", arial: "Arial", georgia: "Georgia", times: "Times New Roman", verdana: "Verdana", courier: "Courier New" })[key]}</option>)}
        </select>
        <select aria-label="Font size in pixels" value={size} onChange={(event) => formatText({ size: Number(event.target.value) })} className="min-h-9 rounded border border-slate-200 bg-white px-1 text-xs">
          {[...new Set([10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, size])].sort((a, b) => a - b).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <button type="button" aria-label="Increase text size" title="Increase text size" onMouseDown={(event) => event.preventDefault()} onClick={() => formatText({ size: Math.min(64, size + 2) })} className="min-h-9 min-w-9 rounded px-1 text-lg hover:bg-slate-100">A<sup>+</sup></button>
        <button type="button" aria-label="Decrease text size" title="Decrease text size" onMouseDown={(event) => event.preventDefault()} onClick={() => formatText({ size: Math.max(10, size - 2) })} className="min-h-9 min-w-9 rounded px-1 text-sm hover:bg-slate-100">A<sup>−</sup></button>
        <select aria-label="Change text case" value="" onChange={(event) => formatText({ case: event.target.value })} className="min-h-9 max-w-28 rounded border border-slate-200 bg-white px-1 text-xs"><option value="" disabled>Aa</option><option value="upper">UPPERCASE</option><option value="lower">lowercase</option><option value="title">Title Case</option></select>
        <button type="button" aria-label="Bold" title="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleStyle("bold")} className="flex size-9 items-center justify-center rounded hover:bg-slate-100"><Bold className="size-4" /></button>
        <button type="button" aria-label="Italic" title="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => toggleStyle("italic")} className="flex size-9 items-center justify-center rounded hover:bg-slate-100"><Italic className="size-4" /></button>
      </div>}
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline={multiline}
      aria-keyshortcuts="Control+B Control+I Meta+B Meta+I"
      data-placeholder={placeholder}
      onInput={syncValue}
      onFocus={rememberSelection}
      onMouseUp={rememberSelection}
      onKeyUp={rememberSelection}
      onTouchEnd={rememberSelection}
      onBlur={syncValue}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className={`${className} empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]`}
    />
    </div>
  );
}
