"use client";

import { FormEvent, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ActionNotice } from "@/components/action-notice";
import {
  compactPlaylistSessions,
  groupPlaylistSessionsByService,
  MAX_PLAYLIST_SERVICES,
  MAX_PLAYLIST_SESSIONS_PER_SERVICE,
  MIN_PLAYLIST_SERVICES,
  movePlaylistSession,
  playlistServiceLabel,
} from "@/lib/playlist-rules";
import { identifyImportedSong, parseFreeShowSong, parseTextSong, type ImportedSong } from "@/lib/freeshow-import";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  FileUp,
  FolderPlus,
  GalleryHorizontal,
  ImageIcon,
  List,
  ListMusic,
  MicVocal,
  Music,
  Pencil,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Star,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  bulkAddSongsToPlaylistSession,
  bulkArchiveSongs,
  bulkDeleteSongs,
  createPlaylist,
  createSong,
  deleteBoardItem,
  deleteFeaturedImage,
  deleteGalleryPhoto,
  deleteMusicActionPlan,
  deleteMusicActionPlanTask,
  deletePlaylist,
  deleteSong,
  deleteServiceTeam,
  deleteYoutubeVideo,
  generateServiceTeams,
  importFreeShowSongBatch,
  restoreServiceTeam,
  saveBoardItem,
  saveFeaturedImage,
  saveMusicActionPlan,
  saveMusicActionPlanTask,
  saveYoutubeVideo,
  toggleBoardItemPin,
  toggleBoardItemPublish,
  toggleFeaturedImageHero,
  toggleFeaturedImagePublish,
  toggleYoutubePublish,
  updatePlaylist,
  updateSong,
  updateGalleryPhoto,
  updateSingerSettings,
  uploadGalleryPhotos,
} from "@/app/admin/music/actions";
import { MobileTabScroller } from "@/components/mobile-tab-scroller";

type Song = {
  id: number;
  title: string;
  artist: string | null;
  tempo: number | null;
  lyrics: string | null;
  youtubeLink: string | null;
  isArchived: boolean;
};

type PlaylistSessionSong = Song & {
  displayOrder: number;
  keySignature: string | null;
  assignedSinger: string | null;
};

type PlaylistSession = {
  id: number;
  serviceNumber: number;
  name: string;
  displayOrder: number;
  songs: PlaylistSessionSong[];
};

type Playlist = {
  id: number;
  title: string;
  description: string | null;
  serviceCount: number;
  createdAt: string;
  sessions: PlaylistSession[];
};

type EditablePlaylistSession = {
  clientId: string;
  serviceNumber: number;
  name: string;
  songIds: number[];
  songSettings: Record<string, { keySignature: string; assignedSinger: string }>;
};

type GalleryPhoto = {
  id: number;
  title: string;
  imagePath: string;
  description: string | null;
  eventDate: string | null;
  category: string | null;
  tags: string | null;
  altText: string | null;
  createdAt: string;
  createdAtValue: string;
};

type Singer = {
  id: number;
  name: string;
  email: string;
  membershipType: string | null;
  voicePart: string | null;
  singerLevel: string | null;
};

type ServiceTeamMember = {
  id: number;
  teamNumber: number;
  voicePart: string | null;
  performanceLevel: string | null;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
};

type ServiceTeam = {
  id: number;
  serviceName: string;
  serviceDate: string | null;
  serviceDateValue: string;
  numberOfTeams: number;
  createdAt: string;
  members: ServiceTeamMember[];
};

type BoardItem = {
  id: number;
  title: string;
  content: string;
  type: string;
  eventDate: string | null;
  eventDateValue: string;
  isPublished: boolean;
  isPinned: boolean;
};

type YoutubeVideo = {
  id: number;
  title: string;
  youtubeId: string;
  isPublished: boolean;
  sortOrder: number;
};

type FeaturedImage = {
  id: number;
  title: string;
  imagePath: string;
  description: string | null;
  isPublished: boolean;
  isHero: boolean;
  sortOrder: number;
};

type MusicActionPlanTask = {
  id: number;
  actionPlanId: number;
  taskName: string;
  activity: string | null;
  targetMilestone: string | null;
  estimatedBudget: number;
  startDate: string;
  startDateRaw: string;
  deadline: string;
  deadlineRaw: string;
  priority: string;
  progress: number;
  status: string;
};

type MusicActionPlan = {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  startDateRaw: string;
  dueDate: string;
  dueDateRaw: string;
  status: string;
  progress: number;
  year: number;
  createdByName: string;
  createdAt: string;
  tasks: MusicActionPlanTask[];
};

type MusicClientProps = {
  canManage: boolean;
  playlists: Playlist[];
  songs: Song[];
  gallery: GalleryPhoto[];
  singers: Singer[];
  serviceTeams: ServiceTeam[];
  boardItems: BoardItem[];
  youtubeVideos: YoutubeVideo[];
  featuredImages: FeaturedImage[];
  actionPlans: MusicActionPlan[];
};

type MusicNotice = {
  ok: boolean;
  message: string;
};

type ImportFailure = {
  filename: string;
  reason: string;
};

type ImportResult = {
  total: number;
  imported: number;
  duplicates: number;
  failureCount: number;
  failures: ImportFailure[];
};

type ConfirmAction = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  action: () => Promise<{ ok: boolean; message: string }>;
};

const tabs = [
  { id: "playlist", label: "Playlist", mobileLabel: "Playlist", icon: ListMusic },
  { id: "gallery", label: "Photo Gallery", mobileLabel: "Gallery", icon: GalleryHorizontal },
  { id: "groups", label: "Groups", mobileLabel: "Groups", icon: Users },
  { id: "board", label: "Public Board", mobileLabel: "Board", icon: MicVocal },
  { id: "actionPlan", label: "Action Plans", mobileLabel: "Plans", icon: FileText },
];

const PLAYLISTS_PER_PAGE = 5;
const SONG_PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;
const MAX_FREESHOW_BATCH_SONGS = 100;
const MAX_FREESHOW_BATCH_TEXT = 3_000_000;

const boardTabs = [
  { id: "youtube", label: "Video", mobileLabel: "Video", icon: Music },
  { id: "featured", label: "Image", mobileLabel: "Image", icon: ImageIcon },
  { id: "events", label: "Events & Updates", mobileLabel: "Events", icon: CalendarDays },
] as const;

function Modal({
  title,
  children,
  onClose,
  width = "max-w-2xl",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/50 px-3 py-6 backdrop-blur-sm">
      <div className={`mx-auto overflow-hidden rounded-2xl bg-white shadow-2xl ${width}`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" type="button" onClick={onClose}>
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ActionSummaryCard({ label, value, tone }: { label: string; value: number | string; tone: "rose" | "amber" | "sky" }) {
  const colors = {
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    sky: "border-sky-100 bg-sky-50 text-sky-700",
  };

  return (
    <div className={`rounded-lg border p-3 ${colors[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function PlanDetail({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium capitalize text-gray-800">{value}</p>
    </div>
  );
}

function actionPlanStatusBadge(status: string) {
  if (status === "completed") return "bg-green-100 text-green-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-700";
  return "bg-yellow-100 text-yellow-700";
}

function formatCurrency(value: number) {
  return `RWF ${value.toLocaleString()}`;
}

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function MusicNoticeBanner({ notice, onClose }: { notice: MusicNotice; onClose: () => void }) {
  return <ActionNotice message={notice.message} tone={notice.ok ? "success" : "error"} onClose={onClose} className="mb-4" />;
}

function MusicConfirmModal({
  confirm,
  pending,
  onCancel,
  onConfirm,
}: {
  confirm: ConfirmAction;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const danger = confirm.tone !== "primary";

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className={`flex items-center gap-3 px-5 py-4 ${danger ? "bg-red-50" : "bg-blue-50"}`}>
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${danger ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
            {danger ? <AlertTriangle className="size-5" aria-hidden /> : <CheckCircle2 className="size-5" aria-hidden />}
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">{confirm.title}</h2>
            <p className="text-xs text-gray-500">Music and Evangelism DPT</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-600">{confirm.message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-4">
          <button type="button" onClick={onCancel} disabled={pending} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
            {pending ? "Please wait..." : confirm.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SongFields({ song }: { song?: Song }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="mb-1 block text-sm font-medium text-gray-700">Song Title *</span>
        <input name="title" defaultValue={song?.title ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-sm font-medium text-gray-700">YouTube Link</span>
        <input name="youtubeLink" type="url" defaultValue={song?.youtubeLink ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-sm font-medium text-gray-700">Lyrics</span>
        <textarea name="lyrics" defaultValue={song?.lyrics ?? ""} rows={6} className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>
    </div>
  );
}

function newSessionClientId(serviceNumber: number) {
  const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `service-${serviceNumber}-${suffix}`;
}

function synchronizePlaylistSessionStructure(
  sessions: EditablePlaylistSession[],
  sourceServiceNumber: number,
  serviceCount: number,
) {
  const template = sessions.filter((session) => session.serviceNumber === sourceServiceNumber);
  const synchronized: EditablePlaylistSession[] = [];

  for (let serviceNumber = 1; serviceNumber <= serviceCount; serviceNumber += 1) {
    if (serviceNumber === sourceServiceNumber) {
      synchronized.push(...template);
      continue;
    }
    const existing = sessions.filter((session) => session.serviceNumber === serviceNumber);
    synchronized.push(...template.map((session, index) => ({
      clientId: existing[index]?.clientId ?? newSessionClientId(serviceNumber),
      serviceNumber,
      name: session.name,
      songIds: existing[index]?.songIds ?? [],
      songSettings: existing[index]?.songSettings ?? {},
    })));
  }

  return synchronized;
}

function songSearchScore(song: Song, query: string) {
  const title = song.title.toLowerCase();
  const artist = song.artist?.toLowerCase() ?? "";

  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  if (artist === query) return 2;
  if (title.split(/\s+/).some((word) => word.startsWith(query))) return 3;
  if (artist.startsWith(query)) return 4;
  if (title.includes(query)) return 5;
  if (artist.includes(query)) return 6;
  return null;
}

function PlaylistFields({
  songs,
  playlist,
  onCancel,
  pending,
  submitLabel,
}: {
  songs: Song[];
  playlist?: Playlist;
  onCancel: () => void;
  pending: boolean;
  submitLabel: string;
}) {
  const initialServiceCount = playlist?.serviceCount ?? MIN_PLAYLIST_SERVICES;
  const initialSessions = playlist?.sessions.length
    ? playlist.sessions.map((session) => ({
        clientId: `session-${session.id}`,
        serviceNumber: session.serviceNumber,
        name: session.name,
        songIds: session.songs.map((song) => song.id),
        songSettings: Object.fromEntries(session.songs.map((song) => [String(song.id), {
          keySignature: song.keySignature ?? "",
          assignedSinger: song.assignedSinger ?? "",
        }])),
      }))
    : [{ clientId: "service-1-default", serviceNumber: 1, name: "", songIds: [], songSettings: {} }];
  const [serviceCount, setServiceCount] = useState(initialServiceCount);
  const [serviceCountInput, setServiceCountInput] = useState(String(initialServiceCount));
  const [editableSessions, setEditableSessions] = useState<EditablePlaylistSession[]>(initialSessions);
  const [activeServiceNumber, setActiveServiceNumber] = useState(initialSessions[0]?.serviceNumber ?? 1);
  const [activeSessionId, setActiveSessionId] = useState(initialSessions[0]?.clientId ?? "service-1-default");
  const [songPickerSearch, setSongPickerSearch] = useState("");
  const [visibleSongCount, setVisibleSongCount] = useState(20);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState(playlist?.title ?? "");
  const [sameSessionsForAllServices, setSameSessionsForAllServices] = useState(false);
  const stepThreeEnteredAt = useRef(0);
  const parsedServiceCount = Number(serviceCountInput);
  const serviceCountIsValid = Number.isInteger(parsedServiceCount)
    && parsedServiceCount >= MIN_PLAYLIST_SERVICES
    && parsedServiceCount <= MAX_PLAYLIST_SERVICES;

  const validEditableSessions = compactPlaylistSessions(editableSessions);
  const serviceSessions = validEditableSessions.filter((session) => session.serviceNumber === activeServiceNumber);
  const activeSession = validEditableSessions.find((session) => session.clientId === activeSessionId) ?? serviceSessions[0] ?? null;
  const selectedSongIds = activeSession?.songIds ?? [];
  const selectedSongIdSet = new Set(selectedSongIds);
  const songById = new Map(songs.map((song) => [song.id, song]));
  const selectedSongs = selectedSongIds
    .map((songId) => songById.get(songId))
    .filter((song): song is Song => Boolean(song));
  const normalizedSearch = songPickerSearch.trim().toLowerCase();
  const searchedSongs = normalizedSearch
    ? songs
        .filter((song) => !song.isArchived || selectedSongIdSet.has(song.id))
        .map((song) => ({ song, score: songSearchScore(song, normalizedSearch) }))
        .filter((match) => match.score !== null)
        .sort((left, right) => left.score! - right.score! || left.song.title.localeCompare(right.song.title))
        .map((match) => match.song)
    : [];
  const matchingUnselectedSongs = searchedSongs.filter((song) => !selectedSongIdSet.has(song.id));
  const visibleSongs = matchingUnselectedSongs.slice(0, visibleSongCount);
  const currentStepDetails = [
    { title: "Playlist Details", description: "" },
    { title: "Create Sessions", description: "Service headings" },
    { title: "Assign Songs", description: "Search and arrange" },
  ][step - 1];
  const serializedSessions = JSON.stringify(validEditableSessions.map((session) => ({
    serviceNumber: session.serviceNumber,
    name: session.name,
    songAssignments: session.songIds.map((songId) => ({
      songId,
      keySignature: session.songSettings[String(songId)]?.keySignature ?? "",
      assignedSinger: session.songSettings[String(songId)]?.assignedSinger ?? "",
    })),
  })));

  function activateService(serviceNumber: number, sessions = validEditableSessions) {
    const firstSession = sessions.find((session) => session.serviceNumber === serviceNumber);
    setActiveServiceNumber(serviceNumber);
    if (firstSession) setActiveSessionId(firstSession.clientId);
    setSongPickerSearch("");
    setVisibleSongCount(20);
  }

  function changeServiceCount(nextServiceCount: number) {
    const safeServiceCount = Number.isFinite(nextServiceCount)
      ? Math.min(MAX_PLAYLIST_SERVICES, Math.max(MIN_PLAYLIST_SERVICES, Math.trunc(nextServiceCount)))
      : MIN_PLAYLIST_SERVICES;
    const nextSessions = validEditableSessions.filter((session) => session.serviceNumber <= safeServiceCount);
    for (let serviceNumber = 1; serviceNumber <= safeServiceCount; serviceNumber += 1) {
      if (!nextSessions.some((session) => session.serviceNumber === serviceNumber)) {
        nextSessions.push({ clientId: newSessionClientId(serviceNumber), serviceNumber, name: "", songIds: [], songSettings: {} });
      }
    }
    const sourceServiceNumber = activeServiceNumber > safeServiceCount ? 1 : activeServiceNumber;
    const updatedSessions = sameSessionsForAllServices
      ? synchronizePlaylistSessionStructure(nextSessions, sourceServiceNumber, safeServiceCount)
      : nextSessions;
    setServiceCount(safeServiceCount);
    setEditableSessions(updatedSessions);
    if (activeServiceNumber > safeServiceCount) activateService(1, updatedSessions);
  }

  function updateActiveSession(update: (session: EditablePlaylistSession) => EditablePlaylistSession) {
    if (!activeSession) return;
    setEditableSessions((current) => compactPlaylistSessions(current).map((session) => session.clientId === activeSession.clientId ? update(session) : session));
  }

  function addSession() {
    if (serviceSessions.length >= MAX_PLAYLIST_SESSIONS_PER_SERVICE) return;
    const session: EditablePlaylistSession = {
      clientId: newSessionClientId(activeServiceNumber),
      serviceNumber: activeServiceNumber,
      name: "",
      songIds: [],
      songSettings: {},
    };
    setEditableSessions((current) => {
      const next = [...compactPlaylistSessions(current), session];
      return sameSessionsForAllServices
        ? synchronizePlaylistSessionStructure(next, activeServiceNumber, serviceCount)
        : next;
    });
    setActiveSessionId(session.clientId);
  }

  function removeSession(sessionId: string) {
    if (serviceSessions.length <= 1) return;
    const sessionIndex = serviceSessions.findIndex((session) => session.clientId === sessionId);
    const nextSessions = sameSessionsForAllServices
      ? validEditableSessions.filter((session) => {
          const sessionsInService = validEditableSessions.filter((item) => item.serviceNumber === session.serviceNumber);
          return sessionsInService[sessionIndex]?.clientId !== session.clientId;
        })
      : validEditableSessions.filter((session) => session.clientId !== sessionId);
    setEditableSessions(nextSessions);
    if (activeSessionId === sessionId) {
      const nextActive = nextSessions.find((session) => session.serviceNumber === activeServiceNumber);
      if (nextActive) setActiveSessionId(nextActive.clientId);
    }
  }

  function moveSession(sessionId: string, direction: -1 | 1) {
    if (!sameSessionsForAllServices) {
      setEditableSessions((current) => movePlaylistSession(current, activeServiceNumber, sessionId, direction));
      return;
    }
    const sessionIndex = serviceSessions.findIndex((session) => session.clientId === sessionId);
    setEditableSessions((current) => {
      let next = compactPlaylistSessions(current);
      for (let serviceNumber = 1; serviceNumber <= serviceCount; serviceNumber += 1) {
        const target = next.filter((session) => session.serviceNumber === serviceNumber)[sessionIndex];
        if (target) next = movePlaylistSession(next, serviceNumber, target.clientId, direction);
      }
      return next;
    });
  }

  function renameSession(sessionId: string, name: string) {
    const sessionIndex = serviceSessions.findIndex((session) => session.clientId === sessionId);
    setEditableSessions((current) => compactPlaylistSessions(current).map((session) => {
      if (!sameSessionsForAllServices) {
        return session.clientId === sessionId ? { ...session, name } : session;
      }
      const sessionsInService = compactPlaylistSessions(current).filter((item) => item.serviceNumber === session.serviceNumber);
      return sessionsInService[sessionIndex]?.clientId === session.clientId ? { ...session, name } : session;
    }));
  }

  function toggleSharedSessionStructure(checked: boolean) {
    setSameSessionsForAllServices(checked);
    if (!checked || serviceCount === 1) return;
    const sourceServiceNumber = activeServiceNumber;
    const synchronized = synchronizePlaylistSessionStructure(validEditableSessions, sourceServiceNumber, serviceCount);
    setEditableSessions(synchronized);
    activateService(sourceServiceNumber, synchronized);
  }

  function addSong(songId: number) {
    updateActiveSession((session) => ({
      ...session,
      songIds: session.songIds.includes(songId) ? session.songIds : [...session.songIds, songId],
      songSettings: {
        ...session.songSettings,
        [String(songId)]: session.songSettings[String(songId)] ?? { keySignature: "", assignedSinger: "" },
      },
    }));
  }

  function removeSong(songId: number) {
    updateActiveSession((session) => {
      const songSettings = { ...session.songSettings };
      delete songSettings[String(songId)];
      return { ...session, songIds: session.songIds.filter((selectedSongId) => selectedSongId !== songId), songSettings };
    });
  }

  function moveSong(songId: number, direction: -1 | 1) {
    updateActiveSession((session) => {
      const songIds = [...session.songIds];
      const currentIndex = songIds.indexOf(songId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= songIds.length) return session;
      [songIds[currentIndex], songIds[targetIndex]] = [songIds[targetIndex], songIds[currentIndex]];
      return { ...session, songIds };
    });
  }

  function selectAllMatches() {
    const matchingIds = matchingUnselectedSongs.map((song) => song.id);
    updateActiveSession((session) => ({
      ...session,
      songIds: [...session.songIds, ...matchingIds],
      songSettings: {
        ...session.songSettings,
        ...Object.fromEntries(matchingIds.map((songId) => [String(songId), { keySignature: "", assignedSinger: "" }])),
      },
    }));
  }

  function updateSongPerformance(songId: number, update: Partial<{ keySignature: string; assignedSinger: string }>) {
    updateActiveSession((session) => ({
      ...session,
      songSettings: {
        ...session.songSettings,
        [String(songId)]: {
          keySignature: session.songSettings[String(songId)]?.keySignature ?? "",
          assignedSinger: session.songSettings[String(songId)]?.assignedSinger ?? "",
          ...update,
        },
      },
    }));
  }

  function openSongAssignment() {
    stepThreeEnteredAt.current = Date.now();
    setStep(3);
  }

  return (
    <div className="space-y-5">
      <input type="hidden" name="sessions" value={serializedSessions} />
      <div className="flex items-center justify-between gap-3 rounded-xl bg-blue-600 px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600">{step}</span>
          <span className="min-w-0"><span className="block truncate text-sm font-semibold">{currentStepDetails.title}</span><span className="block truncate text-xs text-blue-100">{currentStepDetails.description}</span></span>
        </div>
        <span className="shrink-0 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold">Step {step} of 3</span>
      </div>

      <section className={step === 1 ? "space-y-5" : "hidden"} aria-label="Playlist details">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Playlist Title *</span>
          <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus placeholder="Example: Sunday Worship Playlist" className="h-11 w-full rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Number of Services *</span>
          <input
            name="serviceCount"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            value={serviceCountInput}
            onChange={(event) => {
              const nextValue = event.target.value.replace(/\D/g, "");
              setServiceCountInput(nextValue);
              const nextServiceCount = Number(nextValue);
              if (nextValue && Number.isInteger(nextServiceCount) && nextServiceCount >= MIN_PLAYLIST_SERVICES && nextServiceCount <= MAX_PLAYLIST_SERVICES) {
                changeServiceCount(nextServiceCount);
              }
            }}
            aria-invalid={!serviceCountIsValid}
            className="h-11 w-full rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className={`mt-1.5 block text-xs ${serviceCountIsValid ? "text-gray-400" : "text-red-600"}`}>
            {serviceCountIsValid ? `Between ${MIN_PLAYLIST_SERVICES} and ${MAX_PLAYLIST_SERVICES}` : `Enter a whole number between ${MIN_PLAYLIST_SERVICES} and ${MAX_PLAYLIST_SERVICES}`}
          </span>
        </label>
      </section>

      <section className={step === 2 ? "space-y-4" : "hidden"} aria-label="Create playlist sessions">
        {serviceCount > 1 ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-blue-200">
            <input type="checkbox" checked={sameSessionsForAllServices} onChange={(event) => toggleSharedSessionStructure(event.target.checked)} className="mt-0.5 size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span><span className="block text-sm font-semibold text-gray-700">Use the same sessions for every service</span><span className="block text-xs text-gray-500"></span></span>
          </label>
        ) : null}

      <div className={sameSessionsForAllServices ? "hidden" : ""}>
        <span className="mb-2 block text-sm font-medium text-gray-700">Choose Service</span>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {Array.from({ length: serviceCount }, (_, index) => {
            const serviceNumber = index + 1;
            const count = validEditableSessions.filter((session) => session.serviceNumber === serviceNumber).length;
            return (
              <button key={serviceNumber} type="button" onClick={() => activateService(serviceNumber)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${activeServiceNumber === serviceNumber ? "bg-blue-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-blue-50"}`}>
                {playlistServiceLabel(serviceNumber)} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-gray-800">{sameSessionsForAllServices ? "Shared Sessions" : `Sessions in ${playlistServiceLabel(activeServiceNumber)}`}</h4>
          </div>
          <button type="button" onClick={addSession} disabled={serviceSessions.length >= MAX_PLAYLIST_SESSIONS_PER_SERVICE} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <Plus className="size-3.5" aria-hidden /> Add Session
          </button>
        </div>
        <div className="space-y-1.5">
          {serviceSessions.map((session, index) => (
            <div key={session.clientId} className={`group flex items-center gap-2 rounded-lg border p-2 ${activeSession?.clientId === session.clientId ? "border-blue-300 bg-white" : "border-transparent bg-white/70"}`}>
              <span className="shrink-0 text-sm font-semibold text-gray-700">{index + 1}.</span>
              <input
                value={session.name}
                maxLength={80}
                onFocus={() => setActiveSessionId(session.clientId)}
                onClick={() => setActiveSessionId(session.clientId)}
                onChange={(event) => {
                  renameSession(session.clientId, event.target.value);
                }}
                placeholder="Session heading (optional)"
                aria-label={`Heading for session ${index + 1}`}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-gray-700 outline-none placeholder:font-normal placeholder:text-gray-400 hover:border-gray-200 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex shrink-0 transition sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <button type="button" onClick={() => moveSession(session.clientId, -1)} disabled={index === 0} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-30" aria-label="Move session up"><ArrowUp className="size-4" /></button>
                <button type="button" onClick={() => moveSession(session.clientId, 1)} disabled={index === serviceSessions.length - 1} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-30" aria-label="Move session down"><ArrowDown className="size-4" /></button>
                <button type="button" onClick={() => removeSession(session.clientId)} disabled={serviceSessions.length <= 1} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" aria-label="Remove session"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      </section>

      <section className={step === 3 ? "space-y-4" : "hidden"} aria-label="Assign songs to playlist sessions">
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
          <span className="block truncate text-sm font-bold text-gray-800">{title}</span>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">Choose Service</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Array.from({ length: serviceCount }, (_, index) => {
              const serviceNumber = index + 1;
              const songCount = validEditableSessions
                .filter((session) => session.serviceNumber === serviceNumber)
                .reduce((total, session) => total + session.songIds.length, 0);
              return (
                <button key={serviceNumber} type="button" onClick={() => activateService(serviceNumber)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${activeServiceNumber === serviceNumber ? "bg-blue-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-blue-50"}`}>
                  {playlistServiceLabel(serviceNumber)} <span className="opacity-70">({songCount} songs)</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-gray-700">Choose Session</span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {serviceSessions.map((session, index) => (
              <button key={session.clientId} type="button" onClick={() => { setActiveSessionId(session.clientId); setSongPickerSearch(""); setVisibleSongCount(20); }} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${activeSession?.clientId === session.clientId ? "bg-slate-800 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                {session.name.trim() || `Session ${index + 1}`} <span className="opacity-70">· {session.songIds.length}</span>
              </button>
            ))}
          </div>
        </div>

      {activeSession ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-700">Song Library</span>
              <span className="text-xs text-gray-500">{selectedSongIds.length} selected</span>
            </div>
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input type="search" value={songPickerSearch} onChange={(event) => { setSongPickerSearch(event.target.value); setVisibleSongCount(20); }} placeholder="Search by song title..." className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {normalizedSearch ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                  <span>{matchingUnselectedSongs.length} matching {matchingUnselectedSongs.length === 1 ? "song" : "songs"}</span>
                  <button type="button" onClick={selectAllMatches} disabled={matchingUnselectedSongs.length === 0} className="font-semibold text-blue-600 hover:text-blue-700 disabled:text-gray-400">Add all matches</button>
                </div>
              ) : null}
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {visibleSongs.length > 0 ? visibleSongs.map((song) => (
                  <div key={song.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-gray-100 hover:ring-blue-200">
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-700">{song.title}</span>
                      <span className="text-xs text-gray-400">{song.artist || "Song library"}</span>
                    </div>
                    <button type="button" onClick={() => addSong(song.id)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"><Plus className="size-3.5" /> Add</button>
                  </div>
                )) : <div className="py-8 text-center text-sm text-gray-400">{songs.length === 0 ? "No songs available" : !normalizedSearch ? "Start typing to find a song." : searchedSongs.length === 0 ? "No songs match your search." : "All matching songs are already selected."}</div>}
              </div>
              {visibleSongs.length < matchingUnselectedSongs.length ? <button type="button" onClick={() => setVisibleSongCount((current) => current + 20)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">Show 20 more</button> : null}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-700">Selected Songs <span className="font-normal text-gray-400">({selectedSongIds.length})</span></span>
              {selectedSongIds.length > 0 ? <button type="button" onClick={() => updateActiveSession((session) => ({ ...session, songIds: [], songSettings: {} }))} className="text-xs font-semibold text-red-600 hover:text-red-700">Clear songs</button> : null}
            </div>
            <div className="max-h-[25rem] min-h-40 space-y-2 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
              {selectedSongs.length > 0 ? selectedSongs.map((song, index) => (
                <div key={song.id} className="grid gap-2 rounded-lg bg-white p-2.5 ring-1 ring-gray-100 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-700">{index + 1}. {song.title}</span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label>
                        <span className="mb-1 block text-[11px] font-medium text-gray-500">Performance Key</span>
                        <input value={activeSession.songSettings[String(song.id)]?.keySignature ?? ""} onChange={(event) => updateSongPerformance(song.id, { keySignature: event.target.value })} maxLength={30} placeholder="C, G, D..." className="h-9 w-full rounded-md border border-gray-200 px-2 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
                      </label>
                      <label>
                        <span className="mb-1 block text-[11px] font-medium text-gray-500">Lead Singer</span>
                        <input
                          type="text"
                          value={activeSession.songSettings[String(song.id)]?.assignedSinger ?? ""}
                          onChange={(event) => updateSongPerformance(song.id, { assignedSinger: event.target.value })}
                          maxLength={120}
                          autoComplete="off"
                          placeholder="Type singer's name"
                          className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-xs outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => moveSong(song.id, -1)} disabled={index === 0} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30" aria-label={`Move ${song.title} up`}><ArrowUp className="size-4" /></button>
                    <button type="button" onClick={() => moveSong(song.id, 1)} disabled={index === selectedSongs.length - 1} className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30" aria-label={`Move ${song.title} down`}><ArrowDown className="size-4" /></button>
                    <button type="button" onClick={() => removeSong(song.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${song.title}`}><X className="size-4" /></button>
                  </div>
                </div>
              )) : <div className="flex min-h-32 items-center justify-center px-4 text-center text-sm text-gray-400">Add songs from the library. Their order here is the performance order.</div>}
            </div>
          </div>
        </div>
      ) : null}
      </section>

      <div className="flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
        <div className="flex items-center gap-2">
          {step > 1 ? (
            <button type="button" onClick={() => setStep(step === 3 ? 2 : 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <ChevronLeft className="size-4" aria-hidden /> Back
            </button>
          ) : null}
          {step === 1 ? (
            <button type="button" onClick={() => setStep(2)} disabled={!title.trim() || !serviceCountIsValid} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              Continue <ChevronRight className="size-4" aria-hidden />
            </button>
          ) : step === 2 ? (
            <button type="button" onClick={openSongAssignment} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Continue <ChevronRight className="size-4" aria-hidden />
            </button>
          ) : (
            <button
              disabled={pending}
              type="button"
              onClick={(event) => {
                if (Date.now() - stepThreeEnteredAt.current < 600) return;
                event.currentTarget.form?.requestSubmit();
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? "Saving..." : submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GalleryPhotoFields({ photo }: { photo: GalleryPhoto }) {
  return (
    <div className="space-y-4">
      <label>
        <span className="mb-1 block text-sm font-medium text-gray-700">Title / Alt Text *</span>
        <input name="title" defaultValue={photo.title} required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium text-gray-700">Caption</span>
        <textarea name="caption" defaultValue={photo.description ?? ""} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium text-gray-700">Category</span>
        <select name="category" defaultValue={photo.category ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select a category</option>
          <option value="worship">Worship Service</option>
          <option value="event">Special Event</option>
          <option value="practice">Practice Session</option>
          <option value="concert">Concert</option>
          <option value="retreat">Retreat</option>
          <option value="conference">Conference</option>
        </select>
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium text-gray-700">Tags</span>
        <input name="tags" defaultValue={photo.tags ?? ""} placeholder="worship, music" className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </label>
    </div>
  );
}

function groupTeamMembers(members: ServiceTeamMember[]) {
  return members.reduce<Record<number, ServiceTeamMember[]>>((groups, member) => {
    groups[member.teamNumber] = [...(groups[member.teamNumber] ?? []), member];
    return groups;
  }, {});
}

function teamLabel(teamNumber: number) {
  return `Service ${String.fromCharCode(64 + teamNumber)}`;
}

function downloadGenerationCsv(generation: ServiceTeam) {
  const rows = [
    ["Team", "Name", "Email", "Voice Part", "Performance Level"],
    ...generation.members.map((member) => [
      teamLabel(member.teamNumber),
      member.user?.name ?? "",
      member.user?.email ?? "",
      member.voicePart ?? "",
      member.performanceLevel ?? "",
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `groups-${generation.serviceName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function drawRoundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const cornerRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + cornerRadius, y);
  context.lineTo(x + width - cornerRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
  context.lineTo(x + width, y + height - cornerRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
  context.lineTo(x + cornerRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
  context.lineTo(x, y + cornerRadius);
  context.quadraticCurveTo(x, y, x + cornerRadius, y);
  context.closePath();
}

function fitCanvasText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;

  let shortened = value;
  while (shortened.length > 1 && context.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened.trimEnd()}…`;
}

function loadCanvasImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${source}`));
    image.src = source;
  });
}

function playlistSongs(playlist: Playlist) {
  return playlist.sessions.flatMap((session) => session.songs);
}

async function downloadPlaylistImage(playlist: Playlist) {
  const width = 1080;
  const serviceGroups = groupPlaylistSessionsByService(playlist.serviceCount, playlist.sessions).map((service) => ({
    ...service,
    sessions: service.sessions.filter((session) => session.name.trim() || session.songs.length > 0),
  }));
  const bodyHeight = serviceGroups.reduce(
    (total, service) => total + 114 + service.sessions.reduce(
      (sessionTotal, session) => sessionTotal + (session.name.trim() ? 94 : 18) + Math.max(session.songs.length, 1) * 70,
      0,
    ),
    0,
  );
  const height = Math.max(1080, 550 + bodyHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image generation is not supported in this browser.");

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#fffdf8");
  background.addColorStop(0.58, "#ffffff");
  background.addColorStop(1, "#fff8e8");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#08264d";
  context.beginPath();
  context.moveTo(760, 0);
  context.lineTo(width, 0);
  context.lineTo(width, 330);
  context.quadraticCurveTo(920, 245, 760, 0);
  context.fill();

  try {
    const logo = await loadCanvasImage("/reverence-logo-transparent.png");
    const logoWidth = 330;
    const logoHeight = logoWidth * (logo.height / logo.width);
    context.drawImage(logo, 72, 48, logoWidth, logoHeight);
  } catch {
    context.fillStyle = "#08264d";
    context.font = "700 32px Arial, sans-serif";
    context.fillText("REVERENCE WORSHIP TEAM", 72, 90);
  }

  context.fillStyle = "#e0a41d";
  context.font = "700 54px Georgia, serif";
  context.fillText("♫", 868, 92);
  context.font = "700 34px Georgia, serif";
  context.fillText("♪", 952, 158);

  const heading = playlist.title.replace(/\bplaylist\b/gi, "").trim() || "WORSHIP";
  context.textAlign = "center";
  context.fillStyle = "#08264d";
  context.font = "800 70px Arial, sans-serif";
  context.fillText(fitCanvasText(context, heading.toUpperCase(), 850), width / 2, 240);
  context.fillStyle = "#d89b13";
  context.font = "800 76px Arial, sans-serif";
  context.fillText("PLAYLIST", width / 2, 318);

  let currentY = 366;
  for (const service of serviceGroups) {
    const serviceTitle = service.label.toUpperCase();
    context.font = "800 30px Arial, sans-serif";
    const badgeWidth = Math.min(520, Math.max(390, context.measureText(serviceTitle).width + 100));
    const badgeX = (width - badgeWidth) / 2;

    context.strokeStyle = "#d89b13";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(82, currentY + 31);
    context.lineTo(badgeX - 18, currentY + 31);
    context.moveTo(badgeX + badgeWidth + 18, currentY + 31);
    context.lineTo(width - 82, currentY + 31);
    context.stroke();

    drawRoundedRectangle(context, badgeX, currentY, badgeWidth, 62, 31);
    context.fillStyle = "#08264d";
    context.fill();
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.fillText(serviceTitle, width / 2, currentY + 41);
    currentY += 94;

    for (const session of service.sessions) {
      const sessionTitle = session.name.trim().toUpperCase();
      if (sessionTitle) {
        context.font = "800 25px Arial, sans-serif";
        const sessionBadgeWidth = Math.min(680, Math.max(360, context.measureText(sessionTitle).width + 90));
        const sessionBadgeX = (width - sessionBadgeWidth) / 2;
        drawRoundedRectangle(context, sessionBadgeX, currentY, sessionBadgeWidth, 50, 25);
        context.fillStyle = "#f8edc8";
        context.fill();
        context.strokeStyle = "#e7c66d";
        context.lineWidth = 2;
        context.stroke();
        context.fillStyle = "#08264d";
        context.textAlign = "center";
        context.fillText(fitCanvasText(context, sessionTitle, sessionBadgeWidth - 60), width / 2, currentY + 34);
        currentY += 76;
      }

      if (session.songs.length === 0) {
        context.fillStyle = "#8994a5";
        context.font = "500 23px Arial, sans-serif";
        context.fillText("No songs assigned", width / 2, currentY + 16);
        currentY += 70;
      } else {
        session.songs.forEach((song, index) => {
          if (index % 2 === 0) {
            drawRoundedRectangle(context, 58, currentY - 29, width - 116, 60, 15);
            context.fillStyle = "rgba(8, 38, 77, 0.045)";
            context.fill();
          }

          context.fillStyle = "#d89b13";
          context.font = "800 30px Arial, sans-serif";
          context.textAlign = "right";
          context.fillText(`${index + 1}.`, 112, currentY + 9);

          context.fillStyle = "#08264d";
          context.font = "700 27px Arial, sans-serif";
          context.textAlign = "left";
          context.fillText(fitCanvasText(context, song.title, 540), 132, currentY + 9);

          const details = [song.keySignature ? `Key: ${song.keySignature}` : null, song.assignedSinger]
            .filter(Boolean)
            .join("  |  ");
          if (details) {
            context.fillStyle = "#5f6f84";
            context.font = "600 22px Arial, sans-serif";
            context.textAlign = "right";
            context.fillText(fitCanvasText(context, details, 330), width - 72, currentY + 7);
          }
          currentY += 70;
        });
      }
      currentY += 18;
    }
    currentY += 20;
  }

  const footerY = height - 82;
  context.strokeStyle = "#e0a41d";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(72, footerY - 26);
  context.lineTo(width - 72, footerY - 26);
  context.stroke();
  context.fillStyle = "#08264d";
  context.font = "700 22px Arial, sans-serif";
  context.textAlign = "left";
  context.fillText("REVERENCE WORSHIP TEAM", 72, footerY + 14);
  context.fillStyle = "#728096";
  context.font = "500 20px Arial, sans-serif";
  context.textAlign = "right";
  context.fillText(new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date()), width - 72, footerY + 14);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((generatedBlob) => {
      if (generatedBlob) resolve(generatedBlob);
      else reject(new Error("The playlist image could not be generated."));
    }, "image/png");
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeTitle = playlist.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "playlist";
  anchor.href = url;
  anchor.download = `${safeTitle}-playlist.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function MusicClient({
  canManage,
  playlists,
  songs,
  gallery,
  singers,
  serviceTeams,
  boardItems,
  youtubeVideos,
  featuredImages,
  actionPlans,
}: MusicClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("playlist");
  const [libraryTab, setLibraryTab] = useState<"playlists" | "songs">("playlists");
  const [boardTab, setBoardTab] = useState<"youtube" | "featured" | "events">("youtube");
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [playlistPage, setPlaylistPage] = useState(1);
  const [songSearch, setSongSearch] = useState("");
  const [songPage, setSongPage] = useState(1);
  const [songPageSize, setSongPageSize] = useState<number>(SONG_PAGE_SIZE_OPTIONS[0]);
  const [songStatusFilter, setSongStatusFilter] = useState<"active" | "archived">("active");
  const [selectedSongIds, setSelectedSongIds] = useState<number[]>([]);
  const [bulkPlaylistId, setBulkPlaylistId] = useState("");
  const [gallerySearch, setGallerySearch] = useState("");
  const [gallerySort, setGallerySort] = useState("newest");
  const [singerSearch, setSingerSearch] = useState("");
  const [actionPlanSearch, setActionPlanSearch] = useState("");
  const [actionPlanStatus, setActionPlanStatus] = useState("all");
  const [notice, setNotice] = useState<MusicNotice | null>(null);
  const [playlistNotice, setPlaylistNotice] = useState<MusicNotice | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [modal, setModal] = useState<null | "song" | "freeShowImport" | "bulkPlaylist" | "playlist" | "galleryUpload" | "groupsGenerate" | "groupsSettings" | "groupsPrevious" | "youtube" | "featured" | "boardItem">(null);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);
  const [editingYoutube, setEditingYoutube] = useState<YoutubeVideo | null>(null);
  const [editingFeatured, setEditingFeatured] = useState<FeaturedImage | null>(null);
  const [editingBoardItem, setEditingBoardItem] = useState<BoardItem | null>(null);
  const [planModal, setPlanModal] = useState<MusicActionPlan | "new" | null>(null);
  const [taskModal, setTaskModal] = useState<{ plan: MusicActionPlan; task?: MusicActionPlanTask } | null>(null);
  const [viewPlan, setViewPlan] = useState<MusicActionPlan | null>(null);
  const [viewingPlaylist, setViewingPlaylist] = useState<Playlist | null>(null);
  const [downloadingPlaylistId, setDownloadingPlaylistId] = useState<number | null>(null);
  const [viewingGeneration, setViewingGeneration] = useState<ServiceTeam | null>(null);
  const [lyricsSong, setLyricsSong] = useState<Song | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [freeShowImportProgress, setFreeShowImportProgress] = useState<{ processed: number; total: number } | null>(null);
  const [freeShowImportResult, setFreeShowImportResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleTabs = canManage ? tabs : tabs.filter((tab) => tab.id === "playlist");

  const filteredPlaylists = useMemo(() => {
    const query = playlistSearch.trim().toLowerCase();
    if (!query) return playlists;

    return playlists.filter((playlist) =>
      [
        playlist.title,
        playlist.description,
        ...playlist.sessions.map((session) => session.name),
        ...playlistSongs(playlist).flatMap((song) => [song.title, song.artist, song.keySignature]),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [playlistSearch, playlists]);
  const playlistPageCount = Math.max(1, Math.ceil(filteredPlaylists.length / PLAYLISTS_PER_PAGE));
  const currentPlaylistPage = Math.min(playlistPage, playlistPageCount);
  const playlistPageStart = (currentPlaylistPage - 1) * PLAYLISTS_PER_PAGE;
  const visiblePlaylists = filteredPlaylists.slice(playlistPageStart, playlistPageStart + PLAYLISTS_PER_PAGE);

  const filteredSongs = useMemo(() => {
    const query = songSearch.trim().toLowerCase();
    return songs.filter((song) => {
      if (song.isArchived !== (songStatusFilter === "archived")) return false;
      if (!query) return true;
      return [song.title, song.artist]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [songSearch, songs, songStatusFilter]);
  const songPageCount = Math.max(1, Math.ceil(filteredSongs.length / songPageSize));
  const currentSongPage = Math.min(songPage, songPageCount);
  const songPageStart = (currentSongPage - 1) * songPageSize;
  const visibleSongs = filteredSongs.slice(songPageStart, songPageStart + songPageSize);
  const visibleSongIds = visibleSongs.map((song) => song.id);
  const allVisibleSongsSelected = visibleSongIds.length > 0 && visibleSongIds.every((id) => selectedSongIds.includes(id));
  const selectedSongs = songs.filter((song) => selectedSongIds.includes(song.id));
  const selectedBulkPlaylist = playlists.find((playlist) => String(playlist.id) === bulkPlaylistId) ?? null;

  const filteredGallery = useMemo(() => {
    const query = gallerySearch.trim().toLowerCase();
    const photos = gallery.filter((photo) => {
      if (!query) return true;

      return [photo.title, photo.description, photo.category, photo.tags]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });

    return [...photos].sort((a, b) => {
      if (gallerySort === "oldest") return a.createdAtValue.localeCompare(b.createdAtValue);
      if (gallerySort === "az") return a.title.localeCompare(b.title);
      if (gallerySort === "za") return b.title.localeCompare(a.title);
      return b.createdAtValue.localeCompare(a.createdAtValue);
    });
  }, [gallery, gallerySearch, gallerySort]);

  const filteredSingers = useMemo(() => {
    const query = singerSearch.trim().toLowerCase();
    if (!query) return singers;

    return singers.filter((singer) => [singer.name, singer.email].some((value) => value.toLowerCase().includes(query)));
  }, [singerSearch, singers]);

  const latestGeneration = serviceTeams[0] ?? null;
  const latestTeams = latestGeneration ? groupTeamMembers(latestGeneration.members) : {};
  const filteredActionPlans = useMemo(() => {
    const query = actionPlanSearch.trim().toLowerCase();
    return actionPlans.filter((plan) => {
      const matchesSearch = !query || `${plan.title} ${plan.description ?? ""} ${plan.createdByName}`.toLowerCase().includes(query);
      const matchesStatus = actionPlanStatus === "all" || plan.status === actionPlanStatus;
      return matchesSearch && matchesStatus;
    });
  }, [actionPlans, actionPlanSearch, actionPlanStatus]);
  const actionPlanSummary = useMemo(() => {
    const tasks = actionPlans.flatMap((plan) => plan.tasks);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 7);

    const openTasks = tasks.filter((task) => task.status !== "completed" && task.progress < 100);
    const dueDate = (task: MusicActionPlanTask) => task.deadlineRaw ? new Date(`${task.deadlineRaw}T12:00:00`) : null;

    return {
      totalPlans: actionPlans.length,
      completed: actionPlans.filter((plan) => plan.status === "completed").length,
      inProgress: actionPlans.filter((plan) => plan.status === "in_progress").length,
      totalTasks: tasks.length,
      totalBudget: tasks.reduce((sum, task) => sum + task.estimatedBudget, 0),
      overdueTasks: openTasks.filter((task) => {
        const deadline = dueDate(task);
        return deadline ? deadline < today : false;
      }).length,
      dueSoonTasks: openTasks.filter((task) => {
        const deadline = dueDate(task);
        return deadline ? deadline >= today && deadline <= soon : false;
      }).length,
      myTodoTasks: openTasks.length,
    };
  }, [actionPlans]);

  function runAction(
    action: () => Promise<{ ok: boolean; message: string }>,
    close?: () => void,
    onResult?: (result: MusicNotice) => void,
  ) {
    startTransition(async () => {
      let result: MusicNotice;
      try {
        result = await action();
      } catch (error) {
        console.error(error);
        result = { ok: false, message: "Unable to save your changes. Please try again." };
      }
      setNotice(result);
      onResult?.(result);
      if (result.ok) {
        close?.();
        router.refresh();
      }
    });
  }

  function askConfirm(confirm: ConfirmAction) {
    setConfirmAction(confirm);
  }

  function executeConfirm() {
    if (!confirmAction) return;
    runAction(confirmAction.action, () => setConfirmAction(null));
  }

  async function handleDownloadPlaylist(playlist: Playlist) {
    setDownloadingPlaylistId(playlist.id);
    try {
      await downloadPlaylistImage(playlist);
      setNotice({ ok: true, message: `"${playlist.title}" downloaded as a PNG image.` });
    } catch (error) {
      setNotice({ ok: false, message: error instanceof Error ? error.message : "Unable to download the playlist image." });
    } finally {
      setDownloadingPlaylistId(null);
    }
  }

  function submitCreateSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runAction(() => createSong(formData), () => setModal(null));
  }

  function toggleSongSelection(songId: number) {
    setSelectedSongIds((current) => current.includes(songId)
      ? current.filter((id) => id !== songId)
      : [...current, songId]);
  }

  function toggleVisibleSongSelection() {
    setSelectedSongIds((current) => {
      if (allVisibleSongsSelected) return current.filter((id) => !visibleSongIds.includes(id));
      return [...new Set([...current, ...visibleSongIds])];
    });
  }

  function clearSelectedSongsOnSuccess(result: MusicNotice) {
    if (result.ok) setSelectedSongIds([]);
  }

  function submitBulkAddToPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sessionId = Number(new FormData(event.currentTarget).get("sessionId"));
    runAction(
      () => bulkAddSongsToPlaylistSession(sessionId, selectedSongIds),
      () => {
        setModal(null);
        setBulkPlaylistId("");
        setSelectedSongIds([]);
      },
    );
  }

  function downloadImportFailures() {
    if (!freeShowImportResult?.failures.length) return;
    const report = [
      "Song import failure report",
      `Generated: ${new Date().toLocaleString()}`,
      `Selected: ${freeShowImportResult.total}`,
      `Imported: ${freeShowImportResult.imported}`,
      `Repeated filenames: ${freeShowImportResult.duplicates}`,
      `Failed: ${freeShowImportResult.failureCount}`,
      "",
      ...freeShowImportResult.failures.map((failure) => `${failure.filename}\t${failure.reason}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([report], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `song-import-failures-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function submitFreeShowImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fileInput = event.currentTarget.elements.namedItem("shows");
    const files = fileInput instanceof HTMLInputElement ? Array.from(fileInput.files ?? []) : [];

    if (files.length === 0) {
      setNotice({ ok: false, message: "Select at least one .show or .txt song file." });
      return;
    }

    setNotice(null);
    setFreeShowImportResult(null);
    startTransition(async () => {
      let imported = 0;
      let duplicates = 0;
      let failures = 0;
      const failureDetails: ImportFailure[] = [];
      let batch: ImportedSong[] = [];
      let batchTextLength = 0;

      setFreeShowImportProgress({ processed: 0, total: files.length });

      const flushBatch = async () => {
        if (batch.length === 0) return;

        const songsToSave = batch;
        batch = [];
        batchTextLength = 0;

        try {
          const result = await importFreeShowSongBatch(songsToSave);
          imported += result.imported;
          duplicates += result.duplicates;
          failures += result.failures;
          if (result.failures > 0) {
            failureDetails.push(...songsToSave.slice(0, result.failures).map((song) => ({
              filename: song.sourceFilename,
              reason: result.message,
            })));
          }
        } catch (error) {
          console.error(error);
          failures += songsToSave.length;
          failureDetails.push(...songsToSave.map((song) => ({
            filename: song.sourceFilename,
            reason: "The song batch could not be saved.",
          })));
        }
      };

      try {
        for (let index = 0; index < files.length; index++) {
          const file = files[index];

          const lowerName = file.name.toLowerCase();
          const isFreeShowFile = lowerName.endsWith(".show");
          const isTextFile = lowerName.endsWith(".txt");

          if (!isFreeShowFile && !isTextFile) {
            failures++;
            failureDetails.push({ filename: file.name, reason: "Not a .show or .txt file." });
          } else {
            try {
              const fallbackTitle = file.name.replace(/\.(show|txt)$/i, "").trim();
              const content = await file.text();
              const parsedSong = isTextFile
                ? parseTextSong(content, fallbackTitle)
                : parseFreeShowSong(content, fallbackTitle);
              const song = identifyImportedSong(parsedSong, file.name);
              const songTextLength = song.title.length + (song.artist?.length ?? 0) + song.lyrics.length;

              if (songTextLength > MAX_FREESHOW_BATCH_TEXT) {
                failures++;
                failureDetails.push({ filename: file.name, reason: "Song text is too large." });
              } else {
                if (
                  batch.length >= MAX_FREESHOW_BATCH_SONGS ||
                  (batch.length > 0 && batchTextLength + songTextLength > MAX_FREESHOW_BATCH_TEXT)
                ) {
                  await flushBatch();
                }
                batch.push(song);
                batchTextLength += songTextLength;
              }
            } catch (error) {
              failures++;
              failureDetails.push({
                filename: file.name,
                reason: error instanceof Error ? error.message : "The file could not be read.",
              });
            }
          }

          if ((index + 1) % 10 === 0 || index === files.length - 1) {
            setFreeShowImportProgress({ processed: index + 1, total: files.length });
          }
        }

        await flushBatch();

        setFreeShowImportResult({
          total: files.length,
          imported,
          duplicates,
          failureCount: failures,
          failures: failureDetails,
        });
        if (imported > 0) router.refresh();
      } finally {
        setFreeShowImportProgress(null);
      }
    });
  }

  function submitUpdateSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSong) return;
    const formData = new FormData(event.currentTarget);
    runAction(() => updateSong(editingSong.id, formData), () => setEditingSong(null));
  }

  function submitCreatePlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPlaylistNotice(null);
    runAction(
      () => createPlaylist(formData),
      () => {
        setPlaylistNotice(null);
        setModal(null);
      },
      setPlaylistNotice,
    );
  }

  function submitUpdatePlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPlaylist) return;
    const formData = new FormData(event.currentTarget);
    setPlaylistNotice(null);
    runAction(
      () => updatePlaylist(editingPlaylist.id, formData),
      () => {
        setPlaylistNotice(null);
        setEditingPlaylist(null);
      },
      setPlaylistNotice,
    );
  }

  function submitUploadGallery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runAction(() => uploadGalleryPhotos(formData), () => setModal(null));
  }

  function submitUpdateGallery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPhoto) return;
    const formData = new FormData(event.currentTarget);
    runAction(() => updateGalleryPhoto(editingPhoto.id, formData), () => setEditingPhoto(null));
  }

  function submitSingerSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runAction(() => updateSingerSettings(formData), () => setModal(null));
  }

  function submitGenerateGroups(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runAction(() => generateServiceTeams(formData), () => setModal(null));
  }

  function submitYoutube(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (editingYoutube) formData.set("id", String(editingYoutube.id));
    runAction(() => saveYoutubeVideo(formData), () => { setModal(null); setEditingYoutube(null); });
  }

  function submitFeatured(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (editingFeatured) formData.set("id", String(editingFeatured.id));
    runAction(() => saveFeaturedImage(formData), () => { setModal(null); setEditingFeatured(null); });
  }

  function submitBoardItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (editingBoardItem) formData.set("id", String(editingBoardItem.id));
    runAction(() => saveBoardItem(formData), () => { setModal(null); setEditingBoardItem(null); });
  }

  function submitActionPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (planModal && planModal !== "new") formData.set("id", String(planModal.id));
    runAction(() => saveMusicActionPlan(formData), () => setPlanModal(null));
  }

  function submitActionPlanTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskModal) return;
    const formData = new FormData(event.currentTarget);
    formData.set("actionPlanId", String(taskModal.plan.id));
    if (taskModal.task) formData.set("id", String(taskModal.task.id));
    runAction(() => saveMusicActionPlanTask(formData), () => setTaskModal(null));
  }

  function removeActionPlan(plan: MusicActionPlan) {
    askConfirm({
      title: "Delete Action Plan",
      message: `Delete "${plan.title}" and all of its tasks? This action cannot be undone.`,
      confirmLabel: "Delete Plan",
      action: () => deleteMusicActionPlan(plan.id),
    });
  }

  function removeActionPlanTask(task: MusicActionPlanTask) {
    askConfirm({
      title: "Delete Task",
      message: `Delete "${task.activity || task.taskName}" from this action plan?`,
      confirmLabel: "Delete Task",
      action: () => deleteMusicActionPlanTask(task.id),
    });
  }

  function exportActionPlanTasks(plan: MusicActionPlan) {
    const rows = [
      ["No", "Activity", "Milestone", "Budget", "Start Date", "Deadline", "Priority", "Progress", "Status"],
      ...plan.tasks.map((task, index) => [
        index + 1,
        task.activity ?? task.taskName,
        task.targetMilestone ?? "",
        task.estimatedBudget,
        task.startDate,
        task.deadline,
        task.priority || "medium",
        `${task.progress}%`,
        task.status.replace("_", " "),
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${plan.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-tasks.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const lightboxPhoto = lightboxIndex === null ? null : filteredGallery[lightboxIndex];
  const lyricsYoutubeUrl = safeExternalUrl(lyricsSong?.youtubeLink);

  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-4">
      <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="px-3 py-3 md:hidden">
          <MobileTabScroller tabs={visibleTabs} value={activeTab} onChange={setActiveTab} />
        </div>
        <nav className="hidden flex-wrap md:flex">
          {visibleTabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <tab.icon className="size-4" aria-hidden />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {notice ? <MusicNoticeBanner notice={notice} onClose={() => setNotice(null)} /> : null}

      {activeTab === "groups" ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Groups</h2>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto">
              <button type="button" onClick={() => setModal("groupsSettings")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                <Settings className="size-4" aria-hidden />
                Settings
              </button>
              <button type="button" onClick={() => setModal("groupsPrevious")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                <List className="size-4" aria-hidden />
                View Previous
              </button>
              {latestGeneration ? (
                <button type="button" onClick={() => downloadGenerationCsv(latestGeneration)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  <Download className="size-4" aria-hidden />
                  Export Latest
                </button>
              ) : null}
              <button type="button" onClick={() => setModal("groupsGenerate")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700">
                <Plus className="size-4" aria-hidden />
                Generate Groups
              </button>
            </div>
          </div>

          {latestGeneration ? (
            <>
              <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Latest: <span className="font-semibold">{latestGeneration.serviceName}</span>
                {latestGeneration.serviceDate ? <span> - {latestGeneration.serviceDate}</span> : null}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(latestTeams).map(([teamNumber, members]) => (
                  <button key={teamNumber} type="button" onClick={() => setViewingGeneration(latestGeneration)} className="rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-bold text-gray-800">{teamLabel(Number(teamNumber))}</h4>
                        <p className="mt-0.5 text-xs text-gray-400">{latestGeneration.serviceDate || "No date"}</p>
                      </div>
                      <div className="flex size-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <ChevronRight className="size-4" aria-hidden />
                      </div>
                    </div>
                    <div className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
                      <Users className="mr-1 inline size-4 text-gray-400" aria-hidden />
                      {members.length} singers
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center">
              <Users className="mx-auto mb-4 size-12 text-gray-300" aria-hidden />
              <h3 className="mb-2 text-xl font-semibold text-gray-700">No Groups Generated</h3>
              <p className="text-gray-500">Click Generate Groups to create teams.</p>
            </div>
          )}
        </div>
      ) : activeTab === "gallery" ? (
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="text-lg font-bold text-gray-800">Photo Gallery</h3>
            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <div className="relative flex-1 sm:w-52 sm:flex-none">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input value={gallerySearch} onChange={(event) => setGallerySearch(event.target.value)} placeholder="Search photos..." className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <select value={gallerySort} onChange={(event) => setGallerySort(event.target.value)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="az">A-Z</option>
                <option value="za">Z-A</option>
              </select>
              <button type="button" onClick={() => setModal("galleryUpload")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                <Upload className="size-4" aria-hidden />
                Upload Photos
              </button>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between rounded-xl bg-blue-50 p-3 sm:block sm:text-center">
              <p className="text-xl font-bold text-blue-600 sm:text-2xl">{gallery.length}</p>
              <p className="text-xs text-gray-600">Total Photos</p>
            </div>
          </div>

          {filteredGallery.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {filteredGallery.map((photo, index) => {
                const tags = photo.tags?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [];

                return (
                  <article key={photo.id} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:shadow-lg">
                    <div className="relative h-44 overflow-hidden bg-gray-100 sm:h-48">
                      <button type="button" onClick={() => setLightboxIndex(index)} className="block h-full w-full">
                        <Image src={photo.imagePath} alt={photo.altText || photo.title} fill sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-105" />
                      </button>
                      <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                        <button type="button" onClick={() => setEditingPhoto(photo)} className="rounded-full bg-white p-1.5 shadow-md hover:bg-gray-100" title="Edit Photo">
                          <Pencil className="size-3.5 text-blue-600" aria-hidden />
                        </button>
                        <button type="button" onClick={() => askConfirm({ title: "Delete Photo", message: `Delete "${photo.title || "this photo"}" from the gallery?`, confirmLabel: "Delete Photo", action: () => deleteGalleryPhoto(photo.id) })} className="rounded-full bg-white p-1.5 shadow-md hover:bg-gray-100" title="Delete Photo">
                          <Trash2 className="size-3.5 text-red-600" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="truncate text-sm font-medium text-gray-800" title={photo.title}>{photo.title || "Untitled"}</h4>
                      {photo.eventDate ? <p className="text-xs text-gray-500">{photo.eventDate}</p> : null}
                      {photo.category ? <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">{photo.category}</span> : null}
                      {tags.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tags.slice(0, 2).map((tag) => <span key={tag} className="text-xs text-gray-400">#{tag}</span>)}
                          {tags.length > 2 ? <span className="text-xs text-gray-400">+{tags.length - 2}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <ImageIcon className="mx-auto mb-3 size-12 text-gray-300" aria-hidden />
              <p>No photos uploaded yet</p>
              <button type="button" onClick={() => setModal("galleryUpload")} className="mt-3 text-sm text-blue-600 hover:text-blue-800">Upload your first photo</button>
            </div>
          )}
        </div>
      ) : activeTab === "board" ? (
        <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">Landing Page Content Manager</h3>
          </div>

          <div className="mb-5 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-3 md:hidden">
              <MobileTabScroller tabs={boardTabs} value={boardTab} onChange={(tab) => setBoardTab(tab as "youtube" | "featured" | "events")} />
            </div>
            <nav className="hidden overflow-x-auto border-b border-gray-200 md:flex">
              {boardTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBoardTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${
                    boardTab === tab.id ? "border-black text-black" : "border-transparent text-gray-500"
                  }`}
                >
                  <tab.icon className="size-4" aria-hidden />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {boardTab === "youtube" ? (
            <section className="rounded-xl border p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="font-semibold text-gray-700">YouTube Videos</h4>
                <button type="button" onClick={() => { setEditingYoutube(null); setModal("youtube"); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                  <Plus className="size-4" aria-hidden /> Add YouTube Video
                </button>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {youtubeVideos.length > 0 ? youtubeVideos.map((video) => (
                  <div key={video.id} className="rounded-xl border p-3 transition hover:bg-gray-50">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
                        <a href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-gray-900 sm:h-20 sm:w-32">
                          <Image src={`https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`} alt={video.title} fill sizes="128px" className="object-cover" />
                        </a>
                        <div className="min-w-0">
                          <h5 className="break-words font-medium text-gray-800">{video.title}</h5>
                          <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{video.isPublished ? "Published" : "Draft"}</span>
                          <p className="mt-1 break-all text-xs text-gray-500">YouTube ID: {video.youtubeId}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 border-t pt-2 sm:border-t-0 sm:pt-0">
                        <button type="button" onClick={() => runAction(() => toggleYoutubePublish(video.id))} className="text-black hover:text-gray-600" title={video.isPublished ? "Hide video" : "Publish video"}>{video.isPublished ? <CircleOff className="size-4" /> : <CheckCircle2 className="size-4" />}</button>
                        <button type="button" onClick={() => { setEditingYoutube(video); setModal("youtube"); }} className="text-black hover:text-gray-600" title="Edit"><Pencil className="size-4" /></button>
                        <button type="button" onClick={() => askConfirm({ title: "Delete YouTube Video", message: `Delete "${video.title}" from the landing page videos?`, confirmLabel: "Delete Video", action: () => deleteYoutubeVideo(video.id) })} className="text-black hover:text-gray-600" title="Delete"><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                  </div>
                )) : <div className="py-8 text-center text-sm text-gray-500">No YouTube videos added yet</div>}
              </div>
            </section>
          ) : null}

          {boardTab === "featured" ? (
            <section className="rounded-xl border p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="font-semibold text-gray-700">Featured Images</h4>
                <button type="button" onClick={() => { setEditingFeatured(null); setModal("featured"); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                  <Upload className="size-4" aria-hidden /> Upload
                </button>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {featuredImages.length > 0 ? featuredImages.map((image) => (
                  <div key={image.id} className="rounded-xl border p-3 transition hover:bg-gray-50">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          <Image src={image.imagePath} alt={image.title} fill sizes="64px" className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="break-words font-medium text-gray-800">{image.title}</h5>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{image.isPublished ? "Published" : "Draft"}</span>
                            {image.isHero ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-black">Hero</span> : null}
                          </div>
                          {image.description ? <p className="mt-1 line-clamp-2 text-xs text-gray-500">{image.description}</p> : null}
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 border-t pt-2 sm:border-t-0 sm:pt-0">
                        <button type="button" onClick={() => runAction(() => toggleFeaturedImageHero(image.id))} className="text-black hover:text-gray-600" title="Hero"><Star className={`size-4 ${image.isHero ? "fill-black" : ""}`} /></button>
                        <button type="button" onClick={() => runAction(() => toggleFeaturedImagePublish(image.id))} className="text-black hover:text-gray-600" title={image.isPublished ? "Hide image" : "Publish image"}>{image.isPublished ? <CircleOff className="size-4" /> : <CheckCircle2 className="size-4" />}</button>
                        <button type="button" onClick={() => { setEditingFeatured(image); setModal("featured"); }} className="text-black hover:text-gray-600" title="Edit"><Pencil className="size-4" /></button>
                        <button type="button" onClick={() => askConfirm({ title: "Delete Featured Image", message: `Delete "${image.title}" from featured images?`, confirmLabel: "Delete Image", action: () => deleteFeaturedImage(image.id) })} className="text-black hover:text-gray-600" title="Delete"><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                  </div>
                )) : <div className="py-8 text-center text-sm text-gray-500">No featured images added yet</div>}
              </div>
            </section>
          ) : null}

          {boardTab === "events" ? (
            <section className="rounded-xl border p-3 sm:p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-gray-700">Events & Updates</h4>
                  <p className="text-xs text-gray-500">Published items appear on the public landing page.</p>
                </div>
                <button type="button" onClick={() => { setEditingBoardItem(null); setModal("boardItem"); }} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                  <Plus className="size-4" aria-hidden /> Add
                </button>
              </div>
              <div className="max-h-[32rem] space-y-3 overflow-y-auto">
                {boardItems.length > 0 ? boardItems.map((item) => (
                  <article key={item.id} className="rounded-lg border p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-black">{item.type}</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-black">{item.isPublished ? "Published" : "Draft"}</span>
                          {item.isPinned ? <span className="text-xs text-black">Pinned</span> : null}
                        </div>
                        <h5 className="font-semibold text-gray-800">{item.title}</h5>
                        {item.eventDate ? <p className="mt-1 text-xs text-black">{item.eventDate}</p> : null}
                        <p className="mt-2 line-clamp-3 text-sm text-gray-600">{item.content}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => runAction(() => toggleBoardItemPublish(item.id))} className="text-black hover:text-gray-600" title={item.isPublished ? "Hide board item" : "Publish board item"}>{item.isPublished ? <CircleOff className="size-4" /> : <CheckCircle2 className="size-4" />}</button>
                        <button type="button" onClick={() => runAction(() => toggleBoardItemPin(item.id))} className="text-black hover:text-gray-600" title="Pin/Unpin"><Star className={`size-4 ${item.isPinned ? "fill-black" : ""}`} /></button>
                        <button type="button" onClick={() => { setEditingBoardItem(item); setModal("boardItem"); }} className="text-black hover:text-gray-600" title="Edit"><Pencil className="size-4" /></button>
                        <button type="button" onClick={() => askConfirm({ title: "Delete Board Item", message: `Delete "${item.title}" from events and updates?`, confirmLabel: "Delete Item", action: () => deleteBoardItem(item.id) })} className="text-black hover:text-gray-600" title="Delete"><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                  </article>
                )) : <div className="py-10 text-center text-sm text-gray-500">No events or updates yet.</div>}
              </div>
            </section>
          ) : null}
        </div>
      ) : activeTab === "actionPlan" ? (
        <div className="space-y-4 rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Music Action Plans</h3>
            <button type="button" onClick={() => setPlanModal("new")} className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              <Plus className="size-4" />
              Create New Action Plan
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <ActionSummaryCard label="Overdue Tasks" value={actionPlanSummary.overdueTasks} tone="rose" />
            <ActionSummaryCard label="To-Be-Overdue Within 7 Days" value={actionPlanSummary.dueSoonTasks} tone="amber" />
            <ActionSummaryCard label="My TO DO" value={actionPlanSummary.myTodoTasks} tone="sky" />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:flex-row md:items-center">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input value={actionPlanSearch} onChange={(event) => setActionPlanSearch(event.target.value)} placeholder="Search action plans..." className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <select value={actionPlanStatus} onChange={(event) => setActionPlanStatus(event.target.value)} className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredActionPlans.length ? filteredActionPlans.map((plan) => {
              const totalBudget = plan.tasks.reduce((sum, task) => sum + task.estimatedBudget, 0);
              return (
                <article key={plan.id} className="rounded-lg border bg-white p-4 transition hover:shadow-md">
                  <div className="mb-3 flex flex-col justify-between gap-4 sm:flex-row">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{plan.title}</h3>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${actionPlanStatusBadge(plan.status)}`}>{plan.status.replace("_", " ")}</span>
                      </div>
                      <p className="text-sm text-gray-600">{plan.description || "No description"}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>By {plan.createdByName}</span>
                        <span>Start: {plan.startDate}</span>
                        <span>Completion: {plan.dueDate}</span>
                        <span>Created: {plan.createdAt}</span>
                      </div>
                    </div>
                    <div className="ml-0 flex shrink-0 flex-wrap gap-2">
                      <button type="button" onClick={() => setViewPlan(plan)} className="text-purple-600 hover:text-purple-700" title="View advanced plan">
                        <FileText className="size-4" />
                      </button>
                      <button type="button" onClick={() => setTaskModal({ plan })} className="text-green-600 hover:text-green-700" title="Create task">
                        <PlusCircle className="size-4" />
                      </button>
                      <button type="button" onClick={() => exportActionPlanTasks(plan)} className="text-indigo-600 hover:text-indigo-700" title="Export tasks">
                        <FileUp className="size-4" />
                      </button>
                      <button type="button" onClick={() => setPlanModal(plan)} className="text-blue-500 hover:text-blue-700" title="Edit">
                        <Pencil className="size-4" />
                      </button>
                      <button type="button" onClick={() => removeActionPlan(plan)} className="text-red-500 hover:text-red-700" title="Delete">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium text-gray-800">{plan.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div className="h-2 rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${Math.min(plan.progress, 100)}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-12 gap-2 border-b border-gray-100 bg-white px-4 py-3 text-xs font-semibold text-gray-600">
                      <div className="col-span-12 md:col-span-2">Activity</div>
                      <div className="col-span-12 md:col-span-2">Milestone</div>
                      <div className="col-span-6 md:col-span-2">Budget</div>
                      <div className="col-span-6 md:col-span-2">Deadline</div>
                      <div className="col-span-6 md:col-span-1">Priority</div>
                      <div className="col-span-6 md:col-span-1">Progress</div>
                      <div className="col-span-12 text-left md:col-span-2 md:text-right">Actions</div>
                    </div>
                    {plan.tasks.length ? plan.tasks.map((task) => (
                      <div key={task.id} className="grid grid-cols-12 items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0">
                        <div className="col-span-12 font-medium text-gray-800 md:col-span-2">{task.activity || task.taskName || "-"}</div>
                        <div className="col-span-12 text-gray-600 md:col-span-2">{task.targetMilestone || "-"}</div>
                        <div className="col-span-6 text-gray-600 md:col-span-2">{task.estimatedBudget ? formatCurrency(task.estimatedBudget) : "-"}</div>
                        <div className="col-span-6 text-gray-600 md:col-span-2">{task.deadline || "-"}</div>
                        <div className="col-span-6 md:col-span-1">
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 capitalize">{task.priority || "medium"}</span>
                        </div>
                        <div className="col-span-6 md:col-span-1">
                          <div className="mb-1 text-xs text-gray-500">{task.progress}%</div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(task.progress, 100)}%` }} />
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-2">
                          <div className="flex items-center justify-start gap-1 md:justify-end md:gap-2">
                            <button type="button" onClick={() => setTaskModal({ plan, task })} className="inline-flex size-7 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 md:size-8" title="Edit task">
                              <Pencil className="size-4" />
                            </button>
                            <button type="button" onClick={() => removeActionPlanTask(task)} className="inline-flex size-7 items-center justify-center rounded-full text-red-600 hover:bg-red-50 md:size-8" title="Delete task">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">No tasks created yet. Use the green plus button to add one.</div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Total estimated amount</p>
                      <p className="text-sm text-gray-500">For this action plan only</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Budget</p>
                      <p className="text-lg font-bold text-gray-800">{formatCurrency(totalBudget)}</p>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                <ClipboardList className="mx-auto mb-3 size-10 text-gray-300" />
                <p className="text-sm text-gray-500">No action plans found</p>
                <button type="button" onClick={() => setPlanModal("new")} className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700">Create your first action plan</button>
              </div>
            )}
          </div>
        </div>
      ) : activeTab !== "playlist" ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <Music className="mx-auto mb-3 size-10 text-gray-300" aria-hidden />
          <h3 className="text-base font-semibold text-gray-800">Next tab coming after Groups</h3>
          <p className="mt-1 text-sm text-gray-500">We are building this department one tab at a time.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm sm:rounded-2xl sm:p-6">
          <div className="mb-4 flex flex-col gap-3 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex" role="tablist" aria-label="Music library sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={libraryTab === "playlists"}
                  onClick={() => setLibraryTab("playlists")}
                  className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition sm:text-base ${libraryTab === "playlists" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"}`}
                >
                  <List className="size-4" aria-hidden />
                  Playlists
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={libraryTab === "songs"}
                  onClick={() => setLibraryTab("songs")}
                  className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition sm:text-base ${libraryTab === "songs" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800"}`}
                >
                  <Music className="size-4" aria-hidden />
                  Songs
                </button>
              </div>
              {canManage && libraryTab === "playlists" ? (
                <button type="button" onClick={() => { setPlaylistNotice(null); setModal("playlist"); }} className="mb-3 inline-flex h-9 w-fit shrink-0 items-center justify-center gap-1 self-end rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 sm:self-auto sm:rounded-xl">
                  <Plus className="size-4" aria-hidden />
                  <span>New</span>
                </button>
              ) : canManage && libraryTab === "songs" ? (
                <div className="mb-3 flex w-fit shrink-0 items-center gap-2 self-end sm:self-auto">
                  <button type="button" onClick={() => { setFreeShowImportResult(null); setModal("freeShowImport"); }} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 sm:rounded-xl">
                    <Upload className="size-4" aria-hidden />
                    <span>Import Files</span>
                  </button>
                  <button type="button" onClick={() => setModal("song")} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 sm:rounded-xl">
                    <Plus className="size-4" aria-hidden />
                    <span>Add</span>
                  </button>
                </div>
              ) : null}
            </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
            {libraryTab === "playlists" ? <section className="w-full">
              <div className="relative mb-2 sm:mb-3">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input value={playlistSearch} onChange={(event) => { setPlaylistSearch(event.target.value); setPlaylistPage(1); }} placeholder="Search playlists..." className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:rounded-xl" />
              </div>
              <div className="space-y-2 sm:max-h-[500px] sm:overflow-y-auto sm:pr-1">
                {filteredPlaylists.length > 0 ? visiblePlaylists.map((playlist) => (
                  <div key={playlist.id} className="group relative rounded-xl border border-gray-200 p-2.5 transition hover:border-blue-300 hover:bg-blue-50/40 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200 sm:rounded-2xl sm:p-3">
                    <button
                      type="button"
                      onClick={() => setViewingPlaylist(playlist)}
                      className="absolute inset-0 rounded-xl focus:outline-none sm:rounded-2xl"
                      aria-label={`Open ${playlist.title} playlist`}
                    />
                    <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h5 className="truncate text-sm font-medium text-gray-800 sm:text-base">{playlist.title}</h5>
                        {playlist.description ? <p className="mt-1 line-clamp-2 text-xs text-gray-400">{playlist.description}</p> : null}
                      </div>
                      <div className="pointer-events-auto flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDownloadPlaylist(playlist)}
                          disabled={downloadingPlaylistId === playlist.id}
                          className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 disabled:cursor-wait disabled:opacity-50 sm:size-auto sm:bg-transparent"
                          title="Download Playlist as Image"
                          aria-label={`Download ${playlist.title} as an image`}
                        >
                          <Download className="size-4" aria-hidden />
                        </button>
                        {canManage && <><button type="button" onClick={() => { setPlaylistNotice(null); setEditingPlaylist(playlist); }} className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 sm:size-auto sm:bg-transparent" title="Edit Playlist"><Pencil className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => askConfirm({ title: "Delete Playlist", message: `Delete "${playlist.title}"? Songs will remain available, but this playlist will be removed.`, confirmLabel: "Delete Playlist", action: () => deletePlaylist(playlist.id) })} className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 sm:size-auto sm:bg-transparent" title="Delete Playlist"><Trash2 className="size-4" aria-hidden /></button></>}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center text-gray-500">
                    <List className="mx-auto mb-2 size-9 text-gray-300" aria-hidden />
                    <p>{playlists.length ? "No playlists match your search" : "No playlists yet"}</p>
                  </div>
                )}
              </div>
              {filteredPlaylists.length > PLAYLISTS_PER_PAGE ? (
                <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-gray-500">
                    Showing {playlistPageStart + 1}–{Math.min(playlistPageStart + PLAYLISTS_PER_PAGE, filteredPlaylists.length)} of {filteredPlaylists.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPlaylistPage(Math.max(1, currentPlaylistPage - 1))}
                      disabled={currentPlaylistPage === 1}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous playlists page"
                    >
                      <ChevronLeft className="size-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-20 text-center font-medium text-gray-700">
                      Page {currentPlaylistPage} of {playlistPageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPlaylistPage(Math.min(playlistPageCount, currentPlaylistPage + 1))}
                      disabled={currentPlaylistPage === playlistPageCount}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next playlists page"
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : null}
            </section> : null}

            {libraryTab === "songs" ? <section className="w-full">
              {canManage ? <div className="mb-3 flex items-center gap-2 border-b border-gray-100">
                {(["active", "archived"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setSongStatusFilter(status);
                      setSongPage(1);
                      setSelectedSongIds([]);
                    }}
                    className={`border-b-2 px-3 py-2 text-sm font-medium capitalize ${songStatusFilter === status ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                  >
                    {status}{status === "archived" ? ` (${songs.filter((song) => song.isArchived).length})` : ""}
                  </button>
                ))}
              </div> : null}
              <div className="relative mb-2 sm:mb-3">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input value={songSearch} onChange={(event) => { setSongSearch(event.target.value); setSongPage(1); }} placeholder="Search songs..." className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:rounded-xl" />
              </div>
              {canManage ? <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={allVisibleSongsSelected} onChange={toggleVisibleSongSelection} className="size-4 rounded border-gray-300 text-blue-600" />
                  Select this page
                </label>
                {selectedSongs.length > 0 ? (
                  <>
                    <span className="mx-1 text-xs font-semibold text-blue-700">{selectedSongs.length} selected</span>
                    {songStatusFilter === "active" ? (
                      <>
                        <button type="button" onClick={() => { setBulkPlaylistId(playlists[0] ? String(playlists[0].id) : ""); setModal("bulkPlaylist"); }} disabled={playlists.length === 0 || isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                          <FolderPlus className="size-3.5" aria-hidden /> Add to playlist
                        </button>
                        <button type="button" onClick={() => runAction(() => bulkArchiveSongs(selectedSongIds, true), undefined, clearSelectedSongsOnSuccess)} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                          <Archive className="size-3.5" aria-hidden /> Archive
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => runAction(() => bulkArchiveSongs(selectedSongIds, false), undefined, clearSelectedSongsOnSuccess)} disabled={isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                        <ArchiveRestore className="size-3.5" aria-hidden /> Restore
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => askConfirm({
                        title: "Permanently Delete Songs",
                        message: `Permanently delete ${selectedSongIds.length} selected song${selectedSongIds.length === 1 ? "" : "s"}? Their playlist assignments will also be removed. This cannot be undone.`,
                        confirmLabel: "Delete Permanently",
                        action: async () => {
                          const result = await bulkDeleteSongs(selectedSongIds);
                          if (result.ok) setSelectedSongIds([]);
                          return result;
                        },
                      })}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" aria-hidden /> Delete
                    </button>
                    <button type="button" onClick={() => setSelectedSongIds([])} className="ml-auto text-xs font-medium text-gray-500 hover:text-gray-800">Clear</button>
                  </>
                ) : null}
              </div> : null}
              <div className="space-y-2 sm:max-h-[450px] sm:overflow-y-auto sm:pr-1">
                {filteredSongs.length > 0 ? visibleSongs.map((song) => (
                  <div key={song.id} className="group relative rounded-xl border border-gray-200 p-2.5 transition hover:border-blue-300 hover:bg-blue-50/40 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200 sm:rounded-2xl sm:p-3">
                    <button
                      type="button"
                      onClick={() => setLyricsSong(song)}
                      className="absolute inset-0 rounded-xl focus:outline-none sm:rounded-2xl"
                      aria-label={`Open ${song.title} details`}
                    />
                    <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
                      {canManage ? <label className="pointer-events-auto mt-0.5 inline-flex cursor-pointer items-center" title={`Select ${song.title}`}>
                        <input type="checkbox" checked={selectedSongIds.includes(song.id)} onChange={() => toggleSongSelection(song.id)} className="size-4 rounded border-gray-300 text-blue-600" aria-label={`Select ${song.title}`} />
                      </label> : null}
                      <div className="min-w-0 flex-1">
                        <h5 className="truncate text-sm font-medium text-gray-800 sm:text-base">{song.title}</h5>
                        {song.artist ? <div className="mt-1 text-xs text-gray-500">{song.artist}</div> : null}
                      </div>
                      <div className="pointer-events-auto flex shrink-0 gap-2">
                        {canManage && <><button type="button" onClick={() => setEditingSong(song)} className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 sm:size-auto sm:bg-transparent" title="Edit Song"><Pencil className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => askConfirm({ title: "Delete Song", message: `Delete "${song.title}" from the music library?`, confirmLabel: "Delete Song", action: () => deleteSong(song.id) })} className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 sm:size-auto sm:bg-transparent" title="Delete Song"><Trash2 className="size-4" aria-hidden /></button></>}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center text-gray-500">
                    <Search className="mx-auto mb-2 size-9 text-gray-300" aria-hidden />
                    <p>{songStatusFilter === "archived" ? "No archived songs found" : "No songs match your search"}</p>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3 text-sm sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <p className="text-gray-500">
                    Showing {filteredSongs.length === 0 ? 0 : songPageStart + 1}–{Math.min(songPageStart + songPageSize, filteredSongs.length)} of {filteredSongs.length}
                  </p>
                  <label className="flex items-center gap-2 text-gray-600">
                    <span>Rows per page</span>
                    <select
                      value={songPageSize}
                      onChange={(event) => {
                        setSongPageSize(Number(event.target.value));
                        setSongPage(1);
                      }}
                      aria-label="Rows per page"
                      className="h-9 rounded-lg border border-gray-200 bg-white px-3 font-medium text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {SONG_PAGE_SIZE_OPTIONS.map((pageSize) => <option key={pageSize} value={pageSize}>{pageSize}</option>)}
                    </select>
                  </label>
                  <div className="flex items-center gap-2 sm:justify-self-end">
                    <button
                      type="button"
                      onClick={() => setSongPage(Math.max(1, currentSongPage - 1))}
                      disabled={currentSongPage === 1}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Previous songs page"
                    >
                      <ChevronLeft className="size-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-20 text-center font-medium text-gray-700">
                      Page {currentSongPage} of {songPageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSongPage(Math.min(songPageCount, currentSongPage + 1))}
                      disabled={currentSongPage === songPageCount}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Next songs page"
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
            </section> : null}
          </div>
        </div>
      )}

      {canManage && modal === "song" ? (
        <Modal title="Add New Song" onClose={() => setModal(null)}>
          <form onSubmit={submitCreateSong} className="space-y-5 p-5">
            <SongFields />
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isPending} type="submit" className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60">Save Song</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {canManage && modal === "freeShowImport" ? (
        <Modal title="Import Songs" onClose={() => setModal(null)}>
          {freeShowImportResult ? (
            <div className="space-y-5 p-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <h4 className="font-semibold text-blue-950">Import complete</h4>
                <p className="mt-1 text-sm text-blue-800">Processed {freeShowImportResult.total} selected file{freeShowImportResult.total === 1 ? "" : "s"}.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-700"><CheckCircle2 className="size-4" /> Imported</div>
                  <p className="mt-2 text-2xl font-bold text-green-900">{freeShowImportResult.imported}</p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700"><FileText className="size-4" /> Repeated filenames</div>
                  <p className="mt-2 text-2xl font-bold text-blue-900">{freeShowImportResult.duplicates}</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-700"><AlertTriangle className="size-4" /> Failed</div>
                  <p className="mt-2 text-2xl font-bold text-red-900">{freeShowImportResult.failureCount}</p>
                </div>
              </div>
              {freeShowImportResult.failures.length > 0 ? (
                <div className="rounded-xl border border-red-100">
                  <div className="border-b border-red-100 px-4 py-3 text-sm font-semibold text-red-800">Files needing attention</div>
                  <div className="max-h-52 divide-y divide-red-50 overflow-y-auto">
                    {freeShowImportResult.failures.map((failure, index) => (
                      <div key={`${failure.filename}-${index}`} className="px-4 py-2.5 text-sm">
                        <p className="break-all font-medium text-gray-800">{failure.filename}</p>
                        <p className="mt-0.5 text-xs text-red-600">{failure.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {freeShowImportResult.failures.length > 0 ? (
                  <button type="button" onClick={downloadImportFailures} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                    <Download className="size-4" /> Download failure report
                  </button>
                ) : null}
                <button type="button" onClick={() => setFreeShowImportResult(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Import more</button>
                <button type="button" onClick={() => setModal(null)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Done</button>
              </div>
            </div>
          ) : <form onSubmit={submitFreeShowImport} className="space-y-5 p-5">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              Select <strong>.show</strong> or <strong>.txt</strong> files. Every filename becomes its song title. Files that were already imported are skipped.
            </div>
            <label>
              <span className="mb-2 block text-sm font-medium text-gray-700">Song files *</span>
              <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center transition hover:border-blue-500">
                <Upload className="mx-auto mb-2 size-10 text-blue-500" aria-hidden />
                <p className="text-sm font-medium text-gray-700">Choose your .show or .txt files</p>
                <p className="mt-1 text-xs text-gray-500">Select files as needed.</p>
                <input name="shows" type="file" accept=".show,.txt,application/json,text/plain" multiple required className="mt-4 w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
                {freeShowImportProgress ? (
                  <div className="mt-4" aria-live="polite">
                    <div className="mb-1 flex justify-between text-xs font-medium text-blue-700">
                      <span>Processing files</span>
                      <span>{freeShowImportProgress.processed} / {freeShowImportProgress.total}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-blue-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-[width]"
                        style={{ width: `${Math.round((freeShowImportProgress.processed / freeShowImportProgress.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </label>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button disabled={isPending} type="button" onClick={() => setModal(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60">Cancel</button>
              <button disabled={isPending} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                <Upload className="size-4" aria-hidden />
                {freeShowImportProgress ? `Importing ${freeShowImportProgress.processed}/${freeShowImportProgress.total}` : "Import Songs"}
              </button>
            </div>
          </form>}
        </Modal>
      ) : null}

      {canManage && modal === "bulkPlaylist" ? (
        <Modal title="Add Songs to Playlist" onClose={() => { setModal(null); setBulkPlaylistId(""); }}>
          <form onSubmit={submitBulkAddToPlaylist} className="space-y-5 p-5">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
              Add {selectedSongIds.length} selected song{selectedSongIds.length === 1 ? "" : "s"} to a playlist session. Songs already in that session will be skipped.
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Playlist *</span>
              <select value={bulkPlaylistId} onChange={(event) => setBulkPlaylistId(event.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select playlist</option>
                {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.title}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Session *</span>
              <select key={bulkPlaylistId} name="sessionId" required disabled={!selectedBulkPlaylist} className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select session</option>
                {selectedBulkPlaylist?.sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {playlistServiceLabel(session.serviceNumber)} · {session.name || "Default session"}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => { setModal(null); setBulkPlaylistId(""); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isPending || !selectedBulkPlaylist} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                <FolderPlus className="size-4" /> {isPending ? "Adding..." : "Add Songs"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === "galleryUpload" ? (
        <Modal title="Upload Photos" onClose={() => setModal(null)}>
          <form onSubmit={submitUploadGallery} className="space-y-5 p-5">
            <label>
              <span className="mb-2 block text-sm font-medium text-gray-700">Select Photos *</span>
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition hover:border-blue-500">
                <Upload className="mx-auto mb-2 size-10 text-gray-400" aria-hidden />
                <p className="text-sm text-gray-500">Click to select photos</p>
                <p className="mt-1 text-xs text-gray-400">You can select multiple JPG, PNG, GIF, or WebP files.</p>
                <input name="images" type="file" accept="image/*" multiple required className="mt-4 w-full cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
              </div>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Caption</span>
              <textarea name="caption" rows={2} placeholder="Optional caption..." className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isPending} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Upload Photos</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === "groupsGenerate" ? (
        <Modal title="Generate Groups" onClose={() => setModal(null)}>
          <form onSubmit={submitGenerateGroups} className="space-y-4 p-5">
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Service Name *</span>
              <input name="serviceName" defaultValue="Sunday Service" required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Service Date *</span>
              <input name="serviceDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Number of Teams *</span>
              <select name="numberOfTeams" defaultValue="2" required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count} Team{count > 1 ? "s" : ""}</option>)}
              </select>
            </label>
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              Permanent active members with both voice part and performance level are distributed across teams.
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isPending} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Generate Groups</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === "groupsSettings" ? (
        <Modal title="Settings" onClose={() => setModal(null)}>
          <form onSubmit={submitSingerSettings} className="p-5">
            <p className="mb-3 text-xs text-gray-400">{singers.length} permanent members found</p>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input value={singerSearch} onChange={(event) => setSingerSearch(event.target.value)} placeholder="Search singers by name or email..." className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Voice</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-gray-500">Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredSingers.length > 0 ? filteredSingers.map((singer) => (
                    <tr key={singer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <p className="font-medium text-gray-900">{singer.name}</p>
                        <p className="text-xs text-gray-400">{singer.email}</p>
                      </td>
                      <td className="px-4 py-2">
                        <select name={`singer:${singer.id}:voicePart`} defaultValue={singer.voicePart ?? ""} className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Select Voice</option>
                          {["Soprano", "Alto", "Tenor", "Bass", "Musician"].map((voice) => <option key={voice} value={voice}>{voice}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select name={`singer:${singer.id}:singerLevel`} defaultValue={singer.singerLevel ?? ""} className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Select Level</option>
                          {["Normal", "Good"].map((level) => <option key={level} value={level}>{level}</option>)}
                        </select>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">No permanent members found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isPending} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Save Settings</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === "groupsPrevious" ? (
        <Modal title="Previous Generations" onClose={() => setModal(null)}>
          <div className="max-h-[70vh] overflow-y-auto p-5">
            {serviceTeams.length > 0 ? (
              <div className="space-y-2">
                {serviceTeams.map((generation) => (
                  <div key={generation.id} className="rounded-xl border border-gray-200 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{generation.serviceName}</h4>
                        <p className="text-xs text-gray-500">{generation.serviceDate || "No date"} - {generation.members.length} singers - {generation.numberOfTeams} teams</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setViewingGeneration(generation)} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Details</button>
                        <button type="button" onClick={() => downloadGenerationCsv(generation)} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50">CSV</button>
                        <button type="button" onClick={() => runAction(() => restoreServiceTeam(generation.id), () => setModal(null))} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50">Restore</button>
                        <button type="button" onClick={() => askConfirm({ title: "Delete Service Team", message: `Delete "${generation.serviceName}" generation?`, confirmLabel: "Delete Team", action: () => deleteServiceTeam(generation.id) })} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-gray-400">No previous generations found.</div>
            )}
          </div>
        </Modal>
      ) : null}

      {viewingGeneration ? (
        <Modal title={viewingGeneration.serviceName} onClose={() => setViewingGeneration(null)}>
          <div className="max-h-[70vh] overflow-y-auto p-5">
            <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              <span>{viewingGeneration.serviceDate || "No date"}</span>
              <span>{viewingGeneration.members.length} singers</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Object.entries(groupTeamMembers(viewingGeneration.members)).map(([teamNumber, members]) => (
                <div key={teamNumber} className="rounded-xl border border-gray-200 p-3">
                  <h4 className="mb-2 font-bold text-gray-800">{teamLabel(Number(teamNumber))}</h4>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="rounded-lg bg-gray-50 px-3 py-2">
                        <p className="text-sm font-medium text-gray-800">{member.user?.name ?? "Unknown member"}</p>
                        <p className="text-xs text-gray-500">{member.voicePart || "-"} - {member.performanceLevel || "-"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === "youtube" ? (
        <Modal title={editingYoutube ? "Edit YouTube Video" : "Add YouTube Video"} onClose={() => { setModal(null); setEditingYoutube(null); }}>
          <form onSubmit={submitYoutube} className="space-y-4 p-5">
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Title *</span>
              <input name="title" defaultValue={editingYoutube?.title ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">YouTube video link *</span>
              <input name="youtubeLink" type="text" defaultValue={editingYoutube ? `https://www.youtube.com/watch?v=${editingYoutube.youtubeId}` : ""} required placeholder="https://www.youtube.com/watch?v=..." className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="mt-1 block text-xs text-gray-500">Paste the full YouTube, Shorts, Live, Embed, or youtu.be link.</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input name="isPublished" type="checkbox" defaultChecked={editingYoutube?.isPublished ?? false} className="rounded border-gray-300 text-black" />
              Publish on landing page
            </label>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => { setModal(null); setEditingYoutube(null); }} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isPending} type="submit" className="rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-60">Save Video</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === "featured" ? (
        <Modal title={editingFeatured ? "Edit Featured Image" : "Add Featured Image"} onClose={() => { setModal(null); setEditingFeatured(null); }}>
          <form onSubmit={submitFeatured} className="space-y-4 p-5">
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Title *</span>
              <input name="title" defaultValue={editingFeatured?.title ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Image {editingFeatured ? "(Optional)" : "*"}</span>
              <input name="image" type="file" accept="image/*" required={!editingFeatured} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Description</span>
              <textarea name="description" defaultValue={editingFeatured?.description ?? ""} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input name="isPublished" type="checkbox" defaultChecked={editingFeatured?.isPublished ?? false} className="rounded border-gray-300 text-black" />
              Publish on landing page
            </label>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => { setModal(null); setEditingFeatured(null); }} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isPending} type="submit" className="rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-60">Save Image</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === "boardItem" ? (
        <Modal title={editingBoardItem ? "Edit Board Item" : "New Board Item"} onClose={() => { setModal(null); setEditingBoardItem(null); }}>
          <form onSubmit={submitBoardItem} className="space-y-4 p-5">
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Type *</span>
              <select name="type" defaultValue={editingBoardItem?.type ?? "event"} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="event">Event</option>
                <option value="update">Update</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Title *</span>
              <input name="title" defaultValue={editingBoardItem?.title ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Event date and time</span>
              <input name="eventDate" type="datetime-local" defaultValue={editingBoardItem?.eventDateValue ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-gray-700">Details *</span>
              <textarea name="content" defaultValue={editingBoardItem?.content ?? ""} required rows={5} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input name="isPublished" type="checkbox" defaultChecked={editingBoardItem?.isPublished ?? false} className="rounded border-gray-300 text-black" />
                Publish on landing page
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input name="isPinned" type="checkbox" defaultChecked={editingBoardItem?.isPinned ?? false} className="rounded border-gray-300 text-black" />
                Pin to top
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => { setModal(null); setEditingBoardItem(null); }} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isPending} type="submit" className="rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-60">Save Item</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === "playlist" ? (
        <Modal title="Create New Playlist" onClose={() => setModal(null)} width="max-w-5xl">
          <form onSubmit={submitCreatePlaylist} onKeyDown={(event) => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault(); }} className="p-5">
            {playlistNotice && !playlistNotice.ok ? <MusicNoticeBanner notice={playlistNotice} onClose={() => setPlaylistNotice(null)} /> : null}
            <PlaylistFields songs={songs} onCancel={() => setModal(null)} pending={isPending} submitLabel="Create Playlist" />
          </form>
        </Modal>
      ) : null}

      {canManage && editingSong ? (
        <Modal title="Edit Song" onClose={() => setEditingSong(null)}>
          <form onSubmit={submitUpdateSong} className="space-y-5 p-5">
            <SongFields song={editingSong} />
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => setEditingSong(null)} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isPending} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Update Song</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {canManage && editingPlaylist ? (
        <Modal title="Edit Playlist" onClose={() => setEditingPlaylist(null)} width="max-w-5xl">
          <form onSubmit={submitUpdatePlaylist} onKeyDown={(event) => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault(); }} className="p-5">
            {playlistNotice && !playlistNotice.ok ? <MusicNoticeBanner notice={playlistNotice} onClose={() => setPlaylistNotice(null)} /> : null}
            <PlaylistFields songs={songs} playlist={editingPlaylist} onCancel={() => setEditingPlaylist(null)} pending={isPending} submitLabel="Update Playlist" />
          </form>
        </Modal>
      ) : null}

      {editingPhoto ? (
        <Modal title="Edit Photo" onClose={() => setEditingPhoto(null)}>
          <form onSubmit={submitUpdateGallery} className="space-y-5 p-5">
            <GalleryPhotoFields photo={editingPhoto} />
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => setEditingPhoto(null)} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isPending} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Save Changes</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {planModal ? (
        <Modal title={planModal === "new" ? "Create Action Plan" : "Edit Action Plan"} onClose={() => setPlanModal(null)} width="max-w-2xl">
          <form onSubmit={submitActionPlan} className="space-y-4 p-5">
            <input type="hidden" name="year" value={new Date().getFullYear()} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Action Plan Name *</label>
              <input name="title" defaultValue={planModal === "new" ? "" : planModal.title} required placeholder="Enter action plan name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Date *</label>
                <input name="startDate" type="date" defaultValue={planModal === "new" ? "" : planModal.startDateRaw} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Completion Date *</label>
                <input name="dueDate" type="date" defaultValue={planModal === "new" ? "" : planModal.dueDateRaw} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea name="description" rows={3} defaultValue={planModal === "new" ? "" : planModal.description ?? ""} placeholder="Optional description" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setPlanModal(null)} className="h-9 rounded-lg border border-gray-300 px-4 text-sm text-gray-700 transition hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isPending} className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">{isPending ? "Saving..." : planModal === "new" ? "Create Action Plan" : "Update Action Plan"}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {taskModal ? (
        <Modal title={taskModal.task ? `Edit Task for ${taskModal.plan.title}` : `Create Task for ${taskModal.plan.title}`} onClose={() => setTaskModal(null)} width="max-w-2xl">
          <form onSubmit={submitActionPlanTask} className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Action Plan</label>
              <input value={taskModal.plan.title} readOnly className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Activity *</label>
              <input name="activity" defaultValue={taskModal.task?.activity ?? taskModal.task?.taskName ?? ""} required placeholder="Enter activity" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Targeted Milestone *</label>
              <input name="targetMilestone" defaultValue={taskModal.task?.targetMilestone ?? ""} required placeholder="Enter targeted milestone" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start Date</label>
                <input name="startDate" type="date" defaultValue={taskModal.task?.startDateRaw ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Estimated Budget *</label>
                <input name="estimatedBudget" type="number" min="0" step="0.01" defaultValue={taskModal.task?.estimatedBudget ?? ""} required placeholder="0.00" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Deadline *</label>
                <input name="deadline" type="date" defaultValue={taskModal.task?.deadlineRaw ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Priority *</label>
                <select name="priority" defaultValue={taskModal.task?.priority ?? "medium"} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  <option value="">Select priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Progress *</label>
                <input name="progress" type="number" min="0" max="100" defaultValue={taskModal.task?.progress ?? 0} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setTaskModal(null)} className="h-9 rounded-lg border border-gray-300 px-4 text-sm text-gray-700 transition hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isPending} className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">{isPending ? "Saving..." : taskModal.task ? "Update Task" : "Save Task"}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {viewPlan ? (
        <Modal title="Music Ministry ACTION PLAN" onClose={() => setViewPlan(null)} width="max-w-4xl">
          <div className="space-y-4 p-5">
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{viewPlan.title}</h3>
                <p className="mt-1 text-sm text-gray-500">By {viewPlan.createdByName} - {viewPlan.startDate} to {viewPlan.dueDate}</p>
              </div>
              <button type="button" onClick={() => exportActionPlanTasks(viewPlan)} className="inline-flex w-fit items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700">
                <FileUp className="size-4" />
                Export
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <PlanDetail label="Status" value={viewPlan.status.replace("_", " ")} />
              <PlanDetail label="Progress" value={`${viewPlan.progress}%`} />
              <PlanDetail label="Tasks" value={viewPlan.tasks.length} />
              <PlanDetail label="Budget" value={formatCurrency(viewPlan.tasks.reduce((sum, task) => sum + task.estimatedBudget, 0))} />
            </div>
            {viewPlan.description ? <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{viewPlan.description}</p> : null}
            <div className="rounded-lg border border-gray-100 bg-gray-50">
              <div className="border-b border-gray-100 bg-white px-4 py-3 text-sm font-semibold text-gray-800">Activities and Milestones</div>
              {viewPlan.tasks.length ? (
                <div className="divide-y divide-gray-100">
                  {viewPlan.tasks.map((task, index) => (
                    <div key={task.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                      <div className="col-span-12 md:col-span-1">
                        <span className="inline-flex size-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{index + 1}</span>
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <p className="font-semibold text-gray-800">{task.activity || task.taskName}</p>
                        <p className="mt-1 text-xs text-gray-500">{task.targetMilestone || "No milestone"}</p>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Deadline</p>
                        <p className="font-medium text-gray-700">{task.deadline || "-"}</p>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Budget</p>
                        <p className="font-medium text-gray-700">{task.estimatedBudget ? formatCurrency(task.estimatedBudget) : "-"}</p>
                      </div>
                      <div className="col-span-12 md:col-span-3">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="capitalize text-gray-500">{task.priority || "medium"}</span>
                          <span className="font-semibold text-gray-700">{task.progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(task.progress, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No tasks yet</div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => { setViewPlan(null); setPlanModal(viewPlan); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50">Edit Plan</button>
              <button type="button" onClick={() => setViewPlan(null)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Close</button>
            </div>
          </div>
        </Modal>
      ) : null}

      {confirmAction ? (
        <MusicConfirmModal
          confirm={confirmAction}
          pending={isPending}
          onCancel={() => setConfirmAction(null)}
          onConfirm={executeConfirm}
        />
      ) : null}

      {viewingPlaylist ? (
        <Modal title={viewingPlaylist.title} onClose={() => setViewingPlaylist(null)}>
          <div className="max-h-[70vh] overflow-y-auto p-5">
            {viewingPlaylist.sessions.length > 0 ? (
              <div className="space-y-5">
                {groupPlaylistSessionsByService(viewingPlaylist.serviceCount, viewingPlaylist.sessions).map((service) => (
                  <section key={service.serviceNumber}>
                    <h3 className="mb-2 rounded-full bg-blue-950 px-4 py-2 text-center text-sm font-bold uppercase tracking-wide text-white">
                      {service.label}
                    </h3>
                    <div className="space-y-4">
                      {service.sessions.filter((session) => session.name.trim() || session.songs.length > 0).map((session) => (
                        <div key={session.id}>
                          {session.name.trim() ? <h4 className="mb-2 rounded-full bg-amber-100 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-amber-950 ring-1 ring-amber-200">{session.name}</h4> : null}
                          {session.songs.length > 0 ? (
                            <div className="space-y-2">
                              {session.songs.map((song, index) => (
                                <button
                                  key={`${session.id}-${song.id}`}
                                  type="button"
                                  onClick={() => setLyricsSong(song)}
                                  className="w-full rounded-xl border border-gray-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/60 focus-visible:border-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                                  aria-label={`View lyrics for ${song.title}`}
                                >
                                  <div className="text-sm font-semibold text-gray-800">{index + 1}. {song.title}</div>
                                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                    {song.keySignature ? <span>Key: {song.keySignature}</span> : null}
                                    {song.assignedSinger ? <span>Singer: {song.assignedSinger}</span> : null}
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-400">No songs assigned</div>}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-gray-400">No songs in this playlist</div>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-4">
            <button type="button" onClick={() => setViewingPlaylist(null)} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Close
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadPlaylist(viewingPlaylist)}
              disabled={downloadingPlaylistId === viewingPlaylist.id}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
            >
              <Download className="size-4" aria-hidden />
              {downloadingPlaylistId === viewingPlaylist.id ? "Preparing Image..." : "Download Image"}
            </button>
          </div>
        </Modal>
      ) : null}

      {lightboxPhoto && lightboxIndex !== null ? (
        <div className="fixed inset-0 z-[120] bg-black/90">
          <div className="relative flex h-full items-center justify-center p-4">
            <button type="button" onClick={() => setLightboxIndex(null)} className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10" aria-label="Close lightbox">
              <X className="size-8" aria-hidden />
            </button>
            <button type="button" onClick={() => setLightboxIndex((current) => current === null ? 0 : (current - 1 + filteredGallery.length) % filteredGallery.length)} className="absolute left-4 rounded-full p-2 text-white hover:bg-white/10" aria-label="Previous photo">
              <ChevronLeft className="size-9" aria-hidden />
            </button>
            <div className="relative h-[82vh] w-[88vw]">
              <Image src={lightboxPhoto.imagePath} alt={lightboxPhoto.altText || lightboxPhoto.title} fill sizes="90vw" className="object-contain" />
            </div>
            <button type="button" onClick={() => setLightboxIndex((current) => current === null ? 0 : (current + 1) % filteredGallery.length)} className="absolute right-4 rounded-full p-2 text-white hover:bg-white/10" aria-label="Next photo">
              <ChevronRight className="size-9" aria-hidden />
            </button>
            <div className="absolute bottom-4 left-1/2 max-w-[80vw] -translate-x-1/2 rounded-lg bg-black/50 px-4 py-2 text-center text-sm text-white">
              {lightboxPhoto.description || lightboxPhoto.title}
            </div>
          </div>
        </div>
      ) : null}

      {lyricsSong ? (
        <Modal title={lyricsSong.title} onClose={() => setLyricsSong(null)}>
          <div className="p-5">
            <div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-amber-100 bg-gradient-to-b from-amber-50/70 to-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 pb-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <Music className="size-4" aria-hidden />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Lyrics</h3>
                </div>
                {lyricsYoutubeUrl ? (
                  <a
                    href={lyricsYoutubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                  >
                    <ExternalLink className="size-3.5" aria-hidden />
                    Watch on YouTube
                  </a>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-800">
                {lyricsSong.lyrics || "No lyrics available."}
              </p>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
