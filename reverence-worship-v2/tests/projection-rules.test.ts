import assert from "node:assert/strict";
import test from "node:test";
import {
  projectionOverlayFontSizes,
  projectionOverlayIsLive,
  projectionOverlayPreviewFontSizes,
  projectionOverlayToggleState,
  type ProjectionOverlayState,
} from "../src/lib/projection-runtime";
import { multiVersionBibleProjectionSlides } from "../src/lib/bible-projection";
import { chooseProjectionScreen, projectionScreenId, type ProjectionScreenLike } from "../src/lib/projection-display";
import { parseProjectionOverlayPresets, validateProjectionOverlayPresetInput } from "../src/lib/projection-overlays";
import { clampProjectionTransitionDuration, isProjectionOutputState, normalizeProjectionBackgroundEffects, projectionMediaBrightnessPercent, projectionNavigationState, projectionOverlayPreviewTextSizePx, projectionOverlaySafeInsets, projectionOverlayTextSizePx, projectionOverlayWidthPercent, projectionPreviewTextSizePx, projectionTextSizePx, readProjectionState, sanitizeProjectionMediaUrl, writeProjectionState, type ProjectionOutputState } from "../src/lib/projection-runtime";
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
  if (valid.ok) {
    assert.equal(valid.value.fontSize, 100);
    assert.equal(valid.value.titleFontScale, 100);
    assert.equal(valid.value.textFontScale, 100);
  }
  assert.equal(validateProjectionOverlayPresetInput({ name: "Empty", title: "", text: "" }).ok, false);

  const parsed = parseProjectionOverlayPresets([
    { id: "one", name: "Welcome", title: "Guest", text: "Hello", tone: "dark", position: "top", fontSize: 34, updatedAt: "2026-01-01T00:00:00.000Z" },
    { id: "one", name: "Duplicate", title: "Ignored", text: "Ignored" },
    { id: "", name: "Invalid" },
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, "Welcome");
  assert.equal(parsed[0].titleFontScale, 100);
  assert.equal(parsed[0].textFontScale, 100);
});

test("saved overlay title and message scales survive validation and storage independently", () => {
  const result = validateProjectionOverlayPresetInput({
    name: "Guest speaker",
    title: "Welcome",
    text: "Please welcome our guest",
    fontSize: 40,
    titleFontScale: 150.6,
    textFontScale: 72.4,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const stored = JSON.stringify([{ ...result.value, id: "guest", updatedAt: "2026-10-17T12:00:00.000Z" }]);
  const [restored] = parseProjectionOverlayPresets(JSON.parse(stored));

  assert.equal(restored.titleFontScale, 151);
  assert.equal(restored.textFontScale, 72);
  assert.equal(restored.fontSize, 40);
  assert.equal(restored.title, "Welcome");
  assert.equal(restored.text, "Please welcome our guest");
});

test("overlay scale input is bounded and malformed saved scales use legacy dimensions", () => {
  const cases = [
    { titleFontScale: -20, textFontScale: 999, expected: [25, 300] },
    { titleFontScale: Number.NaN, textFontScale: Number.POSITIVE_INFINITY, expected: [100, 100] },
    { titleFontScale: "invalid", textFontScale: Number.NEGATIVE_INFINITY, expected: [100, 100] },
  ];
  for (const { expected, ...scales } of cases) {
    const input = { name: "Welcome", title: "Guest", text: "Hello", ...scales };
    const result = validateProjectionOverlayPresetInput(input);
    assert.equal(result.ok, true);
    if (!result.ok) continue;
    assert.deepEqual([result.value.titleFontScale, result.value.textFontScale], expected);

    const [restored] = parseProjectionOverlayPresets([{ ...input, id: "guest" }]);
    assert.deepEqual([restored.titleFontScale, restored.textFontScale], expected);
  }
});

function overlayToggleFixture(
  overlay: Partial<ProjectionOverlayState> = {},
): ProjectionOutputState {
  return {
    version: 3,
    updatedAt: 10,
    blanked: true,
    slide: { label: "Verse", text: "Old slide" },
    emptyMessage: "Choose content",
    footer: "Song — 1/2",
    fontSize: 60,
    background: "#000",
    textColor: "#fff",
    mutedTextColor: "#aaa",
    textShadow: "none",
    media: { type: "none", url: "", fit: "cover", brightness: 55, name: "" },
    transition: { type: "fade", durationMs: 350 },
    overlay: {
      visible: false,
      title: "Offerings",
      text: "Give with joy",
      position: "bottom",
      alignment: "center",
      fontSize: 34,
      width: 76,
      opacity: 96,
      background: "#000",
      color: "#fff",
      borderColor: "transparent",
      boxShadow: "none",
      textShadow: "none",
      padding: "1rem",
      ...overlay,
    },
  };
}

test("projection overlay matching uses visible live content regardless of candidate visibility or property order", () => {
  const candidate = overlayToggleFixture().overlay;
  const liveOverlay = { ...candidate, visible: true };
  const reorderedCandidate = Object.fromEntries(
    Object.entries(candidate).reverse(),
  ) as ProjectionOverlayState;

  assert.equal(projectionOverlayIsLive(liveOverlay, reorderedCandidate), true);
  assert.equal(
    projectionOverlayIsLive(liveOverlay, { ...candidate, visible: true }),
    true,
  );
  assert.equal(projectionOverlayIsLive(candidate, candidate), false);
  assert.equal(projectionOverlayIsLive(undefined, candidate), false);
});

test("projection overlay matching detects changes to every content and appearance field", () => {
  const candidate = overlayToggleFixture().overlay;
  const liveOverlay = { ...candidate, visible: true };
  const changes = [
    { title: "Welcome" },
    { text: "A different message" },
    { position: "top" },
    { alignment: "left" },
    { fontSize: 35 },
    { titleFontScale: 150 },
    { textFontScale: 75 },
    { width: 75 },
    { opacity: 95 },
    { background: "#123456" },
    { color: "#abcdef" },
    { borderColor: "#111" },
    { boxShadow: "0 1px 2px #000" },
    { textShadow: "0 1px 1px #000" },
    { padding: "2rem" },
  ] satisfies Partial<ProjectionOverlayState>[];

  for (const change of changes) {
    assert.equal(
      projectionOverlayIsLive(liveOverlay, { ...candidate, ...change }),
      false,
      `Changing ${Object.keys(change)[0]} must identify a different overlay`,
    );
  }
});

test("legacy live overlays match explicit default font scales in either direction", () => {
  const legacy = overlayToggleFixture().overlay;
  const defaults = { ...legacy, titleFontScale: 100, textFontScale: 100 };

  assert.equal(projectionOverlayIsLive({ ...legacy, visible: true }, defaults), true);
  assert.equal(projectionOverlayIsLive({ ...defaults, visible: true }, legacy), true);
  assert.equal(
    projectionOverlayIsLive({ ...defaults, visible: true, titleFontScale: 150 }, legacy),
    false,
  );
  assert.equal(
    projectionOverlayIsLive({ ...defaults, visible: true, textFontScale: 75 }, legacy),
    false,
  );
});

test("projection overlay clicks show, hide, and show again using the latest live state", () => {
  const live = overlayToggleFixture();
  const draft = overlayToggleFixture();

  const shown = projectionOverlayToggleState(live, draft);
  assert.equal(shown.overlay.visible, true);
  const hidden = projectionOverlayToggleState(shown, draft);
  assert.equal(hidden.overlay.visible, false);
  const shownAgain = projectionOverlayToggleState(hidden, draft);
  assert.equal(shownAgain.overlay.visible, true);
  assert.deepEqual(shownAgain.overlay, shown.overlay);
  assert.equal(live.overlay.visible, false);
});

test("projection overlay changes preserve the current live output instead of projecting draft content", () => {
  const live = overlayToggleFixture();
  const draft: ProjectionOutputState = {
    ...overlayToggleFixture({ title: "Draft announcement" }),
    blanked: false,
    slide: { label: "Queued verse", text: "Unpublished song text" },
    footer: "Queued song — 2/3",
    emptyMessage: "Different empty message",
    fontSize: 80,
    background: "#112233",
    textColor: "#123456",
    mutedTextColor: "#654321",
    textShadow: "0 1px 2px black",
    media: {
      type: "image",
      url: "/queued.jpg",
      fit: "contain",
      brightness: 80,
      name: "Queued image",
    },
    transition: { type: "fade", durationMs: 700 },
  };
  const candidate = { ...draft.overlay, title: "Saved preset", width: 60 };

  const shown = projectionOverlayToggleState(live, draft, candidate);

  assert.deepEqual(shown.overlay, { ...candidate, visible: true });
  assert.deepEqual(
    { ...shown, overlay: live.overlay, updatedAt: live.updatedAt },
    live,
  );
  const hidden = projectionOverlayToggleState(shown, draft, candidate);
  assert.equal(hidden.overlay.visible, false);
  assert.deepEqual(
    { ...hidden, overlay: live.overlay, updatedAt: live.updatedAt },
    live,
  );
});

test("a different saved overlay replaces the live overlay and toggles off on its next click", () => {
  const live = overlayToggleFixture({ visible: true });
  const draft = overlayToggleFixture();
  const replacement = { ...draft.overlay, title: "Welcome", text: "Welcome home" };

  const shown = projectionOverlayToggleState(live, draft, replacement);

  assert.deepEqual(shown.overlay, { ...replacement, visible: true });
  assert.equal(projectionOverlayIsLive(shown.overlay, live.overlay), false);
  assert.equal(
    projectionOverlayToggleState(shown, draft, replacement).overlay.visible,
    false,
  );
});

test("edited draft overlay content replaces a different live overlay instead of hiding it", () => {
  const live = overlayToggleFixture({ visible: true });
  const editedDraft = overlayToggleFixture({ text: "Updated giving instructions" });

  const shown = projectionOverlayToggleState(live, editedDraft);

  assert.deepEqual(shown.overlay, { ...editedDraft.overlay, visible: true });
  assert.equal(live.overlay.text, "Give with joy");
});

test("the first overlay click leaves queued lyrics and their footer off the screen", () => {
  const draft = overlayToggleFixture();

  const shown = projectionOverlayToggleState(null, draft);

  assert.equal(shown.slide, null);
  assert.equal(shown.footer, "");
  assert.deepEqual(shown.overlay, { ...draft.overlay, visible: true });
  assert.deepEqual(
    {
      ...shown,
      updatedAt: draft.updatedAt,
      slide: draft.slide,
      footer: draft.footer,
      overlay: draft.overlay,
    },
    draft,
  );
});

test("an overlay without a title or message stays hidden", () => {
  const draft = overlayToggleFixture({ title: "", text: "", visible: true });
  const live = overlayToggleFixture({ visible: true });

  assert.equal(projectionOverlayToggleState(null, draft).overlay.visible, false);
  assert.equal(projectionOverlayToggleState(live, draft).overlay.visible, false);
  assert.equal(
    projectionOverlayToggleState(
      live,
      draft,
      { ...draft.overlay, title: "  ", text: "\n\t" },
    ).overlay.visible,
    false,
  );
});

test("projection overlay size changes text and box dimensions from 5 to 100 percent", () => {
  assert.equal(projectionOverlayTextSizePx(5), 16);
  assert.equal(projectionOverlayTextSizePx(100), 180);
  assert.equal(projectionOverlayPreviewTextSizePx(5), 6);
  assert.equal(projectionOverlayPreviewTextSizePx(100), 64);
  assert.equal(projectionOverlayWidthPercent(5), 36);
  assert.equal(projectionOverlayWidthPercent(100), 94);
});

test("legacy overlays retain full-screen and preview font dimensions when scales are omitted", () => {
  assert.deepEqual(projectionOverlayFontSizes(5), { title: 10, text: 16 });
  assert.deepEqual(projectionOverlayFontSizes(100), { title: 90, text: 180 });
  assert.deepEqual(projectionOverlayFontSizes(100, 100, 100), projectionOverlayFontSizes(100));
  assert.deepEqual(projectionOverlayPreviewFontSizes(5), { title: 2.7, text: 6 });
  assert.deepEqual(projectionOverlayPreviewFontSizes(100), { title: 28.8, text: 64 });
  assert.deepEqual(projectionOverlayPreviewFontSizes(100, 100, 100), projectionOverlayPreviewFontSizes(100));
});

test("title and message sizes change independently in the live output and preview", () => {
  assert.deepEqual(projectionOverlayFontSizes(100, 200), { title: 180, text: 180 });
  assert.deepEqual(projectionOverlayFontSizes(100, undefined, 175), { title: 90, text: 315 });
  assert.deepEqual(projectionOverlayPreviewFontSizes(100, 200), { title: 57.6, text: 64 });
  assert.deepEqual(projectionOverlayPreviewFontSizes(100, undefined, 175), { title: 28.8, text: 112 });
});

test("visible overlays reserve a safe lyric area instead of covering content", () => {
  assert.deepEqual(projectionOverlaySafeInsets(1000, 100, "top", true), { paddingTop: 185, paddingBottom: 35 });
  assert.deepEqual(projectionOverlaySafeInsets(1000, 100, "bottom", true), { paddingTop: 35, paddingBottom: 195 });
  assert.deepEqual(projectionOverlaySafeInsets(1000, 100, "center", true), { paddingTop: 35, paddingBottom: 575 });
  assert.deepEqual(projectionOverlaySafeInsets(1000, 100, "bottom", false), { paddingTop: 35, paddingBottom: 35 });
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

test("slide navigation goes live without publishing pending appearance changes", () => {
  const live: ProjectionOutputState = {
    version: 3,
    updatedAt: 10,
    blanked: true,
    slide: { label: "Verse", text: "Old slide" },
    emptyMessage: "Choose content",
    footer: "Song — 1/2",
    fontSize: 60,
    background: "#000",
    textColor: "#fff",
    mutedTextColor: "#aaa",
    textShadow: "none",
    media: { type: "none", url: "", fit: "cover", brightness: 55, name: "" },
    transition: { type: "fade", durationMs: 350 },
    overlay: { visible: false, title: "", text: "", position: "bottom", alignment: "center", fontSize: 34, width: 76, opacity: 96, background: "#000", color: "#fff", borderColor: "transparent", boxShadow: "none", textShadow: "none", padding: "1rem" },
  };
  const draft: ProjectionOutputState = { ...live, blanked: false, slide: { label: "Chorus", text: "New slide" }, footer: "Song — 2/2", fontSize: 100, background: "royalblue" };

  const navigated = projectionNavigationState(live, draft);

  assert.equal(navigated.blanked, false);
  assert.deepEqual(navigated.slide, draft.slide);
  assert.equal(navigated.footer, draft.footer);
  assert.equal(navigated.fontSize, live.fontSize);
  assert.equal(navigated.background, live.background);
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

test("cinematic background effects are normalized to projector-safe values", () => {
  assert.deepEqual(normalizeProjectionBackgroundEffects({ motion: "drift", ambience: "rays", blur: 99, dimming: -5, saturation: 240, tintColor: "unsafe" }), {
    motion: "drift",
    motionSpeed: 45,
    blur: 20,
    vignette: 24,
    saturation: 180,
    dimming: 0,
    autoDimming: true,
    tintColor: "#1d4ed8",
    tintStrength: 0,
    ambience: "rays",
  });
});

test("built-in projection themes provide a substantial church-ready library without media assets", () => {
  const themes = Object.values(projectionThemes);
  assert.equal(themes.length, 38);
  assert.equal(new Set(themes.map((theme) => theme.label)).size, themes.length);
  for (const category of ["classic", "worship", "cinematic", "nature", "seasons"]) {
    assert.ok(themes.filter((theme) => theme.category === category).length >= 6);
  }
  assert.ok(themes.every((theme) => theme.background.length > 3 && theme.text.length > 3 && theme.muted.length > 3));
});
