export type SongProjectionSlide = {
  label: string | null;
  text: string;
  sections?: Array<{ label: string; text: string }>;
};

const MAX_LINES_PER_SLIDE = 6;
const SECTION_LABEL = /^\[([^\]\n]{1,80})\]$/;
export const MAX_EDITABLE_SONG_LYRICS_LENGTH = 200_000;

export function validateProjectionSongLyrics(input: unknown) {
  if (typeof input !== "string") return { ok: false as const, message: "Enter the song lyrics." };
  const lyrics = input.replace(/\r\n?/g, "\n").trim();
  if (!lyrics) return { ok: false as const, message: "Song lyrics cannot be empty." };
  if (lyrics.length > MAX_EDITABLE_SONG_LYRICS_LENGTH) {
    return { ok: false as const, message: `Lyrics must be ${MAX_EDITABLE_SONG_LYRICS_LENGTH.toLocaleString()} characters or fewer.` };
  }
  return { ok: true as const, lyrics };
}

export function songProjectionSlides(lyrics: string | null | undefined): SongProjectionSlide[] {
  const normalized = lyrics?.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const slides: SongProjectionSlide[] = [];
  let pendingLabel: string | null = null;

  for (const block of blocks) {
    const labelMatch = block.match(SECTION_LABEL);
    if (labelMatch) {
      pendingLabel = labelMatch[1].trim();
      continue;
    }

    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    for (let index = 0; index < lines.length; index += MAX_LINES_PER_SLIDE) {
      slides.push({
        label: index === 0 ? pendingLabel : null,
        text: lines.slice(index, index + MAX_LINES_PER_SLIDE).join("\n"),
      });
    }
    pendingLabel = null;
  }

  if (pendingLabel) slides.push({ label: pendingLabel, text: pendingLabel });
  return slides;
}
