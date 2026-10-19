"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ProjectionAutoFitText } from "@/components/projection-auto-fit-text";
import { ProjectionBackgroundLayer } from "@/components/projection-background-layer";
import { projectionOverlayLayout, type ProjectionViewport } from "@/lib/projection-layout";
import {
  projectionOverlayFontSizes,
  projectionOverlaySafeInsets,
  projectionTextSizePx,
  type ProjectionOutputState,
  type ProjectionOverlayState,
} from "@/lib/projection-runtime";

function slideContentLength(state: ProjectionOutputState) {
  if (!state.slide) return 0;
  return state.slide.sections?.reduce((total, section) => total + section.text.length, 0) ?? state.slide.text.length;
}

export function ProjectionOverlayLayer({
  overlay,
  viewport,
  onHeightChange,
}: {
  overlay: ProjectionOverlayState;
  viewport: ProjectionViewport;
  onHeightChange?: (height: number) => void;
}) {
  const overlayRef = useRef<HTMLElement | null>(null);
  const visible = Boolean(overlay.visible && (overlay.title || overlay.text));
  const fontSizes = projectionOverlayFontSizes(overlay.fontSize, overlay.titleFontScale, overlay.textFontScale);

  useLayoutEffect(() => {
    if (!onHeightChange) return;
    const element = overlayRef.current;
    if (!visible || !element) {
      onHeightChange?.(0);
      return;
    }
    const measure = () => onHeightChange?.(element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible, onHeightChange]);

  if (!visible) return null;

  return (
    <aside
      ref={overlayRef}
      className="absolute left-1/2 z-10 whitespace-pre-line rounded-2xl border font-bold leading-[1.22] [text-wrap:balance]"
      style={{
        ...projectionOverlayLayout(overlay, viewport),
        opacity: overlay.opacity / 100,
        textAlign: overlay.alignment,
        background: overlay.background,
        color: overlay.color,
        borderColor: overlay.borderColor,
        boxShadow: overlay.boxShadow,
        textShadow: overlay.textShadow,
      }}
    >
      {overlay.title ? <h2 className="mb-[0.65em] [overflow-wrap:anywhere] font-extrabold uppercase tracking-[0.1em] opacity-70" style={{ fontSize: fontSizes.title }}>{overlay.title}</h2> : null}
      {overlay.text ? <ProjectionAutoFitText text={overlay.text} maximumFontSize={fontSizes.text} minimumFontSize={10} fit="width" className="font-bold leading-[1.22]" /> : null}
    </aside>
  );
}

export function ProjectionFrame({ state, animate = false, playVideo = true, animateBackground = true, onFontSizeFit }: {
  state: ProjectionOutputState;
  animate?: boolean;
  playVideo?: boolean;
  animateBackground?: boolean;
  onFontSizeFit?: (fontSize: number) => void;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<ProjectionViewport>({ width: 0, height: 0 });
  const [overlayHeight, setOverlayHeight] = useState(0);
  const maximumFontSize = projectionTextSizePx(state.fontSize);
  const showOverlay = Boolean(state.overlay.visible && !state.blanked && (state.overlay.title || state.overlay.text));
  const transitionName = state.transition.type === "dissolve" ? "projection-dissolve-in" : "projection-fade-in";
  const animation = animate && state.transition.type !== "cut" ? `${transitionName} ${state.transition.durationMs}ms ease-out both` : undefined;
  const safeInsets = projectionOverlaySafeInsets(viewport.height, overlayHeight, state.overlay.position, showOverlay);
  const vw = viewport.width / 100;
  const vh = viewport.height / 100;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const width = frame.clientWidth;
      const height = frame.clientHeight;
      setViewport((current) => current.width === width && current.height === height ? current : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frameRef} className="absolute inset-0 isolate overflow-hidden bg-black" style={{ color: state.textColor, animation }}>
      {!state.blanked ? <ProjectionBackgroundLayer background={state.background} media={state.media} effects={state.effects} playVideo={playVideo} animate={animateBackground} contentLength={slideContentLength(state)} className="-z-10" /> : null}

      {!state.blanked ? (
        <section className="relative z-0 flex h-full min-h-0 flex-col items-center text-center" style={{ ...safeInsets, paddingLeft: 3.5 * vw, paddingRight: 3.5 * vw }}>
          {state.slide?.label ? <p className="font-bold uppercase tracking-[0.12em]" style={{ color: state.mutedTextColor, marginBottom: vh, fontSize: Math.min(30, Math.max(16, 1.8 * vw)) }}>{state.slide.label}</p> : null}
          {state.slide?.sections?.length ? (
            <div className="grid min-h-0 w-full flex-1 items-stretch" style={{ gridTemplateColumns: `repeat(${state.slide.sections.length}, minmax(0, 1fr))` }}>
              {state.slide.sections.map((section, index) => (
                <section key={`${section.label}-${index}`} className="flex min-h-0 min-w-0 flex-col" style={{ borderLeft: index ? `1px solid ${state.mutedTextColor}` : undefined, padding: `${0.5 * vh}px ${2 * vw}px` }}>
                  <h2 className="font-extrabold uppercase tracking-[0.14em]" style={{ color: state.mutedTextColor, marginBottom: 0.75 * vh, fontSize: Math.min(28, Math.max(16, 1.7 * vw)) }}>{section.label}</h2>
                  {state.uniformTextSize ? <p className="flex min-h-0 flex-1 items-center justify-center whitespace-pre-line font-bold leading-[1.08] tracking-[0.003em] [text-wrap:balance]" style={{ color: state.textColor, fontSize: maximumFontSize, textShadow: state.textShadow }}>{section.text}</p> : <ProjectionAutoFitText text={section.text} maximumFontSize={maximumFontSize} onFontSizeFit={index === 0 ? onFontSizeFit : undefined} className="font-bold leading-[1.08] tracking-[0.003em]" style={{ color: state.textColor, textShadow: state.textShadow }} />}
                </section>
              ))}
            </div>
          ) : (
            <div className="min-h-0 w-full flex-1">
              {state.uniformTextSize ? <p className="flex size-full items-center justify-center whitespace-pre-line font-bold leading-[1.08] tracking-[0.003em] [text-wrap:balance]" style={{ color: state.textColor, fontSize: maximumFontSize, textShadow: state.textShadow }}>{state.slide?.text ?? ""}</p> : <ProjectionAutoFitText text={state.slide?.text ?? ""} maximumFontSize={maximumFontSize} onFontSizeFit={onFontSizeFit} className="font-bold leading-[1.08] tracking-[0.003em]" style={{ color: state.textColor, textShadow: state.textShadow }} />}
            </div>
          )}
        </section>
      ) : null}

      {!state.blanked ? <ProjectionOverlayLayer overlay={state.overlay} viewport={viewport} onHeightChange={setOverlayHeight} /> : null}
    </div>
  );
}
