import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import path from "node:path";
import { setImmediate } from "node:timers/promises";
import { build } from "esbuild";

// Exercise the actual actions with controlled storage and request-lifecycle
// dependencies. No database, files, or notifications are written by these tests.
let compiledActions: Promise<string> | undefined;
async function actionsFixture() {
  compiledActions ??= build({
    stdin: { contents: 'export { createSpiritualFormFromBuilder, updateSpiritualFormFromBuilder } from "./src/app/admin/intercession/actions";', resolveDir: process.cwd(), loader: "ts" },
    bundle: true, write: false, platform: "node", format: "cjs", treeShaking: true,
    plugins: [{ name: "form-save-dependencies", setup(builder) {
      builder.onResolve({ filter: /^(?:@\/lib\/(?:auth|prisma|notifications)|next\/(?:cache|server)|@vercel\/blob|server-only)$/ }, (args) => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({ contents: args.path === "server-only" ? "module.exports = {};" : `module.exports = globalThis.__formSaveTestDependencies[${JSON.stringify(args.path)}];`, loader: "js" }));
    } }],
  }).then((result) => result.outputFiles[0].text);
  const calls: string[] = [];
  const background: Array<() => Promise<void>> = [];
  const permissions: string[] = [];
  const current = { id: 72, title: "Saved form", description: null, questions: [], settings: { is_published: false }, version: 1 };
  const never = () => new Promise<never>(() => {});
  const prisma = {
    spiritualForm: {
      findUnique: async () => current,
      create: async ({ data }: { data: object }) => { calls.push("create"); return { ...current, ...data, createdAt: new Date(), updatedAt: new Date() }; },
      update: async ({ data }: { data: object }) => { calls.push("update"); return { ...current, ...data, updatedAt: new Date() }; },
      findMany: () => { calls.push("cleanup"); return never(); },
    },
    $queryRaw: async () => [],
    $transaction: async (run: (client: unknown) => unknown) => run(prisma),
    notification: { deleteMany: () => { calls.push("notification-removal"); return never(); } },
  };
  const dependencies = {
    "@/lib/auth": {
      requirePermission: async (_page: string, feature: string) => { permissions.push(feature); return { id: 7 }; },
      requireAnyPermission: async () => ({ id: 7 }),
    },
    "@/lib/prisma": { prisma },
    "@/lib/notifications": { userIdsWithPermission: async () => [7], notifyUsers: () => { calls.push("notify"); return never(); } },
    "next/server": { after: (callback: () => Promise<void>) => background.push(callback) },
    "next/cache": { revalidatePath: () => calls.push("revalidate") },
    "@vercel/blob": {},
  };
  (globalThis as Record<string, unknown>).__formSaveTestDependencies = dependencies;
  const evaluatedModule = { exports: {} as Record<string, (formIdOrData: number | FormData, data?: FormData) => Promise<{ ok: boolean; message: string; formId?: number }>> };
  new Function("require", "module", "exports", await compiledActions)(createRequire(path.resolve("package.json")), evaluatedModule, evaluatedModule.exports);
  return { actions: evaluatedModule.exports, calls, background, permissions, current };
}

function formData(published = false) {
  const data = new FormData();
  data.set("title", "Annual form"); data.set("description", "Description"); data.set("questions", "[]");
  data.set("settings", JSON.stringify({ is_published: published, allow_empty_submission: true }));
  return data;
}

test("creating a form confirms persistence before any page revalidation", async () => {
  const fixture = await actionsFixture();
  const result = await fixture.actions.createSpiritualFormFromBuilder(formData());
  assert.equal(result.ok, true); assert.equal(result.formId, 72);
  assert.deepEqual(fixture.permissions, ["create-forms"]);
  assert.deepEqual(fixture.calls, ["create"]);
  assert.equal(fixture.background.length, 1);
  await fixture.background[0]();
  assert.ok(fixture.calls.includes("revalidate"));
});

test("slow publication notifications cannot hold up the form save response", async () => {
  const fixture = await actionsFixture();
  const result = await fixture.actions.createSpiritualFormFromBuilder(formData(true));
  assert.equal(result.ok, true);
  assert.deepEqual(fixture.calls, ["create"]);
  void fixture.background[0]();
  await setImmediate();
  assert.ok(fixture.calls.includes("notify"));
});

test("editing returns before removed-image cleanup or navigation revalidation", async () => {
  const fixture = await actionsFixture();
  const data = formData(); data.set("discardedImages", JSON.stringify(["/uploads/forms/fixture-only-unused.png"]));
  const result = await fixture.actions.updateSpiritualFormFromBuilder(72, data);
  assert.equal(result.ok, true);
  assert.deepEqual(fixture.permissions, ["edit-forms"]);
  assert.deepEqual(fixture.calls, ["update"]);
  void fixture.background[0]();
  await setImmediate();
  assert.ok(fixture.calls.includes("cleanup"));
  assert.ok(fixture.calls.includes("revalidate"));
});

test("invalid form input returns an error without scheduling a write or background work", async () => {
  const fixture = await actionsFixture();
  const data = formData(); data.set("title", "");
  const result = await fixture.actions.createSpiritualFormFromBuilder(data);
  assert.equal(result.ok, false); assert.match(result.message, /title/);
  assert.deepEqual(fixture.calls, []);
  assert.equal(fixture.background.length, 0);
});
