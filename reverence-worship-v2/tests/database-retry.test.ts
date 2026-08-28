import assert from "node:assert/strict";
import test from "node:test";
import { isTransientDatabaseError } from "../src/lib/database-retry";

test("database retry recognizes transient Prisma connection codes", () => {
  for (const code of ["P1001", "P1002", "P1008", "P1017", "P2024", "P2037"]) {
    assert.equal(isTransientDatabaseError({ code, message: "Database request failed" }), true);
  }
});

test("database retry recognizes transient errors nested in a cause", () => {
  const error = new Error("Request failed", {
    cause: { code: "ECONNRESET", message: "socket closed" },
  });

  assert.equal(isTransientDatabaseError(error), true);
});

test("database retry recognizes Neon WebSocket error events", () => {
  assert.equal(isTransientDatabaseError({ type: "error" }), true);
});

test("database retry does not retry permanent Prisma errors", () => {
  assert.equal(isTransientDatabaseError({ code: "P2002", message: "Unique constraint failed" }), false);
  assert.equal(isTransientDatabaseError({ code: "P2025", message: "Record not found" }), false);
});
