export const PROJECTION_OVERLAY_PRESETS_SETTING_KEY = "music_projection_overlay_presets";
export const MAX_PROJECTION_OVERLAY_PRESETS = 50;

export type ProjectionOverlayPreset = {
  id: string;
  name: string;
  title: string;
  text: string;
  tone: "blue" | "dark" | "light" | "minimal";
  position: "top" | "center" | "bottom";
  fontSize: number;
  updatedAt: string;
};

export type ProjectionOverlayPresetInput = Omit<ProjectionOverlayPreset, "id" | "updatedAt"> & { id?: string };

const tones = new Set<ProjectionOverlayPreset["tone"]>(["blue", "dark", "light", "minimal"]);
const positions = new Set<ProjectionOverlayPreset["position"]>(["top", "center", "bottom"]);

function boundedText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function parseProjectionOverlayPresets(value: unknown): ProjectionOverlayPreset[] {
  if (!Array.isArray(value)) return [];
  const presets: ProjectionOverlayPreset[] = [];
  const ids = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<ProjectionOverlayPreset>;
    const id = boundedText(candidate.id, 100);
    const name = boundedText(candidate.name, 80);
    const tone = candidate.tone && tones.has(candidate.tone) ? candidate.tone : "blue";
    const position = candidate.position && positions.has(candidate.position) ? candidate.position : "bottom";
    if (!id || !name || ids.has(id)) continue;
    ids.add(id);
    presets.push({
      id,
      name,
      title: boundedText(candidate.title, 160),
      text: boundedText(candidate.text, 2_000),
      tone,
      position,
      fontSize: Math.min(100, Math.max(5, Math.round(Number(candidate.fontSize) || 35))),
      updatedAt: boundedText(candidate.updatedAt, 40) || new Date(0).toISOString(),
    });
    if (presets.length >= MAX_PROJECTION_OVERLAY_PRESETS) break;
  }

  return presets.sort((left, right) => left.name.localeCompare(right.name));
}

export function validateProjectionOverlayPresetInput(input: unknown) {
  if (!input || typeof input !== "object") return { ok: false as const, message: "Enter an overlay preset." };
  const candidate = input as Partial<ProjectionOverlayPresetInput>;
  const name = boundedText(candidate.name, 80);
  const title = boundedText(candidate.title, 160);
  const text = boundedText(candidate.text, 2_000);
  if (!name) return { ok: false as const, message: "Enter a name for this saved overlay." };
  if (!title && !text) return { ok: false as const, message: "Enter an overlay title or message before saving." };
  return {
    ok: true as const,
    value: {
      id: boundedText(candidate.id, 100) || undefined,
      name,
      title,
      text,
      tone: candidate.tone && tones.has(candidate.tone) ? candidate.tone : "blue" as const,
      position: candidate.position && positions.has(candidate.position) ? candidate.position : "bottom" as const,
      fontSize: Math.min(100, Math.max(5, Math.round(Number(candidate.fontSize) || 35))),
    },
  };
}
