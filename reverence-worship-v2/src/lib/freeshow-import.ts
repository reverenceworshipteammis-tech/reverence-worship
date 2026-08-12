type UnknownRecord = Record<string, unknown>;

export type FreeShowSong = {
  title: string;
  artist: string | null;
  lyrics: string;
};

export type ImportedSong = FreeShowSong & {
  sourceFilename: string;
};

export function identifyImportedSong(song: FreeShowSong, filename: string): ImportedSong {
  const sourceFilename = filename.trim().toLocaleLowerCase();
  const title = filename.replace(/\.(show|txt)$/i, "").trim();
  if (!sourceFilename || !title) throw new Error("The file has no usable filename.");

  return { ...song, title, sourceFilename };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function slideText(slide: UnknownRecord) {
  const blocks: string[] = [];
  const group = nonEmptyString(slide.group);
  if (group) blocks.push(`[${group}]`);

  if (!Array.isArray(slide.items)) return blocks.join("\n\n");

  for (const item of slide.items) {
    if (!isRecord(item) || !Array.isArray(item.lines)) continue;
    const lines: string[] = [];

    for (const line of item.lines) {
      if (!isRecord(line) || !Array.isArray(line.text)) continue;
      const text = line.text
        .map((segment) => isRecord(segment) && typeof segment.value === "string" ? segment.value : "")
        .join("")
        .trimEnd();
      if (text) lines.push(text);
    }

    const block = lines.join("\n").trim();
    if (block) blocks.push(block);
  }

  return blocks.join("\n\n");
}

function orderedSlides(show: UnknownRecord) {
  if (!isRecord(show.slides)) return [];
  const slides = show.slides;
  const settings = isRecord(show.settings) ? show.settings : {};
  const layouts = isRecord(show.layouts) ? show.layouts : {};
  const activeLayoutId = nonEmptyString(settings.activeLayout) ?? Object.keys(layouts)[0] ?? null;
  const activeLayout = activeLayoutId && isRecord(layouts[activeLayoutId]) ? layouts[activeLayoutId] : null;
  const layoutSlides = activeLayout && Array.isArray(activeLayout.slides) ? activeLayout.slides : null;

  if (!layoutSlides) {
    return Object.values(slides).filter(isRecord);
  }

  const ordered: UnknownRecord[] = [];
  for (const reference of layoutSlides) {
    if (!isRecord(reference)) continue;
    const slideId = nonEmptyString(reference.id);
    const slide = slideId && isRecord(slides[slideId]) ? slides[slideId] : null;
    if (!slide) continue;
    ordered.push(slide);

    if (!Array.isArray(slide.children)) continue;
    for (const childIdValue of slide.children) {
      const childId = nonEmptyString(childIdValue);
      if (childId && isRecord(slides[childId])) ordered.push(slides[childId]);
    }
  }

  return ordered;
}

export function parseFreeShowSong(content: string, fallbackTitle: string): FreeShowSong {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The file does not contain valid FreeShow JSON.");
  }

  const showValue = Array.isArray(parsed) ? parsed[1] : parsed;
  if (!isRecord(showValue)) {
    throw new Error("The file does not contain a FreeShow show.");
  }

  const meta = isRecord(showValue.meta) ? showValue.meta : {};
  const title = nonEmptyString(meta.title) ?? nonEmptyString(showValue.name) ?? fallbackTitle.trim();
  if (!title) throw new Error("The show has no song title.");

  const lyrics = orderedSlides(showValue)
    .map(slideText)
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!lyrics) throw new Error("The show has no readable lyric text.");

  return {
    title,
    artist: nonEmptyString(meta.artist) ?? nonEmptyString(meta.author),
    lyrics,
  };
}

export function parseTextSong(content: string, fallbackTitle: string): FreeShowSong {
  const title = fallbackTitle.trim();
  if (!title) throw new Error("The text file has no song title.");

  const lyrics = content.replace(/\r\n?/g, "\n").trim();
  if (!lyrics) throw new Error("The text file has no readable lyric text.");

  return {
    title,
    artist: null,
    lyrics,
  };
}
