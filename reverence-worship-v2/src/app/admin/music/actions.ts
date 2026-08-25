"use server";

import { revalidatePath } from "next/cache";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { del as deleteBlob, put } from "@vercel/blob";
import { Prisma } from "@/generated/prisma/client";
import { requirePageAccess, requirePermission } from "@/lib/auth";
import {
  parsePlaylistServiceCount,
  parsePlaylistSessions,
  playlistServiceLabel,
} from "@/lib/playlist-rules";
import { prisma } from "@/lib/prisma";
import { excludeSuperAdminUserWhere } from "@/lib/system-account-rules";
import type { ImportedSong } from "@/lib/freeshow-import";
import {
  MAX_PROJECTION_OVERLAY_PRESETS,
  parseProjectionOverlayPresets,
  PROJECTION_OVERLAY_PRESETS_SETTING_KEY,
  validateProjectionOverlayPresetInput,
  type ProjectionOverlayPresetInput,
} from "@/lib/projection-overlays";

const MAX_FREESHOW_IMPORT_BATCH = 100;
const MAX_FREESHOW_IMPORT_TEXT = 3_250_000;
const MAX_FREESHOW_TITLE_LENGTH = 500;
const MAX_FREESHOW_FILENAME_LENGTH = 500;
const MAX_FREESHOW_LYRICS_LENGTH = 3_000_000;

async function storedProjectionOverlayPresets() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: PROJECTION_OVERLAY_PRESETS_SETTING_KEY },
    select: { value: true },
  });
  return parseProjectionOverlayPresets(setting?.value);
}

export async function saveProjectionOverlayPreset(input: ProjectionOverlayPresetInput) {
  await requirePageAccess("music-ministry");
  const parsed = validateProjectionOverlayPresetInput(input);
  if (!parsed.ok) return parsed;
  const presets = await storedProjectionOverlayPresets();
  const duplicateName = presets.find((preset) => preset.name.toLowerCase() === parsed.value.name.toLowerCase() && preset.id !== parsed.value.id);
  if (duplicateName) return { ok: false as const, message: `An overlay named “${duplicateName.name}” already exists.` };
  const existingIndex = parsed.value.id ? presets.findIndex((preset) => preset.id === parsed.value.id) : -1;
  if (existingIndex < 0 && presets.length >= MAX_PROJECTION_OVERLAY_PRESETS) {
    return { ok: false as const, message: `You can save up to ${MAX_PROJECTION_OVERLAY_PRESETS} overlay presets.` };
  }

  const preset = {
    ...parsed.value,
    id: existingIndex >= 0 ? presets[existingIndex].id : crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
  };
  if (existingIndex >= 0) presets[existingIndex] = preset;
  else presets.push(preset);
  const normalized = parseProjectionOverlayPresets(presets);
  await prisma.systemSetting.upsert({
    where: { key: PROJECTION_OVERLAY_PRESETS_SETTING_KEY },
    update: { value: normalized as unknown as Prisma.InputJsonValue, group: "music" },
    create: { key: PROJECTION_OVERLAY_PRESETS_SETTING_KEY, value: normalized as unknown as Prisma.InputJsonValue, group: "music" },
  });
  return { ok: true as const, message: existingIndex >= 0 ? "Overlay preset updated." : "Overlay preset saved.", preset, presets: normalized };
}

export async function deleteProjectionOverlayPreset(id: string) {
  await requirePageAccess("music-ministry");
  const normalizedId = typeof id === "string" ? id.trim().slice(0, 100) : "";
  if (!normalizedId) return { ok: false as const, message: "Select an overlay preset to delete." };
  const presets = await storedProjectionOverlayPresets();
  const nextPresets = presets.filter((preset) => preset.id !== normalizedId);
  if (nextPresets.length === presets.length) return { ok: false as const, message: "That overlay preset no longer exists." };
  await prisma.systemSetting.upsert({
    where: { key: PROJECTION_OVERLAY_PRESETS_SETTING_KEY },
    update: { value: nextPresets as unknown as Prisma.InputJsonValue, group: "music" },
    create: { key: PROJECTION_OVERLAY_PRESETS_SETTING_KEY, value: nextPresets as unknown as Prisma.InputJsonValue, group: "music" },
  });
  return { ok: true as const, message: "Overlay preset deleted.", presets: nextPresets };
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(formData: FormData, key: string) {
  const value = readString(formData, key);
  if (!value) return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readBoolean(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "1" || value === "true";
}

function normalizedSongIds(input: unknown) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((id): id is number => Number.isInteger(id) && id > 0))];
}

async function playlistSongsExist(songIds: number[]) {
  if (songIds.length === 0) return true;
  const count = await prisma.song.count({ where: { id: { in: songIds } } });
  return count === songIds.length;
}

function dateOnly(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function boundedProgress(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function extractYouTubeId(input: string) {
  try {
    const url = new URL(input);
    if (url.hostname === "youtu.be") return url.pathname.slice(1);
    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2];
    if (url.pathname.startsWith("/live/")) return url.pathname.split("/")[2];
    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2];
    return url.searchParams.get("v") || input;
  } catch {
    return input;
  }
}

async function saveUploadedImage(file: File, folder: "gallery" | "landing") {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const extension = path.extname(file.name) || ".jpg";
  const baseName = path
    .basename(file.name, extension)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const filename = `${Date.now()}-${crypto.randomUUID()}-${baseName || "image"}${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${folder}/${filename}`, file, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error("Image uploads on Vercel require Vercel Blob. Add BLOB_READ_WRITE_TOKEN in Vercel Environment Variables.");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });

  const diskPath = path.join(uploadDir, filename);
  const bytes = await file.arrayBuffer();

  await writeFile(diskPath, Buffer.from(bytes));

  return `/uploads/${folder}/${filename}`;
}

async function deleteUploadedImage(imagePath: string | null | undefined, folder: "gallery" | "landing") {
  if (!imagePath) return;

  if (imagePath.startsWith("https://")) {
    await deleteBlob(imagePath).catch(() => undefined);
    return;
  }

  if (imagePath.startsWith(`/uploads/${folder}/`)) {
    await unlink(path.join(process.cwd(), "public", imagePath)).catch(() => undefined);
  }
}

export async function createSong(formData: FormData) {
  const user = await requirePermission("music-ministry", "manage-songs");
  const title = readString(formData, "title");

  if (!title) {
    return { ok: false, message: "Song title is required." };
  }

  await prisma.song.create({
    data: {
      title,
      lyrics: readString(formData, "lyrics"),
      youtubeLink: readString(formData, "youtubeLink"),
      createdBy: user.id,
    },
  });

  revalidatePath("/admin/music");

  return { ok: true, message: "Song added successfully." };
}

function normalizeFreeShowSong(value: unknown): ImportedSong | null {
  if (!value || typeof value !== "object") return null;

  const song = value as Record<string, unknown>;
  const title = typeof song.title === "string" ? song.title.trim() : "";
  const lyrics = typeof song.lyrics === "string" ? song.lyrics.trim() : "";
  const artist = typeof song.artist === "string" && song.artist.trim() ? song.artist.trim() : null;
  const sourceFilename = typeof song.sourceFilename === "string" ? song.sourceFilename.trim().toLocaleLowerCase() : "";

  if (
    !title ||
    !lyrics ||
    !sourceFilename ||
    title.length > MAX_FREESHOW_TITLE_LENGTH ||
    lyrics.length > MAX_FREESHOW_LYRICS_LENGTH ||
    sourceFilename.length > MAX_FREESHOW_FILENAME_LENGTH
  ) {
    return null;
  }

  return { title, artist, lyrics, sourceFilename };
}

export async function importFreeShowSongBatch(input: unknown) {
  const user = await requirePermission("music-ministry", "manage-songs");

  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_FREESHOW_IMPORT_BATCH) {
    return {
      ok: false,
      message: `Each internal import batch must contain 1 to ${MAX_FREESHOW_IMPORT_BATCH} songs.`,
      imported: 0,
      duplicates: 0,
      failures: Array.isArray(input) ? input.length : 0,
    };
  }

  const parsedSongs = input.map(normalizeFreeShowSong).filter((song): song is ImportedSong => song !== null);
  const invalidSongs = input.length - parsedSongs.length;
  const textLength = parsedSongs.reduce(
    (total, song) => total + song.title.length + (song.artist?.length ?? 0) + song.lyrics.length,
    0,
  );

  if (textLength > MAX_FREESHOW_IMPORT_TEXT) {
    return {
      ok: false,
      message: "An internal FreeShow import batch is too large.",
      imported: 0,
      duplicates: 0,
      failures: input.length,
    };
  }

  const existingSongs = await prisma.song.findMany({
    select: { id: true, artist: true, lyrics: true, importedFilename: true },
  });
  const knownFilenames = new Set(existingSongs.flatMap((song) => song.importedFilename ? [song.importedFilename] : []));
  const legacySongsByContent = new Map<string, number[]>();
  for (const song of existingSongs) {
    if (song.importedFilename || !song.lyrics) continue;
    const contentKey = `${song.artist?.trim().toLocaleLowerCase() ?? ""}\u0000${song.lyrics.trim()}`;
    legacySongsByContent.set(contentKey, [...(legacySongsByContent.get(contentKey) ?? []), song.id]);
  }

  const songsToCreate: ImportedSong[] = [];
  const legacySongsToLink: Array<{ id: number; title: string; importedFilename: string }> = [];
  let duplicates = 0;

  for (const song of parsedSongs) {
    if (knownFilenames.has(song.sourceFilename)) {
      duplicates++;
      continue;
    }
    knownFilenames.add(song.sourceFilename);

    const contentKey = `${song.artist?.trim().toLocaleLowerCase() ?? ""}\u0000${song.lyrics.trim()}`;
    const legacySongIds = legacySongsByContent.get(contentKey);
    const legacySongId = legacySongIds?.shift();
    if (legacySongId) {
      legacySongsToLink.push({ id: legacySongId, title: song.title, importedFilename: song.sourceFilename });
      continue;
    }

    songsToCreate.push(song);
  }

  let imported = legacySongsToLink.length;
  if (legacySongsToLink.length > 0 || songsToCreate.length > 0) {
    const createdCount = await prisma.$transaction(async (transaction) => {
      if (legacySongsToLink.length > 0) {
        const legacyRows = Prisma.join(
          legacySongsToLink.map((song) => Prisma.sql`(${song.id}, ${song.title}, ${song.importedFilename})`),
        );
        await transaction.$executeRaw(Prisma.sql`
          UPDATE "songs" AS "song"
          SET
            "title" = "imported"."title",
            "imported_filename" = "imported"."filename",
            "updated_at" = NOW()
          FROM (VALUES ${legacyRows}) AS "imported"("id", "title", "filename")
          WHERE "song"."id" = "imported"."id"::integer
        `);
      }

      if (songsToCreate.length === 0) return 0;
      const result = await transaction.song.createMany({
        data: songsToCreate.map(({ sourceFilename, ...song }) => ({
          ...song,
          importedFilename: sourceFilename,
          createdBy: user.id,
        })),
        skipDuplicates: true,
      });
      return result.count;
    }, { timeout: 30_000 });

    imported += createdCount;
    duplicates += songsToCreate.length - createdCount;
    revalidatePath("/admin/music");
  }

  return {
    ok: imported > 0 || (duplicates > 0 && invalidSongs === 0),
    message: "FreeShow song batch processed.",
    imported,
    duplicates,
    failures: invalidSongs,
  };
}

async function syncMusicActionPlanProgress(actionPlanId: number) {
  const tasks = await prisma.actionPlanTask.findMany({
    where: { actionPlanId },
    select: { progress: true },
  });
  const progress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0;
  const status = progress === 100 ? "completed" : progress > 0 ? "in_progress" : "pending";

  await prisma.actionPlan.update({
    where: { id: actionPlanId, department: "music-ministry" },
    data: { progress, status },
  });
}

export async function saveMusicActionPlan(formData: FormData) {
  const user = await requirePermission("music-ministry", "manage-action-plans");
  const id = Number(readString(formData, "id"));
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const startDateValue = readString(formData, "startDate");
  const dueDateValue = readString(formData, "dueDate");
  const year = Number(readString(formData, "year") || new Date().getFullYear());

  if (!title || !startDateValue || !dueDateValue) {
    return { ok: false, message: "Action plan name, start date, and completion date are required." };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, message: "Please select a valid year." };
  }

  if (Number.isFinite(id) && id > 0) {
    await prisma.actionPlan.update({
      where: { id, department: "music-ministry" },
      data: {
        title,
        description,
        startDate: dateOnly(startDateValue),
        dueDate: dateOnly(dueDateValue),
        year,
      },
    });
  } else {
    await prisma.actionPlan.create({
      data: {
        title,
        description,
        startDate: dateOnly(startDateValue),
        dueDate: dateOnly(dueDateValue),
        department: "music-ministry",
        year,
        createdBy: user.id,
      },
    });
  }

  revalidatePath("/admin/music");
  return { ok: true, message: id ? "Action plan updated successfully." : "Action plan created successfully." };
}

export async function deleteMusicActionPlan(id: number) {
  await requirePermission("music-ministry", "manage-action-plans");

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Action plan not found." };
  }

  await prisma.actionPlan.delete({ where: { id, department: "music-ministry" } });
  revalidatePath("/admin/music");
  return { ok: true, message: "Action plan deleted successfully." };
}

export async function saveMusicActionPlanTask(formData: FormData) {
  await requirePermission("music-ministry", "manage-action-plans");
  const id = Number(readString(formData, "id"));
  const actionPlanId = Number(readString(formData, "actionPlanId"));
  const activity = readString(formData, "activity");
  const targetMilestone = readString(formData, "targetMilestone");
  const estimatedBudget = readString(formData, "estimatedBudget") || "0";
  const startDateValue = readString(formData, "startDate");
  const deadlineValue = readString(formData, "deadline");
  const priority = readString(formData, "priority") || "medium";
  const progress = boundedProgress(formData.get("progress"));

  if (!Number.isInteger(actionPlanId) || actionPlanId <= 0 || !activity || !targetMilestone || !deadlineValue) {
    return { ok: false, message: "Action plan, activity, milestone, and deadline are required." };
  }

  const plan = await prisma.actionPlan.findUnique({
    where: { id: actionPlanId, department: "music-ministry" },
    select: { id: true },
  });

  if (!plan) {
    return { ok: false, message: "Action plan not found." };
  }

  const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "pending";
  const data = {
    actionPlanId,
    taskName: activity,
    activity,
    targetMilestone,
    estimatedBudget,
    startDate: startDateValue ? dateOnly(startDateValue) : null,
    deadline: dateOnly(deadlineValue),
    priority,
    progress,
    status,
    startedAt: progress > 0 ? new Date() : null,
    completedAt: progress >= 100 ? new Date() : null,
  };

  if (Number.isFinite(id) && id > 0) {
    await prisma.actionPlanTask.update({
      where: { id },
      data,
    });
  } else {
    await prisma.actionPlanTask.create({ data });
  }

  await syncMusicActionPlanProgress(actionPlanId);
  revalidatePath("/admin/music");
  return { ok: true, message: id ? "Task updated successfully." : "Task created successfully." };
}

export async function deleteMusicActionPlanTask(id: number) {
  await requirePermission("music-ministry", "manage-action-plans");

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Task not found." };
  }

  const task = await prisma.actionPlanTask.findUnique({
    where: { id },
    select: { actionPlanId: true, actionPlan: { select: { department: true } } },
  });

  if (!task || task.actionPlan.department !== "music-ministry") {
    return { ok: false, message: "Task not found." };
  }

  await prisma.actionPlanTask.delete({ where: { id } });
  await syncMusicActionPlanProgress(task.actionPlanId);
  revalidatePath("/admin/music");
  return { ok: true, message: "Task deleted successfully." };
}

export async function deleteSong(songId: number) {
  await requirePermission("music-ministry", "delete-songs");

  await prisma.song.delete({
    where: { id: songId },
  });

  revalidatePath("/admin/music");

  return { ok: true, message: "Song deleted." };
}

export async function bulkArchiveSongs(input: unknown, archive: boolean) {
  await requirePermission("music-ministry", "delete-songs");
  const songIds = normalizedSongIds(input);
  if (songIds.length === 0) return { ok: false, message: "Select at least one song." };

  const result = await prisma.song.updateMany({
    where: { id: { in: songIds } },
    data: {
      isArchived: archive,
      archivedAt: archive ? new Date() : null,
    },
  });

  revalidatePath("/admin/music");
  return {
    ok: result.count > 0,
    message: archive
      ? `Archived ${result.count} song${result.count === 1 ? "" : "s"}.`
      : `Restored ${result.count} song${result.count === 1 ? "" : "s"}.`,
  };
}

export async function bulkDeleteSongs(input: unknown) {
  await requirePermission("music-ministry", "delete-songs");
  const songIds = normalizedSongIds(input);
  if (songIds.length === 0) return { ok: false, message: "Select at least one song." };

  const result = await prisma.song.deleteMany({ where: { id: { in: songIds } } });
  revalidatePath("/admin/music");
  return {
    ok: result.count > 0,
    message: `Permanently deleted ${result.count} song${result.count === 1 ? "" : "s"}.`,
  };
}

export async function bulkAddSongsToPlaylistSession(sessionId: number, input: unknown) {
  await requirePermission("music-ministry", "manage-playlists");
  const songIds = normalizedSongIds(input);

  if (!Number.isInteger(sessionId) || sessionId <= 0 || songIds.length === 0) {
    return { ok: false, message: "Choose a playlist session and at least one song." };
  }

  const result = await prisma.$transaction(async (transaction) => {
    const session = await transaction.playlistSession.findUnique({
      where: { id: sessionId },
      select: { id: true },
    });
    if (!session) return null;

    const [availableSongs, existingAssignments, lastAssignment] = await Promise.all([
      transaction.song.findMany({
        where: { id: { in: songIds }, isArchived: false },
        select: { id: true },
      }),
      transaction.playlistSong.findMany({
        where: { sessionId, songId: { in: songIds } },
        select: { songId: true },
      }),
      transaction.playlistSong.aggregate({
        where: { sessionId },
        _max: { displayOrder: true },
      }),
    ]);

    const existingSongIds = new Set(existingAssignments.map((assignment) => assignment.songId));
    const songsToAdd = availableSongs.filter((song) => !existingSongIds.has(song.id));
    const startingOrder = (lastAssignment._max.displayOrder ?? -1) + 1;

    if (songsToAdd.length > 0) {
      await transaction.playlistSong.createMany({
        data: songsToAdd.map((song, index) => ({
          sessionId,
          songId: song.id,
          displayOrder: startingOrder + index,
        })),
        skipDuplicates: true,
      });
    }

    return { added: songsToAdd.length, skipped: songIds.length - songsToAdd.length };
  }, { timeout: 30_000 });

  if (!result) return { ok: false, message: "Playlist session not found." };

  revalidatePath("/admin/music");
  return {
    ok: result.added > 0 || result.skipped > 0,
    message: [
      `Added ${result.added} song${result.added === 1 ? "" : "s"}`,
      result.skipped > 0 ? `skipped ${result.skipped} already assigned or archived song${result.skipped === 1 ? "" : "s"}` : null,
    ].filter(Boolean).join("; ") + ".",
  };
}

export async function updateSong(songId: number, formData: FormData) {
  await requirePermission("music-ministry", "manage-songs");
  const title = readString(formData, "title");

  if (!title) {
    return { ok: false, message: "Song title is required." };
  }

  await prisma.song.update({
    where: { id: songId },
    data: {
      title,
      lyrics: readString(formData, "lyrics"),
      youtubeLink: readString(formData, "youtubeLink"),
    },
  });

  revalidatePath("/admin/music");

  return { ok: true, message: "Song updated successfully." };
}

export async function createPlaylist(formData: FormData) {
  const user = await requirePermission("music-ministry", "manage-playlists");
  const title = readString(formData, "title");
  const serviceCount = parsePlaylistServiceCount(formData.get("serviceCount"));

  if (!title) {
    return { ok: false, message: "Playlist title is required." };
  }
  if (!serviceCount) {
    return { ok: false, message: "Number of services must be between 1 and 10." };
  }

  const { sessions, message } = parsePlaylistSessions(formData.get("sessions"), serviceCount);
  if (!sessions) return { ok: false, message: message ?? "Invalid playlist sessions." };
  const songIds = [...new Set(sessions.flatMap((session) => session.songs.map((song) => song.songId)))];
  if (!(await playlistSongsExist(songIds))) {
    return { ok: false, message: "One or more selected songs no longer exist." };
  }

  await prisma.playlist.create({
    data: {
      title,
      description: readString(formData, "description"),
      serviceCount,
      createdBy: user.id,
      sessions: {
        create: sessions.map((session) => ({
          serviceNumber: session.serviceNumber,
          name: session.name,
          displayOrder: session.displayOrder,
          songs: {
            create: session.songs.map((song, index) => ({
              songId: song.songId,
              displayOrder: index + 1,
              keySignature: song.keySignature || null,
              assignedSinger: song.assignedSinger || null,
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/admin/music");

  return { ok: true, message: `Playlist created with ${serviceCount} ${serviceCount === 1 ? "service" : "services"} and ${sessions.length} sessions.` };
}

export async function deletePlaylist(playlistId: number) {
  await requirePermission("music-ministry", "delete-playlists");

  await prisma.playlist.delete({
    where: { id: playlistId },
  });

  revalidatePath("/admin/music");

  return { ok: true, message: "Playlist deleted." };
}

export async function updatePlaylist(playlistId: number, formData: FormData) {
  await requirePermission("music-ministry", "manage-playlists");
  const title = readString(formData, "title");
  const serviceCount = parsePlaylistServiceCount(formData.get("serviceCount"));

  if (!title) {
    return { ok: false, message: "Playlist title is required." };
  }
  if (!serviceCount) {
    return { ok: false, message: "Number of services must be between 1 and 10." };
  }

  const { sessions, message } = parsePlaylistSessions(formData.get("sessions"), serviceCount);
  if (!sessions) return { ok: false, message: message ?? "Invalid playlist sessions." };
  const songIds = [...new Set(sessions.flatMap((session) => session.songs.map((song) => song.songId)))];
  if (!(await playlistSongsExist(songIds))) {
    return { ok: false, message: "One or more selected songs no longer exist." };
  }

  await prisma.playlist.update({
    where: { id: playlistId },
    data: {
      title,
      description: readString(formData, "description"),
      serviceCount,
      sessions: {
        deleteMany: {},
        create: sessions.map((session) => ({
          serviceNumber: session.serviceNumber,
          name: session.name,
          displayOrder: session.displayOrder,
          songs: {
            create: session.songs.map((song, index) => ({
              songId: song.songId,
              displayOrder: index + 1,
              keySignature: song.keySignature || null,
              assignedSinger: song.assignedSinger || null,
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/admin/music");

  return { ok: true, message: "Playlist updated successfully." };
}

export async function addSongToPlaylist(formData: FormData) {
  await requirePermission("music-ministry", "manage-playlists");

  const playlistId = readNumber(formData, "playlistId");
  const songId = readNumber(formData, "songId");
  const sessionId = readNumber(formData, "sessionId");

  if (!Number.isInteger(playlistId) || !Number.isInteger(songId) || !Number.isInteger(sessionId) || !playlistId || !songId || !sessionId) {
    return { ok: false, message: "Choose a playlist, session, and song first." };
  }

  const session = await prisma.playlistSession.findFirst({
    where: { id: sessionId, playlistId },
    select: { id: true, name: true, serviceNumber: true },
  });
  if (!session) return { ok: false, message: "The selected playlist session no longer exists." };
  if (!(await playlistSongsExist([songId]))) {
    return { ok: false, message: "The selected song no longer exists." };
  }

  const maxOrder = await prisma.playlistSong.aggregate({
    where: { sessionId },
    _max: { displayOrder: true },
  });

  await prisma.playlistSong.upsert({
    where: {
      sessionId_songId: {
        sessionId,
        songId,
      },
    },
    create: {
      sessionId,
      songId,
      displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
    },
    update: {},
  });

  revalidatePath("/admin/music");

  return { ok: true, message: `Song assigned to ${playlistServiceLabel(session.serviceNumber)} — ${session.name}.` };
}

export async function uploadGalleryPhotos(formData: FormData) {
  const user = await requirePermission("music-ministry", "manage-gallery");
  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const caption = readString(formData, "caption");

  if (files.length === 0) {
    return { ok: false, message: "Select at least one photo." };
  }

  const created = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, message: "Only image files are allowed." };
    }

    let imagePath: string;
    try {
      imagePath = await saveUploadedImage(file, "gallery");
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Photo upload failed." };
    }
    const baseName = path.basename(file.name, path.extname(file.name));

    created.push({
      title: caption || baseName || "Untitled",
      imagePath,
      description: caption,
      eventDate: new Date(),
      createdBy: user.id,
    });
  }

  await prisma.photoGallery.createMany({
    data: created,
  });

  revalidatePath("/admin/music");

  return { ok: true, message: `${created.length} photo(s) uploaded successfully.` };
}

export async function updateGalleryPhoto(photoId: number, formData: FormData) {
  await requirePermission("music-ministry", "manage-gallery");
  const title = readString(formData, "title");

  if (!title) {
    return { ok: false, message: "Photo title is required." };
  }

  await prisma.photoGallery.update({
    where: { id: photoId },
    data: {
      title,
      altText: title,
      description: readString(formData, "caption"),
      category: readString(formData, "category"),
      tags: readString(formData, "tags"),
    },
  });

  revalidatePath("/admin/music");

  return { ok: true, message: "Photo updated successfully." };
}

export async function deleteGalleryPhoto(photoId: number) {
  await requirePermission("music-ministry", "delete-gallery");

  const photo = await prisma.photoGallery.findUnique({
    where: { id: photoId },
    select: { imagePath: true },
  });

  await deleteUploadedImage(photo?.imagePath, "gallery");

  await prisma.photoGallery.delete({
    where: { id: photoId },
  });

  revalidatePath("/admin/music");

  return { ok: true, message: "Photo deleted successfully." };
}

export async function updateSingerSettings(formData: FormData) {
  await requirePermission("music-ministry", "manage-service-teams");

  const updates = Array.from(formData.entries())
    .filter(([key]) => key.startsWith("singer:"))
    .map(([key, value]) => {
      const [, userId, field] = key.split(":");
      return {
        userId: Number(userId),
        field,
        value: typeof value === "string" && value.trim() ? value.trim() : null,
      };
    })
    .filter((item) => Number.isFinite(item.userId) && ["voicePart", "singerLevel"].includes(item.field));

  await prisma.$transaction(
    updates.map((item) =>
      prisma.user.update({
        where: { id: item.userId },
        data: {
          ...(item.field === "voicePart" ? { voicePart: item.value } : {}),
          ...(item.field === "singerLevel" ? { singerLevel: item.value } : {}),
        },
      }),
    ),
  );

  revalidatePath("/admin/music");

  return { ok: true, message: "Singer settings saved." };
}

type SingerForGroups = {
  id: number;
  name: string;
  email: string;
  voicePart: string | null;
  singerLevel: string | null;
};

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildBalancedTeams(singers: SingerForGroups[], numberOfTeams: number) {
  const teams = new Map<number, SingerForGroups[]>();
  for (let teamNumber = 1; teamNumber <= numberOfTeams; teamNumber++) {
    teams.set(teamNumber, []);
  }

  const byVoice = new Map<string, { good: SingerForGroups[]; normal: SingerForGroups[] }>();
  for (const singer of singers) {
    const voice = singer.voicePart || "Unknown";
    const entry = byVoice.get(voice) ?? { good: [], normal: [] };
    if (singer.singerLevel === "Good") entry.good.push(singer);
    else entry.normal.push(singer);
    byVoice.set(voice, entry);
  }

  for (const [voice, groups] of byVoice) {
    const sortedTeams = Array.from(teams.keys()).sort(
      (a, b) =>
        teams.get(a)!.filter((member) => member.voicePart === voice).length -
        teams.get(b)!.filter((member) => member.voicePart === voice).length,
    );

    [...shuffle(groups.good), ...shuffle(groups.normal)].forEach((singer, index) => {
      const teamNumber = sortedTeams[index % sortedTeams.length];
      teams.get(teamNumber)!.push(singer);
    });
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const ordered = Array.from(teams.entries()).sort((a, b) => b[1].length - a[1].length);
    const largest = ordered[0];
    const smallest = ordered[ordered.length - 1];

    if (!largest || !smallest || largest[1].length - smallest[1].length <= 1) break;

    const moveIndex = largest[1].findIndex((member) => member.singerLevel !== "Good");
    const [member] = largest[1].splice(moveIndex >= 0 ? moveIndex : largest[1].length - 1, 1);
    smallest[1].push(member);
  }

  const voicePriority = new Map([
    ["Soprano", 1],
    ["Alto", 2],
    ["Tenor", 3],
    ["Bass", 4],
    ["Musician", 5],
  ]);

  for (const members of teams.values()) {
    members.sort((a, b) => (voicePriority.get(a.voicePart || "") ?? 99) - (voicePriority.get(b.voicePart || "") ?? 99));
  }

  return teams;
}

export async function generateServiceTeams(formData: FormData) {
  const user = await requirePermission("music-ministry", "manage-service-teams");
  const serviceName = readString(formData, "serviceName");
  const serviceDate = readString(formData, "serviceDate");
  const numberOfTeams = readNumber(formData, "numberOfTeams") ?? 2;

  if (!serviceName || !serviceDate) {
    return { ok: false, message: "Service name and date are required." };
  }

  const singers = await prisma.user.findMany({
    where: {
      membershipType: "permanent",
      status: "active",
      voicePart: { not: null },
      singerLevel: { not: null },
      ...excludeSuperAdminUserWhere(),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      voicePart: true,
      singerLevel: true,
    },
  });

  if (singers.length === 0) {
    return { ok: false, message: "No permanent singers with voice part and level found." };
  }

  const teamCount = Math.min(Math.max(numberOfTeams, 1), 10);
  const teams = buildBalancedTeams(singers, teamCount);

  await prisma.serviceTeam.create({
    data: {
      serviceName,
      serviceDate: new Date(serviceDate),
      numberOfTeams: teamCount,
      createdBy: user.id,
      members: {
        create: Array.from(teams.entries()).flatMap(([teamNumber, members]) =>
          members.map((member) => ({
            teamNumber,
            userId: member.id,
            voicePart: member.voicePart,
            performanceLevel: member.singerLevel,
          })),
        ),
      },
    },
  });

  revalidatePath("/admin/music");

  return { ok: true, message: `Successfully distributed ${singers.length} singers into ${teamCount} teams.` };
}

export async function restoreServiceTeam(serviceTeamId: number) {
  const user = await requirePermission("music-ministry", "manage-service-teams");
  const oldGeneration = await prisma.serviceTeam.findUnique({
    where: { id: serviceTeamId },
    include: { members: true },
  });

  if (!oldGeneration) {
    return { ok: false, message: "Generation not found." };
  }

  await prisma.serviceTeam.create({
    data: {
      serviceName: `${oldGeneration.serviceName} (Restored)`,
      serviceDate: oldGeneration.serviceDate,
      numberOfTeams: oldGeneration.numberOfTeams,
      createdBy: user.id,
      members: {
        create: oldGeneration.members.map((member) => ({
          teamNumber: member.teamNumber,
          userId: member.userId,
          voicePart: member.voicePart,
          performanceLevel: member.performanceLevel,
        })),
      },
    },
  });

  revalidatePath("/admin/music");

  return { ok: true, message: "Generation restored successfully." };
}

export async function deleteServiceTeam(serviceTeamId: number) {
  await requirePermission("music-ministry", "manage-service-teams");

  await prisma.serviceTeam.delete({
    where: { id: serviceTeamId },
  });

  revalidatePath("/admin/music");

  return { ok: true, message: "Service team deleted successfully." };
}

export async function saveBoardItem(formData: FormData) {
  const user = await requirePermission("music-ministry", "manage-public-board");
  const id = readNumber(formData, "id");
  const title = readString(formData, "title");
  const content = readString(formData, "content");
  const type = readString(formData, "type") || "update";
  const eventDate = readString(formData, "eventDate");

  if (!title || !content) {
    return { ok: false, message: "Title and details are required." };
  }

  if (!["event", "update"].includes(type)) {
    return { ok: false, message: "Invalid board item type." };
  }

  const data = {
    title,
    content,
    type,
    eventDate: type === "event" && eventDate ? new Date(eventDate) : null,
    isPublished: readBoolean(formData, "isPublished"),
    isPinned: readBoolean(formData, "isPinned"),
  };

  if (id) {
    await prisma.publicBoardItem.update({ where: { id }, data });
  } else {
    await prisma.publicBoardItem.create({ data: { ...data, createdBy: user.id } });
  }

  revalidatePath("/admin/music");

  return { ok: true, message: id ? "Board item updated." : "Board item created." };
}

export async function toggleBoardItemPublish(id: number) {
  await requirePermission("music-ministry", "manage-public-board");
  const item = await prisma.publicBoardItem.findUnique({ where: { id }, select: { isPublished: true } });
  if (!item) return { ok: false, message: "Board item not found." };
  await prisma.publicBoardItem.update({ where: { id }, data: { isPublished: !item.isPublished } });
  revalidatePath("/admin/music");
  return { ok: true, message: "Board item updated." };
}

export async function toggleBoardItemPin(id: number) {
  await requirePermission("music-ministry", "manage-public-board");
  const item = await prisma.publicBoardItem.findUnique({ where: { id }, select: { isPinned: true } });
  if (!item) return { ok: false, message: "Board item not found." };
  await prisma.publicBoardItem.update({ where: { id }, data: { isPinned: !item.isPinned } });
  revalidatePath("/admin/music");
  return { ok: true, message: "Board item updated." };
}

export async function deleteBoardItem(id: number) {
  await requirePermission("music-ministry", "delete-public-board");
  await prisma.publicBoardItem.delete({ where: { id } });
  revalidatePath("/admin/music");
  return { ok: true, message: "Board item deleted." };
}

export async function saveYoutubeVideo(formData: FormData) {
  const user = await requirePermission("music-ministry", "manage-landing-media");
  const id = readNumber(formData, "id");
  const title = readString(formData, "title");
  const youtubeLink = readString(formData, "youtubeLink");

  if (!title || !youtubeLink) {
    return { ok: false, message: "Title and YouTube link are required." };
  }

  const data = {
    title,
    youtubeId: extractYouTubeId(youtubeLink),
    isPublished: readBoolean(formData, "isPublished"),
  };

  if (id) {
    await prisma.landingYoutubeVideo.update({ where: { id }, data });
  } else {
    const maxOrder = await prisma.landingYoutubeVideo.aggregate({ _max: { sortOrder: true } });
    await prisma.landingYoutubeVideo.create({
      data: { ...data, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1, createdBy: user.id },
    });
  }

  revalidatePath("/admin/music");

  return { ok: true, message: id ? "YouTube video updated." : "YouTube video added." };
}

export async function toggleYoutubePublish(id: number) {
  await requirePermission("music-ministry", "manage-landing-media");
  const video = await prisma.landingYoutubeVideo.findUnique({ where: { id }, select: { isPublished: true } });
  if (!video) return { ok: false, message: "Video not found." };
  await prisma.landingYoutubeVideo.update({ where: { id }, data: { isPublished: !video.isPublished } });
  revalidatePath("/admin/music");
  return { ok: true, message: "Video updated." };
}

export async function deleteYoutubeVideo(id: number) {
  await requirePermission("music-ministry", "delete-landing-media");
  await prisma.landingYoutubeVideo.delete({ where: { id } });
  revalidatePath("/admin/music");
  return { ok: true, message: "Video deleted." };
}

export async function saveFeaturedImage(formData: FormData) {
  const user = await requirePermission("music-ministry", "manage-landing-media");
  const id = readNumber(formData, "id");
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const file = formData.get("image");

  if (!title) {
    return { ok: false, message: "Image title is required." };
  }

  let imagePath: string | undefined;
  if (file instanceof File && file.size > 0) {
    try {
      imagePath = await saveUploadedImage(file, "landing");
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Image upload failed." };
    }
  }

  if (id) {
    const current = await prisma.landingFeaturedImage.findUnique({ where: { id }, select: { imagePath: true } });
    await prisma.landingFeaturedImage.update({
      where: { id },
      data: {
        title,
        description,
        isPublished: readBoolean(formData, "isPublished"),
        ...(imagePath ? { imagePath } : {}),
      },
    });
    if (imagePath) await deleteUploadedImage(current?.imagePath, "landing");
  } else {
    if (!imagePath) return { ok: false, message: "Select an image to upload." };
    const maxOrder = await prisma.landingFeaturedImage.aggregate({ _max: { sortOrder: true } });
    await prisma.landingFeaturedImage.create({
      data: {
        title,
        description,
        imagePath,
        isPublished: readBoolean(formData, "isPublished"),
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        createdBy: user.id,
      },
    });
  }

  revalidatePath("/admin/music");

  return { ok: true, message: id ? "Featured image updated." : "Featured image added." };
}

export async function toggleFeaturedImagePublish(id: number) {
  await requirePermission("music-ministry", "manage-landing-media");
  const image = await prisma.landingFeaturedImage.findUnique({ where: { id }, select: { isPublished: true, isHero: true } });
  if (!image) return { ok: false, message: "Image not found." };
  const willPublish = !image.isPublished;
  await prisma.landingFeaturedImage.update({ where: { id }, data: { isPublished: willPublish, isHero: willPublish ? image.isHero : false } });
  revalidatePath("/admin/music");
  return { ok: true, message: "Featured image updated." };
}

export async function toggleFeaturedImageHero(id: number) {
  await requirePermission("music-ministry", "manage-landing-media");
  const image = await prisma.landingFeaturedImage.findUnique({ where: { id }, select: { isHero: true, isPublished: true } });
  if (!image) return { ok: false, message: "Image not found." };
  const isHero = !image.isHero;
  await prisma.landingFeaturedImage.update({ where: { id }, data: { isHero, isPublished: isHero ? true : image.isPublished } });
  revalidatePath("/admin/music");
  return { ok: true, message: isHero ? "Image added to hero." : "Image removed from hero." };
}

export async function deleteFeaturedImage(id: number) {
  await requirePermission("music-ministry", "delete-landing-media");
  const image = await prisma.landingFeaturedImage.findUnique({ where: { id }, select: { imagePath: true } });
  await deleteUploadedImage(image?.imagePath, "landing");
  await prisma.landingFeaturedImage.delete({ where: { id } });
  revalidatePath("/admin/music");
  return { ok: true, message: "Featured image deleted." };
}
