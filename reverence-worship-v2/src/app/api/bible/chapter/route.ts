import { NextResponse } from "next/server";
import { bibleBooks, bibleVersions } from "@/lib/bible-data";

type BibleApiVerse = {
  verse: number;
  text: string;
};

type BibleApiResponse = {
  reference?: string;
  translation_name?: string;
  verses?: BibleApiVerse[];
  error?: string;
};

function findVersion(key: string | null) {
  return bibleVersions.find((version) => version.key === (key ?? "").toLowerCase()) ?? bibleVersions[0];
}

async function fetchChapter(versionKey: string | null, bookCode: string, chapter: number) {
  const version = findVersion(versionKey);
  const book = bibleBooks.find((item) => item.code === bookCode);

  if (!book || chapter < 1 || chapter > book.chapters) {
    throw new Error("Please choose a valid book and chapter.");
  }

  const passage = encodeURIComponent(`${book.name} ${chapter}`);
  const response = await fetch(`https://bible-api.com/${passage}?translation=${version.api}`, {
    headers: { accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 * 30 },
  });
  const data = (await response.json()) as BibleApiResponse;

  if (!response.ok || data.error || !Array.isArray(data.verses)) {
    throw new Error(data.error || "Unable to load the selected chapter right now.");
  }

  return {
    version: {
      key: version.key,
      code: version.code,
      label: version.label,
    },
    reference: data.reference ?? `${book.name} ${chapter}`,
    verses: data.verses.map((verse) => ({
      number: verse.verse,
      text: verse.text.replace(/\s+/g, " ").trim(),
    })),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const book = (url.searchParams.get("book") ?? "JHN").toUpperCase();
  const chapter = Number(url.searchParams.get("chapter") ?? "3");
  const version = url.searchParams.get("version");
  const compare = url.searchParams.get("compare");

  try {
    const primary = await fetchChapter(version, book, chapter);
    const compareResult = compare ? await fetchChapter(compare, book, chapter) : null;

    return NextResponse.json({
      ok: true,
      book,
      chapter,
      primary,
      compare: compareResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to load the selected chapter right now.",
      },
      { status: 422 },
    );
  }
}
