"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { deleteProjectionOverlayPreset, saveProjectionOverlayPreset, updateProjectionSongLyrics } from "@/app/admin/music/actions";
import { ProjectionAutoFitText } from "@/components/projection-auto-fit-text";
import { ProjectionBackgroundLayer } from "@/components/projection-background-layer";
import { ProjectionSlideEditor, type ProjectionSlideEditorItem } from "@/components/projection-slide-editor";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  Eye,
  EyeOff,
  Fullscreen,
  Hash,
  ImageIcon,
  ListPlus,
  LoaderCircle,
  MonitorCog,
  MonitorPlay,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Save,
  Send,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { bibleBookName, bibleBooks, bibleVersions } from "@/lib/bible-data";
import { multiVersionBibleProjectionSlides, type BibleProjectionVerse } from "@/lib/bible-projection";
import { chooseProjectionScreen, projectionScreenId, type ProjectionScreenLike } from "@/lib/projection-display";
import { projectionThemeCategories, projectionThemes, type ProjectionTheme, type ProjectionThemeCategory, type ProjectionThemeKey } from "@/lib/projection-themes";
import {
  PROJECTION_CHANNEL_NAME,
  DEFAULT_PROJECTION_BACKGROUND_EFFECTS,
  DEFAULT_PROJECTION_MEDIA,
  PROJECTION_TEXT_SIZE_MAX_PERCENT,
  PROJECTION_TEXT_SIZE_MIN_PERCENT,
  clampProjectionTransitionDuration,
  normalizeProjectionBackgroundEffects,
  projectionMediaBrightnessPercent,
  projectionNavigationState,
  projectionOverlayPreviewTextSizePx,
  projectionOverlaySafeInsets,
  projectionOverlayTextSizePx,
  projectionOverlayWidthPercent,
  projectionPreviewTextSizePx,
  projectionTextSizePx,
  readProjectionState,
  sanitizeProjectionMediaUrl,
  type ProjectionChannelMessage,
  type ProjectionBackgroundAmbience,
  type ProjectionBackgroundMotion,
  type ProjectionControlKey,
  type ProjectionMediaType,
  type ProjectionOutputState,
  type ProjectionTransitionType,
  writeProjectionState,
} from "@/lib/projection-runtime";
import { MAX_EDITABLE_SONG_LYRICS_LENGTH, songProjectionSlides, type SongProjectionSlide } from "@/lib/song-projection";
import type { ProjectionOverlayPreset } from "@/lib/projection-overlays";

type ProjectionSong = {
  id: number;
  title: string;
  artist: string | null;
  lyrics: string | null;
  isArchived: boolean;
};

type ProjectionPlaylist = {
  id: number;
  title: string;
  sessions: Array<{
    id: number;
    serviceNumber: number;
    name: string;
    songs: ProjectionSong[];
  }>;
};

type LoadedBibleChapter = {
  reference: string;
  version: { key: string; code: string; label: string };
  verses: BibleProjectionVerse[];
};

type ScreenDetailsLike = { screens: ProjectionScreenLike[]; currentScreen: ProjectionScreenLike };
type BrowserWithScreens = Window & { getScreenDetails?: () => Promise<ScreenDetailsLike> };
type DesktopBridge = {
  listDisplays: () => Promise<ProjectionScreenLike[]>;
  openProjector: (options: { url: string; displayId?: string }) => Promise<{ ok: boolean; message?: string }>;
  closeProjector: () => Promise<void>;
};

type Source = "songs" | "bible";
type OverlayTone = "blue" | "dark" | "light" | "minimal";
type OverlayPosition = "top" | "center" | "bottom";
type ProjectionControlPanel = "songs" | "bible" | "looks" | "media" | "overlay";
type SongLyricsEditorState = { songId: number; title: string; lyrics: string; notice: string | null };
type LiveSelection = { source: Source; songId: number | null; slideIndex: number };
type ProjectionViewport = { width: number; height: number };
type FitAllRequest = ProjectionViewport & { deckKey: string; scale: number };

const RECENT_PROJECTION_SONGS_KEY = "reverence-projection-recent-songs-v1";
const PROJECTION_WORKSPACE_SETTINGS_KEY = "reverence-projection-workspace-v1";
const projectionControlPanels: ProjectionControlPanel[] = ["songs", "bible", "overlay", "media", "looks"];

function projectionPercentForOutputFontSize(measuredFontSize: number) {
  const progress = (measuredFontSize - projectionTextSizePx(PROJECTION_TEXT_SIZE_MIN_PERCENT))
    / (projectionTextSizePx(PROJECTION_TEXT_SIZE_MAX_PERCENT) - projectionTextSizePx(PROJECTION_TEXT_SIZE_MIN_PERCENT));
  return Math.min(PROJECTION_TEXT_SIZE_MAX_PERCENT, Math.max(PROJECTION_TEXT_SIZE_MIN_PERCENT, Math.floor(PROJECTION_TEXT_SIZE_MIN_PERCENT + progress * (PROJECTION_TEXT_SIZE_MAX_PERCENT - PROJECTION_TEXT_SIZE_MIN_PERCENT))));
}

function ProjectionEffectRange({ label, value, minimum, maximum, unit = "%", onChange }: {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[9px] font-bold text-slate-500"><span>{label}</span><strong className="text-slate-700">{value}{unit}</strong></span>
      <input type="range" min={minimum} max={maximum} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full accent-blue-600" />
    </label>
  );
}

function ProjectionOutputFitMeasurement({ slide, footer, viewport, scale, overlay, onFit }: {
  slide: SongProjectionSlide;
  footer: string;
  viewport: ProjectionViewport;
  scale: number;
  overlay: ProjectionOutputState["overlay"];
  onFit: (sectionIndex: number | null, fittedFontSize: number) => void;
}) {
  const overlayRef = useRef<HTMLElement | null>(null);
  const [overlayHeight, setOverlayHeight] = useState(0);
  const width = Math.max(1, Math.round(viewport.width * scale));
  const height = Math.max(1, Math.round(viewport.height * scale));
  const overlayVisible = Boolean(overlay.visible && (overlay.title || overlay.text));
  const safeInsets = projectionOverlaySafeInsets(height, overlayHeight, overlay.position, overlayVisible);
  const maximumFontSize = projectionTextSizePx(PROJECTION_TEXT_SIZE_MAX_PERCENT) * scale;
  const minimumFontSize = Math.max(1, projectionTextSizePx(PROJECTION_TEXT_SIZE_MIN_PERCENT) * scale);
  const labelFontSize = Math.min(30, Math.max(16, viewport.width * 0.018)) * scale;
  const sectionLabelFontSize = Math.min(28, Math.max(16, viewport.width * 0.017)) * scale;
  const footerFontSize = Math.min(20, Math.max(12, viewport.width * 0.0115)) * scale;
  const overlayFontSize = projectionOverlayTextSizePx(overlay.fontSize) * scale;
  const [overlayPaddingYVh = 0, overlayPaddingXVw = 0] = overlay.padding.match(/[\d.]+/g)?.map(Number) ?? [];
  const readyToMeasure = !overlayVisible || overlayHeight > 0;

  useLayoutEffect(() => {
    const element = overlayRef.current;
    if (!overlayVisible || !element) { setOverlayHeight(0); return; }
    const measure = () => setOverlayHeight(element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [overlay.text, overlay.title, overlayVisible, width]);

  return (
    <div className="relative isolate flex flex-col items-center overflow-hidden bg-black text-center" style={{ width, height, paddingLeft: width * 0.035, paddingRight: width * 0.035, ...safeInsets }}>
      {slide.label ? <p className="shrink-0 font-bold uppercase tracking-[0.12em]" style={{ marginBottom: height * 0.01, fontSize: labelFontSize }}>{slide.label}</p> : null}
      {slide.sections?.length ? (
        <div className="grid min-h-0 w-full flex-1 items-stretch" style={{ gridTemplateColumns: `repeat(${slide.sections.length},minmax(0,1fr))` }}>
          {slide.sections.map((section, index) => <section key={index} className="flex min-h-0 min-w-0 flex-col" style={{ padding: `${height * 0.005}px ${width * 0.02}px` }}><h2 className="shrink-0 font-extrabold uppercase tracking-[0.14em]" style={{ marginBottom: height * 0.0075, fontSize: sectionLabelFontSize }}>{section.label}</h2><ProjectionAutoFitText text={section.text} maximumFontSize={maximumFontSize} minimumFontSize={minimumFontSize} onFontSizeFit={readyToMeasure ? (fittedFontSize) => onFit(index, fittedFontSize / scale) : undefined} className="font-bold leading-[1.08] tracking-[0.003em]" /></section>)}
        </div>
      ) : <div className="min-h-0 w-full flex-1"><ProjectionAutoFitText text={slide.text} maximumFontSize={maximumFontSize} minimumFontSize={minimumFontSize} onFontSizeFit={readyToMeasure ? (fittedFontSize) => onFit(null, fittedFontSize / scale) : undefined} className="font-bold leading-[1.08] tracking-[0.003em]" /></div>}
      <p className="w-full shrink-0 truncate" style={{ marginTop: height * 0.0075, fontSize: footerFontSize }}>{footer}</p>
      {overlayVisible ? <aside ref={overlayRef} className="absolute left-1/2 max-w-[94%] whitespace-pre-line rounded-lg border font-bold leading-[1.22]" style={{ top: overlay.position === "top" ? height * 0.06 : overlay.position === "center" ? "50%" : "auto", bottom: overlay.position === "bottom" ? height * 0.07 : "auto", transform: overlay.position === "center" ? "translate(-50%,-50%)" : "translateX(-50%)", width: width * overlay.width / 100, padding: `${height * overlayPaddingYVh / 100}px ${width * overlayPaddingXVw / 100}px` }}>{overlay.title ? <strong className="block uppercase opacity-70" style={{ fontSize: Math.max(1, overlayFontSize * 0.5) }}>{overlay.title}</strong> : null}{overlay.text ? <ProjectionAutoFitText text={overlay.text} maximumFontSize={overlayFontSize} minimumFontSize={Math.max(1, 10 * scale)} fit="width" className="font-bold leading-[1.22]" /> : null}</aside> : null}
    </div>
  );
}

function serviceLabel(serviceNumber: number) {
  return serviceNumber === 1 ? "First service" : serviceNumber === 2 ? "Second service" : `Service ${serviceNumber}`;
}

function projectionSlidesMatch(left: SongProjectionSlide | null, right: SongProjectionSlide | null) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function projectionSlideContentLength(slide: SongProjectionSlide | null) {
  if (!slide) return 0;
  return slide.sections?.reduce((total, section) => total + section.text.length, 0) ?? slide.text.length;
}

function songFooterForSlide(song: ProjectionSong, index: number, slideCount: number) {
  return `${song.title}${song.artist ? ` · ${song.artist}` : ""} — ${slideCount ? `${index + 1}/${slideCount}` : "No lyrics"}`;
}

function ProjectionLiveMonitor({ state }: { state: ProjectionOutputState | null }) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);
  const [overlayHeight, setOverlayHeight] = useState(0);
  const showOverlay = Boolean(state?.overlay.visible && !state.blanked && (state.overlay.title || state.overlay.text));
  const safeInsets = state ? projectionOverlaySafeInsets(frameHeight, overlayHeight, state.overlay.position, showOverlay) : undefined;
  const overlayPosition = state?.overlay.position === "top" ? "top-3" : state?.overlay.position === "center" ? "top-1/2 -translate-y-1/2" : "bottom-3";
  const uniformMonitorFontSize = state?.uniformTextSize && state.uniformTextViewport
    ? projectionTextSizePx(state.fontSize) * frameWidth / state.uniformTextViewport.width
    : 0;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      setFrameWidth(frame.clientWidth);
      setFrameHeight(frame.clientHeight);
      setOverlayHeight(showOverlay ? overlayRef.current?.offsetHeight ?? 0 : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    if (showOverlay && overlayRef.current) observer.observe(overlayRef.current);
    return () => observer.disconnect();
  }, [showOverlay, state?.overlay.position, state?.overlay.fontSize, state?.overlay.title, state?.overlay.text]);

  return (
    <div ref={frameRef} className="relative isolate overflow-hidden rounded-lg border border-slate-700 bg-black shadow-inner" style={{ color: state?.textColor ?? "#fff", aspectRatio: state?.uniformTextViewport ? `${state.uniformTextViewport.width} / ${state.uniformTextViewport.height}` : "16 / 9" }}>
      {!state ? <div className="flex size-full items-center justify-center px-6 text-center text-xs font-semibold text-white/45">Nothing has been presented yet.</div> : state.blanked ? <div className="flex size-full items-center justify-center text-center"><div><EyeOff className="mx-auto size-7 text-white/35" /><p className="mt-2 text-xs font-bold text-white/50">Output blanked</p></div></div> : (
        <>
          <ProjectionBackgroundLayer background={state.background} media={state.media} effects={state.effects} contentLength={projectionSlideContentLength(state.slide)} className="-z-10" />
          <div className="flex h-full min-h-0 flex-col items-center px-[4%] text-center" style={safeInsets}>
            {state.slide?.label ? <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: state.mutedTextColor }}>{state.slide.label}</p> : null}
            {state.slide?.sections?.length ? <div className="grid min-h-0 w-full flex-1" style={{ gridTemplateColumns: `repeat(${state.slide.sections.length},minmax(0,1fr))` }}>{state.slide.sections.map((section, index) => <div key={`${section.label}-${index}`} className="flex min-h-0 min-w-0 flex-col px-1.5" style={{ borderLeft: index ? `1px solid ${state.mutedTextColor}` : undefined }}><strong className="mb-0.5 block text-[7px] uppercase tracking-widest" style={{ color: state.mutedTextColor }}>{section.label}</strong>{uniformMonitorFontSize ? <p className="flex min-h-0 flex-1 items-center justify-center whitespace-pre-line font-bold leading-[1.08] [text-wrap:balance]" style={{ fontSize: uniformMonitorFontSize, textShadow: state.textShadow }}>{section.text}</p> : <ProjectionAutoFitText text={section.text} maximumFontSize={Math.max(8, projectionPreviewTextSizePx(state.fontSize) * 0.82)} minimumFontSize={5} className="font-bold leading-[1.08]" style={{ textShadow: state.textShadow }} />}</div>)}</div> : <div className="min-h-0 w-full flex-1">{uniformMonitorFontSize ? <p className="flex size-full items-center justify-center whitespace-pre-line font-bold leading-[1.08] [text-wrap:balance]" style={{ fontSize: uniformMonitorFontSize, textShadow: state.textShadow }}>{state.slide?.text ?? ""}</p> : <ProjectionAutoFitText text={state.slide?.text ?? ""} maximumFontSize={projectionPreviewTextSizePx(state.fontSize)} minimumFontSize={5} className="font-bold leading-[1.08]" style={{ textShadow: state.textShadow }} />}</div>}
            <p className="mt-0.5 w-full shrink-0 truncate text-[7px]" style={{ color: state.mutedTextColor }}>{state.footer}</p>
          </div>
          {showOverlay ? <div ref={overlayRef} className={`absolute left-1/2 max-w-[calc(100%_-_16px)] -translate-x-1/2 overflow-hidden rounded-md border text-center ${overlayPosition}`} style={{ width: `${state.overlay.width}%`, padding: `${Math.max(4, state.overlay.fontSize * 0.08)}px ${Math.max(7, state.overlay.fontSize * 0.12)}px`, background: state.overlay.background, color: state.overlay.color, borderColor: state.overlay.borderColor, boxShadow: state.overlay.boxShadow, textShadow: state.overlay.textShadow }}><strong className="block [overflow-wrap:anywhere] uppercase tracking-widest opacity-70" style={{ fontSize: `${Math.max(5, Math.round(projectionOverlayPreviewTextSizePx(state.overlay.fontSize) * 0.45))}px` }}>{state.overlay.title}</strong>{state.overlay.text ? <ProjectionAutoFitText text={state.overlay.text} maximumFontSize={projectionOverlayPreviewTextSizePx(state.overlay.fontSize)} minimumFontSize={5} fit="width" className="font-bold" /> : null}</div> : null}
        </>
      )}
    </div>
  );
}

function desktopBridge() {
  return (window as Window & { reverenceDesktop?: DesktopBridge }).reverenceDesktop;
}

function overlayAppearance(tone: OverlayTone) {
  if (tone === "dark") return { background: "rgba(2,6,23,.94)", color: "#fff", border: "rgba(255,255,255,.22)", shadow: "0 18px 60px rgba(0,0,0,.36)", textShadow: "none", padding: "2.2vh 3.2vw" };
  if (tone === "light") return { background: "rgba(255,255,255,.97)", color: "#0f172a", border: "rgba(148,163,184,.5)", shadow: "0 18px 60px rgba(0,0,0,.28)", textShadow: "none", padding: "2.2vh 3.2vw" };
  if (tone === "minimal") return { background: "transparent", color: "#fff", border: "transparent", shadow: "none", textShadow: "0 3px 18px rgba(0,0,0,.9)", padding: "1vh 1vw" };
  return { background: "linear-gradient(135deg,rgba(37,99,235,.97),rgba(8,145,178,.97))", color: "#fff", border: "rgba(255,255,255,.22)", shadow: "0 18px 60px rgba(0,0,0,.36)", textShadow: "none", padding: "2.2vh 3.2vw" };
}

function ProjectionOverlayPreview({ title, text, tone, position, fontSize, className = "" }: {
  title: string;
  text: string;
  tone: OverlayTone;
  position: OverlayPosition;
  fontSize: number;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frameWidth, setFrameWidth] = useState(320);
  const appearance = overlayAppearance(tone);
  const scale = Math.max(0.25, frameWidth / 320);
  const messageFontSize = Math.max(4, projectionOverlayPreviewTextSizePx(fontSize) * scale);
  const titleFontSize = Math.max(3, messageFontSize * 0.45);
  const paddingY = Math.max(2, frameWidth * 0.012);
  const paddingX = Math.max(3, frameWidth * 0.018);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setFrameWidth(frame.clientWidth || 320);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className={`relative isolate aspect-video min-w-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 ${className}`}
      style={{
        backgroundImage: "linear-gradient(45deg,rgba(255,255,255,.035) 25%,transparent 25%),linear-gradient(-45deg,rgba(255,255,255,.035) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(255,255,255,.035) 75%),linear-gradient(-45deg,transparent 75%,rgba(255,255,255,.035) 75%)",
        backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
        backgroundSize: "16px 16px",
      }}
    >
      {title || text ? (
        <div
          className="absolute left-1/2 max-w-[94%] overflow-hidden rounded-md border text-center"
          style={{
            top: position === "top" ? "7%" : position === "center" ? "50%" : "auto",
            bottom: position === "bottom" ? "7%" : "auto",
            transform: position === "center" ? "translate(-50%, -50%)" : "translateX(-50%)",
            width: `${projectionOverlayWidthPercent(fontSize)}%`,
            padding: `${paddingY}px ${paddingX}px`,
            background: appearance.background,
            color: appearance.color,
            borderColor: appearance.border,
            boxShadow: appearance.shadow,
            textShadow: appearance.textShadow,
          }}
        >
          {title ? <strong className="block [overflow-wrap:anywhere] uppercase tracking-widest opacity-70" style={{ fontSize: `${titleFontSize}px` }}>{title}</strong> : null}
          {text ? <ProjectionAutoFitText text={text} maximumFontSize={messageFontSize} minimumFontSize={Math.max(3, messageFontSize * 0.45)} fit="width" className="font-bold leading-[1.15]" /> : null}
        </div>
      ) : (
        <div className="flex size-full items-center justify-center px-4 text-center text-[9px] font-semibold text-white/35">Select or create an overlay</div>
      )}
    </div>
  );
}

function BibleBookPicker({ value, version, onChange }: { value: string; version: string; onChange: (bookCode: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const matchingBooks = bibleBooks.filter((book) => !normalizedQuery || (book.code + " " + book.name + " " + book.nameRw).toLowerCase().includes(normalizedQuery));
  const groups = [
    { label: "Old Testament", books: matchingBooks.filter((book) => bibleBooks.indexOf(book) < 39) },
    { label: "New Testament", books: matchingBooks.filter((book) => bibleBooks.indexOf(book) >= 39) },
  ];

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function closePicker() {
    setOpen(false);
    setQuery("");
  }

  function chooseBook(bookCode: string) {
    onChange(bookCode);
    closePicker();
  }

  return (
    <div className="relative mt-1 normal-case">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-12 w-full items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 text-left text-sm font-bold text-slate-800 shadow-sm outline-none hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <BookOpen className="size-5 shrink-0 text-blue-600" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{bibleBookName(value, version)}</span>
        <ChevronDown className={open ? "size-4 shrink-0 rotate-180 text-blue-500 transition-transform" : "size-4 shrink-0 text-slate-400 transition-transform"} aria-hidden />
      </button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closePicker(); }}>
          <section className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl shadow-slate-950/40" role="dialog" aria-modal="true" aria-label="Choose a Bible book">
            <header className="flex items-center justify-between gap-4 border-b border-blue-100 bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 text-white">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20"><BookOpen className="size-6" /></span>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold">Choose a Bible book</h3>
                  <p className="mt-0.5 text-[10px] text-blue-100">Search or browse the Old and New Testaments</p>
                </div>
              </div>
              <button type="button" onClick={closePicker} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20" aria-label="Close Bible book picker"><X className="size-5" /></button>
            </header>

            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-blue-500" aria-hidden />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by Bible book name…"
                  aria-label="Search Bible books"
                  className="h-12 w-full rounded-xl border border-blue-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div role="listbox" aria-label="Bible books" className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {groups.map((group) => group.books.length ? (
                <section key={group.label} className="mb-5 last:mb-0">
                  <div className="mb-2 flex items-center gap-2">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{group.label}</h4>
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="text-[9px] font-bold text-slate-400">{group.books.length}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {group.books.map((book) => {
                      const selected = book.code === value;
                      return (
                        <button
                          key={book.code}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => chooseBook(book.code)}
                          className={selected
                            ? "flex min-h-12 min-w-0 items-center gap-2 rounded-xl border border-blue-600 bg-blue-600 px-3 py-2.5 text-left text-white shadow-md shadow-blue-600/20"
                            : "flex min-h-12 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold">{bibleBookName(book.code, version)}</span>
                            <span className={selected ? "mt-0.5 block text-[8px] font-semibold uppercase text-blue-100" : "mt-0.5 block text-[8px] font-semibold uppercase text-slate-400"}>{book.code}</span>
                          </span>
                          {selected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null)}
              {matchingBooks.length === 0 ? <div className="flex flex-col items-center justify-center px-4 py-12 text-center"><Search className="size-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">No Bible book found</p><p className="mt-1 text-xs text-slate-400">Try a different spelling for “{query.trim()}”.</p></div> : null}
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function BibleChapterPicker({ value, chapterCount, onChange }: { value: string; chapterCount: number; onChange: (chapter: string) => void }) {
  const [open, setOpen] = useState(false);
  const [rangeIndex, setRangeIndex] = useState(Math.floor((Math.max(1, Number(value)) - 1) / 25));
  const [jumpValue, setJumpValue] = useState(value);
  const jumpRef = useRef<HTMLInputElement | null>(null);
  const rangeCount = Math.ceil(chapterCount / 25);
  const rangeStart = rangeIndex * 25 + 1;
  const rangeEnd = Math.min(chapterCount, rangeStart + 24);
  const visibleChapters = Array.from({ length: Math.max(0, rangeEnd - rangeStart + 1) }, (_, index) => rangeStart + index);
  const parsedJump = Number(jumpValue);
  const jumpIsValid = Number.isInteger(parsedJump) && parsedJump >= 1 && parsedJump <= chapterCount;

  useEffect(() => {
    if (!open) return;
    jumpRef.current?.focus();
    jumpRef.current?.select();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function openPicker() {
    setRangeIndex(Math.floor((Math.max(1, Number(value)) - 1) / 25));
    setJumpValue(value);
    setOpen(true);
  }

  function chooseChapter(chapter: number) {
    onChange(String(chapter));
    setJumpValue(String(chapter));
    setOpen(false);
  }

  return (
    <div className="relative mt-1 normal-case">
      <button
        type="button"
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-12 w-full items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 text-left text-sm font-bold text-slate-800 shadow-sm outline-none hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <Hash className="size-5 shrink-0 text-blue-600" aria-hidden />
        <span className="flex-1">Chapter {value}</span>
        <ChevronDown className={open ? "size-4 shrink-0 rotate-180 text-blue-500 transition-transform" : "size-4 shrink-0 text-slate-400 transition-transform"} aria-hidden />
      </button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setOpen(false); }}>
          <section className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl shadow-slate-950/40" role="dialog" aria-modal="true" aria-label="Choose a Bible chapter">
            <header className="flex items-center justify-between gap-4 border-b border-blue-100 bg-gradient-to-r from-blue-600 to-indigo-500 px-5 py-4 text-white">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20"><Hash className="size-6" /></span>
                <div>
                  <h3 className="text-base font-extrabold">Choose a chapter</h3>
                  <p className="mt-0.5 text-[10px] text-blue-100">{chapterCount} chapters available · currently chapter {value}</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20" aria-label="Close Bible chapter picker"><X className="size-5" /></button>
            </header>

            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Jump directly to a chapter</p>
              <div className="flex gap-2">
                <input
                  ref={jumpRef}
                  type="number"
                  min={1}
                  max={chapterCount}
                  value={jumpValue}
                  onChange={(event) => setJumpValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && jumpIsValid) chooseChapter(parsedJump);
                  }}
                  aria-label={"Chapter number, 1 to " + chapterCount}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-blue-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button type="button" onClick={() => chooseChapter(parsedJump)} disabled={!jumpIsValid} className="h-12 rounded-xl bg-blue-600 px-6 text-xs font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40">Go to chapter</button>
              </div>
            </div>

            {rangeCount > 1 ? (
              <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-3">
                {Array.from({ length: rangeCount }, (_, index) => {
                  const start = index * 25 + 1;
                  const end = Math.min(chapterCount, start + 24);
                  return <button key={start} type="button" onClick={() => setRangeIndex(index)} className={rangeIndex === index ? "rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-extrabold text-white shadow-sm" : "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"}>{start}–{end}</button>;
                })}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-slate-500">Chapters {rangeStart}–{rangeEnd}</h4>
                <span className="text-[9px] font-semibold text-slate-400">Select one to continue</span>
              </div>
              <div role="listbox" aria-label="Bible chapters" className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                {visibleChapters.map((chapter) => {
                  const selected = String(chapter) === value;
                  return (
                    <button
                      key={chapter}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => chooseChapter(chapter)}
                      className={selected
                        ? "flex h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white shadow-md shadow-blue-600/20 ring-2 ring-blue-100"
                        : "flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"}
                    >
                      {chapter}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

export function SongProjectionStudio({ songs, playlists, initialOverlayPresets, operatorActive = true }: { songs: ProjectionSong[]; playlists: ProjectionPlaylist[]; initialOverlayPresets: ProjectionOverlayPreset[]; operatorActive?: boolean }) {
  const [songLyricsOverrides, setSongLyricsOverrides] = useState<Record<number, string>>({});
  const projectionSongs = useMemo(() => songs.map((song) => ({ ...song, lyrics: songLyricsOverrides[song.id] ?? song.lyrics })), [songLyricsOverrides, songs]);
  const activeSongs = useMemo(() => projectionSongs.filter((song) => !song.isArchived && song.lyrics?.trim()), [projectionSongs]);
  const [source, setSource] = useState<Source>("songs");
  const [playlistId, setPlaylistId] = useState("library");
  const [sessionId, setSessionId] = useState("");
  const [selectedSongId, setSelectedSongId] = useState<number | null>(activeSongs[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [recentSongIds, setRecentSongIds] = useState<number[]>(() => activeSongs.slice(0, 10).map((song) => song.id));
  const [slideIndex, setSlideIndex] = useState(0);
  const [liveSelection, setLiveSelection] = useState<LiveSelection | null>(null);
  const [queuedSongId, setQueuedSongId] = useState<number | null>(null);
  const [blanked, setBlanked] = useState(false);
  const [themeKey, setThemeKey] = useState<ProjectionThemeKey>("black");
  const [themeCategory, setThemeCategory] = useState<"all" | ProjectionThemeCategory>("all");
  const [fontSize, setFontSize] = useState(60);
  const [mediaType, setMediaType] = useState<ProjectionMediaType>("none");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaName, setMediaName] = useState("");
  const [mediaFit, setMediaFit] = useState<"cover" | "contain">("cover");
  const [mediaBrightness, setMediaBrightness] = useState(55);
  const [backgroundMotion, setBackgroundMotion] = useState<ProjectionBackgroundMotion>(DEFAULT_PROJECTION_BACKGROUND_EFFECTS.motion);
  const [motionSpeed, setMotionSpeed] = useState(DEFAULT_PROJECTION_BACKGROUND_EFFECTS.motionSpeed);
  const [backgroundBlur, setBackgroundBlur] = useState(DEFAULT_PROJECTION_BACKGROUND_EFFECTS.blur);
  const [backgroundVignette, setBackgroundVignette] = useState(DEFAULT_PROJECTION_BACKGROUND_EFFECTS.vignette);
  const [backgroundSaturation, setBackgroundSaturation] = useState(DEFAULT_PROJECTION_BACKGROUND_EFFECTS.saturation);
  const [backgroundDimming, setBackgroundDimming] = useState(DEFAULT_PROJECTION_BACKGROUND_EFFECTS.dimming);
  const [backgroundAutoDimming, setBackgroundAutoDimming] = useState(DEFAULT_PROJECTION_BACKGROUND_EFFECTS.autoDimming);
  const [backgroundTintColor, setBackgroundTintColor] = useState(DEFAULT_PROJECTION_BACKGROUND_EFFECTS.tintColor);
  const [backgroundTintStrength, setBackgroundTintStrength] = useState(DEFAULT_PROJECTION_BACKGROUND_EFFECTS.tintStrength);
  const [backgroundAmbience, setBackgroundAmbience] = useState<ProjectionBackgroundAmbience>(DEFAULT_PROJECTION_BACKGROUND_EFFECTS.ambience);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [transitionType, setTransitionType] = useState<ProjectionTransitionType>("fade");
  const [transitionDuration, setTransitionDuration] = useState(350);
  const [controlPanel, setControlPanel] = useState<ProjectionControlPanel>("songs");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerHeight, setDrawerHeight] = useState(420);
  const [showOrderOpen, setShowOrderOpen] = useState(false);
  const [livePanelWidth, setLivePanelWidth] = useState(330);
  const [workspaceSettingsReady, setWorkspaceSettingsReady] = useState(false);
  const [liveState, setLiveState] = useState<ProjectionOutputState | null>(() => typeof window === "undefined" ? null : readProjectionState(window.localStorage));
  const [clearedLiveState, setClearedLiveState] = useState<ProjectionOutputState | null>(null);
  const [deckOverrides, setDeckOverrides] = useState<Record<string, SongProjectionSlide[]>>({});
  const [slideOverrides, setSlideOverrides] = useState<Record<string, SongProjectionSlide>>({});
  const [slideTextSizeOverrides, setSlideTextSizeOverrides] = useState<Record<string, number>>({});
  const [deckEditorOpen, setDeckEditorOpen] = useState(false);
  const [songLyricsEditor, setSongLyricsEditor] = useState<SongLyricsEditorState | null>(null);

  const [bibleVersion, setBibleVersion] = useState(bibleVersions[0].key);
  const [compareVersion, setCompareVersion] = useState("");
  const [bibleBook, setBibleBook] = useState("JHN");
  const [bibleChapter, setBibleChapter] = useState("3");
  const [loadedBible, setLoadedBible] = useState<LoadedBibleChapter | null>(null);
  const [loadedComparison, setLoadedComparison] = useState<LoadedBibleChapter | null>(null);
  const [versesPerSlide, setVersesPerSlide] = useState(1);
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleError, setBibleError] = useState<string | null>(null);

  const [overlayTitle, setOverlayTitle] = useState("");
  const [overlayText, setOverlayText] = useState("");
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayTone, setOverlayTone] = useState<OverlayTone>("blue");
  const [overlayPosition, setOverlayPosition] = useState<OverlayPosition>("bottom");
  const [overlayFontSize, setOverlayFontSize] = useState(35);
  const [overlayPresets, setOverlayPresets] = useState(initialOverlayPresets);
  const [selectedOverlayPresetId, setSelectedOverlayPresetId] = useState("");
  const [overlayPresetName, setOverlayPresetName] = useState("");
  const [overlayPresetNotice, setOverlayPresetNotice] = useState<string | null>(null);
  const [overlayPresetPending, startOverlayPresetTransition] = useTransition();
  const [songLyricsPending, startSongLyricsTransition] = useTransition();

  const [screens, setScreens] = useState<ProjectionScreenLike[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState("");
  const [detectingScreens, setDetectingScreens] = useState(false);
  const [projectorConnected, setProjectorConnected] = useState(false);
  const [outputError, setOutputError] = useState<string | null>(null);
  const studioRef = useRef<HTMLElement | null>(null);
  const projectorWindowRef = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const latestStateRef = useRef<ProjectionOutputState | null>(null);
  const outputFitMeasurementsRef = useRef<Record<string, number>>({});
  const fitAllRequestRef = useRef<FitAllRequest | null>(null);
  const [fitAllRequest, setFitAllRequest] = useState<FitAllRequest | null>(null);
  const [projectorViewport, setProjectorViewport] = useState<ProjectionViewport | null>(null);
  const [uniformTextDecks, setUniformTextDecks] = useState<Record<string, ProjectionViewport | null>>({});
  const lastHeartbeatRef = useRef(0);
  const controlHandlerRef = useRef<(key: ProjectionControlKey) => void>(() => undefined);
  const localMediaUrlRef = useRef("");

  const selectedPlaylist = playlists.find((playlist) => String(playlist.id) === playlistId) ?? null;
  const selectedSession = selectedPlaylist?.sessions.find((session) => String(session.id) === sessionId) ?? selectedPlaylist?.sessions[0] ?? null;
  const sourceSongs = selectedSession
    ? selectedSession.songs.map((song) => ({ ...song, lyrics: songLyricsOverrides[song.id] ?? song.lyrics })).filter((song) => !song.isArchived && song.lyrics?.trim())
    : activeSongs;
  const queuedSong = activeSongs.find((song) => song.id === queuedSongId) ?? null;
  const selectedSong = activeSongs.find((song) => song.id === selectedSongId) ?? sourceSongs[0] ?? activeSongs[0] ?? null;
  const filteredSongs = activeSongs.filter((song) => `${song.title} ${song.artist ?? ""} ${song.lyrics ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 150);
  const recentSongs = [...recentSongIds.flatMap((id) => { const song = activeSongs.find((item) => item.id === id); return song ? [song] : []; }), ...activeSongs.filter((song) => !recentSongIds.includes(song.id))].slice(0, 10);
  const drawerSongs = search.trim() ? filteredSongs.slice(0, 10) : recentSongs;
  const songSlides = songProjectionSlides(selectedSong?.lyrics);
  const bibleTranslations = [loadedBible, loadedComparison].filter((chapter): chapter is LoadedBibleChapter => chapter !== null);
  const bibleVerseNumbers = loadedBible?.verses.map((verse) => verse.number) ?? [];
  const bibleSlides = multiVersionBibleProjectionSlides(bibleTranslations.map((chapter) => ({ reference: chapter.reference, versionCode: chapter.version.code, verses: chapter.verses })), bibleVerseNumbers, versesPerSlide);
  const generatedSlides = source === "bible" ? bibleSlides : songSlides;
  const slideDeckKey = source === "songs"
    ? `song:${selectedSong?.id ?? "none"}`
    : `bible:${loadedBible?.version.key ?? "none"}:${loadedBible?.reference ?? "none"}:${loadedComparison?.version.key ?? "none"}:${versesPerSlide}`;
  const baseSlides = deckOverrides[slideDeckKey] ?? generatedSlides;
  const slideOverrideKey = (index: number) => `${slideDeckKey}:${index}`;
  const slides = baseSlides.map((slide, index) => slideOverrides[slideOverrideKey(index)] ?? slide);
  const safeSlideIndex = Math.min(slideIndex, Math.max(0, slides.length - 1));
  const currentSlide = slides[safeSlideIndex] ?? null;
  const uniformTextViewport = uniformTextDecks[slideDeckKey] ?? null;
  const uniformTextSize = Boolean(uniformTextViewport);
  const fitAllMeasurementKeys = fitAllRequest?.deckKey === slideDeckKey ? slides.flatMap((slide, index) => slide.sections?.length
    ? slide.sections.map((_, sectionIndex) => `${slideOverrideKey(index)}:output:${fitAllRequest.width}x${fitAllRequest.height}:section:${sectionIndex}`)
    : [`${slideOverrideKey(index)}:output:${fitAllRequest.width}x${fitAllRequest.height}:text`]) : [];
  const textSizeForSlide = (index: number) => slideTextSizeOverrides[slideOverrideKey(index)] ?? fontSize;
  const currentSlideTextSize = textSizeForSlide(safeSlideIndex);
  const activeTheme = projectionThemes[themeKey];
  const backgroundEffects = {
    motion: backgroundMotion,
    motionSpeed,
    blur: backgroundBlur,
    vignette: backgroundVignette,
    saturation: backgroundSaturation,
    dimming: backgroundDimming,
    autoDimming: backgroundAutoDimming,
    tintColor: backgroundTintColor,
    tintStrength: backgroundTintStrength,
    ambience: backgroundAmbience,
  };
  const visibleThemes = (Object.entries(projectionThemes) as Array<[ProjectionThemeKey, ProjectionTheme]>).filter(([, theme]) => themeCategory === "all" || theme.category === themeCategory);
  const selectedScreen = screens.find((screen) => projectionScreenId(screen) === selectedScreenId) ?? null;
  const footerForSlide = (index: number) => source === "bible"
    ? loadedBible ? `${loadedBible.reference} · ${bibleTranslations.map((item) => item.version.code).join(" / ")} — ${slides.length ? `${index + 1}/${slides.length}` : "No verses"}` : "Bible presentation"
    : selectedSong ? songFooterForSlide(selectedSong, index, slides.length) : "Reverence Worship";
  const footer = footerForSlide(safeSlideIndex);
  const detectedLiveSongSelection = liveSelection ? null : (() => {
    if (!liveState?.slide) return null;
    for (const song of activeSongs) {
      const deckKey = `song:${song.id}`;
      const generatedDeck = songProjectionSlides(song.lyrics);
      const deck = (deckOverrides[deckKey] ?? generatedDeck).map((slide, index) => slideOverrides[`${deckKey}:${index}`] ?? slide);
      const matchingIndex = deck.findIndex((slide, index) => songFooterForSlide(song, index, deck.length) === liveState.footer && projectionSlidesMatch(slide, liveState.slide));
      if (matchingIndex >= 0) return { source: "songs", songId: song.id, slideIndex: matchingIndex } satisfies LiveSelection;
    }
    return null;
  })();
  const returnableLiveSelection = liveSelection ?? detectedLiveSongSelection;
  const overlayStyle = overlayAppearance(overlayTone);
  const overlayWidth = projectionOverlayWidthPercent(overlayFontSize);
  const overlayPadding = `${(0.8 + overlayFontSize * 0.014).toFixed(2)}vh ${(1.2 + overlayFontSize * 0.02).toFixed(2)}vw`;

  const outputState: ProjectionOutputState = {
    version: 3,
    updatedAt: 0,
    blanked,
    slide: currentSlide,
    emptyMessage: source === "bible" ? "" : "",
    footer,
    fontSize: currentSlideTextSize,
    uniformTextSize,
    uniformTextViewport: uniformTextViewport ?? undefined,
    background: activeTheme.background,
    textColor: activeTheme.text,
    mutedTextColor: activeTheme.muted,
    textShadow: activeTheme.shadow,
    media: {
      type: mediaUrl && mediaType !== "none" ? mediaType : "none",
      url: sanitizeProjectionMediaUrl(mediaUrl),
      fit: mediaFit,
      brightness: projectionMediaBrightnessPercent(mediaBrightness),
      name: mediaName,
    },
    transition: {
      type: transitionType,
      durationMs: transitionType === "cut" ? 0 : clampProjectionTransitionDuration(transitionDuration),
    },
    effects: backgroundEffects,
    overlay: {
      visible: overlayVisible,
      title: overlayTitle.trim(),
      text: overlayText.trim(),
      position: overlayPosition,
      alignment: "center",
      fontSize: overlayFontSize,
      width: overlayWidth,
      opacity: 96,
      background: overlayStyle.background,
      color: overlayStyle.color,
      borderColor: overlayStyle.border,
      boxShadow: overlayStyle.shadow,
      textShadow: overlayStyle.textShadow,
      padding: overlayPadding,
    },
  };
  const draftFingerprint = JSON.stringify({ ...outputState, updatedAt: 0 });
  const liveFingerprint = liveState ? JSON.stringify({ ...liveState, updatedAt: 0 }) : "";
  const hasPendingChanges = draftFingerprint !== liveFingerprint;
  const selectedOverlayIsLive = Boolean(
    liveState?.overlay.visible
      && JSON.stringify({ ...liveState.overlay, visible: true }) === JSON.stringify({ ...outputState.overlay, visible: true }),
  );
  const appearanceIsLive = Boolean(
    liveState
      && liveState.background === outputState.background
      && liveState.textColor === outputState.textColor
      && liveState.mutedTextColor === outputState.mutedTextColor
      && liveState.textShadow === outputState.textShadow
      && liveState.fontSize === fontSize
      && liveState.media.brightness === outputState.media.brightness
      && liveState.transition.type === outputState.transition.type
      && liveState.transition.durationMs === outputState.transition.durationMs
      && JSON.stringify(liveState.effects ?? DEFAULT_PROJECTION_BACKGROUND_EFFECTS) === JSON.stringify(outputState.effects),
  );
  const textSizeIsLive = Boolean(liveState
    && liveState.fontSize === fontSize
    && Boolean(liveState.uniformTextSize) === uniformTextSize
    && JSON.stringify(liveState.uniformTextViewport ?? null) === JSON.stringify(uniformTextViewport));

  useEffect(() => {
    const loadHistory = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(RECENT_PROJECTION_SONGS_KEY) ?? "[]") as unknown;
        if (!Array.isArray(stored)) return;
        const validIds = stored.filter((id): id is number => typeof id === "number" && activeSongs.some((song) => song.id === id)).slice(0, 10);
        if (validIds.length) setRecentSongIds(validIds);
      } catch {
        // Ignore invalid device-local history and keep the library fallback.
      }
    }, 0);
    return () => window.clearTimeout(loadHistory);
  }, [activeSongs]);

  useEffect(() => {
    const loadSettings = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(PROJECTION_WORKSPACE_SETTINGS_KEY) ?? "null") as unknown;
        if (stored && typeof stored === "object" && !Array.isArray(stored)) {
          const settings = stored as Record<string, unknown>;
          if (typeof settings.controlPanel === "string" && projectionControlPanels.includes(settings.controlPanel as ProjectionControlPanel)) setControlPanel(settings.controlPanel as ProjectionControlPanel);
          if (typeof settings.drawerOpen === "boolean") setDrawerOpen(settings.drawerOpen);
          if (typeof settings.drawerHeight === "number" && Number.isFinite(settings.drawerHeight)) {
            const maximumDrawerHeight = Math.max(420, (studioRef.current?.clientHeight ?? 900) - 420);
            setDrawerHeight(Math.max(300, Math.min(maximumDrawerHeight, settings.drawerHeight)));
          }
          if (typeof settings.livePanelWidth === "number" && Number.isFinite(settings.livePanelWidth)) {
            const maximumLivePanelWidth = Math.max(360, Math.min(520, (studioRef.current?.clientWidth ?? 1200) * 0.48));
            setLivePanelWidth(Math.max(280, Math.min(maximumLivePanelWidth, settings.livePanelWidth)));
          }
          if (typeof settings.themeKey === "string" && settings.themeKey in projectionThemes) setThemeKey(settings.themeKey as ProjectionThemeKey);
          if (typeof settings.fontSize === "number" && Number.isFinite(settings.fontSize)) setFontSize(Math.max(PROJECTION_TEXT_SIZE_MIN_PERCENT, Math.min(PROJECTION_TEXT_SIZE_MAX_PERCENT, settings.fontSize)));
          if (typeof settings.mediaBrightness === "number" && Number.isFinite(settings.mediaBrightness)) setMediaBrightness(Math.max(0, Math.min(100, settings.mediaBrightness)));
          if (settings.backgroundMotion === "none" || settings.backgroundMotion === "drift" || settings.backgroundMotion === "zoom") setBackgroundMotion(settings.backgroundMotion);
          if (typeof settings.motionSpeed === "number" && Number.isFinite(settings.motionSpeed)) setMotionSpeed(Math.max(0, Math.min(100, settings.motionSpeed)));
          if (typeof settings.backgroundBlur === "number" && Number.isFinite(settings.backgroundBlur)) setBackgroundBlur(Math.max(0, Math.min(20, settings.backgroundBlur)));
          if (typeof settings.backgroundVignette === "number" && Number.isFinite(settings.backgroundVignette)) setBackgroundVignette(Math.max(0, Math.min(100, settings.backgroundVignette)));
          if (typeof settings.backgroundSaturation === "number" && Number.isFinite(settings.backgroundSaturation)) setBackgroundSaturation(Math.max(0, Math.min(180, settings.backgroundSaturation)));
          if (typeof settings.backgroundDimming === "number" && Number.isFinite(settings.backgroundDimming)) setBackgroundDimming(Math.max(0, Math.min(80, settings.backgroundDimming)));
          if (typeof settings.backgroundAutoDimming === "boolean") setBackgroundAutoDimming(settings.backgroundAutoDimming);
          if (typeof settings.backgroundTintColor === "string" && /^#[0-9a-f]{6}$/i.test(settings.backgroundTintColor)) setBackgroundTintColor(settings.backgroundTintColor);
          if (typeof settings.backgroundTintStrength === "number" && Number.isFinite(settings.backgroundTintStrength)) setBackgroundTintStrength(Math.max(0, Math.min(70, settings.backgroundTintStrength)));
          if (settings.backgroundAmbience === "none" || settings.backgroundAmbience === "particles" || settings.backgroundAmbience === "rays") setBackgroundAmbience(settings.backgroundAmbience);
          if (settings.transitionType === "cut" || settings.transitionType === "fade" || settings.transitionType === "dissolve") setTransitionType(settings.transitionType);
          if (typeof settings.transitionDuration === "number" && Number.isFinite(settings.transitionDuration)) setTransitionDuration(clampProjectionTransitionDuration(settings.transitionDuration));
        }
      } catch {
        window.localStorage.removeItem(PROJECTION_WORKSPACE_SETTINGS_KEY);
      } finally {
        setWorkspaceSettingsReady(true);
      }
    }, 0);
    return () => window.clearTimeout(loadSettings);
  }, []);

  useEffect(() => {
    if (!workspaceSettingsReady) return;
    try {
      window.localStorage.setItem(PROJECTION_WORKSPACE_SETTINGS_KEY, JSON.stringify({
        controlPanel,
        drawerOpen,
        drawerHeight,
        livePanelWidth,
        themeKey,
        fontSize,
        mediaBrightness,
        backgroundMotion,
        motionSpeed,
        backgroundBlur,
        backgroundVignette,
        backgroundSaturation,
        backgroundDimming,
        backgroundAutoDimming,
        backgroundTintColor,
        backgroundTintStrength,
        backgroundAmbience,
        transitionType,
        transitionDuration,
      }));
    } catch {
      return;
    }
  }, [backgroundAmbience, backgroundAutoDimming, backgroundBlur, backgroundDimming, backgroundMotion, backgroundSaturation, backgroundTintColor, backgroundTintStrength, backgroundVignette, controlPanel, drawerHeight, drawerOpen, fontSize, livePanelWidth, mediaBrightness, motionSpeed, themeKey, transitionDuration, transitionType, workspaceSettingsReady]);

  const commitOutputState = useCallback((draft: ProjectionOutputState) => {
    const state = { ...draft, updatedAt: Math.max(Date.now(), (latestStateRef.current?.updatedAt ?? 0) + 1) };
    latestStateRef.current = state;
    setLiveState(state);
    writeProjectionState(window.localStorage, state);
    channelRef.current?.postMessage({ type: "state", state } satisfies ProjectionChannelMessage);
    return state;
  }, []);

  function publishOutputState() {
    const state = latestStateRef.current;
    if (!state) return;
    writeProjectionState(window.localStorage, state);
    channelRef.current?.postMessage({ type: "state", state } satisfies ProjectionChannelMessage);
  }

  function takePreview() {
    if (currentSlide) setLiveSelection({ source, songId: source === "songs" ? selectedSong?.id ?? null : null, slideIndex: safeSlideIndex });
    setClearedLiveState(null);
    commitOutputState(outputState);
  }

  function applyAppearanceLive() {
    const base = latestStateRef.current ?? liveState;
    if (!base) return;
    commitOutputState({
      ...base,
      fontSize,
      uniformTextSize,
      uniformTextViewport: uniformTextViewport ?? undefined,
      background: outputState.background,
      textColor: outputState.textColor,
      mutedTextColor: outputState.mutedTextColor,
      textShadow: outputState.textShadow,
      media: { ...base.media, brightness: outputState.media.brightness },
      transition: outputState.transition,
      effects: outputState.effects,
    });
  }

  function applyTextSizeLive() {
    const base = latestStateRef.current ?? liveState;
    if (!base) return;
    commitOutputState({ ...base, fontSize, uniformTextSize, uniformTextViewport: uniformTextViewport ?? undefined });
  }

  function recordOutputFitMeasurement(key: string, fittedFontSize: number) {
    outputFitMeasurementsRef.current[key] = fittedFontSize;
    const request = fitAllRequestRef.current;
    if (!request || request.deckKey !== slideDeckKey) return;
    if (!fitAllMeasurementKeys.every((measurementKey) => outputFitMeasurementsRef.current[measurementKey] !== undefined)) return;
    const smallestFittedFontSize = Math.min(...fitAllMeasurementKeys.map((measurementKey) => outputFitMeasurementsRef.current[measurementKey]));
    fitAllRequestRef.current = null;
    setFitAllRequest(null);
    setFontSize(projectionPercentForOutputFontSize(Math.max(projectionTextSizePx(PROJECTION_TEXT_SIZE_MIN_PERCENT), smallestFittedFontSize - 2)));
    setUniformTextDecks((current) => ({ ...current, [slideDeckKey]: { width: request.width, height: request.height } }));
  }

  function fitAllSlidesToDensest() {
    if (!slides.length || fitAllRequest?.deckKey === slideDeckKey) return;
    const viewport = projectorViewport ?? { width: 1920, height: 1080 };
    const width = Math.max(320, Math.round(viewport.width));
    const height = Math.max(180, Math.round(viewport.height));
    const request: FitAllRequest = {
      deckKey: slideDeckKey,
      width,
      height,
      scale: Math.min(1, 640 / width, 360 / height),
    };
    outputFitMeasurementsRef.current = {};
    fitAllRequestRef.current = request;
    setFitAllRequest(request);
    setSlideTextSizeOverrides((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${slideDeckKey}:`))));
    setSlideOverrides((current) => {
      const next = { ...current };
      baseSlides.forEach((slide, index) => {
        const key = slideOverrideKey(index);
        if (projectionSlidesMatch(next[key] ?? null, slide)) delete next[key];
      });
      return next;
    });
  }

  function chooseTheme(key: ProjectionThemeKey) {
    setThemeKey(key);
    const preset = (projectionThemes[key] as ProjectionTheme).effects;
    if (!preset) return;
    const effects = normalizeProjectionBackgroundEffects(preset);
    setBackgroundMotion(effects.motion);
    setMotionSpeed(effects.motionSpeed);
    setBackgroundBlur(effects.blur);
    setBackgroundVignette(effects.vignette);
    setBackgroundSaturation(effects.saturation);
    setBackgroundDimming(effects.dimming);
    setBackgroundAutoDimming(effects.autoDimming);
    setBackgroundTintColor(effects.tintColor);
    setBackgroundTintStrength(effects.tintStrength);
    setBackgroundAmbience(effects.ambience);
    if (transitionType === "cut") setTransitionType("fade");
    if (transitionDuration < 500) setTransitionDuration(650);
  }

  function resetBackgroundEffects() {
    const effects = DEFAULT_PROJECTION_BACKGROUND_EFFECTS;
    setBackgroundMotion(effects.motion);
    setMotionSpeed(effects.motionSpeed);
    setBackgroundBlur(effects.blur);
    setBackgroundVignette(effects.vignette);
    setBackgroundSaturation(effects.saturation);
    setBackgroundDimming(effects.dimming);
    setBackgroundAutoDimming(effects.autoDimming);
    setBackgroundTintColor(effects.tintColor);
    setBackgroundTintStrength(effects.tintStrength);
    setBackgroundAmbience(effects.ambience);
  }

  function presentSlide(slide: SongProjectionSlide, slideFooter: string, slideFontSize: number) {
    const navigationDraft: ProjectionOutputState = {
      ...outputState,
      blanked: false,
      slide,
      footer: slideFooter,
    };
    commitOutputState({
      ...projectionNavigationState(latestStateRef.current, navigationDraft),
      fontSize: slideFontSize,
      uniformTextSize,
      uniformTextViewport: uniformTextViewport ?? undefined,
    });
  }

  function selectPreviewSlide(index: number) {
    if (!slides.length) return;
    const nextIndex = Math.min(Math.max(0, index), slides.length - 1);
    setBlanked(false);
    setSlideIndex(nextIndex);
  }

  function presentSlideAtIndex(index: number) {
    if (!slides.length) return;
    const nextIndex = Math.min(Math.max(0, index), slides.length - 1);
    setBlanked(false);
    setSlideIndex(nextIndex);
    setLiveSelection({ source, songId: source === "songs" ? selectedSong?.id ?? null : null, slideIndex: nextIndex });
    setClearedLiveState(null);
    presentSlide(slides[nextIndex], footerForSlide(nextIndex), textSizeForSlide(nextIndex));
  }

  function slideIsLive(index: number) {
    return Boolean(liveState?.slide && footerForSlide(index) === liveState.footer && projectionSlidesMatch(slides[index] ?? null, liveState.slide));
  }

  function toggleLiveBlank() {
    const base = latestStateRef.current ?? outputState;
    const blankedNext = !base.blanked;
    setBlanked(blankedNext);
    commitOutputState({ ...base, blanked: blankedNext });
  }

  function toggleLiveOverlay() {
    const base = latestStateRef.current ?? outputState;
    const visible = !selectedOverlayIsLive && Boolean(overlayTitle.trim() || overlayText.trim());
    setOverlayVisible(visible);
    commitOutputState({ ...base, overlay: visible ? { ...outputState.overlay, visible: true } : { ...base.overlay, visible: false } });
  }

  function toggleLiveBackgroundLayer() {
    const base = latestStateRef.current ?? outputState;
    const active = base.media.type !== "none" && Boolean(base.media.url);
    commitOutputState({ ...base, media: active ? { ...base.media, type: "none", url: "" } : outputState.media });
  }

  function toggleLiveSlideLayer() {
    const base = latestStateRef.current ?? outputState;
    if (base.slide) {
      commitOutputState({ ...base, slide: null, footer: "" });
      return;
    }
    if (currentSlide) presentSlideAtIndex(safeSlideIndex);
  }

  function clearAllLiveLayers() {
    const base = latestStateRef.current ?? outputState;
    setClearedLiveState(base);
    commitOutputState({
      ...base,
      blanked: false,
      slide: null,
      footer: "",
      media: { ...base.media, type: "none", url: "" },
      overlay: { ...base.overlay, visible: false },
    });
  }

  function restoreLiveLayers() {
    if (!clearedLiveState) return;
    commitOutputState({ ...clearedLiveState, blanked: false });
    setClearedLiveState(null);
  }

  function chooseDrawerPanel(panel: ProjectionControlPanel) {
    if (panel === controlPanel) {
      setDrawerOpen((current) => !current);
      return;
    }
    setControlPanel(panel);
    setDrawerOpen(true);
  }

  function beginDrawerResize(event: { clientY: number; preventDefault: () => void }) {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = drawerHeight;
    const studioHeight = studioRef.current?.clientHeight ?? window.innerHeight;
    const maximumHeight = Math.max(420, studioHeight - 420);
    const resize = (moveEvent: PointerEvent) => setDrawerHeight(Math.max(300, Math.min(maximumHeight, startHeight + startY - moveEvent.clientY)));
    const finish = () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", finish);
    };
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", finish);
  }

  function beginLivePanelResize(event: { clientX: number; preventDefault: () => void }) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = livePanelWidth;
    const maximumWidth = Math.max(360, Math.min(520, (studioRef.current?.clientWidth ?? 1200) * 0.48));
    const resize = (moveEvent: PointerEvent) => setLivePanelWidth(Math.max(280, Math.min(maximumWidth, startWidth + startX - moveEvent.clientX)));
    const finish = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", finish);
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", finish);
  }

  function selectLocalBackground(file: File | undefined) {
    if (!file) return;
    const type: ProjectionMediaType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "none";
    if (type === "none") { setMediaNotice("Choose an image or video file."); return; }
    const maximumBytes = type === "image" ? 25 * 1024 * 1024 : 500 * 1024 * 1024;
    if (file.size > maximumBytes) { setMediaNotice(type === "image" ? "Keep images below 25 MB." : "Keep videos below 500 MB for reliable playback."); return; }
    if (localMediaUrlRef.current) URL.revokeObjectURL(localMediaUrlRef.current);
    const url = URL.createObjectURL(file);
    localMediaUrlRef.current = url;
    setMediaType(type);
    setMediaUrl(url);
    setMediaName(file.name);
    setMediaNotice(`${file.name} stays on this device and is not uploaded.`);
  }

  function clearBackgroundMedia() {
    if (localMediaUrlRef.current) URL.revokeObjectURL(localMediaUrlRef.current);
    localMediaUrlRef.current = "";
    setMediaType("none");
    setMediaUrl("");
    setMediaName("");
    setMediaNotice("");
  }

  function openDeckEditor(index = safeSlideIndex) {
    if (source !== "songs" || !slides.length) return;
    setSlideIndex(index);
    setBlanked(false);
    setDeckEditorOpen(true);
  }

  function saveSongLyrics() {
    if (!songLyricsEditor || songLyricsPending) return;
    const editor = songLyricsEditor;
    startSongLyricsTransition(async () => {
      try {
        const result = await updateProjectionSongLyrics(editor.songId, editor.lyrics);
        if (!result.ok) {
          setSongLyricsEditor((current) => current?.songId === editor.songId ? { ...current, notice: result.message } : current);
          return;
        }
        setSongLyricsOverrides((current) => ({ ...current, [editor.songId]: result.lyrics }));
        setDeckOverrides((current) => {
          const next = { ...current };
          delete next[`song:${editor.songId}`];
          return next;
        });
        setSlideOverrides((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`song:${editor.songId}:`))));
        setSlideTextSizeOverrides((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`song:${editor.songId}:`))));
        setUniformTextDecks((current) => ({ ...current, [`song:${editor.songId}`]: null }));
        setSlideIndex(0);
        setBlanked(false);
        setSongLyricsEditor(null);
      } catch {
        setSongLyricsEditor((current) => current?.songId === editor.songId ? { ...current, notice: "Unable to save the lyrics right now. Check your permission or connection and try again." } : current);
      }
    });
  }

  function applyDeckEdits(items: ProjectionSlideEditorItem[], nextActiveIndex: number) {
    const editedSlides = items.map((item) => item.slide);
    setDeckOverrides((current) => {
      const next = { ...current };
      if (JSON.stringify(editedSlides) === JSON.stringify(generatedSlides)) delete next[slideDeckKey];
      else next[slideDeckKey] = editedSlides;
      return next;
    });
    setSlideOverrides((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${slideDeckKey}:`))));
    setSlideTextSizeOverrides((current) => {
      const next = Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${slideDeckKey}:`)));
      items.forEach((item, index) => {
        if (item.fontSize !== null) next[`${slideDeckKey}:${index}`] = item.fontSize;
      });
      return next;
    });
    setUniformTextDecks((current) => ({ ...current, [slideDeckKey]: null }));
    setSlideIndex(Math.min(nextActiveIndex, Math.max(0, items.length - 1)));
    setBlanked(false);
    setDeckEditorOpen(false);
  }

  async function saveEditedDeckToSong(items: ProjectionSlideEditorItem[]) {
    if (source !== "songs" || !selectedSong) return { ok: false, message: "Only song slides can be saved permanently." };
    const lyrics = items.map((item) => {
      const text = item.slide.sections?.length ? item.slide.sections.map((section) => section.text.trim()).join("\n") : item.slide.text.trim();
      return item.slide.label?.trim() ? `[${item.slide.label.trim()}]\n${text}` : text;
    }).filter(Boolean).join("\n\n");
    if (!lyrics || lyrics.length > MAX_EDITABLE_SONG_LYRICS_LENGTH) return { ok: false, message: "The edited lyrics are empty or too long to save." };
    try {
      const result = await updateProjectionSongLyrics(selectedSong.id, lyrics);
      if (!result.ok) return result;
      setSongLyricsOverrides((current) => ({ ...current, [selectedSong.id]: result.lyrics }));
      setDeckOverrides((current) => {
        const next = { ...current };
        delete next[slideDeckKey];
        return next;
      });
      setSlideOverrides((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${slideDeckKey}:`))));
      setSlideTextSizeOverrides((current) => {
        const next = Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${slideDeckKey}:`)));
        items.forEach((item, index) => {
          if (item.fontSize !== null) next[`${slideDeckKey}:${index}`] = item.fontSize;
        });
        return next;
      });
      setUniformTextDecks((current) => ({ ...current, [slideDeckKey]: null }));
      setSlideIndex(0);
      setBlanked(false);
      setDeckEditorOpen(false);
      return { ok: true };
    } catch {
      return { ok: false, message: "Unable to save the song right now. Check your permission or connection and try again." };
    }
  }

  function resetDeckEdits() {
    setDeckOverrides((current) => {
      const next = { ...current };
      delete next[slideDeckKey];
      return next;
    });
    setSlideOverrides((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${slideDeckKey}:`))));
    setSlideTextSizeOverrides((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${slideDeckKey}:`))));
    setUniformTextDecks((current) => ({ ...current, [slideDeckKey]: null }));
    setSlideIndex(0);
    setDeckEditorOpen(false);
  }

  function chooseSong(songId: number) {
    setRecentSongIds((current) => {
      const next = [songId, ...current.filter((id) => id !== songId)].slice(0, 10);
      window.localStorage.setItem(RECENT_PROJECTION_SONGS_KEY, JSON.stringify(next));
      return next;
    });
    setSource("songs");
    setSelectedSongId(songId);
    setSlideIndex(0);
    setBlanked(false);
    if (queuedSongId === songId) setQueuedSongId(null);
  }

  function openQueuedSong() {
    if (!queuedSong) return;
    const songId = queuedSong.id;
    setQueuedSongId(null);
    chooseSong(songId);
  }

  function returnToLivePreview() {
    if (!liveState || !returnableLiveSelection) return;
    if (returnableLiveSelection.source === "songs" && returnableLiveSelection.songId !== null) {
      if (!activeSongs.some((song) => song.id === returnableLiveSelection.songId)) return;
      setSource("songs");
      setPlaylistId("library");
      setSessionId("");
      setSelectedSongId(returnableLiveSelection.songId);
      setSearch("");
    } else {
      setSource("bible");
    }
    setSlideIndex(returnableLiveSelection.slideIndex);
    setBlanked(liveState.blanked);
  }

  function choosePlaylist(value: string) {
    setPlaylistId(value);
    setSlideIndex(0);
    setBlanked(false);
    const playlist = playlists.find((item) => String(item.id) === value);
    setShowOrderOpen(Boolean(playlist));
    const session = playlist?.sessions[0];
    setSessionId(session ? String(session.id) : "");
    setSelectedSongId((session?.songs ?? activeSongs).find((song) => !song.isArchived && song.lyrics?.trim())?.id ?? null);
  }

  function chooseSession(value: string) {
    setSessionId(value);
    setSlideIndex(0);
    const session = selectedPlaylist?.sessions.find((item) => String(item.id) === value);
    setSelectedSongId(session?.songs.find((song) => !song.isArchived && song.lyrics?.trim())?.id ?? null);
  }

  function runControl(key: ProjectionControlKey) {
    if (["ArrowRight", "PageDown", " "].includes(key)) {
      selectPreviewSlide(safeSlideIndex + 1);
    } else if (["ArrowLeft", "PageUp"].includes(key)) {
      selectPreviewSlide(safeSlideIndex - 1);
    } else if (key === "Home") {
      selectPreviewSlide(0);
    } else if (key === "End") {
      selectPreviewSlide(slides.length - 1);
    } else if (key === "Enter") {
      presentSlideAtIndex(safeSlideIndex);
    } else if (key === "b") toggleLiveBlank();
    else if (key === "o") toggleLiveOverlay();
  }
  async function loadBibleChapter() {
    setSource("bible");
    setBibleLoading(true);
    setBibleError(null);
    try {
      const params = new URLSearchParams({ version: bibleVersion, book: bibleBook, chapter: bibleChapter });
      if (compareVersion && compareVersion !== bibleVersion) params.set("compare", compareVersion);
      const response = await fetch(`/api/bible/chapter?${params.toString()}`);
      const data = await response.json() as { ok: boolean; message?: string; primary?: LoadedBibleChapter; compare?: LoadedBibleChapter | null };
      if (!response.ok || !data.ok || !data.primary) throw new Error(data.message ?? "Unable to load this Bible chapter.");
      setLoadedBible(data.primary);
      setLoadedComparison(data.compare ?? null);
      setSlideIndex(0);
      setBlanked(false);
    } catch (error) {
      setBibleError(error instanceof Error ? error.message : "Unable to load this Bible chapter.");
    } finally {
      setBibleLoading(false);
    }
  }

  function selectOverlayPreset(preset: ProjectionOverlayPreset) {
    setSelectedOverlayPresetId(preset.id);
    setOverlayPresetName(preset.name);
    setOverlayPresetNotice(null);
    setOverlayTitle(preset.title);
    setOverlayText(preset.text);
    setOverlayTone(preset.tone);
    setOverlayPosition(preset.position);
    setOverlayFontSize(preset.fontSize);
    setOverlayVisible(true);
  }

  function startNewOverlay() {
    setSelectedOverlayPresetId("");
    setOverlayPresetName("");
    setOverlayPresetNotice(null);
    setOverlayTitle("");
    setOverlayText("");
    setOverlayTone("blue");
    setOverlayPosition("bottom");
    setOverlayFontSize(35);
    setOverlayVisible(false);
  }

  function saveCurrentOverlayPreset() {
    setOverlayPresetNotice(null);
    startOverlayPresetTransition(async () => {
      const result = await saveProjectionOverlayPreset({
        id: selectedOverlayPresetId || undefined,
        name: overlayPresetName,
        title: overlayTitle,
        text: overlayText,
        tone: overlayTone,
        position: overlayPosition,
        fontSize: overlayFontSize,
      });
      setOverlayPresetNotice(result.message);
      if (result.ok) {
        setOverlayPresets(result.presets);
        setSelectedOverlayPresetId(result.preset.id);
        setOverlayPresetName(result.preset.name);
      }
    });
  }

  function deleteSelectedOverlayPreset() {
    const preset = overlayPresets.find((item) => item.id === selectedOverlayPresetId);
    if (!preset || !window.confirm(`Delete the saved overlay “${preset.name}”?`)) return;
    setOverlayPresetNotice(null);
    startOverlayPresetTransition(async () => {
      const result = await deleteProjectionOverlayPreset(preset.id);
      setOverlayPresetNotice(result.message);
      if (result.ok) {
        setOverlayPresets(result.presets);
        setSelectedOverlayPresetId("");
        setOverlayPresetName("");
      }
    });
  }

  async function detectDisplays() {
    setDetectingScreens(true);
    setOutputError(null);
    try {
      const bridge = desktopBridge();
      if (bridge) {
        const detected = await bridge.listDisplays();
        setScreens(detected);
        const target = chooseProjectionScreen(detected, detected.find((screen) => screen.isPrimary) ?? null, selectedScreenId);
        if (target) setSelectedScreenId(projectionScreenId(target));
        return target;
      }

      const browser = window as BrowserWithScreens;
      if (typeof browser.getScreenDetails !== "function") {
        return null;
      }

      const details = await browser.getScreenDetails();
      const detected = Array.from(details.screens);
      setScreens(detected);
      const target = chooseProjectionScreen(detected, details.currentScreen, selectedScreenId);
      if (target) setSelectedScreenId(projectionScreenId(target));
      return target;
    } catch {
      setOutputError("Display permission was not granted. Allow window management for this site and try again.");
      return null;
    } finally {
      setDetectingScreens(false);
    }
  }

  async function openProjector() {
    if (latestStateRef.current) publishOutputState();
    else takePreview();
    setOutputError(null);
    let target = selectedScreen;
    if (!target) target = await detectDisplays();
    const url = new URL("/projection/output", window.location.origin).toString();
    const bridge = desktopBridge();
    if (bridge) {
      const result = await bridge.openProjector({ url, displayId: target ? projectionScreenId(target) : undefined });
      if (!result.ok) setOutputError(result.message ?? "The desktop projector could not be opened.");
      return;
    }

    const features = target
      ? `popup=yes,left=${target.availLeft},top=${target.availTop},width=${target.availWidth},height=${target.availHeight}`
      : "popup=yes,width=1280,height=720";
    const projector = window.open(url, "reverence-worship-projector", features);
    if (!projector) {
      setOutputError("The projector output was blocked. Allow pop-ups for this site and try again.");
      return;
    }
    projectorWindowRef.current = projector;
    projector.focus();
  }

  async function closeProjector() {
    channelRef.current?.postMessage({ type: "command", command: "close" } satisfies ProjectionChannelMessage);
    projectorWindowRef.current?.close();
    projectorWindowRef.current = null;
    if (desktopBridge()) await desktopBridge()?.closeProjector();
    setProjectorConnected(false);
    setProjectorViewport(null);
  }

  function requestProjectorFullscreen() {
    channelRef.current?.postMessage({ type: "command", command: "fullscreen" } satisfies ProjectionChannelMessage);
    projectorWindowRef.current?.focus();
  }

  useEffect(() => {
    const channel = new BroadcastChannel(PROJECTION_CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<ProjectionChannelMessage>) => {
      const message = event.data;
      if (message.type === "request-state" || message.type === "ready") {
        lastHeartbeatRef.current = Date.now();
        setProjectorConnected(true);
        const state = latestStateRef.current;
        if (state) channel.postMessage({ type: "state", state } satisfies ProjectionChannelMessage);
      } else if (message.type === "heartbeat") {
        lastHeartbeatRef.current = Date.now();
        setProjectorConnected(true);
        if (message.viewport) {
          setProjectorViewport({
            width: Math.max(1, Math.round(message.viewport.width)),
            height: Math.max(1, Math.round(message.viewport.height)),
          });
        }
      } else if (message.type === "closed") {
        setProjectorConnected(false);
        setProjectorViewport(null);
      } else if (message.type === "control") {
        controlHandlerRef.current(message.key);
      }
    };

    const connectionCheck = window.setInterval(() => {
      if (lastHeartbeatRef.current && Date.now() - lastHeartbeatRef.current > 3500) {
        setProjectorConnected(false);
        setProjectorViewport(null);
      }
    }, 1500);
    return () => {
      window.clearInterval(connectionCheck);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (liveState && !latestStateRef.current) latestStateRef.current = liveState;
    controlHandlerRef.current = runControl;
  });

  useEffect(() => {
    if (!operatorActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)) return;
      const normalized = event.key.toLowerCase();
      const key = normalized === "b" || normalized === "o" ? normalized : event.key;
      if (!["ArrowRight", "ArrowLeft", "PageDown", "PageUp", "Home", "End", "Enter", " ", "b", "o"].includes(key)) return;
      event.preventDefault();
      controlHandlerRef.current(key as ProjectionControlKey);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [operatorActive]);

  useEffect(() => {
    if (!deckEditorOpen && !songLyricsEditor) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDeckEditorOpen(false);
      if (!songLyricsPending) setSongLyricsEditor(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deckEditorOpen, songLyricsEditor, songLyricsPending]);

  const deckEditorItems: ProjectionSlideEditorItem[] = slides.map((slide, index) => ({ id: `${slideDeckKey}:editor:${index}`, slide, fontSize: slideTextSizeOverrides[slideOverrideKey(index)] ?? null }));
  const deckHasEdits = Boolean(deckOverrides[slideDeckKey] || slides.some((_, index) => slideOverrides[slideOverrideKey(index)] || slideTextSizeOverrides[slideOverrideKey(index)] !== undefined));
  const songLyricsEditorSlides = songProjectionSlides(songLyricsEditor?.lyrics);
  const songLyricsEditorValid = Boolean(songLyricsEditor?.lyrics.trim() && songLyricsEditor.lyrics.length <= MAX_EDITABLE_SONG_LYRICS_LENGTH);
  const songLyricsEditorHasTemporaryEdits = Boolean(songLyricsEditor && (
    Object.keys(slideOverrides).some((key) => key.startsWith(`song:${songLyricsEditor.songId}:`))
    || Object.keys(slideTextSizeOverrides).some((key) => key.startsWith(`song:${songLyricsEditor.songId}:`))
    || Boolean(deckOverrides[`song:${songLyricsEditor.songId}`])
  ));

  return (
    <section ref={studioRef} className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-lg shadow-slate-200/60 xl:flex xl:h-[calc(100dvh-120px)] xl:min-h-[900px] xl:max-h-[1180px] xl:flex-col" aria-label="Projection controls">
      {fitAllRequest?.deckKey === slideDeckKey ? (
        <div className="pointer-events-none fixed left-[-10000px] top-0 opacity-0" aria-hidden="true">
          {slides.map((slide, index) => (
            <ProjectionOutputFitMeasurement
              key={`${slideOverrideKey(index)}:${fitAllRequest.width}x${fitAllRequest.height}`}
              slide={slide}
              footer={footerForSlide(index)}
              viewport={fitAllRequest}
              scale={fitAllRequest.scale}
              overlay={outputState.overlay}
              onFit={(sectionIndex, fittedFontSize) => recordOutputFitMeasurement(
                `${slideOverrideKey(index)}:output:${fitAllRequest.width}x${fitAllRequest.height}:${sectionIndex === null ? "text" : `section:${sectionIndex}`}`,
                fittedFontSize,
              )}
            />
          ))}
        </div>
      ) : null}
      <header className="sticky top-[117px] z-30 flex flex-col gap-3 rounded-t-xl border-b border-sky-100 bg-gradient-to-r from-white via-sky-50 to-cyan-50 px-4 py-3 shadow-sm sm:top-[121px] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200"><MonitorPlay className="size-5" aria-hidden /></span>
          <button type="button" onClick={() => setShowOrderOpen((current) => !current)} className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-700" aria-label={showOrderOpen ? "Hide show order" : "Open show order"} title={showOrderOpen ? "Hide show order" : "Open show order"}>
            {showOrderOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={takePreview} disabled={!hasPendingChanges} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-emerald-100 disabled:text-emerald-700 disabled:shadow-none">
            <Send className="size-4" /> Take live
          </button>
          <button type="button" onClick={returnToLivePreview} disabled={!liveState || !returnableLiveSelection} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:shadow-none" title={!liveState ? "Nothing has been presented yet." : !returnableLiveSelection ? "The current live content is no longer available in this library." : "Restore Preview to the slide currently on the projector."}>
            <RotateCcw className="size-3.5" /> Return to live
          </button>
          <button type="button" onClick={() => void detectDisplays()} disabled={detectingScreens} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:border-blue-200 hover:text-blue-700 disabled:opacity-50">
            {detectingScreens ? <LoaderCircle className="size-4 animate-spin" /> : <MonitorCog className="size-4" />} Detect displays
          </button>
          <button type="button" onClick={() => void openProjector()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700"><MonitorPlay className="size-4" /> {projectorConnected ? "Focus output" : "Start projection"}</button>
          <button type="button" onClick={requestProjectorFullscreen} disabled={!projectorConnected} className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-700 disabled:opacity-35" aria-label="Make output fullscreen"><Fullscreen className="size-4" /></button>
          {projectorConnected ? <button type="button" onClick={() => void closeProjector()} className="inline-flex size-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100" aria-label="Close output"><CircleStop className="size-4" /></button> : null}
        </div>
      </header>
      {outputError ? <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900" role="alert">{outputError}</div> : null}

      <div className={`grid min-h-[360px] flex-1 border-b border-slate-200 ${showOrderOpen ? "xl:grid-cols-[240px_minmax(0,1fr)_6px_var(--live-panel-width)]" : "xl:grid-cols-[minmax(0,1fr)_6px_var(--live-panel-width)]"}`} style={{ "--live-panel-width": `${livePanelWidth}px` } as CSSProperties}>
        {showOrderOpen ? <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-slate-50/90 p-3 xl:border-b-0 xl:border-r">
          <select value={playlistId} onChange={(event) => choosePlaylist(event.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold" aria-label="Service playlist"><option value="library">No service playlist</option>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.title}</option>)}</select>
          {selectedPlaylist ? <select value={selectedSession ? String(selectedSession.id) : ""} onChange={(event) => chooseSession(event.target.value)} className="mt-2 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold" aria-label="Playlist session">{selectedPlaylist.sessions.map((session) => <option key={session.id} value={session.id}>{serviceLabel(session.serviceNumber)} · {session.name || "Default"}</option>)}</select> : null}
          {queuedSong ? <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-2"><div className="flex items-start gap-2"><ListPlus className="mt-0.5 size-4 shrink-0 text-violet-600" /><div className="min-w-0 flex-1"><p className="text-[9px] font-extrabold uppercase tracking-wide text-violet-600">Next song</p><p className="truncate text-xs font-bold text-slate-900">{queuedSong.title}</p></div><button type="button" onClick={() => setQueuedSongId(null)} className="inline-flex size-6 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-red-600" aria-label="Clear next song"><X className="size-3.5" /></button></div><button type="button" onClick={openQueuedSong} className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-violet-600 text-[10px] font-extrabold text-white hover:bg-violet-700"><ChevronRight className="size-3.5" /> Open next slides</button></div> : null}
          <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {selectedSession ? sourceSongs.map((song, index) => <div key={song.id} className={`group flex items-stretch overflow-hidden rounded-md border ${selectedSong?.id === song.id && source === "songs" ? "border-blue-300 bg-blue-50" : "border-transparent hover:bg-white"}`}><button type="button" onClick={(event) => { chooseSong(song.id); event.currentTarget.blur(); }} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left"><span className="flex size-6 shrink-0 items-center justify-center rounded bg-slate-200 text-[9px] font-extrabold text-slate-500">{index + 1}</span><span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-800">{song.title}</span>{song.artist ? <span className="block truncate text-[9px] text-slate-400">{song.artist}</span> : null}</span></button><button type="button" onClick={() => setQueuedSongId(song.id)} className="inline-flex w-8 items-center justify-center text-violet-500 opacity-60 hover:bg-violet-50 group-hover:opacity-100" aria-label={`Queue ${song.title}`}><ListPlus className="size-3.5" /></button></div>) : null}
          </div>
        </aside> : null}

        <div className="flex min-h-0 min-w-0 flex-col border-b border-slate-200 bg-slate-100/40 p-3 xl:border-b-0 xl:border-r">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h4 className="min-w-0 truncate text-base font-extrabold text-slate-950">{source === "songs" ? selectedSong?.title ?? "Choose a song" : loadedBible?.reference ?? "Load a Bible chapter"}</h4>
            {source === "songs" ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => openDeckEditor()} disabled={!currentSlide} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-white px-2.5 text-[10px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-40"><Pencil className="size-3.5" /> Edit slides</button>{deckHasEdits ? <button type="button" onClick={resetDeckEdits} className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-red-600" aria-label="Reset all slide edits" title="Reset all slide edits"><RotateCcw className="size-3.5" /></button> : null}</div> : null}
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-max content-start items-start grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5 overflow-y-auto p-0.5 pr-2">
            {slides.map((slide, index) => {
              const edited = Boolean(deckOverrides[slideDeckKey] || slideOverrides[slideOverrideKey(index)] || slideTextSizeOverrides[slideOverrideKey(index)] !== undefined);
              const slideTextSize = textSizeForSlide(index);
              const isLive = slideIsLive(index);
              const isPreview = index === safeSlideIndex;
              const uniformPreviewFontSize = `${projectionTextSizePx(slideTextSize) / (uniformTextViewport?.width ?? projectorViewport?.width ?? 1920) * 100}cqw`;
              return <article key={`${slide.label}-${index}`} className={`group relative h-fit min-h-[145px] self-start overflow-hidden rounded-lg border bg-white shadow-sm transition ${isLive ? "border-emerald-500 ring-2 ring-emerald-200" : isPreview ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-300 hover:border-blue-300 hover:shadow-md"}`}>
                <button type="button" onClick={(event) => { presentSlideAtIndex(index); event.currentTarget.blur(); }} className="flex min-h-[145px] w-full flex-col text-left" aria-label={`Present slide ${index + 1}`} title="Click to present this slide">
                  <div className="relative isolate w-full shrink-0 overflow-hidden bg-black px-[3.5%] py-[3.5%] text-center [container-type:inline-size]" style={{ aspectRatio: uniformTextViewport ? `${uniformTextViewport.width} / ${uniformTextViewport.height}` : projectorViewport ? `${projectorViewport.width} / ${projectorViewport.height}` : "16 / 9", minHeight: 108, color: activeTheme.text }}>
                    <ProjectionBackgroundLayer background={activeTheme.background} media={outputState.media} effects={backgroundEffects} playVideo={isPreview} animate={isPreview} contentLength={projectionSlideContentLength(slide)} className="-z-20" />
                    {slide.sections?.length ? <div className="grid size-full min-h-0" style={{ gridTemplateColumns: `repeat(${slide.sections.length},minmax(0,1fr))` }}>{slide.sections.map((section, sectionIndex) => <div key={`${section.label}-${sectionIndex}`} className="flex min-h-0 min-w-0 flex-col px-1" style={{ borderLeft: sectionIndex ? `1px solid ${activeTheme.muted}` : undefined }}><span className="text-[6px] font-bold uppercase tracking-wider" style={{ color: activeTheme.muted }}>{section.label}</span>{uniformTextSize ? <p className="flex min-h-0 flex-1 items-center justify-center whitespace-pre-line font-bold leading-[1.08] [text-wrap:balance]" style={{ fontSize: uniformPreviewFontSize, textShadow: activeTheme.shadow }}>{section.text}</p> : <ProjectionAutoFitText text={section.text} maximumFontSize={Math.max(8, projectionPreviewTextSizePx(slideTextSize) * 0.82)} minimumFontSize={5} className="font-bold leading-[1.08]" style={{ textShadow: activeTheme.shadow }} />}</div>)}</div> : uniformTextSize ? <p className="flex size-full items-center justify-center whitespace-pre-line font-bold leading-[1.08] [text-wrap:balance]" style={{ fontSize: uniformPreviewFontSize, textShadow: activeTheme.shadow }}>{slide.text}</p> : <ProjectionAutoFitText text={slide.text} maximumFontSize={projectionPreviewTextSizePx(slideTextSize)} minimumFontSize={6} className="font-bold leading-[1.08]" style={{ textShadow: activeTheme.shadow }} />}
                    {isLive ? <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-wide text-white ${liveState?.blanked ? "bg-amber-600" : "bg-emerald-600"}`}>{liveState?.blanked ? "Live · blanked" : "Live"}</span> : isPreview ? <span className="absolute left-1.5 top-1.5 rounded bg-blue-600 px-1.5 py-0.5 text-[7px] font-extrabold uppercase tracking-wide text-white">Preview</span> : null}
                  </div>
                  <div className={`flex h-9 w-full shrink-0 items-center justify-between gap-2 border-t px-2 ${isLive ? "border-emerald-400 bg-emerald-50" : isPreview ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"}`}><span className="text-[10px] font-extrabold text-slate-500">{index + 1}</span><span className={`min-w-0 flex-1 truncate text-right text-[10px] font-extrabold ${isLive ? "text-emerald-700" : "text-blue-700"}`}>{slide.label || `Slide ${index + 1}`}{edited ? " · Edited" : ""}</span></div>
                </button>
                {source === "songs" ? <button type="button" onClick={() => openDeckEditor(index)} className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-md border border-white/70 bg-white/95 text-blue-600 opacity-80 shadow-sm hover:bg-blue-600 hover:text-white group-hover:opacity-100" aria-label={`Edit slide ${index + 1}`}><Pencil className="size-3" /></button> : null}
              </article>;
            })}
            {!slides.length ? <div className="col-span-full flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center"><div><MonitorPlay className="mx-auto size-7 text-slate-300" /><p className="mt-2 text-xs font-bold text-slate-500">No slides prepared</p><p className="mt-1 text-[10px] text-slate-400">Open a song or Bible passage from the drawer below.</p></div></div> : null}
          </div>
          <div className="mt-3 grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-3"><button type="button" onClick={() => selectPreviewSlide(safeSlideIndex - 1)} disabled={safeSlideIndex === 0} className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-35" aria-label="Previous preview slide"><ChevronLeft className="size-4" /></button><p className="min-w-0 text-center text-xs font-bold text-slate-800">{slides.length ? `Preview · ${safeSlideIndex + 1}/${slides.length}` : "No slides"}</p><button type="button" onClick={() => selectPreviewSlide(safeSlideIndex + 1)} disabled={!slides.length || safeSlideIndex >= slides.length - 1} className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-35" aria-label="Next preview slide"><ChevronRight className="size-4" /></button></div>
        </div>

        <button
          type="button"
          role="separator"
          aria-label="Resize Preview and Live panels"
          aria-orientation="vertical"
          aria-valuemin={280}
          aria-valuemax={520}
          aria-valuenow={Math.round(livePanelWidth)}
          onPointerDown={beginLivePanelResize}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setLivePanelWidth((width) => Math.min(520, width + 20));
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              setLivePanelWidth((width) => Math.max(280, width - 20));
            }
          }}
          className="group hidden min-h-0 cursor-col-resize touch-none items-center justify-center bg-slate-200 outline-none hover:bg-blue-200 focus-visible:bg-blue-300 xl:flex"
          title="Drag to resize Preview and Live"
        >
          <span className="h-14 w-1 rounded-full bg-slate-400 transition group-hover:bg-blue-500" />
        </button>

        <aside className="flex h-fit min-h-0 self-start flex-col overflow-hidden bg-white shadow-sm">
          <div className="bg-slate-950 p-3 text-white">
            <ProjectionLiveMonitor state={liveState} />
          <button type="button" onClick={toggleLiveBlank} className={`mt-2 inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-md text-[9px] font-bold ${liveState?.blanked ? "bg-amber-500 text-slate-950" : "bg-white/10 text-white hover:bg-white/15"}`}>{liveState?.blanked ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}{liveState?.blanked ? "Show output" : "Blank output"}</button>
          <section className="mt-2 shrink-0 rounded-lg border border-white/10 bg-white/[0.04] p-2" aria-label="Output layers">
            <div className="mb-1 flex justify-end gap-1"><button type="button" onClick={restoreLiveLayers} disabled={!clearedLiveState} className="h-7 rounded px-2 text-[8px] font-bold text-white/60 hover:bg-white/10 disabled:opacity-25">Restore</button><button type="button" onClick={clearAllLiveLayers} disabled={!liveState} className="h-7 rounded bg-red-500/15 px-2 text-[8px] font-bold text-red-300 hover:bg-red-500/25 disabled:opacity-25">Clear all</button></div>
            <div className="grid grid-cols-3 gap-1.5">
              <button type="button" onClick={toggleLiveBackgroundLayer} aria-label="Toggle live background" aria-pressed={liveState?.media.type !== "none" && Boolean(liveState?.media.url)} title="Background" className={`inline-flex h-9 items-center justify-center rounded-md ${liveState?.media.type !== "none" && liveState?.media.url ? "bg-red-500/25 text-red-200 ring-1 ring-red-400/30" : "bg-white/5 text-white/35"}`}><ImageIcon className="size-4" /></button>
              <button type="button" onClick={toggleLiveSlideLayer} aria-label="Toggle live slide" aria-pressed={Boolean(liveState?.slide)} title="Slide" className={`inline-flex h-9 items-center justify-center rounded-md ${liveState?.slide ? "bg-red-500/25 text-red-200 ring-1 ring-red-400/30" : "bg-white/5 text-white/35"}`}><MonitorPlay className="size-4" /></button>
              <button type="button" onClick={toggleLiveOverlay} aria-label="Toggle live overlay" aria-pressed={Boolean(liveState?.overlay.visible)} title="Overlay" className={`inline-flex h-9 items-center justify-center rounded-md ${liveState?.overlay.visible ? "bg-red-500/25 text-red-200 ring-1 ring-red-400/30" : "bg-white/5 text-white/35"}`}><Eye className="size-4" /></button>
            </div>
            </section>
          </div>
          <section className="border-x border-b border-slate-200 bg-white p-3 text-slate-700" aria-label="Default projection text size">
            <div className="flex items-center justify-between text-[10px] font-extrabold"><span>Default text size</span><span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{fontSize}%</span></div>
            <input type="range" min={PROJECTION_TEXT_SIZE_MIN_PERCENT} max={PROJECTION_TEXT_SIZE_MAX_PERCENT} step={1} value={fontSize} onChange={(event) => { setFontSize(Number(event.target.value)); setUniformTextDecks((current) => ({ ...current, [slideDeckKey]: null })); }} aria-label="Default projection text size" className="mt-2 w-full accent-blue-600" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={fitAllSlidesToDensest} disabled={!slides.length || fitAllRequest?.deckKey === slideDeckKey} title={`Measure every slide against ${projectorViewport ? `the connected ${projectorViewport.width}×${projectorViewport.height} output` : "a 1920×1080 projector fallback"} and use the largest common text size`} className="h-9 min-w-0 rounded-md border border-blue-200 bg-blue-50 px-1.5 text-[8px] font-extrabold leading-tight text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40">{fitAllRequest?.deckKey === slideDeckKey ? "Measuring output…" : "Fit all text equally"}</button>
              <button type="button" onClick={applyTextSizeLive} disabled={!liveState || textSizeIsLive} className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-md bg-emerald-600 px-1.5 text-[8px] font-extrabold leading-tight text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"><Send className="size-3 shrink-0" />{textSizeIsLive ? "Default size live" : "Apply size live"}</button>
            </div>
          </section>
        </aside>
      </div>

      <section className="relative shrink-0 bg-white" style={{ height: drawerOpen ? drawerHeight : 45 }} aria-label="Projection content drawer">
        {drawerOpen ? <div onPointerDown={beginDrawerResize} className="absolute inset-x-0 top-0 z-20 h-2 -translate-y-1 cursor-row-resize touch-none" aria-label="Resize content drawer"><span className="absolute left-1/2 top-1 h-1 w-14 -translate-x-1/2 rounded-full bg-slate-300" /></div> : null}
        <nav className="flex h-11 items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2" aria-label="Projection libraries">
          {(["songs", "bible", "overlay", "media", "looks"] as ProjectionControlPanel[]).map((panel) => <button key={panel} type="button" onClick={() => chooseDrawerPanel(panel)} className={`relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[10px] font-extrabold capitalize ${drawerOpen && controlPanel === panel ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-blue-700"}`}>{panel === "songs" ? "♪" : panel === "bible" ? <BookOpen className="size-3.5" /> : panel === "overlay" ? <Eye className="size-3.5" /> : panel === "media" ? <ImageIcon className="size-3.5" /> : <Check className="size-3.5" />}{panel === "looks" ? "Themes" : panel === "overlay" ? "Overlays" : panel}</button>)}
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">{controlPanel === "songs" && drawerOpen ? <div className="relative hidden w-full max-w-2xl sm:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search all songs by title or lyrics…" aria-label="Search all songs by title or lyrics" className="h-10 w-full rounded-lg border border-blue-300 bg-white pl-9 pr-3 text-xs font-semibold text-slate-800 shadow-sm outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div> : null}<button type="button" onClick={() => setDrawerOpen((current) => !current)} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-blue-700" aria-label={drawerOpen ? "Close content drawer" : "Open content drawer"}><ChevronDown className={`size-4 transition ${drawerOpen ? "" : "rotate-180"}`} /></button></div>
        </nav>
        {drawerOpen ? <div className="h-[calc(100%-44px)] min-h-0 overflow-auto p-3">
          {controlPanel === "songs" ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="mb-2 flex shrink-0 items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-900">{search.trim() ? "Song search results" : "Recent songs"}</h4>
                <span className="rounded bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">{drawerSongs.length}/10</span>
              </div>
              <div className="grid min-h-0 flex-1 auto-rows-max content-start items-start gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {drawerSongs.map((song, index) => (
                  <div key={song.id} className={"flex min-h-12 min-w-0 items-stretch overflow-hidden rounded-lg border bg-white shadow-sm " + (selectedSong?.id === song.id && source === "songs" ? "border-blue-400 ring-1 ring-blue-100" : "border-slate-200 hover:border-blue-300")}>
                    <span className="flex w-9 shrink-0 items-center justify-center bg-slate-50 text-[10px] font-extrabold text-slate-400">{index + 1}</span>
                    <button type="button" onClick={(event) => { chooseSong(song.id); event.currentTarget.blur(); }} className="flex min-w-0 flex-1 items-center px-3 py-2 text-left">
                      <span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-900">{song.title}</span><span className="block truncate text-[9px] text-slate-400">{song.artist || "Song"}</span></span>
                    </button>
                    <button type="button" onClick={() => setQueuedSongId(song.id)} className={"inline-flex w-9 shrink-0 items-center justify-center border-l text-violet-600 hover:bg-violet-100 " + (queuedSongId === song.id ? "border-violet-200 bg-violet-100" : "border-slate-200")} aria-label={"Queue " + song.title + " as next"} title="Queue as next song"><ListPlus className="size-3.5" /></button>
                  </div>
                ))}
                {!drawerSongs.length ? <p className="col-span-full py-8 text-center text-xs text-slate-400">{search.trim() ? "No matching songs." : "Open a song to begin your recent list."}</p> : null}
              </div>
            </div>
          ) : null}

          {controlPanel === "bible" ? (
            <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="min-h-0 overflow-y-auto rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                    Translation
                    <select value={bibleVersion} onChange={(event) => { setBibleVersion(event.target.value); if (compareVersion === event.target.value) setCompareVersion(""); }} className="mt-1.5 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold normal-case text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                      {bibleVersions.map((version) => <option key={version.key} value={version.key}>{version.code}</option>)}
                    </select>
                  </label>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                    Compare
                    <select value={compareVersion} onChange={(event) => setCompareVersion(event.target.value)} className="mt-1.5 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold normal-case text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                      <option value="">None</option>
                      {bibleVersions.filter((version) => version.key !== bibleVersion).map((version) => <option key={version.key} value={version.key}>{version.code}</option>)}
                    </select>
                  </label>
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                    Book
                    <BibleBookPicker value={bibleBook} version={bibleVersion} onChange={(bookCode) => { setBibleBook(bookCode); setBibleChapter("1"); }} />
                  </div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                    Chapter
                    <BibleChapterPicker value={bibleChapter} chapterCount={bibleBooks.find((book) => book.code === bibleBook)?.chapters ?? 1} onChange={setBibleChapter} />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button type="button" onClick={() => void loadBibleChapter()} disabled={bibleLoading} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-xs font-extrabold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50">
                    {bibleLoading ? <LoaderCircle className="size-4 animate-spin" /> : <BookOpen className="size-4" />}
                    {bibleLoading ? "Loading chapter…" : "Load chapter into preview"}
                  </button>
                  {loadedBible ? (
                    <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-emerald-800">
                      <Check className="size-4 shrink-0" />
                      <p className="min-w-0 truncate text-[10px] font-semibold"><strong>{loadedBible.reference} · {loadedBible.version.code}</strong> — all {loadedBible.verses.length} verses included automatically</p>
                    </div>
                  ) : null}
                </div>
                {bibleError ? <p className="mt-3 rounded-lg bg-red-50 p-2 text-[10px] font-semibold text-red-700">{bibleError}</p> : null}
              </section>

              <aside className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Bible slide arrangement">
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                  Verses per slide
                  <select value={versesPerSlide} onChange={(event) => setVersesPerSlide(Number(event.target.value))} className="mt-1.5 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold normal-case text-slate-800 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                    <option value={1}>1 verse per slide</option>
                    <option value={2}>Up to 2 verses per slide</option>
                    <option value={3}>Up to 3 verses per slide</option>
                  </select>
                </label>
                <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3">
                  <p className="text-[10px] font-bold text-slate-700">{bibleVerseNumbers.length} verses · {bibleSlides.length} slides</p>
                </div>
                <button type="button" onClick={() => { setSource("bible"); setSlideIndex(0); }} disabled={!bibleSlides.length} className="mt-4 h-11 w-full rounded-lg bg-blue-600 text-[10px] font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:opacity-35">Open Bible slides</button>
              </aside>
            </div>
          ) : null}

          {controlPanel === "overlay" ? (
            <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[340px_minmax(0,1fr)_220px]">
              <aside className="min-h-0 overflow-y-auto rounded-lg border border-blue-100 bg-blue-50/60 p-3" aria-label="Saved overlays">
                <div className="grid grid-cols-2 gap-2">
                  {overlayPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      aria-label={"Select overlay " + preset.name}
                      aria-pressed={selectedOverlayPresetId === preset.id}
                      onClick={() => selectOverlayPreset(preset)}
                      className={selectedOverlayPresetId === preset.id
                        ? "min-w-0 overflow-hidden rounded-lg border-2 border-blue-500 bg-white text-left shadow-sm ring-2 ring-blue-100"
                        : "min-w-0 overflow-hidden rounded-lg border-2 border-white bg-white/80 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300"}
                    >
                      <ProjectionOverlayPreview title={preset.title} text={preset.text} tone={preset.tone} position={preset.position} fontSize={preset.fontSize} className="rounded-b-none border-0 border-b border-slate-700" />
                      <span className="flex h-8 items-center justify-between gap-1.5 px-2">
                        <span className="truncate text-[9px] font-extrabold text-slate-700">{preset.name}</span>
                        {selectedOverlayPresetId === preset.id ? <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[7px] font-extrabold uppercase text-emerald-700">Ready</span> : null}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={startNewOverlay}
                    className="group flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white/70 text-blue-700 transition hover:-translate-y-0.5 hover:border-blue-500 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    aria-label="Create a new overlay"
                  >
                    <span className="inline-flex size-9 items-center justify-center rounded-full bg-blue-100 transition group-hover:bg-blue-600 group-hover:text-white">
                      <Plus className="size-5" />
                    </span>
                    <span className="text-[10px] font-extrabold">New overlay</span>
                  </button>
                </div>
              </aside>

              <section className="grid min-h-0 gap-3 rounded-lg border border-slate-200 bg-white p-3 xl:grid-cols-[minmax(260px,1.1fr)_minmax(230px,.9fr)]" aria-label="Overlay preview">
                <div className="min-w-0">
                  <div className="mb-2 flex justify-end">
                    <span className={selectedOverlayIsLive ? "rounded-full bg-emerald-100 px-2 py-1 text-[7px] font-extrabold uppercase text-emerald-700" : "rounded-full bg-amber-100 px-2 py-1 text-[7px] font-extrabold uppercase text-amber-700"}>
                      {selectedOverlayIsLive ? "Live" : "Ready"}
                    </span>
                  </div>
                  <ProjectionOverlayPreview title={overlayTitle.trim()} text={overlayText.trim()} tone={overlayTone} position={overlayPosition} fontSize={overlayFontSize} className="shadow-inner" />
                  <p className="mt-2 truncate text-[9px] font-semibold text-slate-500">{overlayPresetName || "Unsaved overlay"}</p>
                </div>

                <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
                  <input value={overlayTitle} onChange={(event) => setOverlayTitle(event.target.value)} placeholder="Overlay title" className="h-9 w-full rounded-md border border-slate-300 px-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  <textarea value={overlayText} onChange={(event) => setOverlayText(event.target.value)} placeholder="Overlay message" rows={3} className="w-full resize-none rounded-md border border-slate-300 p-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={overlayTone} onChange={(event) => setOverlayTone(event.target.value as OverlayTone)} className="h-8 rounded-md border border-slate-300 bg-white px-1.5 text-[10px] font-semibold">
                      <option value="blue">Blue</option>
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="minimal">Minimal</option>
                    </select>
                    <select value={overlayPosition} onChange={(event) => setOverlayPosition(event.target.value as OverlayPosition)} className="h-8 rounded-md border border-slate-300 bg-white px-1.5 text-[10px] font-semibold">
                      <option value="top">Top</option>
                      <option value="center">Center</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>
                  <label className="block text-[9px] font-semibold text-slate-500">
                    <span className="flex justify-between"><span>Overlay size</span><strong>{overlayFontSize}%</strong></span>
                    <input type="range" min={PROJECTION_TEXT_SIZE_MIN_PERCENT} max={PROJECTION_TEXT_SIZE_MAX_PERCENT} step={1} value={overlayFontSize} onChange={(event) => setOverlayFontSize(Number(event.target.value))} className="mt-2 w-full accent-blue-600" />
                  </label>
                </div>
              </section>

              <aside className="min-h-0 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3" aria-label="Overlay presentation">
                <button
                  type="button"
                  onClick={toggleLiveOverlay}
                  disabled={!overlayTitle.trim() && !overlayText.trim()}
                  className={selectedOverlayIsLive
                    ? "h-10 w-full rounded-md bg-red-600 text-[9px] font-extrabold text-white shadow-sm hover:bg-red-700 disabled:opacity-35"
                    : "h-10 w-full rounded-md bg-emerald-600 text-[9px] font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-35"}
                >
                  {selectedOverlayIsLive ? "Hide live overlay" : "Show overlay live"}
                </button>
                <div className="my-3 border-t border-slate-200" />
                <input value={overlayPresetName} onChange={(event) => setOverlayPresetName(event.target.value)} placeholder="Preset name" maxLength={80} className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-[9px]" />
                <button type="button" onClick={saveCurrentOverlayPreset} disabled={overlayPresetPending || !overlayPresetName.trim() || (!overlayTitle.trim() && !overlayText.trim())} className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-blue-600 text-[10px] font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-35">
                  <Save className="size-3.5" /> Save
                </button>
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={deleteSelectedOverlayPreset} disabled={!selectedOverlayPresetId || overlayPresetPending} className="inline-flex items-center gap-1 text-[8px] font-bold text-red-500 disabled:opacity-35"><Trash2 className="size-3" /> Delete</button>
                </div>
                {overlayPresetNotice ? <p className="mt-2 rounded bg-white px-2 py-1 text-[8px] text-slate-500">{overlayPresetNotice}</p> : null}
              </aside>
            </div>
          ) : null}

          {controlPanel === "media" ? <div className="grid h-full min-h-0 gap-3 lg:grid-cols-3"><section className="rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between"><h4 className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">Local media</h4>{mediaType !== "none" ? <button type="button" onClick={clearBackgroundMedia} className="text-[8px] font-bold text-red-500">Remove</button> : null}</div><label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-blue-300 bg-blue-50 text-[9px] font-bold text-blue-700 hover:bg-blue-100"><Upload className="size-5" /> Choose image or video<input type="file" accept="image/*,video/mp4,video/webm,video/ogg" className="sr-only" onChange={(event) => { selectLocalBackground(event.target.files?.[0]); event.target.value = ""; }} /></label>{mediaName ? <p className="mt-2 truncate text-[9px] font-semibold text-slate-600">{mediaType === "video" ? <Video className="mr-1 inline size-3" /> : <ImageIcon className="mr-1 inline size-3" />}{mediaName}</p> : null}</section><section className="rounded-lg border border-slate-200 bg-white p-3"><h4 className="mb-2 text-[9px] font-extrabold uppercase tracking-wide text-slate-500">Hosted media</h4><div className="grid grid-cols-[85px_1fr] gap-2"><select value={mediaType} onChange={(event) => setMediaType(event.target.value as ProjectionMediaType)} className="h-8 rounded border border-slate-300 bg-white px-1 text-[9px] font-semibold"><option value="none">None</option><option value="image">Image</option><option value="video">Video</option></select><input value={mediaUrl.startsWith("blob:") ? "" : mediaUrl} onChange={(event) => { setMediaUrl(event.target.value); setMediaName(event.target.value ? "Hosted media" : ""); setMediaNotice(null); }} onBlur={() => { if (mediaUrl && !sanitizeProjectionMediaUrl(mediaUrl)) setMediaNotice("Use a valid http:// or https:// media URL."); }} placeholder="https://cdn…/background.mp4" className="h-8 min-w-0 rounded border border-slate-300 px-2 text-[9px]" /></div>{mediaNotice ? <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-[8px] text-slate-500">{mediaNotice}</p> : null}</section><section className="rounded-lg border border-slate-200 bg-slate-50 p-3"><label className="block text-[9px] font-semibold text-slate-500">Media fit<select value={mediaFit} onChange={(event) => setMediaFit(event.target.value as "cover" | "contain")} className="mt-1 h-8 w-full rounded border border-slate-300 bg-white px-2 text-[9px]"><option value="cover">Fill screen</option><option value="contain">Show all</option></select></label><label className="mt-3 block text-[9px] font-semibold text-slate-500"><span className="flex justify-between"><span>Brightness</span><strong>{mediaBrightness}%</strong></span><input type="range" min={0} max={100} step={1} value={mediaBrightness} onChange={(event) => setMediaBrightness(Number(event.target.value))} className="mt-2 w-full accent-blue-600" /></label><button type="button" onClick={takePreview} disabled={!hasPendingChanges} className="mt-3 h-8 w-full rounded bg-emerald-600 text-[9px] font-bold text-white disabled:opacity-35">Apply Preview live</button></section></div> : null}

          {controlPanel === "looks" ? (
            <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="min-h-0 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 pr-2">
                <div className="flex flex-wrap gap-1">
                  {projectionThemeCategories.map((category) => <button key={category.key} type="button" onClick={() => setThemeCategory(category.key)} className={`rounded-full px-2 py-1 text-[8px] font-bold ${themeCategory === category.key ? "bg-blue-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>{category.label}</button>)}
                </div>
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex justify-between text-[9px] font-bold text-slate-500"><span>Transition</span><span>{transitionType === "cut" ? "Instant" : `${transitionDuration} ms`}</span></div>
                  <div className="mt-1 grid grid-cols-3 gap-1">{(["cut", "fade", "dissolve"] as ProjectionTransitionType[]).map((type) => <button key={type} type="button" onClick={() => setTransitionType(type)} className={`h-7 rounded text-[8px] font-bold capitalize ${transitionType === type ? "bg-blue-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>{type}</button>)}</div>
                  {transitionType !== "cut" ? <input type="range" min={100} max={1500} step={50} value={transitionDuration} onChange={(event) => setTransitionDuration(Number(event.target.value))} className="mt-2 w-full accent-blue-600" /> : null}
                </div>
                <div className="mt-3 space-y-3 rounded-lg border border-blue-100 bg-white p-3 shadow-sm">
                  <ProjectionEffectRange label="Brightness" value={mediaBrightness} minimum={0} maximum={100} onChange={setMediaBrightness} />
                  <ProjectionEffectRange label="Readable dimming" value={backgroundDimming} minimum={0} maximum={80} onChange={setBackgroundDimming} />
                  <button type="button" onClick={() => setBackgroundAutoDimming((current) => !current)} aria-pressed={backgroundAutoDimming} className={`flex h-8 w-full items-center justify-between rounded-md px-2 text-[8px] font-bold ${backgroundAutoDimming ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-100 text-slate-500"}`}><span>Auto readability</span><span>{backgroundAutoDimming ? "On" : "Off"}</span></button>
                  <ProjectionEffectRange label="Vignette" value={backgroundVignette} minimum={0} maximum={100} onChange={setBackgroundVignette} />
                  <ProjectionEffectRange label="Blur" value={backgroundBlur} minimum={0} maximum={20} unit="px" onChange={setBackgroundBlur} />
                  <ProjectionEffectRange label="Saturation" value={backgroundSaturation} minimum={0} maximum={180} onChange={setBackgroundSaturation} />
                </div>
                <div className="mt-3 rounded-lg border border-violet-100 bg-white p-3">
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-500"><span>Background motion</span><span>{motionSpeed}%</span></div>
                  <div className="mt-1 grid grid-cols-3 gap-1">{(["none", "drift", "zoom"] as ProjectionBackgroundMotion[]).map((motion) => <button key={motion} type="button" onClick={() => setBackgroundMotion(motion)} className={`h-7 rounded text-[8px] font-bold capitalize ${backgroundMotion === motion ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 ring-1 ring-slate-200"}`}>{motion}</button>)}</div>
                  {backgroundMotion !== "none" ? <input type="range" min={0} max={100} step={1} value={motionSpeed} onChange={(event) => setMotionSpeed(Number(event.target.value))} aria-label="Background motion speed" className="mt-2 w-full accent-violet-600" /> : null}
                  <div className="mt-3 text-[9px] font-bold text-slate-500">Atmosphere</div>
                  <div className="mt-1 grid grid-cols-3 gap-1">{(["none", "particles", "rays"] as ProjectionBackgroundAmbience[]).map((ambience) => <button key={ambience} type="button" onClick={() => setBackgroundAmbience(ambience)} className={`h-7 rounded text-[8px] font-bold capitalize ${backgroundAmbience === ambience ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 ring-1 ring-slate-200"}`}>{ambience}</button>)}</div>
                </div>
                <div className="mt-3 rounded-lg border border-cyan-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2"><label className="text-[9px] font-bold text-slate-500">Colour tint</label><input type="color" value={backgroundTintColor} onChange={(event) => setBackgroundTintColor(event.target.value)} aria-label="Background tint colour" className="h-7 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5" /></div>
                  <div className="mt-2"><ProjectionEffectRange label="Tint strength" value={backgroundTintStrength} minimum={0} maximum={70} onChange={setBackgroundTintStrength} /></div>
                  <button type="button" onClick={resetBackgroundEffects} className="mt-2 h-7 w-full rounded bg-slate-100 text-[8px] font-bold text-slate-500 hover:bg-slate-200">Reset effects</button>
                </div>
                <button type="button" onClick={applyAppearanceLive} disabled={!liveState || appearanceIsLive} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-2 text-[9px] font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none">
                  <Send className="size-3.5" />{appearanceIsLive ? "Appearance live" : "Apply appearance live"}
                </button>
              </aside>
              <div className="grid min-h-0 content-start grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2 overflow-y-auto pr-1">
                {visibleThemes.map(([key, theme]) => <button key={key} type="button" onClick={() => chooseTheme(key)} className={`overflow-hidden rounded-lg border-2 bg-white text-left shadow-sm transition hover:-translate-y-0.5 ${themeKey === key ? "border-blue-500 ring-2 ring-blue-100" : "border-white"}`}><span className="relative block aspect-video overflow-hidden bg-black"><ProjectionBackgroundLayer background={theme.background} media={{ ...DEFAULT_PROJECTION_MEDIA, brightness: mediaBrightness }} effects={themeKey === key ? backgroundEffects : theme.effects} animate={themeKey === key} />{themeKey === key ? <span className="absolute right-1.5 top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-blue-600 text-white"><Check className="size-2.5" /></span> : null}</span><span className="block truncate px-2 py-1 text-[9px] font-bold text-slate-600">{theme.label}</span></button>)}
              </div>
            </div>
          ) : null}
        </div> : null}
      </section>

      {songLyricsEditor ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !songLyricsPending) setSongLyricsEditor(null); }}>
          <section className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="song-lyrics-editor-title">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-white px-5 py-4">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 id="song-lyrics-editor-title" className="text-base font-extrabold text-slate-950">Edit complete song lyrics</h3><span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-700">Permanent library change</span></div><p className="mt-1 truncate text-xs font-semibold text-slate-600">{songLyricsEditor.title}</p><p className="mt-1 text-[10px] text-slate-400">Saving regenerates every projection slide. The audience output changes only after you press Take live.</p></div>
              <button type="button" onClick={() => setSongLyricsEditor(null)} disabled={songLyricsPending} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40" aria-label="Close lyrics editor"><X className="size-4" /></button>
            </header>
            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-h-0 flex-col border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                <div className="mb-2 flex items-end justify-between gap-3"><label htmlFor="complete-song-lyrics" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Complete lyrics</label><span className="text-[10px] font-semibold text-slate-400">{songLyricsEditor.lyrics.length} / {MAX_EDITABLE_SONG_LYRICS_LENGTH} characters</span></div>
                <textarea id="complete-song-lyrics" autoFocus value={songLyricsEditor.lyrics} maxLength={MAX_EDITABLE_SONG_LYRICS_LENGTH} onChange={(event) => setSongLyricsEditor((current) => current ? { ...current, lyrics: event.target.value, notice: null } : null)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); saveSongLyrics(); } }} spellCheck className="min-h-[330px] flex-1 resize-none rounded-xl border border-slate-300 bg-white p-4 font-mono text-sm leading-6 text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-4 text-slate-500"><strong className="text-slate-700">Formatting:</strong> use headings such as <code className="rounded bg-white px-1 text-blue-700">[Verse 1]</code> or <code className="rounded bg-white px-1 text-blue-700">[Chorus]</code> on their own block. Slides are automatically limited to six lyric lines.</div>
                {songLyricsEditorHasTemporaryEdits ? <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">Saving the complete song will replace temporary edits previously made to individual slides.</p> : null}
              </div>
              <aside className="min-h-0 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between"><div><h4 className="text-xs font-extrabold text-slate-800">Generated slides</h4><p className="text-[10px] text-slate-400">Updates while you type</p></div><span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-extrabold text-white">{songLyricsEditorSlides.length}</span></div>
                <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                  {songLyricsEditorSlides.map((slide, index) => <div key={`${slide.label ?? "slide"}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-1 flex items-center justify-between gap-2"><span className="truncate text-[9px] font-extrabold uppercase tracking-wider text-blue-600">{slide.label || `Slide ${index + 1}`}</span><span className="shrink-0 text-[9px] font-bold text-slate-300">{index + 1}</span></div><p className="whitespace-pre-line text-[10px] font-semibold leading-4 text-slate-600">{slide.text}</p></div>)}
                  {!songLyricsEditorSlides.length ? <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-xs text-slate-400">Enter lyrics to generate slides.</div> : null}
                </div>
              </aside>
            </div>
            <footer className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0" aria-live="polite">{songLyricsEditor.notice ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200">{songLyricsEditor.notice}</p> : <p className="text-[10px] text-slate-400">Tip: press Ctrl+Enter to save.</p>}</div>
              <div className="flex shrink-0 justify-end gap-2"><button type="button" onClick={() => setSongLyricsEditor(null)} disabled={songLyricsPending} className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40">Cancel</button><button type="button" onClick={saveSongLyrics} disabled={!songLyricsEditorValid || songLyricsPending} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-extrabold text-white hover:bg-blue-700 disabled:opacity-40">{songLyricsPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{songLyricsPending ? "Saving…" : "Save complete lyrics"}</button></div>
            </footer>
          </section>
        </div>
      ) : null}

      {deckEditorOpen && source === "songs" && typeof document !== "undefined" ? createPortal(
        <ProjectionSlideEditor
          title={source === "songs" ? selectedSong?.title ?? "Song" : loadedBible?.reference ?? "Bible slides"}
          initialItems={deckEditorItems}
          initialActiveIndex={safeSlideIndex}
          defaultFontSize={fontSize}
          theme={activeTheme}
          canSaveToSong={source === "songs" && Boolean(selectedSong)}
          onClose={() => setDeckEditorOpen(false)}
          onApply={applyDeckEdits}
          onSaveToSong={saveEditedDeckToSong}
        />,
        document.body,
      ) : null}
    </section>
  );
}
