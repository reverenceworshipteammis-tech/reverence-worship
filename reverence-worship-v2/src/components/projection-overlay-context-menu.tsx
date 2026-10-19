"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { MoveVertical, Pencil, Trash2 } from "lucide-react";

type ProjectionOverlayContextMenuProps = {
  name: string;
  x: number;
  y: number;
  disabled: boolean;
  onEdit: () => void;
  onPosition: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function ProjectionOverlayContextMenu({
  name,
  x,
  y,
  disabled,
  onEdit,
  onPosition,
  onDelete,
  onClose,
}: ProjectionOverlayContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const { width, height } = menu.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    });
    const firstItem = menu.querySelector<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)',
    );
    (firstItem ?? menu).focus({ preventScroll: true });
  }, [x, y, disabled]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        onClose();
      }
    };
    const handleScroll = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "Tab") {
      onClose();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? [],
    );
    if (!items.length) return;

    const currentIndex = items.findIndex((item) => item === document.activeElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowUp"
          ? (currentIndex <= 0 ? items.length - 1 : currentIndex - 1)
          : (currentIndex + 1) % items.length;
    items[nextIndex].focus();
  }

  if (typeof document === "undefined") return null;

  const itemClassName = "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium outline-none hover:bg-blue-50 focus:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40";

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Overlay options for ${name}`}
      tabIndex={-1}
      className="fixed z-[160] w-48 max-w-[calc(100vw-16px)] rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-xl outline-none"
      style={position}
      onKeyDown={handleKeyDown}
      onKeyUp={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <button type="button" role="menuitem" tabIndex={-1} disabled={disabled} className={itemClassName} onClick={onEdit}>
        <Pencil className="h-4 w-4" aria-hidden="true" />
        Edit
      </button>
      <button type="button" role="menuitem" tabIndex={-1} disabled={disabled} className={itemClassName} onClick={onPosition}>
        <MoveVertical className="h-4 w-4" aria-hidden="true" />
        Position
      </button>
      <button type="button" role="menuitem" tabIndex={-1} disabled={disabled} className={`${itemClassName} text-red-600 hover:bg-red-50 focus:bg-red-50`} onClick={onDelete}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Delete
      </button>
    </div>,
    document.body,
  );
}
