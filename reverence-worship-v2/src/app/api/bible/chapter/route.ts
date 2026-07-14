import { NextResponse } from "next/server";
import { bibleBooks, bibleVersions } from "@/lib/bible-data";

export const runtime = "nodejs";

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

type BibleVersion = (typeof bibleVersions)[number] & {
  api?: string;
  localFile?: string;
};

function findVersion(key: string | null) {
  return (bibleVersions.find((version) => version.key === (key ?? "").toLowerCase()) ?? bibleVersions[0]) as BibleVersion;
}

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#039;", "'");
}

function stripXml(value: string) {
  return decodeXml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function matchingXmlBlocks(xml: string, tag: string) {
  return Array.from(xml.matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"))).map((match) => match[0]);
}

function childBlocks(xml: string, tags: string[]) {
  for (const tag of tags) {
    const blocks = matchingXmlBlocks(xml, tag);
    if (blocks.length > 0) return blocks;
  }
  return [];
}

function attrValue(xml: string, names: string[]) {
  for (const name of names) {
    const match = xml.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"));
    if (match?.[1]) return match[1];
  }
  return "";
}

function bibleLocalFileUrl(localFile: string, requestUrl: string) {
  const localFiles: Record<string, string> = {
    "BY.xml": "/bibles/BY.xml",
    "BIR.xml": "/bibles/BIR.xml",
    "NIV.xml": "/bibles/NIV.xml",
    "KJV.xml": "/bibles/KJV.xml",
    "ESV.xml": "/bibles/ESV.xml",
  };
  const pathname = localFiles[localFile];

  return pathname ? new URL(pathname, requestUrl) : null;
}

async function fetchLocalChapter(version: BibleVersion, bookCode: string, chapter: number, requestUrl: string) {
  if (!version.localFile) {
    throw new Error("This Bible version is not configured for local reading.");
  }

  const fileUrl = bibleLocalFileUrl(version.localFile, requestUrl);
  if (!fileUrl) {
    throw new Error("This Bible version is not configured for local reading.");
  }

  let xml = "";
  try {
    const response = await fetch(fileUrl, {
      headers: { accept: "application/xml,text/xml,*/*" },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!response.ok) {
      throw new Error("Bible file could not be loaded.");
    }
    xml = await response.text();
  } catch {
    throw new Error(`Bible file not found. Put ${version.localFile} in the bibles folder.`);
  }

  const bookIndex = bibleBooks.findIndex((item) => item.code === bookCode);
  if (bookIndex < 0) {
    throw new Error("Please choose a valid book and chapter.");
  }

  const books = childBlocks(xml, ["book", "b", "BIBLEBOOK"]);
  const book = books[bookIndex];
  if (!book) {
    throw new Error("Bible book not found in the local file.");
  }

  const chapters = childBlocks(book, ["chapter", "c", "CHAPTER"]);
  const chapterBlock = chapters[chapter - 1] ?? chapters.find((item) => Number(attrValue(item, ["number", "n", "cnumber"])) === chapter);
  if (!chapterBlock) {
    throw new Error("Bible chapter not found in the local file.");
  }

  const verseBlocks = childBlocks(chapterBlock, ["verse", "v", "VERS"]);
  const bookData = bibleBooks[bookIndex];
  return {
    version: {
      key: version.key,
      code: version.code,
      label: version.label,
    },
    reference: `${bookData.nameRw ?? bookData.name} ${chapter}`,
    verses: verseBlocks
      .map((verse, index) => ({
        number: Number(attrValue(verse, ["number", "n", "vnumber"])) || index + 1,
        text: stripXml(verse),
      }))
      .filter((verse) => verse.text.length > 0),
  };
}

async function fetchChapter(versionKey: string | null, bookCode: string, chapter: number, requestUrl: string) {
  const version = findVersion(versionKey);
  const book = bibleBooks.find((item) => item.code === bookCode);

  if (!book || chapter < 1 || chapter > book.chapters) {
    throw new Error("Please choose a valid book and chapter.");
  }

  if (version.localFile) {
    return fetchLocalChapter(version, bookCode, chapter, requestUrl);
  }

  if (!version.api) {
    throw new Error("This Bible version is not configured for reading.");
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
  const book = (url.searchParams.get("book") ?? "EXO").toUpperCase();
  const chapter = Number(url.searchParams.get("chapter") ?? "27");
  const version = url.searchParams.get("version");
  const compare = url.searchParams.get("compare");

  try {
    const primary = await fetchChapter(version, book, chapter, request.url);
    const compareResult = compare ? await fetchChapter(compare, book, chapter, request.url) : null;

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
