"use client";

import { useCallback, useLayoutEffect, useRef, type CSSProperties } from "react";

export function ProjectionAutoFitText({
  text,
  maximumFontSize,
  minimumFontSize = 16,
  fit = "box",
  className = "",
  style,
  onFontSizeFit,
}: {
  text: string;
  maximumFontSize: number;
  minimumFontSize?: number;
  fit?: "box" | "width";
  className?: string;
  style?: CSSProperties;
  onFontSizeFit?: (fontSize: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLParagraphElement | null>(null);

  const fitText = useCallback(() => {
    const container = containerRef.current;
    const textElement = textRef.current;
    if (!container || !textElement || container.clientWidth === 0 || container.clientHeight === 0) return;
    if (textElement.textContent !== text) return;

    const minimum = Math.max(1, Math.min(minimumFontSize, maximumFontSize));
    let lower = minimum;
    let upper = Math.max(minimum, maximumFontSize);
    let best = minimum;

    textElement.style.overflowWrap = "normal";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = (lower + upper) / 2;
      textElement.style.fontSize = `${candidate}px`;
      const fitsWidth = textElement.scrollWidth <= container.clientWidth + 1;
      const fits = fitsWidth && (fit === "width" || textElement.scrollHeight <= container.clientHeight + 1);
      if (fits) {
        best = candidate;
        lower = candidate;
      } else {
        upper = candidate;
      }
    }

    const fittedFontSize = Math.floor(best);
    textElement.style.fontSize = `${fittedFontSize}px`;
    if (fit === "width" && textElement.scrollWidth > container.clientWidth + 1) {
      textElement.style.overflowWrap = "anywhere";
    }
    onFontSizeFit?.(fittedFontSize);
  }, [fit, maximumFontSize, minimumFontSize, onFontSizeFit, text]);

  useLayoutEffect(() => {
    let active = true;
    let animationFrame = window.requestAnimationFrame(fitText);
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(fitText);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    void document.fonts?.ready.then(() => {
      if (active) fitText();
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [fitText]);

  return (
    <div ref={containerRef} className={`${fit === "box" ? "flex h-full min-h-0 items-center justify-center" : "block"} w-full min-w-0 overflow-hidden`}>
      <p
        ref={textRef}
        className={`max-h-full w-full whitespace-pre-line [text-wrap:balance] ${className}`}
        style={{ ...style, fontSize: `${maximumFontSize}px` }}
      >
        {text}
      </p>
    </div>
  );
}
