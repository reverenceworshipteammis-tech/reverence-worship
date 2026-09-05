import assert from "node:assert/strict";
import test from "node:test";
import { authPathWithReturnTo, safeAuthReturnPath } from "../src/lib/auth-return-path";

test("authentication return paths preserve local form destinations", () => {
  const formPath = "/admin/intercession/forms/9/take?source=email";
  assert.equal(safeAuthReturnPath(formPath), formPath);
  assert.equal(authPathWithReturnTo("/login", formPath), "/login?next=%2Fadmin%2Fintercession%2Fforms%2F9%2Ftake%3Fsource%3Demail");
});

test("authentication return paths reject external and malformed destinations", () => {
  assert.equal(safeAuthReturnPath("https://example.com/steal"), "/admin/dashboard");
  assert.equal(safeAuthReturnPath("//example.com/steal"), "/admin/dashboard");
  assert.equal(safeAuthReturnPath("/\\example.com/steal"), "/admin/dashboard");
  assert.equal(safeAuthReturnPath("dashboard"), "/admin/dashboard");
  assert.equal(safeAuthReturnPath("/login"), "/admin/dashboard");
});
