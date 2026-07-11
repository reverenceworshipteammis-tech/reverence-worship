"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  GalleryHorizontal,
  ImageIcon,
  List,
  ListMusic,
  MicVocal,
  Music,
  Pencil,
  Plus,
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
  deletePlaylist,
  deleteSong,
  deleteServiceTeam,
  deleteYoutubeVideo,
  generateServiceTeams,
  restoreServiceTeam,
  saveBoardItem,
  saveFeaturedImage,
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

type MusicClientProps = {
  playlists: Playlist[];
  songs: Song[];
  gallery: GalleryPhoto[];
  singers: Singer[];
  serviceTeams: ServiceTeam[];
  boardItems: BoardItem[];
  youtubeVideos: YoutubeVideo[];
  featuredImages: FeaturedImage[];
};

const tabs = [
  { id: "playlist", label: "Playlist", icon: ListMusic },
  { id: "gallery", label: "Photo Gallery", icon: GalleryHorizontal },
  { id: "groups", label: "Groups", icon: Users },
  { id: "board", label: "Public Board", icon: MicVocal },
  { id: "actionPlan", label: "Action Plans", icon: FileText },
];

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/50 px-3 py-6 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
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
}: MusicClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("playlist");
  const [boardTab, setBoardTab] = useState<"youtube" | "featured" | "events">("youtube");
  const [songSearch, setSongSearch] = useState("");
  const [gallerySearch, setGallerySearch] = useState("");
  const [gallerySort, setGallerySort] = useState("newest");
  const [singerSearch, setSingerSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "song" | "playlist" | "galleryUpload" | "groupsGenerate" | "groupsSettings" | "groupsPrevious" | "youtube" | "featured" | "boardItem">(null);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);
  const [editingYoutube, setEditingYoutube] = useState<YoutubeVideo | null>(null);
  const [editingFeatured, setEditingFeatured] = useState<FeaturedImage | null>(null);
  const [editingBoardItem, setEditingBoardItem] = useState<BoardItem | null>(null);
  const [viewingPlaylist, setViewingPlaylist] = useState<Playlist | null>(null);
  const [viewingGeneration, setViewingGeneration] = useState<ServiceTeam | null>(null);
  const [lyricsSong, setLyricsSong] = useState<Song | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function runAction(action: () => Promise<{ ok: boolean; message: string }>, close?: () => void) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (result.ok) {
        close?.();
        router.refresh();
      }
    });
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

  const lightboxPhoto = lightboxIndex === null ? null : filteredGallery[lightboxIndex];

  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-4">
      <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="md:hidden p-2">
          <select value={activeTab} onChange={(event) => setActiveTab(event.target.value)} className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
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

      {message ? <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">{message}</div> : null}

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
                        <button type="button" onClick={() => runAction(() => deleteGalleryPhoto(photo.id))} className="rounded-full bg-white p-1.5 shadow-md hover:bg-gray-100" title="Delete Photo">
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
            <nav className="flex overflow-x-auto border-b border-gray-200">
              {[
                { id: "youtube", label: "Video", icon: Music },
                { id: "featured", label: "Image", icon: ImageIcon },
                { id: "events", label: "Events & Updates", icon: CalendarDays },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBoardTab(tab.id as "youtube" | "featured" | "events")}
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
                        <button type="button" onClick={() => runAction(() => deleteYoutubeVideo(video.id))} className="text-black hover:text-gray-600" title="Delete"><Trash2 className="size-4" /></button>
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
                        <button type="button" onClick={() => runAction(() => deleteFeaturedImage(image.id))} className="text-black hover:text-gray-600" title="Delete"><Trash2 className="size-4" /></button>
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
                        <button type="button" onClick={() => runAction(() => deleteBoardItem(item.id))} className="text-black hover:text-gray-600" title="Delete"><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                  </article>
                )) : <div className="py-10 text-center text-sm text-gray-500">No events or updates yet.</div>}
              </div>
            </section>
          ) : null}
        </div>
      ) : activeTab !== "playlist" ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <Music className="mx-auto mb-3 size-10 text-gray-300" aria-hidden />
          <h3 className="text-base font-semibold text-gray-800">Next tab coming after Groups</h3>
          <p className="mt-1 text-sm text-gray-500">We are building this department one tab at a time.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-6">
          <form onSubmit={submitAddToPlaylist} className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-700">
              <Plus className="size-4 text-blue-600" aria-hidden />
              Add Song to Playlist
            </h4>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select name="playlistId" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Playlist</option>
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>{playlist.title} ({playlist.songs.length} songs)</option>
                ))}
              </select>
              <select name="songId" className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Song</option>
                {songs.map((song) => (
                  <option key={song.id} value={song.id}>{song.title}</option>
                ))}
              </select>
              <button disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60" type="submit">
                <Plus className="size-4" aria-hidden />
                Add
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-5 lg:flex-row">
            <section className="lg:w-1/2">
              <div className="mb-3 flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="font-semibold text-gray-700">
                  <List className="mr-2 inline size-4 text-blue-600" aria-hidden />
                  Playlists <span className="ml-2 text-xs text-gray-400">({playlists.length} total)</span>
                </h4>
                <button type="button" onClick={() => setModal("playlist")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                  <Plus className="size-4" aria-hidden />
                  New Playlist
                </button>
              </div>
              <div className="space-y-2 sm:max-h-[500px] sm:overflow-y-auto sm:pr-1">
                {playlists.length > 0 ? playlists.map((playlist) => (
                  <div key={playlist.id} className="rounded-2xl border border-gray-200 p-3 transition hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h5 className="font-medium text-gray-800">{playlist.title}</h5>
                        <p className="text-xs text-gray-500">{playlist.songs.length} songs</p>
                        {playlist.description ? <p className="mt-1 line-clamp-2 text-xs text-gray-400">{playlist.description}</p> : null}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => setViewingPlaylist(playlist)} className="text-green-600 hover:text-green-800" title="View Songs"><Eye className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => setEditingPlaylist(playlist)} className="text-blue-600 hover:text-blue-800" title="Edit Playlist"><Pencil className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => runAction(() => deletePlaylist(playlist.id))} className="text-red-600 hover:text-red-800" title="Delete Playlist"><Trash2 className="size-4" aria-hidden /></button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center text-gray-500">
                    <List className="mx-auto mb-2 size-9 text-gray-300" aria-hidden />
                    <p>No playlists yet</p>
                  </div>
                )}
              </div>
            </section>

            <section className="lg:w-1/2">
              <div className="mb-3 flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="font-semibold text-gray-700">
                  <Music className="mr-2 inline size-4 text-green-600" aria-hidden />
                  Songs <span className="ml-2 text-xs text-gray-400">({songs.length} total)</span>
                </h4>
                <button type="button" onClick={() => setModal("song")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">
                  <Plus className="size-4" aria-hidden />
                  Add Song
                </button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input value={songSearch} onChange={(event) => setSongSearch(event.target.value)} placeholder="Search songs by title, key, artist, singer..." className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="space-y-2 sm:max-h-[450px] sm:overflow-y-auto sm:pr-1">
                {filteredSongs.length > 0 ? filteredSongs.map((song) => (
                  <div key={song.id} className="rounded-2xl border border-gray-200 p-3 transition hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h5 className="font-medium text-gray-800">{song.title}</h5>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                          {song.artist ? <span>{song.artist}</span> : null}
                          {song.keySignature ? <span>Key: {song.keySignature}</span> : null}
                          {song.tempo ? <span>{song.tempo} BPM</span> : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={() => setLyricsSong(song)} className="text-green-600 hover:text-green-800" title="View Lyrics"><FileText className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => setEditingSong(song)} className="text-blue-600 hover:text-blue-800" title="Edit Song"><Pencil className="size-4" aria-hidden /></button>
                        <button type="button" onClick={() => runAction(() => deleteSong(song.id))} className="text-red-600 hover:text-red-800" title="Delete Song"><Trash2 className="size-4" aria-hidden /></button>
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
                        <button type="button" onClick={() => runAction(() => deleteServiceTeam(generation.id))} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Delete</button>
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
