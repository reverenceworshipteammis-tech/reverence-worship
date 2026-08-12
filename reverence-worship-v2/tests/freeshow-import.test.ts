import assert from "node:assert/strict";
import test from "node:test";
import { identifyImportedSong, parseFreeShowSong, parseTextSong } from "../src/lib/freeshow-import";

test("FreeShow songs import metadata and lyrics in active-layout order", () => {
  const content = JSON.stringify(["show-id", {
    name: "Fallback name",
    meta: { title: "Amazing Grace", artist: "John Newton" },
    settings: { activeLayout: "layout-1" },
    layouts: {
      "layout-1": {
        slides: [{ id: "chorus" }, { id: "verse" }],
      },
    },
    slides: {
      verse: {
        group: "Verse 1",
        items: [{ lines: [{ text: [{ value: "Amazing grace", style: "" }] }, { text: [{ value: "How sweet the sound", style: "" }] }] }],
      },
      chorus: {
        group: "Chorus",
        items: [{ lines: [{ text: [{ value: "I once was lost", style: "" }] }] }],
        children: ["chorus-child"],
      },
      "chorus-child": {
        group: null,
        items: [{ lines: [{ text: [{ value: "But now am found", style: "" }] }] }],
      },
    },
  }]);

  assert.deepEqual(parseFreeShowSong(content, "fallback"), {
    title: "Amazing Grace",
    artist: "John Newton",
    lyrics: "[Chorus]\n\nI once was lost\n\nBut now am found\n\n[Verse 1]\n\nAmazing grace\nHow sweet the sound",
  });
});

test("FreeShow imports fall back to the file name and stored slide order", () => {
  const content = JSON.stringify(["show-id", {
    slides: {
      first: { group: null, items: [{ lines: [{ text: [{ value: "First line", style: "" }] }] }] },
      second: { group: null, items: [{ lines: [{ text: [{ value: "Second line", style: "" }] }] }] },
    },
  }]);

  assert.deepEqual(parseFreeShowSong(content, "My exported song"), {
    title: "My exported song",
    artist: null,
    lyrics: "First line\n\nSecond line",
  });
});

test("FreeShow imports reject files without readable lyric text", () => {
  assert.throws(
    () => parseFreeShowSong(JSON.stringify(["show-id", { name: "Empty", slides: {} }]), "Empty"),
    /no readable lyric text/i,
  );
});

test("text songs use the file name as the title and preserve lyric lines", () => {
  assert.deepEqual(parseTextSong("First line\r\nSecond line\r\n", "My Text Song"), {
    title: "My Text Song",
    artist: null,
    lyrics: "First line\nSecond line",
  });
});

test("text songs reject empty files", () => {
  assert.throws(() => parseTextSong("  \r\n ", "Empty Song"), /no readable lyric text/i);
});

test("import identity uses the filename instead of matching FreeShow metadata", () => {
  assert.deepEqual(
    identifyImportedSong({ title: "Repeated template title", artist: "Singer", lyrics: "Lyrics" }, "My Unique Song.SHOW"),
    {
      title: "My Unique Song",
      artist: "Singer",
      lyrics: "Lyrics",
      sourceFilename: "my unique song.show",
    },
  );
});
