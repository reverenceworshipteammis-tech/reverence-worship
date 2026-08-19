import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { bibleBooks, bibleVersions } from "@/lib/bible-data";

export const runtime = "nodejs";

type SearchableVerse = {
  book: string;
  bookName: string;
  bookNameRw: string;
  chapter: number;
  verse: number;
  text: string;
  normalizedText: string;
};

const parsedBibleCache = new Map<string, Promise<SearchableVerse[]>>();

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

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function parseBible(localFile: string) {
  const existing = parsedBibleCache.get(localFile);
  if (existing) return existing;

  const pending = (async () => {
    const xml = await readFile(path.join(process.cwd(), "public", "bibles", localFile), "utf8");
    const books = childBlocks(xml, ["book", "b", "BIBLEBOOK"]);
    const verses: SearchableVerse[] = [];

    books.forEach((bookBlock, bookIndex) => {
      const book = bibleBooks[bookIndex];
      if (!book) return;
      const chapters = childBlocks(bookBlock, ["chapter", "c", "CHAPTER"]);
      chapters.forEach((chapterBlock, chapterIndex) => {
        const chapter = Number(attrValue(chapterBlock, ["number", "n", "cnumber"])) || chapterIndex + 1;
        const verseBlocks = childBlocks(chapterBlock, ["verse", "v", "VERS"]);
        verseBlocks.forEach((verseBlock, verseIndex) => {
          const text = stripXml(verseBlock);
          if (!text) return;
          verses.push({
            book: book.code,
            bookName: book.name,
            bookNameRw: book.nameRw,
            chapter,
            verse: Number(attrValue(verseBlock, ["number", "n", "vnumber"])) || verseIndex + 1,
            text,
            normalizedText: normalizeSearch(text),
          });
        });
      });
    });

    return verses;
  })();

  parsedBibleCache.set(localFile, pending);
  try {
    return await pending;
  } catch (error) {
    parsedBibleCache.delete(localFile);
    throw error;
  }
}

function parseReference(query: string) {
  const normalizedQuery = normalizeSearch(query);
  const aliases = bibleBooks
    .flatMap((book) => [book.nameRw, book.name, book.code].map((name) => ({ book, name: normalizeSearch(name) })))
    .sort((left, right) => right.name.length - left.name.length);

  for (const alias of aliases) {
    if (!normalizedQuery.startsWith(`${alias.name} `)) continue;
    const rest = normalizedQuery.slice(alias.name.length).trim();
    const match = rest.match(/^(\d+)(?:\s*[:.]\s*(\d+))?$/);
    if (!match) continue;
    const chapter = Number(match[1]);
    const verse = match[2] ? Number(match[2]) : null;
    if (chapter < 1 || chapter > alias.book.chapters || (verse !== null && verse < 1)) return null;
    return { book: alias.book.code, chapter, verse };
  }

  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const versionKey = (url.searchParams.get("version") ?? "").toLowerCase();
  const version = bibleVersions.find((item) => item.key === versionKey) ?? bibleVersions[0];
  const scope = url.searchParams.get("scope") ?? "all";
  const scopedBook = (url.searchParams.get("book") ?? "").toUpperCase();
  const exact = url.searchParams.get("exact") === "true";

  if (query.length < 3) {
    return NextResponse.json({ ok: true, query, results: [], total: 0 });
  }

  try {
    const verses = await parseBible(version.localFile);
    const reference = parseReference(query);
    const normalizedQuery = normalizeSearch(query);
    const terms = normalizedQuery.split(" ").filter(Boolean);
    const scopedVerses = verses.filter((item) => {
      const bookIndex = bibleBooks.findIndex((book) => book.code === item.book);
      if (scope === "old") return bookIndex >= 0 && bookIndex < 39;
      if (scope === "new") return bookIndex >= 39;
      if (scope === "book") return Boolean(scopedBook) && item.book === scopedBook;
      return true;
    });
    const matches = reference
      ? scopedVerses.filter((item) => item.book === reference.book && item.chapter === reference.chapter && (reference.verse === null || item.verse === reference.verse))
      : scopedVerses.filter((item) => exact ? item.normalizedText.includes(normalizedQuery) : terms.every((term) => item.normalizedText.includes(term)));
    const results = matches.slice(0, 50).map((item) => {
      const index = verses.indexOf(item);
      const previous = verses[index - 1];
      const next = verses[index + 1];
      return {
        book: item.book,
        bookName: item.bookName,
        bookNameRw: item.bookNameRw,
        chapter: item.chapter,
        verse: item.verse,
        text: item.text,
        previousText: previous?.book === item.book && previous.chapter === item.chapter ? previous.text : undefined,
        nextText: next?.book === item.book && next.chapter === item.chapter ? next.text : undefined,
      };
    });

    return NextResponse.json(
      { ok: true, query, version: { key: version.key, code: version.code, label: version.label }, results, total: matches.length },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json({ ok: false, message: "Unable to search this Bible version right now." }, { status: 500 });
  }
}
