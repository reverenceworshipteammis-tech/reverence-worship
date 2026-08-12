"use client";

import { ClipboardEvent, KeyboardEvent, useLayoutEffect, useRef } from "react";
import {
  escapeIntercessionRichText,
  intercessionRichTextToPlainText,
  intercessionRichTextToSafeHtml,
} from "@/lib/intercession-rich-text";

function serializeChildren(parent: Node): string {
  return Array.from(parent.childNodes).map((node) => serializeNode(node)).join("");
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeIntercessionRichText(node.textContent ?? "");
  if (!(node instanceof HTMLElement)) return "";

  const content = serializeChildren(node);
  if (node.tagName === "BR") return "\n";
  if (node.tagName === "STRONG" || node.tagName === "B") return `<strong>${content}</strong>`;
  if (node.tagName === "EM" || node.tagName === "I") return `<em>${content}</em>`;
  if (node.tagName === "DIV" || node.tagName === "P") return `${content}\n`;
  return content;
}

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
  const lastValueRef = useRef(value);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor || lastValueRef.current === value && editor.childNodes.length > 0) return;
    editor.innerHTML = intercessionRichTextToSafeHtml(value);
    lastValueRef.current = value;
  }, [value]);

  function syncValue() {
    const editor = editorRef.current;
    if (!editor) return;
    let nextValue = serializeChildren(editor).replace(/\n+$/, "");
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
      onBlur={syncValue}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className={`${className} empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]`}
    />
  );
}
