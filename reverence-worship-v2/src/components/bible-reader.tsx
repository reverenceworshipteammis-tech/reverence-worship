"use client";

import { TouchEvent as ReactTouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { ActionNotice } from "@/components/action-notice";
import { bibleBooks, bibleVersions } from "@/lib/bible-data";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";
import {
  Bookmark,
  BookMarked,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Copy,
  Hash,
  Highlighter,
  LayoutGrid,
  Search,
  Share2,
  StickyNote,
  Type,
  X,
} from "lucide-react";

type BibleVerse = {
  number: number;
  text: string;
};

type BibleChapter = {
  version: {
    key: string;
    code: string;
    label: string;
  };
  reference: string;
  verses: BibleVerse[];
};

type BibleResult = {
  book: string;
  chapter: number;
  primary: BibleChapter;
  compare: BibleChapter | null;
};

type BibleSearchResult = {
  book: string;
  bookName: string;
  bookNameRw: string;
  chapter: number;
  verse: number;
  text: string;
  previousText?: string;
  nextText?: string;
};

type BibleReaderPreferences = {
  fontSize: number;
  lineHeight: "compact" | "comfortable" | "spacious";
  theme: "light" | "sepia" | "dark";
  width: "focused" | "wide";
};

type BibleSavedVerse = {
  id: string;
  version: string;
  versionCode: string;
  book: string;
  bookName: string;
  bookNameRw: string;
  chapter: number;
  verse: number;
  text: string;
  bookmarked: boolean;
  highlighted: boolean;
  note: string;
  updatedAt: string;
};

const BIBLE_PREFERENCES_KEY = "reverence:bible:preferences";
const BIBLE_SAVED_KEY = "reverence:bible:saved";
const BIBLE_SEARCH_HISTORY_KEY = "reverence:bible:search-history";
const defaultBiblePreferences: BibleReaderPreferences = { fontSize: 20, lineHeight: "comfortable", theme: "light", width: "wide" };

export function BibleReader() {
  const [version, setVersion] = useState("bysb");
  const [compare, setCompare] = useState("");
  const [book, setBook] = useState("");
  const [chapterInput, setChapterInput] = useState("");
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [readingStarted, setReadingStarted] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [verseSearchResults, setVerseSearchResults] = useState<BibleSearchResult[]>([]);
  const [verseSearchTotal, setVerseSearchTotal] = useState(0);
  const [searchingBible, setSearchingBible] = useState(false);
  const [bibleSearchError, setBibleSearchError] = useState("");
  const [searchScope, setSearchScope] = useState<"all" | "old" | "new" | "book">("all");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showBookPicker, setShowBookPicker] = useState(true);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [showVersePicker, setShowVersePicker] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [activeVerseNumber, setActiveVerseNumber] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [readerPreferences, setReaderPreferences] = useState<BibleReaderPreferences>(defaultBiblePreferences);
  const [savedVerses, setSavedVerses] = useState<BibleSavedVerse[]>([]);
  const [mobileCompareView, setMobileCompareView] = useState<"primary" | "compare" | "both">("both");
  const [readerAnnouncement, setReaderAnnouncement] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<BibleResult | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const readerScrollRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const readerDialogRef = useDialogFocusTrap<HTMLElement>(showReader && !showAppearance && activeVerseNumber === null, closeReaderToBookSelection);

  const selectedBook = bibleBooks.find((item) => item.code === book) ?? null;
  const chapter = Number(chapterInput) || 0;
  const canGoPrevious = Boolean(selectedBook && chapter > 1);
  const canGoNext = Boolean(selectedBook && chapter >= 1 && chapter < selectedBook.chapters);
  const primaryVersion = bibleVersions.find((item) => item.key === version) ?? bibleVersions[0];
  const useKinyarwanda = ["BYSB", "BIR"].includes(primaryVersion.code.toUpperCase());
  const copy = getBibleReaderCopy(useKinyarwanda);
  const normalizedBookSearch = bookSearch.trim().toLowerCase();
  const scopedBookCode = book;
  const matchingBooks = bibleBooks.filter((item, index) => {
    const matchesScope = searchScope === "all" || (searchScope === "old" && index < 39) || (searchScope === "new" && index >= 39) || (searchScope === "book" && item.code === scopedBookCode);
    return matchesScope && (!normalizedBookSearch || `${item.name} ${item.nameRw}`.toLowerCase().includes(normalizedBookSearch));
  });
  const oldTestamentBooks = matchingBooks.filter((item) => bibleBooks.indexOf(item) < 39);
  const newTestamentBooks = matchingBooks.filter((item) => bibleBooks.indexOf(item) >= 39);

  const filteredPrimary = useMemo(() => filterVerses(result?.primary.verses ?? [], search), [result, search]);
  const filteredCompare = useMemo(() => filterVerses(result?.compare?.verses ?? [], search), [result, search]);
  const mobileCompareRows = useMemo(() => {
    if (!result?.compare) return [];
    const compareByVerse = new Map(filteredCompare.map((verse) => [verse.number, verse]));
    return filteredPrimary.map((primaryVerse) => ({
      number: primaryVerse.number,
      primary: primaryVerse,
      compare: compareByVerse.get(primaryVerse.number),
    }));
  }, [filteredCompare, filteredPrimary, result]);
  const currentBookmarkedVerses = useMemo(() => new Set(savedVerses.filter((item) => item.version === version && item.book === book && item.chapter === chapter && item.bookmarked).map((item) => item.verse)), [book, chapter, savedVerses, version]);
  const currentHighlightedVerses = useMemo(() => new Set(savedVerses.filter((item) => item.version === version && item.book === book && item.chapter === chapter && item.highlighted).map((item) => item.verse)), [book, chapter, savedVerses, version]);
  const activeVerse = activeVerseNumber === null ? null : result?.primary.verses.find((item) => item.number === activeVerseNumber) ?? null;
  const activeSavedVerse = activeVerseNumber === null ? null : savedVerses.find((item) => item.id === bibleSavedVerseId(version, book, chapter, activeVerseNumber)) ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setReaderPreferences(readBibleStorage(BIBLE_PREFERENCES_KEY, defaultBiblePreferences));
      setSavedVerses(readBibleStorage<BibleSavedVerse[]>(BIBLE_SAVED_KEY, []));
      setSearchHistory(readBibleStorage<string[]>(BIBLE_SEARCH_HISTORY_KEY, []));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const query = bookSearch.trim();
    if (query.length < 3) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingBible(true);
      setBibleSearchError("");
      try {
        const params = new URLSearchParams({ version, q: query, scope: searchScope });
        if (searchScope === "book" && scopedBookCode) params.set("book", scopedBookCode);
        const response = await fetch(`/api/bible/search?${params.toString()}`, {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        const data = (await response.json()) as { ok?: boolean; results?: BibleSearchResult[]; total?: number; message?: string };
        if (!response.ok || data.ok === false) throw new Error(data.message || "Unable to search this Bible version right now.");
        setVerseSearchResults(data.results ?? []);
        setVerseSearchTotal(data.total ?? 0);
        if ((data.total ?? 0) > 0) {
          setSearchHistory((current) => {
            const next = [query, ...current.filter((item) => item.toLocaleLowerCase() !== query.toLocaleLowerCase())].slice(0, 6);
            writeBibleStorage(BIBLE_SEARCH_HISTORY_KEY, next);
            return next;
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setVerseSearchResults([]);
        setVerseSearchTotal(0);
        setBibleSearchError(error instanceof Error ? error.message : "Unable to search this Bible version right now.");
      } finally {
        if (!controller.signal.aborted) setSearchingBible(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [bookSearch, scopedBookCode, searchScope, version]);

  useEffect(() => {
    if (!showReader || !result) return;
    const timeout = window.setTimeout(() => {
      if (!selectedVerse) return;
      const isMobileComparison = result.compare && window.matchMedia("(max-width: 1279px)").matches;
      const targetId = isMobileComparison
        ? mobileCompareView === "both" ? `bible-mobile-verse-${selectedVerse}` : `bible-mobile-${mobileCompareView}-verse-${selectedVerse}`
        : `bible-primary-verse-${selectedVerse}`;
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return () => window.clearTimeout(timeout);
  }, [mobileCompareView, result, selectedVerse, showReader]);

  useEffect(() => {
    if (!showChapterPicker && !showVersePicker && !showReader && !showAppearance && activeVerseNumber === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeVerseNumber, showAppearance, showChapterPicker, showVersePicker, showReader]);

  useEffect(() => {
    if (!showAppearance && activeVerseNumber === null) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (activeVerseNumber !== null) setActiveVerseNumber(null);
      else setShowAppearance(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeVerseNumber, showAppearance]);

  async function loadChapter(
    nextChapter: number,
    overrides: { book?: string; version?: string; compare?: string; preserveReading?: boolean; openVersePicker?: boolean } = {},
  ) {
    const targetBookCode = overrides.book ?? book;
    const targetBook = bibleBooks.find((item) => item.code === targetBookCode);
    const targetVersion = overrides.version ?? version;
    const targetCompare = overrides.compare ?? compare;
    if (!targetBook || nextChapter < 1 || nextChapter > targetBook.chapters) {
      setNotice("Please choose a valid book and chapter.");
      return false;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setNotice("");
    if (!overrides.preserveReading) {
      setSelectedVerse(null);
      setReadingStarted(false);
    }
    try {
      const params = new URLSearchParams({
        version: targetVersion,
        book: targetBookCode,
        chapter: String(nextChapter),
      });
      if (targetCompare) params.set("compare", targetCompare);

      const response = await fetch(`/api/bible/chapter?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      const data = (await response.json()) as (BibleResult & { ok?: boolean; message?: string });

      if (!response.ok || data.ok === false) {
        throw new Error(data.message || "Unable to load the selected chapter right now.");
      }

      if (requestId !== requestIdRef.current) return false;
      setBook(targetBookCode);
      setChapterInput(String(nextChapter));
      setSearch("");
      setResult(data);
      setReaderAnnouncement(`${targetBook.name} ${nextChapter} loaded.`);
      if (overrides.openVersePicker !== false) setShowVersePicker(true);
      return true;
    } catch (error) {
      if (requestId !== requestIdRef.current) return false;
      setResult(null);
      setNotice(error instanceof Error ? error.message : "Unable to load the selected chapter right now.");
      return false;
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  function changeBook(nextBook: string) {
    const selected = bibleBooks.find((item) => item.code === nextBook);
    if (!selected) return;
    requestIdRef.current += 1;
    setBook(selected.code);
    setChapterInput("");
    setSelectedVerse(null);
    setReadingStarted(false);
    setResult(null);
    setNotice("");
    setSearch("");
    setShowBookPicker(false);
    setShowChapterPicker(true);
    setShowVersePicker(false);
    setShowReader(false);
  }

  function changeBookSearch(nextSearch: string) {
    setBookSearch(nextSearch);
    if (nextSearch.trim().length >= 3) return;
    setVerseSearchResults([]);
    setVerseSearchTotal(0);
    setSearchingBible(false);
    setBibleSearchError("");
  }

  function updateReaderPreferences(next: Partial<BibleReaderPreferences>) {
    setReaderPreferences((current) => {
      const updated = { ...current, ...next };
      writeBibleStorage(BIBLE_PREFERENCES_KEY, updated);
      return updated;
    });
  }

  function openVerseActions(verseNumber: number) {
    const verse = result?.primary.verses.find((item) => item.number === verseNumber);
    if (!verse) return;
    const id = bibleSavedVerseId(version, result?.book ?? book, result?.chapter ?? chapter, verseNumber);
    setSelectedVerse(verseNumber);
    setActiveVerseNumber(verseNumber);
    setReaderAnnouncement("");
    setNoteDraft(savedVerses.find((item) => item.id === id)?.note ?? "");
  }

  function updateSavedVerse(verseNumber: number, change: Partial<Pick<BibleSavedVerse, "bookmarked" | "highlighted" | "note">>) {
    const verse = result?.primary.verses.find((item) => item.number === verseNumber);
    if (!verse || !selectedBook || !result) return;
    const id = bibleSavedVerseId(version, selectedBook.code, result.chapter, verseNumber);
    setSavedVerses((current) => {
      const existing = current.find((item) => item.id === id);
      const updated: BibleSavedVerse = {
        id,
        version,
        versionCode: result.primary.version.code,
        book: selectedBook.code,
        bookName: selectedBook.name,
        bookNameRw: selectedBook.nameRw,
        chapter: result.chapter,
        verse: verseNumber,
        text: verse.text,
        bookmarked: false,
        highlighted: false,
        note: "",
        updatedAt: new Date().toISOString(),
        ...existing,
        ...change,
      };
      const next = !updated.bookmarked && !updated.highlighted && !updated.note.trim()
        ? current.filter((item) => item.id !== id)
        : [updated, ...current.filter((item) => item.id !== id)];
      writeBibleStorage(BIBLE_SAVED_KEY, next);
      return next;
    });
  }

  async function copyActiveVerse() {
    if (!activeVerse || !selectedBook || !result) return;
    await navigator.clipboard.writeText(`${useKinyarwanda ? selectedBook.nameRw : selectedBook.name} ${result.chapter}:${activeVerse.number} — ${activeVerse.text} (${result.primary.version.code})`);
    setReaderAnnouncement(copy.copiedVerse);
  }

  async function shareActiveVerse() {
    if (!activeVerse || !selectedBook || !result) return;
    const shareText = `${useKinyarwanda ? selectedBook.nameRw : selectedBook.name} ${result.chapter}:${activeVerse.number} — ${activeVerse.text} (${result.primary.version.code})`;
    if (navigator.share) {
      try { await navigator.share({ text: shareText }); } catch { return; }
    } else {
      await navigator.clipboard.writeText(shareText);
      setReaderAnnouncement(copy.copiedVerse);
    }
  }

  function handleReaderTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function handleReaderTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 80 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;
    if (deltaX < 0 && canGoNext) void navigateReaderChapter(chapter + 1);
    if (deltaX > 0 && canGoPrevious) void navigateReaderChapter(chapter - 1);
  }

  function changeVersion(nextVersion: string) {
    requestIdRef.current += 1;
    setVersion(nextVersion);
    if (compare === nextVersion) {
      setCompare("");
    }
    setBook("");
    setChapterInput("");
    setSelectedVerse(null);
    setReadingStarted(false);
    changeBookSearch("");
    setShowBookPicker(true);
    setShowChapterPicker(false);
    setShowVersePicker(false);
    setShowReader(false);
    setSearch("");
    setResult(null);
    setNotice("");
    setLoading(false);
  }

  function changeCompare(nextCompare: string) {
    setCompare(nextCompare);
    if (result && selectedBook && chapter) void loadChapter(chapter, { compare: nextCompare, preserveReading: true, openVersePicker: false });
  }

  function jumpToVerse(verseNumber: number | null) {
    setSearch("");
    setSelectedVerse(verseNumber);
    setReadingStarted(true);
    setShowVersePicker(false);
    setShowReader(true);
  }

  function closeReaderToBookSelection() {
    requestIdRef.current += 1;
    setShowReader(false);
    setShowAppearance(false);
    setActiveVerseNumber(null);
    setShowVersePicker(false);
    setShowChapterPicker(false);
    setShowBookPicker(true);
    setBook("");
    setChapterInput("");
    setSelectedVerse(null);
    setReadingStarted(false);
    changeBookSearch("");
    setSearch("");
    setResult(null);
    setNotice("");
    setLoading(false);
  }

  async function navigateReaderChapter(nextChapter: number) {
    setSelectedVerse(null);
    setReadingStarted(true);
    setSearch("");
    const loaded = await loadChapter(nextChapter, { preserveReading: true, openVersePicker: false });
    if (loaded) readerScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openBibleSearchResult(match: BibleSearchResult) {
    setShowBookPicker(false);
    setShowChapterPicker(false);
    setShowVersePicker(false);
    setShowReader(false);
    setBook(match.book);
    changeBookSearch("");
    setSelectedVerse(match.verse);
    setReadingStarted(true);
    const loaded = await loadChapter(match.chapter, { book: match.book, preserveReading: true, openVersePicker: false });
    if (!loaded) {
      setShowBookPicker(true);
      return;
    }
    setSelectedVerse(match.verse);
    setReadingStarted(true);
    setShowReader(true);
  }

  async function openSavedBibleVerse(item: BibleSavedVerse) {
    setVersion(item.version);
    setBook(item.book);
    setShowSaved(false);
    setShowBookPicker(false);
    const loaded = await loadChapter(item.chapter, { book: item.book, version: item.version, preserveReading: true, openVersePicker: false });
    if (!loaded) return;
    setSelectedVerse(item.verse);
    setReadingStarted(true);
    setShowReader(true);
  }

  return (
    <>
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:rounded-[28px]">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_36%),linear-gradient(180deg,_#ffffff,_#f8fbff)] px-3 py-4 sm:px-8 sm:py-6 lg:px-10 lg:py-7">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md sm:size-10">
            <BookOpen className="size-4 sm:size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{copy.heading}</h2>
            <p className="text-sm text-slate-500"></p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-blue-100 bg-white/90 p-3 shadow-sm sm:mt-5 sm:rounded-3xl sm:p-6 lg:p-7">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-900 sm:text-sm">{useKinyarwanda ? "Bibiliya" : "Translation"}</span>
              <select value={version} onChange={(event) => changeVersion(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm sm:focus:ring-4">
                {bibleVersions.map((item) => (
                  <option key={item.key} value={item.key}>{item.code} ({item.label})</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-900 sm:text-sm">{useKinyarwanda ? "Gereranya (ntabwo ari ngombwa)" : "Compare (optional)"}</span>
              <select value={compare} onChange={(event) => changeCompare(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-auto sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm sm:focus:ring-4">
                <option value="">None</option>
                {bibleVersions.filter((item) => item.key !== version).map((item) => (
                  <option key={item.key} value={item.key}>{item.code} ({item.label})</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700">{primaryVersion.code}</span>
            <span aria-hidden="true">›</span>
            <span className={`rounded-full px-3 py-1.5 ${selectedBook ? "bg-indigo-100 text-indigo-700" : "bg-slate-100"}`}>{selectedBook ? useKinyarwanda ? selectedBook.nameRw : selectedBook.name : copy.chooseBook}</span>
            {chapter ? <><span aria-hidden="true">›</span><span className="rounded-full bg-violet-100 px-3 py-1.5 text-violet-700">{copy.chapter} {chapter}</span></> : null}
            {selectedVerse ? <><span aria-hidden="true">›</span><span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-700">{copy.verse} {selectedVerse}</span></> : null}
          </div>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-8 sm:py-6 lg:px-10">
        {notice ? <ActionNotice message={notice} tone="warning" onClose={() => setNotice("")} className="mb-4" /> : null}

        {showBookPicker || !selectedBook ? (
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:rounded-3xl sm:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{copy.stepTwo}</p><div className="mt-2 flex gap-2"><button type="button" aria-pressed={!showSaved} onClick={() => setShowSaved(false)} className={`rounded-lg px-3 py-2 text-sm font-bold ${!showSaved ? "bg-blue-700 text-white" : "bg-white text-slate-600"}`}>{copy.books}</button><button type="button" aria-pressed={showSaved} onClick={() => setShowSaved(true)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${showSaved ? "bg-blue-700 text-white" : "bg-white text-slate-600"}`}><BookMarked className="size-4" aria-hidden="true" />{copy.saved} ({savedVerses.length})</button></div></div>
              {!showSaved ? <label className="relative w-full sm:max-w-sm"><span className="sr-only">{copy.searchBible}</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={bookSearch} onChange={(event) => changeBookSearch(event.target.value)} placeholder={copy.searchBible} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label> : null}
            </div>
            {!showSaved ? <div className="mt-3 flex flex-wrap items-center gap-2"><select value={searchScope} onChange={(event) => setSearchScope(event.target.value as typeof searchScope)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600"><option value="all">{copy.allBible}</option><option value="old">{copy.oldTestament}</option><option value="new">{copy.newTestament}</option><option value="book" disabled={!scopedBookCode}>{copy.currentBook}</option></select>{!bookSearch && searchHistory.map((item) => <button key={item} type="button" onClick={() => changeBookSearch(item)} className="rounded-full bg-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-blue-100 hover:text-blue-700">{item}</button>)}</div> : null}
            <div className="mt-4 max-h-[430px] space-y-5 overflow-y-auto pr-1">
              {showSaved ? savedVerses.length ? (
                <section>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{copy.savedVerses}</h4>
                  <div className="space-y-2">
                    {savedVerses.map((item) => (
                      <button key={item.id} type="button" onClick={() => void openSavedBibleVerse(item)} className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300">
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-bold text-blue-700">{useKinyarwanda ? item.bookNameRw : item.bookName} {item.chapter}:{item.verse}</span>
                          <span className="flex gap-1">
                            {item.bookmarked ? <Bookmark className="size-4 fill-blue-600 text-blue-600" aria-label={copy.bookmarked} /> : null}
                            {item.highlighted ? <Highlighter className="size-4 text-amber-500" aria-label={copy.highlighted} /> : null}
                            {item.note ? <StickyNote className="size-4 text-violet-600" aria-label={copy.hasNote} /> : null}
                          </span>
                        </span>
                        <span className="mt-1 block line-clamp-2 text-sm text-slate-600">{item.text}</span>
                        {item.note ? <span className="mt-2 block rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700">{item.note}</span> : null}
                      </button>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">{copy.noSavedVerses}</div>
              ) : null}
              {!showSaved ? <>
              {normalizedBookSearch.length >= 3 ? (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{copy.verseResults}</h4>
                    {searchingBible ? <span className="text-xs text-slate-400">{copy.searching}</span> : verseSearchTotal > 0 ? <span className="text-xs text-slate-400">{verseSearchTotal} {copy.matches}</span> : null}
                  </div>
                  {bibleSearchError ? <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{bibleSearchError}</p> : verseSearchResults.length ? (
                    <div className="space-y-2">
                      {verseSearchResults.map((match) => (
                        <button key={`${match.book}-${match.chapter}-${match.verse}`} type="button" onClick={() => void openBibleSearchResult(match)} className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:px-4">
                          <span className="flex items-center justify-between gap-3">
                            <span className="font-bold text-blue-700">{useKinyarwanda ? match.bookNameRw : match.bookName} {match.chapter}:{match.verse}</span>
                            <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600">{primaryVersion.code}</span>
                          </span>
                          {match.previousText ? <span className="mt-2 block line-clamp-1 text-xs text-slate-400">← {match.previousText}</span> : null}
                          <span className="mt-1 block line-clamp-2 text-sm leading-5 text-slate-600">{highlightBibleSearchTerms(match.text, bookSearch)}</span>
                          {match.nextText ? <span className="mt-1 block line-clamp-1 text-xs text-slate-400">→ {match.nextText}</span> : null}
                        </button>
                      ))}
                      {verseSearchTotal > verseSearchResults.length ? <p className="px-2 text-xs text-slate-400">{copy.showingFirst} {verseSearchResults.length} {copy.matches}.</p> : null}
                    </div>
                  ) : !searchingBible ? <p className="rounded-xl bg-white px-4 py-4 text-sm text-slate-500">{copy.noVerseResults}</p> : <div className="rounded-xl bg-white px-4 py-6 text-center text-sm text-slate-400">{copy.searching}</div>}
                </section>
              ) : null}
              <BibleBookButtonGroup title={copy.oldTestament} books={oldTestamentBooks} selectedBook={book} useKinyarwanda={useKinyarwanda} onSelect={changeBook} />
              <BibleBookButtonGroup title={copy.newTestament} books={newTestamentBooks} selectedBook={book} useKinyarwanda={useKinyarwanda} onSelect={changeBook} />
              {!matchingBooks.length && normalizedBookSearch.length < 3 ? <p className="rounded-xl bg-white px-4 py-8 text-center text-sm text-slate-500">{copy.noBooks}</p> : null}
              </> : null}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 sm:rounded-3xl sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">{copy.selectedPassage}</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {useKinyarwanda ? selectedBook.nameRw : selectedBook.name}{chapter ? ` ${chapter}` : ""}{selectedVerse ? `:${selectedVerse}` : ""}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{chapter ? result?.primary.version.label ?? primaryVersion.label : `${selectedBook.chapters} ${selectedBook.chapters === 1 ? copy.chapter.toLowerCase() : copy.chapters.toLowerCase()}`}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                <button type="button" onClick={() => { setShowBookPicker(true); setShowChapterPicker(false); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">{copy.changeBook}</button>
                <button type="button" onClick={() => setShowChapterPicker(true)} className="rounded-xl border border-indigo-200 bg-white px-3 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">{chapter ? copy.changeChapter : copy.chooseChapter}</button>
                {result ? <button type="button" onClick={() => setShowVersePicker(true)} className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">{selectedVerse ? copy.changeVerse : copy.chooseVerse}</button> : null}
                {readingStarted && result ? <button type="button" onClick={() => setShowReader(true)} className="rounded-xl bg-blue-700 px-3 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-800">{copy.openReader}</button> : null}
              </div>
            </div>
            {loading ? <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">{copy.loading}</div> : !chapter ? <div className="mt-4 rounded-2xl border border-dashed border-indigo-200 bg-white/70 px-5 py-8 text-center text-sm text-slate-500">{copy.chapterPrompt}</div> : !readingStarted ? <div className="mt-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 px-5 py-8 text-center text-sm text-slate-600">{copy.chooseStartingVersePrompt}</div> : null}
          </section>
        )}
      </div>
    </div>
    {showChapterPicker && selectedBook ? (
      <BibleNumberPickerModal
        eyebrow={copy.stepThree}
        title={`${useKinyarwanda ? selectedBook.nameRw : selectedBook.name} · ${copy.chooseChapter}`}
        subtitle={`${selectedBook.chapters} ${selectedBook.chapters === 1 ? copy.chapter.toLowerCase() : copy.chapters.toLowerCase()}`}
        numbers={Array.from({ length: selectedBook.chapters }, (_, index) => index + 1)}
        selected={chapter || null}
        tone="indigo"
        onClose={() => setShowChapterPicker(false)}
        onSelect={(number) => { setShowChapterPicker(false); void loadChapter(number); }}
      />
    ) : null}
    {showVersePicker && result ? (
      <BibleNumberPickerModal
        eyebrow={copy.stepFour}
        title={`${useKinyarwanda ? selectedBook?.nameRw : selectedBook?.name} ${result.chapter} · ${copy.chooseVerse}`}
        subtitle={copy.versePickerHint}
        numbers={result.primary.verses.map((verse) => verse.number)}
        selected={selectedVerse}
        tone="amber"
        startLabel={copy.fromBeginning}
        onStart={() => jumpToVerse(null)}
        onClose={() => setShowVersePicker(false)}
        onSelect={jumpToVerse}
      />
    ) : null}
    {showReader && result && selectedBook ? (
      <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
        <button type="button" className="absolute inset-0 cursor-default" aria-label={copy.closeReader} onClick={closeReaderToBookSelection} />
        <section ref={readerDialogRef} role="dialog" aria-modal="true" aria-busy={loading} aria-label={`${useKinyarwanda ? selectedBook.nameRw : selectedBook.name} ${result.chapter}`} className={`relative flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl ${readerPreferences.theme === "dark" ? "bg-slate-950 text-slate-100" : readerPreferences.theme === "sepia" ? "bg-[#f6edda]" : "bg-slate-50"}`}>
          <header className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6 sm:py-4 ${readerPreferences.theme === "dark" ? "border-slate-700 bg-slate-900" : readerPreferences.theme === "sepia" ? "border-amber-200 bg-[#fff8e8]" : "border-slate-200 bg-white"}`}>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{copy.fullChapter}</p>
              <h3 className={`truncate text-lg font-bold sm:text-xl ${readerPreferences.theme === "dark" ? "text-white" : "text-slate-900"}`}>{useKinyarwanda ? selectedBook.nameRw : selectedBook.name} {result.chapter}{selectedVerse ? `:${selectedVerse}` : ""}</h3>
            </div>
            <button type="button" onClick={closeReaderToBookSelection} aria-label={copy.closeReader} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="size-5" aria-hidden="true" /></button>
          </header>
          <div className={`shrink-0 border-b px-3 py-3 sm:px-6 sm:py-4 ${readerPreferences.theme === "dark" ? "border-slate-700 bg-slate-900" : readerPreferences.theme === "sepia" ? "border-amber-200 bg-[#f6edda]" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { setShowReader(false); setShowChapterPicker(true); }} aria-label={copy.changeChapter} title={copy.changeChapter} className="inline-flex size-10 items-center justify-center rounded-xl border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"><LayoutGrid className="size-4" aria-hidden="true" /></button>
              <button type="button" onClick={() => { setShowReader(false); setShowVersePicker(true); }} aria-label={copy.changeVerse} title={copy.changeVerse} className="inline-flex size-10 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700 hover:bg-amber-50"><Hash className="size-4" aria-hidden="true" /></button>
              <button type="button" onClick={() => void navigateReaderChapter(chapter - 1)} disabled={!canGoPrevious || loading} aria-label={copy.previous} title={copy.previous} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="size-5" aria-hidden="true" /></button>
              <button type="button" onClick={() => void navigateReaderChapter(chapter + 1)} disabled={!canGoNext || loading} aria-label={copy.next} title={copy.next} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="size-5" aria-hidden="true" /></button>
              <button type="button" onClick={() => setShowAppearance(true)} aria-label={copy.readingAppearance} title={copy.readingAppearance} className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"><Type className="size-4" aria-hidden="true" /></button>
            </div>
            {result.compare ? <div className="mt-3 flex rounded-xl border border-slate-200 bg-white p-1 xl:hidden">{(["primary", "compare", "both"] as const).map((mode) => <button key={mode} type="button" aria-pressed={mobileCompareView === mode} onClick={() => setMobileCompareView(mode)} className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-semibold ${mobileCompareView === mode ? "bg-blue-700 text-white" : "text-slate-600"}`}>{mode === "primary" ? result.primary.version.code : mode === "compare" ? result.compare?.version.code : copy.both}</button>)}</div> : null}
            <label className="mt-3 block"><span className="sr-only">{copy.searchLabel}</span><div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"><Search className="size-4 shrink-0 text-blue-700" aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder={copy.searchPlaceholder} className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" /></div></label>
          </div>
          <div ref={readerScrollRef} onTouchStart={handleReaderTouchStart} onTouchEnd={handleReaderTouchEnd} className="overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6">
            <div className={readerPreferences.width === "focused" ? "mx-auto max-w-3xl" : "mx-auto max-w-6xl"}>
            {result.compare && mobileCompareView === "both" ? (
              <div className="space-y-3 xl:hidden">
                {mobileCompareRows.length ? mobileCompareRows.map((row) => <BibleCompareVerseCard key={row.number} primary={row.primary} compare={row.compare} primaryLabel={result.primary.version.code} compareLabel={result.compare?.version.code ?? "Compare"} selected={selectedVerse === row.number} highlighted={currentHighlightedVerses.has(row.number)} preferences={readerPreferences} onSelect={openVerseActions} />) : <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-500">{copy.noMatchingVerses}</p>}
              </div>
            ) : null}
            {result.compare && mobileCompareView !== "both" ? <div className="xl:hidden"><BibleChapterPanel chapter={mobileCompareView === "primary" ? result.primary : result.compare} verses={mobileCompareView === "primary" ? filteredPrimary : filteredCompare} badge={mobileCompareView === "primary" ? "Primary" : "Compare"} tone={mobileCompareView === "primary" ? "blue" : "amber"} selectedVerse={selectedVerse} idPrefix={`bible-mobile-${mobileCompareView}`} bookmarkedVerses={currentBookmarkedVerses} highlightedVerses={currentHighlightedVerses} preferences={readerPreferences} onVerseSelect={openVerseActions} /></div> : null}
            <div className={`grid gap-4 ${result.compare ? "hidden xl:grid xl:grid-cols-2" : "xl:grid-cols-1"}`}>
              <BibleChapterPanel chapter={result.primary} verses={filteredPrimary} badge="Primary" tone="blue" selectedVerse={selectedVerse} idPrefix="bible-primary" bookmarkedVerses={currentBookmarkedVerses} highlightedVerses={currentHighlightedVerses} preferences={readerPreferences} onVerseSelect={openVerseActions} />
              {result.compare ? <BibleChapterPanel chapter={result.compare} verses={filteredCompare} badge="Compare" tone="amber" selectedVerse={selectedVerse} idPrefix="bible-compare" bookmarkedVerses={currentBookmarkedVerses} highlightedVerses={currentHighlightedVerses} preferences={readerPreferences} onVerseSelect={openVerseActions} /> : null}
            </div>
            </div>
          </div>
        </section>
      </div>
    ) : null}
    {showAppearance ? <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-5"><button type="button" className="absolute inset-0" aria-label={copy.closeAppearance} onClick={() => setShowAppearance(false)} /><section role="dialog" aria-modal="true" aria-label={copy.readingAppearance} className="relative w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-slate-900">{copy.readingAppearance}</h3><button type="button" onClick={() => setShowAppearance(false)} className="flex size-10 items-center justify-center rounded-full border border-slate-200"><X className="size-5" /></button></div><div className="mt-5 space-y-5"><div><p className="mb-2 text-sm font-semibold text-slate-700">{copy.fontSize}</p><div className="flex items-center gap-3"><button type="button" onClick={() => updateReaderPreferences({ fontSize: Math.max(16, readerPreferences.fontSize - 1) })} className="size-11 rounded-xl border border-slate-200 text-lg font-bold">−</button><div className="flex-1 text-center text-lg font-bold">{readerPreferences.fontSize}px</div><button type="button" onClick={() => updateReaderPreferences({ fontSize: Math.min(28, readerPreferences.fontSize + 1) })} className="size-11 rounded-xl border border-slate-200 text-lg font-bold">+</button></div></div><BibleSettingButtons label={copy.lineSpacing} values={["compact", "comfortable", "spacious"]} selected={readerPreferences.lineHeight} onSelect={(value) => updateReaderPreferences({ lineHeight: value as BibleReaderPreferences["lineHeight"] })} /><BibleSettingButtons label={copy.readerTheme} values={["light", "sepia", "dark"]} selected={readerPreferences.theme} onSelect={(value) => updateReaderPreferences({ theme: value as BibleReaderPreferences["theme"] })} /><BibleSettingButtons label={copy.textWidth} values={["focused", "wide"]} selected={readerPreferences.width} onSelect={(value) => updateReaderPreferences({ width: value as BibleReaderPreferences["width"] })} /></div></section></div> : null}
    {activeVerse && result && selectedBook ? <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-5"><button type="button" className="absolute inset-0" aria-label={copy.closeVerseActions} onClick={() => setActiveVerseNumber(null)} /><section role="dialog" aria-modal="true" aria-label={`${copy.verse} ${activeVerse.number}`} className="relative w-full max-w-xl rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">{useKinyarwanda ? selectedBook.nameRw : selectedBook.name} {result.chapter}:{activeVerse.number}</p><p className="mt-2 text-lg leading-8 text-slate-800">{activeVerse.text}</p></div><button type="button" onClick={() => setActiveVerseNumber(null)} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200"><X className="size-5" /></button></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><button type="button" onClick={() => void copyActiveVerse()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold"><Copy className="size-4" />{copy.copyVerse}</button><button type="button" onClick={() => void shareActiveVerse()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold"><Share2 className="size-4" />{copy.shareVerse}</button><button type="button" onClick={() => updateSavedVerse(activeVerse.number, { bookmarked: !activeSavedVerse?.bookmarked })} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${activeSavedVerse?.bookmarked ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200"}`}><Bookmark className={`size-4 ${activeSavedVerse?.bookmarked ? "fill-current" : ""}`} />{copy.bookmark}</button><button type="button" onClick={() => updateSavedVerse(activeVerse.number, { highlighted: !activeSavedVerse?.highlighted })} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${activeSavedVerse?.highlighted ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200"}`}><Highlighter className="size-4" />{copy.highlight}</button></div><label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-slate-700">{copy.personalNote}</span><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} rows={3} placeholder={copy.notePlaceholder} className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><button type="button" onClick={() => { updateSavedVerse(activeVerse.number, { note: noteDraft.trim() }); setActiveVerseNumber(null); }} className="mt-3 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white">{copy.saveNote}</button>{readerAnnouncement ? <p className="mt-3 text-center text-xs font-semibold text-green-700">{readerAnnouncement}</p> : null}</section></div> : null}
    <p className="sr-only" aria-live="polite">{readerAnnouncement}</p>
    </>
  );
}

function BibleNumberPickerModal({
  eyebrow,
  title,
  subtitle,
  numbers,
  selected,
  tone,
  startLabel,
  onStart,
  onClose,
  onSelect,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  numbers: number[];
  selected: number | null;
  tone: "indigo" | "amber";
  startLabel?: string;
  onStart?: () => void;
  onClose: () => void;
  onSelect: (number: number) => void;
}) {
  const dialogRef = useDialogFocusTrap<HTMLElement>(true, onClose);
  const selectedStyle = tone === "indigo" ? "bg-indigo-700 text-white shadow-md" : "bg-amber-500 text-white shadow-md";
  const idleStyle = tone === "indigo" ? "border-indigo-100 bg-white text-indigo-800 hover:border-indigo-300 hover:bg-indigo-50" : "border-amber-200 bg-white text-amber-800 hover:bg-amber-50";
  const eyebrowStyle = tone === "indigo" ? "text-indigo-600" : "text-amber-700";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close selection" onClick={onClose} />
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className="relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[82dvh] sm:rounded-3xl">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-[0.16em] ${eyebrowStyle}`}>{eyebrow}</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close selection" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="size-5" aria-hidden="true" /></button>
        </header>
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-6">
          {startLabel && onStart ? <button type="button" onClick={onStart} className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">{startLabel}</button> : null}
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {numbers.map((number) => (
              <button key={number} type="button" aria-pressed={selected === number} onClick={() => onSelect(number)} className={`aspect-square min-h-11 rounded-xl border text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${selected === number ? selectedStyle : idleStyle}`}>{number}</button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function BibleBookButtonGroup({ title, books, selectedBook, useKinyarwanda, onSelect }: { title: string; books: typeof bibleBooks; selectedBook: string; useKinyarwanda: boolean; onSelect: (bookCode: string) => void }) {
  if (!books.length) return null;
  return (
    <section>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{title}</h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {books.map((item) => (
          <button key={item.code} type="button" aria-pressed={selectedBook === item.code} onClick={() => onSelect(item.code)} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${selectedBook === item.code ? "border-blue-700 bg-blue-700 text-white shadow-md" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"}`}>
            <span className="block truncate">{useKinyarwanda ? item.nameRw : item.name}</span>
            <span className={`mt-0.5 block text-[10px] font-medium ${selectedBook === item.code ? "text-blue-100" : "text-slate-400"}`}>{item.chapters} ch.</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function BibleSettingButtons({ label, values, selected, onSelect }: { label: string; values: string[]; selected: string; onSelect: (value: string) => void }) {
  return <div><p className="mb-2 text-sm font-semibold text-slate-700">{label}</p><div className="grid grid-cols-3 gap-2">{values.map((value) => <button key={value} type="button" aria-pressed={selected === value} onClick={() => onSelect(value)} className={`min-h-11 rounded-xl border px-2 text-xs font-semibold capitalize ${selected === value ? "border-blue-700 bg-blue-700 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{value}</button>)}</div></div>;
}

function BibleChapterPanel({ chapter, verses, badge, tone, selectedVerse, idPrefix, bookmarkedVerses, highlightedVerses, preferences, onVerseSelect }: { chapter: BibleChapter; verses: BibleVerse[]; badge: string; tone: "blue" | "amber"; selectedVerse: number | null; idPrefix: string; bookmarkedVerses: Set<number>; highlightedVerses: Set<number>; preferences: BibleReaderPreferences; onVerseSelect: (verse: number) => void }) {
  const border = tone === "blue" ? "border-blue-500" : "border-amber-500";
  const badgeStyle = tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
  const panelStyle = preferences.theme === "dark" ? "border-slate-700 bg-slate-900 text-slate-100" : preferences.theme === "sepia" ? "border-amber-200 bg-[#fff8e8]" : "border-slate-200 bg-white";
  const textStyle = preferences.theme === "dark" ? "text-slate-200" : "text-slate-700";
  const lineHeight = preferences.lineHeight === "compact" ? 1.5 : preferences.lineHeight === "spacious" ? 2 : 1.75;

  return (
    <section className={`rounded-2xl border p-3 shadow-sm sm:rounded-3xl sm:p-4 ${panelStyle}`}>
      <div className={`mb-4 flex items-center justify-between gap-3 border-l-4 pl-3 ${border}`}>
        <div className="min-w-0">
          <h4 className={`truncate text-base font-bold sm:text-lg ${preferences.theme === "dark" ? "text-white" : "text-slate-900"}`}>{chapter.version.code} - {chapter.version.label}</h4>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400 sm:tracking-[0.24em]">Translation</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:px-3 ${badgeStyle}`}>{badge}</span>
      </div>
      <div className="space-y-2.5 sm:space-y-3">
        {verses.length ? verses.map((verse) => (
          <button key={verse.number} type="button" id={`${idPrefix}-verse-${verse.number}`} onClick={() => onVerseSelect(verse.number)} style={{ fontSize: preferences.fontSize, lineHeight }} className={`block w-full scroll-mt-24 rounded-xl px-2 py-1 text-left transition motion-reduce:scroll-auto ${textStyle} ${highlightedVerses.has(verse.number) ? "bg-yellow-200/80" : ""} ${selectedVerse === verse.number ? tone === "blue" ? "ring-2 ring-amber-300" : "ring-2 ring-amber-200" : ""}`}>
            <span className={`mr-2 font-bold ${preferences.theme === "dark" ? "text-white" : "text-slate-900"}`}>{verse.number}</span>
            {verse.text}
            {bookmarkedVerses.has(verse.number) ? <Bookmark className="ml-2 inline size-3.5 fill-blue-600 text-blue-600" aria-label="Bookmarked" /> : null}
          </button>
        )) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No verses match your search.</p>
        )}
      </div>
    </section>
  );
}

function BibleCompareVerseCard({ primary, compare, primaryLabel, compareLabel, selected, highlighted, preferences, onSelect }: { primary: BibleVerse; compare?: BibleVerse; primaryLabel: string; compareLabel: string; selected: boolean; highlighted: boolean; preferences: BibleReaderPreferences; onSelect: (verse: number) => void }) {
  const lineHeight = preferences.lineHeight === "compact" ? 1.5 : preferences.lineHeight === "spacious" ? 2 : 1.75;
  return (
    <button type="button" onClick={() => onSelect(primary.number)} id={`bible-mobile-verse-${primary.number}`} className={`block w-full scroll-mt-24 rounded-2xl border p-3 text-left shadow-sm transition ${preferences.theme === "dark" ? "border-slate-700 bg-slate-900" : preferences.theme === "sepia" ? "border-amber-200 bg-[#fff8e8]" : "border-slate-200 bg-white"} ${highlighted ? "bg-yellow-100" : ""} ${selected ? "ring-2 ring-amber-200" : ""}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{primary.number}</span>
        <div className="h-px flex-1 bg-slate-100" />
      </div>
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">{primaryLabel}</p>
          <p style={{ fontSize: preferences.fontSize, lineHeight }} className={preferences.theme === "dark" ? "text-slate-200" : "text-slate-800"}>{primary.text}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">{compareLabel}</p>
          <p style={{ fontSize: Math.max(16, preferences.fontSize - 1), lineHeight }} className="text-slate-700">{compare?.text ?? "No verse available in comparison."}</p>
        </div>
      </div>
    </button>
  );
}

function getBibleReaderCopy(useKinyarwanda: boolean) {
  if (useKinyarwanda) {
    return {
      heading: "Soma Bibiliya",
      searchLabel: "Shakisha muri iki gice",
      searchPlaceholder: "Shakisha muri iki gice (nibura inyuguti 2)...",
      loading: "Tegereza...",
      emptyTitle: "Hitamo igice cyo gusoma",
      emptyText: "Hitamo igice hejuru kugira ngo gitangire gusomwa.",
      stepTwo: "",
      chooseBook: "Hitamo igitabo",
      searchBooks: "Shakisha igitabo...",
      searchBible: "Shakisha igitabo, umurongo cyangwa amagambo...",
      verseResults: "Imirongo yabonetse",
      searching: "Birashakishwa...",
      matches: "ibyabonetse",
      showingFirst: "Herekanwa gusa ibya mbere",
      noVerseResults: "Nta gitabo cyangwa umurongo bihuye n'ishakisha muri iyi Bibiliya.",
      oldTestament: "Isezerano rya Kera",
      newTestament: "Isezerano Rishya",
      noBooks: "Nta gitabo gihuye n'ishakisha.",
      stepThree: "Intambwe ya 3 · Hitamo igice",
      chapter: "Igice",
      chapters: "Ibice",
      changeBook: "Hindura igitabo",
      previous: "Igice kibanza",
      next: "Igice gikurikira",
      stepFour: "Intambwe ya 4 · Umurongo",
      verse: "Umurongo",
      chooseVerse: "Hitamo umurongo",
      fromBeginning: "Tangira ku ntangiriro",
      chooseStartingVersePrompt: "Hitamo umurongo",
      selectedPassage: "Ahatoranyijwe",
      chooseChapter: "Hitamo igice",
      changeChapter: "Hindura igice",
      changeVerse: "Hindura umurongo",
      openReader: "Fungura igice",
      chapterPrompt: "Kanda Hitamo igice kugira ngo ukomeze.",
      versePickerHint: "",
      closeReader: "Funga igice",
      fullChapter: "Igice cyose",
      noMatchingVerses: "Nta mirongo ihuye n'ishakisha.",
      books: "Ibitabo",
      saved: "Ibyabitswe",
      allBible: "Bibiliya yose",
      currentBook: "Igitabo giheruka",
      bookmarked: "Byashyizwe mu bubiko",
      highlighted: "Byagaragajwe",
      hasNote: "Bifite inyandiko",
      noSavedVerses: "Nta mirongo urabika, ugaragaza cyangwa wandikaho.",
      savedVerses: "Imirongo yabitswe",
      copiedVerse: "Umurongo wandukuwe.",
      both: "Byombi",
      closeAppearance: "Funga uburyo bwo gusoma",
      readingAppearance: "Uburyo bwo gusoma",
      fontSize: "Ingano y'inyuguti",
      lineSpacing: "Intera y'imirongo",
      readerTheme: "Ibara ryo gusomeramo",
      textWidth: "Ubugari bw'inyandiko",
      closeVerseActions: "Funga ibikorwa by'umurongo",
      copyVerse: "Copy",
      shareVerse: "Share",
      bookmark: "Save",
      highlight: "Highlight",
      personalNote: "Notes",
      notePlaceholder: "Andika icyo wibutse kuri uyu murongo...",
      saveNote: "Bika inyandiko",
    };
  }

  return {
    heading: "Read Bible",
    searchLabel: "Search within this chapter",
    searchPlaceholder: "Search within this chapter (min. 2 characters)...",
    loading: "Loading chapter...",
    emptyTitle: "Choose a passage to begin",
    emptyText: "Choose a chapter above and it will load automatically.",
    stepTwo: "",
    chooseBook: "Choose a book",
    searchBooks: "Search books...",
    searchBible: "Search a book, reference, or verse text...",
    verseResults: "Verse results",
    searching: "Searching...",
    matches: "matches",
    showingFirst: "Showing the first",
    noVerseResults: "No book or verse matches this search in the selected Bible.",
    oldTestament: "Old Testament",
    newTestament: "New Testament",
    noBooks: "No books match your search.",
    stepThree: "Step 3 · Choose a chapter",
    chapter: "Chapter",
    chapters: "Chapters",
    changeBook: "Change book",
    previous: "Previous chapter",
    next: "Next chapter",
    stepFour: "Step 4 · Verse",
    verse: "Verse",
    chooseVerse: "Choose where to start reading",
    fromBeginning: "Start from beginning",
    chooseStartingVersePrompt: "Choose a starting verse above to display the chapter.",
    selectedPassage: "Selected passage",
    chooseChapter: "Choose chapter",
    changeChapter: "Change chapter",
    changeVerse: "Change starting verse",
    openReader: "Open chapter",
    chapterPrompt: "Tap Choose chapter to continue.",
    versePickerHint: "Choose where the chapter should open. Every verse will remain available.",
    closeReader: "Close chapter",
    fullChapter: "Full chapter",
    noMatchingVerses: "No verses match your search.",
    books: "Books",
    saved: "Saved",
    allBible: "Entire Bible",
    currentBook: "Current book",
    bookmarked: "Bookmarked",
    highlighted: "Highlighted",
    hasNote: "Has a note",
    noSavedVerses: "No bookmarked, highlighted, or noted verses yet.",
    savedVerses: "Saved verses",
    copiedVerse: "Verse copied.",
    both: "Both",
    closeAppearance: "Close reading appearance",
    readingAppearance: "Reading appearance",
    fontSize: "Font size",
    lineSpacing: "Line spacing",
    readerTheme: "Reading theme",
    textWidth: "Text width",
    closeVerseActions: "Close verse actions",
    copyVerse: "Copy",
    shareVerse: "Share",
    bookmark: "Bookmark",
    highlight: "Highlight",
    personalNote: "Personal note",
    notePlaceholder: "Write what you want to remember about this verse...",
    saveNote: "Save note",
  };
}

function filterVerses(verses: BibleVerse[], search: string) {
  const normalized = search.trim().toLowerCase();
  if (normalized.length < 2) return verses;
  return verses.filter((verse) => `${verse.number} ${verse.text}`.toLowerCase().includes(normalized));
}

function readBibleStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeBibleStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browser storage may be unavailable. */ }
}

function bibleSavedVerseId(version: string, book: string, chapter: number, verse: number) {
  return `${version}:${book}:${chapter}:${verse}`;
}

function highlightBibleSearchTerms(text: string, query: string) {
  const terms = Array.from(new Set(
    query
      .trim()
      .split(/\s+/)
      .map((term) => term.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
      .filter((term) => term.length > 0),
  )).sort((left, right) => right.length - left.length);

  if (!terms.length) return text;
  const escapedTerms = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const matcher = new RegExp(`(${escapedTerms.join("|")})`, "giu");
  const normalizedTerms = new Set(terms.map((term) => term.toLocaleLowerCase()));

  return text.split(matcher).map((part, index) => normalizedTerms.has(part.toLocaleLowerCase()) ? (
    <mark key={`${part}-${index}`} className="rounded bg-amber-200 px-0.5 font-semibold text-slate-900">{part}</mark>
  ) : part);
}

