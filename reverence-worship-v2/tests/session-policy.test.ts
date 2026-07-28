import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SESSION_LIFETIME_MINUTES,
  normalizeSessionLifetimeMinutes,
} from "../src/lib/session-policy";

test("session lifetime accepts values through 60 minutes", () => {
  assert.equal(normalizeSessionLifetimeMinutes(1), 1);
  assert.equal(normalizeSessionLifetimeMinutes(20), 20);
  assert.equal(normalizeSessionLifetimeMinutes(60), 60);
});

test("session lifetime remains within the supported range", () => {
  assert.equal(normalizeSessionLifetimeMinutes(0), 1);
  assert.equal(normalizeSessionLifetimeMinutes(61), 60);
  assert.equal(normalizeSessionLifetimeMinutes("invalid"), DEFAULT_SESSION_LIFETIME_MINUTES);
});
