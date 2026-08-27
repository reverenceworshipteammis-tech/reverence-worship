import type { SongProjectionSlide } from "@/lib/song-projection";

export const PROJECTION_CHANNEL_NAME = "reverence-worship-projection-v2";
export const PROJECTION_STORAGE_KEY = "reverence-worship:projection-state:v2";
export const PROJECTION_TEXT_SIZE_MIN_PERCENT = 5;
export const PROJECTION_TEXT_SIZE_MAX_PERCENT = 100;

export type ProjectionMediaType = "none" | "image" | "video";
export type ProjectionTransitionType = "cut" | "fade" | "dissolve";
export type ProjectionBackgroundMotion = "none" | "drift" | "zoom";
export type ProjectionBackgroundAmbience = "none" | "particles" | "rays";

export type ProjectionBackgroundEffects = {
  motion: ProjectionBackgroundMotion;
  motionSpeed: number;
  blur: number;
  vignette: number;
  saturation: number;
  dimming: number;
  autoDimming: boolean;
  tintColor: string;
  tintStrength: number;
  ambience: ProjectionBackgroundAmbience;
};

export type ProjectionBackgroundMedia = {
  type: ProjectionMediaType;
  url: string;
  fit: "cover" | "contain";
  brightness: number;
  name: string;
};

export type ProjectionTransition = {
  type: ProjectionTransitionType;
  durationMs: number;
};

export const DEFAULT_PROJECTION_MEDIA: ProjectionBackgroundMedia = {
  type: "none",
  url: "",
  fit: "cover",
  brightness: 55,
  name: "",
};

export const DEFAULT_PROJECTION_TRANSITION: ProjectionTransition = {
  type: "fade",
  durationMs: 350,
};

export const DEFAULT_PROJECTION_BACKGROUND_EFFECTS: ProjectionBackgroundEffects = {
  motion: "none",
  motionSpeed: 45,
  blur: 0,
  vignette: 24,
  saturation: 100,
  dimming: 12,
  autoDimming: true,
  tintColor: "#1d4ed8",
  tintStrength: 0,
  ambience: "none",
};

export function normalizeProjectionBackgroundEffects(value?: Partial<ProjectionBackgroundEffects> | null): ProjectionBackgroundEffects {
  const motion = value?.motion === "drift" || value?.motion === "zoom" ? value.motion : "none";
  const ambience = value?.ambience === "particles" || value?.ambience === "rays" ? value.ambience : "none";
  const tintColor = typeof value?.tintColor === "string" && /^#[0-9a-f]{6}$/i.test(value.tintColor) ? value.tintColor : DEFAULT_PROJECTION_BACKGROUND_EFFECTS.tintColor;
  const clamp = (input: number | undefined, minimum: number, maximum: number, fallback: number) => Math.round(Math.min(maximum, Math.max(minimum, Number.isFinite(input) ? input as number : fallback)));
  return {
    motion,
    motionSpeed: clamp(value?.motionSpeed, 0, 100, DEFAULT_PROJECTION_BACKGROUND_EFFECTS.motionSpeed),
    blur: clamp(value?.blur, 0, 20, DEFAULT_PROJECTION_BACKGROUND_EFFECTS.blur),
    vignette: clamp(value?.vignette, 0, 100, DEFAULT_PROJECTION_BACKGROUND_EFFECTS.vignette),
    saturation: clamp(value?.saturation, 0, 180, DEFAULT_PROJECTION_BACKGROUND_EFFECTS.saturation),
    dimming: clamp(value?.dimming, 0, 80, DEFAULT_PROJECTION_BACKGROUND_EFFECTS.dimming),
    autoDimming: typeof value?.autoDimming === "boolean" ? value.autoDimming : DEFAULT_PROJECTION_BACKGROUND_EFFECTS.autoDimming,
    tintColor,
    tintStrength: clamp(value?.tintStrength, 0, 70, DEFAULT_PROJECTION_BACKGROUND_EFFECTS.tintStrength),
    ambience,
  };
}

function projectionTextSizeProgress(percent: number) {
  const clamped = Math.min(PROJECTION_TEXT_SIZE_MAX_PERCENT, Math.max(PROJECTION_TEXT_SIZE_MIN_PERCENT, percent));
  return (clamped - PROJECTION_TEXT_SIZE_MIN_PERCENT) / (PROJECTION_TEXT_SIZE_MAX_PERCENT - PROJECTION_TEXT_SIZE_MIN_PERCENT);
}

export function projectionTextSizePx(percent: number) {
  return Math.round(20 + projectionTextSizeProgress(percent) * 480);
}

export function projectionPreviewTextSizePx(percent: number) {
  return Math.round(8 + projectionTextSizeProgress(percent) * 167);
}

export function projectionOverlayTextSizePx(percent: number) {
  return Math.round(16 + projectionTextSizeProgress(percent) * 164);
}

export function projectionOverlayPreviewTextSizePx(percent: number) {
  return Math.round(6 + projectionTextSizeProgress(percent) * 58);
}

export function projectionOverlayWidthPercent(percent: number) {
  return Math.round(36 + projectionTextSizeProgress(percent) * 58);
}

export function projectionOverlaySafeInsets(
  frameHeight: number,
  overlayHeight: number,
  position: ProjectionOverlayState["position"],
  visible: boolean,
) {
  const height = Math.max(0, Number.isFinite(frameHeight) ? frameHeight : 0);
  const baseInset = height * 0.035;
  if (!visible || height === 0 || overlayHeight <= 0) {
    return { paddingTop: baseInset, paddingBottom: baseInset };
  }

  const measuredOverlayHeight = Math.max(0, overlayHeight);
  const gap = Math.max(8, height * 0.025);
  if (position === "top") {
    return {
      paddingTop: height * 0.06 + measuredOverlayHeight + gap,
      paddingBottom: baseInset,
    };
  }
  if (position === "center") {
    return {
      paddingTop: Math.max(8, height * 0.035),
      paddingBottom: height * 0.5 + measuredOverlayHeight * 0.5 + gap,
    };
  }
  return {
    paddingTop: baseInset,
    paddingBottom: height * 0.07 + measuredOverlayHeight + gap,
  };
}

export function projectionMediaBrightnessPercent(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_PROJECTION_MEDIA.brightness;
  return Math.round(Math.min(100, Math.max(0, value)));
}

export type ProjectionOverlayState = {
  visible: boolean;
  title: string;
  text: string;
  position: "top" | "center" | "bottom";
  alignment: "left" | "center" | "right";
  fontSize: number;
  width: number;
  opacity: number;
  background: string;
  color: string;
  borderColor: string;
  boxShadow: string;
  textShadow: string;
  padding: string;
};

export type ProjectionOutputState = {
  version: 3;
  updatedAt: number;
  blanked: boolean;
  slide: SongProjectionSlide | null;
  emptyMessage: string;
  footer: string;
  fontSize: number;
  uniformTextSize?: boolean;
  uniformTextViewport?: { width: number; height: number };
  background: string;
  textColor: string;
  mutedTextColor: string;
  textShadow: string;
  media: ProjectionBackgroundMedia;
  transition: ProjectionTransition;
  effects?: ProjectionBackgroundEffects;
  overlay: ProjectionOverlayState;
};

/**
 * Moving through a deck is a live action, but it must not accidentally publish
 * appearance or edit controls that are still being previewed by the operator.
 */
export function projectionNavigationState(
  liveState: ProjectionOutputState | null,
  draftState: ProjectionOutputState,
): ProjectionOutputState {
  const presentation = liveState ?? draftState;
  return {
    ...presentation,
    blanked: false,
    slide: draftState.slide,
    footer: draftState.footer,
  };
}

export type ProjectionControlKey =
  | "ArrowRight"
  | "ArrowLeft"
  | "PageDown"
  | "PageUp"
  | "Home"
  | "End"
  | "Enter"
  | " "
  | "b"
  | "o";

export type ProjectionChannelMessage =
  | { type: "state"; state: ProjectionOutputState }
  | { type: "request-state"; outputId: string }
  | { type: "ready"; outputId: string }
  | { type: "heartbeat"; outputId: string; fullscreen: boolean; viewport?: { width: number; height: number } }
  | { type: "closed"; outputId: string }
  | { type: "control"; key: ProjectionControlKey }
  | { type: "command"; command: "fullscreen" | "close" };

export function isProjectionOutputState(value: unknown): value is ProjectionOutputState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<ProjectionOutputState>;
  return state.version === 3
    && typeof state.updatedAt === "number"
    && typeof state.blanked === "boolean"
    && typeof state.background === "string"
    && typeof state.textColor === "string"
    && typeof state.fontSize === "number"
    && Boolean(state.media && typeof state.media === "object")
    && Boolean(state.transition && typeof state.transition === "object")
    && Boolean(state.overlay && typeof state.overlay === "object");
}

function migratedProjectionOutputState(value: unknown): ProjectionOutputState | null {
  if (!value || typeof value !== "object") return null;
  const state = value as Partial<Omit<ProjectionOutputState, "version">> & { version?: number };
  if (state.version !== 2 || typeof state.updatedAt !== "number" || typeof state.blanked !== "boolean" || typeof state.background !== "string" || typeof state.textColor !== "string" || typeof state.fontSize !== "number" || !state.overlay) return null;
  return {
    ...(state as Omit<ProjectionOutputState, "version" | "media" | "transition">),
    version: 3,
    media: DEFAULT_PROJECTION_MEDIA,
    transition: DEFAULT_PROJECTION_TRANSITION,
  };
}

export function sanitizeProjectionMediaUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("blob:") || trimmed.startsWith("/")) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function clampProjectionTransitionDuration(value: number) {
  return Math.round(Math.min(1500, Math.max(100, Number.isFinite(value) ? value : DEFAULT_PROJECTION_TRANSITION.durationMs)));
}

export function readProjectionState(storage: Pick<Storage, "getItem">): ProjectionOutputState | null {
  try {
    const stored = storage.getItem(PROJECTION_STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isProjectionOutputState(parsed) ? parsed : migratedProjectionOutputState(parsed);
  } catch {
    return null;
  }
}

export function writeProjectionState(storage: Pick<Storage, "setItem">, state: ProjectionOutputState) {
  try {
    storage.setItem(PROJECTION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Projection still works through BroadcastChannel when storage is unavailable.
  }
}
