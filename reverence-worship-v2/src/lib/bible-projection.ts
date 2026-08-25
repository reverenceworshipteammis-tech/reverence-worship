import type { SongProjectionSlide } from "@/lib/song-projection";

export type BibleProjectionVerse = { number: number; text: string };

export type BibleProjectionTranslation = {
  reference: string;
  versionCode: string;
  verses: BibleProjectionVerse[];
};

export function bibleProjectionSlides(
  reference: string,
  versionCode: string,
  verses: BibleProjectionVerse[],
  selectedVerseNumbers: number[],
  versesPerSlide = 1,
): SongProjectionSlide[] {
  return multiVersionBibleProjectionSlides([{ reference, versionCode, verses }], selectedVerseNumbers, versesPerSlide);
}

export function multiVersionBibleProjectionSlides(
  translations: BibleProjectionTranslation[],
  selectedVerseNumbers: number[],
  versesPerSlide = 1,
): SongProjectionSlide[] {
  const primary = translations[0];
  if (!primary) return [];

  const selected = new Set(selectedVerseNumbers);
  const ordered = primary.verses.filter((verse) => selected.has(verse.number) && verse.text.trim());
  const groupSize = Math.min(3, Math.max(1, Math.trunc(versesPerSlide) || 1));
  const groups: BibleProjectionVerse[][] = [];

  for (const verse of ordered) {
    const currentGroup = groups.at(-1);
    const previousVerse = currentGroup?.at(-1);
    if (!currentGroup || currentGroup.length >= groupSize || verse.number !== (previousVerse?.number ?? 0) + 1) {
      groups.push([verse]);
    } else {
      currentGroup.push(verse);
    }
  }

  return groups.map((group) => {
    const first = group[0];
    const last = group[group.length - 1];
    const verseRange = first.number === last.number ? String(first.number) : `${first.number}-${last.number}`;
    const versionCodes = translations.map((translation) => translation.versionCode).join(" / ");
    const sections = translations
      .map((translation) => {
        const versesByNumber = new Map(translation.verses.map((verse) => [verse.number, verse]));
        const text = group
          .map((verse) => versesByNumber.get(verse.number))
          .filter((verse): verse is BibleProjectionVerse => Boolean(verse?.text.trim()))
          .map((verse) => `${verse.number}  ${verse.text.trim()}`)
          .join("\n");
        return text ? { label: translation.versionCode, text } : null;
      })
      .filter((section): section is { label: string; text: string } => section !== null);

    return {
      label: `${primary.reference}:${verseRange} · ${versionCodes}`,
      text: sections.map((section) => translations.length > 1 ? `${section.label}\n${section.text}` : section.text).join("\n\n"),
      ...(translations.length > 1 ? { sections } : {}),
    };
  });
}
