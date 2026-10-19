import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import {
  createProjectionOverlayAutosave,
  type OverlayAutosaveDraft,
  type OverlayAutosaveSaveResult,
  type OverlayAutosaveStatus,
} from "../src/lib/projection-overlay-autosave";

type SaveOptions = Parameters<typeof createProjectionOverlayAutosave>[0];
type SaveInput = Parameters<SaveOptions["save"]>[0];
type SaveSuccess = Extract<OverlayAutosaveSaveResult, { ok: true }>;
type Preset = SaveSuccess["preset"];

function draft(overrides: Partial<OverlayAutosaveDraft> = {}): OverlayAutosaveDraft {
  return {
    title: "Welcome",
    text: "We are glad you are here.",
    tone: "blue",
    position: "bottom",
    fontSize: 35,
    titleFontScale: 100,
    textFontScale: 100,
    ...overrides,
  };
}

function preset(overrides: Partial<Preset> = {}): Preset {
  return {
    ...draft(),
    id: "existing-overlay",
    name: "Saved welcome",
    updatedAt: "2026-10-17T12:00:00.000Z",
    ...overrides,
  };
}

function success(input: SaveInput, id = input.id || "created-overlay"): SaveSuccess {
  const saved = preset({ ...input, id, name: input.name ?? "Overlay" });
  return { ok: true, preset: saved, presets: [saved] };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function until(check: () => boolean, message: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (check()) return;
    await Promise.resolve();
  }
  assert.ok(check(), message);
}

function setup(
  t: TestContext,
  options: { save?: SaveOptions["save"]; delayMs?: number; maxWaitMs?: number } = {},
) {
  const calls: SaveInput[] = [];
  const saved: SaveSuccess[] = [];
  const statuses: OverlayAutosaveStatus[] = [];
  const autosave = createProjectionOverlayAutosave({
    save(input) {
      calls.push({ ...input });
      return options.save ? options.save(input) : Promise.resolve(success(input));
    },
    nameForDraft(value) {
      return value.title.trim() || value.text.trim().slice(0, 40) || "Overlay";
    },
    onSaved(value) {
      saved.push(value);
    },
    onStatus(value) {
      statuses.push(value);
    },
    delayMs: options.delayMs ?? 60_000,
    maxWaitMs: options.maxWaitMs ?? 60_000,
  });
  t.after(() => autosave.dispose());
  return { autosave, calls, saved, statuses };
}

test("unchanged existing overlays and edits reverted before saving do not write", async (t) => {
  const { autosave, calls } = setup(t);
  autosave.load(preset());
  autosave.update(draft());
  assert.equal(await autosave.flush(), true);

  autosave.update(draft({ text: "A temporary edit" }));
  autosave.update(draft());
  assert.equal(await autosave.flush(), true);
  assert.equal(calls.length, 0);
});

test("loading a legacy preset and applying default font scales does not write", async (t) => {
  const { autosave, calls } = setup(t);
  const legacy = preset();
  delete legacy.titleFontScale;
  delete legacy.textFontScale;
  autosave.load(legacy);
  autosave.update(draft());

  assert.equal(await autosave.flush(), true);
  assert.equal(calls.length, 0);
});

for (const change of [{ titleFontScale: 175 }, { textFontScale: 140 }]) {
  test(`editing only ${Object.keys(change)[0]} saves the preset and retains its other size and content`, async (t) => {
    const { autosave, calls, saved } = setup(t);
    const originalScales = { titleFontScale: 125, textFontScale: 90 };
    autosave.load(preset(originalScales));
    const latest = draft({ ...originalScales, ...change });
    autosave.update(latest);

    assert.equal(await autosave.flush(), true);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { ...latest, id: "existing-overlay", name: "Saved welcome" });
    assert.equal(saved[0].preset.titleFontScale, latest.titleFontScale);
    assert.equal(saved[0].preset.textFontScale, latest.textFontScale);

    autosave.update(latest);
    assert.equal(await autosave.flush(), true);
    assert.equal(calls.length, 1, "a saved size change must become the clean draft");
  });
}

test("an empty new overlay does not create a preset", async (t) => {
  const { autosave, calls, saved } = setup(t);
  autosave.load(null);
  autosave.update(draft({ title: " \n ", text: "\t " }));

  assert.equal(await autosave.flush(), true);
  assert.equal(calls.length, 0);
  assert.equal(saved.length, 0);
});

test("clearing an existing overlay reports an error and valid content can still save", async (t) => {
  const { autosave, calls, saved, statuses } = setup(t);
  autosave.load(preset());
  autosave.update(draft({ title: " \n ", text: "\t " }));

  assert.equal(await autosave.flush(), false);
  assert.equal(calls.length, 0);
  assert.equal(saved.length, 0);
  assert.equal(statuses.at(-1)?.state, "error");

  const restored = draft({ title: "Restored title", text: "Restored content" });
  autosave.update(restored);
  assert.equal(await autosave.flush(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, "existing-overlay");
  assert.equal(calls[0].title, restored.title);
  assert.equal(calls[0].text, restored.text);
  assert.equal(saved.length, 1);
  assert.equal(statuses.at(-1)?.state, "saved");
});

test("debounce waits after the latest edit and saves the combined final draft once", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { autosave, calls } = setup(t, { delayMs: 600 });
  autosave.load(null);
  autosave.update(draft({ title: "First title" }));
  t.mock.timers.tick(599);
  await Promise.resolve();
  assert.equal(calls.length, 0);

  autosave.update(draft({ title: "Final title", text: "First text" }));
  t.mock.timers.tick(599);
  await Promise.resolve();
  assert.equal(calls.length, 0);

  const latest = draft({ title: "Final title", text: "Final text", fontSize: 48 });
  autosave.update(latest);
  t.mock.timers.tick(599);
  await Promise.resolve();
  assert.equal(calls.length, 0);
  t.mock.timers.tick(1);
  await until(() => calls.length === 1, "the debounce should start one save");

  assert.equal(await autosave.flush(), true);
  assert.equal(calls.length, 1);
  const { id, ...createdDraft } = calls[0];
  assert.equal(Boolean(id), false);
  assert.deepEqual(createdDraft, { ...latest, name: "Final title" });
});

test("the default debounce starts saving after 100 ms", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const calls: SaveInput[] = [];
  const autosave = createProjectionOverlayAutosave({
    save(input) {
      calls.push(input);
      return Promise.resolve(success(input));
    },
    nameForDraft: () => "Welcome",
    onSaved() {},
    onStatus() {},
  });
  t.after(() => autosave.dispose());
  autosave.update(draft());

  t.mock.timers.tick(99);
  await Promise.resolve();
  assert.equal(calls.length, 0);
  t.mock.timers.tick(1);
  await until(() => calls.length === 1, "the default debounce should start a save at 100 ms");
  assert.equal(await autosave.flush(), true);
});

test("continuous typing saves the latest draft by the maximum wait", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { autosave, calls } = setup(t, { delayMs: 100, maxWaitMs: 300 });
  autosave.load(null);
  autosave.update(draft({ text: "First edit" }));
  for (const text of ["Second edit", "Third edit", "Latest edit"]) {
    t.mock.timers.tick(90);
    autosave.update(draft({ text }));
  }

  t.mock.timers.tick(29);
  await Promise.resolve();
  assert.equal(calls.length, 0);
  t.mock.timers.tick(1);
  await until(() => calls.length === 1, "continuous edits must save at the 300 ms cap");
  assert.equal(calls[0].text, "Latest edit");
  assert.equal(await autosave.flush(), true);
  t.mock.timers.tick(1_000);
  await Promise.resolve();
  assert.equal(calls.length, 1, "the cap should cancel the outstanding debounce");
});

test("immediate updates start without timers and join the serialized latest-draft save", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const requests = [deferred<OverlayAutosaveSaveResult>(), deferred<OverlayAutosaveSaveResult>()];
  let active = 0;
  let maximumActive = 0;
  let started = 0;
  const { autosave, calls } = setup(t, {
    async save() {
      const request = requests[started++];
      assert.ok(request, "only the initial and latest draft should be saved");
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        return await request.promise;
      } finally {
        active -= 1;
      }
    },
  });
  autosave.load(preset());
  autosave.update(draft({ tone: "dark" }), { immediate: true });
  await until(() => calls.length === 1, "an immediate update should save without advancing timers");
  const firstFlush = autosave.flush();

  autosave.update(draft({ tone: "dark", position: "center" }), { immediate: true });
  const latest = draft({ tone: "dark", position: "top", fontSize: 48 });
  autosave.update(latest, { immediate: true });
  assert.equal(autosave.flush(), firstFlush);
  assert.equal(calls.length, 1);

  requests[0].resolve(success(calls[0]));
  await until(() => calls.length === 2, "the active save should drain the latest immediate update");
  assert.deepEqual(calls[1], { ...latest, id: "existing-overlay", name: "Saved welcome" });
  requests[1].resolve(success(calls[1]));
  assert.equal(await firstFlush, true);
  assert.equal(maximumActive, 1);
  t.mock.timers.tick(60_000);
  await Promise.resolve();
  assert.equal(calls.length, 2);
});

for (const cancellation of ["reverted", "empty new", "empty existing", "load", "dispose", "flush"] as const) {
  test(`${cancellation} cancels the debounce and maximum-wait timers`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const { autosave, calls, statuses } = setup(t, { delayMs: 600, maxWaitMs: 300 });
    autosave.load(cancellation === "empty new" ? null : preset());
    autosave.update(draft({ text: "Pending edit" }));
    t.mock.timers.tick(50);

    if (cancellation === "reverted") autosave.update(draft());
    else if (cancellation === "empty new" || cancellation === "empty existing") {
      autosave.update(draft({ title: "", text: "" }));
    } else if (cancellation === "load") autosave.load(preset());
    else if (cancellation === "dispose") autosave.dispose();
    else assert.equal(await autosave.flush(), true);

    const callCount = calls.length;
    const statusCount = statuses.length;
    t.mock.timers.tick(1_000);
    for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
    assert.equal(calls.length, callCount, "canceled timers must not start another write");
    assert.equal(statuses.length, statusCount, "canceled timers must not report another flush");
  });
}

test("reverting an edit resets the maximum wait for the next dirty draft", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { autosave, calls } = setup(t, { delayMs: 600, maxWaitMs: 300 });
  autosave.load(preset());
  autosave.update(draft({ text: "Canceled edit" }));
  t.mock.timers.tick(50);
  autosave.update(draft());
  t.mock.timers.tick(50);
  autosave.update(draft({ text: "New edit" }));

  t.mock.timers.tick(200);
  await Promise.resolve();
  assert.equal(calls.length, 0, "the old maximum-wait timer should be canceled");
  t.mock.timers.tick(99);
  await Promise.resolve();
  assert.equal(calls.length, 0);
  t.mock.timers.tick(1);
  await until(() => calls.length === 1, "the new dirty draft should get its own 300 ms maximum wait");
  assert.equal(calls[0].text, "New edit");
  assert.equal(await autosave.flush(), true);
});

test("flushing a new overlay creates it once and reuses its returned id", async (t) => {
  const { autosave, calls, saved, statuses } = setup(t);
  autosave.load(null);
  autosave.update(draft());

  assert.equal(await autosave.flush(), true);
  assert.equal(calls.length, 1);
  assert.equal(Boolean(calls[0].id), false);
  assert.equal(saved[0].preset.id, "created-overlay");

  const latest = draft({ text: "Please take your seats." });
  autosave.update(latest);
  assert.equal(await autosave.flush(), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].id, "created-overlay");
  assert.equal(saved[1].preset.text, latest.text);
  assert.equal(statuses.at(-1)?.state, "saved");

  autosave.update(latest);
  assert.equal(await autosave.flush(), true);
  assert.equal(calls.length, 2);
});

test("edits during a save drain in order and every flush waits for the final save", async (t) => {
  const requests = [deferred<OverlayAutosaveSaveResult>(), deferred<OverlayAutosaveSaveResult>()];
  let started = 0;
  let active = 0;
  let maximumActive = 0;
  const { autosave, calls, saved } = setup(t, {
    async save() {
      const request = requests[started++];
      assert.ok(request, "only the initial and final draft should be saved");
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        return await request.promise;
      } finally {
        active -= 1;
      }
    },
  });
  autosave.load(null);
  autosave.update(draft({ title: "Initial title" }));
  let firstFinished = false;
  const firstFlush = autosave.flush().then((result) => {
    firstFinished = true;
    return result;
  });
  await until(() => calls.length === 1, "the first save should start");

  autosave.update(draft({ title: "Intermediate title", text: "Intermediate text" }));
  const latest = draft({
    title: "Final title",
    text: "Final text",
    tone: "dark",
    position: "top",
    fontSize: 57,
  });
  autosave.update(latest);
  let secondFinished = false;
  const secondFlush = autosave.flush().then((result) => {
    secondFinished = true;
    return result;
  });
  assert.equal(calls.length, 1);

  requests[0].resolve(success(calls[0]));
  await until(() => calls.length === 2, "the latest draft should follow the first save");
  assert.equal(firstFinished, false);
  assert.equal(secondFinished, false);
  assert.equal(maximumActive, 1);
  assert.deepEqual(calls[1], { ...latest, id: "created-overlay", name: "Initial title" });

  requests[1].resolve(success(calls[1]));
  assert.deepEqual(await Promise.all([firstFlush, secondFlush]), [true, true]);
  assert.equal(maximumActive, 1);
  assert.equal(saved.at(-1)?.preset.text, latest.text);

  autosave.update(latest);
  assert.equal(await autosave.flush(), true);
  assert.equal(calls.length, 2, "an older response must not replace the latest saved draft");
});

test("flushing before closing persists the latest edit without waiting for debounce", async (t) => {
  const { autosave, calls } = setup(t);
  autosave.load(preset());
  autosave.update(draft({ text: "First edit" }));
  autosave.update(draft({ text: "Final edit before closing" }));

  assert.equal(await autosave.flush(), true);
  autosave.dispose();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, "existing-overlay");
  assert.equal(calls[0].text, "Final edit before closing");
});

test("disposal lets an active flush persist later edits without further callbacks", async (t) => {
  const requests = [deferred<OverlayAutosaveSaveResult>(), deferred<OverlayAutosaveSaveResult>()];
  let started = 0;
  const { autosave, calls, saved, statuses } = setup(t, {
    save() {
      const request = requests[started++];
      assert.ok(request, "only the initial and final draft should be saved");
      return request.promise;
    },
  });
  autosave.load(null);
  autosave.update(draft({ title: "Initial title" }));
  const flushing = autosave.flush();
  await until(() => calls.length === 1, "the first save should start before disposal");

  const latest = draft({
    title: "Final title",
    text: "Final edit during the request",
    tone: "light",
    position: "center",
    fontSize: 42,
  });
  autosave.update(latest);
  autosave.dispose();
  const savedAtDisposal = [...saved];
  const statusesAtDisposal = [...statuses];

  requests[0].resolve(success(calls[0]));
  await until(() => calls.length === 2, "the active flush should still save the latest draft");
  assert.deepEqual(calls[1], { ...latest, id: "created-overlay", name: "Initial title" });
  assert.deepEqual(saved, savedAtDisposal);
  assert.deepEqual(statuses, statusesAtDisposal);

  requests[1].resolve(success(calls[1]));
  assert.equal(await flushing, true);
  assert.equal(calls.length, 2);
  assert.deepEqual(saved, savedAtDisposal);
  assert.deepEqual(statuses, statusesAtDisposal);
});

for (const failure of ["unsuccessful result", "thrown error"] as const) {
  test(`a debounced ${failure} retains the draft and the next flush retries`, async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    let attempts = 0;
    const { autosave, calls, saved, statuses } = setup(t, {
      delayMs: 600,
      async save(input) {
        attempts += 1;
        if (attempts === 1) {
          if (failure === "thrown error") throw new Error("Connection lost");
          return { ok: false, message: "Connection lost" };
        }
        return success(input);
      },
    });
    autosave.load(preset());
    autosave.update(draft({ text: "Keep this draft until it saves." }));
    t.mock.timers.tick(600);
    assert.equal(await autosave.flush(), false);

    assert.equal(calls.length, 1);
    assert.equal(saved.length, 0);
    assert.equal(statuses.at(-1)?.state, "error");
    assert.match(statuses.at(-1)?.message ?? "", /Connection lost/);
    assert.equal(await autosave.flush(), true);
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], calls[0]);
    assert.equal(saved.length, 1);
    assert.equal(statuses.at(-1)?.state, "saved");
    assert.equal(await autosave.flush(), true);
    assert.equal(calls.length, 2);
  });
}
