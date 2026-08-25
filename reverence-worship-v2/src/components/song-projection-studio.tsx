"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteProjectionOverlayPreset, saveProjectionOverlayPreset, updateProjectionSongLyrics } from "@/app/admin/music/actions";
import { ProjectionAutoFitText } from "@/components/projection-auto-fit-text";
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
  LoaderCircle,
  MonitorCog,
  MonitorPlay,
  Pencil,
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
  PROJECTION_TEXT_SIZE_MAX_PERCENT,
  PROJECTION_TEXT_SIZE_MIN_PERCENT,
  clampProjectionTransitionDuration,
  projectionMediaBrightnessPercent,
  projectionOverlayPreviewTextSizePx,
  projectionOverlaySafeInsets,
  projectionOverlayWidthPercent,
  projectionPreviewTextSizePx,
  readProjectionState,
  sanitizeProjectionMediaUrl,
  type ProjectionChannelMessage,
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
type ProjectionControlPanel = "looks" | "media" | "overlay";
type SlideEditorState = { key: string; index: number; slide: SongProjectionSlide };
type SongLyricsEditorState = { songId: number; title: string; lyrics: string; notice: string | null };

function serviceLabel(serviceNumber: number) {
  return serviceNumber === 1 ? "First service" : serviceNumber === 2 ? "Second service" : `Service ${serviceNumber}`;
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

function BibleBookPicker({ value, version, onChange }: { value: string; version: string; onChange: (bookCode: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const matchingBooks = bibleBooks.filter((book) => !normalizedQuery || `${book.code} ${book.name} ${book.nameRw}`.toLowerCase().includes(normalizedQuery));
  const groups = [
    { label: "Old Testament", books: matchingBooks.filter((book) => bibleBooks.indexOf(book) < 39) },
    { label: "New Testament", books: matchingBooks.filter((book) => bibleBooks.indexOf(book) >= 39) },
  ];

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function chooseBook(bookCode: string) {
    onChange(bookCode);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative mt-1 normal-case">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 text-left text-xs font-semibold text-slate-800 outline-none hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <BookOpen className="size-4 shrink-0 text-blue-600" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{bibleBookName(value, version)}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
          <div className="border-b border-slate-100 bg-slate-50 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a Bible book…"
                aria-label="Search Bible books"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div role="listbox" aria-label="Bible books" className="max-h-64 overflow-y-auto p-2">
            {groups.map((group) => group.books.length ? (
              <section key={group.label} className="mb-2 last:mb-0">
                <h5 className="sticky top-0 z-10 bg-white/95 px-1 py-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400 backdrop-blur">{group.label}</h5>
                <div className="grid grid-cols-2 gap-1">
                  {group.books.map((book) => {
                    const selected = book.code === value;
                    return (
                      <button
                        key={book.code}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        title={bibleBookName(book.code, version)}
                        onClick={() => chooseBook(book.code)}
                        className={`flex min-w-0 items-center gap-1.5 rounded-md px-2 py-2 text-left text-[11px] font-semibold ${selected ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-blue-50 hover:text-blue-800"}`}
                      >
                        <span className="min-w-0 flex-1 truncate">{bibleBookName(book.code, version)}</span>
                        {selected ? <Check className="size-3.5 shrink-0" aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null)}
            {matchingBooks.length === 0 ? <p className="px-2 py-8 text-center text-xs text-slate-500">No Bible book matches “{query.trim()}”.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BibleChapterPicker({ value, chapterCount, onChange }: { value: string; chapterCount: number; onChange: (chapter: string) => void }) {
  const [open, setOpen] = useState(false);
  const [rangeIndex, setRangeIndex] = useState(Math.floor((Math.max(1, Number(value)) - 1) / 25));
  const [jumpValue, setJumpValue] = useState(value);
  const rootRef = useRef<HTMLDivElement | null>(null);
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
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function togglePicker() {
    if (!open) {
      setRangeIndex(Math.floor((Math.max(1, Number(value)) - 1) / 25));
      setJumpValue(value);
    }
    setOpen((current) => !current);
  }

  function chooseChapter(chapter: number) {
    onChange(String(chapter));
    setJumpValue(String(chapter));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative mt-1 normal-case">
      <button
        type="button"
        onClick={togglePicker}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 text-left text-xs font-semibold text-slate-800 outline-none hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <Hash className="size-3.5 shrink-0 text-blue-600" aria-hidden />
        <span className="flex-1">{value}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 max-w-[80vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
          <div className="border-b border-slate-100 bg-slate-50 p-2">
            <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Jump to chapter</p>
            <div className="flex gap-1.5">
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
                aria-label={`Chapter number, 1 to ${chapterCount}`}
                className="h-8 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold outline-none focus:border-blue-500"
              />
              <button type="button" onClick={() => chooseChapter(parsedJump)} disabled={!jumpIsValid} className="h-8 rounded-md bg-blue-600 px-3 text-[10px] font-bold text-white disabled:opacity-40">Go</button>
            </div>
          </div>

          {rangeCount > 1 ? (
            <div className="flex flex-wrap gap-1 border-b border-slate-100 px-2 py-2">
              {Array.from({ length: rangeCount }, (_, index) => {
                const start = index * 25 + 1;
                const end = Math.min(chapterCount, start + 24);
                return <button key={start} type="button" onClick={() => setRangeIndex(index)} className={`rounded-md px-2 py-1 text-[9px] font-bold ${rangeIndex === index ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{start}–{end}</button>;
              })}
            </div>
          ) : null}

          <div role="listbox" aria-label="Bible chapters" className="grid grid-cols-5 gap-1 p-2">
            {visibleChapters.map((chapter) => {
              const selected = String(chapter) === value;
              return (
                <button
                  key={chapter}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => chooseChapter(chapter)}
                  className={`flex aspect-square items-center justify-center rounded-md text-xs font-bold ${selected ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-blue-50 hover:text-blue-800"}`}
                >
                  {chapter}
                </button>
              );
            })}
          </div>
        </div>
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
  const [slideIndex, setSlideIndex] = useState(0);
  const [blanked, setBlanked] = useState(false);
  const [themeKey, setThemeKey] = useState<ProjectionThemeKey>("black");
  const [themeCategory, setThemeCategory] = useState<"all" | ProjectionThemeCategory>("all");
  const [fontSize, setFontSize] = useState(60);
  const [mediaType, setMediaType] = useState<ProjectionMediaType>("none");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaName, setMediaName] = useState("");
  const [mediaFit, setMediaFit] = useState<"cover" | "contain">("cover");
  const [mediaBrightness, setMediaBrightness] = useState(55);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);
  const [transitionType, setTransitionType] = useState<ProjectionTransitionType>("fade");
  const [transitionDuration, setTransitionDuration] = useState(350);
  const [autoTake] = useState(false);
  const [controlPanel, setControlPanel] = useState<ProjectionControlPanel>("overlay");
  const [liveState, setLiveState] = useState<ProjectionOutputState | null>(() => typeof window === "undefined" ? null : readProjectionState(window.localStorage));
  const [slideOverrides, setSlideOverrides] = useState<Record<string, SongProjectionSlide>>({});
  const [slideEditor, setSlideEditor] = useState<SlideEditorState | null>(null);
  const [songLyricsEditor, setSongLyricsEditor] = useState<SongLyricsEditorState | null>(null);

  const [bibleVersion, setBibleVersion] = useState(bibleVersions[0].key);
  const [compareVersion, setCompareVersion] = useState("");
  const [bibleBook, setBibleBook] = useState("JHN");
  const [bibleChapter, setBibleChapter] = useState("3");
  const [loadedBible, setLoadedBible] = useState<LoadedBibleChapter | null>(null);
  const [loadedComparison, setLoadedComparison] = useState<LoadedBibleChapter | null>(null);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
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
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const previewOverlayRef = useRef<HTMLDivElement | null>(null);
  const [previewFrameHeight, setPreviewFrameHeight] = useState(0);
  const [previewOverlayHeight, setPreviewOverlayHeight] = useState(0);
  const [overlayPresetPending, startOverlayPresetTransition] = useTransition();
  const [songLyricsPending, startSongLyricsTransition] = useTransition();

  const [screens, setScreens] = useState<ProjectionScreenLike[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState("");
  const [detectingScreens, setDetectingScreens] = useState(false);
  const [displayMessage, setDisplayMessage] = useState("");
  const [projectorConnected, setProjectorConnected] = useState(false);
  const [projectorFullscreen, setProjectorFullscreen] = useState(false);
  const [outputError, setOutputError] = useState<string | null>(null);
  const projectorWindowRef = useRef<Window | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const latestStateRef = useRef<ProjectionOutputState | null>(null);
  const lastHeartbeatRef = useRef(0);
  const controlHandlerRef = useRef<(key: ProjectionControlKey) => void>(() => undefined);
  const takeHandlerRef = useRef<() => void>(() => undefined);
  const localMediaUrlRef = useRef("");
  const lastAutoTakenRef = useRef("");

  const selectedPlaylist = playlists.find((playlist) => String(playlist.id) === playlistId) ?? null;
  const selectedSession = selectedPlaylist?.sessions.find((session) => String(session.id) === sessionId) ?? selectedPlaylist?.sessions[0] ?? null;
  const sourceSongs = selectedSession
    ? selectedSession.songs.map((song) => ({ ...song, lyrics: songLyricsOverrides[song.id] ?? song.lyrics })).filter((song) => !song.isArchived && song.lyrics?.trim())
    : activeSongs;
  const selectedSong = sourceSongs.find((song) => song.id === selectedSongId) ?? sourceSongs[0] ?? null;
  const filteredSongs = sourceSongs.filter((song) => `${song.title} ${song.artist ?? ""} ${song.lyrics ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 100);
  const songSlides = songProjectionSlides(selectedSong?.lyrics);
  const bibleTranslations = [loadedBible, loadedComparison].filter((chapter): chapter is LoadedBibleChapter => chapter !== null);
  const bibleSlides = multiVersionBibleProjectionSlides(bibleTranslations.map((chapter) => ({ reference: chapter.reference, versionCode: chapter.version.code, verses: chapter.verses })), selectedVerses, versesPerSlide);
  const baseSlides = source === "bible" ? bibleSlides : songSlides;
  const slideDeckKey = source === "songs"
    ? `song:${selectedSong?.id ?? "none"}`
    : `bible:${loadedBible?.version.key ?? "none"}:${loadedBible?.reference ?? "none"}:${loadedComparison?.version.key ?? "none"}:${selectedVerses.join(",")}:${versesPerSlide}`;
  const slideOverrideKey = (index: number) => `${slideDeckKey}:${index}`;
  const slides = baseSlides.map((slide, index) => slideOverrides[slideOverrideKey(index)] ?? slide);
  const safeSlideIndex = Math.min(slideIndex, Math.max(0, slides.length - 1));
  const currentSlide = slides[safeSlideIndex] ?? null;
  const previewFontSize = projectionPreviewTextSizePx(fontSize);
  const comparisonPreviewFontSize = Math.max(9, Math.round(previewFontSize * 0.82));
  const nextSlide = slides[safeSlideIndex + 1] ?? null;
  const activeTheme = projectionThemes[themeKey];
  const visibleThemes = (Object.entries(projectionThemes) as Array<[ProjectionThemeKey, ProjectionTheme]>).filter(([, theme]) => themeCategory === "all" || theme.category === themeCategory);
  const selectedScreen = screens.find((screen) => projectionScreenId(screen) === selectedScreenId) ?? null;
  const footer = source === "bible"
    ? loadedBible ? `${loadedBible.reference} · ${bibleTranslations.map((item) => item.version.code).join(" / ")} — ${slides.length ? `${safeSlideIndex + 1}/${slides.length}` : "No verses"}` : "Bible presentation"
    : selectedSong ? `${selectedSong.title}${selectedSong.artist ? ` · ${selectedSong.artist}` : ""} — ${slides.length ? `${safeSlideIndex + 1}/${slides.length}` : "No lyrics"}` : "Reverence Worship";
  const overlayStyle = overlayAppearance(overlayTone);
  const overlayPreviewFontSize = projectionOverlayPreviewTextSizePx(overlayFontSize);
  const overlayWidth = projectionOverlayWidthPercent(overlayFontSize);
  const overlayPadding = `${(0.8 + overlayFontSize * 0.014).toFixed(2)}vh ${(1.2 + overlayFontSize * 0.02).toFixed(2)}vw`;

  const outputState: ProjectionOutputState = {
    version: 3,
    updatedAt: 0,
    blanked,
    slide: currentSlide,
    emptyMessage: source === "bible" ? "" : "Select a song in the operator window",
    footer,
    fontSize,
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
    lastAutoTakenRef.current = draftFingerprint;
    commitOutputState(outputState);
  }

  function toggleLiveBlank() {
    const base = latestStateRef.current ?? outputState;
    const blankedNext = !base.blanked;
    setBlanked(blankedNext);
    commitOutputState({ ...base, blanked: blankedNext });
  }

  function toggleLiveOverlay() {
    const base = latestStateRef.current ?? outputState;
    const visible = !base.overlay.visible && Boolean(overlayTitle.trim() || overlayText.trim());
    setOverlayVisible(visible);
    commitOutputState({ ...base, overlay: visible ? { ...outputState.overlay, visible: true } : { ...base.overlay, visible: false } });
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

  function openSlideEditor(index = safeSlideIndex) {
    const slide = slides[index];
    if (!slide) return;
    setSlideIndex(index);
    setBlanked(false);
    setSlideEditor({
      key: slideOverrideKey(index),
      index,
      slide: { ...slide, sections: slide.sections?.map((section) => ({ ...section })) },
    });
  }

  function openSongLyricsEditor() {
    if (!selectedSong?.lyrics) return;
    setSongLyricsEditor({
      songId: selectedSong.id,
      title: selectedSong.title,
      lyrics: selectedSong.lyrics,
      notice: null,
    });
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
        setSlideOverrides((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`song:${editor.songId}:`))));
        setSlideIndex(0);
        setBlanked(false);
        setSongLyricsEditor(null);
      } catch {
        setSongLyricsEditor((current) => current?.songId === editor.songId ? { ...current, notice: "Unable to save the lyrics right now. Check your permission or connection and try again." } : current);
      }
    });
  }

  function applySlideEdit() {
    if (!slideEditor) return;
    const sections = slideEditor.slide.sections?.map((section) => ({ label: section.label.trim(), text: section.text.trim() }));
    const editedSlide: SongProjectionSlide = {
      label: slideEditor.slide.label?.trim() || null,
      text: sections?.length ? sections.map((section) => section.text).join("\n\n") : slideEditor.slide.text.trim(),
      ...(sections?.length ? { sections } : {}),
    };
    if ((!editedSlide.sections?.length && !editedSlide.text) || editedSlide.sections?.some((section) => !section.text)) return;
    setSlideOverrides((current) => ({ ...current, [slideEditor.key]: editedSlide }));
    setSlideIndex(slideEditor.index);
    setBlanked(false);
    setSlideEditor(null);
  }

  function resetSlideEdit(index = safeSlideIndex) {
    const key = slideOverrideKey(index);
    setSlideOverrides((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSlideEditor(null);
  }

  function chooseSong(songId: number) {
    setSelectedSongId(songId);
    setSlideIndex(0);
    setBlanked(false);
  }

  function choosePlaylist(value: string) {
    setPlaylistId(value);
    setSlideIndex(0);
    setBlanked(false);
    const playlist = playlists.find((item) => String(item.id) === value);
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
      setBlanked(false);
      setSlideIndex((value) => Math.min(Math.max(0, slides.length - 1), value + 1));
    } else if (["ArrowLeft", "PageUp"].includes(key)) {
      setBlanked(false);
      setSlideIndex((value) => Math.max(0, value - 1));
    } else if (key === "Home") {
      setBlanked(false);
      setSlideIndex(0);
    } else if (key === "End") {
      setBlanked(false);
      setSlideIndex(Math.max(0, slides.length - 1));
    } else if (key === "b") toggleLiveBlank();
    else if (key === "o") toggleLiveOverlay();
  }
  async function loadBibleChapter() {
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
      setSelectedVerses(data.primary.verses.map((verse) => verse.number));
      setSlideIndex(0);
      setBlanked(false);
    } catch (error) {
      setBibleError(error instanceof Error ? error.message : "Unable to load this Bible chapter.");
    } finally {
      setBibleLoading(false);
    }
  }

  function useOverlayPreset() {
    const preset = overlayPresets.find((item) => item.id === selectedOverlayPresetId);
    if (!preset) return;
    setOverlayPresetName(preset.name);
    setOverlayTitle(preset.title);
    setOverlayText(preset.text);
    setOverlayTone(preset.tone);
    setOverlayPosition(preset.position);
    setOverlayFontSize(preset.fontSize);
    setOverlayVisible(true);
   
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
        setDisplayMessage(detected.length > 1 ? `${detected.length} displays detected by the desktop projector.` : "Only one display was detected. Connect HDMI and choose Extend.");
        return target;
      }

      const browser = window as BrowserWithScreens;
      if (typeof browser.getScreenDetails !== "function") {
        setDisplayMessage("This browser cannot select displays automatically. The output will open as a clean window; move it to the projector and press F.");
        return null;
      }

      const details = await browser.getScreenDetails();
      const detected = Array.from(details.screens);
      setScreens(detected);
      const target = chooseProjectionScreen(detected, details.currentScreen, selectedScreenId);
      if (target) setSelectedScreenId(projectionScreenId(target));
      const external = target && projectionScreenId(target) !== projectionScreenId(details.currentScreen);
      setDisplayMessage(external ? `${target.label || "External display"} is ready for projection.` : "Only one display is available. Connect HDMI and use Windows + P → Extend.");
      return target;
    } catch {
      setDisplayMessage("Display permission was not granted. Allow window management for this site and try again.");
      return null;
    } finally {
      setDetectingScreens(false);
    }
  }

  async function openProjector() {
    if (latestStateRef.current) publishOutputState();
    else commitOutputState(outputState);
    setOutputError(null);
    let target = selectedScreen;
    if (!target) target = await detectDisplays();
    const url = new URL("/projection/output", window.location.origin).toString();
    const bridge = desktopBridge();
    if (bridge) {
      const result = await bridge.openProjector({ url, displayId: target ? projectionScreenId(target) : undefined });
      if (!result.ok) setOutputError(result.message ?? "The desktop projector could not be opened.");
      else {
        setProjectorFullscreen(true);
        setDisplayMessage(`${target?.label || "Projector output"} opened as a native frameless fullscreen window.`);
      }
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
    setDisplayMessage(target
      ? `Output opened on ${target.label || "the selected display"}.`
      : "Output opened. Move it to the projector, then click the fullscreen confirmation inside it.");
  }

  async function closeProjector() {
    channelRef.current?.postMessage({ type: "command", command: "close" } satisfies ProjectionChannelMessage);
    projectorWindowRef.current?.close();
    projectorWindowRef.current = null;
    if (desktopBridge()) await desktopBridge()?.closeProjector();
    setProjectorConnected(false);
    setProjectorFullscreen(false);
  }

  function requestProjectorFullscreen() {
    channelRef.current?.postMessage({ type: "command", command: "fullscreen" } satisfies ProjectionChannelMessage);
    projectorWindowRef.current?.focus();
    setDisplayMessage("Fullscreen requested. Chrome may require a click inside the output window; press F there if its bars remain.");
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
        setProjectorFullscreen(message.fullscreen || Boolean(desktopBridge()));
      } else if (message.type === "closed") {
        setProjectorConnected(false);
        setProjectorFullscreen(false);
      } else if (message.type === "control") {
        controlHandlerRef.current(message.key);
      }
    };

    const connectionCheck = window.setInterval(() => {
      if (lastHeartbeatRef.current && Date.now() - lastHeartbeatRef.current > 3500) {
        setProjectorConnected(false);
        setProjectorFullscreen(false);
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
    takeHandlerRef.current = takePreview;
    if (autoTake && lastAutoTakenRef.current !== draftFingerprint) {
      lastAutoTakenRef.current = draftFingerprint;
      commitOutputState(outputState);
    }
  });

  useEffect(() => {
    if (!operatorActive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)) return;
      const normalized = event.key.toLowerCase();
      const key = normalized === "b" || normalized === "o" ? normalized : event.key;
      if (event.key === "Enter") { event.preventDefault(); takeHandlerRef.current(); return; }
      if (!["ArrowRight", "ArrowLeft", "PageDown", "PageUp", "Home", "End", " ", "b", "o"].includes(key)) return;
      event.preventDefault();
      controlHandlerRef.current(key as ProjectionControlKey);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [operatorActive]);

  useEffect(() => {
    if (!slideEditor && !songLyricsEditor) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSlideEditor(null);
      if (!songLyricsPending) setSongLyricsEditor(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [slideEditor, songLyricsEditor, songLyricsPending]);

  const previewOverlayPosition = overlayPosition === "top" ? "top-4" : overlayPosition === "center" ? "top-1/2 -translate-y-1/2" : "bottom-4";
  const showPreviewOverlay = Boolean(overlayVisible && !blanked && (overlayTitle || overlayText));
  const previewSafeInsets = projectionOverlaySafeInsets(previewFrameHeight, previewOverlayHeight, overlayPosition, showPreviewOverlay);
  const slideEditorValid = Boolean(slideEditor && (slideEditor.slide.sections?.length ? slideEditor.slide.sections.every((section) => section.text.trim()) : slideEditor.slide.text.trim()));
  const songLyricsEditorSlides = songProjectionSlides(songLyricsEditor?.lyrics);
  const songLyricsEditorValid = Boolean(songLyricsEditor?.lyrics.trim() && songLyricsEditor.lyrics.length <= MAX_EDITABLE_SONG_LYRICS_LENGTH);
  const songLyricsEditorHasTemporaryEdits = Boolean(songLyricsEditor && Object.keys(slideOverrides).some((key) => key.startsWith(`song:${songLyricsEditor.songId}:`)));

  useLayoutEffect(() => {
    const frame = previewFrameRef.current;
    if (!frame) return;
    const measure = () => {
      setPreviewFrameHeight(frame.clientHeight);
      setPreviewOverlayHeight(showPreviewOverlay ? previewOverlayRef.current?.offsetHeight ?? 0 : 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    if (showPreviewOverlay && previewOverlayRef.current) observer.observe(previewOverlayRef.current);
    return () => observer.disconnect();
  }, [showPreviewOverlay, overlayPosition, overlayFontSize, overlayTitle, overlayText, overlayWidth]);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-lg shadow-slate-200/60" aria-label="Projection controls">
      <header className="flex flex-col gap-3 border-b border-sky-100 bg-gradient-to-r from-white via-sky-50 to-cyan-50/60 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200"><MonitorPlay className="size-5" aria-hidden /></span>
          <div><h3 className="font-bold text-slate-950">Projection Studio</h3><p className="text-xs text-slate-500"></p></div>
          <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 sm:inline ${projectorFullscreen ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : projectorConnected ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>{projectorFullscreen ? "OUTPUT FULLSCREEN" : projectorConnected ? "FULLSCREEN NEEDED" : "OUTPUT CLOSED"}</span>
          {hasPendingChanges && !autoTake ? <span className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200 md:inline">PREVIEW WAITING</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void detectDisplays()} disabled={detectingScreens} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:border-blue-200 hover:text-blue-700 disabled:opacity-50">
            {detectingScreens ? <LoaderCircle className="size-4 animate-spin" /> : <MonitorCog className="size-4" />} Detect displays
          </button>
          <button type="button" onClick={() => void openProjector()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700"><MonitorPlay className="size-4" /> {projectorConnected ? "Focus output" : "Start projection"}</button>
          <button type="button" onClick={requestProjectorFullscreen} disabled={!projectorConnected} className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-700 disabled:opacity-35" aria-label="Make output fullscreen"><Fullscreen className="size-4" /></button>
          {projectorConnected ? <button type="button" onClick={() => void closeProjector()} className="inline-flex size-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100" aria-label="Close output"><CircleStop className="size-4" /></button> : null}
        </div>
      </header>
      <div className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-800">{displayMessage}</div>
      {outputError ? <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900" role="alert">{outputError}</div> : null}

      <div className="grid xl:min-h-[680px] xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="border-b border-slate-200 bg-slate-50/80 p-3 xl:border-b-0 xl:border-r">
          <div className="mb-3 grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1">
            <button type="button" onClick={() => { setSource("songs"); setSlideIndex(0); }} className={`rounded-md px-2 py-2 text-xs font-bold ${source === "songs" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>♪ Songs</button>
            <button type="button" onClick={() => { setSource("bible"); setSlideIndex(0); }} className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-bold ${source === "bible" ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}><BookOpen className="size-3.5" /> Bible</button>
          </div>

          {source === "songs" ? (
            <div>
              <select value={playlistId} onChange={(event) => choosePlaylist(event.target.value)} className="mb-2 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold" aria-label="Song source">
                <option value="library">All songs</option>
                {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.title}</option>)}
              </select>
              {selectedPlaylist ? (
                <select value={selectedSession ? String(selectedSession.id) : ""} onChange={(event) => chooseSession(event.target.value)} className="mb-2 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold" aria-label="Playlist session">
                  {selectedPlaylist.sessions.map((session) => <option key={session.id} value={session.id}>{serviceLabel(session.serviceNumber)} · {session.name || "Default"}</option>)}
                </select>
              ) : null}
              <div className="relative mb-2"><Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search songs or lyrics…" className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 text-xs outline-none focus:border-blue-500" /></div>
              <div className="max-h-[505px] space-y-1 overflow-y-auto pr-1">
                {filteredSongs.map((song) => (
                  <button key={song.id} type="button" onClick={() => chooseSong(song.id)} className={`flex w-full items-center gap-2 rounded-md border-l-2 px-2.5 py-2 text-left ${selectedSong?.id === song.id ? "border-blue-600 bg-blue-100 text-blue-950" : "border-transparent text-slate-700 hover:bg-white"}`}>
                    <span className={`flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-bold ${selectedSong?.id === song.id ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>♪</span>
                    <span className="min-w-0"><span className="block truncate text-xs font-semibold">{song.title}</span>{song.artist ? <span className="block truncate text-[10px] text-slate-500">{song.artist}</span> : null}</span>
                  </button>
                ))}
                {filteredSongs.length === 0 ? <p className="py-8 text-center text-xs text-slate-500">No songs with lyrics found.</p> : null}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Primary translation<select value={bibleVersion} onChange={(event) => { setBibleVersion(event.target.value); if (compareVersion === event.target.value) setCompareVersion(""); }} className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold normal-case text-slate-800">{bibleVersions.map((version) => <option key={version.key} value={version.key}>{version.code} · {version.label}</option>)}</select></label>
              <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Comparison<select value={compareVersion} onChange={(event) => setCompareVersion(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold normal-case text-slate-800"><option value="">None</option>{bibleVersions.filter((version) => version.key !== bibleVersion).map((version) => <option key={version.key} value={version.key}>{version.code} · {version.label}</option>)}</select></label>
              <div className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Book<BibleBookPicker value={bibleBook} version={bibleVersion} onChange={(bookCode) => { setBibleBook(bookCode); setBibleChapter("1"); }} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Chapter<BibleChapterPicker value={bibleChapter} chapterCount={bibleBooks.find((book) => book.code === bibleBook)?.chapters ?? 1} onChange={setBibleChapter} /></div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Verses/slide<select value={versesPerSlide} onChange={(event) => setVersesPerSlide(Number(event.target.value))} className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold normal-case text-slate-800"><option value={1}>1 verse</option><option value={2}>2 verses</option><option value={3}>3 verses</option></select></label>
              </div>
              <button type="button" onClick={() => void loadBibleChapter()} disabled={bibleLoading} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{bibleLoading ? <LoaderCircle className="size-4 animate-spin" /> : <BookOpen className="size-4" />} Load chapter</button>
              {bibleError ? <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">{bibleError}</p> : null}
              {loadedBible ? (
                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-500"><span>{loadedBible.reference} · {loadedBible.version.code}</span><span><button type="button" onClick={() => setSelectedVerses(loadedBible.verses.map((verse) => verse.number))} className="text-blue-600">All</button> · <button type="button" onClick={() => setSelectedVerses([])} className="text-blue-600">None</button></span></div>
                  <div className="max-h-[285px] space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-1.5">
                    {loadedBible.verses.map((verse) => <label key={verse.number} className={`flex cursor-pointer gap-2 rounded px-2 py-1.5 text-xs ${selectedVerses.includes(verse.number) ? "bg-blue-50 text-blue-950" : "hover:bg-slate-50"}`}><input type="checkbox" checked={selectedVerses.includes(verse.number)} onChange={() => setSelectedVerses((current) => current.includes(verse.number) ? current.filter((item) => item !== verse.number) : [...current, verse.number].sort((a, b) => a - b))} className="mt-0.5 size-3.5" /><span><strong>{verse.number}</strong> {verse.text}</span></label>)}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </aside>

        <div className="min-w-0 border-b border-slate-200 p-3 sm:p-4 xl:border-b-0 xl:border-r">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><div className="flex items-center gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Preview</p>{hasPendingChanges && !autoTake ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Not live yet</span> : <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">Matches audience</span>}</div><h4 className="truncate text-sm font-bold text-slate-900">{source === "songs" ? selectedSong?.title ?? "Choose a song" : loadedBible?.reference ?? "Load a Bible chapter"}</h4></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => source === "songs" ? openSongLyricsEditor() : openSlideEditor()} disabled={source === "songs" ? !selectedSong?.lyrics : !currentSlide} className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"><Pencil className="size-3.5" /> {source === "songs" ? "Edit lyrics" : "Edit slide"}</button>{slideOverrides[slideOverrideKey(safeSlideIndex)] ? <button type="button" onClick={() => resetSlideEdit()} className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600" aria-label="Reset current slide"><RotateCcw className="size-3.5" /></button> : null}<button type="button" onClick={takePreview} className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"><Send className="size-4" /> Take live</button><button type="button" onClick={toggleLiveBlank} className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold ${liveState?.blanked ? "bg-amber-100 text-amber-800" : "border border-slate-200 bg-white text-slate-600"}`}>{liveState?.blanked ? <Eye className="size-4" /> : <EyeOff className="size-4" />}{liveState?.blanked ? "Show output" : "Blank output"}</button></div>
          </div>

          <div ref={previewFrameRef} className="relative isolate aspect-video overflow-hidden rounded-xl border border-slate-700 bg-black shadow-inner" style={{ color: activeTheme.text }}>
            {!blanked ? <div className="absolute inset-0 -z-10 overflow-hidden bg-black" style={{ background: activeTheme.background, filter: `brightness(${outputState.media.brightness}%)`, transition: "filter 120ms linear" }} aria-hidden>{outputState.media.type !== "none" && outputState.media.url ? outputState.media.type === "video" ? <video key={outputState.media.url} src={outputState.media.url} autoPlay muted loop playsInline preload="metadata" className="size-full bg-black" style={{ objectFit: outputState.media.fit }} /> : <img src={outputState.media.url} alt="" className="size-full bg-black" style={{ objectFit: outputState.media.fit }} /> : null}</div> : null}
            {!blanked ? <div className="flex h-full min-h-0 flex-col items-center px-[7%] text-center" style={previewSafeInsets}>{currentSlide?.label ? <p className="mb-3 text-[clamp(8px,1.2vw,15px)] font-bold uppercase tracking-[0.12em]" style={{ color: activeTheme.muted }}>{currentSlide.label}</p> : null}{currentSlide?.sections?.length ? <div className="grid min-h-0 w-full flex-1" style={{ gridTemplateColumns: `repeat(${currentSlide.sections.length},minmax(0,1fr))` }}>{currentSlide.sections.map((section, index) => <div key={`${section.label}-${index}`} className="flex min-h-0 min-w-0 flex-col px-3" style={{ borderLeft: index ? `1px solid ${activeTheme.muted}` : undefined }}><strong className="mb-1 block text-[9px] uppercase tracking-widest" style={{ color: activeTheme.muted }}>{section.label}</strong><ProjectionAutoFitText text={section.text} maximumFontSize={comparisonPreviewFontSize} minimumFontSize={6} className="font-bold leading-tight" style={{ textShadow: activeTheme.shadow }} /></div>)}</div> : <div className="min-h-0 w-full flex-1"><ProjectionAutoFitText text={currentSlide?.text ?? outputState.emptyMessage} maximumFontSize={previewFontSize} minimumFontSize={6} className="font-bold leading-tight" style={{ textShadow: activeTheme.shadow }} /></div>}<p className="mt-1.5 w-full shrink-0 truncate text-[9px]" style={{ color: activeTheme.muted }}>{footer}</p></div> : null}
            {showPreviewOverlay ? <div ref={previewOverlayRef} className={`absolute left-1/2 -translate-x-1/2 rounded-lg border text-center ${previewOverlayPosition}`} style={{ width: `${overlayWidth}%`, padding: `${Math.max(5, overlayFontSize * 0.11)}px ${Math.max(8, overlayFontSize * 0.16)}px`, background: overlayStyle.background, color: overlayStyle.color, borderColor: overlayStyle.border, boxShadow: overlayStyle.shadow, textShadow: overlayStyle.textShadow }}><strong className="block uppercase tracking-widest opacity-70" style={{ fontSize: `${Math.max(5, Math.round(overlayPreviewFontSize * 0.5))}px` }}>{overlayTitle}</strong><p className="font-bold" style={{ fontSize: `${overlayPreviewFontSize}px` }}>{overlayText}</p></div> : null}
          </div>

          <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-3"><button type="button" onClick={() => runControl("ArrowLeft")} disabled={safeSlideIndex === 0} className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-35"><ChevronLeft className="size-5" /></button><div className="text-center"><p className="text-sm font-bold text-slate-800">{slides.length ? `Slide ${safeSlideIndex + 1} of ${slides.length}` : "No slides ready"}</p><p className="text-[10px] text-slate-400">← → navigate · B blank · O overlay</p></div><button type="button" onClick={() => runControl("ArrowRight")} disabled={!slides.length || safeSlideIndex >= slides.length - 1} className="inline-flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-35"><ChevronRight className="size-5" /></button></div>

          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Slides</p>
            <div className="grid max-h-[230px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {slides.map((slide, index) => {
                const edited = Boolean(slideOverrides[slideOverrideKey(index)]);
                return (
                  <div key={`${slide.label}-${index}`} className="group relative aspect-video">
                    <button type="button" onClick={() => { setSlideIndex(index); setBlanked(false); }} className={`size-full overflow-hidden rounded-lg border p-2 pr-8 text-left ${index === safeSlideIndex ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-200"}`}>
                      <span className="flex items-center gap-1 truncate text-[8px] font-bold uppercase text-blue-600">{slide.label || `Slide ${index + 1}`}{edited ? <span className="rounded bg-amber-100 px-1 py-0.5 text-[7px] text-amber-700">Edited</span> : null}</span>
                      <span className="mt-1 line-clamp-4 whitespace-pre-line text-[9px] leading-tight text-slate-600">{slide.text}</span>
                    </button>
                    <button type="button" onClick={() => openSlideEditor(index)} className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-md border border-blue-100 bg-white/95 text-blue-600 opacity-80 shadow-sm hover:bg-blue-600 hover:text-white group-hover:opacity-100" aria-label={`Edit slide ${index + 1}`}><Pencil className="size-3" /></button>
                  </div>
                );
              })}
              {!slides.length ? <p className="col-span-full rounded-lg border border-dashed border-slate-300 py-8 text-center text-xs text-slate-400">Select content to prepare slides.</p> : null}
            </div>
          </div>
          {nextSlide ? <p className="mt-2 truncate text-[10px] text-slate-400"><strong>Next:</strong> {nextSlide.text.replaceAll("\n", " / ")}</p> : null}
        </div>

        <aside className="bg-slate-50/60 p-4">
          <nav className="sticky top-0 z-20 mb-4 grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur" aria-label="Projection tools">
            {(["looks", "media", "overlay"] as ProjectionControlPanel[]).map((panel) => <button key={panel} type="button" onClick={() => setControlPanel(panel)} className={`relative h-9 rounded-lg text-[10px] font-extrabold capitalize transition ${controlPanel === panel ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-blue-700"}`}>{panel}{panel === "overlay" && overlayVisible ? <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-emerald-400 ring-2 ring-white/70" aria-label="Overlay live" /> : null}</button>)}
          </nav>

          <section className={controlPanel === "looks" ? "" : "hidden"}>
            <div className="mb-1.5 flex items-center justify-between"><h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Church themes</h4><span className="text-[9px] font-bold text-blue-600">{Object.keys(projectionThemes).length} built in</span></div>
            
            <div className="mb-2 flex flex-wrap gap-1">{projectionThemeCategories.map((category) => <button key={category.key} type="button" onClick={() => setThemeCategory(category.key)} className={`rounded-full px-2 py-1 text-[9px] font-bold ${themeCategory === category.key ? "bg-blue-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-blue-600"}`}>{category.label}</button>)}</div>
            <div className="grid max-h-[330px] grid-cols-2 gap-2 overflow-y-auto pr-1">
              {visibleThemes.map(([key, theme]) => <button key={key} type="button" onClick={() => setThemeKey(key)} className={`overflow-hidden rounded-lg border-2 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${themeKey === key ? "border-blue-500 ring-2 ring-blue-100" : "border-white"}`} title={theme.label}><span className="relative block aspect-video" style={{ background: theme.background }}>{themeKey === key ? <span className="absolute right-1.5 top-1.5 inline-flex size-4 items-center justify-center rounded-full bg-blue-600 text-white shadow"><Check className="size-2.5" /></span> : null}</span><span className="block truncate px-1.5 py-1 text-[9px] font-bold text-slate-600">{theme.label}</span></button>)}
            </div>
            <label className="mt-3 block text-[10px] font-semibold text-slate-500"><span className="flex justify-between"><span>Background brightness</span><strong className="text-slate-700">{mediaBrightness}%</strong></span><input type="range" min={0} max={100} step={1} value={mediaBrightness} onChange={(event) => setMediaBrightness(Number(event.target.value))} className="mt-2 w-full accent-blue-600" /></label>
            {!autoTake ? <p className="mt-1.5 text-[9px] leading-4 text-blue-600"></p> : null}
          </section>

          <section className={controlPanel === "media" ? "rounded-xl border border-slate-200 bg-white p-3" : "hidden"}>
            <div className="mb-2 flex items-center justify-between"><div><h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Media background</h4><p className="mt-0.5 text-[9px] text-emerald-600"></p></div>{mediaType !== "none" ? <button type="button" onClick={clearBackgroundMedia} className="text-[9px] font-bold text-red-500">Remove</button> : null}</div>
            <label className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-blue-300 bg-blue-50 text-[10px] font-bold text-blue-700 hover:bg-blue-100"><Upload className="size-3.5" /> Choose local image/video<input type="file" accept="image/*,video/mp4,video/webm,video/ogg" className="sr-only" onChange={(event) => { selectLocalBackground(event.target.files?.[0]); event.target.value = ""; }} /></label>
            <div className="my-2 flex items-center gap-2 text-[9px] text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use hosted URL<span className="h-px flex-1 bg-slate-200" /></div>
            <div className="grid grid-cols-[82px_1fr] gap-1.5"><select value={mediaType} onChange={(event) => setMediaType(event.target.value as ProjectionMediaType)} className="h-8 rounded-md border border-slate-300 bg-white px-1 text-[10px] font-semibold"><option value="none">None</option><option value="image">Image</option><option value="video">Video</option></select><input value={mediaUrl.startsWith("blob:") ? "" : mediaUrl} onChange={(event) => { setMediaUrl(event.target.value); setMediaName(event.target.value ? "Hosted media" : ""); setMediaNotice(null); }} onBlur={() => { if (mediaUrl && !sanitizeProjectionMediaUrl(mediaUrl)) setMediaNotice("Use a valid http:// or https:// media URL."); }} placeholder="https://cdn…/background.mp4" className="h-8 min-w-0 rounded-md border border-slate-300 px-2 text-[10px]" /></div>
            {mediaName ? <p className="mt-1.5 truncate text-[9px] font-semibold text-slate-600">{mediaType === "video" ? <Video className="mr-1 inline size-3" /> : <ImageIcon className="mr-1 inline size-3" />}{mediaName}</p> : null}
            {mediaType !== "none" && Boolean(sanitizeProjectionMediaUrl(mediaUrl)) ? <label className="mt-2 block text-[9px] font-semibold text-slate-500">Media fit<select value={mediaFit} onChange={(event) => setMediaFit(event.target.value as "cover" | "contain")} className="mt-1 h-8 w-full rounded border border-slate-300 bg-white px-2 text-[10px]"><option value="cover">Fill screen</option><option value="contain">Show all</option></select></label> : null}
            {mediaNotice ? <p className="mt-2 rounded bg-slate-50 px-2 py-1.5 text-[9px] leading-4 text-slate-500">{mediaNotice}</p> : null}
          </section>

          <section className={controlPanel === "looks" ? "mt-5 rounded-xl border border-slate-200 bg-white p-3" : "hidden"}>
            <div className="mb-2 flex items-center justify-between"><h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Transition</h4><span className="text-[10px] font-bold text-slate-700">{transitionType === "cut" ? "Instant" : `${transitionDuration} ms`}</span></div>
            <div className="grid grid-cols-3 gap-1">{(["cut", "fade", "dissolve"] as ProjectionTransitionType[]).map((type) => <button key={type} type="button" onClick={() => setTransitionType(type)} className={`h-8 rounded-md text-[10px] font-bold capitalize ${transitionType === type ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{type}</button>)}</div>
            {transitionType !== "cut" ? <input type="range" min={100} max={1500} step={50} value={transitionDuration} onChange={(event) => setTransitionDuration(Number(event.target.value))} className="mt-2 w-full accent-blue-600" aria-label="Transition duration" /> : null}
          </section>

          <section className={controlPanel === "looks" ? "mt-5" : "hidden"}>
            <div className="mb-2 flex items-center justify-between"><h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Maximum text size</h4><span className="text-xs font-bold text-slate-700">{fontSize}%</span></div>
            <input type="range" min={PROJECTION_TEXT_SIZE_MIN_PERCENT} max={PROJECTION_TEXT_SIZE_MAX_PERCENT} step={1} value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="w-full accent-blue-600" />
            <p className="mt-1.5 text-[10px] leading-4 text-slate-400"></p>
          </section>

          <section className={controlPanel === "overlay" ? "rounded-xl border border-blue-200 bg-white p-3 shadow-sm shadow-blue-100" : "hidden"}>
            <div className="mb-3 flex items-center justify-between"><div><h4 className="text-xs font-bold text-slate-800">Overlay</h4><p className="text-[10px] text-slate-400"></p></div><button type="button" onClick={() => setOverlayVisible((value) => !value)} disabled={!overlayTitle.trim() && !overlayText.trim()} className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[10px] font-bold ${overlayVisible ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"} disabled:opacity-35`}>{overlayVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}{overlayVisible ? "LIVE" : "HIDDEN"}</button></div>
            <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/70 p-2">
              <div className="mb-1.5 flex items-center justify-between"><span className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-blue-700">Saved overlays</span><span className="text-[9px] font-bold text-blue-400">{overlayPresets.length}/50</span></div>
              <div className="flex gap-1.5">
                <select value={selectedOverlayPresetId} onChange={(event) => { const id = event.target.value; setSelectedOverlayPresetId(id); const preset = overlayPresets.find((item) => item.id === id); setOverlayPresetName(preset?.name ?? ""); setOverlayPresetNotice(null); }} className="h-8 min-w-0 flex-1 rounded-md border border-blue-200 bg-white px-2 text-[10px] font-semibold text-slate-700"><option value="">Choose saved overlay…</option>{overlayPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select>
                <button type="button" onClick={useOverlayPreset} disabled={!selectedOverlayPresetId || overlayPresetPending} className="h-8 rounded-md bg-blue-600 px-2.5 text-[10px] font-bold text-white disabled:opacity-40">Use</button>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <input value={overlayPresetName} onChange={(event) => setOverlayPresetName(event.target.value)} placeholder="Preset name" maxLength={80} className="h-8 min-w-0 flex-1 rounded-md border border-blue-200 bg-white px-2 text-[10px] outline-none focus:border-blue-500" />
                <button type="button" onClick={saveCurrentOverlayPreset} disabled={overlayPresetPending || !overlayPresetName.trim() || (!overlayTitle.trim() && !overlayText.trim())} className="inline-flex h-8 items-center gap-1 rounded-md border border-blue-200 bg-white px-2 text-[10px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"><Save className="size-3" />{selectedOverlayPresetId ? "Update" : "Save"}</button>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <button type="button" onClick={() => { setSelectedOverlayPresetId(""); setOverlayPresetName(""); setOverlayPresetNotice(null); }} className="text-[9px] font-bold text-blue-600 hover:text-blue-800">+ New preset</button>
                <button type="button" onClick={deleteSelectedOverlayPreset} disabled={!selectedOverlayPresetId || overlayPresetPending} className="inline-flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-700 disabled:opacity-35"><Trash2 className="size-3" /> Delete</button>
              </div>
              {overlayPresetNotice ? <p className="mt-1.5 rounded bg-white/80 px-2 py-1 text-[9px] font-medium text-slate-600">{overlayPresetNotice}</p> : null}
            </div>
            <div className="space-y-2"><input value={overlayTitle} onChange={(event) => setOverlayTitle(event.target.value)} placeholder="Overlay title" className="h-9 w-full rounded-md border border-slate-300 px-2 text-xs" /><textarea value={overlayText} onChange={(event) => setOverlayText(event.target.value)} placeholder="Overlay message" rows={3} className="w-full resize-none rounded-md border border-slate-300 p-2 text-xs" /><div className="grid grid-cols-2 gap-2"><select value={overlayTone} onChange={(event) => setOverlayTone(event.target.value as OverlayTone)} className="h-8 rounded-md border border-slate-300 bg-white px-1.5 text-[10px] font-semibold"><option value="blue">Blue</option><option value="dark">Dark</option><option value="light">Light</option><option value="minimal">Minimal</option></select><select value={overlayPosition} onChange={(event) => setOverlayPosition(event.target.value as OverlayPosition)} className="h-8 rounded-md border border-slate-300 bg-white px-1.5 text-[10px] font-semibold"><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></div><label className="block text-[10px] font-semibold text-slate-500"><span className="mb-1 flex items-center justify-between"><span>Overlay size</span><strong className="text-slate-700">{overlayFontSize}%</strong></span><input type="range" min={PROJECTION_TEXT_SIZE_MIN_PERCENT} max={PROJECTION_TEXT_SIZE_MAX_PERCENT} step={1} value={overlayFontSize} onChange={(event) => setOverlayFontSize(Number(event.target.value))} className="w-full accent-blue-600" /></label></div>
          </section>

         
        </aside>
      </div>

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

      {slideEditor ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSlideEditor(null); }}>
          <section className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="slide-editor-title">
            <header className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-5 py-4"><div><h3 id="slide-editor-title" className="text-base font-extrabold text-slate-950">Edit slide {slideEditor.index + 1}</h3><p className="mt-1 text-xs text-slate-500"></p></div><button type="button" onClick={() => setSlideEditor(null)} className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Close slide editor"><X className="size-4" /></button></header>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
              {slideEditor.slide.sections?.length ? (
                <div className="grid gap-3 sm:grid-cols-2">{slideEditor.slide.sections.map((section, sectionIndex) => <div key={sectionIndex} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Column heading<input value={section.label} onChange={(event) => setSlideEditor((current) => current ? { ...current, slide: { ...current.slide, sections: current.slide.sections?.map((item, index) => index === sectionIndex ? { ...item, label: event.target.value } : item) } } : null)} maxLength={160} className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold normal-case tracking-normal outline-none focus:border-blue-500" /></label><label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Text<textarea value={section.text} onChange={(event) => setSlideEditor((current) => current ? { ...current, slide: { ...current.slide, sections: current.slide.sections?.map((item, index) => index === sectionIndex ? { ...item, text: event.target.value } : item) } } : null)} rows={7} className="mt-1.5 w-full resize-y rounded-md border border-slate-300 bg-white p-2 text-sm font-semibold leading-6 normal-case tracking-normal outline-none focus:border-blue-500" /></label></div>)}</div>
              ) : (
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Slide text<textarea autoFocus value={slideEditor.slide.text} onChange={(event) => setSlideEditor((current) => current ? { ...current, slide: { ...current.slide, text: event.target.value } } : null)} rows={9} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 p-3 text-base font-semibold leading-7 normal-case tracking-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
              )}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4"><div>{slideOverrides[slideEditor.key] ? <button type="button" onClick={() => resetSlideEdit(slideEditor.index)} className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold text-red-600 hover:bg-red-50"><RotateCcw className="size-3.5" /> Reset original</button> : <span className="text-[10px] text-slate-400">Apply, review in Preview, then Take live.</span>}</div><div className="flex gap-2"><button type="button" onClick={() => setSlideEditor(null)} className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" onClick={applySlideEdit} disabled={!slideEditorValid} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-extrabold text-white hover:bg-blue-700 disabled:opacity-40"><Check className="size-4" /> Apply to preview</button></div></footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
