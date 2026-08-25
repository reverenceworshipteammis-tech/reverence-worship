export type SongProjectionSlide = {
  label: string | null;
  text: string;
  sections?: Array<{ label: string; text: string }>;
};

const MAX_LINES_PER_SLIDE = 6;
const SECTION_LABEL = /^\[([^\]\n]{1,80})\]$/;

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
