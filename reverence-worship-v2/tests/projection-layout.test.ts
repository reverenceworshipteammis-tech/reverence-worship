import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PROJECTION_VIEWPORT,
  normalizeProjectionViewport,
  projectionOverlayLayout,
  projectionPreviewScale,
} from "../src/lib/projection-layout";
import { projectionOverlayFontSizes, type ProjectionOverlayState } from "../src/lib/projection-runtime";

const overlay: ProjectionOverlayState = {
  visible: true,
  title: "Please welcome our guest speaker this morning",
  text: "Welcome to worship",
  position: "bottom",
  alignment: "center",
  fontSize: 60,
  width: 76,
  opacity: 96,
  background: "#000",
  color: "#fff",
  borderColor: "transparent",
  boxShadow: "none",
  textShadow: "none",
  padding: "2.20vh 3.20vw",
};

test("projection preview retains output aspect and one scale for full HD, HD, and 4:3 output", () => {
  for (const [viewport, previewWidth, expectedScale, expectedHeight] of [
    [{ width: 1920, height: 1080 }, 480, 0.25, 270],
    [{ width: 1280, height: 720 }, 480, 0.375, 270],
    [{ width: 1024, height: 768 }, 320, 0.3125, 240],
  ] as const) {
    const scale = projectionPreviewScale(viewport, previewWidth);
    assert.equal(scale, expectedScale);
    assert.equal(viewport.width * scale, previewWidth);
    assert.equal(viewport.height * scale, expectedHeight);
  }
});

test("overlay geometry and padding resolve against the logical output dimensions", () => {
  assert.deepEqual(projectionOverlayLayout(overlay, { width: 1920, height: 1080 }), {
    width: 1459.2,
    maxWidth: 1804.8,
    top: "auto",
    bottom: 75.60000000000001,
    transform: "translateX(-50%)",
    padding: "23.76px 61.44px",
  });
  assert.deepEqual(projectionOverlayLayout({ ...overlay, position: "top" }, { width: 1280, height: 720 }), {
    width: 972.8,
    maxWidth: 1203.1999999999998,
    top: 43.199999999999996,
    bottom: "auto",
    transform: "translateX(-50%)",
    padding: "15.840000000000002px 40.96px",
  });
  const centered = projectionOverlayLayout({ ...overlay, position: "center", padding: "calc(1VH + 2px) 1.5rem .5vW var(--2vh)" }, { width: 1024, height: 768 });
  assert.equal(centered.top, 384);
  assert.equal(centered.bottom, "auto");
  assert.equal(centered.transform, "translate(-50%,-50%)");
  assert.equal(centered.padding, "calc(7.68px + 2px) 1.5rem 5.12px var(--2vh)");
});

test("scaling the full canvas preserves title wrapping geometry at every preview width", () => {
  const viewport = { width: 1920, height: 1080 };
  const layout = projectionOverlayLayout(overlay, viewport);
  const { title } = projectionOverlayFontSizes(overlay.fontSize, 150, 100);
  const horizontalPadding = 61.44;
  const titleContentWidth = Math.min(layout.width, layout.maxWidth) - 2 * horizontalPadding - 2;
  const widthInTitleFontUnits = titleContentWidth / title;

  for (const previewWidth of [240, 480, 920]) {
    const scale = projectionPreviewScale(viewport, previewWidth);
    assert.ok(Math.abs((titleContentWidth * scale) / (title * scale) - widthInTitleFontUnits) < 1e-12);
    assert.deepEqual(projectionOverlayLayout(overlay, viewport), layout);
  }
});

test("missing or invalid viewports use stable output dimensions before connection", () => {
  for (const viewport of [undefined, null, { width: 0, height: 720 }, { width: 1280, height: -1 }, { width: Number.NaN, height: 720 }, { width: 1280, height: Number.POSITIVE_INFINITY }]) {
    assert.deepEqual(normalizeProjectionViewport(viewport), DEFAULT_PROJECTION_VIEWPORT);
  }
  assert.deepEqual(normalizeProjectionViewport({ width: 1279.6, height: 719.6 }), { width: 1280, height: 720 });
  assert.deepEqual(normalizeProjectionViewport({ width: 0.2, height: 0.4 }), { width: 1, height: 1 });
  for (const width of [0, -20, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(projectionPreviewScale(DEFAULT_PROJECTION_VIEWPORT, width), 0);
  }
});
