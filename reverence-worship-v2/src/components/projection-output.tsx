"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ProjectionFrame } from "@/components/projection-frame";
import {
  PROJECTION_CHANNEL_NAME,
  type ProjectionChannelMessage,
  type ProjectionControlKey,
  type ProjectionOutputState,
  readProjectionState,
} from "@/lib/projection-runtime";

const OUTPUT_KEYS = new Set(["ArrowRight", "ArrowLeft", "PageDown", "PageUp", "Home", "End", "Enter", " ", "b", "o"]);

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
