"use client";

import { useCallback, useLayoutEffect, useRef, type CSSProperties } from "react";

export function ProjectionAutoFitText({
  text,
  maximumFontSize,
  minimumFontSize = 16,
  className = "",
  style,
}: {
  text: string;
  maximumFontSize: number;
  minimumFontSize?: number;
  className?: string;
  style?: CSSProperties;
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

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = (lower + upper) / 2;
      textElement.style.fontSize = `${candidate}px`;
      const fits = textElement.scrollWidth <= container.clientWidth + 1
        && textElement.scrollHeight <= container.clientHeight + 1;
      if (fits) {
        best = candidate;
        lower = candidate;
      } else {
        upper = candidate;
      }
    }

    textElement.style.fontSize = `${Math.floor(best)}px`;
  }, [maximumFontSize, minimumFontSize, text]);

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
    <div ref={containerRef} className="flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden">
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
