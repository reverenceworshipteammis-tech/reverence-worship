"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ProjectionAutoFitText } from "@/components/projection-auto-fit-text";
import { ProjectionBackgroundLayer } from "@/components/projection-background-layer";
import {
  PROJECTION_CHANNEL_NAME,
  projectionOverlaySafeInsets,
  projectionOverlayTextSizePx,
  projectionTextSizePx,
  type ProjectionChannelMessage,
  type ProjectionControlKey,
  type ProjectionOutputState,
  readProjectionState,
} from "@/lib/projection-runtime";

const OUTPUT_KEYS = new Set(["ArrowRight", "ArrowLeft", "PageDown", "PageUp", "Home", "End", "Enter", " ", "b", "o"]);

function slideContentLength(state: ProjectionOutputState) {
  if (!state.slide) return 0;
  return state.slide.sections?.reduce((total, section) => total + section.text.length, 0) ?? state.slide.text.length;
}

function ProjectionFrame({ state, animate }: { state: ProjectionOutputState; animate: boolean }) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLElement | null>(null);
  const [frameHeight, setFrameHeight] = useState(0);
  const [overlayHeight, setOverlayHeight] = useState(0);
  const maximumFontSize = projectionTextSizePx(state.fontSize);
  const overlayFontSize = projectionOverlayTextSizePx(state.overlay.fontSize);
  const showOverlay = Boolean(state.overlay.visible && !state.blanked && (state.overlay.title || state.overlay.text));
  const transitionName = state.transition.type === "dissolve" ? "projection-dissolve-in" : "projection-fade-in";
  const animation = animate && state.transition.type !== "cut" ? `${transitionName} ${state.transition.durationMs}ms ease-out both` : undefined;
  const safeInsets = projectionOverlaySafeInsets(frameHeight, overlayHeight, state.overlay.position, showOverlay);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      setFrameHeight(frame.clientHeight);
      setOverlayHeight(showOverlay ? overlayRef.current?.offsetHeight ?? 0 : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    if (showOverlay && overlayRef.current) observer.observe(overlayRef.current);
    return () => observer.disconnect();
  }, [showOverlay, state.overlay.position, state.overlay.fontSize, state.overlay.title, state.overlay.text, state.overlay.width]);

  return (
    <div ref={frameRef} className="absolute inset-0 isolate overflow-hidden bg-black" style={{ color: state.textColor, animation }}>
      {!state.blanked ? <ProjectionBackgroundLayer background={state.background} media={state.media} effects={state.effects} contentLength={slideContentLength(state)} className="-z-10" /> : null}

      {!state.blanked ? (
        <section className="relative z-0 flex h-full min-h-0 flex-col items-center px-[3.5vw] text-center" style={safeInsets}>
          {state.slide?.label ? <p className="mb-[1vh] text-[clamp(16px,1.8vw,30px)] font-bold uppercase tracking-[0.12em]" style={{ color: state.mutedTextColor }}>{state.slide.label}</p> : null}
          {state.slide?.sections?.length ? (
            <div className="grid min-h-0 w-full flex-1 items-stretch" style={{ gridTemplateColumns: `repeat(${state.slide.sections.length}, minmax(0, 1fr))` }}>
              {state.slide.sections.map((section, index) => (
                <section key={`${section.label}-${index}`} className="flex min-h-0 min-w-0 flex-col px-[2vw] py-[0.5vh]" style={{ borderLeft: index ? `1px solid ${state.mutedTextColor}` : undefined }}>
                  <h2 className="mb-[0.75vh] text-[clamp(16px,1.7vw,28px)] font-extrabold uppercase tracking-[0.14em]" style={{ color: state.mutedTextColor }}>{section.label}</h2>
                  {state.uniformTextSize ? <p className="flex min-h-0 flex-1 items-center justify-center whitespace-pre-line font-bold leading-[1.08] tracking-[0.003em] [text-wrap:balance]" style={{ color: state.textColor, fontSize: maximumFontSize, textShadow: state.textShadow }}>{section.text}</p> : <ProjectionAutoFitText text={section.text} maximumFontSize={maximumFontSize} className="font-bold leading-[1.08] tracking-[0.003em]" style={{ color: state.textColor, textShadow: state.textShadow }} />}
                </section>
              ))}
            </div>
          ) : (
            <div className="min-h-0 w-full flex-1">
              {state.uniformTextSize ? <p className="flex size-full items-center justify-center whitespace-pre-line font-bold leading-[1.08] tracking-[0.003em] [text-wrap:balance]" style={{ color: state.textColor, fontSize: maximumFontSize, textShadow: state.textShadow }}>{state.slide?.text ?? ""}</p> : <ProjectionAutoFitText text={state.slide?.text ?? ""} maximumFontSize={maximumFontSize} className="font-bold leading-[1.08] tracking-[0.003em]" style={{ color: state.textColor, textShadow: state.textShadow }} />}
            </div>
          )}
          <p className="mt-[0.75vh] w-full shrink-0 truncate text-center text-[clamp(12px,1.15vw,20px)]" style={{ color: state.mutedTextColor }}>{state.footer}</p>
        </section>
      ) : null}

      {showOverlay ? (
        <aside ref={overlayRef} className="absolute left-1/2 z-10 max-w-[94vw] whitespace-pre-line rounded-2xl border font-bold leading-[1.22] [text-wrap:balance]" style={{
          top: state.overlay.position === "top" ? "6vh" : state.overlay.position === "center" ? "50%" : "auto",
          bottom: state.overlay.position === "bottom" ? "7vh" : "auto",
          transform: state.overlay.position === "center" ? "translate(-50%, -50%)" : "translateX(-50%)",
          width: `${state.overlay.width}vw`, opacity: state.overlay.opacity / 100, textAlign: state.overlay.alignment,
          background: state.overlay.background, color: state.overlay.color, borderColor: state.overlay.borderColor,
          boxShadow: state.overlay.boxShadow, textShadow: state.overlay.textShadow, padding: state.overlay.padding,
        }}>
          {state.overlay.title ? <h2 className="mb-[0.65em] [overflow-wrap:anywhere] font-extrabold uppercase tracking-[0.1em] opacity-70" style={{ fontSize: `${Math.max(10, Math.round(overlayFontSize * 0.5))}px` }}>{state.overlay.title}</h2> : null}
          {state.overlay.text ? <ProjectionAutoFitText text={state.overlay.text} maximumFontSize={overlayFontSize} minimumFontSize={10} fit="width" className="font-bold leading-[1.22]" /> : null}
        </aside>
      ) : null}
    </div>
  );
}

export function ProjectionOutput({ nativeFullscreen = false }: { nativeFullscreen?: boolean }) {
  const [state, setState] = useState<ProjectionOutputState | null>(() => typeof window === "undefined" ? null : readProjectionState(window.localStorage));
  const [outgoingState, setOutgoingState] = useState<ProjectionOutputState | null>(null);
  const [connected, setConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(nativeFullscreen);
  const displayedStateRef = useRef(state);
  const transitionTimerRef = useRef<number | null>(null);
  const id = useId();

  const displayState = useCallback((nextState: ProjectionOutputState) => {
    const previousState = displayedStateRef.current;
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    if (previousState && previousState.updatedAt !== nextState.updatedAt && nextState.transition.type !== "cut") {
      setOutgoingState(previousState);
      transitionTimerRef.current = window.setTimeout(() => setOutgoingState(null), nextState.transition.durationMs + 60);
    } else setOutgoingState(null);
    displayedStateRef.current = nextState;
    setState(nextState);
  }, []);

  const enterFullscreen = useCallback(async () => {
    try { await document.documentElement.requestFullscreen({ navigationUI: "hide" }); }
    catch { /* Browsers require the operator to click this output or press F. */ }
  }, []);

  useEffect(() => {
    document.title = "Reverence Worship · Projector Output";
    document.documentElement.style.background = "#000";
    document.body.style.background = "#000";
    document.body.style.overflow = "hidden";
    const channel = new BroadcastChannel(PROJECTION_CHANNEL_NAME);
    let wakeLock: WakeLockSentinel | null = null;
    const send = (message: ProjectionChannelMessage) => channel.postMessage(message);
    const keepDisplayAwake = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try { wakeLock = await navigator.wakeLock.request("screen"); } catch { wakeLock = null; }
    };
    channel.onmessage = (event: MessageEvent<ProjectionChannelMessage>) => {
      const message = event.data;
      if (message.type === "state") { displayState(message.state); setConnected(true); }
      else if (message.type === "command") {
        if (message.command === "fullscreen") void enterFullscreen();
        else window.close();
      }
    };

    const report = () => send({
      type: "heartbeat",
      outputId: id,
      fullscreen: nativeFullscreen || Boolean(document.fullscreenElement),
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });
    const onFullscreenChange = () => { setIsFullscreen(nativeFullscreen || Boolean(document.fullscreenElement)); report(); };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "f") { event.preventDefault(); void enterFullscreen(); return; }
      const normalized = event.key.toLowerCase();
      const key = normalized === "b" || normalized === "o" ? normalized : event.key;
      if (!OUTPUT_KEYS.has(key)) return;
      event.preventDefault();
      send({ type: "control", key: key as ProjectionControlKey });
    };
    const onBeforeUnload = () => send({ type: "closed", outputId: id });

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", keepDisplayAwake);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", report);
    window.addEventListener("beforeunload", onBeforeUnload);
    send({ type: "ready", outputId: id });
    send({ type: "request-state", outputId: id });
    report();
    void keepDisplayAwake();
    const heartbeat = window.setInterval(report, 1000);

    return () => {
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
      window.clearInterval(heartbeat);
      send({ type: "closed", outputId: id });
      channel.close();
      void wakeLock?.release();
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", keepDisplayAwake);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", report);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [displayState, enterFullscreen, id, nativeFullscreen]);

  return (
    <main className="fixed inset-0 isolate overflow-hidden bg-black" aria-label="Projection output">
      <style>{`nextjs-portal { display: none !important; } @keyframes projection-fade-in { from { opacity: 0; } to { opacity: 1; } } @keyframes projection-dissolve-in { from { opacity: 0; filter: blur(10px); transform: scale(1.015); } to { opacity: 1; filter: blur(0); transform: scale(1); } } @media (prefers-reduced-motion: reduce) { [style*="projection-"] { animation: none !important; } }`}</style>
      {!state ? (
        <div className="flex h-full items-center justify-center bg-black px-8 text-center text-white"><div><p className="text-2xl font-bold">Waiting for the operator</p><p className="mt-3 text-sm text-white/50">Open Projection in Reverence Worship. Press F or click here for fullscreen.</p></div></div>
      ) : <>{outgoingState ? <ProjectionFrame key={`old-${outgoingState.updatedAt}`} state={outgoingState} animate={false} /> : null}<ProjectionFrame key={state.updatedAt} state={state} animate={Boolean(outgoingState)} /></>}

      {!isFullscreen ? (
        <button type="button" onClick={() => void enterFullscreen()} className="group fixed inset-0 z-20 flex cursor-pointer items-center justify-center bg-black/20 text-white outline-none transition-colors hover:bg-black/30 focus-visible:bg-black/35" aria-label="Enter fullscreen presentation">
          <span className="rounded-2xl border border-white/20 bg-black/80 px-7 py-5 text-center shadow-2xl backdrop-blur-sm transition-transform group-hover:scale-[1.02]"><span className="block text-lg font-extrabold">Click to enter fullscreen presentation</span><span className="mt-1.5 block text-sm font-medium text-white/65">This removes the Chrome title and address bars. You can also press F.</span></span>
        </button>
      ) : null}
      {!connected && state ? <span className="fixed bottom-3 left-3 z-30 rounded bg-amber-500/90 px-2 py-1 text-xs font-bold text-black">Operator reconnecting…</span> : null}
    </main>
  );
}
