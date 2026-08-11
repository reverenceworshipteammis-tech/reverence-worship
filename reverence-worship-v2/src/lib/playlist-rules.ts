export const MIN_PLAYLIST_SERVICES = 1;
export const MAX_PLAYLIST_SERVICES = 10;
export const MAX_PLAYLIST_SESSIONS_PER_SERVICE = 20;

const serviceNumberWords = [
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

export function parsePlaylistServiceCount(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= MIN_PLAYLIST_SERVICES && parsed <= MAX_PLAYLIST_SERVICES
    ? parsed
    : null;
}

export function playlistServiceLabel(serviceNumber: number) {
  return `Service ${serviceNumberWords[serviceNumber - 1] ?? serviceNumber}`;
}

export function compactPlaylistSessions<T>(sessions: readonly (T | null | undefined)[]) {
  return sessions.filter((session): session is T => session != null);
}

export function movePlaylistSession<
  T extends { clientId: string; serviceNumber: number },
>(
  sessions: readonly (T | null | undefined)[],
  serviceNumber: number,
  sessionId: string,
  direction: -1 | 1,
) {
  const validSessions = compactPlaylistSessions(sessions);
  const ordered = validSessions.filter((session) => session.serviceNumber === serviceNumber);
  const currentIndex = ordered.findIndex((session) => session.clientId === sessionId);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
    return validSessions;
  }

  [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
  let replacementIndex = 0;
  return validSessions.map((session) =>
    session.serviceNumber === serviceNumber ? ordered[replacementIndex++] : session,
  );
}

export function groupPlaylistSessionsByService<
  T extends { serviceNumber: number; displayOrder: number },
>(serviceCount: number, sessions: T[]) {
  return Array.from({ length: serviceCount }, (_, index) => {
    const serviceNumber = index + 1;
    return {
      serviceNumber,
      label: playlistServiceLabel(serviceNumber),
      sessions: sessions
        .filter((session) => session.serviceNumber === serviceNumber)
        .sort((left, right) => left.displayOrder - right.displayOrder),
    };
  });
}

export type ParsedPlaylistSession = {
  serviceNumber: number;
  name: string;
  displayOrder: number;
  songs: ParsedPlaylistSongAssignment[];
};

export type ParsedPlaylistSongAssignment = {
  songId: number;
  keySignature: string;
  assignedSinger: string;
};

export function parsePlaylistSessions(value: unknown, serviceCount: number): {
  sessions: ParsedPlaylistSession[] | null;
  message: string | null;
} {
  if (typeof value !== "string") {
    return { sessions: null, message: "Playlist sessions are required." };
  }

  let input: unknown;
  try {
    input = JSON.parse(value);
  } catch {
    return { sessions: null, message: "Playlist sessions are invalid." };
  }
  if (!Array.isArray(input)) {
    return { sessions: null, message: "Playlist sessions are invalid." };
  }

  const sessionCounts = new Map<number, number>();
  const sessions: ParsedPlaylistSession[] = [];

  for (const entry of input) {
    if (!entry || typeof entry !== "object") {
      return { sessions: null, message: "A playlist session is invalid." };
    }
    const record = entry as Record<string, unknown>;
    const serviceNumber = Number(record.serviceNumber);
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const rawAssignments = Array.isArray(record.songAssignments)
      ? record.songAssignments
      : Array.isArray(record.songIds)
        ? record.songIds.map((songId) => ({ songId }))
        : [];

    if (!Number.isInteger(serviceNumber) || serviceNumber < 1 || serviceNumber > serviceCount) {
      return { sessions: null, message: "A session is assigned to an invalid service." };
    }
    if (name.length > 80) {
      return { sessions: null, message: "Session headings must be 80 characters or fewer." };
    }

    const displayOrder = (sessionCounts.get(serviceNumber) ?? 0) + 1;
    if (displayOrder > MAX_PLAYLIST_SESSIONS_PER_SERVICE) {
      return { sessions: null, message: `${playlistServiceLabel(serviceNumber)} has too many sessions.` };
    }
    sessionCounts.set(serviceNumber, displayOrder);

    const songs: ParsedPlaylistSongAssignment[] = [];
    const songIds = new Set<number>();
    for (const assignment of rawAssignments) {
      if (!assignment || typeof assignment !== "object") {
        return { sessions: null, message: `${name || "A session"} contains an invalid song.` };
      }
      const assignmentRecord = assignment as Record<string, unknown>;
      const songId = Number(assignmentRecord.songId);
      const keySignature = typeof assignmentRecord.keySignature === "string" ? assignmentRecord.keySignature.trim() : "";
      const assignedSinger = typeof assignmentRecord.assignedSinger === "string" ? assignmentRecord.assignedSinger.trim() : "";
      if (!Number.isInteger(songId) || songId <= 0 || keySignature.length > 30 || assignedSinger.length > 120) {
        return { sessions: null, message: `${name || "A session"} contains invalid song performance details.` };
      }
      if (!songIds.has(songId)) songs.push({ songId, keySignature, assignedSinger });
      songIds.add(songId);
    }
    sessions.push({ serviceNumber, name, displayOrder, songs });
  }

  for (let serviceNumber = 1; serviceNumber <= serviceCount; serviceNumber += 1) {
    if (!sessionCounts.has(serviceNumber)) {
      return { sessions: null, message: `${playlistServiceLabel(serviceNumber)} needs at least one session.` };
    }
  }

  return { sessions, message: null };
}
