"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  EyeOff,
  FileText,
  FileUp,
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
  addSongToPlaylist,
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
  keySignature: string | null;
  tempo: number | null;
  lyrics: string | null;
  youtubeLink: string | null;
  assignedSinger: string | null;
};

type Playlist = {
  id: number;
  title: string;
  description: string | null;
  createdAt: string;
  songs: Song[];
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

function InlineDropdown({
  name,
  placeholder,
  options,
  tone = "blue",
}: {
  name: string;
  placeholder: string;
  options: { value: string; label: string }[];
  tone?: "blue" | "green";
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const selected = options.find((option) => option.value === value);
  const focusClass = tone === "green" ? "focus:ring-green-500" : "focus:ring-blue-500";
  const activeClass = tone === "green" ? "hover:bg-green-50" : "hover:bg-blue-50";

  return (
    <div className="relative min-w-0 flex-1">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 text-left text-sm text-gray-700 outline-none transition ${focusClass} sm:rounded-xl`}
      >
        <span className={`truncate ${selected ? "text-gray-800" : "text-gray-400"}`}>{selected?.label ?? placeholder}</span>
        <ChevronRight className={`size-4 shrink-0 text-gray-400 transition ${open ? "rotate-90" : ""}`} aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setValue("");
              setOpen(false);
            }}
            className={`block w-full px-3 py-2 text-left text-sm text-gray-400 ${activeClass}`}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setValue(option.value);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm text-gray-700 ${activeClass} ${option.value === value ? "font-semibold" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
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

function MusicNoticeBanner({ notice, onClose }: { notice: MusicNotice; onClose: () => void }) {
  const Icon = notice.ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
        notice.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
      }`}
      role="status"
    >
      <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${notice.ok ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{notice.ok ? "Success" : "Notice"}</p>
        <p className="mt-0.5 leading-5">{notice.message}</p>
      </div>
      <button type="button" onClick={onClose} className="rounded-lg p-1 text-current opacity-60 transition hover:bg-white/70 hover:opacity-100" aria-label="Close notice">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
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
      <label>
        <span className="mb-1 block text-sm font-medium text-gray-700">Artist</span>
        <input name="artist" defaultValue={song?.artist ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium text-gray-700">Assigned Singer</span>
        <input name="assignedSinger" defaultValue={song?.assignedSinger ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium text-gray-700">Key Signature</span>
        <input name="keySignature" defaultValue={song?.keySignature ?? ""} placeholder="C, G, D" className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium text-gray-700">Tempo (BPM)</span>
        <input name="tempo" type="number" defaultValue={song?.tempo ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" />
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

function PlaylistFields({ songs, playlist }: { songs: Song[]; playlist?: Playlist }) {
  const selected = new Set(playlist?.songs.map((song) => song.id) ?? []);

  return (
    <div className="space-y-4">
      <label>
        <span className="mb-1 block text-sm font-medium text-gray-700">Playlist Title *</span>
        <input name="title" defaultValue={playlist?.title ?? ""} required className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </label>
      <label>
        <span className="mb-1 block text-sm font-medium text-gray-700">Description</span>
        <textarea name="description" defaultValue={playlist?.description ?? ""} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </label>
      <div>
        <span className="mb-2 block text-sm font-medium text-gray-700">Songs</span>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
          {songs.length > 0 ? (
            songs.map((song) => (
              <label key={song.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-white">
                <input name="songs" type="checkbox" value={song.id} defaultChecked={selected.has(song.id)} className="rounded border-gray-300 text-blue-600" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-gray-700">{song.title}</span>
                  <span className="text-xs text-gray-400">{song.keySignature ? `Key: ${song.keySignature}` : "No key"}{song.tempo ? ` - ${song.tempo} BPM` : ""}</span>
                </span>
              </label>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">No songs available</div>
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

export function MusicClient({
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
  const [boardTab, setBoardTab] = useState<"youtube" | "featured" | "events">("youtube");
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [songSearch, setSongSearch] = useState("");
  const [gallerySearch, setGallerySearch] = useState("");
  const [gallerySort, setGallerySort] = useState("newest");
  const [singerSearch, setSingerSearch] = useState("");
  const [actionPlanSearch, setActionPlanSearch] = useState("");
  const [actionPlanStatus, setActionPlanStatus] = useState("all");
  const [notice, setNotice] = useState<MusicNotice | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [modal, setModal] = useState<null | "song" | "playlist" | "galleryUpload" | "groupsGenerate" | "groupsSettings" | "groupsPrevious" | "youtube" | "featured" | "boardItem">(null);
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
  const [viewingGeneration, setViewingGeneration] = useState<ServiceTeam | null>(null);
  const [lyricsSong, setLyricsSong] = useState<Song | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredPlaylists = useMemo(() => {
    const query = playlistSearch.trim().toLowerCase();
    if (!query) return playlists;

    return playlists.filter((playlist) =>
      [
        playlist.title,
        playlist.description,
        ...playlist.songs.flatMap((song) => [song.title, song.artist, song.keySignature]),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [playlistSearch, playlists]);

  const filteredSongs = useMemo(() => {
    const query = songSearch.trim().toLowerCase();
    if (!query) return songs;

    return songs.filter((song) =>
      [song.title, song.artist, song.keySignature, song.assignedSinger]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [songSearch, songs]);

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

  function runAction(action: () => Promise<{ ok: boolean; message: string }>, close?: () => void) {
    startTransition(async () => {
      const result = await action();
      setNotice(result);
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

  function submitCreateSong(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runAction(() => createSong(formData), () => setModal(null));
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
    runAction(() => createPlaylist(formData), () => setModal(null));
  }

  function submitUpdatePlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPlaylist) return;
    const formData = new FormData(event.currentTarget);
    runAction(() => updatePlaylist(editingPlaylist.id, formData), () => setEditingPlaylist(null));
  }

  function submitAddToPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    runAction(() => addSongToPlaylist(formData));
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

  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-4">
      <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="px-3 py-3 md:hidden">
          <MobileTabScroller tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>
        <nav className="hidden flex-wrap md:flex">
          {tabs.map((tab) => (
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
                        <button type="button" onClick={() => runAction(() => toggleYoutubePublish(video.id))} className="text-black hover:text-gray-600" title="Publish/Hide">{video.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
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
                        <button type="button" onClick={() => runAction(() => toggleFeaturedImagePublish(image.id))} className="text-black hover:text-gray-600" title="Publish/Hide">{image.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
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
                        <button type="button" onClick={() => runAction(() => toggleBoardItemPublish(item.id))} className="text-black hover:text-gray-600" title="Publish/Hide">{item.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
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
          <form onSubmit={submitAddToPlaylist} className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:mb-6 sm:rounded-2xl sm:p-4">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 sm:mb-3 sm:text-base">
              <Plus className="size-4 text-blue-600" aria-hidden />
              Add Song to Playlist
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3">
              <InlineDropdown
                name="playlistId"
                placeholder="Select Playlist"
                options={playlists.map((playlist) => ({ value: String(playlist.id), label: `${playlist.title} (${playlist.songs.length} songs)` }))}
              />
              <InlineDropdown
                name="songId"
                placeholder="Select Song"
                options={songs.map((song) => ({ value: String(song.id), label: song.title }))}
              />
              <button disabled={isPending} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:rounded-xl" type="submit">
                <Plus className="size-4" aria-hidden />
                Add
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
            <section className="lg:w-1/2">
              <div className="mb-2 flex items-center justify-between gap-2 border-b pb-2 sm:mb-3">
                <h4 className="min-w-0 text-sm font-semibold text-gray-700 sm:text-base">
                  <List className="mr-2 inline size-4 text-blue-600" aria-hidden />
                  <span>Playlists</span> <span className="ml-1 text-xs text-gray-400">({filteredPlaylists.length}/{playlists.length})</span>
                </h4>
                <button type="button" onClick={() => setModal("playlist")} className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white hover:bg-blue-700 sm:rounded-xl sm:px-3">
                  <Plus className="size-4" aria-hidden />
                  <span>New</span>
                </button>
              </div>
              <div className="relative mb-2 sm:mb-3">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input value={playlistSearch} onChange={(event) => setPlaylistSearch(event.target.value)} placeholder="Search playlists..." className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:rounded-xl" />
              </div>
              <div className="space-y-2 sm:max-h-[500px] sm:overflow-y-auto sm:pr-1">
                {filteredPlaylists.length > 0 ? filteredPlaylists.map((playlist) => (
                  <div key={playlist.id} className="rounded-xl border border-gray-200 p-2.5 transition hover:bg-gray-50 sm:rounded-2xl sm:p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h5 className="truncate text-sm font-medium text-gray-800 sm:text-base">{playlist.title}</h5>
                        <p className="text-xs text-gray-500">{playlist.songs.length} songs</p>
                        {playlist.description ? <p className="mt-1 line-clamp-2 text-xs text-gray-400">{playlist.description}</p> : null}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => setViewingPlaylist(playlist)} className="inline-flex size-9 items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-800 sm:size-auto sm:bg-transparent" title="View Songs"><FileText className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => setEditingPlaylist(playlist)} className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 sm:size-auto sm:bg-transparent" title="Edit Playlist"><Pencil className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => askConfirm({ title: "Delete Playlist", message: `Delete "${playlist.title}"? Songs will remain available, but this playlist will be removed.`, confirmLabel: "Delete Playlist", action: () => deletePlaylist(playlist.id) })} className="inline-flex size-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800 sm:size-auto sm:bg-transparent" title="Delete Playlist"><Trash2 className="size-4" aria-hidden /></button>
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
            </section>

            <section className="lg:w-1/2">
              <div className="mb-2 flex items-center justify-between gap-2 border-b pb-2 sm:mb-3">
                <h4 className="min-w-0 text-sm font-semibold text-gray-700 sm:text-base">
                  <Music className="mr-2 inline size-4 text-green-600" aria-hidden />
                  <span>Songs</span> <span className="ml-1 text-xs text-gray-400">({filteredSongs.length}/{songs.length})</span>
                </h4>
                <button type="button" onClick={() => setModal("song")} className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg bg-green-600 px-2.5 text-xs font-semibold text-white hover:bg-green-700 sm:rounded-xl sm:px-3">
                  <Plus className="size-4" aria-hidden />
                  <span>Add</span>
                </button>
              </div>
              <div className="relative mb-2 sm:mb-3">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input value={songSearch} onChange={(event) => setSongSearch(event.target.value)} placeholder="Search songs..." className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 sm:rounded-xl" />
              </div>
              <div className="space-y-2 sm:max-h-[450px] sm:overflow-y-auto sm:pr-1">
                {filteredSongs.length > 0 ? filteredSongs.map((song) => (
                  <div key={song.id} className="rounded-xl border border-gray-200 p-2.5 transition hover:bg-gray-50 sm:rounded-2xl sm:p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h5 className="truncate text-sm font-medium text-gray-800 sm:text-base">{song.title}</h5>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                          {song.artist ? <span>{song.artist}</span> : null}
                          {song.keySignature ? <span>Key: {song.keySignature}</span> : null}
                          {song.tempo ? <span>{song.tempo} BPM</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => setLyricsSong(song)} className="inline-flex size-9 items-center justify-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-800 sm:size-auto sm:bg-transparent" title="View Lyrics"><FileText className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => setEditingSong(song)} className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-800 sm:size-auto sm:bg-transparent" title="Edit Song"><Pencil className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => askConfirm({ title: "Delete Song", message: `Delete "${song.title}" from the music library?`, confirmLabel: "Delete Song", action: () => deleteSong(song.id) })} className="inline-flex size-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800 sm:size-auto sm:bg-transparent" title="Delete Song"><Trash2 className="size-4" aria-hidden /></button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center text-gray-500">
                    <Search className="mx-auto mb-2 size-9 text-gray-300" aria-hidden />
                    <p>No songs match your search</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {modal === "song" ? (
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
        <Modal title="Create New Playlist" onClose={() => setModal(null)}>
          <form onSubmit={submitCreatePlaylist} className="space-y-5 p-5">
            <PlaylistFields songs={songs} />
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isPending} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Create Playlist</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingSong ? (
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

      {editingPlaylist ? (
        <Modal title="Edit Playlist" onClose={() => setEditingPlaylist(null)}>
          <form onSubmit={submitUpdatePlaylist} className="space-y-5 p-5">
            <PlaylistFields songs={songs} playlist={editingPlaylist} />
            <div className="flex justify-end gap-2 border-t pt-4">
              <button type="button" onClick={() => setEditingPlaylist(null)} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={isPending} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Update Playlist</button>
            </div>
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
            {viewingPlaylist.songs.length > 0 ? (
              <div className="space-y-2">
                {viewingPlaylist.songs.map((song, index) => (
                  <div key={song.id} className="rounded-xl border border-gray-200 p-3">
                    <div className="text-sm font-semibold text-gray-800">{index + 1}. {song.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                      {song.artist ? <span>{song.artist}</span> : null}
                      {song.keySignature ? <span>Key: {song.keySignature}</span> : null}
                      {song.tempo ? <span>{song.tempo} BPM</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-gray-400">No songs in this playlist</div>
            )}
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
          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Key</p>
                <p className="text-sm font-medium text-slate-900">{lyricsSong.keySignature ?? "-"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Tempo</p>
                <p className="text-sm font-medium text-slate-900">{lyricsSong.tempo ? `${lyricsSong.tempo} BPM` : "-"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Singer</p>
                <p className="text-sm font-medium text-slate-900">{lyricsSong.assignedSinger ?? "-"}</p>
              </div>
            </div>
            <pre className="max-h-[50vh] whitespace-pre-wrap overflow-y-auto rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">
              {lyricsSong.lyrics || "No lyrics available."}
            </pre>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
