"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { normalizeProjectionViewport, projectionPreviewScale, type ProjectionViewport } from "@/lib/projection-layout";

export type ProjectionViewportPreviewProps = {
  viewport?: ProjectionViewport | null;
  children: ReactNode;
  className?: string;
  label?: string;
};

/** Render the same logical output canvas at the available preview width. */
export function ProjectionViewportPreview({ viewport, children, className = "", label }: ProjectionViewportPreviewProps) {
  const dimensions = normalizeProjectionViewport(viewport);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const scale = projectionPreviewScale(dimensions, previewWidth);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    setPreviewWidth(content.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setPreviewWidth(entry.contentRect.width);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`relative min-w-0 overflow-hidden ${className}`}
      style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <div ref={contentRef} className="relative w-full overflow-hidden" style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}>
        <div
          className="pointer-events-none absolute left-0 top-0 isolate overflow-hidden"
          style={{ width: dimensions.width, height: dimensions.height, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
