import type { ProjectionOverlayState } from "./projection-runtime";

export type ProjectionViewport = { width: number; height: number };

export const DEFAULT_PROJECTION_VIEWPORT: Readonly<ProjectionViewport> = {
  width: 1920,
  height: 1080,
};

/** Use the output dimensions, with a stable fallback before an output connects. */
export function normalizeProjectionViewport(viewport?: ProjectionViewport | null): ProjectionViewport {
  if (!viewport || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)
    || viewport.width <= 0 || viewport.height <= 0) {
    return { ...DEFAULT_PROJECTION_VIEWPORT };
  }
  return {
    width: Math.max(1, Math.round(viewport.width)),
    height: Math.max(1, Math.round(viewport.height)),
  };
}

/** Keep the logical canvas unchanged; zero hides it until its preview is measured. */
export function projectionPreviewScale(viewport: ProjectionViewport, previewWidth: number): number {
  if (!Number.isFinite(previewWidth) || previewWidth <= 0) return 0;
  return previewWidth / normalizeProjectionViewport(viewport).width;
}

export function projectionOverlayLayout(overlay: ProjectionOverlayState, viewport: ProjectionViewport) {
  const { width, height } = normalizeProjectionViewport(viewport);
  const padding = overlay.padding.replace(
    /(^|[^\w.-])([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(vh|vw)\b/gi,
    (_match, prefix: string, value: string, unit: string) => {
      const dimension = unit.toLowerCase() === "vh" ? height : width;
      return `${prefix}${Number(value) * dimension / 100}px`;
    },
  );

  return {
    width: width * overlay.width / 100,
    maxWidth: width * 0.94,
    top: overlay.position === "top" ? height * 0.06 : overlay.position === "center" ? height * 0.5 : "auto" as const,
    bottom: overlay.position === "bottom" ? height * 0.07 : "auto" as const,
    transform: overlay.position === "center" ? "translate(-50%,-50%)" : "translateX(-50%)",
    padding,
  };
}
