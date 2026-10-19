import {
  normalizeProjectionOverlayFontScale,
  validateProjectionOverlayPresetInput,
  type ProjectionOverlayPreset,
  type ProjectionOverlayPresetInput,
} from "./projection-overlays";

export type OverlayAutosaveDraft = Pick<
  ProjectionOverlayPreset,
  "title" | "text" | "tone" | "position" | "fontSize" | "titleFontScale" | "textFontScale"
>;

export type OverlayAutosaveStatus = {
  state: "idle" | "waiting" | "saving" | "saved" | "error";
  message?: string;
};

export type OverlayAutosaveSaveResult =
  | { ok: true; preset: ProjectionOverlayPreset; presets: ProjectionOverlayPreset[] }
  | { ok: false; message: string };

type SavedOverlay = Extract<OverlayAutosaveSaveResult, { ok: true }>;

type OverlayAutosaveOptions = {
  save: (input: ProjectionOverlayPresetInput) => Promise<OverlayAutosaveSaveResult>;
  nameForDraft: (draft: OverlayAutosaveDraft) => string;
  onSaved: (result: SavedOverlay) => void;
  onStatus: (status: OverlayAutosaveStatus) => void;
  delayMs?: number;
  maxWaitMs?: number;
};

const EMPTY_EXISTING_MESSAGE = "Enter an overlay title or message, or delete this overlay.";

function emptyDraft(): OverlayAutosaveDraft {
  return { title: "", text: "", tone: "blue", position: "bottom", fontSize: 35, titleFontScale: 100, textFontScale: 100 };
}

function fingerprint(draft: OverlayAutosaveDraft): string {
  return JSON.stringify([
    draft.title,
    draft.text,
    draft.tone,
    draft.position,
    draft.fontSize,
    normalizeProjectionOverlayFontScale(draft.titleFontScale),
    normalizeProjectionOverlayFontScale(draft.textFontScale),
  ]);
}

export function createProjectionOverlayAutosave({
  save,
  nameForDraft,
  onSaved,
  onStatus,
  delayMs = 100,
  maxWaitMs = 300,
}: OverlayAutosaveOptions) {
  let draft = emptyDraft();
  let id: string | undefined;
  let name = "";
  let savedFingerprint: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let maxWaitTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingFlush: Promise<boolean> | null = null;
  let revision = 0;
  let disposed = false;

  function clearTimer() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  function clearTimers() {
    clearTimer();
    if (maxWaitTimer !== undefined) clearTimeout(maxWaitTimer);
    maxWaitTimer = undefined;
  }

  function flushWithoutWaiting() {
    void flush().catch(() => {});
  }

  function report(status: OverlayAutosaveStatus) {
    if (!disposed) onStatus(status);
  }

  function isEmptyDraft() {
    return !draft.title.trim() && !draft.text.trim();
  }

  function inputForDraft(): ProjectionOverlayPresetInput | null {
    if (isEmptyDraft()) return null;
    const result = validateProjectionOverlayPresetInput({
      ...draft,
      id,
      name: name || nameForDraft(draft),
    });
    return result.ok ? result.value : null;
  }

  async function drain(): Promise<boolean> {
    for (;;) {
      const input = inputForDraft();
      if (!input) {
        if (id && isEmptyDraft()) {
          report({ state: "error", message: EMPTY_EXISTING_MESSAGE });
          return false;
        }
        report({ state: "idle" });
        return true;
      }
      if (fingerprint(input) === savedFingerprint) {
        report({ state: "saved" });
        return true;
      }

      report({ state: "saving" });
      let result: OverlayAutosaveSaveResult;
      try {
        result = await save(input);
      } catch (error) {
        report({
          state: "error",
          message: error instanceof Error ? error.message : "Could not save this overlay. Please try again.",
        });
        return false;
      }
      if (!result.ok) {
        report({ state: "error", message: result.message });
        return false;
      }

      id = result.preset.id;
      name = result.preset.name;
      savedFingerprint = fingerprint(result.preset);
      if (!disposed) onSaved(result);
      // Read the current draft again: edits made during the request still need saving.
    }
  }

  function flush(): Promise<boolean> {
    clearTimers();
    if (pendingFlush) return pendingFlush;
    if (disposed) return Promise.resolve(true);
    // Install the shared promise before saving or invoking consumer callbacks.
    pendingFlush = Promise.resolve().then(async () => {
      try {
        for (;;) {
          const startedAt = revision;
          const saved = await drain();
          if (!saved || startedAt === revision) return saved;
        }
      } finally {
        pendingFlush = null;
      }
    });
    return pendingFlush;
  }

  return {
    load(preset: ProjectionOverlayPreset | null) {
      if (disposed) return;
      clearTimers();
      revision += 1;
      id = preset?.id;
      name = preset?.name ?? "";
      draft = preset
        ? {
            title: preset.title,
            text: preset.text,
            tone: preset.tone,
            position: preset.position,
            fontSize: preset.fontSize,
            titleFontScale: normalizeProjectionOverlayFontScale(preset.titleFontScale),
            textFontScale: normalizeProjectionOverlayFontScale(preset.textFontScale),
          }
        : emptyDraft();
      const input = preset ? inputForDraft() : null;
      savedFingerprint = input ? fingerprint(input) : null;
      report({ state: "idle" });
    },

    update(nextDraft: OverlayAutosaveDraft, options?: { immediate?: boolean }) {
      if (disposed) return;
      draft = { ...nextDraft };
      revision += 1;
      clearTimer();
      if (pendingFlush) return;
      if (id && isEmptyDraft()) {
        clearTimers();
        report({ state: "error", message: EMPTY_EXISTING_MESSAGE });
        return;
      }
      const input = inputForDraft();
      if (!input || fingerprint(input) === savedFingerprint) {
        clearTimers();
        report({ state: "idle" });
        return;
      }
      if (options?.immediate) {
        flushWithoutWaiting();
        return;
      }
      report({ state: "waiting" });
      timer = setTimeout(flushWithoutWaiting, delayMs);
      maxWaitTimer ??= setTimeout(flushWithoutWaiting, maxWaitMs);
    },

    flush,

    dispose() {
      clearTimers();
      disposed = true;
    },
  };
}
