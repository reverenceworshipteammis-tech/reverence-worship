import assert from "node:assert/strict";
import test from "node:test";
import { multiVersionBibleProjectionSlides } from "../src/lib/bible-projection";
import { chooseProjectionScreen, projectionScreenId, type ProjectionScreenLike } from "../src/lib/projection-display";
import { parseProjectionOverlayPresets, validateProjectionOverlayPresetInput } from "../src/lib/projection-overlays";
import { clampProjectionTransitionDuration, isProjectionOutputState, projectionMediaBrightnessPercent, projectionOverlayPreviewTextSizePx, projectionOverlaySafeInsets, projectionOverlayTextSizePx, projectionOverlayWidthPercent, projectionPreviewTextSizePx, projectionTextSizePx, readProjectionState, sanitizeProjectionMediaUrl, writeProjectionState, type ProjectionOutputState } from "../src/lib/projection-runtime";
import { projectionThemes } from "../src/lib/projection-themes";
import { songProjectionSlides, validateProjectionSongLyrics } from "../src/lib/song-projection";

test("song lyrics become labelled slides with no more than six lines", () => {
  const slides = songProjectionSlides("[Verse 1]\n\nOne\nTwo\nThree\nFour\nFive\nSix\nSeven\n\n[Chorus]\n\nPraise\nAgain");

  assert.equal(slides.length, 3);
  assert.equal(slides[0].label, "Verse 1");
  assert.equal(slides[0].text.split("\n").length, 6);
  assert.equal(slides[1].label, null);
  assert.equal(slides[1].text, "Seven");
  assert.equal(slides[2].label, "Chorus");
});

test("projection lyric editing validates and normalizes the complete song", () => {
  assert.deepEqual(validateProjectionSongLyrics("  [Verse 1]\r\n\r\nPraise\r\nAgain  "), { ok: true, lyrics: "[Verse 1]\n\nPraise\nAgain" });
  assert.equal(validateProjectionSongLyrics("   ").ok, false);
  assert.equal(validateProjectionSongLyrics(null).ok, false);
});

test("Bible projection groups only consecutive selected verses and keeps translation columns", () => {
  const slides = multiVersionBibleProjectionSlides([
    { reference: "John 3", versionCode: "NIV", verses: [{ number: 16, text: "For God so loved" }, { number: 17, text: "God did not send" }, { number: 19, text: "This is the verdict" }] },
    { reference: "Yohana 3", versionCode: "BIR", verses: [{ number: 16, text: "Kuko Imana yakunze" }, { number: 17, text: "Imana ntiyatumye" }, { number: 19, text: "Uko gucirwaho iteka" }] },
  ], [16, 17, 19], 3);

  assert.equal(slides.length, 2);
  assert.equal(slides[0].label, "John 3:16-17 · NIV / BIR");
  assert.equal(slides[0].sections?.length, 2);
  assert.equal(slides[1].label, "John 3:19 · NIV / BIR");
});

test("projection display selection prefers an external non-primary screen", () => {
  const primary: ProjectionScreenLike = { id: "1", label: "Laptop", availLeft: 0, availTop: 0, availWidth: 1920, availHeight: 1040, width: 1920, height: 1080, isPrimary: true, isInternal: true };
  const projector: ProjectionScreenLike = { id: "2", label: "Projector", availLeft: 1920, availTop: 0, availWidth: 1280, availHeight: 720, width: 1280, height: 720, isPrimary: false, isInternal: false };

  assert.equal(chooseProjectionScreen([primary, projector], primary), projector);
  assert.equal(chooseProjectionScreen([primary, projector], primary, projectionScreenId(primary)), primary);
});

test("projection text size scales continuously from 5 to 100 percent", () => {
  assert.equal(projectionTextSizePx(5), 20);
  assert.equal(projectionTextSizePx(100), 500);
  assert.ok(projectionTextSizePx(60) < projectionTextSizePx(80));
  assert.ok(projectionTextSizePx(80) < projectionTextSizePx(100));
  assert.equal(projectionPreviewTextSizePx(5), 8);
  assert.equal(projectionPreviewTextSizePx(100), 175);
});

test("projection overlay presets are validated and normalized", () => {
  const valid = validateProjectionOverlayPresetInput({ name: "Welcome", title: "Guest speaker", text: "Please welcome our guest", tone: "dark", position: "top", fontSize: 200 });
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.value.fontSize, 100);
  assert.equal(validateProjectionOverlayPresetInput({ name: "Empty", title: "", text: "" }).ok, false);

  const parsed = parseProjectionOverlayPresets([
    { id: "one", name: "Welcome", title: "Guest", text: "Hello", tone: "dark", position: "top", fontSize: 34, updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "one", name: "Duplicate", title: "Ignored", text: "Ignored" },
    { id: "", name: "Invalid" },
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, "Welcome");
});

test("projection overlay size changes text and box dimensions from 5 to 100 percent", () => {
  assert.equal(projectionOverlayTextSizePx(5), 16);
  assert.equal(projectionOverlayTextSizePx(100), 180);
  assert.equal(projectionOverlayPreviewTextSizePx(5), 6);
  assert.equal(projectionOverlayPreviewTextSizePx(100), 64);
  assert.equal(projectionOverlayWidthPercent(5), 36);
  assert.equal(projectionOverlayWidthPercent(100), 94);
});

test("visible overlays reserve a safe lyric area instead of covering content", () => {
  assert.deepEqual(projectionOverlaySafeInsets(1000, 100, "top", true), { paddingTop: 185, paddingBottom: 60 });
  assert.deepEqual(projectionOverlaySafeInsets(1000, 100, "bottom", true), { paddingTop: 60, paddingBottom: 195 });
  assert.deepEqual(projectionOverlaySafeInsets(1000, 100, "center", true), { paddingTop: 35, paddingBottom: 575 });
  assert.deepEqual(projectionOverlaySafeInsets(1000, 100, "bottom", false), { paddingTop: 60, paddingBottom: 60 });
});

test("projection state storage validates restored output", () => {
  const state: ProjectionOutputState = {
    version: 3,
    updatedAt: 1,
    blanked: false,
    slide: { label: "Chorus", text: "Praise" },
    emptyMessage: "Choose content",
    footer: "Song — 1/1",
    fontSize: 54,
    background: "#000",
    textColor: "#fff",
    mutedTextColor: "rgba(255,255,255,.5)",
    textShadow: "none",
    media: { type: "none", url: "", fit: "cover", brightness: 55, name: "" },
    transition: { type: "fade", durationMs: 350 },
    overlay: { visible: false, title: "", text: "", position: "bottom", alignment: "center", fontSize: 34, width: 76, opacity: 96, background: "#000", color: "#fff", borderColor: "transparent", boxShadow: "none", textShadow: "none", padding: "1rem" },
  };
  let stored = "";
  writeProjectionState({ setItem: (_key, value) => { stored = value; } }, state);

  assert.equal(isProjectionOutputState(JSON.parse(stored)), true);
  assert.deepEqual(readProjectionState({ getItem: () => stored }), state);
  assert.equal(readProjectionState({ getItem: () => "not json" }), null);
});

test("projection media URLs allow hosted and session-local assets but reject unsafe protocols", () => {
  assert.equal(sanitizeProjectionMediaUrl("https://cdn.example.org/background.mp4"), "https://cdn.example.org/background.mp4");
  assert.equal(sanitizeProjectionMediaUrl("blob:https://worship.example/asset-id"), "blob:https://worship.example/asset-id");
  assert.equal(sanitizeProjectionMediaUrl("javascript:alert(1)"), "");
});

test("projection media brightness supports true black through full brightness", () => {
  assert.equal(projectionMediaBrightnessPercent(-20), 0);
  assert.equal(projectionMediaBrightnessPercent(0), 0);
  assert.equal(projectionMediaBrightnessPercent(67), 67);
  assert.equal(projectionMediaBrightnessPercent(100), 100);
  assert.equal(projectionMediaBrightnessPercent(150), 100);
});

test("projection transition duration stays within a live-friendly range", () => {
  assert.equal(clampProjectionTransitionDuration(20), 100);
  assert.equal(clampProjectionTransitionDuration(700), 700);
  assert.equal(clampProjectionTransitionDuration(4000), 1500);
});

test("built-in projection themes provide a substantial church-ready library without media assets", () => {
  const themes = Object.values(projectionThemes);
  assert.equal(themes.length, 30);
  assert.equal(new Set(themes.map((theme) => theme.label)).size, themes.length);
  for (const category of ["classic", "worship", "nature", "seasons"]) {
    assert.ok(themes.filter((theme) => theme.category === category).length >= 6);
  }
  assert.ok(themes.every((theme) => theme.background.length > 3 && theme.text.length > 3 && theme.muted.length > 3));
});
